#!/usr/bin/env bash
# Run on chili: makes a new team token, stores only its SHA-256 in
# ~/.config/ahead/api.env, restarts the API and prints the token once.
# The old token stops working. Send the new one to the team privately.
set -euo pipefail
token=$(head -c 32 /dev/urandom | base64 | tr -d '/+=\n' | cut -c1-40)
hash=$(printf %s "$token" | sha256sum | cut -d' ' -f1)
mkdir -p ~/.config/ahead
umask 077
echo "AHEAD_API_TOKEN_SHA256=$hash" >~/.config/ahead/api.env
systemctl --user restart ahead-api.service 2>/dev/null || true
echo "Team token (shown once; only its hash is kept): $token"
