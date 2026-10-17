# Work split: two machines, one repository

Two people's Claude Code sessions build at the same time. Machine A is
Aapo's laptop; machine B is the second PC. Each owns directories; neither
touches the other's. The shared contract is `libs/contract` (D-006).

Before starting on either machine: read README.md, CONCEPT.md,
ARCHITECTURE.md, PRIVACY.md, DECISIONS.md and AGENTS.md. Then this file.

## Ground rules for both

- Own directories only. If you need something in the other side's
  directories, write what you need in this file under "Requests" and
  commit; do not do it yourself.
- `libs/contract` changes only when a type is missing. Make the change
  its own commit, `contract: <what>`, and note it under "Contract
  changes" below. Keep the mock data compiling.
- Commit small and often, `<area>: <what>`. Before every push:
  `git pull --rebase origin main`. Never force-push. Push only with the
  operator's approval (that machine's own rules apply).
- `pnpm typecheck && pnpm check && pnpm test` green before a push.
- Nothing personal, no real accounts, no secrets. Synthetic data only
  (PRIVACY.md §8).
- A technical choice not in DECISIONS.md: write the options under
  "Open" there and ask the operator; do not pick quietly (AGENTS.md).

## Machine A (Aapo's laptop): the core

Owns `libs/synthetic`, `libs/adapters`, `libs/embed`, `libs/detect`,
`benchmarks/`, `data/synthetic/`.

1. `libs/synthetic`: generator for the three personas (DATA.md §2),
   deterministic by seed, output committed to `data/synthetic/<persona>.json`
   as `Snippet[]` plus a `truth.json` of planted events with dates.
2. `libs/adapters`: `Adapter` implementations that read the synthetic
   files per source, applying the minimisation rules (cap, window).
3. `libs/embed`: `Embedder` over Transformers.js with the two candidate
   models (D-007); runs in Node for the benchmark and in the browser for
   the app.
4. `libs/detect`: prototypes per event type (fi/en), the matching rule
   (D-008), date and place extraction from evidence.
5. `benchmarks/detect`: runs the detector over every persona, prints
   detection delay, false notices and precision per model and threshold.

Done when: the move, first car and long trip are detected on the student
persona before their dates, with at most one false notice, and the
benchmark table is in `benchmarks/detect/README.md`.

## Machine B (second PC): open data, journeys, the app

Owns `libs/opendata`, `libs/journeys`, `scripts/`, `apps/web`.

Start order matters: the app on mock data first, so there is something on
a phone by Saturday evening regardless of the core.

1. `apps/web`: React + Vite PWA, package `@ahead/web`, mobile-first,
   Finnish and English strings from the start. Screens, each driven by
   the contract types and fed from `@ahead/contract/mock` until the core
   lands (CONCEPT.md "What the user sees"):
   - Onboarding: one toggle per `Source`, all off, one line each on what
     is read and that it stays on the phone. Mail and bank open a mocked
     OAuth / bank-consent sheet (D-010).
   - Home: empty state "Nothing coming up. Last checked today." and a
     "Check now" button.
   - Notice: a `DetectedEvent` as a question, its evidence snippets with
     a "not this" button each, and Confirm / Not now / Never for this.
   - Journey: `Journey.items` by kind (todo, warning, insurance, compare,
     info) with due dates and the source link on every card.
   - Ledger: every event, status, "shared: no", one-tap erase.
   - A `Store` over IndexedDB (see DECISIONS.md open items for the
     wrapper question).
   - A visible "data leaving this phone: 0 requests" counter is worth
     more than any slide; count fetches in a service worker or a fetch
     wrapper and show it.
2. `libs/opendata`: small fetchers with cached JSON results committed
   under `libs/opendata/data/` so the demo is offline-safe:
   - FMI warnings for a municipality (CAP Atom feed; find the endpoint,
     check it from a browser for CORS; proxy only if forced, see Open).
   - DVV move-notification window as a pure function of the move date.
   - Traficom inspection due-date rule from first registration date.
