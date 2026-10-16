# Privacy and law: what the design must satisfy

The concept reads the most personal data a person has. It is lawful and
defensible only because of where the processing happens and what never
happens. This file lists the rules, what each one demands of the design,
and what we say to the judges. It is a hackathon reading of the law, not
legal advice; an If DPO would review it before any real launch.

## 1. GDPR

| Rule | What it demands here | How the design meets it |
|------|----------------------|--------------------------|
| Art. 5(1)(b) purpose limitation | Data read for "notice life events and help" may not be used for pricing, underwriting, claims assessment or marketing to others | Hard rule: no inferred event or signal ever reaches If's pricing or claims systems. Written into the product and said on stage |
| Art. 5(1)(c) data minimisation | Read as little as the purpose needs | Adapters reduce to short snippets before embedding; attachments, bodies, pixels, health are never read; 60-day window; vectors and snippets deleted on a timer |
| Art. 5(1)(e) storage limitation | Keep no longer than needed | Local only, rolling window, erase with one tap or by deleting the app |
| Art. 6 lawful basis | A basis per processing | On-device processing under consent (Art. 6(1)(a)); sharing a confirmed event with If under consent or, for a customer who asks for a quote, pre-contract steps (Art. 6(1)(b)); aggregate counts under consent |
| Art. 7 and EDPB consent guidance | Freely given, specific, informed, unambiguous, as easy to withdraw as to give, no bundling | One toggle per source, all off by default, plain one-line descriptions, withdraw in-app and in OS settings, the app works with any subset including none |
| Art. 9 special categories | Health, sex life, religion etc. need explicit consent and a strong reason | Not processed: Health/Health Connect never read; the "first child" event uses only neuvola-type calendar titles and is behind its own explicit toggle; bereavement and separation out of scope |
| Art. 13–14 transparency | Tell the person what is processed, why, by whom | The onboarding and the ledger are the notice; a short privacy page for the rest |
| Art. 15–20 rights | Access, rectification, erasure, portability | Everything is on the phone: the ledger is the access right, "not this" is rectification, erase is one tap, export is a JSON button |
| Art. 22 automated decisions | No decision with legal or similarly significant effect based solely on automated processing | The app never decides anything about the person; it asks a question. Pricing and claims are untouched. If still documents this in the DPIA |
| Art. 25 privacy by design and by default | Defaults protect; architecture protects | On-device is the architecture; off-by-default is the default |
| Art. 35 DPIA | Required for systematic profiling of individuals from innovative technology | Yes, If would need one. We draft its outline (section 6) so the judges see we know |
| Art. 3 and 44+ transfers | Data leaving the EEA | Nothing leaves the phone; model weights are downloaded, not uploaded; mail via an EU-hosted connector or on-device IMAP |

Controller: for on-device processing the person is largely processing
their own data (household exemption is arguable but not relied on); If is
controller for anything shared and for the app's design. Processor: the
mail and bank connector providers, under Art. 28 contracts.

## 2. ePrivacy (Directive 2002/58, Finnish Act on Electronic Communications Services)

Reading information stored on a terminal device requires consent unless
strictly necessary for a service the user asked for. Our per-source
toggles are that consent. The app sets no tracking identifiers and uses
no third-party analytics SDK.

## 3. EU AI Act

AI used for risk assessment and pricing in **life and health** insurance
is high-risk under Annex III. P&C is not listed, and our system is not
used for pricing at all, so it is not high-risk; it is still an AI system
and transparency obligations apply (the user is told that inference is
automated and shown the evidence). Keeping the inference away from pricing
is what keeps it out of the high-risk regime even if Annex III widened.
The high-risk obligations' date is in flux (Digital Omnibus); irrelevant
to us if we stay out.

## 4. Insurance law in Finland

- Insurance Contracts Act (543/1994): the policyholder's duty of disclosure
  is about facts asked in the application. Our events must never be used
  to assess disclosure or contest a claim ("the app saw you were away
  when the pipe froze"). Written rule: no event data is available to
  claims handling.
- Finanssivalvonta's guidance on customer data and on good insurance
  practice: no use of inferred data to the customer's detriment.
- Marketing: consumer-protection rules on direct marketing; the app's
  notices are service messages the user turned on, not marketing, and If's
  offer is shown beside competitors.

## 5. App-store and platform policy

- **Apple**: no cross-app data; mail only via the user's own account with
  OAuth; location "Always" needs a strong justification, so we use
  significant-change updates and visited places; privacy nutrition label
  says "data not collected" for everything that stays on device.
- **Google Play**: notification access is a restricted permission that
  needs a declaration and a core-functionality justification; accessibility
  services may not be used for data collection; a prominent disclosure
  before any sensitive permission. We ship without notification access
  first.
- **Open banking (PSD2)**: account information via a licensed AISP
  (Enable Banking or similar); consent per bank, renewed every 90 days;
  transactions are reduced to merchant and amount band on the device.

## 6. DPIA outline (what If would file)

1. Description: on-device inference of life events from user-chosen
   sources; nothing shared by default.
2. Necessity and proportionality: why mail and bank are needed (they are
   the only sources that show events early), why the alternative (asking
   the user to type their events) does not work (nobody does).
3. Risks: unwanted inference (someone else's event, a sensitive event),
   a device shared by two people, data on a lost phone, mission creep
   toward pricing.
4. Measures: per-source consent, evidence shown, "never" per event type,
   OS-level encryption at rest, sensitive events excluded, organisational
   wall between the app's data and pricing/claims, audit of the share
   endpoint, annual review.
5. Residual risk and sign-off.

## 7. What we say on stage

"If never sees your data. The phone looks, the phone asks you, and only
if you say yes does one line, 'moving on 1 November', ever leave it. We
show the ledger and the empty network tab. Nothing here can ever change
your price."

## 8. Things we must not do, even in the demo

- Read a real person's mailbox on stage without their explicit, informed
  agreement (synthetic data by default).
- Show health, religion, sexuality, political or union signals anywhere.
- Let any event, confirmed or not, flow toward a quote without the user
  pressing a button that says so.
- Claim compliance we have not designed for.
