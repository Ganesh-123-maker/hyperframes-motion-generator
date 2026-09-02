import { VideoPlan } from '../planner/schema.js';
import { NormalizedIssue } from '../checker/types.js';

export const REPAIR_SYSTEM_PROMPT = `You are repairing a structured motion-graphics plan after automated validation failed.

You will receive:
1. The original creative plan
2. The current plan that failed quality check
3. The specific HyperFrames verification issues found

Your task is to fix the issues in the plan JSON while strictly preserving the video's original message, structure, and intent.

STRICT REPAIR RULES:
1. Preserve the original creative intent and title of the video.
2. Make the SMALLEST CHANGE NECESSARY to resolve the specific issues reported.
3. Do NOT arbitrarily redesign the entire video or replace all scenes.
4. Do NOT change aspect ratio unless an issue explicitly requires a different ratio.
5. Do NOT change total video duration unless timing issues make it strictly necessary.
6. Do NOT remove required user text or core content merely to hide a validation error.
7. Do NOT invent unsupported composition primitives, schema values, or invalid colors.
8. Do NOT produce HTML code.
9. Do NOT produce JavaScript code.
10. Output ONLY the repaired structured plan as a valid, parsable JSON object matching the VideoPlan schema.

Next stage will deterministically regenerate the HTML/JS composition from the returned repaired plan JSON.`;

export function formatIssueForRepairPrompt(issue: NormalizedIssue, index: number): string {
  const parts: string[] = [];
  parts.push(`Issue #${index + 1}: [Category: ${issue.category.toUpperCase()}] [Code: ${issue.code}]`);
  parts.push(`  Severity: ${issue.severity}`);
  parts.push(`  Message: ${issue.message}`);
  if (issue.selector) parts.push(`  Target Element Selector: ${issue.selector}`);
  if (issue.time !== undefined) parts.push(`  Time in Video: ${issue.time}s`);
  if (issue.fixHint) parts.push(`  Fix Hint: ${issue.fixHint}`);

  if (issue.category === 'contrast' && issue.contrastDetails) {
    const cd = issue.contrastDetails;
    parts.push(`  Contrast Details:`);
    if (cd.text) parts.push(`    - Text Content: "${cd.text}"`);
    if (cd.fg) parts.push(`    - Foreground Color: ${cd.fg}`);
    if (cd.bg) parts.push(`    - Background Color: ${cd.bg}`);
    if (cd.ratio !== undefined) parts.push(`    - Measured Ratio: ${cd.ratio}:1`);
    if (cd.requiredRatio !== undefined) parts.push(`    - Required Ratio: ${cd.requiredRatio}:1`);
    if (cd.suggestedColor) parts.push(`    - Suggested Color: ${cd.suggestedColor}`);
  }

  if (issue.category === 'layout' && issue.layoutDetails) {
    const ld = issue.layoutDetails;
    parts.push(`  Layout Details:`);
    if (ld.text) parts.push(`    - Text Content: "${ld.text}"`);
    if (ld.containerSelector) parts.push(`    - Container Selector: ${ld.containerSelector}`);
    if (ld.overflow) parts.push(`    - Overflow (px): ${JSON.stringify(ld.overflow)}`);
    if (ld.rect) parts.push(`    - Element Bounds: ${JSON.stringify(ld.rect)}`);
  }

  if (issue.category === 'runtime' && issue.runtimeDetails) {
    if (issue.runtimeDetails.stack) parts.push(`  Stack Trace: ${issue.runtimeDetails.stack}`);
  }

  if (issue.category === 'unknown' && issue.raw) {
    parts.push(`  Raw Finding Context: ${JSON.stringify(issue.raw)}`);
  }

  return parts.join('\n');
}

export function buildRepairCategoryGuidance(issues: NormalizedIssue[]): string {
  const categories = new Set(issues.map((i) => i.category));
  const guidance: string[] = [];

  if (categories.has('layout')) {
    guidance.push(`• LAYOUT ISSUES DETECTED:
  - Shorten headings (max 80 chars) or subtitles (max 160 chars) if text overflows container.
  - Adjust scene visual layout preset (options: 'centered', 'split_left', 'split_right', 'stacked_top', 'grid_3col', 'hero_card').
  - Ensure text callouts array contains at most 4 short items (max 50 chars each).`);
  }

  if (categories.has('contrast')) {
    guidance.push(`• CONTRAST ISSUES DETECTED:
  - Modify theme color tokens (textColor, backgroundColor, primaryColor, accentColor, surfaceColor, gradientEnd) to increase contrast ratio to at least 3:1 or 4.5:1.
  - If a suggested color (e.g. #FFFFFF or a darker/lighter hex) is provided in findings, consider using or adapting it for textColor or surfaceColor.
  - Ensure theme colors use valid 6-digit hex format (e.g. #0F172A).`);
  }

  if (categories.has('motion')) {
    guidance.push(`• MOTION ISSUES DETECTED:
  - Simplify entrance/exit animations (entrance options: 'fade_up', 'slide_in_left', 'slide_in_right', 'scale_up', 'stagger_reveal', 'pop_in'; exit options: 'fade_out', 'slide_out_up', 'slide_out_down', 'zoom_out', 'none').
  - Set ambient motion to 'none' or 'subtle_pulse' if motion assertions failed.`);
  }

  if (categories.has('runtime')) {
    guidance.push(`• RUNTIME ISSUES DETECTED:
  - Verify all scene IDs use alphanumeric characters with dashes/underscores only.
  - Ensure scene timings are non-overlapping and stay strictly within total video duration.`);
  }

  if (categories.has('lint')) {
    guidance.push(`• LINT ISSUES DETECTED:
  - Correct schema field types and enum values according to VideoPlan schema.`);
  }

  if (categories.has('unknown')) {
    guidance.push(`• UNKNOWN / GENERAL ISSUES DETECTED:
  - Review the raw issue findings carefully and make the minimal field adjustment needed to eliminate the failure.`);
  }

  return guidance.join('\n\n');
}

export function buildRepairUserPrompt(
  originalPlan: VideoPlan,
  currentPlan: VideoPlan,
  issues: NormalizedIssue[]
): string {
  const issueText = issues.map((issue, idx) => formatIssueForRepairPrompt(issue, idx)).join('\n\n');
  const categoryGuidance = buildRepairCategoryGuidance(issues);

  return `Automated HyperFrames verification failed with ${issues.length} issue(s).

=== SPECIFIC VERIFICATION ISSUES ===
${issueText}

=== CATEGORY-SPECIFIC REPAIR ADVICE ===
${categoryGuidance}

=== ORIGINAL PLAN (REFERENCE INTENT) ===
${JSON.stringify(originalPlan, null, 2)}

=== CURRENT PLAN (TO BE REPAIRED) ===
${JSON.stringify(currentPlan, null, 2)}

=== REPAIR INSTRUCTIONS ===
1. Analyze each issue above and identify which fields in the current plan caused the error.
2. Produce a repaired VideoPlan JSON object that resolves ALL listed issues.
3. Keep changes minimal. Retain original scene count, title, theme structure, and core text content as much as possible.
4. Ensure all hex colors are valid 6-digit hex strings (e.g., #FFFFFF).
5. Output strictly a JSON object representing the corrected VideoPlan. Do not include markdown code block backticks if possible, or wrap in \`\`\`json \`\`\`.`;
}
