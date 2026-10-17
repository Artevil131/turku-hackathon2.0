# Product

<!-- impeccable:product-schema 1 -->

> Written for **Ahead**, our first concept. Our entry is now **What if…** (`apps/what-if`, D-017 in DECISIONS.md).

## Platform

web

## Users

At this stage the screen is for the JunctionXTurku judges, watching a
three-minute demo mirrored from a phone to a projector and driven by the
team (Aapo, 2026-10-17). Legibility from the back of a room and one
clear story beat per screen outrank density.

The product's intended user, whom the demo portrays, is a young adult in
Finland on the way to a life event: Emma, 22, moving from Oulu to Turku,
looking at a first car, leaving for an exchange term. She is not
necessarily an If customer. Her job: know what to do before the event,
at the moment she can still do it, without telling anyone her life.

## Product Purpose

Ahead notices a coming life event from signals already on the user's
phone (calendar, mail, bank, places, photos, chosen one by one), asks
the user to confirm it, and then gives a journey of help: what to do,
when, with the open-data facts and the insurance terms that apply.
Insurance is one card in that journey, shown beside competitors. Success
is prevention: the pipe that did not freeze, the policy that did not
lapse in transit, the inspection that was not missed.

## Positioning

Everything personal is read and inferred on the phone, by the phone.
Nothing leaves it unless the user confirms an event and chooses to
share one line. The insurer sees nothing by default. That is the
mechanism a competitor's app cannot truthfully copy while still asking
for your data (CONCEPT.md, PRIVACY.md).

## Operating Context

A PWA (React + Vite) opened on a phone, with the model served by the app
itself so it runs offline. The demo runs on synthetic data for one
dated phone (today = 2026-10-17); "Check now" detects three events in
about ten seconds on first run, instantly after. Screens: onboarding
(sources), home, notice with evidence, journey, ledger, sources. A
footer counter shows outbound requests: zero until the user explicitly
shares a confirmed event, then one for the share request.

## Capabilities and Constraints

- Six sources, all off by default; mail and bank open a consent sheet
  (mocked in the demo). Notifications is Android-only.
- Events: move, first car, long trip in the demo; child, pet, renovation
  exist in the detector without journeys.
- Every notice shows its evidence, each piece with "Not this"; answers
  are Confirm / Not now / Never for this event type.
- Journey cards have kinds: todo, warning, insurance, compare, info;
  service todos open the service (DVV/Posti, electricity comparison,
  Traficom); other cards link to their source (a T&C clause, FMI).
- Ledger: every inferred event, its status, "shared: no", one-tap erase.
- Finnish and English UI. The user wants language, and theme
  (light / dark / system), in a settings area rather than the header.
- Keep: the outbound-request counter visible on every screen.
- A small demo server accepts only the type, date and municipality of a
  confirmed event the user explicitly chooses to share (D-016). No
  analytics or third-party scripts.

## Brand Commitments

Name: Ahead (working name, D-011). No If branding: Ahead stands alone;
If appears by name only on insurance and comparison cards (Aapo,
2026-10-17, per the brief: insurance is not the centre). Voice:
plain, short, asks rather than tells; numbers only from code (the
notice templates in `@ahead/detect`).

## Evidence on Hand

- Synthetic phones with planted events: `data/synthetic/*.json`.
- Detection benchmark: `benchmarks/detect/README.md` (every planted
  event found, no false notice in a year of synthetic noise).
- If's public terms extracts with clause numbers: `libs/journeys/terms/`.
- FMI warnings cache, DVV and Traficom rules: `libs/opendata/`.
- Finanssiala 2021 claims statistics: `research/sources.md`.
- No testimonials, customers or If-internal numbers; do not invent any.

## Product Principles

1. Help first, insurance one card among many.
2. The phone is the boundary: show it, do not claim it.
3. Ask, never tell: every inference is a question with its evidence.
4. One beat per screen; a judge at the back must read it.
5. Only sourced facts on screen: dates and places from code, clauses
   with numbers, open data with its origin.

## Accessibility & Inclusion

Finnish and English. Touch targets at least 44 px. Light and dark.
Projector legibility: large type and strong contrast on the demo path.
