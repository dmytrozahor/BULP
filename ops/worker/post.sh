#!/bin/bash
# Waits for ingest, then build:data, data:unlinked, verification. Stops at the first failure (step name in ~/import-step). Resumable via $BULP_LOGS/done/*.
# Fixed: it no longer deletes the done markers on start (a 50-minute build that had passed was never resumed). ingest.sh removes them when new data really arrived.
# Fails (non-zero) when ingest failed instead of waiting for ever. For publishing use chain.sh (which owns upload/commit/push).
. "$(dirname "$(readlink -f "$0")")/env.sh"
cd "$BULP_REPO" || exit 1
D=$BULP_LOGS/done
while [ ! -f $D/hplt ]; do
  grep -q 'ingest FAILED' ~/import-step 2>/dev/null && { echo "ingest failed: $(cat ~/import-step)"; exit 1; }
  grep -q 'ingest done' ~/import-step 2>/dev/null && [ ! -f $D/hplt ] && { echo "ingest finished without hplt marker" ; exit 1; }
  sleep 30
done
step() { # name cmd...
  local n=$1; shift
  [ -f $D/$n ] && { echo "skip $n"; return 0; }
  echo "$n $(date +%T)" > ~/import-step
  local t0=$(date +%s)
  /usr/bin/time -v "$@" > $BULP_LOGS/$n.out 2> $BULP_LOGS/$n.time
  local rc=$?
  echo "$n rc=$rc secs=$(( $(date +%s) - t0 )) peakKB=$(grep 'Maximum resident' $BULP_LOGS/$n.time | awk '{print $NF}')" | tee -a $BULP_LOGS/steps.log
  tail -n 15 $BULP_LOGS/$n.out
  [ $rc -eq 0 ] && touch $D/$n || { echo "FAILED $n" > ~/import-step; exit $rc; }
}
step build npm run build:data
step unlinked npm run data:unlinked
step vitest npx vitest run --maxWorkers=16
step vuetsc npx vue-tsc --noEmit
step vitebuild npx vite build
step budget npx tsx pipelines/budget.ts dist
echo "post done $(date +%T)" > ~/import-step
