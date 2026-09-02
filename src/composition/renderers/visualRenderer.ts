import { SceneVisual } from '../../planner/schema';
import { LayoutGeometry, ThemeResolvedTokens } from '../types';
import { getRelativeLuminance } from '../theme';
import { escapeHtml } from './textRenderer';

export interface VisualRenderOptions {
  sceneId: string;
  visual: SceneVisual;
  layout: LayoutGeometry;
  theme: ThemeResolvedTokens;
  assetRelativePath?: string;
}

/**
 * Creates deterministic SVG placeholder content for missing generated images.
 */
export function createDeterministicSvgPlaceholder(
  title: string,
  prompt: string | undefined,
  width: number,
  height: number,
  primaryColor: string,
  bgColor: string
): string {
  const safePrompt = escapeHtml((prompt || 'Visual Asset Placeholder').substring(0, 100));
  const safeTitle = escapeHtml(title);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgColor}"/>
      <stop offset="100%" stop-color="${primaryColor}33"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${primaryColor}44"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="16" fill="url(#bgGrad)" stroke="${primaryColor}55" stroke-width="2"/>
  <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 3}" fill="url(#glow)" />
  
  <!-- Central Icon Symbol -->
  <g transform="translate(${width / 2 - 32}, ${height / 2 - 48})" stroke="${primaryColor}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="4" width="56" height="56" rx="8" />
    <circle cx="24" cy="24" r="6" />
    <path d="M56 44 L40 28 L12 56" />
  </g>
  
  <text x="${width / 2}" y="${height / 2 + 36}" fill="#FFFFFF" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">${safeTitle}</text>
  <text x="${width / 2}" y="${height / 2 + 64}" fill="#94A3B8" font-family="sans-serif" font-size="14" text-anchor="middle">${safePrompt}</text>
</svg>`;
}

/**
 * Renders the visual block for a scene.
 */
export function renderVisualBlock(options: VisualRenderOptions): string {
  const { sceneId, visual, layout, theme, assetRelativePath } = options;

  if (visual.type === 'typography_only') {
    return '';
  }

  const parts: string[] = [];
  const containerStyle = `id="${sceneId}_visual" class="visual-block" style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; max-width: ${layout.isVertical ? '100%' : `${layout.cardMaxWidth}px`};"`;

  parts.push(`<div ${containerStyle}>`);

  if (visual.type === 'generated_image') {
    const src = assetRelativePath || `assets/${sceneId}_visual.svg`;
    parts.push(`  <div style="width: 100%; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0,0,0,0.5); border: 1px solid ${theme.surfaceBorderCss}; background: ${theme.surfaceCss};">
    <img src="${src}" alt="${escapeHtml(visual.imagePrompt || sceneId)}" style="width: 100%; height: auto; max-height: ${layout.imageMaxHeight}px; object-fit: cover; display: block;" />
  </div>`);
  } else if (visual.type === 'dashboard_card') {
    parts.push(`  <div style="width: 100%; background: ${theme.surfaceCss}; border: 1px solid ${theme.surfaceBorderCss}; border-radius: 20px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid ${theme.surfaceBorderCss}; padding-bottom: 16px;">
      <div style="display: flex; gap: 8px;">
        <div style="width: 12px; height: 12px; border-radius: 50%; background: #EF4444;"></div>
        <div style="width: 12px; height: 12px; border-radius: 50%; background: #F59E0B;"></div>
        <div style="width: 12px; height: 12px; border-radius: 50%; background: #10B981;"></div>
      </div>
      <div style="font-size: 14px; font-weight: 600; color: ${theme.textMutedColor}; text-transform: uppercase; letter-spacing: 0.05em;">Live Telemetry</div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div style="background: rgba(255,255,255,0.03); border: 1px solid ${theme.surfaceBorderCss}; border-radius: 12px; padding: 20px;">
        <div style="font-size: 14px; color: ${theme.textMutedColor}; margin-bottom: 6px;">Latency (P99)</div>
        <div style="font-size: 32px; font-weight: 800; color: ${theme.primaryColor};">14.2ms</div>
      </div>
      <div style="background: rgba(255,255,255,0.03); border: 1px solid ${theme.surfaceBorderCss}; border-radius: 12px; padding: 20px;">
        <div style="font-size: 14px; color: ${theme.textMutedColor}; margin-bottom: 6px;">Throughput</div>
        <div style="font-size: 32px; font-weight: 800; color: ${theme.accentColor};">98.4k/s</div>
      </div>
    </div>
  </div>`);
  } else if (visual.type === 'feature_grid') {
    const isDarkSurface = getRelativeLuminance(theme.surfaceCss) < 0.5;
    const cardBg = isDarkSurface ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
    parts.push(`  <div style="width: 100%; background: ${theme.surfaceCss}; border: 1px solid ${theme.surfaceBorderCss}; border-radius: 20px; padding: 28px; box-shadow: 0 20px 40px -15px rgba(0,0,0,0.15);">
    <div style="display: grid; grid-template-columns: ${layout.isVertical ? '1fr' : '1fr 1fr'}; gap: 16px;">
      <div style="background: ${cardBg}; border: 1px solid ${theme.surfaceBorderCss}; border-radius: 12px; padding: 18px;">
        <div style="font-size: 24px; margin-bottom: 8px;">⚡</div>
        <div style="font-size: 18px; font-weight: 700; color: ${theme.textColor};">Instant Setup</div>
      </div>
      <div style="background: ${cardBg}; border: 1px solid ${theme.surfaceBorderCss}; border-radius: 12px; padding: 18px;">
        <div style="font-size: 24px; margin-bottom: 8px;">🛡️</div>
        <div style="font-size: 18px; font-weight: 700; color: ${theme.textColor};">Zero Latency</div>
      </div>
    </div>
  </div>`);
  } else if (visual.type === 'stat_counter') {
    parts.push(`  <div style="width: 100%; background: ${theme.surfaceCss}; border: 1px solid ${theme.surfaceBorderCss}; border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);">
    <div style="font-size: 64px; font-weight: 900; color: ${theme.primaryColor}; line-height: 1; margin-bottom: 12px;">10x</div>
    <div style="font-size: 22px; font-weight: 600; color: ${theme.textColor};">Faster Deployment Cycles</div>
  </div>`);
  } else if (visual.type === 'cta_badge') {
    const isDarkSurface = getRelativeLuminance(theme.surfaceCss) < 0.5;
    const badgeBg = isDarkSurface ? `${theme.primaryColor}15` : `${theme.primaryColor}10`;
    parts.push(`  <div style="width: 100%; display: flex; justify-content: center;">
    <div style="background: ${badgeBg}; border: 2px solid ${theme.primaryColor}; border-radius: 24px; padding: 32px 48px; text-align: center;">
      <div style="font-size: 20px; font-weight: 700; color: ${theme.accentColor}; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">★ Verified Performance</div>
      <div style="font-size: 28px; font-weight: 800; color: ${theme.textColor};">Ready to Scale</div>
    </div>
  </div>`);
  }

  parts.push(`</div>`);
  return parts.join('\n');
}
