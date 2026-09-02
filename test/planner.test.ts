import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  validatePlanSchema,
  validatePlanSemantics,
  validateFullPlan
} from '../src/planner/validator';
import { VideoPlan } from '../src/planner/schema';
import {
  generatePlanFromBrief,
  extractJsonFromResponse,
  savePlanningArtifacts,
  MAX_PLAN_ATTEMPTS
} from '../src/planner/planner';

const validReferencePlan: VideoPlan = {
  title: 'Pulse Analytics - Developer Platform Promo',
  duration: 12,
  fps: 30,
  aspectRatio: '16:9',
  width: 1920,
  height: 1080,
  theme: {
    name: 'dark-purple-cyber',
    backgroundType: 'gradient',
    backgroundColor: '#0B0F19',
    gradientEnd: '#1E1035',
    primaryColor: '#A855F7',
    accentColor: '#C084FC',
    textColor: '#F8FAFC',
    surfaceColor: '#151D2E',
    fontFamily: 'sans'
  },
  scenes: [
    {
      id: 'scene_1_intro',
      start: 0,
      duration: 3.5,
      purpose: 'intro',
      text: {
        badge: 'NEXT-GEN PLATFORM',
        heading: 'Pulse Analytics',
        subtitle: 'Real-Time Observability for Modern Engineering Teams'
      },
      visual: {
        type: 'typography_only',
        layout: 'centered'
      },
      motion: {
        entrance: 'fade_up',
        exit: 'fade_out',
        ambient: 'subtle_pulse',
        transition: 'fade'
      }
    },
    {
      id: 'scene_2_features',
      start: 3.5,
      duration: 4.5,
      purpose: 'feature_callout',
      text: {
        badge: 'POWERFUL INSIGHTS',
        heading: 'Full-Stack Velocity & Visibility',
        subtitle: 'Identify regressions before they reach your customers',
        callouts: ['Instant Query Tracing', 'CI/CD Bottleneck Detection', 'P99 Latency Heatmaps']
      },
      visual: {
        type: 'generated_image',
        imagePrompt:
          'Sleek futuristic developer analytics dark mode UI dashboard showing glowing purple telemetry graphs and code flow diagrams.',
        layout: 'split_right'
      },
      motion: {
        entrance: 'stagger_reveal',
        exit: 'fade_out',
        ambient: 'glow_shift',
        transition: 'fade'
      }
    },
    {
      id: 'scene_3_cta',
      start: 8,
      duration: 4,
      purpose: 'cta',
      text: {
        badge: 'GET STARTED',
        heading: 'Ship Faster, Debug Smarter',
        subtitle: 'Join 10,000+ engineers streamlining their production pipelines'
      },
      visual: {
        type: 'cta_badge',
        layout: 'centered'
      },
      motion: {
        entrance: 'scale_up',
        exit: 'none',
        ambient: 'subtle_pulse',
        transition: 'fade'
      }
    }
  ],
  cta: {
    actionText: 'Start Free Today',
    subText: 'No credit card required',
    urlOrBrand: 'pulseanalytics.dev',
    badge: '14-DAY PRO TRIAL'
  }
};

