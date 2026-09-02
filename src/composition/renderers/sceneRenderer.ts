import { Scene, VideoPlan } from '../../planner/schema';
import { LayoutGeometry, ThemeResolvedTokens } from '../types';
import { renderTextBlock } from './textRenderer';
import { renderVisualBlock } from './visualRenderer';
import { renderCtaBlock } from './ctaRenderer';

export interface SceneRenderOptions {
  scene: Scene;
  plan: VideoPlan;
  layout: LayoutGeometry;
  theme: ThemeResolvedTokens;
  assetRelativePath?: string;
}

/**
 * Renders an entire HyperFrames clip container for a scene.
 */
export function renderSceneClip(options: SceneRenderOptions): string {
  const { scene, plan, layout, theme, assetRelativePath } = options;
  const isCtaScene = scene.purpose === 'cta';

  const textHtml = renderTextBlock({
    sceneId: scene.id,
    text: scene.text,
    layout,
    theme
  });

  const visualHtml = renderVisualBlock({
    sceneId: scene.id,
    visual: scene.visual,
    layout,
    theme,
    assetRelativePath
  });

  const ctaHtml = isCtaScene && plan.cta ? renderCtaBlock({ cta: plan.cta, layout, theme }) : '';

  // Layout Container Classes & Inline Styles
  let layoutInnerStyle = '';
  const isCentered = scene.visual.layout === 'centered' || isCtaScene || scene.visual.type === 'typography_only';

  if (layout.isVertical) {
    // 9:16 Vertical layout: stacked top to bottom
    layoutInnerStyle = `display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 48px; width: 100%; height: 100%; text-align: ${isCentered ? 'center' : 'left'};`;
  } else if (layout.isSquare) {
    // 1:1 Square layout: balanced centered or 2-row
    layoutInnerStyle = `display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 36px; width: 100%; height: 100%; text-align: ${isCentered ? 'center' : 'left'};`;
  } else {
    // 16:9 Widescreen layout
    if (scene.visual.layout === 'split_left' && visualHtml) {
      layoutInnerStyle = `display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 80px; align-items: center; width: 100%; height: 100%;`;
    } else if (scene.visual.layout === 'split_right' && visualHtml) {
      layoutInnerStyle = `display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 80px; align-items: center; width: 100%; height: 100%;`;
    } else {
      layoutInnerStyle = `display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 40px; width: 100%; height: 100%; text-align: center;`;
    }
  }

  // Clip Container
  const clipLines: string[] = [];
  clipLines.push(`  <div id="${scene.id}" class="clip" data-start="${scene.start}" data-duration="${scene.duration}" style="position: absolute; inset: 0; padding: ${layout.padding.top}px ${layout.padding.right}px ${layout.padding.bottom}px ${layout.padding.left}px; display: flex; align-items: center; justify-content: center; overflow: hidden;">`);
  clipLines.push(`    <div id="${scene.id}_inner" class="scene-inner" style="${layoutInnerStyle} max-width: ${layout.maxContentWidth}px;">`);

  if (!layout.isVertical && scene.visual.layout === 'split_left' && visualHtml) {
    clipLines.push(`      ${visualHtml}`);
    clipLines.push(`      ${textHtml}`);
  } else {
    clipLines.push(`      ${textHtml}`);
    if (visualHtml) {
      clipLines.push(`      ${visualHtml}`);
    }
  }

  if (ctaHtml) {
    clipLines.push(`      ${ctaHtml}`);
  }

  clipLines.push(`    </div>`);
  clipLines.push(`  </div>`);

  return clipLines.join('\n');
}
