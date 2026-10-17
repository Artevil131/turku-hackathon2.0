# What if…

Paste the ad for something you are about to sign for (a used car or motorcycle, a flat for sale, a flat for rent) and see
three things to ask, the real cost over the next years, what could go wrong and who pays, and the safer
choice. The If challenge entry; it replaces Ahead. The business model and pitch are in [PLAN.md](PLAN.md).

Live: https://claude.ai/artifact/7SUmD83heokewMBwhrvcho (private link; ask Vaishnav for access).

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole app in one file. Deployment copies it to the site root as is. Opened from disk or as the claude.ai artifact it is rules-only and contacts no outside server; on our own site it can also ask the AI reader (below). |
| `data/*.json` | Fact-checked source data with a source on every number (see `data/README.md`): Traficom's 2025 inspection statistics by make, model and first registration year; renovation life cycles and costs; used-car, motorcycle, rental and housing rules; 17 test ads in real site formats. |
| `tools/build-data.mjs` | Builds the compact data from `data/` and writes it into `index.html`. Run after changing anything in `data/`. |
| `test/reader.test.mjs` | Runs the page's own engine against the 17 test ads in Node, plus links, mopeds, snowmobiles, ATVs, houses and real-page quirks. Currently 17 of 17 pass. |
| `test/ai.test.mjs` | The AI-reader side with a mocked `/api/read`: contact stripping, when to call, results from AI fields, the draft card (`test/fixtures/ai-draft-moped.json`) and every fallback. Currently 80 of 80 pass. |

```
node apps/what-if/tools/build-data.mjs
node apps/what-if/test/reader.test.mjs          # pass/fail per field
node apps/what-if/test/reader.test.mjs --show   # also print each result's asks and who pays
node apps/what-if/test/ai.test.mjs              # the AI reader, mocked
```

## How it works

`createEngine(DATA, today)` in `index.html` (between `/* engine:start */` and `/* engine:end */`) has two steps:

1. **`read(adText)`** finds the kind (`car`, `moto`, `home`, `rent`) and pulls out the fields with rules, no
   AI. The fields the rules use are listed in `CORE` in `test/reader.test.mjs`, for example `make`, `model`,
   `year`, `km`, `price`, `sellerType` for cars, `buildingYear`, `livingAreaM2`, `debtFreePrice`,
   `pipeRenovation.status` for homes, `rent`, `deposit` for rentals.
   For motorcycles (`moto`): `make`, `model`, `year` (null when the ad doesn't say: the result then asks for
   it), `km`, `price`, `officeFee`, `engineCc`, `powerKw`, `licence` (`A1`, `A2` or `A`, worked out from
   cm³ and kW as a fact about the bike), `sellerType`, `city`, `lastInspection`, `abs` (true, false or null),
   `modified` and `modifications` (`lowered suspension`, `aftermarket exhaust`, `engine changes`). Mopeds,
   snowmobiles and ATVs come back as `unsupported`.
2. **`analyse(adText)`** turns those fields plus the data into the result: the three asks, the costs, the
   who-pays label on every what-if ("Not covered, you pay" or "Covered by insurance, after your excess"),
   the safer choice and the sources.

## The AI reader, for ads the rules can't read

The rules stay first. The page asks an AI model only when they can't give a full result, and only on our
own site: Cloudflare Workers (`*.workers.dev`) or localhost. The server is in `deploy/what-if`.

1. **When.** `plan(text)` calls the AI when the rules find no kind, an unsupported kind, or a kind without its
   key fields:
   - a car or motorcycle without make and model;
   - a flat for sale without a building year and a price;
   - a rental without a rent.

   Links and scraps of under 30 characters never go out, and none of the 17 sample ads makes a call.
2. **What goes out.** `stripContacts(text)` takes out:
   - e-mail addresses and phone numbers;
   - the seller's name where a site's layout shows it (Netti\*'s "Jäsenenä N vuotta" block, Oikotie's "Ota
     yhteyttä" block, "Name, puh." in free text).

   Then the first 12,000 characters go to `POST /api/read` as `{"text": …}`.
3. **What comes back.** `{ok, model, kind, fields, draft}`:
   - **`kind` car, moto, home or rent:** `fromAI()` checks each field (types, ranges, the same value lists
     as `CORE` in `test/reader.test.mjs`) and fills only what the rules didn't read. The rules' values win.
     The result is built by the same code as a rules result, with the model-key lookup and the licence class
     from cm³ and kW, so the numbers and who pays still come from our data. The page names the fields the AI
     read: "An AI model read these details from the ad: make and model. Check them against the ad."
   - **`kind` other:** `draftResult()` makes a card with the item, three asks and two to four what-ifs, each
     with who pays (`you`, `insurance`, `check`). It is marked "Written by AI from the ad. Not checked like
     our car, motorcycle and flat results." Anything with €, % or "euro" is dropped on the page as well as on
     the server, so a draft never carries a figure. The hand-over stays If's.
   - **`kind` none, any error, or no answer within 12 s:** the page does exactly what it did before, rules
     only.
4. **What the page says.** On our site: "If our rules can't read an ad, its text, without phone numbers or
   email addresses, goes through our server at Cloudflare to an AI model on our team's own computer.
   Nothing is stored, nothing about you is sent, and nothing goes to If." Anywhere else: "Nothing you paste
   leaves your phone." Both are true where they're shown.
5. **Which model.** `/api/read` passes the text to the team's listing reader (Qwen3.8-27B on chili, D-024–D-027)
   and translates its quote-checked answer into the fields above (`deploy/what-if/worker.js`, D-028).

## Rules we keep

- Every what-if states facts ("if this happens, who pays"), never personal advice.
- If does not pay for car breakdowns or wear; those what-ifs are labelled "Not covered, you pay".
- Nothing is priced on using the tool or on anything guessed about the person.
- The AI reads ads; it never sets a number or a who-pays label. Figures come from the rules and the sources.
- Only an ad's text goes to the AI, without contact details, and only from our own site.
