# HyperFrames Motion Generator

An automated AI-driven motion graphics video generation system that converts plain-language user briefs into verified, high-quality [HyperFrames](https://github.com/heygen-com/hyperframes) video compositions and rendered MP4 files.

📖 **Full System Architecture & Design Document**: See [`docs/final-system-design.md`](docs/final-system-design.md) for full engineering specifications, data flow diagrams, traceability matrix, and technical decisions.

---

## Architecture & System Design Summary

```
User Brief → GPT-5.5 Planner → Schema Validation → gpt-image-2 → Deterministic Generator → HyperFrames Check Gate → (Self-Repair Loop) → MP4 Renderer → Output Verification
```

### Core Engineering Principles
1. **Planning Before Code**: GPT-5.5 converts plain briefs into structured JSON plans (`VideoPlan`), enforcing strict schema bounds before code generation.
2. **Deterministic Composition**: The application deterministically compiles HTML/CSS/GSAP HyperFrames projects from validated plans, avoiding fragile LLM code output.
3. **Official Quality Gate**: `npx hyperframes check` acts as the mandatory gatekeeper evaluating layout overflow, color contrast (WCAG AA), and JS runtime execution.
4. **Issue-Aware Self-Repair**: Normalized quality findings (`LAYOUT`, `CONTRAST`, `MOTION`, `RUNTIME`, `LINT`, `UNKNOWN`) trigger bounded GPT-5.5 plan repairs (`MAX_REPAIR_ATTEMPTS = 3`).
5. **Hard Render Gate**: Final MP4 rendering (`npx hyperframes render`) ONLY executes on compositions that pass verification with 0 errors.

---

## Installation & Setup

```bash
npm install
```

Set environment variables in `.env`:
```env
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://llm.ganeshnayak.in/v1
PLANNING_MODEL=gpt-5.5
IMAGE_MODEL=gpt-image-2
MAX_REPAIR_ATTEMPTS=3
```

---

## Usage

### Run End-to-End Pipeline

```bash
# Brief 1 — Widescreen
npm run generate -- --brief "Create a 12 second widescreen ad for developer analytics"

# Brief 2 — Vertical
npm run generate -- --brief "Create an 8 second vertical social video for a coffee shop"

# Brief 3 — Text Heavy
npm run generate -- --brief "Create a 15 second product explainer showing 5 benefits"

# Options:
#   --out <dir>           Output directory (default: ./outputs)
#   --plan-model <m>      LLM model for planning/repair (default: gpt-5.5)
#   --max-repair <n>      Maximum repair attempts (default: 3)
#   --skip-render         Skip final MP4 rendering stage
#   --strict              Treat warnings as errors
#   --dry-run             Use reference plan without calling LLM API
```

---

## Artifact Structure

Outputs are stored in `outputs/<run-id>/`:

```
outputs/<run-id>/
├── brief.txt                 # Input brief
├── plan.json                  # Validated final VideoPlan JSON
├── repair-history.json        # Machine-readable attempt history
├── composition/               # Final HyperFrames composition project
│   ├── index.html
│   ├── hyperframes.json
│   └── assets/
├── attempts/                  # Preserved attempt history
│   ├── attempt-1/
│   │   ├── plan.json
│   │   ├── check.json
│   │   └── composition/
│   └── attempt-2/
│       ├── plan.json
│       ├── check.json
│       └── composition/
└── render/                    # Output video artifacts
    ├── render.mp4             # Final rendered MP4 video
    ├── render.log             # FFmpeg/HyperFrames render log
    └── metadata.json          # File size and render duration metadata
```

---

## Testing & Quality Assurance

Run the test suite:

```bash
npm test
```

The test suite includes:
- Unit tests for issue classification, prompt generation, drift detection, and plan validation.
- **Deterministic Mock Repair Scenario**: Proves the complete loop (`generate -> fail -> repair -> regenerate -> pass`).
- **Forced-Failure Scenario**: Verifies that when repair fails repeatedly, the process terminates loudly and does NOT output a successful composition.
- **Secret Sanitization**: Ensures no API keys or Bearer tokens are leaked into artifacts or log output.
