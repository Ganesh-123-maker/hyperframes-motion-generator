import { SceneText } from '../../planner/schema';
import { LayoutGeometry, ThemeResolvedTokens } from '../types';

export interface TextRenderOptions {
  sceneId: string;
  text: SceneText;
  layout: LayoutGeometry;
  theme: ThemeResolvedTokens;
}

/**
 * Escapes HTML characters safely.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Renders the typography block (badge, heading, subtitle, callouts) for a scene.
 */
export function renderTextBlock(options: TextRenderOptions): string {
  const { sceneId, text, layout, theme } = options;
  const parts: string[] = [];

  parts.push(`<div id="${sceneId}_text" class="text-block" style="display: flex; flex-direction: column; gap: ${layout.isVertical ? '24px' : '20px'}; max-width: 100%; word-break: break-word;">`);

  // 1. Badge / Pill Tag (Optional)
  if (text.badge) {
    parts.push(`  <div id="${sceneId}_badge" class="badge-pill" style="align-self: flex-start; background: ${theme.badgeBgCss}; color: ${theme.badgeTextCss}; font-size: ${layout.typography.badgeSize}px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 16px; border-radius: 9999px; border: 1px solid ${theme.primaryColor}44; white-space: nowrap;">${escapeHtml(text.badge)}</div>`);
  }

  // 2. Main Heading
  parts.push(`  <h1 id="${sceneId}_heading" style="font-size: ${layout.typography.headingSize}px; line-height: ${layout.typography.lineHeight}; font-weight: 800; color: ${theme.textColor}; margin: 0; letter-spacing: -0.02em;">${escapeHtml(text.heading)}</h1>`);

  // 3. Subtitle (Optional)
  if (text.subtitle) {
    parts.push(`  <p id="${sceneId}_subtitle" style="font-size: ${layout.typography.subtitleSize}px; line-height: 1.45; color: ${theme.textMutedColor}; margin: 0; font-weight: 400;">${escapeHtml(text.subtitle)}</p>`);
  }

  // 4. Callout List (Optional)
  if (text.callouts && text.callouts.length > 0) {
    parts.push(`  <div id="${sceneId}_callouts" style="display: flex; flex-direction: column; gap: ${layout.isVertical ? '18px' : '14px'}; margin-top: 8px;">`);
    text.callouts.forEach((callout, idx) => {
      parts.push(`    <div class="${sceneId}_callout" style="display: flex; align-items: center; gap: 14px; font-size: ${layout.typography.bodySize}px; color: ${theme.textColor}; font-weight: 500;">
      <span style="display: inline-flex; align-items: center; justify-content: center; width: ${layout.isVertical ? '32px' : '28px'}; height: ${layout.isVertical ? '32px' : '28px'}; border-radius: 8px; background: ${theme.primaryColor}22; color: ${theme.primaryColor}; font-weight: 700; font-size: ${layout.typography.badgeSize}px; flex-shrink: 0;">✓</span>
      <span>${escapeHtml(callout)}</span>
    </div>`);
    });
    parts.push(`  </div>`);
  }

  parts.push(`</div>`);

  return parts.join('\n');
}
