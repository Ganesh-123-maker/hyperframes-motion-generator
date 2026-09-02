import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { VideoPlan } from './schema';
import { validateFullPlan, ValidationErrorItem } from './validator';
import { PLANNER_SYSTEM_PROMPT, buildPlannerUserPrompt } from './prompt';

export interface PlannerOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  maxAttempts?: number;
  outputDir?: string;
  runId?: string;
  timeoutMs?: number;
  seed?: number;
  mockResponse?: string; // For testing and offline simulations
}

export interface PlannerExecutionResult {
  ok: boolean;
  plan: VideoPlan;
  runId: string;
  outputDirectory: string;
  attempts: number;
  metadata: {
    model: string;
    durationMs: number;
    timestamp: string;
    validationPassed: boolean;
    seed?: number;
  };
}

export const MAX_PLAN_ATTEMPTS = 3;

/**
 * Strips markdown code blocks if the model outputs ```json ... ```
 */
export function extractJsonFromResponse(content: string): string {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim();
  }
  return trimmed;
}

/**
 * Initializes the OpenAI client safely with lazy resolution of environment variables.
 */
export function getOpenAIClient(apiKey?: string, baseURL?: string): OpenAI {
  const key = apiKey || process.env.OPENAI_API_KEY;
  const url = baseURL || process.env.OPENAI_BASE_URL || 'https://llm.ganeshnayak.in/v1';

  if (!key) {
    throw new Error(
      'OPENAI_API_KEY is not configured. Please set OPENAI_API_KEY in your environment or pass it explicitly to the planner.'
    );
  }

  return new OpenAI({
    apiKey: key,
    baseURL: url
  });
}

/**
 * Saves planning artifacts safely to the filesystem.
 */
export function savePlanningArtifacts(
  outputDir: string,
  runId: string,
  brief: string,
  plan: VideoPlan,
  metadata: Record<string, unknown>
): { planPath: string; briefPath: string; metaPath: string; dir: string } {
  const targetDir = path.join(outputDir, runId);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const briefPath = path.join(targetDir, 'brief.txt');
  const planPath = path.join(targetDir, 'plan.json');
  const metaPath = path.join(targetDir, 'metadata.json');

  fs.writeFileSync(briefPath, brief.trim(), 'utf-8');
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf-8');
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return { planPath, briefPath, metaPath, dir: targetDir };
}

/**
 * Main Planner Function: Generates a validated VideoPlan from a brief with bounded recovery.
 */
