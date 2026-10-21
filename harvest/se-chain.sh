#!/usr/bin/env bash
# SPEC 63 SE-10: the dated-sense dictionaries (Тимченко, СУМ XVI–XVII, Білецький-Носенко, Закревський, Словник мови Шевченка …) after the HV-5 chain
# (the harvester box is a t3a.small: at most one harvester beyond r2u/hv4). Waits until hv5-chain.sh has ended, then runs harvest/se-dicts.ts (resumable).
# Usage: setsid nohup bash harvest/se-chain.sh >> ~/logs/se-dicts.out 2>&1 &
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
NODE="${HARVEST_NODE:-$(command -v node)}"
TSX="$ROOT/node_modules/tsx/dist/cli.mjs"
while pgrep -f 'harvest/hv5-chain.sh' >/dev/null || pgrep -f 'harvest/hv5.ts' >/dev/null || pgrep -f 'harvest/archive.ts' >/dev/null; do sleep 300; done
echo "$(date -u +%FT%TZ) [se-chain] start harvest/se-dicts.ts"
"$NODE" "$TSX" harvest/se-dicts.ts
echo "$(date -u +%FT%TZ) [se-chain] exit $?"