3. `libs/journeys`: a `JourneyBuilder` per demo event, starting with
   the move; items from templates filled with opendata and with If's
   public terms. Extract the relevant clauses from If's home, car and
   travel T&Cs and IPIDs (if.fi) into `libs/journeys/terms/*.md` with the
   source URL and clause number on each; the comparison card uses two
   competitors' public terms the same way.
4. `scripts/`: the fetch scripts behind the cached JSON.

Done when: the move journey renders on a phone from mock data with real
FMI, DVV and T&C content, and the first-car and long-trip journeys exist
at least as templates.

## Integration (Saturday evening, both)

Machine A publishes `@ahead/embed` and `@ahead/detect`; machine B swaps
the mock event for `detector.detect(adapterSnippets, today)` behind
"Check now", with the model loaded once and cached. Then the end-to-end
run on a phone, offline, network tab open.

## Running on a phone (machine B)

The service worker, and with it offline use, needs a secure origin. On a
phone that means `localhost` or HTTPS with a certificate the phone trusts.
A self-signed certificate gives HTTPS but Chrome will not register a
service worker on it. The cache belongs to one exact origin (scheme, host,
port): open the app at the same address on stage as when it was primed.
None of the paths below has been tried on a real phone yet; the laptop
side is checked by `node scripts/offline-check.ts` (headless Chrome).

Once, on the laptop:

    pnpm install
    node libs/synthetic/src/cli.ts        # until the phones are committed
    pnpm --filter @ahead/web assets       # model (130 MB) and ONNX runtime into public/

**Path 1, recommended: Android over USB.** No certificate, no Wi-Fi.
1. Phone: Settings → About phone → tap "Build number" seven times, then
   Developer options → USB debugging on.
