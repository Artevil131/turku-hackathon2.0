# Submission text

For the organisers' form. One paragraph, then the facts they usually ask.

## Description

Ahead is help that arrives before a life event, from a phone that never
tells anyone your life. With the user's permission, source by source,
the app reads what the phone already holds (calendar titles, mail
subjects, merchant names, places) and, on the phone itself, notices
that a move, a first car or a long trip is coming. It asks, shows its
evidence, and only after the user says yes builds a journey: the move
notification window from DVV, the Finnish Meteorological Institute's
warnings for the new address, the inspection deadline from Traficom,
what If's own public terms say about the days in between, and the
services that do each task, one tap away. Insurance is one card in that
journey, shown beside competitors, and nothing leaves the phone unless
the user shares one confirmed line. For If this is prevention
(Finanssiala counted 34 800 leak damages and 171 M€ paid in 2021, more
than fire), being the one who helped at the moment people switch
insurer, usefulness before anyone is a customer, and a structured event
when they do want a quote. The demo is a working offline PWA with an
on-device embedding model, running on a synthetic phone; the detection
rule finds every planted event on six synthetic phones, in Finnish and
Swedish, with no false notice in a year of noise.

## Facts

- Team: Artem, Aapo, Vaishnav (JunctionXTurku 2026).
- Challenge: If Insurance Could Do More, by If Vahinkovakuutus Oyj.
- Repository: https://github.com/Artevil131/turku-hackathon2.0
- Demo: `pnpm install && pnpm --filter @ahead/web assets && pnpm --filter @ahead/web build && pnpm --filter @ahead/web exec vite preview`, then open `/?engine=core&today=2026-10-17`.
- Backup video: `tools/demo-video/out/demo.mp4` (regenerate with `node tools/demo-video/record.ts`).
- Data: synthetic phones only (`data/synthetic/`); open data from FMI, DVV, Traficom, Finanssiala; If's public terms with clause numbers. No customer or confidential data.
- Pitch: `pitch/PITCH.md`; questions and answers: `pitch/QA.md`; privacy and law: `PRIVACY.md`.
