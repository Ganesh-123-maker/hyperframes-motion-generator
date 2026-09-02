import { VideoPlan, VideoPlanSchema } from './schema';
import { z } from 'zod';

export interface ValidationErrorItem {
  code: string;
  field: string;
  message: string;
  critical: boolean;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationErrorItem[];
  plan?: VideoPlan;
}

/**
 * Validates the raw JSON object against the structural Zod schema.
 */
export function validatePlanSchema(data: unknown): { ok: boolean; plan?: VideoPlan; errors: ValidationErrorItem[] } {
  const result = VideoPlanSchema.safeParse(data);
  if (result.success) {
    return { ok: true, plan: result.data, errors: [] };
  }

  const errors: ValidationErrorItem[] = result.error.issues.map((issue) => ({
    code: `schema_${issue.code}`,
    field: issue.path.join('.'),
    message: issue.message,
    critical: true
  }));

  return { ok: false, errors };
}

/**
 * Performs deep semantic validation on a structurally valid VideoPlan.
 */
export function validatePlanSemantics(plan: VideoPlan): ValidationResult {
  const errors: ValidationErrorItem[] = [];

  // 1. Duration check
  if (plan.duration <= 0) {
    errors.push({
      code: 'invalid_duration',
      field: 'duration',
      message: `Total video duration must be strictly positive, received ${plan.duration}s.`,
      critical: true
    });
  }

  // 2. Aspect Ratio and Dimensions Consistency
  const ratio = plan.width / plan.height;
  if (plan.aspectRatio === '16:9') {
    const expected = 16 / 9;
    if (Math.abs(ratio - expected) > 0.02) {
      errors.push({
        code: 'mismatched_dimensions',
        field: 'aspectRatio',
        message: `Aspect ratio '16:9' does not match dimensions ${plan.width}x${plan.height} (expected 1920x1080 or 16:9 proportion).`,
        critical: true
      });
    }
  } else if (plan.aspectRatio === '9:16') {
    const expected = 9 / 16;
    if (Math.abs(ratio - expected) > 0.02) {
      errors.push({
        code: 'mismatched_dimensions',
        field: 'aspectRatio',
        message: `Aspect ratio '9:16' does not match dimensions ${plan.width}x${plan.height} (expected 1080x1920 or 9:16 proportion).`,
        critical: true
      });
    }
  } else if (plan.aspectRatio === '1:1') {
    if (plan.width !== plan.height) {
      errors.push({
        code: 'mismatched_dimensions',
        field: 'aspectRatio',
        message: `Aspect ratio '1:1' requires square dimensions, received ${plan.width}x${plan.height}.`,
        critical: true
      });
    }
  }

  // 3. Scene Count
  if (!plan.scenes || plan.scenes.length === 0) {
    errors.push({
      code: 'empty_scenes',
      field: 'scenes',
      message: 'Video plan must contain at least one scene.',
      critical: true
    });
    return { ok: false, errors };
  }

  // 4. Unique Scene IDs
  const seenIds = new Set<string>();
  for (const scene of plan.scenes) {
    if (seenIds.has(scene.id)) {
      errors.push({
        code: 'duplicate_scene_id',
        field: `scenes.${scene.id}`,
        message: `Duplicate scene ID found: '${scene.id}'. Every scene must have a unique identifier.`,
        critical: true
      });
    }
    seenIds.add(scene.id);
  }

  // 5. Scene Timings and Sequential Validation
  const sortedScenes = [...plan.scenes].sort((a, b) => a.start - b.start);
  const TOLERANCE_SEC = 0.05;

  for (let i = 0; i < sortedScenes.length; i++) {
    const scene = sortedScenes[i];
    const sceneEnd = scene.start + scene.duration;

    if (scene.start < 0) {
      errors.push({
        code: 'negative_start_time',
        field: `scenes.${scene.id}.start`,
        message: `Scene '${scene.id}' start time cannot be negative (received ${scene.start}s).`,
        critical: true
      });
    }

    if (scene.duration <= 0) {
      errors.push({
        code: 'non_positive_duration',
        field: `scenes.${scene.id}.duration`,
        message: `Scene '${scene.id}' duration must be positive (received ${scene.duration}s).`,
        critical: true
      });
    }

    if (sceneEnd > plan.duration + TOLERANCE_SEC) {
      errors.push({
        code: 'scene_exceeds_duration',
        field: `scenes.${scene.id}`,
        message: `Scene '${scene.id}' ends at ${sceneEnd.toFixed(2)}s, which exceeds total video duration of ${plan.duration}s.`,
        critical: true
      });
    }

    // Check overlap with previous scene
    if (i > 0) {
      const prevScene = sortedScenes[i - 1];
      const prevEnd = prevScene.start + prevScene.duration;
      if (scene.start < prevEnd - TOLERANCE_SEC) {
        errors.push({
          code: 'overlapping_scenes',
          field: `scenes.${scene.id}.start`,
          message: `Scene '${scene.id}' starts at ${scene.start}s, but preceding scene '${prevScene.id}' ends at ${prevEnd}s (overlap of ${(prevEnd - scene.start).toFixed(2)}s detected).`,
          critical: true
        });
      }
    }

    // 6. Text Content Check
    if (!scene.text.heading || scene.text.heading.trim().length === 0) {
      errors.push({
        code: 'empty_heading',
        field: `scenes.${scene.id}.text.heading`,
        message: `Scene '${scene.id}' must provide a non-empty heading.`,
        critical: true
      });
    }

    // 7. Visual Image Prompt Check
    if (scene.visual.type === 'generated_image') {
      if (!scene.visual.imagePrompt || scene.visual.imagePrompt.trim().length < 8) {
        errors.push({
          code: 'missing_image_prompt',
          field: `scenes.${scene.id}.visual.imagePrompt`,
          message: `Scene '${scene.id}' specifies visual type 'generated_image' but lacks a descriptive 'imagePrompt' (minimum 8 characters).`,
          critical: true
        });
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    plan: errors.length === 0 ? plan : undefined
  };
}

/**
 * Full end-to-end plan validation helper combining schema parsing and semantic auditing.
 */
export function validateFullPlan(raw: unknown): ValidationResult {
  const schemaResult = validatePlanSchema(raw);
  if (!schemaResult.ok || !schemaResult.plan) {
    return { ok: false, errors: schemaResult.errors };
  }

  return validatePlanSemantics(schemaResult.plan);
}