2. Laptop: `pnpm --filter @ahead/web serve` (production build on
   http://localhost:4173).
3. Cable in. Laptop Chrome → `chrome://inspect/#devices` → Discover USB
   devices (accept the prompt on the phone) → Port forwarding: `4173` →
   `localhost:4173`, Enable port forwarding.
4. Phone Chrome: `http://localhost:4173/?engine=core`. `localhost` counts as
   secure, so the service worker registers. Turn the sources on and press
   Check now once: the model comes over the cable and everything is cached.
   Add to home screen if you like (it opens `/?engine=core`).
5. Unplug, airplane mode, open the same address: it runs from the cache
   with the counter at 0.

**Path 2: iPhone, or no cable.** A certificate the phone trusts, made with mkcert.
1. Laptop, by the operator (it adds a root certificate to this machine's
   trust store): `winget install FiloSottile.mkcert`, then `mkcert -install`.
2. One network on which the phone can reach the laptop. Venue Wi-Fi often
   keeps clients apart; the phone's own hotspot with the laptop joined to it
   avoids that. Note the laptop's address (`ipconfig`).
3. `mkcert -cert-file apps/web/certs/cert.pem -key-file apps/web/certs/key.pem <laptop-ip> localhost`
   (`apps/web/certs/` is git-ignored; phone mode uses it when both files exist).
4. Put `rootCA.pem` from `mkcert -CAROOT` on the phone. Never `rootCA-key.pem`.
   iPhone: open it, Settings → Profile Downloaded → Install, then General →
   About → Certificate Trust Settings → full trust. Android: Settings →
   Security → Encryption & credentials → Install a certificate → CA
   certificate (names vary by maker; whether Chrome then trusts it must be
   checked on the device).
5. `pnpm --filter @ahead/web phone` and open `https://<laptop-ip>:4443/?engine=core`
   on the phone: no warning means it worked. Prime it with one Check now.
   A different laptop address is a different origin: new certificate, and
   the model downloads again.

**Path 3: quick Android test over Wi-Fi (unverified).** Chrome on the phone →
`chrome://flags/#unsafely-treat-insecure-origin-as-secure` → add
`http://<laptop-ip>:4173` → Relaunch; on the laptop
`pnpm --filter @ahead/web serve --host`. Chromium documents the flag for
service workers; whether the Android build honours it is not confirmed.

## Requests

(Write here what you need from the other side: "B needs
`DetectedEvent.place` to be a municipality name" and so on.)

- A → B (2026-10-17): the core is in `@ahead/adapters`, `@ahead/embed`
  and `@ahead/detect`. Use it as
  `new PrototypeDetector(embedder("e5", onProgress)).detect(snippets, today)`
  with snippets from `readEnabled(syntheticAdapters(phone.snippets), enabled, windowEnding(today))`
  where `phone` is `data/synthetic/student.json`. Two things the app must
  do: (1) show a progress bar on first use, the model is ~120 MB and the
  first embedding of ~400 snippets takes seconds in WASM; the
  `onProgress` callback reports the download; (2) keep one detector
  instance alive, its vector cache is in memory, so "Check now" after the
  first run is instant. Persisting vectors across reloads is a stretch;
  if you do it, store them in the `Store` keyed by snippet id and call
  `clearCache()` on erase.
- A → B (2026-10-17, later): the model is `e5` (D-012) and the detector
  defaults are final. On the student phone with today = 2026-10-17 the
  detector returns move (1 Nov, Turku), first_car (18 Oct) and long_trip
  (10 Jan 2027, Lisbon); `node benchmarks/detect/today.ts` prints exactly
  what the notice screen gets. Calendar snippets carry `meta.created`;
  `readEnabled` already hides entries not yet created.
- A → B (2026-10-17, browser numbers): the embedder runs in a browser.
  Headless Chrome on WASM, laptop CPU: model load 41 s from the Hub
  (130 MB), 250 snippets embedded in 7.5 s (30 ms each), a later batch
  of 20 in 0.25 s. A phone will be slower, so: progress bar on the first
  run, one detector instance kept alive, and **serve the model from the
  app, not from huggingface.co**: run
  `node libs/embed/scripts/fetch-model.ts --out apps/web/public/models`
  (130 MB, git-ignored) and call `useLocalModels("/models/")` from
  `@ahead/embed` before the first embed. `libs/embed/browser-smoke` is a
  working Vite page that does exactly this; copy from it.
- A → B (2026-10-17, real calendar): `IcsAdapter` in `@ahead/adapters`
  takes the text of an exported .ics file (Google Calendar → Settings →
  Export; Apple Calendar → File → Export) and is a drop-in for the
  synthetic calendar adapter. A file picker or the share sheet is all the
  UI it needs. Only SUMMARY, LOCATION, DTSTART and CREATED are read. This
  is PLAN.md stretch 1; wire it only after the mock flow works.
- A → B (2026-10-17, for the notice and the store): `describe(event,
  locale, today)` in `@ahead/detect` gives the notice title, the "why"
  line, the question and the four answer labels in fi/en from templates,
  so the app never words an event itself. `detector.snapshot()` returns
  the embedded vectors as one Float32Array plus ids for IndexedDB;
  `detector.restore(snapshot)` loads them back (ignored if the model
  changed); erase-all must drop the stored snapshot and call `clearCache()`.

- A → B (2026-10-17, from the brief): "connect useful services
  together" is a judging phrase. Journey items of kind `todo` that
  correspond to a service must carry `sourceUrl` pointing at the service
  itself (DVV muuttoilmoitus, Posti, an electricity contract page, the
  mover, Traficom inspection booking), and the card must open it. The
  brief also names "publicly available insurance terms and conditions
  from If and other insurance companies" as a resource: the T&C extracts
  and the comparison card are not optional polish, they are what the
  judges were told to expect.

- B → A (2026-10-17): the app now calls the core through one seam,
  `apps/web/src/engine.ts`. It runs on a mock by default and on your code
  with `?engine=core` (`syntheticAdapters` over `data/synthetic/student.json`,
  `new PrototypeDetector(embedder("e5", onProgress))`, one instance kept for
  the session, `readEnabled` over `windowEnding(today)`). `?today=YYYY-MM-DD`
  pins the date, since the phone is dated. Three things from B:
  1. **The synthetic phones are not in the repository.** `.gitignore` ignores
     `data/`, and git cannot re-include a child (`!data/synthetic/`) of an ignored
     directory, so `data/synthetic/*.json` never reached the remote. Suggested
     fix, in your area: replace `data/` with `data/*` and keep
     `!data/synthetic/`, then commit the three phones. Until then a fresh clone
     needs `node libs/synthetic/src/cli.ts`; the app builds either way
     (`import.meta.glob`) and `?engine=core` says so if the file is missing.
  2. `onProgress`: the app shows `p.progress` (0..100) as a bar. Transformers.js
     reports per file, so with several files the bar may restart; tell us if
     `@ahead/embed` can report one overall figure.
  3. B ran `?engine=core` in a browser on 2026-10-17 (student phone,
     `?today=2026-10-17`, all five sources on). It works: first car, long trip
     and move are all detected, a second "Check now" takes ~0.3 s and adds no
     duplicates (ids are stable, good). What B saw:
     - First run: ~120 MB from huggingface.co (7 fetches counted), plus the
       ONNX WASM runtime (5.4 MB) from `cdn.jsdelivr.net`. A second host, and not
       a model: `@ahead/embed` could point `env.backends.onnx.wasm.wasmPaths` at
       files we serve ourselves. B will do it in the app if you prefer.
     - After a reload the model came from the browser cache with 0 counted
       requests, but the first embedding of the ~400 snippets took ~25 s here
       (WASM). Persisting vectors (your note) would remove it from every start.
     - `DetectedEvent.score` is an unbounded sum (7.9, 12.8, 13.8), not 0..1.
       The contract comment says "for display as confidence"; B no longer shows
       it as a percentage and states the evidence count and sources instead.
       Say so if you would rather expose a 0..1 confidence.
     - Against `truth`: move estimated 2026-10-31 (truth 2026-11-01; the van
       booking says "la 31.10.", the lease starts 1.11.), long trip place
       "Helsinki" (truth Lisbon), first_car `firstSignal` 2026-09-05 (truth
       2026-10-02). Yours to judge, B only reports them.
     - The counter counts `fetch()` calls to other origins only; a script or
       module import from another origin would not show. B will say so when it
       talks about the counter.

- B → A (2026-10-17, service links): done for the services that exist.
  Todo cards now open the service and say "Open: …": change of address →
  posti.fi/muuttaminen/muuttoilmoitus (one notice to both DVV and Posti),
  electricity → sahkonhinta.fi (the Energy Authority's comparison; the contract
  is made with the seller), first-car inspection → Traficom's free vehicle
  lookup (inspection details by registration number). Two gaps, on purpose:
  Traficom has no inspection booking (private stations do it), and there is
  no neutral mover service to link. A mover card needs a partner, which
  CONCEPT.md lists as If's business, so it is the team's call. Other cards
  still link to where their facts come from ("Source: …").

- B → A (2026-10-17, describe and snapshot): both in the app. Notice, home
  and ledger word events only through `describe()`; the detector's snapshot is
  saved in IndexedDB after every check, restored when the engine starts and
  erased with everything else (plus `clearCache()`). Headless Chrome, offline
  after a reload: the check went from 13.9 s to 7.4 s; what is left is the
  model start and the prototypes. One request: importing `describe` from
  `@ahead/detect` pulls Transformers.js into the app's first bundle (862 kB
  instead of 266 kB), because the index also exports the detector. Could
  `libs/detect/package.json` export `"./describe": "./src/describe.ts"`? The app
  aliases that path in its own Vite and TS config until then.

## Contract changes

- 2026-10-17: initial contract and mock data (machine A).
- 2026-10-17: `JourneyItem.sourceIsService?: boolean` (machine B): marks a link that opens the service doing the task, so a todo card can say "Open" for posti.fi but "Source" for a T&C clause. Optional; nothing else changes.
