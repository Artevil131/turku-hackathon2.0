# The API on chili, behind a team token

**Taken down on 2026-10-18**, after the hackathon: `ahead-api`, `ahead-tunnel` and the
`hackathon-model-sync` timer are stopped and disabled on chili, and the team token is deleted
(only its hash is left in `~/.config/ahead/api.env`). To bring it back, follow the install below
and make a new token.

    phone / laptop ──HTTPS──▶ Cloudflare Tunnel ──▶ apps/api on chili (127.0.0.1:8787)
                                                      │  team token checked, ads per hour limited
                                                      ▼
                                                   NInfer, the model (127.0.0.1:8010)

- **The model** listens on chili's loopback only. Nothing outside chili
  reaches it except through the API.
- **The API** (`apps/api`) runs in a Node container (`api.service`) from
  the deploy checkout that `hackathon-model-sync` keeps on `main`, so a
  merged prompt or rule change is live within about five minutes.
  `/api/listing` needs `Authorization: Bearer <team token>`; the server
  keeps only the token's SHA-256 (`~/.config/ahead/api.env`) and reads at
  most 120 ads an hour (`AHEAD_LISTING_PER_HOUR`). Without a token hash
  it refuses every ad. `/api/share` and `/api/counts`, the demo's If
  side, stay open; they touch no model.
- **The tunnel** (`tunnel.service`, `cloudflared` in a container) is the
  only way in: chili opens no port.

## For teammates

In the app: Settings → Ad analysis server → the address and the team
token (ask Aapo). Both stay on your device. "Analyse an ad" then works
from anywhere. A 401 means the token is missing or old; a 429 means the
hour's limit is used up.

## Trust

Whoever can merge to `main` on GitHub runs code on chili: the API is our
code from `main`. It is boxed (container, 512 MB, 1 CPU) but on the host
network, so it can reach chili's other local services. Merge rights are
the boundary; review changes to `apps/api` and `libs/` accordingly.

## Install on chili (once, by the server owner)

    scp deploy/api/api.service chili:.config/systemd/user/ahead-api.service
    scp deploy/api/tunnel.service chili:.config/systemd/user/ahead-tunnel.service
    scp deploy/api/new-token.sh chili:llm/bin/ahead-new-token
    scp deploy/listing-model/sync.sh chili:llm/bin/hackathon-model-sync   # now also restarts the API on a new main
    ssh chili 'chmod +x ~/llm/bin/ahead-new-token && ~/llm/bin/ahead-new-token'   # prints the team token once
    ssh chili 'systemctl --user daemon-reload && systemctl --user enable --now ahead-api ahead-tunnel'
    ssh chili 'journalctl --user -u ahead-tunnel -n 30 | grep -o "https://[a-z0-9-]*\.trycloudflare\.com"'

Without a Cloudflare account that last line is the address, and it
changes whenever the tunnel restarts. For a fixed address: in the
Cloudflare dashboard create a tunnel, give it a public hostname (for
example `ahead-api.<your domain>`) pointing at `http://127.0.0.1:8787`,
and put its token on chili as `TUNNEL_TOKEN=...` in
`~/.config/ahead/tunnel.env` (mode 600), then
`systemctl --user restart ahead-tunnel`.

New token (the old one stops working): `ssh chili ~/llm/bin/ahead-new-token`.
Stop everything: `systemctl --user disable --now ahead-api ahead-tunnel`.
