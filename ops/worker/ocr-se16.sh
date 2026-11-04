#!/usr/bin/env bash
# SPEC 63 SE-16: column-aware re-OCR of the ЕСУМ scans, PAR shard processes (default 4), nice 19, resumable (existing page files skipped), detached.
# Usage: nohup ops/worker/ocr-se16.sh [vols...] > ~/logs/se16-ocr.out 2>&1 &
set -uo pipefail
# shared worker environment (SPEC 63 RS-3)
source "$(dirname "${BASH_SOURCE[0]}")/env.sh" 2>/dev/null || true
PAR=${PAR:-4}; export PAR
mkdir -p "$HOME/logs"
for k in $(seq 0 $((PAR-1))); do SHARD=$k node "$(dirname "$0")/ocr-se16.mjs" "$@" & done
wait; echo "$(date -Is) se16 ocr finished"
