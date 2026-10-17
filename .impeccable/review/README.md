# Redesign evidence — 2026-10-17

Direction: assigned grounded candidate 5, Finnish swimming-hall wayfinding translated into a standard Operate UI. Deep petrol shell, pool-tinted ground, yellow selection; no physical-sign costume. The contract is in `apps/web/.impeccable/surfaces/apps-web-src-app-tsx.md`.

## Captures

All phone captures are 390×844. `desktop.png` is 1440×1000. `mobile.png` is the Home capture. Screens were opened and inspected after capture.

- `onboarding.png`: all sources initially off.
- `home.png`: the existing mock engine's move notice, after Check now.
- `notice.png`: unchanged detector wording, all response options above inspectable evidence.
- `journey.png`: move journey with actionable Posti/DVV service link.
- `settings.png`, `settings-dark.png`, `settings-fi.png`: language and three theme choices.

Preview command:

```sh
pnpm --filter @ahead/web exec vite preview --port 4181
```

The initial capture used the requested CLI path:

```sh
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
  --user-data-dir=/tmp/ahead-redesign-cli-1017 \
  --screenshot="$PWD/.impeccable/review/onboarding.png" \
  --window-size=390,844 --timeout=5000 \
  'http://localhost:4181/?today=2026-10-17'
```

The final set uses the same headless Chrome through its DevTools protocol, with explicit viewport emulation, to click the real app's buttons. The existing app has no URL-addressable notice/journey/settings screens; a bare CLI URL capture cannot navigate to those states. No production debug routes or seeded UI-only state were added.

## Checks

- `pnpm typecheck`: pass, all workspace packages.
- `pnpm check`: pass, 99 files.
- `pnpm --filter @ahead/web build`: pass; existing large model chunk warning remains.
- Targeted Vitest: four files, 21 tests pass (screens, app detection/store, journeys).
- Requested Impeccable detector ran once: `detect.json` is `[]`.
- Browser: all six switches, Mail/Bank Allow, Bank Cancel, Continue, Check now, evidence rejection, confirmation, journey links, language choices, theme choices, live system light/dark following, stored light preference on reload, zero outbound count and no desktop horizontal overflow passed.
- One initial browser-driver attempt failed because it looked for the word “Confirm”; the detector correctly labels that button “Yes, help me”. The driver was corrected, not the product wording.
- Initial new screen tests importing Home/Notice failed because root Vitest lacks the app Vite alias for `@ahead/detect/describe`. Those unsupported tests were removed; the committed tests exercise Journey, Sources and Settings without changing shared aliases or detector packaging.

## Limits

Worker instructions prohibit full test sweeps and further subagents. Therefore `pnpm test` was not run; the caller must run it. Finish review and documentation were disclosed build-thread substitutes, not an independent reviewer approval. The full `?engine=core&today=2026-10-17` inference was not run on the laptop; captures use the existing mock engine. Core/store/detection code was not redesigned. No raster ships in the product; these PNGs are screenshots, not generated assets.
