# Agents in this repository

Read README.md first. The rules below bind agents the same way they bind
people.

## Do not assume technical, product or legal-design choices

Ask the team before deciding anything that is not already recorded in
DECISIONS.md: languages, frameworks, models, thresholds, data sources,
what is read from the phone, what may leave it, how consent is worded.
State the options you see and what each costs, then wait. Once the team
decides, add the decision to DECISIONS.md in the same change that first
depends on it. Do not fill a gap with a "reasonable default".

## UI, UX, copy and design need no permission

Layout, visual design, copy, interaction and accessibility work can be
done straight away. Copy on consent screens is an exception: it is a
legal-design choice and goes through the team.

## Privacy rules that no change may weaken

- Nothing personal leaves the device except a confirmed event the user
  chose to share, or an opt-in anonymous count (ARCHITECTURE.md §2).
- No health, religion, sexuality, political or union signals, ever.
- No inferred data toward pricing, underwriting or claims, in code or in
  copy.
- Synthetic data in demos; a real account only with that person's
  explicit agreement and only on their own device.

## Placement

- Reusable logic (adapters, embedding, matcher, journey templates) goes
  in `libs/`, never inside an app. Apps only combine and present.
- Scripts in `scripts/`, deployment in `deploy/`, data in `data/`
  (git-ignored except `data/synthetic/`), reading notes in `research/`.

## The listing model (AI on the GPU server)

- Change the prompt, schema and rules in `libs/listing`; the model's
  settings in `deploy/listing-model/model.env`. Read
  `deploy/listing-model/README.md` first. Run the listing benchmark and
  put its numbers in the pull request; nothing that invents a field or a
  risk is merged.

## Records

- Ask before a download over 1 GB, a run over an hour, or anything that
  spends money, stating size, time or cost.
- Never push or open a pull request without explicit approval.
