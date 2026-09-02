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
            // GPT-5.5 reasoning token compatibility
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
        if (err.name === 'APIConnectionTimeoutError' || err.code === 'ETIMEDOUT') {
          throw new Error(`LLM Gateway request timed out after ${timeoutMs}ms.`);
        }
        if (err.status === 401) {
          throw new Error(`LLM Gateway authentication failed (401). Check OPENAI_API_KEY.`);
        }
        if (err.status === 404) {
          throw new Error(`LLM Model '${model}' or endpoint not found (404).`);
        }
        throw new Error(`LLM API invocation failed: ${err.message || String(err)}`);
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
