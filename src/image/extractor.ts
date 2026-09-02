import { VideoPlan, Scene } from '../planner/schema';
import { ImageRequest } from './types';

/**
 * Creates a deterministic URL/file-safe slug from a string.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40);
}

/**
 * Derives a focused, high-craft visual prompt for gpt-image-2.
 * Crucial Design Choice: Text and copy are strictly handled by HTML/CSS in HyperFrames.
 * The image model prompt focuses entirely on atmosphere, lighting, texture, composition, and subject.
 */
export function buildFocusedImagePrompt(scene: Scene, plan: VideoPlan): string {
  const basePrompt = scene.visual.imagePrompt || `${scene.text.heading} visual concept`;
  const theme = plan.theme;
  const isDark = theme.backgroundColor.startsWith('#0') || theme.backgroundColor.startsWith('#1');

  // Aspect ratio orientation descriptor
  const orientationDescriptor =
    plan.aspectRatio === '16:9'
      ? 'widescreen landscape 16:9 composition'
      : plan.aspectRatio === '9:16'
        ? 'vertical mobile portrait 9:16 composition'
        : 'square 1:1 balanced composition';

  // Aesthetic styling cues derived from theme
  const lightingMood = isDark
    ? `dramatic studio lighting with subtle ${theme.primaryColor} and ${theme.accentColor} ambient highlights, dark matte backdrop`
    : `warm bright natural morning sunlight, clean minimal aesthetic, soft pastel tones`;

  const visualStyle =
    theme.fontFamily === 'serif'
      ? 'high-end cinematic photography, shallow depth of field, authentic rich textures'
      : theme.fontFamily === 'mono'
        ? 'precise technical diagram aesthetic, isometric glass elements, clean futuristic finish'
        : 'ultra-modern commercial product rendering, octane render style, clean studio composition';

  // Build composite prompt
  return `${basePrompt.trim()}. Style: ${visualStyle}, ${orientationDescriptor}, ${lightingMood}. Crucial note: High-resolution pure visual artwork only. Do not render any text, words, letters, subtitles, labels, or typography in the image.`;
}

/**
 * Extracts all deterministic image generation requirements from a validated VideoPlan.
 */
export function extractImageRequests(plan: VideoPlan): ImageRequest[] {
  const requests: ImageRequest[] = [];

  for (const scene of plan.scenes) {
    if (scene.visual.type === 'generated_image') {
      const headingSlug = slugify(scene.text.heading);
      const assetId = `${scene.id}_visual`;
      const fileName = `${scene.id}_visual.png`;

      const prompt = buildFocusedImagePrompt(scene, plan);
      const styleIntent = `${plan.theme.name} (${plan.theme.fontFamily} style, ${plan.aspectRatio})`;

      requests.push({
        sceneId: scene.id,
        assetId,
        fileName,
        purpose: scene.purpose,
        prompt,
        aspectRatio: plan.aspectRatio,
        width: plan.width,
        height: plan.height,
        styleIntent
      });
    }
  }

  return requests;
}
