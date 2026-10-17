# What if…

Our entry for If's challenge "If Insurance Could Do More" at JunctionXTurku
2026 (team: Artem, Aapo, Vaishnav).

> Insurers find out how it ends when the claim comes in. What if… tells you
> before you sign.

Paste the ad for something you are about to sign for: a used car or
motorcycle, a flat for sale, a flat to rent. Before you sign, you see three
things to ask, what it really costs over the next years, what could go
wrong and who would pay for it, and the safer choice. After you sign, If
customers get reminders at the right moment and a logbook (huoltokirja)
for the home or vehicle.

**Try it:** https://what-if.what-if.workers.dev (D-028). The page is also one
file that works offline: open `apps/what-if/index.html` in any browser.

## How it works

- **Rules first, AI second.** The page reads the ad with rules and looks up
  the facts. When the rules can't read an ad (free text, a moped, a boat, a
  pet), the team's AI reader reads it, and every field it returns must quote
  the ad (D-024, D-028). Costs and who pays still come from our sources.
- **Real data, with a source on every number.** Traficom's 2025 inspection
  statistics by make, model and year; Isännöintiliitto's pipe renovation
  costs; Finanssiala's leak damages; the laws on Finlex; KKV and FINE;
  If's published terms. Anything else is labelled estimate (D-020, D-021).
- **Every what-if says who pays.** "Not covered · you pay" for wear, a
  timing belt or your share of a pipe renovation. "Covered by insurance ·
  after your excess" for a crash with kasko, theft or a leak. Facts, never
  personal advice (D-019).
- **Only the ad's text leaves, and only when the rules can't read it.** It
  goes without phone numbers or email addresses, through our server at
  Cloudflare to the AI model on the team's own computer. Nothing is stored,
  nothing about the person is sent, and nothing goes to If. The offline file
  sends nothing at all.

The rules pass all 17 test ads, written in the sites' real formats
(`node apps/what-if/test/reader.test.mjs`); the AI side has its own tests
(`apps/what-if/test/ai.test.mjs`). Details for developers are in
`apps/what-if/README.md` and `deploy/what-if/README.md`.

## How If makes money

The check is free for everyone, because it reaches people days before they
have to buy insurance anyway. Everything after signing is for If customers:
the reminders, the logbook (huoltokirja) and a guarantee behind the
who-pays labels. The quote is If's alone (D-022).

If earns from insurance margin, not fees. A customer is worth the years
they stay × (what they pay − what they claim − what they cost). What if…
moves all four: people stay longer, add a policy at each life event, claim
less because they chose the safer option and got warned, and cost less to
win because they arrive by themselves with the details filled in. The full
model, the customers who bring the most money, the pitch outline and the
answers to judges' questions are in `apps/what-if/PLAN.md`.

## Layout

    apps/what-if/        the entry: index.html (the whole app), PLAN.md
                         (business model, pitch, judge Q&A), README.md
    apps/what-if/data/   the sourced facts and the test ads; sources and
                         the fact-check in its README.md
    CONTEXT.md           the challenge: brief, judging criteria, what we
                         know about If
    DECISIONS.md         every technical, product and legal-design choice,
                         who made it and why (What if…: D-017 onwards)
    AGENTS.md            rules for people and AI agents working here
    research/            reading notes with sources

## Earlier concept: Ahead

Our first concept for this challenge was Ahead: an app that notices, on the
phone itself, that a life event is coming (a move, a first car, a long
trip) and offers help before anything goes wrong, without the raw data
leaving the phone. What if… replaced it as the entry on 2026-10-17 (D-017).
Its documents and code stay for reference:

    CONCEPT.md, ARCHITECTURE.md, PRIVACY.md, DATA.md, PLAN.md,
    PRODUCT.md, WORK.md  the idea, design, law, data, plan and work split
    pitch/               Ahead's pitch script, judge Q&A and submission
                         text
    apps/web, apps/api   the Ahead PWA and its share server
    libs/                synthetic phones, adapters, on-device embedding,
                         detection, open data, journeys
    scripts/, benchmarks/, tools/demo-video/, data/synthetic/

## How we work

The first entry (`~/turku-hackathon`, the Antibiotic Efficacy Indicator)
set our working rules: every technical choice is recorded in DECISIONS.md
with who made it and why, agents follow AGENTS.md, and nothing is assumed
quietly. Those rules carry over unchanged. Experiments, if we run any,
follow that repository's PROTOCOL.md.

Stack and conventions are D-005 in DECISIONS.md: pnpm workspace,
TypeScript source exported from packages, Biome, Vitest. `pnpm install`,
then `pnpm typecheck && pnpm check && pnpm test`. What if… needs none of
that: its build and test scripts run on plain Node (`apps/what-if/README.md`).
