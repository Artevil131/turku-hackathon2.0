# What if… — plan

Status 2026-10-17 evening. Deadline Sunday 11:00.

## The idea in one line

"Insurers find out how it ends when the claim comes in. What if… tells you before you sign."

You paste the ad for the thing you are about to sign for (a home, a used car, a rental flat). You get
three things to ask, what it really costs over the next years, what could go wrong and who would pay,
and later, reminders at the right moment.

## Judge feedback, 2026-10-17

- The customer side is good. He likes the idea, and likes that we use real data.
- Be concrete about the business model: how exactly does If make money?
- Who gets to use the tool? Free for everyone "makes no sense"; customers only needs a reason why it
  makes If *more* money.
- It must attract *good* customers: the ones who bring If the most money.
- If does not pay for car breakdowns (a timing belt or a gearbox is wear, not an insured event). If
  still has the data on what does get insured. We use this: every what-if says who pays.

## Business model

### In one breath

The check is free and anonymous for everyone, because it reaches people days before they must buy
insurance anyway. Everything after signing is for If customers. If earns from insurance margin, not from
fees: more customers, who stay longer, hold more policies, claim less, and cost less to win and serve.

### Who uses what

| Layer | Who | What they get | Why it pays for If |
|---|---|---|---|
| **The check** | Everyone, free, anonymous, runs in the browser | Three things to ask, the real cost, who pays for each what-if, the safer choice, help with the price | The cheapest ad If can buy, shown at the moment of need. A check costs almost nothing. Nothing leaves the browser until the person presses "Get a quote" |
| **After you sign** | If customers | Reminders at the right moment; a **logbook** for the home or car (like a car's service book: every inspection, repair, receipt and photo in one place, ready if something happens and handy when you sell); the **who-pays guarantee** (If stands behind its labels on an If policy); a lower excess for proven prevention (a stop valve, a new dishwasher hose) | It needs a policy to work. It is the reason to pick If over a cheaper price, and to stay |

### How If makes money

> **customer value = years they stay × (what they pay − what they claim − what they cost)**

| Part | What if… does |
|---|---|
| **More years** | It is there at the moments people switch insurer (a move, a car); the new car or flat goes to If in one tap. The logbook and the reminders grow every year, so leaving means starting over. |
| **More premiums** | Each life event adds a policy: first car, rental flat, own home, family. Customers with several policies pay the most and leave the least. |
| **Fewer claims** | Safer choices before signing; warnings after (frost, water off when away). Leaks are the biggest common home damage: 34,800 leak damages and €171 million paid in Finland in 2021 (Finanssiala), about €4,900 each. |
| **Lower costs** | People arrive by themselves at the moment of need, with the details already filled in. No ad paid per sale, no forms. |

### The customers who bring the most money, in order

1. **Flat buyers.** The biggest decision and the biggest policy; they add car and family policies later and
   move less than renters. Start here.
2. **Households heading for several policies.** Each life event adds one.
3. **Car-loan buyers.** Lenders usually require kasko, so the premiums are bigger.
4. **Careful planners.** They check before signing, and careful people tend to claim less.
5. **Young renters and first-car buyers.** Small premiums today, decades ahead; the cheapest moment to win them.

**The trap, and the fix.** The tool shows buyers of risky flats and cars what can go wrong, so they are the
keenest to insure. If they all paid the same price, If would collect the risky ones and lose money. So:

- **Price on the facts.** The quote uses the same facts the tool read and the buyer confirms: building year,
  pipe renovation, car model. A risky flat costs more to insure and a safe flat less. Insurers price this way
  already; the quote just matches what the tool saw.
- **Steer to the safer choice.** The tool nudges people toward the flat with the pipes done and the safer car.
- **Two things never change the price:** using the tool, and anything guessed about the person.
- **Bonus:** fair pricing makes If cheap for the safe buyers, the low-claim customers If earns the most on.
- **If's claims data shows up as a price,** never as published rates, so competitors can't copy it.

### Keeping customers

- **At the switch moments,** the new car or flat goes to If in one tap.
- **It builds up.** By law a customer can take their claims history (the bonus) to another insurer, so
  loyalty cannot come from penalties. It comes from what grows over time: the logbook, reminders that know
  the policy, the bundle of policies, the habit of checking here at the next life event.
- **No claim-time shocks.** The who-pays labels, and the guarantee behind them, remove "I thought that was
  covered".
- **Useful contact** a few times a year instead of only the bill.

### "They'll check for free and buy cheaper elsewhere"

Some will, and that's fine. If is often not the cheapest (in one 2025 comparison of traffic insurance for
ten cars, If was not the cheapest for any; Taloustaito, one driver profile). So If doesn't compete on price;
it wins the moment: first in line, already filled in, honest about what is and isn't covered, with a
guarantee that only comes on an If policy. A check that doesn't lead to a sale costs almost nothing. People
who leave over a few euros are the most likely to leave again at renewal. And the next life event, or the
next owner of a car or flat that comes with a logbook, brings them back.

