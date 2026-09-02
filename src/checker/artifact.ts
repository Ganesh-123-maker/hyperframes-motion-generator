import fs from 'fs';
import path from 'path';
import { CheckArtifact, HyperFramesCheckResult } from './types.js';

/**
 * Sanitizes sensitive tokens, API keys, passwords, and secrets from strings.
 */
export function sanitizeOutput(
  content: string | undefined | null,
  additionalPatterns: (string | RegExp)[] = []
): string {
  if (!content) return '';

  let sanitized = content;

  // 1. Sanitize standard OpenAI / Gemini API key patterns
  sanitized = sanitized.replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED_OPENAI_KEY]');
  sanitized = sanitized.replace(/AIza[0-9A-Za-z-_]{30,}/g, '[REDACTED_GEMINI_KEY]');
  sanitized = sanitized.replace(/bearer\s+[a-zA-Z0-9_.-]{20,}/gi, 'Bearer [REDACTED_TOKEN]');

  // 2. Sanitize environment variables if present
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 6) {
    sanitized = sanitized.split(process.env.OPENAI_API_KEY).join('[REDACTED_ENV_OPENAI_KEY]');
  }
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 6) {
    sanitized = sanitized.split(process.env.GEMINI_API_KEY).join('[REDACTED_ENV_GEMINI_KEY]');
  }

  // 3. Apply custom additional patterns
  for (const pattern of additionalPatterns) {
    if (typeof pattern === 'string' && pattern.length > 4) {
      sanitized = sanitized.split(pattern).join('[REDACTED_SECRET]');
    } else if (pattern instanceof RegExp) {
      sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
    }
  }

  return sanitized;
}

/**
 * Determines the next check artifact filename (e.g. check-1.json, check-2.json)
 */
export function getNextCheckArtifactPath(checksDir: string, explicitAttempt?: number): {
  attempt: number;
  filePath: string;
} {
  fs.mkdirSync(checksDir, { recursive: true });

  if (explicitAttempt && explicitAttempt > 0) {
    return {
      attempt: explicitAttempt,
      filePath: path.join(checksDir, `check-${explicitAttempt}.json`)
    };
  }

  let attempt = 1;
  while (fs.existsSync(path.join(checksDir, `check-${attempt}.json`))) {
    attempt++;
  }

  return {
    attempt,
    filePath: path.join(checksDir, `check-${attempt}.json`)
  };
}

/**
 * Persists a structured verification artifact to disk.
 */
export function saveCheckArtifact(
  result: HyperFramesCheckResult,
  options?: {
    artifactsDir?: string;
    attemptNumber?: number;
    additionalSecretPatterns?: (string | RegExp)[];
  }
): string | undefined {
  try {
    let checksDir = options?.artifactsDir;

    if (!checksDir) {
      // Derive from checkedDirectory
      // Example: outputs/<run-id>/composition -> outputs/<run-id>/checks
      const parentDir = path.dirname(path.resolve(result.checkedDirectory));
      if (path.basename(result.checkedDirectory) === 'composition') {
        checksDir = path.join(parentDir, 'checks');
      } else {
        checksDir = path.join(result.checkedDirectory, 'checks');
      }
    }

    const { attempt, filePath } = getNextCheckArtifactPath(checksDir, options?.attemptNumber);

    const artifact: CheckArtifact = {
      attempt,
      timestamp: new Date().toISOString(),
      compositionPath: result.checkedDirectory,
      command: `npx hyperframes check ${result.checkedDirectory} --json`,
      exitCode: result.exitCode,
      ok: result.ok,
      hasFatalProcessError: result.hasFatalProcessError,
      summary: result.summary,
      issues: result.issues,
      parsedResult: result.rawJson,
      rawOutput: sanitizeOutput(result.rawOutput, options?.additionalSecretPatterns),
      stderr: sanitizeOutput(result.stderr, options?.additionalSecretPatterns)
    };

    fs.writeFileSync(filePath, JSON.stringify(artifact, null, 2), 'utf-8');
    return filePath;
  } catch (err: any) {
    console.error(`Failed to save check artifact: ${err.message}`);
    return undefined;
  }
}
