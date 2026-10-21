#!/usr/bin/env bash
# SPEC 63 HV-5: the HV-5 harvesters one after another (the harvester box is a t3a.small: at most one extra harvester at a time).
# Order: research/44 pages (tier 1) → gaps named by research/45 (Запоріжжя, Волинь, hetman chancery) → АЮЗР → Сумцов/Руданський/Черемшина → the other litopys pages (tier 2).
# Resumable (every step resumes from its own index.jsonl); a step that stops (403/429/5xx/disk cap) does not stop the chain. Usage: setsid nohup bash harvest/hv5-chain.sh >> ~/logs/hv5.out 2>&1 &
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
NODE="${HARVEST_NODE:-$(command -v node)}"
TSX="$ROOT/node_modules/tsx/dist/cli.mjs"
step() { echo "$(date -u +%FT%TZ) [hv5-chain] start: $*"; "$NODE" "$TSX" "$@"; echo "$(date -u +%FT%TZ) [hv5-chain] exit $? : $*"; }
step harvest/hv5.ts 1
step harvest/archive.ts archive-hv5-gaps
step harvest/archive.ts archive-ayuzr
step harvest/archive.ts archive-hv5-authors
step harvest/hv5.ts 2
echo "$(date -u +%FT%TZ) [hv5-chain] all steps finished"
