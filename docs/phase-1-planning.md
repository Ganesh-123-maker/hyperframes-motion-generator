# Phase 1: Structured Planning Pipeline Documentation

## 1. Executive Summary & Purpose

Phase 1 implements the first deterministic stage of the **HyperFrames Motion Graphics Video Generator**: converting an unstructured, plain-language video brief into a strongly-typed, schema-validated storyboard and choreography specification (`plan.json`).

```
+------------------+       +-------------------+       +---------------------+
|                  |       |                   |       |   Two-Tier Gate     |
| Plain-Language   | ----> |  GPT-5.5 Planner  | ----> | 1. Schema Parse     |
| Video Brief      |       |  (Structured LLM) |       | 2. Semantic Audit   |
|                  |       |                   |       +----------+----------+
+------------------+       +-------------------+                  |
                                                                  v
                                              +-----------------------------------+
                                              | Valid Plan?                       |
                                              | - YES: outputs/<run-id>/plan.json |
                                              | - NO:  Bounded Recovery Loop      |
                                              |        (Max 3 Feedback Retries)   |
                                              +-----------------------------------+
```

---

## 2. Planning Schema Design (`src/planner/schema.ts`)

The planning schema is authored using **Zod** for strict runtime parsing and TypeScript static type inference. It defines *what* the video should contain without prematurely generating executable composition code.

### Core Schema Definition:
```typescript
export interface VideoPlan {
  title: string;              // 1-100 characters
  duration: number;           // Total video length in seconds (e.g., 12.0)
  fps: 24 | 30 | 60;          // Frame rate (default: 30)
  aspectRatio: '16:9' | '9:16' | '1:1';
  width: number;              // 1920 or 1080
  height: number;             // 1080 or 1920
  theme: {
    name: string;
    backgroundType: 'solid' | 'gradient' | 'mesh';
    backgroundColor: string;  // Hex (#0B0F19)
    gradientEnd?: string;     // Hex (#1E1035)
    primaryColor: string;     // Hex (#A855F7)
    accentColor: string;      // Hex (#C084FC)
    textColor: string;        // Hex (#F8FAFC)
    surfaceColor: string;     // Hex (#151D2E)
    fontFamily: 'sans' | 'mono' | 'serif';
  };
  scenes: Array<{
    id: string;               // Alphanumeric slug (e.g., "scene_1_intro")
    start: number;            // Timestamp in seconds (>= 0)
    duration: number;         // Length in seconds (> 0)
    purpose: ScenePurpose;    // 'intro' | 'problem' | 'solution' | 'feature_callout' | ...
    text: {
      badge?: string;
      heading: string;        // Max 80 chars
      subtitle?: string;      // Max 160 chars
      callouts?: string[];    // Max 4 bullets
    };
    visual: {
      type: 'typography_only' | 'generated_image' | 'dashboard_card' | 'feature_grid' | ...;
      imagePrompt?: string;   // Required if type is 'generated_image' (for gpt-image-2)
      layout: 'centered' | 'split_left' | 'split_right' | 'stacked_top' | 'grid_3col' | 'hero_card';
    };
    motion: {
      entrance: 'fade_up' | 'slide_in_left' | 'slide_in_right' | 'scale_up' | 'stagger_reveal' | 'pop_in';
      exit: 'fade_out' | 'slide_out_up' | 'slide_out_down' | 'zoom_out' | 'none';
      ambient: 'subtle_pulse' | 'slow_pan' | 'glow_shift' | 'none';
      transition: 'fade' | 'slide' | 'cut' | 'wipe' | 'zoom';
    };
  }>;
  cta?: {
    actionText: string;
    subText?: string;
    urlOrBrand?: string;
    badge?: string;
  };
}
```

---

## 3. Two-Tier Validation Strategy (`src/planner/validator.ts`)

Validation is strictly segregated into two layers:

