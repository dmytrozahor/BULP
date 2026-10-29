#!/bin/bash
# chain.sh step `reparse` (SPEC 63 GG-18): the parsers that build:data does NOT run. A parser change (sum-scan VER, parse-se-dicts ptrs) used to reach the build only if someone ran ingest.sh /
# harvest/se-chain.sh by hand, so xr.json came out empty (0 pointers). Here, before `build`:
#   - sum11 / sum20: pipelines/sum-scan.ts when the signature (scan sizes + parser code, env.sh sumsig) differs from the done-marker shared with ingest.sh. Per-volume resumable; the volumes re-read only when
#     VER / the file size changed. Measured on the worker: СУМ-11 ≈ 3 s per volume (11 volumes), СУМ-20 ≈ 20 s per volume (15 volumes): ≈ 5-6 min for a full reparse.
#   - OCR dictionaries: pipelines/parse-se-dicts.ts (idempotent: an output whose srcBytes matches and that has `ptrs` is kept; seconds per dictionary), if the harvest dump is on this machine.
# RS-1: both are resumable, atomic (tmp + rename), idempotent; a failure fails the step (chain.sh --from reparse resumes). Markers are written only after success.
. "$(dirname "$(readlink -f "$0")")/env.sh"
cd "$BULP_REPO" || exit 1
D=$BULP_LOGS/done; mkdir -p "$D"
drop() { for m in build unlinked vitest vuetsc vitebuild budget; do rm -f "$D/$m"; done; }
for s in sum11 sum20; do
  ls "$BOOKS/$s"/${s}_t* 2>/dev/null | grep -qv '\.up$' || { echo "reparse $s: no scans under $BOOKS/$s, skipped"; continue; }
  sig=$(sumsig $s)
  if [ -f "$D/$s" ] && [ "$(cat "$D/$s")" = "$sig" ]; then echo "reparse $s: up to date"; continue; fi
  echo "reparse $s: running sum-scan $(date +%T)"
  nice -n 19 npx tsx pipelines/sum-scan.ts $s || { echo "reparse $s FAILED" >&2; exit 1; }
  echo "$sig" > "$D/$s"; drop
done
HV=${SE_HARVEST:-data/raw/harvest/se-dicts}
if [ -f "$HV/index.jsonl" ]; then
  echo "reparse se-dicts: parse-se-dicts $(date +%T)"
  npx tsx pipelines/parse-se-dicts.ts "$HV" data/work/se-parsed > "$BULP_LOGS/parse-se.last.out" || { echo "reparse se-dicts FAILED" >&2; exit 1; }
  tail -3 "$BULP_LOGS/parse-se.last.out"
else echo "reparse se-dicts: no harvest dump, skipped"; fi
