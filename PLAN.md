# Plan: the remaining weekend

Status 2026-10-17. Times are placeholders until the organisers' deadline
is confirmed (CONTEXT.md question 7). The first entry is already in;
this one gets the time that is left, so the scope is a convincing
vertical slice, not a product.

## What must exist at the pitch

1. A phone (or a phone-sized browser) running the pipeline on synthetic
   data, offline, with the network tab visible.
2. Three events detected live with evidence shown: move, first car,
   long trip.
3. One full journey (the move) with real open data in it: FMI warnings
   for the new address, DVV window, insurance-overlap card from If's
   public T&Cs, a competitor comparison card.
4. The consent screens and the ledger with one-tap erase.
5. A pitch of about three minutes that answers the four criteria in
   order, with the water-damage numbers and the "nothing leaves" line.

Everything else is a stretch.

## Schedule

| When | What | Who |
|------|------|-----|
| Sat morning | Confirm criteria and deadline with the judges; take the open decisions (stack, model, window) to DECISIONS.md | Artem asks, Aapo records |
| Sat midday | Synthetic phone generator and one persona committed (DATA.md); event prototypes written in fi/en. **Done**, three personas | Aapo |
| Sat afternoon | Pipeline: adapters over the synthetic data, on-device embedding, matcher, ledger; benchmark on planted events. **Done**: see benchmarks/detect/README.md | Aapo (+ agent) |
| Sat afternoon | UI: onboarding toggles, home, notice with evidence, journey, ledger | Vaishnav |
| Sat evening | Move journey filled with FMI, DVV, T&C extracts; comparison card | Artem (content), Aapo (fetch) |
| Sat late | End-to-end run on a phone; fix; record a backup video | All |
| Sun morning | Pitch deck and script; dry run twice; answers to the privacy questions ready | Artem leads, all |
| Sun | Submit; pitch | All |

## Roles

- **Artem**: judges and mentor contact, the human-need and business
  story, journey content, pitch.
- **Aapo**: pipeline, data, decisions log, deployment of whatever server
  exists.
- **Vaishnav**: the app's screens and the demo flow.

## Demo script (3 minutes)

1. (0:00) "Meet Emma. She is moving from Oulu to Turku on 1 November.
   Nobody has told her insurer. Nobody should have to." Open the app:
   empty home screen, network tab open and silent.
2. (0:30) Show the sources screen: mail, calendar, bank on; health off
   and greyed; "everything stays on this phone".
3. (0:50) Tap "check now". The notice appears: "Looks like you are
   moving around 1 November" with the lease mail, the calendar entry and
   the mover payment as evidence. Tap "not this" on one snippet to show
   control. Confirm.
4. (1:20) The move journey: DVV window, electricity, the insurance
   overlap card ("your current policy covers your things in transit for
   N days; new address from 1 Nov"), FMI freeze warning for Turku on the
   move week, the lock-change card, the comparison card with If beside
   two competitors.
5. (2:10) The share. At the end of the journey: "Share this event with
   If". The sheet shows exactly three fields, event, date, municipality,
   and says that is the whole message. Press Share: the footer counter
   goes from 0 requests to 1 request and the sheet shows what If
   received. Then the ledger: what was inferred, what was shared (that
   one line), erase. The If side at localhost:8787 refreshes itself and
   shows the count in large type; keep it in a second window. Before the
   demo: `rm -f data/shared/events.jsonl` so it starts at 0, and start the
   API with `node apps/api/src/server.ts`.
6. (2:30) Business slide: prevention (Finanssiala 2021: 34 800 leaks,
   171 M€, more than fire), retention at
   the moment of change, acquisition because it is useful before you buy,
   efficiency because the data is already structured when you do.
7. (2:50) Close: "The phone looks. The phone asks. If helps. Nothing
   leaves unless you say so."

## Pitch rules

- Emma first. The judges meet a person and a move before they meet a
  model. The words "embedding", "on-device" and "GDPR" are not said
  until the journey has been shown; then they are said once, as the
  reason this can be trusted.
- The value in one sentence, said twice: "Help arrives before the
  event, and you never have to tell anyone your life."
- Numbers only from sources we can name (Finanssiala 2021). What we do
  not know about If (market share, churn at life events) we ask, on
  stage if needed.
- Show the comparison card with If beside competitors. The judges will
  look for the catch; the catch is that there is none.

## Pitch outline against the criteria

| Criterion | Our answer in one line |
|-----------|------------------------|
| Customer value and relevance | Help at the moment a life event can still go right, without having to tell anyone your life |
| Business value for If | Fewer preventable claims, the helper gets the call when people switch, useful to non-customers, cheaper service |
| Feasibility (assumed) | Runs today on a phone with open models and open data; the law is designed in, not bolted on |
| Innovation and experience | The inference is on the device and the user is the only one who sees it; the product is quiet and asks instead of telling |

## Stretch, in order

1. Real calendar on a team member's phone as a second source.
2. First-car journey with Traficom data.
3. Opt-in aggregate counts endpoint and a tiny "moves into Turku by
   month" chart for If.
4. iOS build with Apple's on-device embeddings (ARCHITECTURE.md option B).