1. **Structural Schema Validation (`validatePlanSchema`)**:
   - Enforces required types, regex format on hex colors (`^#[0-9A-Fa-f]{6}$`), enum boundaries, and string length caps.
2. **Deep Semantic Auditing (`validatePlanSemantics`)**:
   - **Aspect Ratio Proportion**: Verifies `width / height` matches `16:9` (1.777), `9:16` (0.5625), or `1:1` (1.0) within a 2% tolerance.
   - **Scene Duration Constraint**: Asserts `start + duration <= totalDuration + 0.05s`.
   - **Chronological Non-Overlap**: Ensures scene $i$ start timestamp is not earlier than scene $i-1$ end timestamp.
   - **Identity Uniqueness**: Rejects duplicate scene IDs.
   - **Image Prompt Completeness**: Ensures that if `visual.type === 'generated_image'`, an `imagePrompt` of at least 8 characters is supplied.

---

## 4. LLM Integration & Prompt Engineering (`src/planner/prompt.ts`, `src/planner/planner.ts`)

- **Model Target**: `gpt-5.5` (via OpenAI-compatible API gateway `https://llm.ganeshnayak.in/v1`).
- **Configuration**:
  - `temperature: 0.1` (deterministic choreography)
  - `seed: 42` (reproducibility)
  - `max_tokens: 8000` (sufficient budget for GPT-5.5 reasoning tokens + output)
  - `response_format: { type: "json_object" }`
- **Error Feedback Formatting**:
  When a validation error occurs during attempt $N$, the exact failure lines (e.g., `[scenes.scene_2.start] Scene starts at 3.0s but previous scene ends at 3.5s`) are injected directly into the retry prompt so the model can surgically fix the issue.

---

## 5. Bounded Recovery Loop (Self-Correction)

- **Attempt Limit**: Strictly capped at 3 attempts (`MAX_PLAN_ATTEMPTS = 3`).
- **No Infinite Loops**: If 3 attempts are exhausted without passing both schema and semantic validation, the planner fails loudly, throwing a comprehensive error with all failure reasons.
- **No Silent Degraded Fallbacks**: An invalid plan is never passed forward to downstream compilation stages.

---

## 6. Artifact Preservation

Every execution produces a clean, timestamped directory under `outputs/<run-id>/`:
- `brief.txt`: The exact plain-language prompt.
- `plan.json`: The validated, formatted JSON planning artifact.
- `metadata.json`: Run telemetry (model, duration in ms, attempt count, seed, timestamp).

---

## 7. Verification & Testing

### Automated Test Suite:
Run vitest suite covering 12 distinct unit test scenarios:
```bash
npm test
```
**Results:**
```
✓ test/planner.test.ts (12 tests) 28ms
  ✓ valid reference plan passes structural schema validation
  ✓ valid reference plan passes full semantic validation
  ✓ rejects non-positive total duration
  ✓ rejects mismatched aspect ratio and dimensions
  ✓ rejects overlapping scene timestamps
  ✓ rejects scenes extending past the overall video duration
  ✓ rejects empty or whitespace-only scene headings
  ✓ rejects generated_image visual type when imagePrompt is omitted
  ✓ rejects duplicate scene IDs
  ✓ extractJsonFromResponse handles markdown code blocks and raw JSON
  ✓ generates valid plan with mock response and writes artifacts
  ✓ fails loudly after exceeding maximum bounded attempts on corrupt responses

Test Files  1 passed (1)
     Tests  12 passed (12)
```

### CLI Execution:
```bash
npm run plan -- --example --dry-run
```
Output:
- Successfully validated against `examples/plans/example-plan.json` and saved to `outputs/dryrun_<timestamp>/plan.json`.

---

## 8. Transition to Phase 2

With a validated `plan.json` artifact contract established, Phase 2 can deterministically consume this structured data to generate HyperFrames HTML/GSAP compositions with 0% runtime schema ambiguity.
