# Concept: help arrives before the event

> Written for **Ahead**, our first concept. Our entry is now **What if…** (`apps/what-if`, D-017 in DECISIONS.md).

Working name: **Ahead** (placeholder; see DECISIONS.md open items).

## The human need

Most of what goes wrong around a life event goes wrong because nobody
reminded you in time. You move and the old home insurance lapses before
the new one starts, the new flat's washing-machine hose is twenty years
old, the keys get copied by nobody knows whom. You buy your first car and
learn about the inspection deadline from the fine. You leave for an
exchange term and the apartment sits unheated through a cold snap. The
information to prevent all of that exists, but it is scattered across
people's phones, and the one organisation with the incentive to prevent it
(the insurer, who pays the claim) only hears about the event afterwards,
if at all.

The need, in one sentence: **"Tell me what I should do before this
happens, at the moment I can still do it, without me having to tell you
my life."**

## Who it is for

Both If customers and people who are not customers yet. The tool has to
be worth installing on its own; that is what makes it acquisition rather
than cross-selling. The judges' audience (Turku, students, young adults)
maps onto the events where help is most needed and most welcome: the
first move away from home, the first car, the exchange term abroad, the
first own flat.

## The life events

Ranked by how often they happen, how clearly the phone shows them, how
much harm prevention avoids, and how sensitive the signal is.

| Event | What the phone shows | What help looks like | Sensitivity |
|-------|----------------------|----------------------|-------------|
| Moving home | Lease or housing-offer mail, calendar "muutto", DVV move notification receipt, map searches for a new town, mover quotes | Move checklist with dates (DVV notification, electricity, insurance overlap), leak and freeze risk of the new address, lock change, what the old policy still covers in transit | Low |
| First car | Car listings opened repeatedly, Traficom ownership mail, inspection booking | Inspection and tax deadlines, winter-tyre dates, what to check before buying, parking-risk by area | Low |
| Long trip or exchange | Flight or hostel confirmations, university exchange mail, calendar block abroad | Leaving-the-home-empty checklist (heating, water main, a neighbour), travel documents, what travel cover is already included on a card | Low |
| First child | Neuvola appointments, baby-product mail | Home-safety checklist, car-seat rules, what changes in coverage | Medium (health-adjacent, Art. 9) |
| Pet | Breeder or shelter mail, vet booking | Vet-cost reality, microchip and registration | Low |
| Renovation | Contractor quotes, hardware-store receipts | Permits, water-work certification rule in Finland, documentation for later claims | Low |
| Retirement, separation, bereavement | Many | Real need, but signals are sensitive and the tone must be different | High; out of scope for the hackathon |

The demo covers **moving**, **first car** and **long trip** (PLAN.md).
The architecture handles any event that can be described in a sentence.

## What the user sees

1. **Onboarding chooses sources, one at a time.** Calendar, mail, photos
   (dates and places only), location, bank (via open banking), and on
   Android optionally notifications. Each toggle says in one line what is
   read and that it stays on the phone. Nothing is on by default.
2. **A quiet home screen.** Usually empty: "Nothing coming up. Last
   checked today." The app does not nag.
3. **A notice when an event is likely.** "It looks like you are moving
   around 1 November. Here is why we think so:" with the three or four
   snippets that triggered it, each with a "not this" button. Then
   "Help me with this" or "Not now" or "Never ask about moves".
4. **A journey, once confirmed.** A timeline of what to do and when,
   built from open data and If's public T&Cs: for a move, DVV notification
   window, electricity contract, insurance overlap, FMI freeze and storm
   warnings for the new address, lock change, a "what is covered in
   transit" card. Items can be shared with the person moving with you.
5. **Insurance appears as one card among many.** "Your current home
   policy ends at the old address on the move date; here is what to do."
   For a non-customer: "Here is what you should have covered; compare
   providers." If's own offer is one of the compared, labelled as such.
6. **A ledger.** Every event the app ever inferred, what was shared with
   If (by default: nothing), and a one-tap erase.

## What If gets, and how we make it believable

