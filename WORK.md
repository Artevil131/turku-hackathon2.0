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

## Contract changes

- 2026-10-17: initial contract and mock data (machine A).