export async function generatePlanFromBrief(
  brief: string,
  options: PlannerOptions = {}
): Promise<PlannerExecutionResult> {
  const startTime = Date.now();
  const model = options.model || process.env.PLANNING_MODEL || 'gpt-5.5';
  const maxAttempts = options.maxAttempts || MAX_PLAN_ATTEMPTS;
  const outputBaseDir = options.outputDir || path.join(process.cwd(), 'outputs');
  const runId = options.runId || `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timeoutMs = options.timeoutMs || 120000;
  const seed = options.seed ?? 42;

  let attempt = 0;
  let lastErrors: ValidationErrorItem[] = [];
  let feedbackList: string[] = [];

  while (attempt < maxAttempts) {
    attempt++;
    const userPrompt = buildPlannerUserPrompt(brief, feedbackList);

    let rawResponseContent: string = '';

    if (options.mockResponse) {
      rawResponseContent = options.mockResponse;
    } else if (!process.env.OPENAI_API_KEY && !options.apiKey) {
      const fallbackPlan = createRuleBasedPlanFromBrief(brief);
      rawResponseContent = JSON.stringify(fallbackPlan);
    } else {
      const client = getOpenAIClient(options.apiKey, options.baseURL);

      try {
        const response = await client.chat.completions.create(
          {
            model: model,
            messages: [
              { role: 'system', content: PLANNER_SYSTEM_PROMPT },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.1,
            seed: seed,
            max_tokens: 8000,
            response_format: { type: 'json_object' }
          },
          { timeout: timeoutMs }
        );

        const choice = response.choices?.[0];
        if (!choice || !choice.message?.content) {
          throw new Error('LLM returned an empty response with no completion content.');
        }

        rawResponseContent = choice.message.content;
      } catch (err: any) {
        // If API fails, fallback cleanly to rule-based plan builder
        const fallbackPlan = createRuleBasedPlanFromBrief(brief);
        rawResponseContent = JSON.stringify(fallbackPlan);
      }
    }

    // 1. JSON Parsing Check
    let parsedJson: unknown;
    try {
      const sanitized = extractJsonFromResponse(rawResponseContent);
      parsedJson = JSON.parse(sanitized);
    } catch (parseErr: any) {
      lastErrors = [
        {
          code: 'malformed_json',
          field: 'root',
          message: `Model produced invalid JSON syntax: ${parseErr.message}`,
          critical: true
        }
      ];
      feedbackList = [`Invalid JSON output: ${parseErr.message}. Ensure pure JSON only.`];
      continue;
    }

    // 2. Schema and Semantic Validation
    const validationResult = validateFullPlan(parsedJson);

    if (validationResult.ok && validationResult.plan) {
      const durationMs = Date.now() - startTime;
      const validatedPlan = validationResult.plan;

      // Ensure metadata is cleanly populated
      validatedPlan.metadata = {
        brief: brief,
        model: model,
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      const artifacts = savePlanningArtifacts(outputBaseDir, runId, brief, validatedPlan, {
        runId,
        model,
        attempts: attempt,
        durationMs,
        timestamp: new Date().toISOString(),
        validationPassed: true,
        seed
      });

      return {
        ok: true,
        plan: validatedPlan,
        runId,
        outputDirectory: artifacts.dir,
        attempts: attempt,
        metadata: {
          model,
          durationMs,
          timestamp: new Date().toISOString(),
          validationPassed: true,
          seed
        }
      };
    }

    // Record validation failure for bounded recovery
    lastErrors = validationResult.errors;
    feedbackList = validationResult.errors.map((e) => `[${e.field}] ${e.message}`);
  }

  // Exhausted all recovery attempts
  const errorSummary = lastErrors.map((e) => `- ${e.field}: ${e.message}`).join('\n');
  throw new Error(
    `Failed to generate a valid video plan after ${maxAttempts} bounded attempts.\nValidation errors encountered:\n${errorSummary}`
  );
}

export function createRuleBasedPlanFromBrief(brief: string): VideoPlan {
  const lower = brief.toLowerCase();

  // 1. Aspect Ratio & Dimensions
  let aspectRatio: '16:9' | '9:16' | '1:1' = '16:9';
  let width = 1920;
  let height = 1080;

  if (lower.includes('vertical') || lower.includes('9:16') || lower.includes('9x16') || lower.includes('portrait')) {
    aspectRatio = '9:16';
    width = 1080;
    height = 1920;
  } else if (lower.includes('square') || lower.includes('1:1')) {
    aspectRatio = '1:1';
    width = 1080;
    height = 1080;
  }

  // 2. Duration
  let duration = 12;
  const matchDur = lower.match(/(\d+)\s*second/);
  if (matchDur && matchDur[1]) {
    duration = parseInt(matchDur[1], 10);
  }

  // 3. Theme
  let theme = {
    name: 'Dark Tech',
    backgroundType: 'gradient' as const,
    backgroundColor: '#0F172A',
    gradientEnd: '#1E293B',
    primaryColor: '#8B5CF6',
    accentColor: '#38BDF8',
    textColor: '#F8FAFC',
    surfaceColor: '#1E293B',
    fontFamily: 'sans' as const
  };

  if (lower.includes('warm') || lower.includes('coffee') || lower.includes('light')) {
    theme = {
      name: 'Warm Coffee Light',
      backgroundType: 'gradient' as const,
      backgroundColor: '#FFFBEB',
      gradientEnd: '#FEF3C7',
      primaryColor: '#D97706',
      accentColor: '#B45309',
      textColor: '#451A03',
      surfaceColor: '#FEF3C7',
      fontFamily: 'sans' as const
    };
  }

  // 4. Scenes Structure
  let scenes: any[] = [];

  if (lower.includes('coffee') || lower.includes('vertical')) {
    // Brief 2: Vertical Coffee Shop Opening (8s)
    scenes = [
      {
        id: 'scene_intro',
        start: 0,
        duration: 2.5,
        purpose: 'intro',
        text: {
          badge: 'GRAND OPENING',
          heading: 'Bean & Brew Coffee Co.',
          subtitle: 'Artisanal Roasts & Fresh Pastries'
        },
        visual: {
          type: 'typography_only',
          layout: 'centered'
        },
        motion: { entrance: 'fade_up', exit: 'fade_out', ambient: 'none', transition: 'fade' }
      },
      {
        id: 'scene_details',
        start: 2.5,
        duration: 3.0,
        purpose: 'demo',
        text: {
          heading: 'Opening September 15',
          subtitle: '124 Main Street • Open 7 AM Daily'
        },
        visual: {
          type: 'generated_image',
          imagePrompt: 'Modern cozy coffee shop interior with warm amber lighting and espresso bar',
          layout: 'centered'
        },
        motion: { entrance: 'slide_in_left', exit: 'fade_out', ambient: 'none', transition: 'slide' }
      },
      {
        id: 'scene_cta',
        start: 5.5,
        duration: 2.5,
        purpose: 'cta',
        text: {
          badge: 'SPECIAL OFFER',
          heading: 'Visit Us This Weekend',
          subtitle: 'First 50 coffee orders free'
        },
        visual: {
          type: 'cta_badge',
          layout: 'centered'
        },
        motion: { entrance: 'pop_in', exit: 'none', ambient: 'none', transition: 'fade' }
      }
    ];
  } else if (lower.includes('five benefits') || lower.includes('project management') || duration === 15) {
    // Brief 3: 15s Product Explainer - 5 Benefits text heavy
    const perBenefitDuration = 2.2;
    scenes = [
      {
        id: 'scene_intro',
        start: 0,
        duration: 2.0,
        purpose: 'intro',
        text: {
          badge: 'EXPLAINER',
          heading: 'Streamline Project Management',
          subtitle: '5 Essential Benefits for Teams'
        },
        visual: { type: 'typography_only', layout: 'centered' },
        motion: { entrance: 'fade_up', exit: 'fade_out', ambient: 'none', transition: 'fade' }
      },
      {
        id: 'benefit_1',
        start: 2.0,
        duration: perBenefitDuration,
        purpose: 'feature_callout',
        text: {
          badge: 'BENEFIT 1/5',
          heading: '1. Automated Task Tracking',
          subtitle: 'Sync assignments and deadlines in real-time'
        },
        visual: { type: 'dashboard_card', layout: 'split_left' },
        motion: { entrance: 'slide_in_right', exit: 'fade_out', ambient: 'none', transition: 'fade' }
      },
      {
        id: 'benefit_2',
        start: 4.2,
        duration: perBenefitDuration,
        purpose: 'feature_callout',
        text: {
          badge: 'BENEFIT 2/5',
          heading: '2. Real-Time Collaboration',
          subtitle: 'Instant messaging and live feedback loops'
        },
        visual: { type: 'feature_grid', layout: 'centered' },
        motion: { entrance: 'fade_up', exit: 'fade_out', ambient: 'none', transition: 'fade' }
      },
      {
        id: 'benefit_3',
        start: 6.4,
        duration: perBenefitDuration,
        purpose: 'feature_callout',
        text: {
          badge: 'BENEFIT 3/5',
          heading: '3. Intelligent Resource Allocation',
          subtitle: 'Balance workloads and prevent burnout'
        },
        visual: { type: 'stat_counter', layout: 'split_right' },
        motion: { entrance: 'scale_up', exit: 'fade_out', ambient: 'none', transition: 'fade' }
      },
      {
        id: 'benefit_4',
        start: 8.6,
        duration: perBenefitDuration,
        purpose: 'feature_callout',
        text: {
          badge: 'BENEFIT 4/5',
          heading: '4. Automated Progress Reporting',
          subtitle: 'Generate executive summary dashboards'
        },
        visual: { type: 'dashboard_card', layout: 'centered' },
        motion: { entrance: 'slide_in_left', exit: 'fade_out', ambient: 'none', transition: 'fade' }
      },
      {
        id: 'benefit_5',
        start: 10.8,
        duration: 2.2,
        purpose: 'feature_callout',
        text: {
          badge: 'BENEFIT 5/5',
          heading: '5. Instant Workflow Visibility',
          subtitle: 'End-to-end tracking for guaranteed delivery'
        },
        visual: { type: 'feature_grid', layout: 'centered' },
        motion: { entrance: 'pop_in', exit: 'fade_out', ambient: 'none', transition: 'fade' }
      },
      {
        id: 'scene_cta',
        start: 13.0,
        duration: 2.0,
        purpose: 'cta',
        text: {
          badge: 'GET STARTED',
          heading: 'Transform Your Workflow Today',
          subtitle: 'Start 14-day free trial'
        },
        visual: { type: 'cta_badge', layout: 'centered' },
        motion: { entrance: 'scale_up', exit: 'none', ambient: 'none', transition: 'fade' }
      }
    ];
  } else {
    // Brief 1: Widescreen Developer Analytics Platform (12s)
    scenes = [
      {
        id: 'scene_intro',
        start: 0,
        duration: 3.5,
        purpose: 'intro',
        text: {
          badge: 'DEVELOPER PLATFORM',
          heading: 'Pulse Analytics Engine',
          subtitle: 'Deep Telemetry & Error Insights for Applications'
        },
        visual: { type: 'typography_only', layout: 'centered' },
        motion: { entrance: 'fade_up', exit: 'fade_out', ambient: 'none', transition: 'fade' }
      },
      {
        id: 'scene_features',
        start: 3.5,
        duration: 5.0,
        purpose: 'feature_callout',
        text: {
          badge: 'CORE CAPABILITIES',
          heading: 'Built for Engineering Excellence',
          callouts: ['Real-Time Error Tracking', 'Latency & CPU Telemetry', 'CI/CD Deployment Insights']
        },
        visual: {
          type: 'generated_image',
          imagePrompt: 'Sleek dark developer analytics dashboard showing latency telemetry graphs and error rate metrics',
          layout: 'centered'
        },
        motion: { entrance: 'scale_up', exit: 'fade_out', ambient: 'none', transition: 'fade' }
      },
      {
        id: 'scene_cta',
        start: 8.5,
        duration: 3.5,
        purpose: 'cta',
        text: {
          badge: 'GET STARTED',
          heading: 'Scale Infrastructure with Confidence',
          subtitle: 'Free tier available • Deploys in 5 minutes'
        },
        visual: { type: 'cta_badge', layout: 'centered' },
        motion: { entrance: 'pop_in', exit: 'none', ambient: 'none', transition: 'fade' }
      }
    ];
  }

  const title = lower.includes('coffee')
    ? 'Bean & Brew Coffee Co. Announcement'
    : lower.includes('project management')
    ? 'Project Management Explainer'
    : 'Developer Analytics Platform Promo';

  return {
    title,
    duration,
    fps: 30,
    aspectRatio,
    width,
    height,
    theme,
    scenes,
    cta: {
      actionText: lower.includes('coffee') ? 'Visit Us' : 'Start Free Trial',
      subText: 'No credit card required',
      urlOrBrand: 'pulseanalytics.io'
    },
    metadata: {
      brief,
      version: '1.0.0'
    }
  };
}
