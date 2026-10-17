# Ahead

> Written for **Ahead**, our first concept. Our entry is now **What if…**; its pitch outline is in `apps/what-if/PLAN.md`.

## Spoken script

Timing follows the three-minute demo in PLAN.md, “Demo script”. Parentheses are source notes, not spoken words. Bracketed text is a stage direction. Emma and the phone records are synthetic. Rehearse with the actual build before presenting; a planned screen is not evidence that a feature ships.

### 0:00 | Meet Emma (PLAN.md, “Demo script”)

[Title, then Emma, then the problem. Open the quiet home screen with the network tab visible.]

Meet Emma. They are moving from Oulu to Turku on 1 November (PLAN.md, “Demo script”). Their lease, calendar and mover payment already tell that story. But the tasks are scattered. Who reminds them about electricity, the water hose, or a gap in cover?

Ahead brings those tasks together. Help arrives before the event, and you never have to tell anyone your life.

### 0:30 | Emma chooses (PLAN.md, “Demo script”)

[Show sources. Explain that these are synthetic inputs, not connected accounts.]

Emma chooses which sources Ahead may use. Here, mail, calendar and bank are enabled. Health stays off. Nothing starts enabled. This demo uses generated records, not someone's accounts. The personal records are processed here, on the phone, not sent to If.

### 0:50 | A question, not a verdict (PLAN.md, “Demo script”)

[Tap check now. Open the evidence, reject a snippet, then confirm the move.]

Ahead asks: “Looks like you are moving.” Here is the lease subject, the calendar entry and the mover payment behind that question. Emma can say “not this” to an item, dismiss the notice, or stop move notices altogether.

They confirm the move. Confirmation opens help. It does not send the evidence to an insurer, request a quote, or change a price.

### 1:20 | The journey (PLAN.md, “Demo script”)

[Show the move journey, service links, source labels and comparison card.]

Now Emma has a journey, not an insurance sales screen. Here is the move-notification window and the link to the service. Here is electricity. Here are reminders about the washing-machine hose, heating and locks.

The cover card points to public policy terms. It is not a decision about Emma's actual cover. Weather information needs its place and update time shown; a future warning must not be passed off as a live forecast.

Insurance is a card among the tasks. If appears beside competitors. Emma can use the help without buying from If.

### 2:10 | Show the boundary (PLAN.md, “Demo script”)

[Show the ledger, sharing status and erase. Briefly show the phone-boundary picture.]

An on-device embedding links signals; GDPR remains a design obligation, not a compliance claim. This ledger shows the inference and that nothing was shared with If. Emma can erase it. Only a separate choice to share would send a confirmed event, never the evidence.

### 2:30 | Why If would pay (PLAN.md, “Demo script”)

[Business slide.]

In Finland in 2021, there were 34 800 leak damages and 171 M EUR paid (Finanssiala, research/sources.md). Timely prevention gives If a reason to fund help. Retention and acquisition are hypotheses, not measured gains. We would ask If what a pilot must prove before they pay.

### 2:50 | Ask (PLAN.md, “Demo script”)

[Ask slide.]

We would ask If to test prevention and trust. Help arrives before the event, and you never have to tell anyone your life.

## Answers against the judging criteria

Each criterion carries 25 % (CONTEXT.md, “Judging criteria”). The brief repeats wording under the later criteria; feasibility and innovation below use the team's interpretation, pending confirmation from the judges (CONTEXT.md).

### Customer value and relevance

**Answer:** Ahead turns the scattered signs of a move into timely tasks and service links, while Emma keeps control of the evidence.

**Evidence we can show:** The move notice, its evidence, “not this”, confirmation, and the journey linking to move notification and electricity services. Show the quiet home screen as well as the notice. This demonstrates a workflow, not proven demand from real users.

### Business value for If

**Answer:** If could fund prevention and earn consideration at a life change by helping before selling, including when the user is not a customer.

**Evidence we can show:** The leak-prevention task and If beside competitors in the comparison card. The Finnish market recorded 34 800 leak damages and 171 M EUR paid in 2021 (Finanssiala, research/sources.md, primary press release linked there). These are market totals, not If claims or demonstrated savings. We would ask If for preventable-claim costs, retention at moves, acquisition costs and the pilot outcome that would justify paying. We have no If-internal figures.

### Feasibility and implementation, assumed criterion

**Answer:** A working local detector and a template-based journey demonstrate the core path, while account connections and deployment safeguards remain launch work.

**Evidence we can show:** Run detection on synthetic records with the model already loaded, show evidence and the ledger, and inspect network requests during the check. The chosen benchmark setting detected the student move 23 days early, first car 7 days early and long trip 89 days early; the later run reported no false episodes across six synthetic phones (benchmarks/detect/README.md, chosen setting and “Run 4”). These are generated phones and narrow noise, not a public accuracy estimate. A browser demo does not establish native account access or legal compliance.

### Innovation and experience

**Answer:** Ahead makes the phone ask its owner about a possible event before any insurer can receive it, and makes help useful without a purchase.

**Evidence we can show:** Reject evidence, confirm without sharing, inspect the ledger and erase. Then show the comparison card with If beside competitors. The distinction is the separation between noticing, helping and sharing, not an exclusive model or a claim that insurers have never tried prevention.

## Slide list

Use these slides as visual support, not as extra spoken content. Keep the live journey ahead of the technical explanation.

- **Title:** Ahead. “Help arrives before the event, and you never have to tell anyone your life.” Lead immediately into Emma.
- **Person:** Emma, moving from Oulu to Turku on 1 November (PLAN.md, “Demo script”). Label the persona and phone records synthetic.
- **Problem:** A lease, a calendar entry and a mover payment sit apart from the tasks they imply. The person bears the coordination work.
- **Demo:** Sources → question → evidence control → confirmed move → service-linked journey. Show If beside competitors, with source labels rather than an unsupported promise about actual policy cover.
- **How it works in a picture:** Describe a phone outline containing chosen sources, short snippets, a local similarity matcher, a question and the ledger. Public journey information enters from outside. A separate gate labelled “choose to share” leads from a confirmed event to If. No arrow carries snippets or vectors outside. Reveal only after the journey.
- **Business value:** “Finland, 2021: 34 800 leak damages / 171 M EUR paid” (Finanssiala, research/sources.md). Connect a prevention task to a claim-cost hypothesis, then retention, acquisition and less retyping when sharing is requested. Label all gains unmeasured. We would ask If to define and price a pilot, not assume a budget or conversion rate.
- **Privacy by architecture:** Source consent, local inference, evidence control, separate sharing and erase. Show the ledger and network inspection as evidence of the demonstrated path, not proof of all future behaviour. State that pricing and claims assessment must remain separate; legal review is still needed.
- **Ask:** We would ask If for a pilot partner, privacy review and agreement on what prevention, usefulness and trust would need to show. No request for customer records at the hackathon.

### Demo truth checks

Preload the model and bundled public content before showing an offline check. Do not call the whole app network-free: model downloads, public-data lookups and chosen service links can use a network. A silent network tab supports only the action being inspected.

Show the update time and provenance of weather and policy content. If a planned card, connector, sharing endpoint or erase behaviour is absent, name the gap rather than mime it. Never fill in the policy-duration placeholder from the demo plan or suggest a future freeze warning is already known.
