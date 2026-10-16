# turku-hackathon2.0

Our second JunctionXTurku 2026 entry: the challenge "If Insurance Could Do
More" by If Vahinkovakuutus Oyj. The brief, judging criteria and open
questions are in CONTEXT.md. The idea is in CONCEPT.md: an app that
notices, on the phone itself, that a life event is coming (a move, a first
car, a long trip, a new baby) and offers help before anything goes wrong,
without the raw data ever leaving the phone. How that works technically is
in ARCHITECTURE.md; why it is lawful and what we must not do is in
PRIVACY.md; the open data we lean on is in DATA.md; the remaining weekend
is scheduled in PLAN.md.

The first entry (`~/turku-hackathon`, the Antibiotic Efficacy Indicator)
set our working rules: every technical choice is recorded in DECISIONS.md
with who made it and why, agents follow AGENTS.md, and nothing is assumed
quietly. Those rules carry over unchanged. Experiments, if we run any,
follow that repository's PROTOCOL.md.

## The idea in one paragraph

People meet insurance at the worst moments: after the pipe burst, after the
move, after the crash. The useful moment is before. The phone already holds
the evidence that a life event is coming: a lease in the mail, a calendar
entry "muutto", a map search for a new town, a car listing opened ten
times, a flight confirmation. Our app, with the user's permission per
source, reads those signals on the device, turns them into embeddings
locally, and matches them against a small set of life events. When it is
confident it asks the user: "Looks like you are moving in November. Want a
hand?" Only a confirmed event, and only if the user says so, ever reaches
If. What If then gives is help, not a policy: a checklist, a water-leak
and freeze warning for the new address from FMI's open data, a reminder
that the old home insurance ends, a partner for the move. Insurance comes
up where it is relevant and never as the point. For If this is prevention
(fewer claims), retention (help at the moment people reconsider
providers), acquisition (the tool is useful before you are a customer) and
cheaper service (the customer's data is already in order when they do want
a quote).

## Layout

    CONTEXT.md       the challenge: brief, criteria, what we know about If,
                     questions for the judges
    CONCEPT.md       the product: the human need, the life events, what the
                     user sees, what If gets, why it is not "another app"
    ARCHITECTURE.md  how it works: signal sources per platform, on-device
                     embedding pipeline, event detection, what leaves the
                     phone, the demo build
    PRIVACY.md       GDPR, ePrivacy, the AI Act, insurance law and app-store
                     policy: what the design must satisfy and what we say
    DATA.md          open data we use and the synthetic phone data for the demo
    PLAN.md          schedule, roles, demo script and pitch outline
    DECISIONS.md     every technical choice the team has made
    AGENTS.md        rules for AI agents working here
    research/        reading notes with sources; describes, decides nothing

Code layout (apps, libs, deploy, scripts) is added once the team chooses
the stack (DECISIONS.md, open items).
