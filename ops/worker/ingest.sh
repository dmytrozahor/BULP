#!/bin/bash
# Resumable ingest: each source marks $BULP_LOGS/done/<src>; a rerun skips finished ones.
# A failed source fails the RUN: the other sources still go on (they are independent and resumable), but at the end the script names the failed ones,
# writes "ingest FAILED: ..." to ~/import-step and exits non-zero. "ingest done" is written only when every source succeeded.
# A source that really ran invalidates the post-ingest markers (build, unlinked, ...): the data changed, so the build must be redone; untouched sources leave them.
. "$(dirname "$(readlink -f "$0")")/env.sh"
cd "$BULP_REPO" || exit 1
D=$BULP_LOGS/done; failed=()
run() { # src extra-args...
  local s=$1; shift
  [ -f $D/$s ] && { echo "skip $s"; return; }
  echo "ingest $s $(date +%T)" > ~/import-step
  /usr/bin/time -v npx tsx pipelines/ingest-harvest.ts --only $s "$@" > $BULP_LOGS/ingest-$s.out 2> $BULP_LOGS/ingest-$s.time
  local rc=$?
  cat $BULP_LOGS/ingest-$s.out
  if [ $rc -eq 0 ]; then touch $D/$s; for m in build unlinked vitest vuetsc vitebuild budget; do rm -f $D/$m; done
  else echo "ingest source $s FAILED rc=$rc (see $BULP_LOGS/ingest-$s.time)" >&2; failed+=("$s(rc=$rc)"); fi
}
for s in wikisource-uk archive-ukr hrushevsky archive-hrushevsky wikipedia-rue poets gramoty user-books faust-lukash; do run $s; done
run wikipedia-uk --wiki-stride 100
run hplt --limit 40
if [ ${#failed[@]} -gt 0 ]; then
  echo "ingest FAILED: ${failed[*]} $(date +%T)" > ~/import-step
  echo "ingest FAILED: ${failed[*]}" >&2
  bash "$(dirname "$(readlink -f "$0")")/notify.sh" "BULP worker: ingest failed (${failed[*]})" "See $BULP_LOGS/ingest-<source>.out/.time on the worker. Rerun ~/ingest.sh to retry only the failed sources." >/dev/null 2>&1
  exit 1
fi
echo "ingest done $(date +%T)" > ~/import-step
