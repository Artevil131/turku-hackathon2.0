# Submission: What if…

The organisers' form, field by field, ready to copy. Phone numbers and Discord usernames go into the
form only, never into this repository.

## Project name

What if…

## Punchline

See the what-ifs before you sign.

## Description

People meet insurance at the worst moment: after the timing belt snaps, after the pipe renovation bill
arrives, after the leak. What if… moves that moment to before you sign.

Paste the ad for something you're about to buy or rent (a used car or motorcycle, a flat for sale, a
flat to rent) or drop in screenshots of it. You see three things to ask the seller, what it really costs
over the next two years, what could go wrong, and for every what-if who pays: "Not covered · you pay" or
"Covered by insurance · after your excess". Then the safer choice, and a hand-over to an If quote with the
details already filled in.

Every number has a source: Traficom's 2025 inspection statistics by make, model and year, Isännöintiliitto's
pipe renovation costs, Finanssiala's leak damages, AutoJerry's garage prices, Finnish law, KKV and FINE. A 2009
BMW 320d for €6,900: 45.8% of 2009 BMW 3 Series cars failed their last inspection, against 35.9% of all 2009
cars and 26.7% of 2009 Toyota Avensis; over two years it really costs about €12,000. If the clutch slips on
the test drive, it says to ask for €700 off (a garage typically charges €719) and writes the reply to the
seller. A flat in a 1974 building: about €51,600 for the buyer's 58 m² if the pipe renovation comes.

Our rules read the common ad formats. When they can't (free text, a moped, a boat, a screenshot), our
team's own AI model reads the ad, and every field it returns must quote the ad. Only the ad leaves the
browser, without phone numbers or email addresses, and nothing is stored. The details go to If only when
the person asks for a quote.

For If, the check is free and reaches people days before they must buy insurance anyway. Everything after
signing is for If customers: reminders at the right moment, a logbook (huoltokirja) for the home or
vehicle, and a guarantee behind the who-pays labels. If earns from better customers: they stay longer, add
a policy at each life event, claim less because they chose safer and got warned, and cost less to win.

## Challenge

If Insurance Could Do More, by If Vahinkovakuutus Oyj (If P&C Insurance).

## Technologies used

- **The page:** one self-contained HTML, CSS and JavaScript file, no framework; works offline from disk.
- **The ad reader:** hand-written rules for the formats of Nettiauto, Autotalli, Nettimoto, Etuovi,
  Oikotie and Vuokraovi, in Finnish and English.
- **The data:** Traficom periodic inspection statistics 2025, Isännöintiliitto Putkiremonttibarometri 2026,
  Finanssiala leak damages, AutoJerry garage prices, Finlex (Sale of Goods Act, Consumer Protection Act,
  Insurance Contracts Act, Motor Liability Insurance Act and others), KKV, FINE and If's published terms;
  packed into the page by a Node.js script.
- **The AI reader:** Qwen3.8-27B (NVFP4) served with NInfer on the team's own RTX 5090 server, with
  quote-grounded validation: a field is kept only when the ad's own words contain it. It reads free text,
  screenshots and kinds the rules don't cover.
- **Hosting:** Cloudflare Workers on the free plan for the page and an `/api/read` proxy; the GPU server is
  reached through a Cloudflare Tunnel with a team token. Nothing is stored.
- **Tooling:** Node.js tests (17 sample ads through the rules, 110 tests of the AI path), Biome, Wrangler,
  GitHub.

## Links

- **Demo:** https://what-if.what-if.workers.dev
- **Source code:** https://github.com/Artevil131/turku-hackathon2.0 (What if… is in `apps/what-if`, its
  server in `deploy/what-if`, the AI reader in `libs/listing`)
- **Video pitch:** the YouTube or Vimeo link, once uploaded as public (the organisers ask for a public
  video)
- **Pitch deck:** `pitch/what-if-deck.pdf`

## Source code publicity

Public on GitHub.

## Credit

Team choice on the form.

## Team

Artem, Aapo and Vaishnav. Phone numbers and Discord usernames: on the form only.

## Try it in 30 seconds

1. Open https://what-if.what-if.workers.dev.
2. Tap an example (a flat, a car, a rental), or paste the text of a real ad from Nettiauto, Etuovi or
   Oikotie.
3. Or upload or drop up to four screenshots of an ad: the page asks before anything is sent.
