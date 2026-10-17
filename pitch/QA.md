# Questions to prepare for

These answers distinguish the demo from the intended product. Legal interpretations need review, not a claim of compliance.

### Can you really say If never sees my data?

The design keeps evidence and vectors local, with a separate choice before a confirmed event is shared with If. That does not mean every connection is invisible: mail and bank providers handle their connections, and a public-data request can reveal a postcode. The demo can show the local detection path, but a launch still needs connector contracts, a data protection impact assessment and review by If's privacy team (PRIVACY.md, ARCHITECTURE.md).

### What happens when the notice is wrong?

The notice asks a question, shows the evidence and allows dismissal or rejection of an item. The later benchmark reported no false episodes across six synthetic phones, but their template-generated noise is narrower than a real phone's and does not establish a public false-positive rate. We need testing with consenting users before claiming that the notices are rare or useful in daily life (benchmarks/detect/README.md, “Run 4” and “Caveats”; PRIVACY.md; ARCHITECTURE.md).

### Why would If pay rather than just let us use a checklist?

The proposed value is getting a relevant prevention task in front of a person while they can still act. A detector and journey do not prove fewer claims, better retention or a return on spending. We would ask If which prevention outcome would justify funding a pilot, and keep event evidence away from pricing and claims assessment (ARCHITECTURE.md, journey pipeline; PRIVACY.md, purpose limitation and insurance law).

### Why not put this inside an If-branded app?

The local processing boundary could also be built into an If-branded app. Branding is not the privacy safeguard; source consent, evidence control and a separate sharing choice are. Our proposal keeps the help useful without a sale and shows If beside competitors, but we would ask If to test whether users trust that arrangement (ARCHITECTURE.md, phone boundary; PRIVACY.md, consent and marketing).

### How can this work on iOS if apps cannot read each other?

It cannot read other apps' notifications or screens on iOS. A shipping app could request calendar access, accept items through the share sheet, and connect mail or a bank account with permission. Those integrations are not proved by the browser demo, which uses synthetic records rather than access to the user's other apps (ARCHITECTURE.md, signal sources and demo build).

### What if the user lies or confirms a move that is not real?

Confirmation is the user's answer, not verified evidence of a move. The event may help organise a journey or prefill a requested form, but it must not become an underwriting fact or evidence against a claim. Any later insurance application still needs its own questions and checks, separate from the local inference (ARCHITECTURE.md, sharing boundary; PRIVACY.md, purpose limitation and insurance law).

### Is reading mail and bank activity inherently creepy?

It can be, even when the processing stays local. Sources start off, permissions can be withdrawn, the notice shows its evidence, and the user can reject an inference or erase it. Those controls do not remove unwanted inferences or the risk of a shared or lost phone, which belong in the privacy assessment and user testing (PRIVACY.md, consent and DPIA outline; ARCHITECTURE.md, local ledger).

### Does the AI Act make this a high-risk insurance system?

Our current reading is that a help-only tool outside pricing is not the life and health insurance risk-assessment use listed as high-risk. That is not legal clearance, and changing the purpose or adding downstream uses would require a fresh assessment. We still disclose automated inference and show evidence, and would ask If's legal team to review the intended deployment (PRIVACY.md, EU AI Act).

### What is the business model without selling personal data?

The proposal is that If funds the help because prevention and voluntary customer contact could have value. The architecture does not require selling snippets or vectors, and any optional aggregate count or confirmed-event sharing needs its own choice. There is no validated price or revenue model here, so we would ask If what they would pay to test rather than claim a signed business case (ARCHITECTURE.md, allowed sharing and server side; PRIVACY.md, lawful basis and purpose limitation).

### What in the demo actually runs?

The documented demo runs the local model and detector over generated phone records, rather than playing a detection result as a video. The journey combines templates with public information, and the network tab can show whether the inspected check sends anything. This does not demonstrate live mail or bank connections, native platform permissions, a deployed sharing service or a production security audit (ARCHITECTURE.md, pipeline, server side and demo build).

### What is synthetic, and are the benchmark results representative?

Emma's personal records and the benchmark phones are synthetic, including the planted events and ordinary-life noise. The benchmark is a replay against known event truth, not a trial with real customers or evidence of prevented claims. Public journey sources are separate from those records, and a staged warning must be labelled rather than presented as current weather (ARCHITECTURE.md, journey and demo build; benchmarks/detect/README.md, method and caveats).

### What must change before real users can rely on this?

We need consented account integrations, platform permission review and testing on real-life variation before judging detection quality. Privacy work includes a data protection impact assessment, local storage protection, limited retention, connector contracts and an audited boundary against pricing and claims use. Sensitive events stay outside this demo, but source text can still contain sensitive information, so we must review minimisation and incidental inference before connecting real accounts (ARCHITECTURE.md, signal sources and open items; PRIVACY.md, minimisation, special categories, platform policy and DPIA outline; benchmarks/detect/README.md, caveats).
