#!/usr/bin/env bash
# SPEC 63 HV-5 (owner decisions 2026-10-21): runs AFTER harvest/hv5-chain.sh has finished (one extra harvester at a time):
# Сковорода (hv5.ts tier 3, 1973 academic edition, dated per work) → the original 19th-c. editions of Величко, Грабянка, Історія Русів (hv5-orig.ts).
# Usage: setsid nohup bash harvest/hv5b-chain.sh >> ~/logs/hv5.out 2>&1 &
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
NODE="${HARVEST_NODE:-$(command -v node)}"
TSX="$ROOT/node_modules/tsx/dist/cli.mjs"
while pgrep -f "harvest/hv5-chain.sh" >/dev/null; do sleep 60; done
step() { echo "$(date -u +%FT%TZ) [hv5b-chain] start: $*"; "$NODE" "$TSX" "$@"; echo "$(date -u +%FT%TZ) [hv5b-chain] exit $? : $*"; }
step harvest/hv5.ts 3
step harvest/hv5-orig.ts
echo "$(date -u +%FT%TZ) [hv5b-chain] all steps finished"
