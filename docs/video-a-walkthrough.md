# Video A: Planning + System Design Walkthrough — Developer Speaking & Recording Guide

This document serves as the developer's step-by-step speaking guide and screen-recording script for **Video A: Planning + System Design Walkthrough** (Target Duration: 8–12 minutes).

---

## 1. Opening (0:00 – 1:00)

**Speaking Script**:
> "Hello! Today I am presenting the architecture and system design for the **HyperFrames Motion Generator**. 
> 
> The core assignment required converting plain-language user prompts into broadcast-quality motion graphics videos powered by HyperFrames. 
> 
> When approaching this problem, the fundamental engineering realization was that a naive **one-shot LLM → code → video** approach is fundamentally flawed. When LLMs generate raw HTML or JavaScript directly, they produce frequent layout overflow, contrast accessibility errors, broken animation timelines, and unpredictable visual defects.
> 
> Instead, our system treats video generation as a **closed-loop control system**: the LLM plans the video into a strict JSON schema, our application deterministically compiles the composition, an independent quality gate validates it, and a self-repair loop fixes any defects before rendering."

---

## 2. Problem Understanding (1:00 – 2:00)

**Speaking Script**:
> "Let's look at how the problem is structured:
> - **Input**: A plain-language brief (e.g. 'Create a 12-second widescreen ad for developer analytics').
> - **Intermediate Artifact**: A strictly-typed structured plan (`VideoPlan` JSON) specifying scene hierarchy, timing bounds, layout grids, typography, and visual assets.
> - **Composition Engine**: A deterministic compiler that turns the plan into valid HyperFrames project files (`index.html`, `hyperframes.json`, GSAP animation scripts).
> - **Authoritative Quality Gate**: The official `npx hyperframes check` CLI tool, which runs in a headless browser to detect layout overflow, WCAG AA contrast violations, and JS execution errors.
> - **Hard Guarantee**: No failed composition is EVER rendered into an MP4 file. Only compositions that pass validation with 0 errors are sent to the renderer."

---

## 3. Architecture Overview (2:00 – 3:30)

**Speaking Script**:
> "Here is our end-to-end system architecture:
> 
> ```
> Brief → GPT-5.5 Planner → Schema Validation → Asset Engine → Deterministic Generator → HyperFrames Check Gate → (Repair Loop if Failed) → MP4 Renderer → Output Verification
> ```
> 
> Let's walk through each transition:
> 1. **Brief to Planner**: The CLI passes the prompt to GPT-5.5 with zero-shot/few-shot structural guidance.
> 2. **Planner to Plan JSON**: GPT-5.5 emits a structured `VideoPlan` object.
> 3. **Plan Validator**: Dual-phase Zod runtime schema + semantic validation checks positive durations, non-overlapping scene timings, and typography length bounds.
> 4. **Asset Engine**: `gpt-image-2` generates visual assets, decodes base64 PNGs, and caches them using SHA-256 content hashes.
> 5. **Composition Generator**: Translates the plan into HTML5, CSS layout grids, and GSAP timeline scripts.
> 6. **HyperFrames Check Gate**: Spawns `npx hyperframes check . --json` to verify the rendered DOM.
> 7. **Repair Loop**: If check fails, issues are classified, repair instructions built, and GPT-5.5 updates the plan.
> 8. **MP4 Renderer & Verifier**: Executes `npx hyperframes render` and asserts non-zero file size."

---

## 4. Why GPT-5.5 Produces a Plan First (3:30 – 4:30)

**Speaking Script**:
> "Why do we require GPT-5.5 to produce a structured JSON plan first, rather than outputting code directly?
> 
> 1. **Separation of Intent vs Implementation**: GPT-5.5 excels at creative reasoning (storyboard structure, scene transitions, color choices, copy). Our TypeScript generator excels at exact CSS pixel math and GSAP syntax.
> 2. **Inspectability**: `plan.json` is a clean, machine-readable artifact stored in `outputs/<run-id>/plan.json`. Evaluators can inspect exactly what the model intended.
> 3. **Deterministic Compilation**: Compiling from JSON guarantees zero HTML syntax errors or missing script tags.
> 4. **Targeted Repair**: If a heading overflows, repairing a string length in JSON is 100x safer than asking an LLM to edit a complex HTML/JS file."

