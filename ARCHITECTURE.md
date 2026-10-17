# Architecture: the phone is the boundary

Everything that reads personal data runs on the phone. The server side
holds only public things (open data, If's public T&Cs, the journey
templates) and, if the user opts in, confirmed events. This file describes
the pipeline and what is honestly possible on each platform. Stack choices
are proposals until recorded in DECISIONS.md.

## 1. Signal sources

"Embeddings from multiple apps" is the idea; the platforms do not let an
app read other apps. What they do let an app read, with the user's
permission, is enough:

| Source | iOS | Android | Signal quality for life events |
|--------|-----|---------|-------------------------------|
| Calendar | EventKit, user permission | CalendarContract, runtime permission | High: "muutto", "katsastus", "flight to…", exchange term |
| Mail | No system API. User connects an account: Gmail API / Microsoft Graph with OAuth, or IMAP; read on device | Same | Highest: leases, booking confirmations, Traficom, DVV, dealers |
| Photos metadata | PhotoKit: dates, places, no pixels needed | MediaStore | Medium: a burst of photos at a flat viewing, at a car dealer |
| Location | Significant-change location, visited places | Fused location | Medium: repeated visits to a new town, a dealership |
| Bank | PSD2 account information via an aggregator (Enable Banking is Finnish and covers OP, Nordea, Danske, S-Pankki…); user consents per bank, 90-day renewal | Same | High: deposit payment, mover, car dealer, vet |
| Notifications of other apps | Not possible | NotificationListenerService; restricted Play permission, special settings screen; use only if core to the app and declared | High but policy-risky; optional, off by default |
| Share sheet | User shares a listing, a PDF, a page into the app | Same | High and explicit |
| Health | HealthKit; Art. 9 data, not used | Health Connect; not used | Out of scope |
| Screen contents / accessibility | Not possible | Possible, but Play forbids using accessibility for data collection | Never |

Everything above is read by the app itself, on the device, after a
permission the user can revoke in the OS. Mail and bank are the two that
make the concept work and the two whose consent screens must be clearest.

## 2. Pipeline on the device

    source adapters ─▶ snippets ─▶ on-device embedding ─▶ event matcher ─▶ local ledger ─▶ notice ─▶ journey
         │                 │                                                     │
         │                 └─ text only: subject + first lines, calendar title,  └─ nothing leaves unless
         │                    merchant name, place name; never attachments,         the user confirms and
         │                    never bodies beyond a cap                            chooses to share
         └─ each adapter off by default, revocable

1. **Adapters** pull recent items (default window 60 days) and reduce each
   to a short text snippet plus a date and a source tag. A merchant name,
   a calendar title, a mail subject with its first 300 characters, a
   place name. Minimisation happens here, before anything is embedded.
2. **Embedding** runs on the phone. Options, with trade-offs, in section
   4. The vectors are stored locally and can be deleted with the app.
3. **Event matcher.** Each life event is described by a handful of
   prototype sentences in Finnish, Swedish and English ("I signed a lease
   for a new apartment", "vuokrasopimus uuteen asuntoon", "booked movers
   for Saturday"). Prototype embeddings are computed once. A snippet's
   similarity to each event's prototypes is scored; an event's score is the
   decayed sum over its snippets in the window, and it fires when the
   score crosses a threshold and at least two independent sources agree.
   No cloud model, no training on user data. The thresholds are tuned on
   synthetic phones (DATA.md), not on anybody's real data.
4. **Local ledger.** Every fired event with its evidence snippets, the
   user's answer (confirmed, not this, never), and the share status.
5. **Notice.** Asks; shows evidence; one tap to dismiss or to say "never
   for this event type".
6. **Journey.** Built from templates per event, filled with open data for
   the event's place and dates (DATA.md): FMI warnings for the new
   address, DVV notification window, inspection deadlines by first
   registration date, If's public T&C extracts.

What can leave the phone, each only on the user's explicit choice:
a confirmed event with its type and date (to prefill a quote or a claim),
and a one-bit anonymous count ("one more move into 20500") for aggregate
statistics. Never a snippet, never a vector.

## 3. Server side (small)

- Journey templates and T&C extracts (static JSON, versioned in git).
- Open-data proxies: FMI warnings by municipality, a DVV calendar rule,
  Traficom inspection rule. Cached, no user identity in requests beyond a
  postcode.
- The opt-in endpoint for confirmed events and aggregate counts, built
  as `apps/api` (D-016): three fields and nothing else; the app shows
  them before and after sending, and the counter on screen goes from 0
  to 1. Templates and open data are bundled with the app, not served.
- Nothing else. The server cannot infer anything about a user who has not
  shared.

## 4. On-device embedding: options for the demo

| Option | What | Finnish? | Effort this weekend | Fit |
|--------|------|----------|---------------------|-----|
| A. Browser, Transformers.js (ONNX, WASM/WebGPU) with `multilingual-e5-small` or `paraphrase-multilingual-MiniLM-L12-v2` | A PWA that runs on the phone's browser; the model downloads once and runs locally; DevTools network tab proves nothing is sent | Yes (both multilingual) | Low: React + Vite as in the first entry | Best for a live demo on any phone and for showing "nothing leaves" |
| B. iOS, Apple `NLContextualEmbedding` (Natural Language framework) | Built-in BERT-class model, 512-d token vectors, mean-pool to a sentence vector; Apple's own on-device model, no download | Finnish support to verify on device | Medium: Swift or Expo native module | Strongest "this is how it would ship" story; demo only on one phone |
| C. Android, LiteRT with a quantised sentence model | Native on-device inference | Yes | Medium-high | Needed later for notification access; not this weekend |
| D. Apple Foundation Models / Gemini Nano for wording | Generative, not embedding; could phrase the notice | Limited | Low to add, high to debug | Not needed; templates are safer (D-019 lesson from entry one) |

Proposal: A for the demo, with the adapter and matcher code written as a
library so B and C are ports, not rewrites. The team decides
(DECISIONS.md).

## 5. Demo build

Because we cannot read anyone's real mail on stage, the demo phone is
seeded with a **synthetic life**: a generated mailbox, calendar, bank
transactions and places for a student moving from Oulu to Turku in
November, looking at a used car, and leaving for an exchange term in
January (DATA.md). The pipeline runs for real on that data, on the phone,
in front of the judges, with the network tab open. The model is served
by the app itself (`libs/embed/scripts/fetch-model.ts`,
`useLocalModels`), so the demo needs no internet at all; headless Chrome
loads it in under two seconds from local files and embeds the demo
window's 250 snippets in about eight seconds on a laptop CPU. A team
member's own calendar can be read from an exported .ics file
(`IcsAdapter`) without any account or OAuth.

## 6. Open technical items

Listed in DECISIONS.md under "Open". The main ones: stack (A vs B),
embedding model, similarity threshold and decay, the window length, the
mail connector (Gmail API in the demo or synthetic only), and whether the
server exists at all for the demo or the journeys are bundled.
