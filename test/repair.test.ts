import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { VideoPlan } from '../src/planner/schema.js';
import { NormalizedIssue, HyperFramesCheckResult } from '../src/checker/types.js';
import { repairPlan } from '../src/repair/repair.js';
import {
  buildRepairCategoryGuidance,
  buildRepairUserPrompt,
  formatIssueForRepairPrompt
} from '../src/repair/prompt.js';
import { detectPlanDrift, isIdenticalPlan } from '../src/repair/drift.js';
import { runSelfVerificationLoop } from '../src/repair/runner.js';
import { sanitizeOutput } from '../src/checker/artifact.js';

const mockOriginalPlan: VideoPlan = {
  title: 'Developer Platform Motion Ad',
  duration: 12,
  fps: 30,
  aspectRatio: '16:9',
  width: 1920,
  height: 1080,
  theme: {
    name: 'Dark Tech',
    backgroundType: 'gradient',
    backgroundColor: '#0F172A',
    gradientEnd: '#1E293B',
    primaryColor: '#8B5CF6',
    accentColor: '#38BDF8',
    textColor: '#F8FAFC',
    surfaceColor: '#1E293B',
    fontFamily: 'sans'
  },
  scenes: [
    {
      id: 'scene_intro',
      start: 0,
      duration: 4,
      purpose: 'intro',
      text: {
        heading: 'Accelerate Your Engineering Workflow'
      },
      visual: {
        type: 'typography_only',
        layout: 'centered'
      },
      motion: {
        entrance: 'fade_up',
        exit: 'fade_out',
        ambient: 'none',
        transition: 'fade'
      }
    },
    {
      id: 'scene_outro',
      start: 4,
      duration: 8,
      purpose: 'cta',
      text: {
        heading: 'Try Free Today'
      },
      visual: {
        type: 'cta_badge',
        layout: 'centered'
      },
      motion: {
        entrance: 'fade_up',
        exit: 'fade_out',
        ambient: 'none',
        transition: 'fade'
      }
    }
  ]
};

describe('Phase 5 — Repair Module: Prompt Construction & Guidance', () => {
  it('builds category-specific guidance for LAYOUT and CONTRAST issues', () => {
    const issues: NormalizedIssue[] = [
      {
        id: '1',
        category: 'layout',
        severity: 'error',
        code: 'text_overflow',
        message: 'Heading text extends past container bounds',
        raw: {}
      },
      {
        id: '2',
        category: 'contrast',
        severity: 'error',
        code: 'contrast_aa_failure',
        message: 'Contrast ratio 1.5:1 is below 3:1 WCAG AA minimum',
        contrastDetails: {
          ratio: 1.5,
          requiredRatio: 3,
          suggestedColor: '#FFFFFF'
        },
        raw: {}
      }
    ];

    const guidance = buildRepairCategoryGuidance(issues);
    expect(guidance).toContain('LAYOUT ISSUES DETECTED');
    expect(guidance).toContain('CONTRAST ISSUES DETECTED');
    expect(guidance).toContain('suggested color');

    const formattedIssue = formatIssueForRepairPrompt(issues[1], 1);
    expect(formattedIssue).toContain('Category: CONTRAST');
    expect(formattedIssue).toContain('Measured Ratio: 1.5:1');
    expect(formattedIssue).toContain('Suggested Color: #FFFFFF');
  });

  it('handles UNKNOWN issues without discarding raw context', () => {
    const rawData = { futureRuleId: 'RULE_999', detail: 'Unknown structural conflict' };
    const issue: NormalizedIssue = {
      id: '99',
      category: 'unknown',
      severity: 'error',
      code: 'unprecedented_error',
      message: 'An unknown validation error occurred',
      raw: rawData
    };

    const formatted = formatIssueForRepairPrompt(issue, 0);
    expect(formatted).toContain('Raw Finding Context');
    expect(formatted).toContain('RULE_999');

    const prompt = buildRepairUserPrompt(mockOriginalPlan, mockOriginalPlan, [issue]);
    expect(prompt).toContain('RULE_999');
  });
});

describe('Phase 5 — Repair Module: Drift & Identical Plan Detection', () => {
  it('detects identical plans to prevent infinite loops', () => {
    const planA = JSON.parse(JSON.stringify(mockOriginalPlan));
    const planB = JSON.parse(JSON.stringify(mockOriginalPlan));

    expect(isIdenticalPlan(planA, planB)).toBe(true);

    planB.theme.textColor = '#000000';
    expect(isIdenticalPlan(planA, planB)).toBe(false);
  });

  it('detects unauthorized aspect ratio drift', () => {
    const modifiedPlan = JSON.parse(JSON.stringify(mockOriginalPlan));
    modifiedPlan.aspectRatio = '9:16';
    modifiedPlan.width = 1080;
    modifiedPlan.height = 1920;

    const drift = detectPlanDrift(mockOriginalPlan, modifiedPlan);
    expect(drift.drifted).toBe(true);
    expect(drift.reason).toContain('Aspect ratio changed');
  });

  it('detects scene dropping drift', () => {
    const modifiedPlan: VideoPlan = JSON.parse(JSON.stringify(mockOriginalPlan));
    modifiedPlan.scenes = [];

    const drift = detectPlanDrift(mockOriginalPlan, modifiedPlan);
    expect(drift.drifted).toBe(true);
    expect(drift.reason).toContain('removed all scenes');
  });
});

