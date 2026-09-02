import { CtaConfig } from '../../planner/schema';
import { LayoutGeometry, ThemeResolvedTokens } from '../types';
import { escapeHtml } from './textRenderer';

export interface CtaRenderOptions {
  cta: CtaConfig;
  layout: LayoutGeometry;
  theme: ThemeResolvedTokens;
}

/**
 * Renders the primary Call to Action (CTA) block.
 */
export function renderCtaBlock(options: CtaRenderOptions): string {
  const { cta, layout, theme } = options;
  const parts: string[] = [];

  parts.push(`<div id="cta_component" class="cta-block" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${layout.isVertical ? '20px' : '16px'}; margin-top: ${layout.isVertical ? '32px' : '24px'}; width: 100%; text-align: center;">`);

  // Badge (Optional)
  if (cta.badge) {
    parts.push(`  <div class="cta-badge" style="background: ${theme.accentColor}22; color: ${theme.accentColor}; font-size: ${layout.typography.badgeSize}px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 6px 18px; border-radius: 9999px; border: 1px solid ${theme.accentColor}55;">${escapeHtml(cta.badge)}</div>`);
  }

  // Primary Action Button
  parts.push(`  <div class="cta-button" style="background: ${theme.ctaButtonBgCss}; color: ${theme.ctaButtonTextCss}; font-size: ${layout.typography.ctaSize}px; font-weight: 800; padding: ${layout.isVertical ? '20px 48px' : '18px 44px'}; border-radius: 16px; box-shadow: 0 20px 35px -10px ${theme.primaryColor}88; letter-spacing: -0.01em; display: inline-flex; align-items: center; gap: 12px;">
    <span>${escapeHtml(cta.actionText)}</span>
    <span style="font-size: 1.1em;">→</span>
  </div>`);

  // SubText (Optional)
  if (cta.subText) {
    parts.push(`  <div class="cta-subtext" style="font-size: ${layout.typography.bodySize * 0.9}px; color: ${theme.textMutedColor}; font-weight: 500;">${escapeHtml(cta.subText)}</div>`);
  }

  // Brand / URL (Optional)
  if (cta.urlOrBrand) {
    parts.push(`  <div class="cta-url" style="font-size: ${layout.typography.bodySize}px; color: ${theme.textColor}; font-weight: 700; font-family: monospace; letter-spacing: 0.05em; background: rgba(255,255,255,0.06); padding: 8px 20px; border-radius: 8px; border: 1px solid ${theme.surfaceBorderCss};">${escapeHtml(cta.urlOrBrand)}</div>`);
  }

  parts.push(`</div>`);
  return parts.join('\n');
}
