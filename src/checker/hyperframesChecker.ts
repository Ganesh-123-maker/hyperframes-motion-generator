import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import {
  CheckOptions,
  HyperFramesCheckResult,
  HyperFramesCheckSummary,
  HyperFramesFinding,
  HyperFramesRawCheckOutput,
  NormalizedIssue
} from './types.js';
import { normalizeFinding } from './classifier.js';
import { sanitizeOutput, saveCheckArtifact } from './artifact.js';

/**
 * Extracts and parses the outermost JSON object from CLI stdout defensively.
 * Handles cases where CLI outputs prefix logs before the JSON payload.
 */
export function extractAndParseJson(stdout: string): {
  parsed?: HyperFramesRawCheckOutput;
  parseError?: string;
} {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return { parseError: 'Empty stdout received from HyperFrames check' };
  }

  // 1. Direct parse attempt
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      return { parsed };
    }
  } catch {
    // Fall through to boundary extraction
  }

  // 2. Extract substring between first '{' and last '}'
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(jsonCandidate);
      if (parsed && typeof parsed === 'object') {
        return { parsed };
      }
    } catch (err: any) {
      return {
        parseError: `Failed to parse extracted JSON object candidate: ${err.message}`
      };
    }
  }

  return {
    parseError: 'No valid JSON object structure found in HyperFrames check stdout'
  };
}

/**
 * Calculates issue count summary across stages.
 */
export function calculateSummary(
  issues: NormalizedIssue[],
  rawJson?: HyperFramesRawCheckOutput
): HyperFramesCheckSummary {
  const summary: HyperFramesCheckSummary = {
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
    totalIssues: issues.length
  };

  for (const issue of issues) {
    if (issue.severity === 'error') {
      summary.totalErrors++;
      if (issue.category === 'lint') summary.lintErrors++;
      else if (issue.category === 'runtime') summary.runtimeErrors++;
      else if (issue.category === 'layout') summary.layoutErrors++;
      else if (issue.category === 'contrast') summary.contrastErrors++;
      else if (issue.category === 'motion') summary.motionErrors++;
      else summary.unknownErrors++;
    } else if (issue.severity === 'warning') {
      summary.totalWarnings++;
      if (issue.category === 'lint') summary.lintWarnings++;
      else if (issue.category === 'runtime') summary.runtimeWarnings++;
      else if (issue.category === 'layout') summary.layoutWarnings++;
      else if (issue.category === 'contrast') summary.contrastWarnings++;
      else if (issue.category === 'motion') summary.motionWarnings++;
      else summary.unknownWarnings++;
    } else {
      summary.totalInfos++;
    }
  }

  // Reconcile with raw counts if provided
  if (rawJson?.lint?.errorCount && summary.lintErrors < rawJson.lint.errorCount) {
    summary.lintErrors = rawJson.lint.errorCount;
  }
  if (rawJson?.contrast?.errorCount && summary.contrastErrors < rawJson.contrast.errorCount) {
    summary.contrastErrors = rawJson.contrast.errorCount;
  }
  if (rawJson?.layout?.errorCount && summary.layoutErrors < rawJson.layout.errorCount) {
    summary.layoutErrors = rawJson.layout.errorCount;
  }
  if (rawJson?.runtime?.errorCount && summary.runtimeErrors < rawJson.runtime.errorCount) {
    summary.runtimeErrors = rawJson.runtime.errorCount;
  }

  summary.totalErrors =
    summary.lintErrors +
    summary.runtimeErrors +
    summary.layoutErrors +
    summary.contrastErrors +
    summary.motionErrors +
    summary.unknownErrors;

  return summary;
}

/**
 * Normalizes all findings from raw check output stages.
 */
export function normalizeCheckOutput(rawJson: HyperFramesRawCheckOutput): NormalizedIssue[] {
  const issues: NormalizedIssue[] = [];
  let index = 0;

  const stages: (keyof HyperFramesRawCheckOutput)[] = ['lint', 'runtime', 'layout', 'motion', 'contrast'];

  for (const stage of stages) {
    const stageData = rawJson[stage];
    if (stageData && Array.isArray(stageData.findings)) {
      for (const finding of stageData.findings as HyperFramesFinding[]) {
        issues.push(normalizeFinding(finding, stage, index++));
      }
    }
  }

  // If rawJson explicitly failed (ok === false) but no individual findings were listed
  if (rawJson.ok === false && issues.length === 0) {
    issues.push({
      id: 'unknown:gate_failure:0:root:0',
      category: 'unknown',
      severity: 'error',
      code: 'unspecified_gate_failure',
      message: 'HyperFrames quality check gate returned ok: false without specific finding items.',
      raw: rawJson
    });
  }

  return issues;
}