describe('Phase 5 — Repair Module: repairPlan Execution', () => {
  it('successfully repairs plan with valid LLM JSON response', async () => {
    const repairedPlan: VideoPlan = JSON.parse(JSON.stringify(mockOriginalPlan));
    repairedPlan.theme.textColor = '#FFFFFF';

    const issues: NormalizedIssue[] = [
      {
        id: 'c1',
        category: 'contrast',
        severity: 'error',
        code: 'contrast_aa_failure',
        message: 'Insufficient contrast',
        raw: {}
      }
    ];

    const result = await repairPlan(mockOriginalPlan, mockOriginalPlan, issues, {
      mockResponse: JSON.stringify(repairedPlan)
    });

    expect(result.ok).toBe(true);
    expect(result.repairedPlan).toBeDefined();
    expect(result.repairedPlan?.theme.textColor).toBe('#FFFFFF');
  });

  it('rejects malformed JSON response', async () => {

    const issues: NormalizedIssue[] = [
      {
        id: '1',
        category: 'layout',
        severity: 'error',
        code: 'overflow',
        message: 'Overflow',
        raw: {}
      }
    ];

    const result = await repairPlan(mockOriginalPlan, mockOriginalPlan, issues, {
      mockResponse: 'Invalid JSON { bad syntax '
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('malformed JSON syntax');
  });

  it('rejects schema-invalid repair response', async () => {
    const invalidPlan = {
      title: 'Bad Plan',
      duration: -5, // Invalid negative duration
      scenes: []
    };

    const issues: NormalizedIssue[] = [
      { id: '1', category: 'runtime', severity: 'error', code: 'err', message: 'err', raw: {} }
    ];

    const result = await repairPlan(mockOriginalPlan, mockOriginalPlan, issues, {
      mockResponse: JSON.stringify(invalidPlan)
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('schema/semantic validation');
  });

  it('rejects repair when model returns an identical plan', async () => {
    const issues: NormalizedIssue[] = [
      { id: '1', category: 'contrast', severity: 'error', code: 'err', message: 'err', raw: {} }
    ];

    const result = await repairPlan(mockOriginalPlan, mockOriginalPlan, issues, {
      mockResponse: JSON.stringify(mockOriginalPlan)
    });

    expect(result.ok).toBe(false);
    expect(result.isIdenticalPlan).toBe(true);
    expect(result.error).toContain('identical plan');
  });
});

describe('Phase 5 — Self-Verification & Repair Loop Orchestrator', () => {
  const tempTestDir = path.join(process.cwd(), 'test-outputs-repair-loop');

  beforeEach(() => {
    fs.mkdirSync(tempTestDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempTestDir)) {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    }
  });

  it('17. Deterministic Mock Repair Scenario (Attempt 1 Fails -> Repaired -> Attempt 2 Passes)', async () => {
    const mockCheckFailed: HyperFramesCheckResult = {
      ok: false,
      exitCode: 1,
      issues: [
        {
          id: 'layout:overflow:heading:0',
          category: 'layout',
          severity: 'error',
          code: 'text_overflow',
          message: 'Heading overflow in scene_intro',
          raw: {}
        }
      ],
      summary: {
        lintErrors: 0,
        lintWarnings: 0,
        runtimeErrors: 0,
        runtimeWarnings: 0,
        layoutErrors: 1,
        layoutWarnings: 0,
        contrastErrors: 0,
        contrastWarnings: 0,
        motionErrors: 0,
        motionWarnings: 0,
        unknownErrors: 0,
        unknownWarnings: 0,
        totalErrors: 1,
        totalWarnings: 0,
        totalInfos: 0,
        totalIssues: 1
      },
      rawOutput: '{}',
      stderr: '',
      checkedDirectory: '/dummy/comp',
      durationMs: 100,
      hasFatalProcessError: false
    };

    const mockCheckPassed: HyperFramesCheckResult = {
      ok: true,
      exitCode: 0,
      issues: [],
      summary: {
        lintErrors: 0,
        lintWarnings: 0,
        runtimeErrors: 0,
        runtimeWarnings: 0,
        layoutErrors: 0,
        layoutWarnings: 0,
        contrastErrors: 0,
        contrastWarnings: 0,
        motionErrors: 0,
        motionWarnings: 0,
        unknownErrors: 0,
        unknownWarnings: 0,
        totalErrors: 0,
        totalWarnings: 0,
        totalInfos: 0,
        totalIssues: 0
      },
      rawOutput: '{"ok": true}',
      stderr: '',
      checkedDirectory: '/dummy/comp',
      durationMs: 90,
      hasFatalProcessError: false
    };

    const repairedPlan = JSON.parse(JSON.stringify(mockOriginalPlan));
    repairedPlan.scenes[0].text.heading = 'Shorter Heading';

    const loopResult = await runSelfVerificationLoop('Test brief', mockOriginalPlan, {
      outputDir: tempTestDir,
      runId: 'mock-repair-run',
      maxRepairAttempts: 3,
      mockCheckResults: [mockCheckFailed, mockCheckPassed],
      mockRepairResponses: [JSON.stringify(repairedPlan)]
    });

    expect(loopResult.ok).toBe(true);
    expect(loopResult.attempts).toBe(2);
    expect(loopResult.finalCompositionDir).toBeDefined();
    expect(fs.existsSync(loopResult.finalCompositionDir!)).toBe(true);

    const historyFile = path.join(tempTestDir, 'mock-repair-run', 'repair-history.json');
    expect(fs.existsSync(historyFile)).toBe(true);
    const history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    expect(history).toHaveLength(2);
    expect(history[0].status).toBe('failed');
    expect(history[1].status).toBe('passed');
  });

  it('18. Forced-Failure Scenario (Max Repair Attempts Exhausted)', async () => {
    const mockCheckAlwaysFails: HyperFramesCheckResult = {
      ok: false,
      exitCode: 1,
      issues: [
        {
          id: 'contrast:fail:0',
          category: 'contrast',
          severity: 'error',
          code: 'contrast_aa_failure',
          message: 'Persistent contrast error',
          raw: {}
        }
      ],
      summary: {
        lintErrors: 0,
        lintWarnings: 0,
        runtimeErrors: 0,
        runtimeWarnings: 0,
        layoutErrors: 0,
        layoutWarnings: 0,
        contrastErrors: 1,
        contrastWarnings: 0,
        motionErrors: 0,
        motionWarnings: 0,
        unknownErrors: 0,
        unknownWarnings: 0,
        totalErrors: 1,
        totalWarnings: 0,
        totalInfos: 0,
        totalIssues: 1
      },
      rawOutput: '{}',
      stderr: '',
      checkedDirectory: '/dummy/comp',
      durationMs: 80,
      hasFatalProcessError: false
    };

    // Return different plans on each attempt to avoid identical plan rejection
    const planAttempt2 = JSON.parse(JSON.stringify(mockOriginalPlan));
    planAttempt2.theme.textColor = '#EEEEEE';

    const planAttempt3 = JSON.parse(JSON.stringify(mockOriginalPlan));
    planAttempt3.theme.textColor = '#DDDDDD';

    const loopResult = await runSelfVerificationLoop('Test brief', mockOriginalPlan, {
      outputDir: tempTestDir,
      runId: 'forced-failure-run',
      maxRepairAttempts: 3,
      mockCheckResults: [mockCheckAlwaysFails, mockCheckAlwaysFails, mockCheckAlwaysFails],
      mockRepairResponses: [JSON.stringify(planAttempt2), JSON.stringify(planAttempt3)]
    });

    expect(loopResult.ok).toBe(false);
    expect(loopResult.attempts).toBe(3);
    expect(loopResult.errorMessage).toContain('HyperFrames validation did not pass after 3 repair attempts');

    // Ensure final composition is NOT promoted to root output directory
    const rootCompDir = path.join(tempTestDir, 'forced-failure-run', 'composition');
    expect(fs.existsSync(rootCompDir)).toBe(false);

    // Verify repair history saved with all failed attempts
    const historyFile = path.join(tempTestDir, 'forced-failure-run', 'repair-history.json');
    expect(fs.existsSync(historyFile)).toBe(true);
    const history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    expect(history).toHaveLength(3);
    expect(history.every((h: any) => h.status === 'failed')).toBe(true);
  });

  it('sanitizes secrets from repair artifacts and history', () => {
    const rawArtifact = JSON.stringify({
      apiKey: 'sk-proj-1234567890abcdefghijklmn',
      token: 'AIzaSyAbcd1234efgh5678ijkl9012mnop3456'
    });

    const sanitized = sanitizeOutput(rawArtifact);
    expect(sanitized).not.toContain('sk-proj-1234567890abcdefghijklmn');
    expect(sanitized).not.toContain('AIzaSyAbcd1234efgh5678ijkl9012mnop3456');
    expect(sanitized).toContain('[REDACTED_OPENAI_KEY]');
    expect(sanitized).toContain('[REDACTED_GEMINI_KEY]');
  });
});