---

## 5. Self-Verification & Automated Repair Loop (4:30 – 6:30)

**Speaking Script**:
> "This is the most critical technical innovation in the repository.
> 
> ```
> Generate → Check → FAIL → Classify Issues → Targeted Plan Repair → Regenerate → Check → PASS → Render
> ```
> 
> Let's break down how self-verification works:
> - **Issue Classification**: `src/checker/classifier.ts` normalizes HyperFrames check errors into typed categories: `LAYOUT` (overflow), `CONTRAST` (WCAG AA failure), `MOTION` (timeline collision), `RUNTIME` (JS exceptions), or `LINT`.
> - **Context-Aware Repair Prompt**: `src/repair/prompt.ts` constructs a targeted prompt containing the exact failing scene, element ID, and specific remediation rules.
> - **Drift Protection**: `src/repair/drift.ts` validates that the repaired plan does not drop required scenes or mutate the target aspect ratio.
> - **Bounded Attempts**: The repair loop is strictly bounded (`MAX_REPAIR_ATTEMPTS = 3`). If the loop exhausts attempts without passing, the process fails loudly with exit code 1 and **does NOT render an MP4**.
> - **Render Gate Enforcement**: Video rendering is hard-blocked unless `checkResult.ok === true`."

---

## 6. Key Design Decisions & Rejected Alternatives (6:30 – 8:00)

**Speaking Script**:
> "Let's discuss key design choices and what alternatives were rejected:
> 
> ### Key Design Decisions:
> - **Deterministic Template Compiler**: We built a pure rule-based composition generator (`src/composition/generator.ts`) to achieve 100% syntactically valid code output.
> - **Content-Addressed Asset Cache**: Assets are cached using SHA-256 hashes of their prompt and resolution (`src/image/cache.ts`), saving API calls and enabling fast dry-runs.
> - **Zero-Dependency Static Bundling**: We bundled `ffmpeg-static` and `ffprobe-static` so clean-clone evaluations work out-of-the-box on any machine.
> 
> ### Rejected Alternatives:
> 1. **Direct LLM → HTML/JS Generation**: Rejected because raw LLM code outputs fail layout and timing checks in >40% of runs.
> 2. **LLM Modifying Code Files Directly**: Rejected because LLMs fixing CSS often broke GSAP timing scripts. Modifying the structured `VideoPlan` JSON is far safer.
> 3. **Rendering Without Validation**: Rejected because shipping broken videos violates the core system requirement.
> 4. **Unbounded Retry Loops**: Rejected because infinite loops waste API tokens and hide schema bugs."

---

## 7. Failure Handling Matrix (8:00 – 9:00)

**Speaking Script**:
> "The system handles failures at every layer:
> - **Invalid LLM JSON**: Bounded retry with schema error feedback.
> - **Image API Timeout**: Falls back to deterministic SVG visual placeholders without crashing.
> - **HyperFrames Check Failure**: Triggers targeted self-repair loop up to 3 attempts.
> - **Identical Repair Plan**: Detected by `isIdenticalPlan()` and rejected to prevent endless loop spinning.
> - **Max Repair Exhaustion**: Exits with status code 1, logs attempt history, and halts render.
> - **Secret Protection**: `sanitizeOutput()` strips all `sk-`, `AIza`, and `Bearer` tokens from logs and JSON artifacts."

---

## 8. What Was Cut and Why (9:00 – 10:00)

**Speaking Script**:
> "Given the 48-hour time constraint, I intentionally prioritized **reliability, verification safety, and clean self-repair** over surface area features.
> 
> What was cut:
> 1. **Web Dashboard GUI**: Cut in favor of a robust, fully scriptable CLI pipeline.
> 2. **Arbitrary Cloud Storage Sync**: Cut in favor of structured local artifact folders (`outputs/<run-id>/`).
> 3. **Multiple Export Formats**: Cut alternative video containers in favor of standard H.264 MP4 output.
> 
> **Core Engineering Philosophy**: It is far better to have a 100% verified, reliable CLI pipeline with automated self-repair than a fancy GUI that renders unchecked, broken videos."

