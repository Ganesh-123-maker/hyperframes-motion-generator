import fs from 'fs';
import path from 'path';
import { VideoPlan } from '../planner/schema';
import { validateFullPlan } from '../planner/validator';
import { CompositionOptions, CompositionResult } from './types';
import { resolveThemeTokens } from './theme';
import { computeLayoutGeometry } from './layout';
import { renderSceneClip } from './renderers/sceneRenderer';
import { createDeterministicSvgPlaceholder } from './renderers/visualRenderer';
import { buildGsapTimelineScript } from './motion';

/**
 * Standard HyperFrames project configuration JSON.
 */
export const HYPERFRAMES_CONFIG = {
  $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
  registry: 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry',
  paths: {
    blocks: 'compositions',
    components: 'compositions/components',
    assets: 'assets'
  },
  media: {
    autoProxy: true
  }
};

/**
 * Deterministic hash-free identifier fallback.
 */
function getDeterministicRunId(plan: VideoPlan): string {
  const sanitizedTitle = plan.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 30);
  return `run_${sanitizedTitle}_${plan.aspectRatio.replace(':', 'x')}`;
}

/**
 * Deterministic Composition Generator:
 * Translates a validated VideoPlan into a self-contained, compliant HyperFrames project.
 */
export function generateComposition(
  plan: VideoPlan,
  options: CompositionOptions = {}
): CompositionResult {
  // 1. Validation Gate
  const validation = validateFullPlan(plan);
  if (!validation.ok || !validation.plan) {
    const errorMsgs = validation.errors.map((e) => `[${e.field}] ${e.message}`);
    throw new Error(`Cannot generate composition from invalid plan:\n${errorMsgs.join('\n')}`);
  }

  const validatedPlan = validation.plan;
  const runId = options.runId || getDeterministicRunId(validatedPlan);
  const baseDir = options.outputDir || path.join(process.cwd(), 'outputs');
  const targetDir = path.join(baseDir, runId, 'composition');
  const assetsDir = path.join(targetDir, options.assetDirName || 'assets');

  // Ensure directories exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // 2. Resolve Theme and Layout Geometry
  const theme = resolveThemeTokens(validatedPlan.theme);
  const layout = computeLayoutGeometry(validatedPlan.width, validatedPlan.height, validatedPlan.aspectRatio);

  // 3. Process Visual Assets & Resolve Image Paths
  const createdAssets: string[] = [];
  const sceneAssetPaths: Record<string, string> = {};
  const createPlaceholders = options.createPlaceholderAssets ?? true;

  // Build map from options if provided
  if (options.assetMap) {
    Object.assign(sceneAssetPaths, options.assetMap);
  }
  if (options.assetManifest) {
    for (const asset of options.assetManifest.assets) {
      sceneAssetPaths[asset.sceneId] = asset.relativePath;
    }
  }

  for (const scene of validatedPlan.scenes) {
    if (scene.visual.type === 'generated_image') {
      const pngFileName = `${scene.id}_visual.png`;
      const pngFilePath = path.join(assetsDir, pngFileName);
      const svgFileName = `${scene.id}_visual.svg`;
      const svgFilePath = path.join(assetsDir, svgFileName);

      // 1. Check if PNG asset is explicitly mapped or exists on disk
      if (sceneAssetPaths[scene.id]) {
        createdAssets.push(sceneAssetPaths[scene.id]);
      } else if (fs.existsSync(pngFilePath) && fs.statSync(pngFilePath).size > 0) {
        sceneAssetPaths[scene.id] = `assets/${pngFileName}`;
        createdAssets.push(`assets/${pngFileName}`);
      } else if (createPlaceholders) {
        // Fallback to deterministic SVG placeholder if no real PNG image exists
        const placeholderSvg = createDeterministicSvgPlaceholder(
          scene.text.heading,
          scene.visual.imagePrompt,
          layout.isVertical ? 920 : 760,
          layout.isVertical ? 600 : 520,
          theme.primaryColor,
          theme.surfaceCss
        );
        fs.writeFileSync(svgFilePath, placeholderSvg, 'utf-8');
        sceneAssetPaths[scene.id] = `assets/${svgFileName}`;
        createdAssets.push(`assets/${svgFileName}`);
      } else {
        // If placeholder generation is disabled and real image is missing, default to expected PNG path
        sceneAssetPaths[scene.id] = `assets/${pngFileName}`;
        createdAssets.push(`assets/${pngFileName}`);
      }
    }
  }

  // 4. Render All Scenes
  const renderedScenes = validatedPlan.scenes.map((scene) => {
    const assetRelativePath = scene.visual.type === 'generated_image' ? sceneAssetPaths[scene.id] : undefined;
    return renderSceneClip({
      scene,
      plan: validatedPlan,
      layout,
      theme,
      assetRelativePath
    });
  });

  // 5. Generate GSAP Timeline Script
  const gsapScript = buildGsapTimelineScript(validatedPlan.scenes);

  // 6. Build index.html
  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${validatedPlan.width}, height=${validatedPlan.height}" />
    <title>${escapeHtmlTitle(validatedPlan.title)}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: ${validatedPlan.width}px;
        height: ${validatedPlan.height}px;
        overflow: hidden;
        background: ${theme.backgroundCss};
        color: ${theme.textColor};
        font-family: ${theme.fontFamilyCss};
        -webkit-font-smoothing: antialiased;
      }
      #root {
        position: relative;
        width: ${validatedPlan.width}px;
        height: ${validatedPlan.height}px;
        overflow: hidden;
        background: ${theme.backgroundCss};
      }
      .clip {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      .ambient-glow {
        position: absolute;
        width: ${Math.round(validatedPlan.width * 0.7)}px;
        height: ${Math.round(validatedPlan.height * 0.7)}px;
        border-radius: 50%;
        filter: blur(140px);
        opacity: 0.18;
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="${validatedPlan.duration}"
      data-width="${validatedPlan.width}"
      data-height="${validatedPlan.height}"
    >
      <!-- Ambient Decorative Lighting Elements -->
      <div class="ambient-glow" style="top: -15%; left: -10%; background: ${theme.primaryColor};"></div>
      <div class="ambient-glow" style="bottom: -20%; right: -10%; background: ${theme.accentColor};"></div>

      <!-- Composition Scenes -->
${renderedScenes.join('\n\n')}
    </div>

    <!-- Deterministic HyperFrames Animation Choreography -->
    <script>
${gsapScript}
    </script>
  </body>
</html>`;

  // 7. Write HyperFrames Files
  const configPath = path.join(targetDir, 'hyperframes.json');
  const indexHtmlPath = path.join(targetDir, 'index.html');

  fs.writeFileSync(configPath, JSON.stringify(HYPERFRAMES_CONFIG, null, 2), 'utf-8');
  fs.writeFileSync(indexHtmlPath, htmlContent, 'utf-8');

  return {
    ok: true,
    runId,
    compositionDir: targetDir,
    indexHtmlPath,
    configPath,
    assets: createdAssets,
    sceneCount: validatedPlan.scenes.length,
    duration: validatedPlan.duration,
    resolution: {
      width: validatedPlan.width,
      height: validatedPlan.height,
      aspectRatio: validatedPlan.aspectRatio
    }
  };
}

function escapeHtmlTitle(str: string): string {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