describe('Phase 1 - Structured Planning Pipeline Tests', () => {
  const testOutputDir = path.join(process.cwd(), 'test-outputs');

  beforeEach(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  // 1. Valid plan passes schema validation
  it('valid reference plan passes structural schema validation', () => {
    const result = validatePlanSchema(validReferencePlan);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.plan).toBeDefined();
  });

  // 2. Valid plan passes semantic validation
  it('valid reference plan passes full semantic validation', () => {
    const result = validatePlanSemantics(validReferencePlan);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.plan?.title).toBe('Pulse Analytics - Developer Platform Promo');
  });

  // 3. Invalid duration is rejected
  it('rejects non-positive total duration', () => {
    const invalidPlan = { ...validReferencePlan, duration: -5 };
    const result = validatePlanSemantics(invalidPlan);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'invalid_duration')).toBe(true);
  });

  // 4. Mismatched aspect ratio and dimensions is rejected
  it('rejects mismatched aspect ratio and dimensions', () => {
    const invalidPlan = {
      ...validReferencePlan,
      aspectRatio: '16:9' as const,
      width: 1080,
      height: 1920 // Mismatched vertical dimensions for 16:9
    };
    const result = validatePlanSemantics(invalidPlan);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'mismatched_dimensions')).toBe(true);
  });

  // 5. Overlapping scene timestamps are rejected
  it('rejects overlapping scene timestamps', () => {
    const invalidPlan = {
      ...validReferencePlan,
      scenes: [
        {
          ...validReferencePlan.scenes[0],
          start: 0,
          duration: 5.0
        },
        {
          ...validReferencePlan.scenes[1],
          start: 4.0, // Overlaps with scene 0 (which ends at 5.0)
          duration: 4.0
        },
        {
          ...validReferencePlan.scenes[2],
          start: 8.0,
          duration: 4.0
        }
      ]
    };
    const result = validatePlanSemantics(invalidPlan);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'overlapping_scenes')).toBe(true);
  });

  // 6. Scene exceeding total duration is rejected
  it('rejects scenes extending past the overall video duration', () => {
    const invalidPlan = {
      ...validReferencePlan,
      duration: 10, // Total duration 10s, but scene 3 ends at 12s
      scenes: validReferencePlan.scenes
    };
    const result = validatePlanSemantics(invalidPlan);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'scene_exceeds_duration')).toBe(true);
  });

  // 7. Empty scene heading is rejected
  it('rejects empty or whitespace-only scene headings', () => {
    const invalidPlan = {
      ...validReferencePlan,
      scenes: [
        {
          ...validReferencePlan.scenes[0],
          text: {
            ...validReferencePlan.scenes[0].text,
            heading: '   '
          }
        },
        validReferencePlan.scenes[1],
        validReferencePlan.scenes[2]
      ]
    };
    const result = validatePlanSemantics(invalidPlan);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'empty_heading')).toBe(true);
  });

  // 8. Missing imagePrompt when visual.type is generated_image is rejected
  it('rejects generated_image visual type when imagePrompt is omitted or too short', () => {
    const invalidPlan = {
      ...validReferencePlan,
      scenes: [
        validReferencePlan.scenes[0],
        {
          ...validReferencePlan.scenes[1],
          visual: {
            type: 'generated_image' as const,
            imagePrompt: '', // Empty prompt
            layout: 'split_right' as const
          }
        },
        validReferencePlan.scenes[2]
      ]
    };
    const result = validatePlanSemantics(invalidPlan);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'missing_image_prompt')).toBe(true);
  });

  // 9. Duplicate scene IDs are rejected
  it('rejects duplicate scene IDs', () => {
    const invalidPlan = {
      ...validReferencePlan,
      scenes: [
        { ...validReferencePlan.scenes[0], id: 'scene_duplicate' },
        { ...validReferencePlan.scenes[1], id: 'scene_duplicate' },
        validReferencePlan.scenes[2]
      ]
    };
    const result = validatePlanSemantics(invalidPlan);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'duplicate_scene_id')).toBe(true);
  });

  // 10. Extract JSON helper cleanly strips code fences
  it('extractJsonFromResponse handles markdown code blocks and raw JSON', () => {
    const rawJson = '{"title": "Test"}';
    const fencedJson = '```json\n{"title": "Test"}\n```';
    expect(extractJsonFromResponse(rawJson)).toBe('{"title": "Test"}');
    expect(extractJsonFromResponse(fencedJson)).toBe('{"title": "Test"}');
  });

  // 11. Bounded recovery and mock execution
  it('generates valid plan with mock response and writes artifacts', async () => {
    const brief = 'Test developer analytics brief';
    const result = await generatePlanFromBrief(brief, {
      mockResponse: JSON.stringify(validReferencePlan),
      outputDir: testOutputDir,
      runId: 'test_run_1'
    });

    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.plan.title).toBe(validReferencePlan.title);

    // Verify artifact preservation
    const planFile = path.join(testOutputDir, 'test_run_1', 'plan.json');
    const briefFile = path.join(testOutputDir, 'test_run_1', 'brief.txt');
    const metaFile = path.join(testOutputDir, 'test_run_1', 'metadata.json');

    expect(fs.existsSync(planFile)).toBe(true);
    expect(fs.existsSync(briefFile)).toBe(true);
    expect(fs.existsSync(metaFile)).toBe(true);

    const savedPlan = JSON.parse(fs.readFileSync(planFile, 'utf-8'));
    expect(savedPlan.title).toBe(validReferencePlan.title);
  });

  // 12. Fails loudly when max attempts exceeded
  it('fails loudly after exceeding maximum bounded attempts on corrupt responses', async () => {
    const invalidJson = '{"title": "Broken", "scenes": []}';
    await expect(
      generatePlanFromBrief('Test brief', {
        mockResponse: invalidJson,
        maxAttempts: 2,
        outputDir: testOutputDir
      })
    ).rejects.toThrow(/Failed to generate a valid video plan after 2 bounded attempts/);
  });
});
