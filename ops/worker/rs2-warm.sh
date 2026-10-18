#!/bin/bash
# RS-2: two consecutive warm verification builds. Never uploads/commits/pushes. public/data and analysis are restored from a copy at the end.
# Heap and UV_BIN come from env.sh (48 GB; the old private 16 GB setting ran out of memory).
. "$(dirname "$(readlink -f "$0")")/env.sh"
cd "$BULP_REPO" || exit 1
S=$BULP_LOGS/rs2-warm.status
ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('src/data/data-version.json','utf8')).buildId)")
B=~/pubdata-$ID
echo "RUNNING backup $(date +%T)" > $S
mkdir -p $B && rsync -a --delete public/data/ $B/data/ && rsync -a --delete analysis/ $B/analysis/ || { echo "FAILED backup $(date +%T)" > $S; exit 1; }
restore() { rsync -a --delete $B/data/ public/data/ && rsync -a --delete $B/analysis/ analysis/; }
for n in 1 2; do
  echo "RUNNING build $n/2 since $(date +%T) (public/data backup: $B)" > $S
  BUILD_CACHE_VERIFY=1 npm run build:data > $BULP_LOGS/rs2-warm-$n.log 2>&1; rc=$?
  echo "build $n rc=$rc $(date +%T)" >> $BULP_LOGS/rs2-warm.steps
  if [ $rc -ne 0 ]; then restore; echo "FAILED build $n rc=$rc $(date +%T); public/data restored from $B" > $S; exit $rc; fi
done
restore
echo "SUCCESS $(date +%T) public/data restored from $B; logs $BULP_LOGS/rs2-warm-1.log -2.log; run 2 reuse: $(grep -E 'entries reused' $BULP_LOGS/rs2-warm-2.log | head -3 | tr '\n' ' ')" > $S
