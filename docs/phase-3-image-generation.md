# Phase 3 — gpt-image-2 Image Asset Pipeline

This document details the architecture, design decisions, implementation, and verification of the image asset generation pipeline in Phase 3.

---

## 1. Architectural Overview & Workflow

The image asset pipeline bridges the validated planning engine (Phase 1) and the deterministic HyperFrames composition renderer (Phase 2):

```
+-------------------------------------------------------------------+
|                        1. Video Brief                             |
|    "Create a 12s widescreen ad for a developer analytics platform"|
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|               2. Structured Planner (GPT-5.5)                    |
|    Schema validation + bounded repair -> Validated plan.json      |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|              3. Image Extraction & Optimization Layer             |
|    - Filters scenes with visual.type === 'generated_image'        |
|    - Synthesizes focused prompt (lighting, texture, no text)     |
|    - Generates deterministic asset IDs: scene_1_intro_visual.png |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|              4. Deterministic Local Caching Layer                 |
|    - Check outputs/<run-id>/composition/assets/<fileName>         |
|    - Validate file exists and size > 0 bytes                      |
|    - If cache hit: Reuse asset, compute SHA-256 (0 API calls)    |
+-------------------------------------------------------------------+
                                  |
                 [Cache Miss / Invalid Asset]
                                  |
                                  v
+-------------------------------------------------------------------+
|              5. gpt-image-2 Generation & Decoding                 |
|    - Official OpenAI SDK (response_format: "b64_json")           |
|    - Gateway: https://llm.ganeshnayak.in/v1                      |
|    - 180s client timeout, bounded retry loop (max 3 attempts)    |
|    - Decodes base64 buffer -> writes binary PNG file to disk     |
|    - Verifies file integrity & SHA-256 checksum                  |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                     6. Asset Manifest Creation                    |
|    - Persists outputs/<run-id>/assets.json                        |
|    - Contains assetId, sceneId, SHA-256, dimensions, status       |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|            7. Deterministic HyperFrames Composition               |
|    - Passes manifest to CompositionGenerator                      |
|    - Injects real PNG assets: <img src="assets/...png" />         |
|    - Compliant with `npx hyperframes check . --json`              |
+-------------------------------------------------------------------+
```

---

## 2. API Configuration & Security

- **Official OpenAI SDK**: `openai: ^7.9.0`
- **Model**: `gpt-image-2`
- **Base URL**: `https://llm.ganeshnayak.in/v1` (configured via `OPENAI_BASE_URL`)
- **API Key**: `OPENAI_API_KEY` (injected via environment variables or CLI options)
- **Timeout**: `180000ms` (180s) to accommodate high-resolution image diffusion pipelines.
- **Credential Hygiene**:
  - `OPENAI_API_KEY` is never printed, logged, or serialized to disk.
  - Exception messages sanitize bearer tokens and raw authorization headers.
  - `.env` files are strictly gitignored.

---

## 3. The Text vs. Visual Rendering Principle

### Critical Design Choice:
> **`gpt-image-2` is strictly tasked with generating pure visual artwork (mood, lighting, textures, subjects). All typography, headlines, subtitles, badges, and UI data are rendered deterministically using HTML and CSS in HyperFrames.**

### Why this boundary is enforced:
1. **Legibility and Crispness**: Diffusion models often generate distorted glyphs, spelling errors, and inconsistent font weights. Vector HTML/CSS typography renders at pixel-perfect native resolutions (1080p, 4K).
2. **Animation and Choreography**: Text in HTML can be animated with GSAP (staggers, fade-ups, kinetic reveal transitions). Baked raster text cannot be animated independently.
3. **Contrast and Accessibility**: HTML/CSS text uses our WCAG AA contrast token engine (`adjustColorForContrast`), ensuring readability against any background.
4. **Focused Prompt Engineering**: Visual prompts explicitly append:
   `"Crucial note: High-resolution pure visual artwork only. Do not render any text, words, letters, subtitles, labels, or typography in the image."`

---

## 4. Deterministic Asset Identification

Asset IDs and file names are constructed deterministically from scene identifiers:
- `assetId`: `${scene.id}_visual` (e.g., `scene_1_intro_visual`)
- `fileName`: `${scene.id}_visual.png` (e.g., `scene_1_intro_visual.png`)
- `relativePath`: `assets/${scene.id}_visual.png`

**Guarantees**:
- No random UUIDs or timestamps in file names.
- Reproducible references between runs.
- Exact path matching with the composition generator.

