import {
  HyperFramesFinding,
  IssueCategory,
  IssueSeverity,
  NormalizedIssue
} from './types.js';

/**
 * Classifies an issue into a normalized category based on stage origin,
 * error code, and message patterns.
 */
export function classifyIssueCategory(
  stageHint: string | undefined,
  finding: HyperFramesFinding
): IssueCategory {
  // 1. Direct explicit stage mapping
  if (stageHint) {
    const lowerStage = stageHint.toLowerCase().trim();
    if (lowerStage === 'lint') return 'lint';
    if (lowerStage === 'runtime') return 'runtime';
    if (lowerStage === 'layout') return 'layout';
    if (lowerStage === 'contrast') return 'contrast';
    if (lowerStage === 'motion') return 'motion';
  }

  const code = (finding.code || '').toLowerCase();
  const message = (finding.message || '').toLowerCase();

  // 2. Contrast classification
  if (
    code.includes('contrast') ||
    code.includes('wcag') ||
    message.includes('contrast') ||
    message.includes('wcag') ||
    finding.ratio !== undefined ||
    finding.suggestedColor !== undefined
  ) {
    return 'contrast';
  }

  // 3. Lint / Static Structure classification
  if (
    code.includes('lint') ||
    code.includes('missing_') ||
    code.includes('invalid_') ||
    code.includes('root_') ||
    code.includes('registry') ||
    code.includes('attribute') ||
    code.includes('syntax') ||
    message.includes('data-composition-id') ||
    message.includes('data-duration') ||
    message.includes('window.__timelines') ||
    message.includes('missing `window.__timelines`') ||
    message.includes('syntax')
  ) {
    return 'lint';
  }

  // 4. Layout classification
  if (
    code.includes('overflow') ||
    code.includes('overlap') ||
    code.includes('bounds') ||
    code.includes('canvas') ||
    code.includes('layout') ||
    code.includes('sweep_static') ||
    message.includes('overflow') ||
    message.includes('overlap') ||
    message.includes('outside the composition canvas') ||
    message.includes('exceeds composition bounds') ||
    finding.overflow !== undefined ||
    finding.containerRect !== undefined
  ) {
    return 'layout';
  }

  // 5. Motion / Animation classification
  if (
    code.includes('motion') ||
    code.includes('tween') ||
    code.includes('animation') ||
    code.includes('timing') ||
    message.includes('motion') ||
    message.includes('tween') ||
    message.includes('animation')
  ) {
    return 'motion';
  }

  // 6. Runtime classification
  if (
    code.includes('runtime') ||
    code.includes('exception') ||
    code.includes('crash') ||
    code.includes('uncaught') ||
    code.includes('console_error') ||
    code.includes('network') ||
    message.includes('exception') ||
    message.includes('uncaught') ||
    message.includes('failed to execute') ||
    finding.stack !== undefined
  ) {
    return 'runtime';
  }

  // 7. Fallback to unknown without discarding
  return 'unknown';
}

/**
 * Normalizes a raw HyperFrames finding into a consistent internal NormalizedIssue.
 */
export function normalizeFinding(
  finding: HyperFramesFinding,
  stageHint?: string,
  index = 0
): NormalizedIssue {
  const category = classifyIssueCategory(stageHint, finding);
  const severity: IssueSeverity =
    finding.severity === 'error' || finding.severity === 'warning' || finding.severity === 'info'
      ? finding.severity
      : 'error';

  const code = finding.code || `${category}_issue_${index + 1}`;
  const id = `${category}:${code}:${finding.time ?? 0}:${finding.selector ?? 'root'}:${index}`;

  const normalized: NormalizedIssue = {
    id,
    category,
    severity,
    code,
    message: finding.message || 'Unknown verification finding',
    selector: finding.selector,
    sourceFile: finding.sourceFile,
    time: finding.time,
    fixHint: finding.fixHint,
    raw: finding
  };

  if (category === 'contrast' || finding.suggestedColor || finding.ratio !== undefined) {
    normalized.contrastDetails = {
      fg: finding.fg,
      bg: finding.bg,
      ratio: finding.ratio,
      requiredRatio: finding.requiredRatio,
      suggestedColor: finding.suggestedColor,
      large: finding.large,
      text: finding.text
    };
  }

  if (category === 'layout' || finding.overflow || finding.rect || finding.bbox) {
    normalized.layoutDetails = {
      bbox: finding.bbox,
      rect: finding.rect,
      containerRect: finding.containerRect,
      containerSelector: finding.containerSelector,
      overflow: finding.overflow,
      text: finding.text
    };
  }

  if (category === 'runtime' || finding.stack || finding.url) {
    normalized.runtimeDetails = {
      stack: finding.stack,
      url: finding.url
    };
  }

  return normalized;
}
