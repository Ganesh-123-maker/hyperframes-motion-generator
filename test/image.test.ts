import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { VideoPlan } from '../src/planner/schema';
import {
  extractImageRequests,
  buildFocusedImagePrompt,
  slugify
} from '../src/image/extractor';
import {
  decodeBase64Image,
  computeBufferSha256,
  writeImageFileSafely
} from '../src/image/decoder';
import { checkAssetCache } from '../src/image/cache';
import { callGptImage2 } from '../src/image/client';
import { generateImageAssets } from '../src/image/generator';
import { generateComposition } from '../src/composition/generator';

// Sample 1x1 transparent PNG as base64 fixture
const SAMPLE_BASE64_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const mockPlanWithImage: VideoPlan = {
  title: 'CloudScale - Enterprise Kubernetes Platform',
  duration: 10,
  fps: 30,
  aspectRatio: '16:9',
  width: 1920,
  height: 1080,
  theme: {
    name: 'dark-cyber',
    backgroundType: 'solid',
    backgroundColor: '#0A0E17',
    primaryColor: '#6366F1',
    accentColor: '#38BDF8',
    textColor: '#F8FAFC',
    surfaceColor: '#1E293B',
    fontFamily: 'sans'
  },
  scenes: [
    {
      id: 'scene_1_intro',
      start: 0,
      duration: 4,
      purpose: 'intro',
      text: {
        badge: 'NEW RELEASE',
        heading: 'Autonomous Cluster Scaling',
        subtitle: 'Zero-touch infrastructure optimization'
      },
      visual: {
        type: 'generated_image',
        imagePrompt: 'Futuristic glowing server rack cluster with holographic network data nodes in clean dark server room.',
        layout: 'split_right'
      },
      motion: {
        entrance: 'fade_up',
        exit: 'fade_out',
        ambient: 'none',
        transition: 'fade'
      }
    },
    {
      id: 'scene_2_cta',
      start: 4,
      duration: 6,
      purpose: 'cta',
      text: {
        heading: 'Deploy in Minutes',
        subtitle: 'Start scaling without limits today'
      },
      visual: {
        type: 'typography_only',
        layout: 'centered'
      },
      motion: {
        entrance: 'scale_up',
        exit: 'none',
        ambient: 'none',
        transition: 'fade'
      }
    }
  ],
  cta: {
    actionText: 'Start Free Trial',
    subText: 'No credit card required',
    urlOrBrand: 'cloudscale.io'
  }
};

const mockPlanWithoutImages: VideoPlan = {
  ...mockPlanWithImage,
  scenes: mockPlanWithImage.scenes.map((s) => ({
    ...s,
    visual: { type: 'typography_only', layout: 'centered' }
  }))
};