---

## 5. Base64 Decoding & Disk Verification

The `gpt-image-2` API returns image payloads in base64 string format inside `response.data[0].b64_json`.

### Pipeline Execution:
1. **Format Validation**: Ensures `b64_json` is a non-empty string. Strips any data URI prefixes (`data:image/png;base64,...`).
2. **Binary Decoding**: Decodes into a Node.js `Buffer`.
3. **Header Validation**: Checks PNG/JPEG binary magic bytes (`0x89, 0x50, 0x4E, 0x47`).
4. **Atomic File Write**: Writes the buffer to the target directory.
5. **Disk Verification**: Confirms file presence and verifies `size > 0 bytes`.
6. **Integrity Checksum**: Calculates and logs SHA-256 hash.

---

## 6. Deterministic Caching Strategy

Because image generation is computationally intensive, a deterministic local cache is evaluated prior to any remote API call:

1. Target path: `outputs/<run-id>/composition/assets/<fileName>`.
2. Evaluates file existence and non-zero size (`fs.statSync(filePath).size > 0`).
3. Computes SHA-256 hash from disk buffer.
4. If valid, marks status as `reused` and bypasses the OpenAI API call.
5. If missing or invalid, initiates generation with bounded retries.
6. A `--force` CLI flag is available to bypass the cache when intentional regeneration is required.

---

## 7. Asset Manifest Schema (`assets.json`)

Saved at `outputs/<run-id>/assets.json` and `outputs/<run-id>/composition/assets/assets.json`:

```json
{
  "runId": "run_pulse_analytics_16x9",
  "generatedAt": "2026-09-02T12:30:00.000Z",
  "totalAssets": 1,
  "model": "gpt-image-2",
  "assets": [
    {
      "assetId": "scene_2_features_visual",
      "sceneId": "scene_2_features",
      "fileName": "scene_2_features_visual.png",
      "localPath": "/app/applet/outputs/run_pulse_analytics_16x9/composition/assets/scene_2_features_visual.png",
      "relativePath": "assets/scene_2_features_visual.png",
      "prompt": "Sleek futuristic developer analytics dark mode UI dashboard showing glowing purple and cyan telemetry graphs... Style: ultra-modern commercial product rendering... Crucial note: High-resolution pure visual artwork only. Do not render any text, words, letters, subtitles, labels, or typography in the image.",
      "model": "gpt-image-2",
      "status": "generated",
      "fileSizeBytes": 1458920,
      "sha256": "3a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b",
      "createdAt": "2026-09-02T12:30:00.000Z",
      "aspectRatio": "16:9",
      "dimensions": {
        "width": 1920,
        "height": 1080
      }
    }
  ]
}
```

---

## 8. Error Handling & Bounded Retry Policy

- **Retry Limit**: `MAX_IMAGE_ATTEMPTS = 3`.
- **Transient Failure Handling**: Automatically retries 5xx server errors, rate limits (429), and connection timeouts.
- **Fail-Fast Policy**: If an asset fails to generate after 3 attempts, the pipeline halts immediately with an explicit descriptive error:
  `ERROR: Required asset scene_1_intro_visual (scene_1_intro_visual.png) could not be generated after 3 attempts.`
- **Strict Anti-Corrupt Rule**: The pipeline never silently injects broken images, blank canvases, or fake placeholders when an explicit image generation is requested and fails.

---

## 9. CLI Usage

### Dedicated Image Generation CLI
```bash
# Generate image assets for an existing plan
npm run image -- --plan examples/plans/example-plan.json

# Force regenerate images (ignore cache)
npm run image -- --plan examples/plans/example-plan.json --force
```

### End-to-End Pipeline CLI (Phases 1-3)
```bash
# Execute Plan -> Validate -> Images -> Composition
npm run generate -- --brief "Create an 8s social video for an artisanal coffee shop"

# Run with example brief
npm run generate -- --example
```

---

## 10. Verification & Test Suite

The test suite (`test/image.test.ts`) verifies:
- Requirement extraction and prompt building.
- Base64 image decoding and validation.
- SHA-256 checksum computation and file integrity verification.
- Deterministic cache hits and cache misses.
- Mocked OpenAI API interactions (`images.generate` with `b64_json`).
- Bounded retry loops and explicit error propagation.
- Composition generator integration (real PNG rendering in `index.html`).

```bash
npm test
# Result: 3 passed test files, 42 passed tests (100% green)
```
