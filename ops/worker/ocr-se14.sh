#!/usr/bin/env bash
# SPEC 63 SE-14: OCR of the owner-supplied scans of Чабаненко «Словник говірок Нижньої Наддніпрянщини» (т. 1-4, nan1..4.pdf) and ЕСУМ (т. 1-6, esum1..6.pdf).
# Both works are in copyright: the OCR text stays on this worker (never git, never CDN); the parsers (core/se14-*.ts) keep only headword/stress/POS/labels, a gloss or etymology excerpt of <= 200 chars and the vol/page.
# Resumable (one page_NNNN.txt per page, a page that exists is skipped), nice 19, OMP_THREAD_LIMIT=4, at most 4 parallel pages. poppler opens the owner-password PDFs directly (no qpdf).
# Usage:  nohup ops/worker/ocr-se14.sh [volumes...] > ~/logs/se14-ocr.out 2>&1 &     (volumes default: nan1 nan2 nan3 nan4 esum1 ... esum6; PDFs in $SE14=~/work/se14-ocr)
set -uo pipefail
# shared worker environment (SPEC 63 RS-3); the OCR settings below override its defaults
source "$(dirname "${BASH_SOURCE[0]}")/env.sh" 2>/dev/null || true
SE14=${SE14:-$HOME/work/se14-ocr}; cd "$SE14"
export TESSDATA_PREFIX=$SE14/tessdata   # ukr rus lat grc deu eng (env.sh points at the shared ukr/rus/eng set)
export OMP_THREAD_LIMIT=4
PAR=${PAR:-4}
page() {   # page <vol> <i>   (called through xargs; env is exported)
  v=$1; i=$2; p=$(printf '%04d' "$i"); d=$SE14/$v
  [ -s "$d/page_$p.txt" ] && exit 0
  case $v in nan*) L=ukr;; *) L=ukr+rus+lat+grc+deu;; esac
  nice -n 19 pdftoppm -r 300 -gray -f "$i" -l "$i" -png "$SE14/$v.pdf" "$d/img_$p" >/dev/null 2>&1 || exit 0
  img=$(ls "$d"/img_"$p"*.png 2>/dev/null | head -1); [ -n "$img" ] || exit 0
  case $v in nan*) nice -n 19 pdftotext -f "$i" -l "$i" -layout "$SE14/$v.pdf" "$d/tl_$p.txt" 2>/dev/null;; esac   # the (noisy) text layer, kept as a second reading of the Чабаненко pages
  nice -n 19 tesseract "$img" "$d/page_$p.tmp" -l "$L" --psm 3 >/dev/null 2>&1 && mv "$d/page_$p.tmp.txt" "$d/page_$p.txt"
  rm -f "$img"
}
export -f page; export SE14 TESSDATA_PREFIX OMP_THREAD_LIMIT
VOLS=("$@"); [ ${#VOLS[@]} -gt 0 ] || VOLS=(nan1 nan2 nan3 nan4 esum1 esum2 esum3 esum4 esum5 esum6)
for v in "${VOLS[@]}"; do
  mkdir -p "$SE14/$v"; N=$(pdfinfo "$SE14/$v.pdf" | awk '/^Pages:/{print $2}')
  echo "$(date -Is) $v: $N pages"
  seq 1 "$N" | xargs -P "$PAR" -I{} bash -c 'page '"$v"' {}'
  c=$(ls "$SE14/$v"/page_????.txt 2>/dev/null | wc -l); echo "$(date -Is) $v: $c/$N pages OCRed"
  [ "$c" -eq "$N" ] && touch "$SE14/$v/DONE"
done
echo "$(date -Is) se14 ocr finished"
