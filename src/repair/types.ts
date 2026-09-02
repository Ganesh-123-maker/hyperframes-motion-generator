import { VideoPlan } from '../planner/schema.js';
import { NormalizedIssue, HyperFramesCheckResult } from '../checker/types.js';
import { AssetManifest } from '../image/types.js';

export interface RepairOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  outputDir?: string;
  runId?: string;
  timeoutMs?: number;
  seed?: number;
  mockResponse?: string;
  additionalSecretPatterns?: (string | RegExp)[];
}

export interface RepairResult {
  ok: boolean;
  repairedPlan?: VideoPlan;
  rawResponse?: string;
  error?: string;
  isIdenticalPlan?: boolean;
  driftDetected?: boolean;
  driftMessage?: string;
}

export interface RepairAttemptHistoryItem {
  attempt: number;
  status: 'passed' | 'failed';
  timestamp: string;
  durationMs: number;
  issues: NormalizedIssue[];
  repaired?: boolean;
  repairError?: string;
  planPath?: string;
  compositionDir?: string;
  checkArtifactPath?: string;
}

export interface VerificationLoopOptions {
  outputDir?: string;
  runId?: string;
  maxRepairAttempts?: number;
  planModel?: string;
  imageModel?: string;
  forceImages?: boolean;
  strict?: boolean;
  dryRun?: boolean;
  openaiClient?: any;
  apiKey?: string;
  baseURL?: string;
  mockRepairResponses?: (string | null)[]; // Array of mock repair responses per attempt
  mockCheckResults?: (HyperFramesCheckResult | null)[]; // Array of mock check results per attempt
}

export interface VerificationLoopResult {
  ok: boolean;
  attempts: number;
  finalPlan: VideoPlan;
  finalCompositionDir?: string;
  repairHistory: RepairAttemptHistoryItem[];
  assetManifest?: AssetManifest;
  lastCheckResult?: HyperFramesCheckResult;
  errorMessage?: string;
}
