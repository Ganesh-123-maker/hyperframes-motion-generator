import { AspectRatio, ScenePurpose, VideoPlan } from '../planner/schema';
import OpenAI from 'openai';

export interface ImageRequest {
  sceneId: string;
  assetId: string;
  fileName: string;
  purpose: ScenePurpose;
  prompt: string;
  aspectRatio: AspectRatio;
  width: number;
  height: number;
  styleIntent: string;
}

export interface ImageAsset {
  assetId: string;
  sceneId: string;
  fileName: string;
  localPath: string;
  relativePath: string;
  prompt: string;
  model: string;
  status: 'generated' | 'reused';
  fileSizeBytes: number;
  sha256: string;
  createdAt: string;
  aspectRatio: AspectRatio;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface AssetManifest {
  runId: string;
  generatedAt: string;
  totalAssets: number;
  model: string;
  assets: ImageAsset[];
}

export type ImageProgressStatus =
  | 'checking_cache'
  | 'reused'
  | 'generating'
  | 'decoded'
  | 'saved'
  | 'failed';

export interface ImageProgressEvent {
  sceneId: string;
  assetId: string;
  fileName: string;
  status: ImageProgressStatus;
  attempt?: number;
  message?: string;
}

export interface ImageGeneratorOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  outputDir?: string;
  runId?: string;
  timeoutMs?: number;
  maxAttempts?: number;
  forceRegenerate?: boolean;
  openaiClient?: OpenAI;
  onProgress?: (event: ImageProgressEvent) => void;
  quiet?: boolean;
}