describe('Phase 3: Image Asset Pipeline Tests', () => {
  const testOutputDir = path.join(process.cwd(), 'test-outputs-image');

  beforeEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('1. Image Requirement Extraction & Prompts', () => {
    it('should extract correct image requirements from a plan with generated_image visual type', () => {
      const requests = extractImageRequests(mockPlanWithImage);
      expect(requests).toHaveLength(1);
      expect(requests[0].sceneId).toBe('scene_1_intro');
      expect(requests[0].assetId).toBe('scene_1_intro_visual');
      expect(requests[0].fileName).toBe('scene_1_intro_visual.png');
      expect(requests[0].aspectRatio).toBe('16:9');
    });

    it('should return empty requests array for plan without generated_image scenes', () => {
      const requests = extractImageRequests(mockPlanWithoutImages);
      expect(requests).toHaveLength(0);
    });

    it('should build focused visual prompt excluding readable text requirements', () => {
      const scene = mockPlanWithImage.scenes[0];
      const prompt = buildFocusedImagePrompt(scene, mockPlanWithImage);

      expect(prompt).toContain(scene.visual.imagePrompt);
      expect(prompt).toContain('Do not render any text, words, letters');
      expect(prompt).toContain('widescreen landscape 16:9 composition');
    });

    it('slugify helper should create clean deterministic strings', () => {
      expect(slugify('Autonomous Cluster Scaling!!')).toBe('autonomous_cluster_scaling');
      expect(slugify('   Special @#$ Characters & 123   ')).toBe('special_characters_123');
    });
  });

  describe('2. Base64 Image Decoding & Hashing', () => {
    it('should decode valid base64 PNG string into non-empty buffer', () => {
      const buffer = decodeBase64Image(SAMPLE_BASE64_PNG);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // PNG header magic numbers
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    });

    it('should handle base64 strings with data URI prefix', () => {
      const prefixed = `data:image/png;base64,${SAMPLE_BASE64_PNG}`;
      const buffer = decodeBase64Image(prefixed);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should throw clear error on empty or invalid base64 input', () => {
      expect(() => decodeBase64Image('')).toThrow('b64_json is empty');
      expect(() => decodeBase64Image(null)).toThrow('b64_json is not a string');
    });

    it('should compute valid SHA-256 hash', () => {
      const buffer = Buffer.from('test image binary content');
      const hash = computeBufferSha256(buffer);
      expect(hash).toHaveLength(64);
      expect(typeof hash).toBe('string');
    });

    it('should write image buffer to disk safely and verify non-zero size', () => {
      const targetPath = path.join(testOutputDir, 'test_asset.png');
      const buffer = decodeBase64Image(SAMPLE_BASE64_PNG);
      const result = writeImageFileSafely(targetPath, buffer);

      expect(fs.existsSync(targetPath)).toBe(true);
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.sha256).toHaveLength(64);
    });
  });

  describe('3. Deterministic Asset Caching', () => {
    it('should report isCached = false for non-existent file', () => {
      const nonExistentPath = path.join(testOutputDir, 'missing.png');
      const result = checkAssetCache(nonExistentPath);
      expect(result.isCached).toBe(false);
      expect(result.reason).toBe('file_not_found');
    });

    it('should report isCached = false for 0-byte file', () => {
      const emptyFilePath = path.join(testOutputDir, 'empty.png');
      fs.mkdirSync(testOutputDir, { recursive: true });
      fs.writeFileSync(emptyFilePath, Buffer.alloc(0));

      const result = checkAssetCache(emptyFilePath);
      expect(result.isCached).toBe(false);
      expect(result.reason).toBe('empty_file');
    });

    it('should report isCached = true with sha256 for valid file', () => {
      const validFilePath = path.join(testOutputDir, 'valid.png');
      fs.mkdirSync(testOutputDir, { recursive: true });
      fs.writeFileSync(validFilePath, Buffer.from(SAMPLE_BASE64_PNG, 'base64'));

      const result = checkAssetCache(validFilePath);
      expect(result.isCached).toBe(true);
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.sha256).toBeDefined();
    });
  });

  describe('4. OpenAI gpt-image-2 Client Calling', () => {
    it('should call images.generate and return b64_json', async () => {
      const mockGenerate = vi.fn().mockResolvedValue({
        data: [{ b64_json: SAMPLE_BASE64_PNG }]
      });
      const mockClient = {
        images: {
          generate: mockGenerate
        }
      } as any;

      const result = await callGptImage2(mockClient, 'Test Prompt', { model: 'gpt-image-2' });
      expect(result).toBe(SAMPLE_BASE64_PNG);
      expect(mockGenerate).toHaveBeenCalledWith(
        {
          model: 'gpt-image-2',
          prompt: 'Test Prompt',
          n: 1,
          response_format: 'b64_json',
          size: '1024x1024'
        },
        { timeout: 180000 }
      );
    });

    it('should throw clear error on empty API response', async () => {
      const mockGenerate = vi.fn().mockResolvedValue({ data: [] });
      const mockClient = { images: { generate: mockGenerate } } as any;

      await expect(callGptImage2(mockClient, 'Prompt')).rejects.toThrow(
        'LLM Image Gateway returned an empty response array'
      );
    });

    it('should throw clear error if b64_json is missing', async () => {
      const mockGenerate = vi.fn().mockResolvedValue({ data: [{ url: 'https://example.com/img.png' }] });
      const mockClient = { images: { generate: mockGenerate } } as any;

      await expect(callGptImage2(mockClient, 'Prompt')).rejects.toThrow(
        'received URL instead of requested b64_json'
      );
    });

    it('should throw clear error on timeout or auth failure without exposing key', async () => {
      const mockGenerate = vi.fn().mockRejectedValue({ status: 401, message: 'Bearer secret_key_123 failed' });
      const mockClient = { images: { generate: mockGenerate } } as any;

      await expect(callGptImage2(mockClient, 'Prompt')).rejects.toThrow(
        'Image Gateway authentication failed (401)'
      );
    });
  });

  describe('5. Full Image Asset Pipeline Execution', () => {
    it('should generate assets, decode base64, save to disk, and write asset manifest', async () => {
      const mockGenerate = vi.fn().mockResolvedValue({
        data: [{ b64_json: SAMPLE_BASE64_PNG }]
      });
      const mockClient = { images: { generate: mockGenerate } } as any;

      const manifest = await generateImageAssets(mockPlanWithImage, {
        outputDir: testOutputDir,
        runId: 'test_run_1',
        openaiClient: mockClient,
        quiet: true
      });

      expect(manifest.totalAssets).toBe(1);
      expect(manifest.assets[0].assetId).toBe('scene_1_intro_visual');
      expect(manifest.assets[0].status).toBe('generated');
      expect(manifest.assets[0].fileSizeBytes).toBeGreaterThan(0);
      expect(manifest.assets[0].sha256).toHaveLength(64);

      // Verify files exist on disk
      const assetPath = path.join(testOutputDir, 'test_run_1', 'composition', 'assets', 'scene_1_intro_visual.png');
      const rootManifestPath = path.join(testOutputDir, 'test_run_1', 'assets.json');

      expect(fs.existsSync(assetPath)).toBe(true);
      expect(fs.existsSync(rootManifestPath)).toBe(true);

      const parsedManifest = JSON.parse(fs.readFileSync(rootManifestPath, 'utf-8'));
      expect(parsedManifest.totalAssets).toBe(1);
      expect(parsedManifest.assets[0].fileName).toBe('scene_1_intro_visual.png');
    });

    it('should reuse cached asset and NOT call API on second execution', async () => {
      const mockGenerate = vi.fn().mockResolvedValue({
        data: [{ b64_json: SAMPLE_BASE64_PNG }]
      });
      const mockClient = { images: { generate: mockGenerate } } as any;

      // Run 1: Generation
      const manifest1 = await generateImageAssets(mockPlanWithImage, {
        outputDir: testOutputDir,
        runId: 'test_cache_run',
        openaiClient: mockClient,
        quiet: true
      });
      expect(manifest1.assets[0].status).toBe('generated');
      expect(mockGenerate).toHaveBeenCalledTimes(1);

      // Run 2: Cache Hit
      const manifest2 = await generateImageAssets(mockPlanWithImage, {
        outputDir: testOutputDir,
        runId: 'test_cache_run',
        openaiClient: mockClient,
        quiet: true
      });
      expect(manifest2.assets[0].status).toBe('reused');
      // Mock generate should NOT be called again
      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });

    it('should perform bounded retries on transient errors', async () => {
      const mockGenerate = vi
        .fn()
        .mockRejectedValueOnce(new Error('Transient Gateway 502 error'))
        .mockResolvedValueOnce({
          data: [{ b64_json: SAMPLE_BASE64_PNG }]
        });
      const mockClient = { images: { generate: mockGenerate } } as any;

      const manifest = await generateImageAssets(mockPlanWithImage, {
        outputDir: testOutputDir,
        runId: 'test_retry_run',
        openaiClient: mockClient,
        maxAttempts: 3,
        quiet: true
      });

      expect(mockGenerate).toHaveBeenCalledTimes(2);
      expect(manifest.assets[0].status).toBe('generated');
    });

    it('should fail explicitly and stop pipeline if max retry attempts are exceeded', async () => {
      const mockGenerate = vi.fn().mockRejectedValue(new Error('Persistent Gateway Error'));
      const mockClient = { images: { generate: mockGenerate } } as any;

      await expect(
        generateImageAssets(mockPlanWithImage, {
          outputDir: testOutputDir,
          runId: 'test_fail_run',
          openaiClient: mockClient,
          maxAttempts: 2,
          quiet: true
        })
      ).rejects.toThrow('ERROR: Required asset scene_1_intro_visual');
    });
  });

  describe('6. Integration with Composition Generator', () => {
    it('should seamlessly incorporate generated PNG assets into composition index.html', async () => {
      const mockGenerate = vi.fn().mockResolvedValue({
        data: [{ b64_json: SAMPLE_BASE64_PNG }]
      });
      const mockClient = { images: { generate: mockGenerate } } as any;

      const runId = 'test_comp_integration';

      // 1. Generate Image Assets
      const manifest = await generateImageAssets(mockPlanWithImage, {
        outputDir: testOutputDir,
        runId,
        openaiClient: mockClient,
        quiet: true
      });

      // 2. Generate Composition passing asset manifest
      const compResult = await generateComposition(mockPlanWithImage, {
        outputDir: testOutputDir,
        runId,
        assetManifest: manifest
      });

      expect(compResult.ok).toBe(true);
      expect(compResult.assets).toContain('assets/scene_1_intro_visual.png');

      const indexHtml = fs.readFileSync(compResult.indexHtmlPath, 'utf-8');
      expect(indexHtml).toContain('src="assets/scene_1_intro_visual.png"');
    });
  });
});
