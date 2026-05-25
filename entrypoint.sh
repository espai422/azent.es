#!/bin/sh
set -e

if [ -n "$CODEX_AUTH_JSON" ]; then
  mkdir -p /root/.codex
  echo "$CODEX_AUTH_JSON" > /root/.codex/auth.json
fi

exec node .output/server/index.mjs