| Mechanism | How it works here | Hypothesis we can state |
|-----------|-------------------|--------------------------|
| Risk prevention, fewer claims | Leak, freeze, empty-home, inspection and lock reminders at the moment they matter | Leaks are the largest home-insurance cost in Finland (34 800 damages, 171 M€ in 2021, Finanssiala); a share of these are preventable with timely action, and LähiTapiola's sensor programme shows insurers already pay to prevent them |
| Retention | A move or a first car is exactly when people change insurer; being the one who helped, before the sale, changes who gets the call | Standard churn-at-life-event argument; ask If for their own numbers |
| Acquisition | The app is useful before you are a customer; comparison cards list If honestly beside others | Trust is earned by not pushing; the If card converts when it is the right answer |
| Efficiency | When the user does want a quote or files a claim, the event, dates and address are already structured on the phone and shared with one tap | Fewer calls, fewer form fields, fewer wrong addresses |
| New value | Partner services around events (movers, locksmiths, inspection), and anonymous aggregate signals ("moves into Turku peak in August") if users opt in | Only with explicit opt-in; counts, never individuals |

### The arithmetic, with its assumptions in the open

Finanssiala counted 34 800 leak damages and 171 M€ paid in Finland in
2021. Every one percent of those prevented is about 1.7 M€ a year across
the market, before fire, theft and car. We do not know If's market share
or its retention at life events; those are questions for the mentor, and
the pitch says so rather than inventing them. The claim we make is the
mechanism, not a number: a reminder at the right moment prevents a share
of damages that today nobody is in a position to prevent.

### Services actually connected

The brief asks to "connect useful services together". A checklist is
not that. Each journey card that corresponds to a service opens it: the
DVV move notification, Posti's forwarding, the electricity contract,
the mover's booking, the inspection booking, the comparison. The app
is the thread; the services stay where they are.

## What the phone works out, on the phone

Beyond noticing an event, the same snippets and vectors feed four
analyses, all on the device, all erased with the rest:

- **How the phone saw it.** For each event, the detector is replayed day
  by day over the window, giving a score curve with the day it crossed
  the threshold, and the signals behind it as a timetable. On screen the
  signals are stars sized by their weight, joined into the event's
  constellation.
- **Why we think so, as numbers.** Each source's share of the score
  (mail, calendar, bank, places, messages, Wi-Fi) and its strongest
  single item, so a judge sees the arithmetic, not a slogan.
- **What changed this month.** The last 30 days against the 30 before:
  new senders, merchants and places; recurring payments found by
  interval regularity (and flagged when one stops or jumps); shifts in
  how much a source is used, found by a change-point test on daily
  counts; the month's items grouped by k-means over their embeddings and
  named by the nearest life-event prototype or their common words, with a
  novelty score against the previous month. This runs even when no
  event fires, so the app has something true to say on a quiet month.
- **The next 90 days.** Rules over the detected events and open data:
  the flat left empty during a trip; a move and a car in the same month;
  an FMI warning on an event's week; a possible gap between the old
  lease and the new cover; a spending shift. Each insight names its
  source and the events it rests on.

Two more sources, both local: service text messages (Android, never
messages from people) and the names of Wi-Fi networks the phone joined
(a new network is a new place). PRIVACY.md and ARCHITECTURE.md §1 say
what each platform really allows.

## Why it is not "another insurance app"

- The product is the help, and it works for people who never buy
  anything from If.
- Insurance is one card in a journey, and it is shown beside competitors.
- If sees nothing unless the user chooses; the trust that creates is the
  business model, not an obstacle to it.
- The AI does one humble thing (notice an event from signals already on
  the phone) and the user confirms it. No prediction is ever used to price
  or decline anything (PRIVACY.md).

## Risks to the concept

- **Creepiness.** Mitigated by per-source consent, visible evidence, "not
  this", and no data leaving the phone. We must show the ledger in the
  demo.
- **False positives.** A friend's move or a car you looked at for someone
  else. The notice is a question, not a statement, and the cost of a wrong
  question is one tap.
- **Platform access.** iOS shows an app nothing from other apps; see
  ARCHITECTURE.md for what is actually readable.
- **"Who pays for the help?"** If does, because the help is cheaper than
  the claims it prevents. We state this in the pitch with the water-damage
  numbers.
