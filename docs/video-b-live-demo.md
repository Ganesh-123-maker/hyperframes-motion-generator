# Video B: Live Execution & Self-Repair Demo — Developer Guide

This document serves as the developer's guide for recording **Video B: Live Execution & Autonomous Generation Demo** (Target Duration: 3–6 minutes).

The assignment requirement is:
> *"Type a brief we have not seen, run it live, and show it going all the way to a rendered video. If it breaks, keep recording and debug it on camera."*

The goal is a completely authentic, transparent live demonstration of the system running in real time.

---

## 1. Setup & Pre-Recording Preparation

Ensure the environment is configured and dependencies are installed before starting screen recording:

```bash
# 1. Ensure latest code and dependencies
git pull
npm install

# 2. Verify environment configuration
cp .env.example .env
# Edit .env to set OPENAI_API_KEY and OPENAI_BASE_URL

# 3. Verify test suite passes
npm test
```

---

## 2. What to Show During the Live Recording

Follow this exact sequence while recording your screen and terminal:

1. **Terminal Open**: Start with a clean terminal at the project root (`hyperframes-motion-generator`).
2. **Repository Status**: Run `git status` or show the clean file tree.
3. **Type a New Brief**: Type or paste a fresh brief that has not been used previously in static tests, for example:
   ```bash
   npm run generate -- --brief "Create a 10 second vertical launch announcement for a productivity app. Use a dark modern style, introduce the app, show three animated benefits with simple metric visuals, and finish with a clear call to action."
   ```
4. **Execute Generator**: Press Enter and let the pipeline run autonomously.
5. **Observe Planning (Stage 1)**: Show GPT-5.5 producing and validating the structured `VideoPlan` JSON.
6. **Observe Asset Engine**: Show `gpt-image-2` generating visual assets or retrieving from content cache.
7. **Observe Composition Compiler**: Show deterministic HTML5/GSAP project files being generated.
8. **Observe HyperFrames Check**: Show `npx hyperframes check` executing in headless Chrome quality gate.
9. **Observe Self-Repair (if triggered)**: If check detects layout overflow or contrast issues, highlight how the system automatically extracts findings, reprompts the model, and recompiles.
10. **Observe Rendering**: Show `npx hyperframes render` invoking FFmpeg to bake the MP4 video.
11. **Observe Summary**: Show terminal printing run ID, attempt count, duration, resolution, and output paths.
12. **Open Final MP4**: Open and play the resulting MP4 video in a media player (e.g. VLC, Windows Media Player, QuickTime, or browser).
13. **Inspect Output Directory**: Show `outputs/<run-id>/` containing `plan.json`, `repair-history.json`, `composition/`, and `render/metadata.json`.

---

## 3. What NOT to Do

To maintain complete academic and technical integrity:

- ❌ **Do NOT manually edit composition files** during or before the run.
- ❌ **Do NOT manually edit the MP4 video**.
- ❌ **Do NOT replace the brief with a pre-rendered or fake result**.
- ❌ **Do NOT hide failures or warnings**: If a check fails, explain how the self-repair loop handles it.
- ❌ **Do NOT claim a fake repair**: Show the actual `repair-history.json` and attempt directories.
- ❌ **Do NOT expose your actual API key** on screen. Keep `.env` closed and rely on environment variable loading.
- ❌ **Do NOT edit generated artifacts** to pass tests manually.

---

## 4. Live Demo CLI Reference

```bash
# Recommended Live Demo Brief (10s Vertical Social Launch)
npm run generate -- --brief "Create a 10 second vertical launch announcement for a productivity app. Use a dark modern style, introduce the app, show three animated benefits with simple metric visuals, and finish with a clear call to action."
```

---

## 5. Factual Run Output Checklist

After running the live brief, ensure the following artifacts are verified in `outputs/<run-id>/`:

- [x] `brief.txt` — matches exact input prompt
- [x] `plan.json` — validated `VideoPlan` with 9:16 vertical dimensions (1080x1920)
- [x] `repair-history.json` — recorded attempt breakdown
- [x] `composition/index.html` — verified HyperFrames project DOM
- [x] `render/render.mp4` — non-empty, playable MP4 file (~10s duration)
- [x] `render/metadata.json` — render duration and file size stats
