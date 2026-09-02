import { z } from 'zod';

export const AspectRatioEnum = z.enum(['16:9', '9:16', '1:1']);
export type AspectRatio = z.infer<typeof AspectRatioEnum>;

export const FpsEnum = z.union([z.literal(24), z.literal(30), z.literal(60)]);
export type Fps = z.infer<typeof FpsEnum>;

export const ScenePurposeEnum = z.enum([
  'intro',
  'problem',
  'solution',
  'feature_callout',
  'metrics_stat',
  'demo',
  'testimonial',
  'cta',
  'outro'
]);
export type ScenePurpose = z.infer<typeof ScenePurposeEnum>;

export const VisualTypeEnum = z.enum([
  'typography_only',
  'generated_image',
  'dashboard_card',
  'feature_grid',
  'stat_counter',
  'cta_badge'
]);
export type VisualType = z.infer<typeof VisualTypeEnum>;

export const LayoutPresetEnum = z.enum([
  'centered',
  'split_left',
  'split_right',
  'stacked_top',
  'grid_3col',
  'hero_card'
]);
export type LayoutPreset = z.infer<typeof LayoutPresetEnum>;

export const EntranceMotionEnum = z.enum([
  'fade_up',
  'slide_in_left',
  'slide_in_right',
  'scale_up',
  'stagger_reveal',
  'pop_in'
]);
export type EntranceMotion = z.infer<typeof EntranceMotionEnum>;

export const ExitMotionEnum = z.enum([
  'fade_out',
  'slide_out_up',
  'slide_out_down',
  'zoom_out',
  'none'
]);
export type ExitMotion = z.infer<typeof ExitMotionEnum>;

export const AmbientMotionEnum = z.enum([
  'subtle_pulse',
  'slow_pan',
  'glow_shift',
  'none'
]);
export type AmbientMotion = z.infer<typeof AmbientMotionEnum>;

export const TransitionTypeEnum = z.enum([
  'fade',
  'slide',
  'cut',
  'wipe',
  'zoom'
]);
export type TransitionType = z.infer<typeof TransitionTypeEnum>;

export const ThemeSchema = z.object({
  name: z.string().min(1, 'Theme name is required'),
  backgroundType: z.enum(['solid', 'gradient', 'mesh']).default('gradient'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a 6-digit hex color (e.g. #0F172A)'),
  gradientEnd: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a 6-digit hex color').optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a 6-digit hex color'),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a 6-digit hex color'),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a 6-digit hex color'),
  surfaceColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a 6-digit hex color').default('#1E293B'),
  fontFamily: z.enum(['sans', 'mono', 'serif']).default('sans')
});
export type ThemeConfig = z.infer<typeof ThemeSchema>;

export const SceneTextSchema = z.object({
  badge: z.string().max(30).optional(),
  heading: z.string().min(1, 'Heading cannot be empty').max(80, 'Heading too long for standard viewport'),
  subtitle: z.string().max(160, 'Subtitle too long').optional(),
  callouts: z.array(z.string().max(50)).max(4).optional()
});
export type SceneText = z.infer<typeof SceneTextSchema>;

export const SceneVisualSchema = z.object({
  type: VisualTypeEnum,
  imagePrompt: z.string().optional(),
  assetId: z.string().optional(),
  layout: LayoutPresetEnum.default('centered')
});
export type SceneVisual = z.infer<typeof SceneVisualSchema>;

export const SceneMotionSchema = z.object({
  entrance: EntranceMotionEnum.default('fade_up'),
  exit: ExitMotionEnum.default('fade_out'),
  ambient: AmbientMotionEnum.default('none'),
  transition: TransitionTypeEnum.default('fade')
});
export type SceneMotion = z.infer<typeof SceneMotionSchema>;

export const SceneSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Scene ID must contain only alphanumeric characters, dashes, or underscores'),
  start: z.number().nonnegative('Scene start time must be non-negative'),
  duration: z.number().positive('Scene duration must be positive'),
  purpose: ScenePurposeEnum,
  text: SceneTextSchema,
  visual: SceneVisualSchema,
  motion: SceneMotionSchema
});
export type Scene = z.infer<typeof SceneSchema>;

export const CtaSchema = z.object({
  actionText: z.string().min(1).max(40),
  subText: z.string().max(80).optional(),
  urlOrBrand: z.string().max(60).optional(),
  badge: z.string().max(30).optional()
});
export type CtaConfig = z.infer<typeof CtaSchema>;

export const VideoPlanSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  duration: z.number().positive('Duration must be greater than 0').max(300, 'Duration capped at 300s'),
  fps: FpsEnum.default(30),
  aspectRatio: AspectRatioEnum,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  theme: ThemeSchema,
  scenes: z.array(SceneSchema).min(1, 'Plan must contain at least one scene'),
  cta: CtaSchema.optional(),
  metadata: z
    .object({
      brief: z.string().optional(),
      model: z.string().optional(),
      generatedAt: z.string().optional(),
      repairedAt: z.string().optional(),
      repairModel: z.string().optional(),
      version: z.string().default('1.0.0')
    })
    .passthrough()
    .optional()
});
export type VideoPlan = z.infer<typeof VideoPlanSchema>;
