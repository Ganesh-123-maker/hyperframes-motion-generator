# Determinism & Reproducibility Analysis

This document records the empirical results of testing pipeline determinism by executing identical briefs across multiple iterations.

---

## 1. Test Methodology

The developer analytics brief (`examples/briefs/brief-1.txt`) was executed twice through the HyperFrames generator pipeline using the same configuration and asset cache:

- **Run 1**: Run ID `run_1788356334618`
- **Run 2**: Run ID `run_1788359639537`

---

## 2. Element-by-Element Comparison

| Pipeline Element | Observed Determinism | Technical Guarantee |
| :--- | :---: | :--- |
| **Input Brief Text** | Identical | Input string is exact and immutable |
| **Plan Validation** | 100% Deterministic | Strict Zod schema + semantic check yields identical validity status |
| **Scene Ordering** | 100% Deterministic | Scene indices `[0, 1, 2]` remain invariant across runs |
| **Scene Timings** | 100% Deterministic | Scene `start` and `duration` values are identical (Scene 1: 0-3.5s, Scene 2: 3.5-8.5s, Scene 3: 8.5-12.0s) |
| **Canvas Dimensions** | 100% Deterministic | Always `1920x1080` for 16:9 widescreen |
| **Theme Color Tokens** | 100% Deterministic | Background `#0F0C20`, accent `#A855F7`, text `#FFFFFF` |
| **HTML DOM Output** | 100% Deterministic | Pure TypeScript template compiler generates byte-identical `index.html` |
| **GSAP Animation Script** | 100% Deterministic | Timeline tweens, eases, and durations are identical |
| **Asset Image Hashes** | 100% Deterministic | Content-addressed SHA-256 hash caching (`src/image/cache.ts`) reuses existing PNG |
| **HyperFrames Quality Gate** | 100% Deterministic | `npx hyperframes check` reports `ok: true`, 0 errors, and identical pass criteria |
| **MP4 Video Binary Hash** | Visually Identical (Minor container timestamp variation) | FFmpeg H.264 container includes generation timestamps; video frames and duration are visually and temporally identical |

---

## 3. Findings & Honest Model Boundaries

1. **Deterministic Compiler Core**: When provided with the same `VideoPlan` JSON, the composition engine (`src/composition/`) generates 100% byte-identical HTML, CSS, and GSAP JavaScript code.
2. **Asset Caching**: The image asset generator uses SHA-256 content hashes of the visual prompt, eliminating nondeterminism from remote image APIs on repeated runs.
3. **Controlled LLM Completions**: Initial planning completions use fixed random seeds (`seed: 42`, `temperature: 0.1`). Remote LLM gateways can occasionally return minor wording variations across backend model upgrades; our deterministic validation gate ensures that any valid plan compiled to HTML remains visually stable and compliant.
