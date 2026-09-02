# HyperFrames Motion Generator — Documentation Index

Welcome to the documentation for the **HyperFrames Motion Generator**. Below is a directory of all technical documentation and evaluation artifacts.

---

## Technical Specifications & Architecture
- **[Final System Design Document](final-system-design.md)**: Primary technical specification covering problem statement, traceability matrix, system architecture, component breakdown, data flow, key design decisions, rejected alternatives, failure handling, self-verification repair loop, determinism, aspect ratio handling, security, and scope tradeoffs.
- **[Phase 5 Self-Repair Specification](phase-5-repair.md)**: Detailed breakdown of the issue-aware prompt engine, drift prevention, and bounded attempt repair orchestrator (`MAX_REPAIR_ATTEMPTS = 3`).

---

## Evaluation & Results
- **[Evaluation Results](evaluation-results.md)**: Observed results across the 3 required briefs (Widescreen Analytics, Vertical Coffee Shop, Text-Heavy Explainer), determinism test findings, mock repair tests, forced failure tests, and HyperFrames check outputs.
- **[Video A Recording & Speaking Walkthrough](video-a-walkthrough.md)**: Developer speaking guide and screen-recording layout script for Video A presentation.
- **[Submission Checklist](submission-checklist.md)**: Final verification checklist for evaluation and grading.

---

## Phase Records
- **[Phase 0 Reconnaissance](phase-0-reconnaissance.md)**: Architectural analysis of HyperFrames ecosystem and CLI validation capabilities.
- **[Phase 1 Planning Engine](phase-1-planning.md)**: GPT-5.5 planner specification and dual-phase (Zod schema + semantic) plan validator.
- **[Phase 2 Composition Generator](phase-2-composition.md)**: Deterministic HTML5 / GSAP / CSS composition compiler.
- **[Phase 3 Visual Asset Engine](phase-3-image-generation.md)**: `gpt-image-2` integration, base64 PNG decoding, and content-addressed SHA-256 asset caching.
