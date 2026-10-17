#!/usr/bin/env bash
# Runs on chili from a systemd user timer (sync.timer), installed once by
# copying (README.md); the installed copy runs, never the checkout's.
#
# Every run: fetch main of the public repo into a deploy checkout, read
# deploy/listing-model/model.env through a whitelist into
# ~/llm/etc/project-model.env, and if that changed while the project pin
# (~/llm/autopilot.pin) exists, restart NInfer with it through Slurm.
# Nothing from the repo is executed or sourced; values are copied only
# when they match the pattern below. ~/llm/etc/ninfer.env reads
# project-model.env while the pin exists, so a crash or reboot brings
# the project's model back, not the personal default.
set -euo pipefail

REPO="${REPO:-https://github.com/Artevil131/turku-hackathon2.0.git}"
CHECKOUT="${CHECKOUT:-$HOME/deploy/turku-hackathon2.0}"
LLM="${LLM:-$HOME/llm}"
OUT="$LLM/etc/project-model.env"
PIN="$LLM/autopilot.pin"
MODELS="${NINFER_MODELS:-$LLM/ninfer/models}"
JOB_NAME=ninfer-qwen38
KEYS="NINFER_ARTIFACT SERVED_NAME NINFER_MAX_CONTEXT NINFER_KV_CAPACITY NINFER_SPEC NINFER_DRAFT_TOKENS NINFER_VISION"

log() { echo "[$(date -Is)] $*"; }

if [ ! -d "$CHECKOUT/.git" ]; then
  mkdir -p "$(dirname "$CHECKOUT")"
  git clone --quiet --depth 1 --branch main "$REPO" "$CHECKOUT"
fi
git -C "$CHECKOUT" fetch --quiet --depth 1 origin main
git -C "$CHECKOUT" reset --quiet --hard FETCH_HEAD
sha=$(git -C "$CHECKOUT" rev-parse --short HEAD)

src="$CHECKOUT/deploy/listing-model/model.env"
[ -f "$src" ] || { log "no $src at $sha; nothing to do"; exit 0; }

new=$(mktemp)
trap 'rm -f "$new"' EXIT
echo "# from turku-hackathon2.0 $sha deploy/listing-model/model.env (sync.sh)" >"$new"
for key in $KEYS; do
  value=$(grep -E "^${key}=" "$src" | tail -1 | cut -d= -f2- || true)
  [ -n "$value" ] || continue
  if ! [[ "$value" =~ ^[A-Za-z0-9._-]{1,80}$ ]]; then
    log "refusing $key: value does not match the allowed pattern"
    exit 1
  fi
  echo "$key=$value" >>"$new"
done
artifact=$(grep -E '^NINFER_ARTIFACT=' "$new" | cut -d= -f2- || true)
if [ -n "$artifact" ] && { [[ "$artifact" != *.ninfer ]] || [ ! -f "$MODELS/$artifact" ]; }; then
  log "refusing: artifact $artifact is not on chili ($MODELS); keeping the running settings"
  exit 1
fi

# Compare without the provenance line, so a new commit that does not touch model.env changes nothing.
if [ -f "$OUT" ] && diff -q <(grep -v '^#' "$OUT") <(grep -v '^#' "$new") >/dev/null; then
  exit 0
fi
install -m 0644 "$new" "$OUT"
log "project model settings now from $sha: $(grep -v '^#' "$OUT" | tr '\n' ' ')"

if [ ! -f "$PIN" ]; then
  log "not pinned; settings stored, model left as it is"
  exit 0
fi
job=$(squeue -h -u "$USER" -n "$JOB_NAME" -o %i | head -1)
if [ -n "$job" ]; then
  log "restarting: cancelling job $job"
  scancel "$job"
  for _ in $(seq 60); do
    squeue -h -j "$job" -o %i 2>/dev/null | grep -q . || break
    sleep 2
  done
fi
"$LLM/bin/serve-ninfer-slurm"