/**
 * Evaluates whether a check result satisfies the hard quality gate.
 */
export function isCompositionValid(result: HyperFramesCheckResult): boolean {
  if (result.hasFatalProcessError) return false;
  if (result.exitCode !== 0) return false;
  if (!result.ok) return false;
  if (result.summary.totalErrors > 0) return false;
  return true;
}

/**
 * Executes `npx hyperframes check <dir> --json` and returns a normalized result.
 */
export async function checkComposition(
  compositionDirectory: string,
  options: CheckOptions = {}
): Promise<HyperFramesCheckResult> {
  const startTime = Date.now();
  const absoluteDir = path.resolve(compositionDirectory);
  const timeoutMs = options.timeoutMs ?? 60000;

  // Basic existence check
  if (!fs.existsSync(absoluteDir)) {
    const durationMs = Date.now() - startTime;
    const issues: NormalizedIssue[] = [
      {
        id: 'runtime:dir_not_found:0:root:0',
        category: 'runtime',
        severity: 'error',
        code: 'directory_not_found',
        message: `Composition directory does not exist: ${absoluteDir}`,
        sourceFile: absoluteDir,
        raw: { path: absoluteDir }
      }
    ];

    const result: HyperFramesCheckResult = {
      ok: false,
      exitCode: 1,
      issues,
      summary: calculateSummary(issues),
      rawOutput: '',
      stderr: `Directory not found: ${absoluteDir}`,
      checkedDirectory: absoluteDir,
      durationMs,
      hasFatalProcessError: true,
      processErrorMessage: `Composition directory does not exist: ${absoluteDir}`
    };

    if (options.saveArtifact !== false) {
      result.artifactPath = saveCheckArtifact(result, options);
    }

    return result;
  }

  const executable = options.customExecutable || 'npx';
  const args = options.customArgs || ['hyperframes', 'check', absoluteDir, '--json'];
  if (options.strict) {
    args.push('--strict');
  }

  return new Promise<HyperFramesCheckResult>((resolve) => {
    execFile(
      executable,
      args,
      {
        cwd: process.cwd(),
        timeout: timeoutMs,
        maxBuffer: 15 * 1024 * 1024, // 15 MB
        env: {
          ...process.env,
          NODE_ENV: 'test'
        }
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - startTime;
        const rawOutput = stdout ? stdout.toString() : '';
        const rawStderr = stderr ? stderr.toString() : '';
        const exitCode = error ? (typeof error.code === 'number' ? error.code : 1) : 0;

        const sanitizedStdout = sanitizeOutput(rawOutput, options.additionalSecretPatterns);
        const sanitizedStderr = sanitizeOutput(rawStderr, options.additionalSecretPatterns);

        // Defensive JSON parsing
        const { parsed, parseError } = extractAndParseJson(rawOutput);

        let issues: NormalizedIssue[] = [];
        let ok = false;
        let hasFatalProcessError = false;
        let processErrorMessage: string | undefined;

        if (parsed) {
          issues = normalizeCheckOutput(parsed);
          // ok is true ONLY if exit code is 0 and parsed.ok is true
          ok = exitCode === 0 && parsed.ok === true;
        } else {
          // Parsing failure or unexpected process crash
          hasFatalProcessError = true;
          processErrorMessage = parseError || 'Failed to parse HyperFrames check output';

          issues.push({
            id: 'runtime:parse_failure:0:root:0',
            category: 'runtime',
            severity: 'error',
            code: error?.name === 'Error' && error.message.includes('TIMEDOUT')
              ? 'verification_timeout'
              : 'verification_non_json_output',
            message: processErrorMessage,
            details: sanitizedStderr || sanitizedStdout || error?.message,
            raw: { error: error?.message, stdout: sanitizedStdout, stderr: sanitizedStderr }
          });
          ok = false;
        }

        const summary = calculateSummary(issues, parsed);

        const result: HyperFramesCheckResult = {
          ok,
          exitCode,
          issues,
          summary,
          rawOutput: sanitizedStdout,
          stderr: sanitizedStderr,
          rawJson: parsed,
          checkedDirectory: absoluteDir,
          durationMs,
          hasFatalProcessError,
          processErrorMessage
        };

        if (options.saveArtifact !== false) {
          result.artifactPath = saveCheckArtifact(result, options);
        }

        resolve(result);
      }
    );
  });
}