### How people find it, in order

1. If's own app and customers. "Paste any ad" works with any site from day one.
2. Nordea's car-loan and mortgage flow (Nordea is If's bank partner in Finland).
3. Landlords and housing managers: prevention alerts, tenants insured from key day (offered, never required).
4. Car dealers.
5. Marketplaces (Nettiauto, Etuovi, Oikotie) last, paid per policy, offering only the neutral parts.

Later: housing companies with If building insurance get the alerts for every flat (fewer leaks across both
building and home policies).

### Rules we keep

- The check states facts ("if this happens, who pays"), never personal advice; advice under insurance
  distribution rules needs a written reason, and the If quote handles the needs check.
- Nothing leaves the browser until "Get a quote". The page contacts no outside server.
- Never price on tool use or on anything inferred.
- The labels and the guarantee get a legal review.

### Open decisions for the team

- If only, or If beside competitors? The old Ahead documents show If beside competitors; this plan shows
  If only. Decide before the pitch.
- Wording of the logbook and the guarantee (compliance).

## Honest about who pays (the judge's point)

Every what-if says who pays. It teaches what insurance does without making it the centre, and people buy
the right cover instead of the cheapest:

- **Not covered, you pay:** timing belt, gearbox, wear and tear, inspection repairs, your share of a
  pipe renovation.
- **Covered by insurance, after your excess:** a crash (kasko), theft, a leak damaging your flat (home
  insurance), damage you cause to the flat below (liability).

If's own claims data makes the covered what-ifs exact (crash, theft and leak rates by car model and
building). Public data covers the rest (Traficom inspections, Isännöintiliitto renovation costs).

## The prototype

Live at https://claude.ai/artifact/7SUmD83heokewMBwhrvcho (single file: `index.html`, works offline).

- Reads real car, motorcycle, flat-for-sale and rental ads with rules, no AI (`index.html`; data built by
  `tools/build-data.mjs` from `data/`; tested by `test/reader.test.mjs`, 17 of 17 sample ads pass).
- Motorcycles (Nettimoto or free text):
  - the licence class as a fact about the bike (A1, A2, A);
  - no periodic inspection, so "inspected" becomes a question;
  - what modifications need an inspection, and that If's kasko doesn't cover lowering springs;
  - who pays: your own injuries are paid by your bike's traffic insurance even when you caused the crash;
    your riding gear is not; theft needs kasko and a locked bike;
  - no vehicle tax; ABS as the safer choice;
  - winter storage as an If-customer reminder.
  
  Mopeds, snowmobiles and ATVs get "comes in the full version".
- Every what-if carries its who-pays label; the end card hands over to an If quote with the details filled in.
- Next, being explored by Aapo: an LLM that reads messier ads and drafts the risk factors (see `README.md`).

## Pitch, 3 minutes

1. A person and a decision: "I'm about to buy my first car." (Or the flat.)
2. Paste the ad: the three questions, the real cost, who pays for what.
3. The safer choice, and "you keep €600".
4. After you sign: the reminder that prevents the leak or the crash.
5. The business model, about 45 seconds (below), with the two diagrams.
6. Close: "See the what-ifs before you sign."

### The business model, as said on stage (about 45 seconds)

"The check is free for everyone, because it happens days before people have to buy insurance anyway: no
traffic insurance, no driving home. It's the cheapest ad If could buy, at exactly the right moment.
Everything after you sign is for If customers: the reminders, a logbook for your home or car, and a
guarantee behind every 'who pays' label.

If doesn't earn from fees. It earns from better customers. A customer is worth how long they stay, times
what they pay, minus what they claim and what they cost. What if… moves all four: they stay longer, add a
policy at every life event, claim less because they chose safer and got warned, and cost less because
they came by themselves with the details filled in.

And the customers it brings are the most valuable ones: first-time flat buyers first, then people heading
for several policies."

## Judge questions, answered

**"Won't people use the free check and buy cheaper insurance somewhere else?"** See "They'll check for free
and buy cheaper elsewhere" above.

**"How does If make money?"** Insurance margin, not fees: an insurer earns on what customers pay minus
claims and costs, plus the return on investing premiums until claims are paid. What if… raises the first:
more customers, staying longer, holding more policies, claiming less, cheaper to serve.

**"Won't it attract only the risky buyers?"** See "The trap, and the fix" above: the price follows the same
facts the tool reads, and the tool steers people to the safer choice.

**"How does it keep customers?"** See "Keeping customers" above.
