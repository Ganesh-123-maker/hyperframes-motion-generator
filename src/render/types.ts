export interface RenderOptions {
  outputDir?: string;
  outputFileName?: string;
  timeoutMs?: number;
  customExecutable?: string;
  customArgs?: string[];
  additionalSecretPatterns?: (string | RegExp)[];
}

export interface RenderResult {
  ok: boolean;
  exitCode: number;
  mp4Path?: string;
  durationSec?: number;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  rawOutput: string;
  stderr: string;
  hasFatalProcessError: boolean;
  errorMessage?: string;
}

export interface RenderMetadata {
  timestamp: string;
  compositionDir: string;
  mp4Path: string;
  fileSizeBytes: number;
  durationSec?: number;
  resolution?: {
    width: number;
    height: number;
  };
  renderDurationMs: number;
  exitCode: number;
  ok: boolean;
}
