import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  extractAndParseJson,
  calculateSummary,
  normalizeCheckOutput,
  isCompositionValid,
  checkComposition
} from '../src/checker/hyperframesChecker.js';
import { classifyIssueCategory, normalizeFinding } from '../src/checker/classifier.js';
import { sanitizeOutput, saveCheckArtifact } from '../src/checker/artifact.js';
import { formatCheckReport, formatIssueForDisplay } from '../src/checker/formatter.js';
import { HyperFramesCheckResult, NormalizedIssue } from '../src/checker/types.js';

describe('HyperFrames Checker - Defensive Parsing & Extraction', () => {
  it('extracts and parses direct clean JSON payload', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'checks', '1-success.json');
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    const result = extractAndParseJson(raw);

    expect(result.parseError).toBeUndefined();
    expect(result.parsed).toBeDefined();
    expect(result.parsed?.ok).toBe(true);
    expect(result.parsed?.lint?.findings).toHaveLength(0);
  });

  it('extracts JSON when CLI stdout contains informational log prefix lines', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'checks', '8-stdout-with-logs.txt');
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    const result = extractAndParseJson(raw);

    expect(result.parseError).toBeUndefined();
    expect(result.parsed).toBeDefined();
    expect(result.parsed?.ok).toBe(true);
  });

  it('handles malformed JSON defensively without crashing', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'checks', '9-malformed-json.txt');
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    const result = extractAndParseJson(raw);

    expect(result.parsed).toBeUndefined();
    expect(result.parseError).toBeDefined();
    expect(typeof result.parseError).toBe('string');
  });

  it('handles empty stdout gracefully', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'checks', '10-empty-stdout.txt');
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    const result = extractAndParseJson(raw);

    expect(result.parsed).toBeUndefined();
    expect(result.parseError).toBe('Empty stdout received from HyperFrames check');
  });
});

describe('HyperFrames Checker - Issue Classification & Normalization', () => {
  it('classifies explicit stage categories accurately', () => {
    expect(classifyIssueCategory('lint', { code: 'any_code', message: 'msg', severity: 'error' })).toBe('lint');
    expect(classifyIssueCategory('runtime', { code: 'any_code', message: 'msg', severity: 'error' })).toBe('runtime');
    expect(classifyIssueCategory('layout', { code: 'any_code', message: 'msg', severity: 'error' })).toBe('layout');
    expect(classifyIssueCategory('contrast', { code: 'any_code', message: 'msg', severity: 'error' })).toBe('contrast');
    expect(classifyIssueCategory('motion', { code: 'any_code', message: 'msg', severity: 'error' })).toBe('motion');
  });

  it('uses message and code fallback classification when stage is missing', () => {
    // Contrast
    expect(
      classifyIssueCategory(undefined, {
        code: 'contrast_aa_failure',
        message: 'Contrast is 1.2:1',
        severity: 'error'
      })
    ).toBe('contrast');

    // Layout
    expect(
      classifyIssueCategory(undefined, {
        code: 'canvas_overflow',
        message: 'Text extends outside the composition canvas',
        severity: 'info'
      })
    ).toBe('layout');

    // Motion
    expect(
      classifyIssueCategory(undefined, {
        code: 'motion_assertion_failed',
        message: 'Timeline tween did not reach target',
        severity: 'error'
      })
    ).toBe('motion');

    // Lint
    expect(
      classifyIssueCategory(undefined, {
        code: 'missing_timeline_registry',
        message: 'Missing window.__timelines',
        severity: 'error'
      })
    ).toBe('lint');

    // Runtime
    expect(
      classifyIssueCategory(undefined, {
        code: 'uncaught_exception',
        message: 'Uncaught TypeError in script',
        severity: 'error'
      })
    ).toBe('runtime');
  });

  it('preserves unclassifiable findings under unknown category without discarding', () => {
    const rawFinding = {
      code: 'unprecedented_custom_rule',
      message: 'Some future diagnostic message',
      severity: 'error' as const,
      foo: 'bar'
    };

    const category = classifyIssueCategory(undefined, rawFinding);
    expect(category).toBe('unknown');

    const normalized = normalizeFinding(rawFinding, undefined, 0);
    expect(normalized.category).toBe('unknown');
    expect(normalized.raw).toEqual(rawFinding);
  });

  it('normalizes contrast details with fix recommendations', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'checks', '3-contrast-failure.json');
    const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    const issues = normalizeCheckOutput(raw);

    expect(issues).toHaveLength(2);
    expect(issues[0].category).toBe('contrast');
    expect(issues[0].contrastDetails?.suggestedColor).toBe('rgb(148,148,148)');
    expect(issues[0].contrastDetails?.ratio).toBe(1.12);
    expect(issues[0].contrastDetails?.requiredRatio).toBe(3);
  });

  it('normalizes layout overflow findings with geometric rect and bbox data', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'checks', '2-layout-overflow.json');
    const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    const issues = normalizeCheckOutput(raw);

    expect(issues).toHaveLength(2);
    expect(issues[0].category).toBe('layout');
    expect(issues[0].layoutDetails?.overflow?.right).toBe(82.41);
    expect(issues[0].layoutDetails?.rect?.width).toBe(112.44);
  });
});

