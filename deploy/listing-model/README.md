# The listing model: how to change the AI

The "Analyse an ad" feature (D-024), an experimental AI reader beside the If entry What if… (`apps/what-if`, rule-based, D-017, D-018), has two halves, and both are changed
through this repository. Nobody needs an account on the GPU server.

| What you want to change | Where | When it takes effect |
|---|---|---|
| What the model is told | `libs/listing/src/prompt.ts` | When the API is restarted from `main` (the demo machine runs `node apps/api/src/server.ts`) |
| What it must answer (fields, categories, risks it may name) | `libs/listing/src/schema.ts` | Same |
| What is kept and what is dropped | `libs/listing/src/validate.ts` | Same |
| Risks, costs, sources | `libs/listing/src/risks.ts`, `timeline.ts`, `lookups.ts` | Same |
| Which model runs and how (weights, context, decoding, image input) | `deploy/listing-model/model.env` | Within about five minutes of the merge to `main`: chili restarts the model (about 2–3 minutes of downtime) |

## Working on the prompt

1. Edit `libs/listing/src/prompt.ts` (or the schema, the rules).
2. Unit tests: `pnpm test` (no model needed).
3. Accuracy against the 21 synthetic ads: `node benchmarks/listing/run.ts`
   (add `--images` for screenshots). This needs the model; whoever has the
   tunnel to chili (Aapo) runs it, or ask in the chat.
4. Put the benchmark summary in the pull request. A change that invents a
   field or a risk (`invented` above 0) is not merged.

Never put a real ad from a real person into `data/`; the ads there are
written by hand (`data/synthetic/listings.json`).

## How the model stays up

The model is Qwen3.8-27B (NVFP4) served by NInfer on chili's RTX 5090, as a
Slurm job on the `live` partition. It is pinned: `~/llm/autopilot.pin` on
chili stops the idle autopilot from unloading it. While the pin exists, a
crash or a reboot brings back the project settings from `model.env`, not
the server owner's personal default. Removing the pin (Aapo) ends that.

`sync.sh` runs on chili every five minutes (`sync.timer`, `sync.service`):
it fetches `main`, reads `model.env` through a whitelist (the keys listed
in it; values of letters, digits, `.`, `-`, `_`; the weights must already
be on chili) and restarts the model only when the values changed. Nothing
from the repository is executed. Adding new weights needs a download on
chili, which is asked for first (AGENTS.md: over 1 GB).

## Installing the sync on chili (once, by the server owner)

    scp deploy/listing-model/sync.sh chili:llm/bin/hackathon-model-sync
    scp deploy/listing-model/sync.service chili:.config/systemd/user/hackathon-model-sync.service
    scp deploy/listing-model/sync.timer chili:.config/systemd/user/hackathon-model-sync.timer
    ssh chili 'chmod +x ~/llm/bin/hackathon-model-sync && systemctl --user daemon-reload && systemctl --user enable --now hackathon-model-sync.timer'

and, so a restart while pinned uses the project settings, near the top of
`~/llm/etc/ninfer.env` (before the defaults):

    if [ -f /home/aapo/llm/autopilot.pin ] && [ -f /home/aapo/llm/etc/project-model.env ]; then
      while IFS="=" read -r _k _v; do
        case "$_k" in ""|\#*) continue ;; esac
        [ -z "${!_k:-}" ] && export "$_k=$_v"
      done < /home/aapo/llm/etc/project-model.env
      unset _k _v
    fi

Uninstall: `systemctl --user disable --now hackathon-model-sync.timer`,
remove that block, and `rm ~/llm/autopilot.pin`.
