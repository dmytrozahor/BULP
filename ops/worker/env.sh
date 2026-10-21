# Shared environment of every BULP worker script (source it, do not execute it).
# ONE place for the settings that used to be repeated per script: rs2-warm.sh set a 16 GB heap of its own and ran out of memory in the build.
# Override from the caller, e.g. BULP_HEAP_MB=64000 bash chain.sh
export BULP_REPO="${BULP_REPO:-$HOME/BULP}"
export BULP_LOGS="${BULP_LOGS:-$HOME/logs}"
export NODE_OPTIONS="--max-old-space-size=${BULP_HEAP_MB:-48000}"
export UV_BIN="${UV_BIN:-$HOME/.local/bin/uv}"
export TESSDATA_PREFIX="${TESSDATA_PREFIX:-$HOME/tessdata}"
# idle-stop: a dirty/unpushed git worktree untouched for longer than this (s) only warns and no longer blocks the stop
export BULP_WT_MAX_AGE_S="${BULP_WT_MAX_AGE_S:-86400}"
# SPEC 63 GG-5: how much of the vocab-only sources the ingest reads (the licence keeps them out of the KWIC, so they only add vocabulary and N-vocab; the full-text N is counted apart)
#   BULP_WIKI_STRIDE: every k-th BUNDLE of wikipedia-uk (1 = the whole dump, ≈ 348 M words; 10 = ≈ 35 M)    BULP_HPLT_LIMIT: HPLT shards read (0 = every harvested shard)
export BULP_WIKI_STRIDE="${BULP_WIKI_STRIDE:-1}"
export BULP_HPLT_LIMIT="${BULP_HPLT_LIMIT:-0}"
export OMP_THREAD_LIMIT="${OMP_THREAD_LIMIT:-1}"
case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) export PATH="$HOME/.local/bin:$PATH" ;; esac   # cron has a minimal PATH
mkdir -p "$BULP_LOGS/runs" "$BULP_LOGS/done" 2>/dev/null