describe('HyperFrames Checker - Gate Verification & Summary Logic', () => {
  it('identifies valid composition correctly (ok=true, exitCode=0, 0 errors)', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'checks', '1-success.json');
    const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    const issues = normalizeCheckOutput(raw);
    const summary = calculateSummary(issues, raw);

    const mockResult: HyperFramesCheckResult = {
      ok: true,
      exitCode: 0,
      issues,
      summary,
      rawOutput: JSON.stringify(raw),
      stderr: '',
      rawJson: raw,
      checkedDirectory: '/dummy/comp',
      durationMs: 120,
      hasFatalProcessError: false
    };

    expect(isCompositionValid(mockResult)).toBe(true);
    expect(mockResult.summary.totalErrors).toBe(0);
    expect(mockResult.summary.totalIssues).toBe(0);
  });

  it('fails composition when contrast errors exist', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'checks', '3-contrast-failure.json');
    const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    const issues = normalizeCheckOutput(raw);
    const summary = calculateSummary(issues, raw);

    const mockResult: HyperFramesCheckResult = {
      ok: false,
      exitCode: 1,
      issues,
      summary,
      rawOutput: JSON.stringify(raw),
      stderr: '',
      rawJson: raw,
      checkedDirectory: '/dummy/comp',
      durationMs: 150,
      hasFatalProcessError: false
    };

    expect(isCompositionValid(mockResult)).toBe(false);
    expect(mockResult.summary.contrastErrors).toBe(2);
    expect(mockResult.summary.totalErrors).toBe(2);
  });

  it('fails composition when exit code is non-zero even if JSON was parsed', () => {
    const mockResult: HyperFramesCheckResult = {
      ok: true,
      exitCode: 1, // Non-zero exit code
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
      rawOutput: '{}',
      stderr: 'Process crashed',
      checkedDirectory: '/dummy/comp',
      durationMs: 100,
      hasFatalProcessError: false
    };

    expect(isCompositionValid(mockResult)).toBe(false);
  });

  it('fails composition when fatal process error occurs', () => {
    const mockResult: HyperFramesCheckResult = {
      ok: false,
      exitCode: 1,
      issues: [
        {
          id: 'runtime:fatal:0:root:0',
          category: 'runtime',
          severity: 'error',
          code: 'verification_non_json_output',
          message: 'Empty stdout received',
          raw: {}
        }
      ],
      summary: calculateSummary([
        {
          id: 'runtime:fatal:0:root:0',
          category: 'runtime',
          severity: 'error',
          code: 'verification_non_json_output',
          message: 'Empty stdout received',
          raw: {}
        }
      ]),
      rawOutput: '',
      stderr: 'SIGSEGV',
      checkedDirectory: '/dummy/comp',
      durationMs: 50,
      hasFatalProcessError: true
    };

    expect(isCompositionValid(mockResult)).toBe(false);
  });
});

