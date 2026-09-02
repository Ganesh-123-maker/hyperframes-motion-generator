import { VideoPlan, AspectRatio, LayoutPreset, VisualType, EntranceMotion, ExitMotion, AmbientMotion } from '../planner/schema';
import { AssetManifest } from '../image/types';

export interface CompositionOptions {
  outputDir?: string;
  runId?: string;
  assetDirName?: string;
  createPlaceholderAssets?: boolean;
  assetManifest?: AssetManifest;
  assetMap?: Record<string, string>;
}

export interface CompositionResult {
  ok: boolean;
  runId: string;
  compositionDir: string;
  indexHtmlPath: string;
  configPath: string;
  assets: string[];
  sceneCount: number;
  duration: number;
  resolution: {
    width: number;
    height: number;
    aspectRatio: AspectRatio;
  };
  errors?: string[];
}

export interface LayoutGeometry {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  padding: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  typography: {
    headingSize: number;
    subtitleSize: number;
    badgeSize: number;
    bodySize: number;
    ctaSize: number;
    lineHeight: number;
  };
  maxContentWidth: number;
  cardMaxWidth: number;
  imageMaxHeight: number;
  isVertical: boolean;
  isSquare: boolean;
  isWidescreen: boolean;
}

export interface ThemeResolvedTokens {
  backgroundCss: string;
  surfaceCss: string;
  surfaceBorderCss: string;
  textColor: string;
  textMutedColor: string;
  primaryColor: string;
  accentColor: string;
  fontFamilyCss: string;
  badgeBgCss: string;
  badgeTextCss: string;
  ctaButtonBgCss: string;
  ctaButtonTextCss: string;
}
