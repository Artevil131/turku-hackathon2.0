# Data: open sources and the synthetic phone

No customer or confidential insurance data is used or needed. Two kinds
of data appear: public data that fills the journeys, and synthetic
personal data that stands in for a real phone in the demo.

## 1. Open data for the journeys

| Need | Source | Access | Licence | Status |
|------|--------|--------|---------|--------|
| Weather warnings for an address (storm, freeze, heavy rain, flood) | Finnish Meteorological Institute open data: warnings as a CAP Atom feed; observations and forecasts via WFS stored queries | No key needed | CC BY 4.0 | To verify endpoint for warnings; WFS confirmed |
| Move notification rules and window | DVV (Digital and Population Data Services Agency): notification at the earliest one month before, at the latest a week after the move; Posti separately at muuttoilmoitus.fi | Rules only, no API needed | Public | Rule encoded in the move journey |
| Vehicle inspection and registration rules | Traficom public rules; open vehicle register (ajoneuvojen avoin data) for make/model by registration | Public dataset | CC BY 4.0 | To check for the first-car journey |
| What a policy covers | If's public terms and conditions and IPID documents (if.fi), plus competitors' for the comparison card | PDF | Public | Extract the relevant clauses for home-in-transit, empty home, travel |
| Water-damage and claims statistics | Finanssiala ry press release 20 May 2022: 2021 leak damages 34 800 / 171 M€, fire 6 100 / 168 M€, burglary 21 400 / 22 M€ | Public | Public | Primary source found (research/sources.md); 2023–2025 figures still to look for on finanssiala.fi |
| Municipality and postcode geometry | Statistics Finland / Maanmittauslaitos open data | WFS | CC BY 4.0 | For "warnings at the new address" |
| Public transport and services at the new address | HSL/Föli open data, Turku open data | API | Open | Nice-to-have for the move journey |
| Crime and burglary by area | Statistics Finland (StatFin) | PxWeb API | CC BY 4.0 | Optional: lock-change advice |

Everything lands in `data/external/<source>/`, git-ignored, with a fetch
script in `scripts/` once the stack is chosen.

## 2. Synthetic phones for the demo and for tuning

A generator produces a complete, consistent personal dataset for one
person over about 120 days: mail subjects and first lines, calendar
entries, bank transactions (merchant, amount, date), visited places,
photo dates and places. Personas:

| Persona | Events planted | Noise |
|---------|----------------|-------|
| Student, Oulu → Turku | Move on 1 November; used-car search in October; exchange term from January | Ordinary mail, groceries, gym, a friend's move (a false-positive trap) |
| Young family, Turku | Renovation in spring; a pet | A relative's car purchase |
| Control | No events | Full noise |

Generated in Finnish and English mixed, as real Finnish mailboxes are.
The planted events and their dates are the ground truth for tuning the
matcher threshold and for measuring detection delay and false positives,
the same way entry one scored detectors on planted outbreaks. A simple
benchmark: for each persona, days from first signal to detection, and
number of false notices in 120 days. Target for the demo: every planted
event detected before its date, at most one false notice per persona.

Generation is by templates with a seeded random generator, no language
model involved (`libs/synthetic`); rerunning gives the same files, so a
diff means the generator changed. Output is committed under
`data/synthetic/` so the demo depends on nothing at show time. Calendar
entries carry the day they were created, so a replay does not see the
future. The benchmark and its results are in `benchmarks/detect/README.md`.

## 3. Data that is never used

Health data, message bodies beyond the first lines, attachments, photo
pixels, contacts, call logs, browsing history, screen contents.