describe('HyperFrames Checker - Secret Sanitization & Artifact Management', () => {
  const tempTestArtifactsDir = path.join(process.cwd(), 'test-artifacts-check-tmp');

  beforeEach(() => {
    fs.mkdirSync(tempTestArtifactsDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempTestArtifactsDir)) {
      fs.rmSync(tempTestArtifactsDir, { recursive: true, force: true });
    }
  });

  it('sanitizes OpenAI, Gemini, and Bearer secrets from output strings', () => {
    const rawInput =
      'Calling OpenAI with sk-proj-1234567890abcdefghijklmn and Gemini with AIzaSyAbcd1234efgh5678ijkl9012mnop3456 and Bearer eyJhbGciOiJIUzI1NiJ9.secret';
    const sanitized = sanitizeOutput(rawInput);

    expect(sanitized).not.toContain('sk-proj-1234567890abcdefghijklmn');
    expect(sanitized).not.toContain('AIzaSyAbcd1234efgh5678ijkl9012mnop3456');
    expect(sanitized).toContain('[REDACTED_OPENAI_KEY]');
    expect(sanitized).toContain('[REDACTED_GEMINI_KEY]');
    expect(sanitized).toContain('Bearer [REDACTED_TOKEN]');
  });

  it('creates sequential check artifacts (check-1.json, check-2.json)', () => {
    const mockResult: HyperFramesCheckResult = {
      ok: true,
      exitCode: 0,
      issues: [],
      summary: calculateSummary([]),
      rawOutput: '{"ok": true}',
      stderr: '',
      checkedDirectory: tempTestArtifactsDir,
      durationMs: 40,
      hasFatalProcessError: false
    };

    const path1 = saveCheckArtifact(mockResult, { artifactsDir: tempTestArtifactsDir });
    expect(path1).toBeDefined();
    expect(path1).toContain('check-1.json');
    expect(fs.existsSync(path1!)).toBe(true);

    const path2 = saveCheckArtifact(mockResult, { artifactsDir: tempTestArtifactsDir });
    expect(path2).toBeDefined();
    expect(path2).toContain('check-2.json');
    expect(fs.existsSync(path2!)).toBe(true);

    const content1 = JSON.parse(fs.readFileSync(path1!, 'utf-8'));
    expect(content1.attempt).toBe(1);
    expect(content1.ok).toBe(true);
  });
});

describe('HyperFrames Checker - Human Readable Formatter', () => {
  it('formats human readable report for passing result', () => {
    const mockResult: HyperFramesCheckResult = {
      ok: true,
      exitCode: 0,
      issues: [],
      summary: calculateSummary([]),
      rawOutput: '',
      stderr: '',
      checkedDirectory: 'outputs/run-001/composition',
      durationMs: 100,
      hasFatalProcessError: false
    };

    const text = formatCheckReport(mockResult);
    expect(text).toContain('## HyperFrames Verification');
    expect(text).toContain('outputs/run-001/composition');
    expect(text).toContain('✓ HyperFrames gate passed');
    expect(text).toContain('Issues: 0');
  });

  it('formats human readable report for failed result with issue details', () => {
    const issue: NormalizedIssue = {
      id: 'contrast:contrast_aa_failure:0.278:#title:0',
      category: 'contrast',
      severity: 'error',
      code: 'contrast_aa_failure',
      message: 'Contrast is 1.12:1; WCAG AA requires 3:1.',
      selector: '#title',
      time: 0.278,
      contrastDetails: {
        ratio: 1.12,
        requiredRatio: 3,
        suggestedColor: 'rgb(148,148,148)'
      },
      raw: {}
    };

    const mockResult: HyperFramesCheckResult = {
      ok: false,
      exitCode: 1,
      issues: [issue],
      summary: calculateSummary([issue]),
      rawOutput: '',
      stderr: '',
      checkedDirectory: 'outputs/run-001/composition',
      durationMs: 100,
      hasFatalProcessError: false
    };

    const text = formatCheckReport(mockResult);
    expect(text).toContain('✗ FAILED');
    expect(text).toContain('[contrast] (error) #title');
    expect(text).toContain('Contrast is 1.12:1; WCAG AA requires 3:1.');
    expect(text).toContain('Suggested fix color: rgb(148,148,148)');
  });
});

describe('HyperFrames Checker - Live Integration Check', () => {
  it('validates actual generated reference composition from Phase 2/3', async () => {
    const referenceCompDir = path.resolve('outputs/run_pulse_analytics_developer_plat_16x9/composition');

    if (!fs.existsSync(referenceCompDir)) {
      console.warn('Skipping live integration test: reference composition not found.');
      return;
    }

    const result = await checkComposition(referenceCompDir, {
      saveArtifact: true
    });

    expect(result.checkedDirectory).toBe(referenceCompDir);
    expect(result.exitCode).toBe(0);
    expect(result.ok).toBe(true);
    expect(result.hasFatalProcessError).toBe(false);
    expect(result.summary.totalErrors).toBe(0);
    expect(isCompositionValid(result)).toBe(true);
    expect(result.artifactPath).toBeDefined();
    expect(fs.existsSync(result.artifactPath!)).toBe(true);
  }, 45000); // 45s timeout for full headless browser verification
});
