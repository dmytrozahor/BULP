#!/bin/bash
# prints the current import/build step and log tails
. "$(dirname "$(readlink -f "$0")")/env.sh"
cd "$BULP_REPO" 2>/dev/null
echo "== step: $(cat ~/import-step 2>/dev/null || echo unknown)"
echo "== latest chain run: $(cat "$BULP_LOGS/chain.status" 2>/dev/null | head -3)"
echo "== procs"; pgrep -af 'harvest|build:data|vitest|tsx|node' | grep -v pgrep | head -10
echo "== git"; git status --short | head -15; git log --oneline | head -5
for f in "$BULP_LOGS"/*.log; do [ -f "$f" ] && { echo "== $f"; tail -n 8 "$f"; }; done 2>/dev/null
