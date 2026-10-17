# Backup demo video

From the repository root, with dependencies already available:

```sh
pnpm --filter @ahead/web assets && pnpm --filter @ahead/web build && node tools/demo-video/record.ts
```

Requires Node 22 with TypeScript type stripping (22.18+), `pnpm`, `google-chrome`, and `ffmpeg` on PATH. Set `CHROME=/path/to/chrome` to override the browser. `pnpm demo-video` is an alias for the recording step, not the assets/build steps. The recorder never builds the app.

It serves the existing `apps/web/dist` using Vite preview on port **4195** (which must be free), opens a fresh synthetic demo at `/?engine=core&today=2026-10-17`, and records the PLAN.md flow in a 390×844 mobile viewport at device scale 2. It enables all seven demo sources, checks for events with the real core (up to 120 seconds), rejects one evidence item, confirms, slowly scrolls the journey, and visits the horizon, This month, Ledger, Sources and Settings. Copy differences are logged and skipped. An absent event after 120 seconds is a failure, not a successful empty demo. Start the demo API (`pnpm --filter @ahead/api start`) to include successful sharing.

Outputs (git-ignored):

- `tools/demo-video/out/demo.mp4`: 780×1688 H.264, yuv420p, **8 fps**, silent. Screenshots are sampled every 250 ms and each is held for two output frames, preserving the nominal 4 fps capture timing.
- `tools/demo-video/out/frames/NN-<step>.png`: labelled key frames for each demonstrated step.

A repeat run replaces the video and generated key frames. Intermediate screenshots and the temporary Chrome profile are removed on completion; Chrome and Vite are stopped even on failure. Allow several minutes for the real model check and recording. Watch the resulting video before taking it on stage: missing optional controls are intentionally non-fatal and are printed in the log.

For the separate 25 fps close-up of sharing, run the production preview on port 4173 and the demo API on 8787, then `node scripts/share-motion.ts`. It records the move's three-field payload and checks the successful receipt and one-request counter before writing `tools/demo-video/out/share-motion.mp4`. It uses the real core on synthetic data and cleans up its own Chrome and temporary frames.
