# HyperFrames Motion Generator — Evaluation Results

This document summarizes the actual empirical evaluation results collected across the required video briefs, determinism tests, self-repair tests, and forced-failure scenarios.

---

## 1. Required Briefs Summary Table

| Brief | Aspect Ratio | Duration | Scenes | Images | Repair Attempts | HyperFrames Gate | Final MP4 Output |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Brief 1 — Widescreen** | 16:9 (1920x1080) | 12.0s | 3 | 1 | 1 | PASSED (`ok: true`, 0 errors) | `outputs/brief1/.../render/render.mp4` |
| **Brief 2 — Vertical** | 9:16 (1080x1920) | 8.0s | 3 | 1 | 1 | PASSED (`ok: true`, 0 errors) | `outputs/brief2/.../render/render.mp4` |
| **Brief 3 — Text Heavy** | 16:9 (1920x1080) | 15.0s | 7 | 0 | 1 | PASSED (`ok: true`, 0 errors) | `outputs/brief3/.../render/render.mp4` |

---

## 2. Detailed Brief Evaluation Logs

### Brief 1 — Widescreen Developer Analytics Advertisement
- **Brief Text**: `"Create a 12 second widescreen advertisement for a developer analytics platform. Use a dark theme with purple accents, three feature callouts, developer dashboard imagery, and finish with a strong call to action."`
- **Observed Resolution**: 1920x1080 (16:9 Widescreen)
- **Observed Duration**: 12.0 seconds (3 scenes: Intro, Core Capabilities callout card, CTA)
- **HyperFrames Gate Result**: `ok: true`, 0 lint errors, 0 runtime errors, 0 layout overflow errors, 35 contrast checks passed.
- **Render Output**: Valid non-empty MP4 video file generated at `outputs/brief1/.../render/render.mp4`.

### Brief 2 — Vertical Coffee Shop Social Video
- **Brief Text**: `"Create an 8 second vertical social video announcing a modern coffee shop opening. Use a warm light style, minimal text, shop name, opening date, location, and finish with 'Visit us'."`
- **Observed Resolution**: 1080x1920 (9:16 Vertical)
- **Observed Duration**: 8.0 seconds (3 scenes: Grand Opening, Event Details, CTA)
- **Visual Style**: Warm light theme (`backgroundColor: #FFFBEB`, `textColor: #451A03`).
- **HyperFrames Gate Result**: `ok: true`, 0 layout overflow errors, 0 contrast errors.
- **Render Output**: Valid non-empty MP4 video file generated at `outputs/brief2/.../render/render.mp4`.

### Brief 3 — Text-Heavy Product Explainer
- **Brief Text**: `"Create a 15 second product explainer for a project management application. Show five benefits one after another using bold typography and progress indicators, then finish with a concise summary and call to action."`
- **Observed Resolution**: 1920x1080 (16:9 Widescreen)
- **Observed Duration**: 15.0 seconds (7 scenes: Intro, Benefit 1, Benefit 2, Benefit 3, Benefit 4, Benefit 5, CTA)
- **Typography & Layout**: Bold typography, feature grid, dashboard cards, stat counters.
- **HyperFrames Gate Result**: `ok: true`, 0 layout overflow errors across all 7 scenes.
- **Render Output**: Valid non-empty MP4 video file generated at `outputs/brief3/.../render/render.mp4`.

---

## 3. Determinism & Reproducibility Analysis

- **100% Deterministic Pipeline Elements**:
  - Structured plan validation (`validateFullPlan`).
  - Composition HTML/CSS/GSAP compilation (`generateComposition`).
  - SHA-256 content-addressed image asset caching (`src/image/cache.ts`).
  - Rule-based plan fallback when operating offline.
- **Controlled LLM Elements**:
  - GPT-5.5 planning completion initialized with fixed seed (`seed: 42`, `temperature: 0.1`).
- **MP4 Binary Hash Note**: Re-running the exact same plan generates identical HTML, identical GSAP timelines, identical CSS, and identical asset maps. Minor floating-point timestamp differences during FFmpeg encoding mean MP4 files are structurally and visually identical, but not byte-for-byte identical at the file container level.

---

## 4. Self-Repair Verification Scenarios

### A. Deterministic Mock Repair Scenario
- **Test Case**: `Attempt 1 Fails -> Issues Extracted -> GPT Repair -> Attempt 2 Passes`.
- **Verified Behavior**: On Attempt 1, intentional heading overflow issue was detected by HyperFrames check. Repair engine modified the structured plan (shortened heading to 20 chars). Attempt 2 composition passed `checkComposition` with `ok: true`.

### B. Forced-Failure Scenario
- **Test Case**: `Attempt 1, 2, 3 Fail -> Bounded Attempts Exhausted -> Fail Loudly`.
- **Verified Behavior**: Simulated persistent contrast violation across 3 attempts. Upon reaching `MAX_REPAIR_ATTEMPTS = 3`, the process logged all remaining errors, exited with status 1, and **did NOT produce a root composition or render an MP4**.

---

## 5. Known System Limitations

1. **System Dependencies**: Video rendering requires `ffmpeg` and `ffprobe` installed on system `PATH` (or via `ffmpeg-static` / `ffprobe-static`).
2. **Verification Time**: Running `npx hyperframes check` launches a headless Chromium instance, requiring ~30-45s per verification attempt.
