# Phase 0 Technical Reconnaissance Report: HyperFrames Motion Graphics Video Generator

## 1. Executive Summary

This reconnaissance document establishes the technical baseline, environment verification, HyperFrames runtime behavior, and architectural blueprint for the **HyperFrames Motion Graphics Video Generator** MVP.

Every behavior, command, API signature, and exit code documented below has been empirically verified against the live environment.

---

## 2. Current Repository & Environment State

- **Environment Baseline**:
  - **Node.js**: `v22.23.2` (Linux x64)
  - **npm**: `10.9.8`
  - **Git**: Workspace initialized without a `.git` tree (managed container environment).
  - **Memory & System**: Linux cgroup memory limit detected: `4096 MiB` (4 GB RAM, 2 CPU cores).
  - **FFmpeg / FFprobe**: `ffmpeg 4.4.2-0ubuntu0.22.04.1` installed at `/usr/bin/ffmpeg`, `/usr/bin/ffprobe`.
  - **Headless Chrome**: Chrome Headless Shell `v152.0.7977.30` downloaded and verified at `/root/.cache/hyperframes/chrome/chrome-headless-shell/linux-152.0.7977.30/chrome-headless-shell-linux64/chrome-headless-shell` via `npx hyperframes browser ensure`.

- **Existing Project Structure**:
  - React 19 + Vite 6 + Tailwind CSS frontend shell.
  - Full-stack capability with Express 4 backend support.
  - TypeScript 5.8 with modern module resolution.

---

## 3. HyperFrames Package Status & Commands

- **Package**: `hyperframes@0.8.25` (npm package published by HeyGen).
- **Installation Status**: Installed locally in `package.json` (`devDependencies`).
- **Core CLI Commands Verified**:
  - `npx hyperframes doctor` — Verifies system dependencies (Node, FFmpeg, Chrome Headless Shell, memory limits).
  - `npx hyperframes browser ensure` — Installs required Chrome Headless Shell binary if not present.
  - `npx hyperframes init <dir> --example blank --non-interactive` — Scaffolds a compliant HyperFrames project.
  - `npx hyperframes check <dir> --json` — Unified quality gate executing static linting, headless Chrome runtime validation, layout overlap/overflow checks, WCAG AA contrast analysis, and motion timeline verification.
  - `npx hyperframes render <dir> -o <path.mp4> --quality draft|standard|high` — Headless Chrome frame extraction and FFmpeg video assembly into MP4.
  - `npx hyperframes preview` — Starts the local live preview server / Studio.

---

## 4. Actual HyperFrames Project & Composition Structure

A minimal valid HyperFrames composition project requires:
1. `hyperframes.json` configuration file at the root.
2. `index.html` (the root composition document).
3. Optional `compositions/` directory for nested modular sub-compositions.
4. Optional `assets/` directory for static or generated imagery/audio.

### Verified Minimal `index.html` Structure:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
        background: #0f172a;
        color: #f8fafc;
        font-family: "Inter", sans-serif;
      }
      #root {
        width: 1920px;
        height: 1080px;
        position: relative;
        overflow: hidden;
      }
      .clip {
        position: absolute;
        inset: 0;
      }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="5"
      data-width="1920"
      data-height="1080"
    >
      <div id="scene1" class="clip" data-start="0" data-duration="5">
        <h1 id="title" style="font-size: 64px; color: #38bdf8;">Title Text</h1>
      </div>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.from("#title", { opacity: 0, y: 40, duration: 1.2, ease: "power2.out" }, 0);
      tl.to("#title", { opacity: 0, y: -20, duration: 0.8, ease: "power2.in" }, 4.0);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
