import fs from 'fs';
import path from 'path';
import { VideoPlan } from '../planner/schema';
import { validateFullPlan } from '../planner/validator';
import {
  AssetManifest,
  ImageAsset,
  ImageGeneratorOptions,
  ImageRequest
} from './types';
import { extractImageRequests } from './extractor';
import { checkAssetCache } from './cache';
import { decodeBase64Image, writeImageFileSafely } from './decoder';
import { callGptImage2, getOpenAIImageClient } from './client';

export const MAX_IMAGE_ATTEMPTS = 3;

/**
 * Deterministic hash-free identifier fallback matching composition generator.
 */
function getDeterministicRunId(plan: VideoPlan): string {
  const sanitizedTitle = plan.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 30);
  return `run_${sanitizedTitle}_${plan.aspectRatio.replace(':', 'x')}`;
}

/**
 * Core Image Generation Engine:
 * Coordinates extraction, deterministic caching, gpt-image-2 generation, base64 decoding,
 * verification, bounded retries, and asset manifest persistence.
 */
export async function generateImageAssets(
  plan: VideoPlan,
  options: ImageGeneratorOptions = {}
): Promise<AssetManifest> {
  // 1. Validate plan structure
  const validation = validateFullPlan(plan);
  if (!validation.ok || !validation.plan) {
    const errorMsgs = validation.errors.map((e) => `[${e.field}] ${e.message}`);
    throw new Error(`Cannot extract image requirements from invalid plan:\n${errorMsgs.join('\n')}`);
  }

  const validatedPlan = validation.plan;
  const requests = extractImageRequests(validatedPlan);

  const runId = options.runId || getDeterministicRunId(validatedPlan);
  const baseDir = options.outputDir || path.join(process.cwd(), 'outputs');
  const compositionAssetsDir = path.join(baseDir, runId, 'composition', 'assets');
  const runRootAssetsDir = path.join(baseDir, runId, 'assets');

  // Ensure asset directories exist
  if (!fs.existsSync(compositionAssetsDir)) {
    fs.mkdirSync(compositionAssetsDir, { recursive: true });
  }
  if (!fs.existsSync(runRootAssetsDir)) {
    fs.mkdirSync(runRootAssetsDir, { recursive: true });
  }

  const model = options.model || process.env.IMAGE_MODEL || 'gpt-image-2';
  const maxAttempts = options.maxAttempts || MAX_IMAGE_ATTEMPTS;
  const forceRegenerate = options.forceRegenerate ?? false;
  const quiet = options.quiet ?? false;

  const generatedAssets: ImageAsset[] = [];

  if (!quiet && requests.length > 0) {
    console.log('## Image asset pipeline\n');
    console.log(`Plan:         ${validatedPlan.title}`);
    console.log(`Model:        ${model}`);
    console.log(`Total images: ${requests.length}\n`);
  }

  // If no images required by plan, create manifest and return immediately
  if (requests.length === 0) {
    const emptyManifest: AssetManifest = {
      runId,
      generatedAt: new Date().toISOString(),
      totalAssets: 0,
      model,
      assets: []
    };
    saveAssetManifest(baseDir, runId, emptyManifest);
    return emptyManifest;
  }

  // Lazy instantiate OpenAI client if needed for generation
  let client = options.openaiClient;

  for (let idx = 0; idx < requests.length; idx++) {
    const req = requests[idx];
    const targetFilePath = path.join(compositionAssetsDir, req.fileName);
    const rootTargetFilePath = path.join(runRootAssetsDir, req.fileName);

    if (!quiet) {
      console.log(`Scene ${req.sceneId}:`);
      console.log(`  Asset:   ${req.assetId} (${req.fileName})`);
    }

    // 2. Check Cache
    const cacheResult = !forceRegenerate ? checkAssetCache(targetFilePath) : { isCached: false, sizeBytes: 0 };

    if (cacheResult.isCached && cacheResult.sha256) {
      if (!quiet) {
        console.log(`  Status:  ✓ Reusing cached asset (${cacheResult.sizeBytes} bytes)\n`);
      }

      options.onProgress?.({
        sceneId: req.sceneId,
        assetId: req.assetId,
        fileName: req.fileName,
        status: 'reused'
      });

      // Synchronize copy to root assets dir if needed
      if (!fs.existsSync(rootTargetFilePath)) {
        fs.copyFileSync(targetFilePath, rootTargetFilePath);
      }

      generatedAssets.push({
        assetId: req.assetId,
        sceneId: req.sceneId,
        fileName: req.fileName,
        localPath: targetFilePath,
        relativePath: `assets/${req.fileName}`,
        prompt: req.prompt,
        model,
        status: 'reused',
        fileSizeBytes: cacheResult.sizeBytes,
        sha256: cacheResult.sha256,
        createdAt: new Date().toISOString(),
        aspectRatio: req.aspectRatio,
        dimensions: {
          width: req.width,
          height: req.height
        }
      });
      continue;
    }

    // 3. Asset generation with bounded retries
    if (!client) {
      client = getOpenAIImageClient(options.apiKey, options.baseURL);
    }

    let attempt = 0;
    let success = false;
    let lastError: Error | null = null;
    let assetMetadata: { sizeBytes: number; sha256: string } | null = null;

    while (attempt < maxAttempts && !success) {
      attempt++;

      if (!quiet) {
        console.log(`  Status:  generating with ${model} (attempt ${attempt}/${maxAttempts})...`);
      }

      options.onProgress?.({
        sceneId: req.sceneId,
        assetId: req.assetId,
        fileName: req.fileName,
        status: 'generating',
        attempt
      });

      try {
        const b64Json = await callGptImage2(client, req.prompt, {
          model,
          timeoutMs: options.timeoutMs
        });

        options.onProgress?.({
          sceneId: req.sceneId,
          assetId: req.assetId,
          fileName: req.fileName,
          status: 'decoded',
          attempt
        });

        const imageBuffer = decodeBase64Image(b64Json);

        // Write image file to composition assets directory
        assetMetadata = writeImageFileSafely(targetFilePath, imageBuffer);

        // Also write to run root assets directory for auditability
        writeImageFileSafely(rootTargetFilePath, imageBuffer);

        options.onProgress?.({
          sceneId: req.sceneId,
          assetId: req.assetId,
          fileName: req.fileName,
          status: 'saved',
          attempt
        });

        success = true;

        if (!quiet) {
          console.log(`  ✓ Image generated`);
          console.log(`  ✓ Base64 decoded`);
          console.log(`  ✓ File written: ${req.fileName} (${assetMetadata.sizeBytes} bytes)`);
          console.log(`  ✓ Asset validated (SHA-256: ${assetMetadata.sha256.substring(0, 12)}...)\n`);
        }
      } catch (err: any) {
        lastError = err;
        if (!quiet) {
          console.warn(`  ⚠ Attempt ${attempt} failed: ${err.message}`);
        }
        options.onProgress?.({
          sceneId: req.sceneId,
          assetId: req.assetId,
          fileName: req.fileName,
          status: 'failed',
          attempt,
          message: err.message
        });
      }
    }

    if (!success || !assetMetadata) {
      throw new Error(
        `ERROR: Required asset ${req.assetId} (${req.fileName}) could not be generated after ${maxAttempts} attempts.\nCause: ${lastError?.message || 'Unknown generation error'}`
      );
    }

    generatedAssets.push({
      assetId: req.assetId,
      sceneId: req.sceneId,
      fileName: req.fileName,
      localPath: targetFilePath,
      relativePath: `assets/${req.fileName}`,
      prompt: req.prompt,
      model,
      status: 'generated',
      fileSizeBytes: assetMetadata.sizeBytes,
      sha256: assetMetadata.sha256,
      createdAt: new Date().toISOString(),
      aspectRatio: req.aspectRatio,
      dimensions: {
        width: req.width,
        height: req.height
      }
    });
  }

  // 4. Save Manifest
  const manifest: AssetManifest = {
    runId,
    generatedAt: new Date().toISOString(),
    totalAssets: generatedAssets.length,
    model,
    assets: generatedAssets
  };

  saveAssetManifest(baseDir, runId, manifest);

  return manifest;
}

/**
 * Saves asset manifest to run directory and composition assets directory.
 */
export function saveAssetManifest(
  baseDir: string,
  runId: string,
  manifest: AssetManifest
): { rootManifestPath: string; compositionManifestPath: string } {
  const rootManifestPath = path.join(baseDir, runId, 'assets.json');
  const compositionManifestDir = path.join(baseDir, runId, 'composition', 'assets');
  const compositionManifestPath = path.join(compositionManifestDir, 'assets.json');

  if (!fs.existsSync(path.dirname(rootManifestPath))) {
    fs.mkdirSync(path.dirname(rootManifestPath), { recursive: true });
  }
  if (!fs.existsSync(compositionManifestDir)) {
    fs.mkdirSync(compositionManifestDir, { recursive: true });
  }

  const manifestJson = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(rootManifestPath, manifestJson, 'utf-8');
  fs.writeFileSync(compositionManifestPath, manifestJson, 'utf-8');

  return { rootManifestPath, compositionManifestPath };
}
