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

## Open (to be decided by the team before code depends on them)

| Item | Options | Proposal |
|------|---------|----------|
| Demo stack | A: PWA, React + Vite + Transformers.js; B: iOS native with NLContextualEmbedding; C: Android LiteRT | A for the weekend, library code portable to B/C (ARCHITECTURE.md §4) |
| Embedding model | `multilingual-e5-small` (384-d, Finnish ok, ~120 MB), `paraphrase-multilingual-MiniLM-L12-v2` (384-d, smaller), Apple built-in on iOS | e5-small for Finnish quality; measure on the synthetic phones |
| Matching rule | Nearest prototype with threshold; decayed sum over window; require two sources | Decayed sum, two sources; tune on planted events |
| Window length | 30 / 60 / 90 days | 60 |
| Demo events | Move, first car, long trip (+ child, pet, renovation) | The three |
| Mail connector for the demo | Synthetic only; Gmail API read-only on a test account | Synthetic only; show the OAuth screen as a mock |
| Server for the demo | None (journeys bundled, open data fetched at build); or a tiny proxy for FMI | Tiny proxy only if FMI CORS forces it |
| Working name | Ahead; If Ahead; others | Ahead |
| Monorepo | New repo (this one) vs a package inside `~/turku-hackathon` | This repo, same layout rules |
