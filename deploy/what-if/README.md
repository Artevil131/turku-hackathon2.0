# What if… on Cloudflare

Live at **https://what-if.what-if.workers.dev** (DECISIONS.md D-028, D-029): the page from
`apps/what-if/index.html`, served by a Worker on Cloudflare's free plan, plus one route,
`POST /api/read`, that passes ads the page's rules can't read, or a screenshot the person chose
to send, to the team's listing reader on chili (Qwen3.8-27B, D-024–D-027) and answers in
What if…'s own fields. Nothing is stored.

| File | What it is |
|---|---|
| `wrangler.jsonc` | The Worker: static assets from `public/`, `/api/*` to `worker.js` |
| `worker.js` | `/api/read`: takes `{text}` (phone numbers and emails stripped) or `{image}` (a PNG, JPEG or WebP data URL), asks the listing reader with the team token, and translates its quote-checked answer into the page's fields, or a draft for kinds we have no facts for. For a screenshot it also returns `transcript`, the text the reader read off it |
| `build.mjs` | Puts the page into `public/` as last committed (`git show HEAD`), so a half-edited working copy never goes live; `WHATIF_WORKTREE=1` takes the working copy instead |

## Secrets

Two Worker secrets, never in the repo or the page:

- `AHEAD_ADDRESS`: the listing reader's address. It is a temporary Cloudflare Tunnel address and
  **changes when chili restarts**; ask Aapo for the current one and set it again.
- `AHEAD_TEAM_TOKEN`: the team token (Aapo's notes: never commit it or paste it into a chat).

Without them, or when the reader is down, over the team's 120 ads an hour, or at an old address,
`/api/read` answers `ai_unavailable` within a second and the page uses its rules.

## Commands

On Windows, if PowerShell refuses `npx` ("running scripts is disabled"), use `npx.cmd`.

    npx.cmd wrangler login                        # once; your browser asks you to allow it
    cd deploy/what-if
    npx.cmd wrangler deploy                       # publish the page and the Worker
    npx.cmd wrangler secret put AHEAD_ADDRESS     # paste the reader's current address
    npx.cmd wrangler secret put AHEAD_TEAM_TOKEN  # paste the team token
    npx.cmd wrangler logout                       # after the pitch

## Checking it

`node scripts/what-if-ai-eval.mjs` sends the 21 sample ads to `/api/read` on the live site and
scores the fields against the sample answers. It uses 21 of the team's 120 ads an hour.

## Free-plan limits

100,000 Worker requests a day; serving the page itself is free and unlimited.