```

### Essential Composition Rules:
- **Root Element**: Must have `data-composition-id="main"` (or matching ID), `data-duration="<seconds>"`, `data-width="<px>"`, and `data-height="<px>"`.
- **Timed Elements**: Must declare `class="clip"`, `data-start="<seconds>"`, and `data-duration="<seconds>"`.
- **GSAP Timelines**:
  - MUST be created with `{ paused: true }`.
  - MUST be registered on `window.__timelines[compositionId]`.
  - MUST use absolute position parameters (e.g. `tl.to(target, vars, absoluteTimeSec)`).
  - If a composition does not have a timeline, the root must declare `data-no-timeline` to prevent a 45-second discovery timeout.

---

## 5. Verification Gate Workflow (`npx hyperframes check . --json`)

The `check` command runs a strict multi-stage audit in a single Chrome boot:
1. **Linter Stage**:
   - Validates HTML syntax, `data-*` attributes, timeline registration, and conflicting CSS/GSAP transforms.
   - If lint fails with errors, browser execution is skipped entirely and `check` immediately returns `"ok": false` with exit code `1`.
2. **Runtime Stage**:
   - Evaluates headless Chrome execution, captures uncaught JavaScript exceptions, `console.error` calls, and HTTP 4xx/5xx network failures.
3. **Layout Stage**:
   - Sweeps seek samples across the duration (default 9 samples).
   - Detects text box clipping, overlapping unlayered elements, canvas boundary breaches, and static timelines (`sweep_static` fails if elements don't move or reveal under seek).
4. **Contrast Stage**:
   - Evaluates WCAG AA text contrast ratios across all visible elements.
   - Requires ≥4.5:1 for standard text and ≥3:1 for large text (≥24px or ≥19px bold).
   - Returns structured fix recommendations with `suggestedColor`.
5. **Motion Stage**:
   - Optional assertions via `*.motion.json` sidecar.

### Check JSON Response Schema:
```json
{
  "ok": false,
  "strict": false,
  "lint": {
    "ok": false,
    "errorCount": 1,
    "warningCount": 0,
    "findings": [
      {
        "code": "missing_timeline_registry",
        "severity": "error",
        "message": "Missing `window.__timelines` registration.",
        "selector": "[data-composition-id]",
        "sourceFile": "index.html",
        "bbox": { "x": 0, "y": 0, "width": 0, "height": 0 },
        "time": 0,
        "fixHint": "Register each composition timeline on `window.__timelines[compositionId]`."
      }
    ]
  },
  "runtime": { "ok": true, "errorCount": 0, "findings": [] },
  "layout": { "ok": true, "errorCount": 0, "findings": [] },
  "contrast": {
    "ok": false,
    "errorCount": 1,
    "findings": [
      {
        "code": "contrast_aa_failure",
        "severity": "error",
        "message": "Contrast is 1.14:1; WCAG AA requires 3:1.",
        "text": "Low contrast text",
        "fg": "rgb(240,240,240)",
        "bg": "rgb(255,255,255)",
        "ratio": 1.14,
        "requiredRatio": 3,
        "suggestedColor": "rgb(148,148,148)",
        "selector": "#t1",
        "time": 0.278
      }
    ]
  }
}
```

### Exit Code Behavior:
- **`0`**: Gate passed (`"ok": true`).
- **`1`**: Gate failed (`"ok": false`) due to one or more errors in lint, runtime, layout, contrast, or motion.

---

## 6. Rendering Workflow (`npx hyperframes render`)

- **Command Syntax**:
  `npx hyperframes render <project_dir> -o <output_path.mp4> --quality <draft|standard|high> --fps <24|30|60>`
- **Execution Pipeline**:
  1. Bootstraps headless Chrome via Puppeteer.
  2. Steps through frames at specified FPS using deterministic seek interpolation.
  3. Captures frames via page-side compositing / screenshot streaming.
  4. Deduplicates static frames (`static-dedup`) to optimize render time.
  5. Pipes encoded raw frames to FFmpeg x264 encoder.
  6. Emits standardized MP4 artifact.
- **Aspect Ratio Support**:
  - Widescreen: `1920x1080` (16:9)
  - Vertical: `1080x1920` (9:16)
  - Square: `1080x1080` (1:1)

---

## 7. Asset & Image Handling (`gpt-image-2`)

- **Placement**: Local asset directory `assets/` referenced by relative paths (e.g. `assets/hero-graphic.png`).
- **Format Requirements**: PNG or JPG format.
- **Dimensions**: Generated images must match or exceed their target layout containers to prevent scaling blur.
- **Deterministic Storage**: Each generation run saves images to `runs/<run-id>/assets/` before bundling.
- **HTML Referencing**:
  ```html
  <div class="clip" data-start="1" data-duration="4">
    <img src="assets/generated-visual.png" alt="Concept illustration" class="hero-image" />
  </div>
  ```

---

## 8. Verified Risks & Critical Gotchas

| # | Risk / Gotcha | Impact | Mitigation Strategy |
|---|---|---|---|
| 1 | **`sweep_static` Error** | HyperFrames check fails if a timeline has no moving or revealing elements across seek samples. | Generator must ensure GSAP timeline contains active animations distributed across the entire duration (or continuous pulsing/subtle ambient tweens). |
| 2 | **WCAG AA Contrast Enforcement** | Contrast failures are fatal gating errors with non-zero exit codes. | Plan artifact must enforce high-contrast color palettes (e.g. pure white `#FFFFFF` text on dark `#0F172A` background, ratio >10:1). Automated repair passes `suggestedColor` directly. |
| 3 | **Missing Timeline Registry** | If GSAP timeline isn't assigned to `window.__timelines[id]`, lint fails immediately. | Template generator always emits rigid script scaffold registering timeline to `window.__timelines["main"]`. |
| 4 | **Chrome Headless Shell Pre-requisite** | Renders fail if browser binary is missing. | Server initialization proactively invokes `browser ensure` at startup. |
| 5 | **Memory Constraints (4GB Container)** | Parallel renders or unconstrained worker counts could exhaust memory. | Run render with default worker scaling or `--workers 1` and `--low-memory-mode` where appropriate. |
| 6 | **Non-deterministic AI Code Generation** | Trusting an LLM to generate raw HTML from scratch leads to broken attributes, syntax errors, and missing IDs. | Adopt a strict **Two-Stage Architecture**: GPT-5.5 outputs a structured, validated `plan.json` artifact; a deterministic code compiler constructs the composition HTML and GSAP script. |