---

## 9. Final Evaluation Results & Summary (10:00 – 11:30)

**Speaking Script**:
> "Let's look at our empirical evaluation results across the three required test briefs:
> 1. **Brief 1 (16:9 Widescreen Developer Analytics)**: 12.0s duration, 3 scenes, passing HyperFrames check (`ok: true`, 0 errors), verified MP4 output.
> 2. **Brief 2 (9:16 Vertical Coffee Shop)**: 8.0s duration, mobile stacked layout, warm theme, passing check (`ok: true`), verified MP4 output.
> 3. **Brief 3 (16:9 Text-Heavy Explainer)**: 15.0s duration, 7 scenes showing 5 benefits with progress indicators, passing check (`ok: true`), verified MP4 output.
> 
> In closing:
> *The important part of this project is not merely that an LLM can generate a video. The important part is that the system can independently determine whether its own generated composition is valid, automatically repair it when it is flawed, and refuse to ship when it cannot fix it.*
> 
> Thank you!"

---

## 10. Screen-Recording Order & File Visibility List

To record Video A efficiently, open these files in your IDE tabs in advance and follow this exact navigation sequence:

| Step | Item to Show | File Path / Screen | Focus Points to Highlight |
| :---: | :--- | :--- | :--- |
| **1** | GitHub Repository | Browser: `https://github.com/Ganesh-123-maker/hyperframes-motion-generator` | Clean repo layout, commit history, documentation index |
| **2** | Main README | [`README.md`](../README.md) | Title, What It Does, Key Engineering Idea, Quick Start |
| **3** | System Design Document | [`docs/final-system-design.md`](final-system-design.md) | Title, Problem Statement, Requirements Matrix |
| **4** | Architecture Diagram | [`docs/final-system-design.md`](final-system-design.md#section-3--system-architecture) | Mermaid flowchart showing closed-loop control flow |
| **5** | Source Directory Tree | [`src/`](../src) | Clean modular organization (`planner`, `composition`, `checker`, `repair`, `render`) |
| **6** | GPT-5.5 Planner & Validator | [`src/planner/planner.ts`](../src/planner/planner.ts) & [`validator.ts`](../src/planner/validator.ts) | Structured JSON plan generation & Zod schema validation |
| **7** | Deterministic Generator | [`src/composition/generator.ts`](../src/composition/generator.ts) | Pure TypeScript HTML/GSAP compiler |
| **8** | HyperFrames Checker | [`src/checker/hyperframesChecker.ts`](../src/checker/hyperframesChecker.ts) & [`classifier.ts`](../src/checker/classifier.ts) | Headless browser execution & issue classification |
| **9** | Repair Engine | [`src/repair/orchestrator.ts`](../src/repair/orchestrator.ts) & [`drift.ts`](../src/repair/drift.ts) | Bounded repair loop, issue prompts, drift detection |
| **10**| MP4 Renderer | [`src/render/renderer.ts`](../src/render/renderer.ts) | `npx hyperframes render` invocation & `ffmpeg-static` fallback |
| **11**| MP4 Verifier | [`src/render/renderer.ts`](../src/render/renderer.ts#L90-L130) | File stat checks (`size > 0`), metadata log saving |
| **12**| Evaluation Results | [`docs/evaluation-results.md`](evaluation-results.md) | Summary table of 3 briefs, 100% check pass rate |
| **13**| Output Artifacts & MP4s | `outputs/` directory in file explorer | `plan.json`, `repair-history.json`, `attempts/`, `render.mp4` |
| **14**| Scope Boundaries / What Was Cut | [`docs/final-system-design.md`](final-system-design.md#section-17--scope-boundaries--engineering-tradeoffs) | Prioritization of verification loop over Web UI |
| **15**| Closing Summary | [`docs/video-a-walkthrough.md`](video-a-walkthrough.md#9-final-evaluation-results--summary-1000--1130) | Core engineering philosophy summary |
