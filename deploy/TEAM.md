# The AI ad reader: notes for the team

"Analyse an ad" reads an ad (pasted text or a screenshot) with a language
model, Qwen3.8-27B, running on Aapo's GPU server. It is an **experimental
reader beside What if…**, which is our If entry and reads ads with rules
(DECISIONS.md D-017, D-018, D-024). Whether What if… should use the AI
reader too is an open question for the team (DECISIONS.md, Open).

What you can do without any server access: use it, call it, change how it
reads ads, change which model settings run, and measure the result.

## 1. Use it

1. Ask Aapo for the **address** and the **team token**.
2. In the app: Settings → *Ad analysis server* → paste both. They stay on
   your device.
3. Home → *Analyse an ad* → paste an ad or choose a screenshot.

The token is a password for the GPU. Never commit it, paste it into a
chat channel, or show it on a screen recording. If it leaks, tell Aapo;
a new one replaces it for everyone.

The address is a temporary Cloudflare address for now and **changes when
the server restarts**. If the app suddenly cannot connect, ask for the
current one.

### Errors

| You see | Meaning |
|---|---|
| "needs the team token" (401) | Token missing, mistyped or replaced. Check Settings, or ask for the new one |
| "limit of ads for this hour" (429) | The whole team shares 120 ads an hour. Wait, or tell Aapo if this keeps happening |
| "could not reach" / 502 | The server or the model is restarting (a model change takes 2–3 minutes), or the address changed |

### Calling it directly

    curl -X POST "$AHEAD_ADDRESS/api/listing" \
      -H "authorization: Bearer $AHEAD_TEAM_TOKEN" \
      -H "content-type: application/json" \
      -d '{"text": "Myydään Toyota Yaris 2012, 185 tkm, 6 900 €, Turku."}'

Body is `{"text": "..."}` or `{"image": "data:image/png;base64,..."}`
(PNG, JPEG or WebP, up to about 6 MB). The answer is the facts with the
words they came from, the risks with their sources, the ten-year costs,
and the text the model read. Nothing you send is stored on the server.

## 2. Change how it reads ads

Everything is in this repository. A change merged to `main` is live on the
server within about five minutes.

| To change | Edit |
|---|---|
| What the model is told | `libs/listing/src/prompt.ts` |
| The answer's shape: fields, categories, risks it may name | `libs/listing/src/schema.ts` |
| What is kept and what is dropped as unsupported | `libs/listing/src/validate.ts` |
| Risk cards, costs and their sources | `libs/listing/src/risks.ts`, `timeline.ts` |
| Open-data lookups (prices by postcode, inspection statistics) | `libs/listing/src/lookups.ts`, data refreshed by `libs/listing/scripts/fetch-*.ts` |
| The test ads and their right answers | `data/synthetic/listings.json` |
| Which model settings run | `deploy/listing-model/model.env` (below) |

The rule that matters most: **every fact and every risk must quote the
ad**, and the value must be written in its quote, or it is dropped. A
change that makes the model invent things is not merged.

### Model settings

`deploy/listing-model/model.env` holds the settings the server applies
after a merge: which weights, context length, speculative decoding, and
image input. Only the keys already in the file are read, values are
plain words and numbers, and the weights must already be on the server
(new weights: ask Aapo; they are tens of gigabytes). A change restarts
the model, so the reader is down for 2–3 minutes; avoid it close to the
pitch.

## 3. Measure before and after

Unit tests (no model, a few seconds):

    pnpm test

Accuracy on the 21 synthetic ads, through the live server (21 of the
team's 120 ads an hour; twice that with `--images`):

    AHEAD_TEAM_TOKEN=... node benchmarks/listing/run.ts --api "$AHEAD_ADDRESS"
    AHEAD_TEAM_TOKEN=... node benchmarks/listing/run.ts --api "$AHEAD_ADDRESS" --images

It prints, per ad, what was missed, wrong or invented, and a summary.
The last recorded numbers are in `benchmarks/listing/README.md`: 161 of
162 facts right, none wrong, none invented, 13 of 13 mentioned risks.

The server runs what is on `main`, so the benchmark measures `main`, not
your branch. The working order is:

1. Run the benchmark on `main` and keep the summary.
2. Make the change in a branch, `pnpm typecheck && pnpm check && pnpm test`.
3. Open a pull request with the reason and the "before" numbers.
4. After the merge (about five minutes), run the benchmark again and add
   the "after" numbers to the pull request. If anything got worse, and
   especially if `invented` is above 0, revert.

## 4. Rules that still apply

- Test ads are written by hand. Never put a real person's ad, name, phone
  number or screenshot in the repository.
- The consent sheet's wording is a legal-design choice and goes through
  the team (AGENTS.md). Its draft is marked in
  `apps/web/src/screens/Listing.tsx`.
- No ad data toward pricing, underwriting or claims, in code or in copy.
- **Merging to `main` runs code on Aapo's server** (the API runs from
  `main`). Review changes to `apps/api` and `libs/` as you would a
  deployment.

## Who to ask

Aapo: the address, the token, new model weights, anything about the
server.