---

## 9. Recommended Modular Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Human Plain Video Brief                   │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 1. LLM Planning Module (GPT-5.5)                             │
│    - Accepts user brief + format (16:9 widescreen or 9:16)   │
│    - Emits validated plan.json (scenes, timings, copy, colors)│
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Asset Generation Module (gpt-image-2 via OpenAI Gateway)  │
│    - Generates required illustrations/imagery               │
│    - Saves to runs/<run_id>/assets/                          │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Deterministic Composition Compiler                        │
│    - Compiles plan.json into hyperframes.json + index.html   │
│    - Binds GSAP animations, typography, and contrast tokens │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. HyperFrames Quality Gate (npx hyperframes check --json)   │
│    - Executes static lint, runtime, layout, and contrast     │
└──────────────┬───────────────────────────────┬───────────────┘
               │ Passed (ok: true)             │ Failed (ok: false)
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│ 5. HyperFrames Render Engine │ │ 6. Bounded Repair Loop      │
│    - npx hyperframes render  │ │    - Reads check findings   │
│    - Emits final MP4 artifact│ │    - Repairs code/plan      │
└──────────────────────────────┘ │    - Max 3 bounded attempts │
                                 │    - Fails loudly if capped │
                                 └─────────────┬───────────────┘
                                               │ Retry
                                               └───────► (Re-check)
```

---

## 10. Verification Sign-Off

All inspection goals for Phase 0 have been completed and verified directly in the execution sandbox. Ready to proceed to Phase 1 upon confirmation.
