# Video Recording Checklist

This checklist tracks the preparation and recording items for Video A (System Architecture Walkthrough) and Video B (Live Demonstration).

---

## Video A: System Design & Architecture Walkthrough (5–8 mins)

Guide reference: [`docs/video-a-walkthrough.md`](../docs/video-a-walkthrough.md)

- [ ] Screen recording started
- [ ] Planning document shown (`docs/final-system-design.md`)
- [ ] Architecture shown
- [ ] Data flow explained
- [ ] Key decisions explained
- [ ] Rejected alternatives explained
- [ ] What was cut explained
- [ ] Recording saved
- [ ] Recording playable

---

## Video B: Live Execution & Autonomous Verification (5–10 mins)

Guide reference: [`docs/video-b-live-demo.md`](../docs/video-b-live-demo.md)

- [ ] Terminal shown
- [ ] NEW brief typed manually
- [ ] No prerecorded result used
- [ ] Generator executed (`npm run generate -- --brief "..."`)
- [ ] Planning shown (Zod schema validation & `plan.json` generation)
- [ ] Composition shown (Deterministic HyperFrames compilation)
- [ ] HyperFrames check shown (`npx hyperframes check . --json` passing)
- [ ] Repair shown if triggered (Issue extraction, GPT-5.5 repair prompt, drift check)
- [ ] Rendering shown (`npx hyperframes render` progress)
- [ ] MP4 shown (Playback of generated video in media player)
- [ ] Final verification shown (`metadata.json`, `render.log`, non-zero byte check)
- [ ] Recording saved
- [ ] Recording playable

---

### Status Note
All preparation documents, scripts, and benchmark outputs are complete and verified. The developer will record the actual screen videos following these exact items before sending the final submission email.
