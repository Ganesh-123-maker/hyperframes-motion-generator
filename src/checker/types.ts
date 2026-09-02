export type IssueCategory = 'lint' | 'runtime' | 'layout' | 'motion' | 'contrast' | 'unknown';
export type IssueSeverity = 'error' | 'warning' | 'info';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface NormalizedIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  code: string;
  message: string;
  selector?: string;
  sourceFile?: string;
  time?: number;
  fixHint?: string;
  contrastDetails?: {
    fg?: string;
    bg?: string;
    ratio?: number;
    requiredRatio?: number;
    suggestedColor?: string;
    large?: boolean;
    text?: string;
  };
  layoutDetails?: {
    bbox?: BoundingBox;
    rect?: ElementRect;
    containerRect?: ElementRect;
    containerSelector?: string;
    overflow?: Record<string, number>;
    text?: string;
  };
  runtimeDetails?: {
    stack?: string;
    url?: string;
  };
  raw: any;
}

export interface HyperFramesFinding {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  selector?: string;
  sourceFile?: string;
  bbox?: BoundingBox;
  time?: number;
  fixHint?: string;
  dataAttributes?: Record<string, any>;
  // Contrast specific
  text?: string;
  fg?: string;
  bg?: string;
  ratio?: number;
  requiredRatio?: number;
  suggestedColor?: string;
  large?: boolean;
  // Layout specific
  rect?: ElementRect;
  containerRect?: ElementRect;
  containerSelector?: string;
  overflow?: Record<string, number>;
  firstSeen?: number;
  lastSeen?: number;
  occurrences?: number;
  // Runtime specific
  stack?: string;
  url?: string;
  [key: string]: any;
}

export interface HyperFramesStageResult {
  ok: boolean;
  errorCount?: number;
  warningCount?: number;
  infoCount?: number;
  findings?: HyperFramesFinding[];
  [key: string]: any;
}

export interface HyperFramesRawCheckOutput {
  ok: boolean;
  strict?: boolean;
  lint?: HyperFramesStageResult;
  runtime?: HyperFramesStageResult;
  layout?: HyperFramesStageResult;
  motion?: HyperFramesStageResult;
  contrast?: HyperFramesStageResult;
  snapshots?: {
    enabled?: boolean;
    files?: string[];
    times?: number[];
    findingFiles?: string[];
  };
  _meta?: {
    version?: string;
    latestVersion?: string;
    updateAvailable?: boolean;
  };
  [key: string]: any;
}

export interface HyperFramesCheckSummary {
  lintErrors: number;
  lintWarnings: number;
  runtimeErrors: number;
  runtimeWarnings: number;
  layoutErrors: number;
  layoutWarnings: number;
  contrastErrors: number;
  contrastWarnings: number;
  motionErrors: number;
  motionWarnings: number;
  unknownErrors: number;
  unknownWarnings: number;
  totalErrors: number;
  totalWarnings: number;
  totalInfos: number;
  totalIssues: number;
}

export interface HyperFramesCheckResult {
  ok: boolean;
  exitCode: number;
  issues: NormalizedIssue[];
  summary: HyperFramesCheckSummary;
  rawOutput: string;
  stderr: string;
  rawJson?: HyperFramesRawCheckOutput;
  artifactPath?: string;
  checkedDirectory: string;
  durationMs: number;
  hasFatalProcessError: boolean;
  processErrorMessage?: string;
}

export interface CheckOptions {
  timeoutMs?: number;
  strict?: boolean;
  saveArtifact?: boolean;
  artifactsDir?: string;
  attemptNumber?: number;
  customExecutable?: string;
  customArgs?: string[];
  // Secret masking list
  additionalSecretPatterns?: (string | RegExp)[];
}

export interface CheckArtifact {
  attempt: number;
  timestamp: string;
  compositionPath: string;
  command: string;
  exitCode: number;
  ok: boolean;
  hasFatalProcessError: boolean;
  summary: HyperFramesCheckSummary;
  issues: NormalizedIssue[];
  parsedResult?: HyperFramesRawCheckOutput;
  rawOutput: string;
  stderr: string;
}
