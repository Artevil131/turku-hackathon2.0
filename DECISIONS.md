# Decisions

Every technical, product or legal-design choice the team has made. Code
depends only on choices listed here (AGENTS.md). A reversed decision is
not deleted: add a new entry and mark the old one `superseded by D-NNN`.

| ID | Date | Decision | Why | Decided by |
|----|------|----------|-----|------------|
| D-001 | 2026-10-17 | Second challenge: "If Insurance Could Do More" by If Vahinkovakuutus Oyj (CONTEXT.md), entered beside the AEI entry | Team choice | Aapo |
| D-002 | 2026-10-17 | The product notices life events from signals already on the user's phone, turned into embeddings on the device, with the user's consent per source; raw data, snippets and vectors never leave the phone (ARCHITECTURE.md, PRIVACY.md) | The idea the team started from; on-device is also what makes it lawful and trustworthy | Aapo |
| D-003 | 2026-10-17 | GDPR compliance is a design constraint from the start, not a slide: per-source consent off by default, minimisation in the adapters, evidence shown, no use of any inferred data for pricing, underwriting or claims | The brief's audience will ask; the rule is also the business model (PRIVACY.md) | Aapo |
| D-004 | 2026-10-17 | Working rules carried over from the first entry: DECISIONS.md, AGENTS.md, and its PROTOCOL.md for any experiment | Same team, same weekend | Aapo |
| D-005 | 2026-10-17 | Demo stack: a PWA in TypeScript, React + Vite, embeddings in the browser with Transformers.js (ONNX, WASM/WebGPU); pnpm workspace `apps/*` and `libs/*`, packages `@ahead/<name>` exporting TS source, Node ≥ 22, Biome, Vitest, configs copied from the first entry | Runs on any phone's browser, the model is cached locally and the network tab shows nothing leaving; the team already knows this setup (ARCHITECTURE.md §4 option A) | Aapo |
| D-006 | 2026-10-17 | Two machines, split by directory (WORK.md): machine A owns `libs/synthetic`, `libs/adapters`, `libs/embed`, `libs/detect`, `benchmarks/`, `data/synthetic/`; machine B owns `libs/journeys`, `libs/opendata`, `scripts/`, `apps/web`. The contract `libs/contract` (types and mock data) was written first and changes only in its own small commit announced to the other side | So two agents can build at once without merge conflicts, and the app can be built on mock events before the core exists | Aapo |
| D-007 | 2026-10-17 | Embedding model chosen by a benchmark on the synthetic phones between `Xenova/multilingual-e5-small` and `Xenova/paraphrase-multilingual-MiniLM-L12-v2` (ONNX, quantised); behind the `Embedder` interface so the swap is one line. Provisional pick for development: multilingual-e5-small | Both handle Finnish; which separates the planted events from noise better is a measurement, not a guess | Aapo |
| D-008 | 2026-10-17 | Matching rule (`@ahead/detect`), provisional: each event type has prototype sentences in Finnish and English; a snippet's score for an event is its best cosine similarity to that event's prototypes; an event's score is the exponentially decayed sum of snippet scores above a floor over the window; it fires when the score crosses a threshold and at least two sources contribute. Floor, decay and threshold tuned on the planted events (DATA.md §2); snippets the user rejected and event types the user muted are excluded | Simple, explainable (the evidence is the list of matched snippets), no training on user data; the two-source rule is the defence against a friend's move | Aapo |
| D-009 | 2026-10-17 | Window 60 days; demo events move, first car, long trip; child, pet and renovation have prototypes but no journey this weekend | PLAN.md scope | Aapo |
| D-010 | 2026-10-17 | Mail, bank and places in the demo come from the synthetic phone only; the OAuth and bank-consent screens are shown as mocks; a real calendar may be read on a team member's own device as a stretch | No real mailbox on stage (PRIVACY.md §8); no time for a reviewed OAuth app | Aapo |
| D-011 | 2026-10-17 | Working name Ahead; package scope `@ahead` | Placeholder until someone has a better one | Aapo |
| D-012 | 2026-10-17 | The app Store is IndexedDB through the `idb` wrapper, so erase-all is one transaction | Team choice, the proposal in Open | Operator (machine B) |
| D-013 | 2026-10-17 | UI is Finnish and English from the start with a language toggle; the demo runs in English | Team choice, the proposal in Open | Operator (machine B) |

## Open (to be decided by the team before code depends on them)

| Item | Options | Proposal |
|------|---------|----------|
| Server for the demo | None (journeys bundled, open data fetched at build time into JSON); or a tiny proxy for FMI if its feeds block browser requests | Machine B tests FMI from the browser first; proxy only if forced |
| Model hosting for the demo | The Hugging Face CDN (Transformers.js default); or the model files served from the app's own origin under `apps/web/public/models/` (already git-ignored) with remote loading off | Own origin: the first load downloads ~120 MB once, then the network counter stays at 0 requests, which is the claim the demo makes. With the CDN the first run shows requests to huggingface.co (a model download, no user data), which the counter would honestly count |
| Benchmark metrics | Days from first signal to detection; false notices per 120 days; per-event precision at the chosen threshold | All three, printed as one table |
