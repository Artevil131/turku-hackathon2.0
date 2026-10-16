# Detection benchmark

Measures the prototype detector (`@ahead/detect`, D-008) on the synthetic
phones (`data/synthetic`, DATA.md §2). Each phone is replayed day by day
from 30 days after its start to its end; on every day the detector sees
the 60-day window (plus calendar entries already created) and may fire.
Per planted event the table shows the lead time in days between first
detection and the event; after the slash, the number of false episodes:
an event type starting to fire that is not in the phone's truth, or fires
before the truth's first signal (a trap). The control phone has no
events, so every episode there is false.

    pnpm --filter @ahead/benchmarks detect            # the grid, both models
    node benchmarks/detect/episodes.ts --model e5     # each episode with its evidence
    node benchmarks/detect/inspect.ts --model e5      # per-snippet margins
    node benchmarks/detect/today.ts                   # what the app would show on the demo day

Embedding is done once per phone and model and shared across settings;
a full run is about 25 s per model on a laptop CPU after the model is
cached.

## Result, 2026-10-17 (run 3, after the routine rule and calendar creation dates)

Chosen: **multilingual-e5-small, floor 0.75, threshold 2.5, half-life
30 days, two sources, routine above 2 repeats** (D-012). Every planted
event on every phone, no false episode, lead times 7 to 89 days.

### e5
| floor | thr | control: detected (lead d) / false | family: detected (lead d) / false | student: detected (lead d) / false |
|---|---|---|---|---|
| 0.6 | 2 | – / 0 | renovation +10, pet +46 / 0 | move +23, first_car +7, long_trip +89 / 1 (move) |
| 0.6 | 2.5 | – / 0 | renovation +10, pet +46 / 0 | move +23, first_car +7, long_trip +89 / 0 |
| 0.6 | 3 | – / 0 | renovation +10, pet +46 / 0 | move +23, first_car +7, long_trip +89 / 0 |
| 0.6 | 4 | – / 0 | renovation +10, pet +46 / 0 | move +20, first_car +7, long_trip +89 / 0 |
| 0.75 | 2 | – / 0 | renovation +10, pet +46 / 0 | move +23, first_car +7, long_trip +89 / 1 (move) |
| 0.75 | 2.5 | – / 0 | renovation +10, pet +46 / 0 | move +23, first_car +7, long_trip +89 / 0 |
| 0.75 | 3 | – / 0 | renovation +10, pet +46 / 0 | move +23, first_car +7, long_trip +89 / 0 |
| 0.75 | 4 | – / 0 | renovation +10, pet +46 / 0 | move +20, first_car +7, long_trip +89 / 0 |
| 0.9 | 2 | – / 0 | renovation +10, pet +46 / 0 | move +23, first_car +7, long_trip +89 / 1 (move) |
| 0.9 | 2.5 | – / 0 | renovation +10, pet +46 / 0 | move +23, first_car +7, long_trip +89 / 0 |
| 0.9 | 3 | – / 0 | renovation +10, pet +46 / 0 | move +23, first_car +7, long_trip +89 / 0 |
| 0.9 | 4 | – / 0 | renovation +10, pet +46 / 0 | move +20, first_car +7, long_trip +89 / 0 |
### minilm
| floor | thr | control: detected (lead d) / false | family: detected (lead d) / false | student: detected (lead d) / false |
|---|---|---|---|---|
| 0.6 | 2 | – / 0 | renovation MISS, pet MISS / 0 | move +23, first_car +7, long_trip +89 / 0 |
| 0.6 | 2.5 | – / 0 | renovation MISS, pet MISS / 0 | move +17, first_car +7, long_trip +89 / 0 |
| 0.6 | 3 | – / 0 | renovation MISS, pet MISS / 0 | move MISS, first_car +7, long_trip +89 / 0 |
| 0.6 | 4 | – / 0 | renovation MISS, pet MISS / 0 | move MISS, first_car +7, long_trip +89 / 0 |
| 0.75 | 2 | – / 0 | renovation MISS, pet MISS / 0 | move +17, first_car +7, long_trip +89 / 0 |
| 0.75 | 2.5 | – / 0 | renovation MISS, pet MISS / 0 | move MISS, first_car +7, long_trip +89 / 0 |
| 0.75 | 3 | – / 0 | renovation MISS, pet MISS / 0 | move MISS, first_car +7, long_trip +89 / 0 |
| 0.75 | 4 | – / 0 | renovation MISS, pet MISS / 0 | move MISS, first_car +7, long_trip +87 / 0 |
| 0.9 | 2 | – / 0 | renovation MISS, pet MISS / 0 | move +17, first_car +7, long_trip +89 / 0 |
| 0.9 | 2.5 | – / 0 | renovation MISS, pet MISS / 0 | move MISS, first_car +7, long_trip +89 / 0 |
| 0.9 | 3 | – / 0 | renovation MISS, pet MISS / 0 | move MISS, first_car +7, long_trip +89 / 0 |
| 0.9 | 4 | – / 0 | renovation MISS, pet MISS / 0 | move MISS, first_car +7, long_trip MISS / 0 |

MiniLM raises no false episode either but never sees the family's
renovation or pet: it does not read the Finnish compound words
("kylpyhuoneremontti", "koiranpentu") that carry those events. e5 does,
and after the two fixes below it is clean.

## What the earlier runs taught

Run 1 (absolute cosine margins): e5's cosines span a fifth of MiniLM's,
so no floor fitted both. Fix: margins are divided by a scale computed
from the prototypes alone (median margin of a prototype over ordinary
life), so floor and threshold are model-independent units.

Run 2 (normalised margins): e5 found everything but raised false
episodes on every phone. The episode diagnostic showed two mechanical
causes. Six identical "K-Market Yo-kylä" visits at 0.8 each summed past
the renovation threshold; monthly "Sähkö" payments fired a move. And
future calendar entries ("Koeajo Yaris", 18 Oct) were visible from July,
because synthetic entries had no creation date, and joined the traps.
Fixes: an identical text counts once and is routine (never evidence)
when it recurs more than twice in the window; calendar entries carry
`meta.created` and are invisible before it.

## Caveats

The phones are ours, with our traps; the noise is template-generated and
narrower than a real phone's. The result says the rule works on signals
written the way they appear in Finnish mail and calendars, not that it is
tuned for the public. Threshold and floor are plateaus here (every
setting from 0.6/2.5 to 0.9/4 gives the same table), which is the
property worth having.
