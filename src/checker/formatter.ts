import { HyperFramesCheckResult, NormalizedIssue } from './types.js';

/**
 * Formats a normalized issue for terminal display.
 */
export function formatIssueForDisplay(issue: NormalizedIssue, index: number): string {
  const num = `${index + 1}.`;
  const tag = `[${issue.category}]`;
  const sev = issue.severity === 'error' ? '(error)' : issue.severity === 'warning' ? '(warning)' : '(info)';
  const target = issue.selector ? ` ${issue.selector}` : issue.sourceFile ? ` (${issue.sourceFile})` : '';

  let lines: string[] = [];
  lines.push(`${num} ${tag} ${sev}${target}`);
  lines.push(`   ${issue.message}`);

  if (issue.contrastDetails?.suggestedColor) {
    lines.push(`   Suggested fix color: ${issue.contrastDetails.suggestedColor} (ratio: ${issue.contrastDetails.ratio}:1, required: ${issue.contrastDetails.requiredRatio}:1)`);
  } else if (issue.fixHint) {
    lines.push(`   Hint: ${issue.fixHint}`);
  }

  if (issue.time !== undefined && issue.time > 0) {
    lines.push(`   Timestamp: ${issue.time.toFixed(2)}s`);
  }

  return lines.join('\n');
}

/**
 * Formats a full verification check report for CLI and logs.
 */
export function formatCheckReport(result: HyperFramesCheckResult): string {
  const lines: string[] = [];

  lines.push(`\n## HyperFrames Verification\n`);
  lines.push(`Composition:`);
  lines.push(`${result.checkedDirectory}\n`);
  lines.push(`Running:`);
  lines.push(`npx hyperframes check ${result.checkedDirectory} --json\n`);

  lines.push(`Result:`);
  if (result.ok) {
    lines.push(`✓ HyperFrames gate passed`);
  } else {
    lines.push(`✗ FAILED`);
  }

  lines.push(`Issues: ${result.summary.totalIssues}`);
  if (result.summary.totalErrors > 0 || result.summary.totalWarnings > 0) {
    lines.push(`  (Errors: ${result.summary.totalErrors}, Warnings: ${result.summary.totalWarnings}, Infos: ${result.summary.totalInfos})`);
  }

  if (result.issues.length > 0) {
    lines.push('');
    result.issues.forEach((issue, idx) => {
      lines.push(formatIssueForDisplay(issue, idx));
      lines.push('');
    });
  }

  if (result.artifactPath) {
    lines.push(`Check artifact:`);
    lines.push(`${result.artifactPath}`);
  }

  if (result.hasFatalProcessError && result.processErrorMessage) {
    lines.push(`\nExecution Error:`);
    lines.push(`${result.processErrorMessage}`);
  }

  return lines.join('\n');
}
