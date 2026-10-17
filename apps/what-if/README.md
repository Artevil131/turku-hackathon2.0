# What if…

Paste the ad for something you are about to sign for (a used car, a flat for sale, a flat for rent) and see
three things to ask, the real cost over the next years, what could go wrong and who pays, and the safer
choice. The If challenge entry; it replaces Ahead. The business model and pitch are in [PLAN.md](PLAN.md).

Live: https://claude.ai/artifact/7SUmD83heokewMBwhrvcho (private link; ask Vaishnav for access).

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole app in one file. Works offline from disk, contacts no outside server. |
| `data/*.json` | Fact-checked source data with a source on every number (see `data/README.md`): Traficom's 2025 inspection statistics by make, model and first registration year; renovation life cycles and costs; used-car, rental and housing rules; 12 test ads in real site formats. |
| `tools/build-data.mjs` | Builds the compact data from `data/` and writes it into `index.html`. Run after changing anything in `data/`. |
| `test/reader.test.mjs` | Runs the page's own engine against the 12 test ads in Node. Currently 12 of 12 pass. |

```
node apps/what-if/tools/build-data.mjs
node apps/what-if/test/reader.test.mjs          # pass/fail per field
node apps/what-if/test/reader.test.mjs --show   # also print each result's asks and who pays
```

## How it works

`createEngine(DATA, today)` in `index.html` (between `/* engine:start */` and `/* engine:end */`) has two steps:

1. **`read(adText)`** finds the kind (`car`, `home`, `rent`) and pulls out the fields with rules, no AI. The
   fields the rules use are listed in `CORE` in `test/reader.test.mjs`, for example `make`, `model`, `year`,
   `km`, `price`, `sellerType` for cars, `buildingYear`, `livingAreaM2`, `debtFreePrice`,
   `pipeRenovation.status` for homes, `rent`, `deposit` for rentals.
2. **`analyse(adText)`** turns those fields plus the data into the result: the three asks, the costs, the
   who-pays label on every what-if ("Not covered, you pay" or "Covered by insurance, after your excess"),
   the safer choice and the sources.

## Where an LLM fits (for Aapo)

- **Reading the ad, yes.** An LLM can replace or back up `read()`: return the same fields as JSON for messier
  ads (other sites, free text, other languages). Check it against the same 12 tests: `expected` in
  `data/sample-ads.json` has the right values for every ad.
- **Numbers and who pays, no.** Keep costs, failure rates, renovation shares and the who-pays labels coming
  from the rules and the data in step 2, so every number has a source and nothing is made up. An LLM may word
  the three questions from the rule output, but should not invent figures.
- **Keep the rule reader as the fallback** when the LLM call fails or is slow, so the demo never breaks.
- **Privacy note:** the page currently promises that nothing leaves the browser until "Get a quote". Sending
  the ad text to an LLM API changes that; ads are public text, but the page should say so, or the call should
  go through If's own server.

## Rules we keep

- Every what-if states facts ("if this happens, who pays"), never personal advice.
- If does not pay for car breakdowns or wear; those what-ifs are labelled "Not covered, you pay".
- Nothing is priced on using the tool or on anything guessed about the person.
