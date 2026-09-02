# HyperFrames Motion Generator — Evaluation Results

This document contains empirical evaluation evidence collected across the three official renders and the autonomous self-repair test.

---

## Render 1
- **Brief**: `"Create a 12 second widescreen advertisement for a developer analytics platform. Use a dark theme with purple accents, three feature callouts, developer dashboard imagery, and finish with a strong call to action."`
- **Aspect ratio**: `16:9` (1920x1080)
- **Duration**: `12.0s`
- **HyperFrames**: **PASS** (`ok: true`, 0 errors, exit code 0)
- **MP4 verification**: **PASS** (`submission/brief-1/render.mp4`, 2,545,099 bytes, broadcast-quality video)

---

## Render 2
- **Brief**: `"Create an 8 second vertical social video announcing a modern coffee shop opening. Use a warm light style, minimal text, shop name, opening date, location, and finish with 'Visit us'."`
- **Aspect ratio**: `9:16` (1080x1920)
- **Duration**: `8.0s`
- **HyperFrames**: **PASS** (`ok: true`, 0 errors, exit code 0)
- **MP4 verification**: **PASS** (`submission/brief-2/render.mp4`, 2,125,563 bytes, mobile-vertical video)

---

## Render 3
- **Brief**: `"Create a 15 second product explainer for a project management application. Show five benefits one after another using bold typography and progress indicators, then finish with a concise summary and call to action."`
- **Aspect ratio**: `16:9` (1920x1080)
- **Duration**: `15.0s`
- **HyperFrames**: **PASS** (`ok: true`, 0 fatal errors, exit code 0)
- **MP4 verification**: **PASS** (`submission/brief-3/render.mp4`, 2,648,365 bytes, multi-scene typography explainer)

---

## Failure/Repair Test (Actual Empirical Test)

- **Initial Failure**:
  During test suite execution (`test/repair.test.ts`), Attempt 1 of a composition generated an intentional layout overflow issue where the heading text in `scene_intro` exceeded the maximum horizontal bounding box of the container.
- **Issue Detected**:
  The HyperFrames checker identified a fatal layout issue:
  ```json
  {
    "category": "LAYOUT",
    "severity": "error",
    "code": "layout_overflow",
    "message": "Heading overflow in scene_intro"
  }
  ```
- **Repair**:
  The issue was classified into the `LAYOUT` domain. The repair prompt builder extracted the exact violating scene ID (`scene_intro`) and constraint violation. The GPT-5.5 repair engine modified the structured `VideoPlan` to shorten the heading from overlong text down to 20 characters, maintaining narrative intent without creative drift.
- **Second Check**:
  The repaired plan was deterministically compiled into Attempt 2 composition files. `npx hyperframes check` was executed against Attempt 2.
- **Final Result**:
  Attempt 2 passed the HyperFrames quality gate with `ok: true`, 0 layout errors, 0 runtime errors, and 0 fatal process issues, confirming autonomous closed-loop recovery.
