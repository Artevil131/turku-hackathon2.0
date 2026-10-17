# What if…: the pitch

The two-minute video is required (organisers: "not a second longer than 2 minutes"), and any team may be
asked to pitch on stage ("demos are better than slideshows"). Both are the live site, with a few words on
the business. Every number below is what the site shows for its own examples; the ads are synthetic
(AGENTS.md).

## The 2-minute video

`scripts/what-if-video/build.ts` films the live site in a phone frame, voices these lines with Kokoro's
"Michael" (D-030), shows them as captions, and writes `pitch/video/out/what-if-pitch.mp4` (1:58.7) and
`pitch/video/out/script.txt` (these lines with their times).

| At | Part | Spoken | On screen |
|---|---|---|---|
| 0:00 | Title | "Insurers find out how it ends when the claim comes in." | Title card |
| 0:04 | Title | "What if… tells you before you sign." | Title card |
| 0:07 | A car | "I'm 18, buying my first car: a 2009 BMW for €6,900." | The BMW ad in the box |
| 0:15 | A car | "What if… checks the ad against real data." | "Checking…", then the result |
| 0:19 | A car | "Is the clutch the original? If it slips on the test drive, ask for €700 off." | Question 1 and its tip: ask for €700 off |
| 0:26 | A car | "Almost half of these BMWs failed their last inspection." | Question 2, the inspection bars: 45.8 %, all 2009 cars 35.9 % |
| 0:32 | What it costs | "Over two years, it really costs about €12,000." | What it really costs you, ≈ €12,000 |
| 0:37 | What it costs | "When the seller replies, it writes my answer for me." | "The seller replied?", the answer to the seller |
| 0:41 | What it costs | "That's €700 in my pocket, before I even own the car." | Offer €6,200, you keep €700 |
| 0:47 | Who pays | "Every what-if says who pays." | What if something goes wrong: Who pays |
| 0:50 | Who pays | "What if I crash? Covered with full kasko, after the excess." | "Covered with full kasko · after your excess", ringed in blue |
| 0:55 | Who pays | "What if the gearbox breaks? That's not covered: I pay." | "Not covered · you pay" on the breakdown, ringed in red |
| 0:59 | A flat | "Same for a home: if the pipe renovation starts next year, my share is about €51,600." | The flat example, question 1 |
| 1:09 | How you use it | "All you do is paste the text from the ad, or attach up to 4 screenshots." | The empty box, then two moped screenshots dropped on it |
| 1:14 | How you use it | "It asks before anything is sent." | "Send these 2 screenshots?" |
| 1:17 | How you use it | "Our own AI model reads it, and every fact has to quote the ad." | The draft card, who pays |
| 1:23 | Why If wins | "For If, the check is free, and it reaches people right when they need insurance." | Drive it home: "Get reminders for this car." |
| 1:29 | Why If wins | "The quote comes already filled in, so winning that customer costs almost nothing." | The car's details already filled in, Get a quote |
| 1:35 | Why If wins | "After signing, If customers get reminders that prevent claims, a logbook (huoltokirja) for the car or home, and a guarantee behind every who-pays label." | After you buy: "Frost on your route tomorrow", the reminders |
| 1:46 | Why If wins | "So they stay longer, add a policy at every life event, and claim less: the customers who bring If the most money." | The reminders |
| 1:54 | End | "What if… See the what-ifs before you sign." | End card with the address |

### Making it

    FFMPEG=…/ffmpeg.exe KOKORO=…/say.mjs node scripts/what-if-video/build.ts --voice kokoro:am_michael --speed 1.05

The voice is Kokoro, a free speech model with open weights (Apache-2.0) that runs on this computer
(D-030). `scripts/what-if-video/say.mjs` runs it: copy it to a folder of its own, run
`npm install kokoro-js@1.2.1` there, and point `KOKORO` at the copy. `--voice none` gives a silent,
captioned version instead. A run takes about two minutes and uses 2 of the team's 120 AI reads an hour.
Voiced lines are kept in `pitch/video/out/voice`, so only changed lines are voiced again; `--plan` prints
each line's length and stops, for fitting the script under 2:00 without filming.

### Putting it online

Upload `what-if-pitch.mp4` to YouTube as Public (the organisers ask for a public video), check that it
plays when signed out, and put the link on the form. Not made for kids; no altered content (that question
covers making real people or events look real, and the description says the voice is text-to-speech).

- **Title:** What if… See the what-ifs before you sign (JunctionX Turku 2026, If challenge)
- **Description:**

      What if… is our entry for If's challenge "If Insurance Could Do More" at JunctionX Turku 2026, by
      Artem, Aapo and Vaishnav.

      Paste the text of an ad you're about to sign for, or attach up to 4 screenshots of it. Before you
      sign, you see three things to ask, what it really costs, who pays for each what-if, and the safer
      choice.

      Try it: https://what-if.what-if.workers.dev
      Code: https://github.com/Artevil131/turku-hackathon2.0

      The ads in the video are made up for the demo. The voice is Kokoro text-to-speech.

## The deck

`pitch/deck/deck.html`, seven slides in the app's look, kept short: the title; "Imagine" (a first car at
18, a first home); the live demo, with a still that links to the video in case the live demo fails; the
business model (what the customer gets, the loop, what If gets); why it works (live, real data, our own
AI, private, honest); how people find it; what If needs to launch it. What to say on each slide is in
`pitch/SPEAKER-NOTES.md`. `node scripts/what-if-deck/build.ts` prints the deck to `pitch/what-if-deck.pdf`
in about 10 seconds.

## On stage, about 10 minutes

The deck, with a live demo of about four and a half minutes in the middle: the car, the flat, and two
screenshots read by the AI. The timings, what to click and what to say are in `pitch/SPEAKER-NOTES.md`.

Questions the judges are likely to ask, with answers: `pitch/QA.md`.
