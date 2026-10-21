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
  # GG-5: the marker keeps the parameters; a source finished with other parameters (e.g. another --wiki-stride) is read again
  [ -f $D/$s ] && [ "$(cat $D/$s)" = "$*" ] && { echo "skip $s"; return; }
  echo "ingest $s $(date +%T)" > ~/import-step
  /usr/bin/time -v npx tsx pipelines/ingest-harvest.ts --only $s "$@" > $BULP_LOGS/ingest-$s.out 2> $BULP_LOGS/ingest-$s.time
  local rc=$?
  cat $BULP_LOGS/ingest-$s.out
  if [ $rc -eq 0 ]; then echo "$*" > $D/$s; for m in build unlinked vitest vuetsc vitebuild budget; do rm -f $D/$m; done
  else echo "ingest source $s FAILED rc=$rc (see $BULP_LOGS/ingest-$s.time)" >&2; failed+=("$s(rc=$rc)"); fi
}
# SPEC 63 RF-8/KV-1/RU-5: ingesters that are not harvest sources (own script, own done-marker). The marker holds a SIGNATURE of the input (OCR page count / seed checksum), so a rerun after the OCR grew
# (or the seed changed) reads again, and a run that found no OCR text yet is not final. usage: runcmd <name> <signature> <command...>
runcmd() {
  local s=$1 sig=$2; shift 2
  [ -f $D/$s ] && [ "$(cat $D/$s)" = "$sig" ] && { echo "skip $s"; return; }
  echo "ingest $s $(date +%T)" > ~/import-step
  /usr/bin/time -v "$@" > $BULP_LOGS/ingest-$s.out 2> $BULP_LOGS/ingest-$s.time
  local rc=$?
  cat $BULP_LOGS/ingest-$s.out
  if [ $rc -eq 0 ]; then echo "$sig" > $D/$s; for m in build unlinked vitest vuetsc vitebuild budget; do rm -f $D/$m; done
  else echo "ingest source $s FAILED rc=$rc (see $BULP_LOGS/ingest-$s.time)" >&2; failed+=("$s(rc=$rc)"); fi
}
for s in wikisource-uk archive-ukr hrushevsky archive-hrushevsky wikipedia-rue poets gramoty user-books faust-lukash; do run $s; done
run wikipedia-uk --wiki-stride "$BULP_WIKI_STRIDE"
run hplt --limit "$BULP_HPLT_LIMIT"
# the 14th-c. charters (Пещак 1974, tracked seed), Квітка 1887 and the РИБ т. 4 / т. 19 works (owner scans: the OCR under ~/work/ocr, found by their NAME files)
OCR_DIR=${OCR_DIR:-$HOME/work/ocr}; export OCR_DIR
ocrsig() { find "$OCR_DIR" -name 'page_*.txt' 2>/dev/null | wc -l; }
runcmd pum14 "$(cat data/seed/pum14/*.json | cksum)" npx tsx pipelines/ingest-pum.ts
runcmd rib "$(ocrsig)" npx tsx pipelines/ingest-rib.ts --ocr "$OCR_DIR"
runcmd kvitka "$(ocrsig)" npx tsx pipelines/ingest-kvitka.ts --ocr "$OCR_DIR"
# SPEC 63 GG-7: the owner's СУМ-11 (DjVu) / СУМ-20 (PDF) scans under $BOOKS/sum11, $BOOKS/sum20 (typeset, not OCR). pipelines/sum-scan.ts parses them (resumable per volume, text never stored) into
# data/work/<dict>-parsed/ and imports the policy fields (headword, stress, POS, sense numbers, labels, gloss ≤ 200 characters, volume/page; FULL_SENSES_* = 0) to data/work/se-parsed/<dict>.json.
# The signature = the file sizes + the parser code, so a changed parser or a new volume reads the scans again.
BOOKS=${BOOKS:-$HOME/work/books}; export BOOKS
sumsig() { { find "$BOOKS/$1" -maxdepth 1 -name "$1_t*" ! -name '*.up' -printf '%f=%s '; cat core/sum-article.ts core/$1-parse.ts pipelines/sum-scan.ts pipelines/sum-import.ts core/sum-import.ts | cksum; } 2>/dev/null; }
for s in sum11 sum20; do
  ls "$BOOKS/$s"/${s}_t* 2>/dev/null | grep -qv '\.up$' && runcmd $s "$(sumsig $s)" nice -n 19 npx tsx pipelines/sum-scan.ts $s
done
if [ ${#failed[@]} -gt 0 ]; then
  echo "ingest FAILED: ${failed[*]} $(date +%T)" > ~/import-step
  echo "ingest FAILED: ${failed[*]}" >&2
  bash "$(dirname "$(readlink -f "$0")")/notify.sh" "BULP worker: ingest failed (${failed[*]})" "See $BULP_LOGS/ingest-<source>.out/.time on the worker. Rerun ~/ingest.sh to retry only the failed sources." >/dev/null 2>&1
  exit 1
fi
echo "ingest done $(date +%T)" > ~/import-step
