#!/usr/bin/env bash
# SPEC 63 GG-19b: OCR of the owner-supplied NPLU scan of Етнографічний збірник т. 23 (≈ 1000 page images, no text layer, encrypted).
# Resumable: one page_NNNN.txt per page (a page that exists is skipped), nice 19, 6 threads like the other worker OCR (research/38). Not for the local machine (no tesseract ukr / pdftoppm / qpdf there).
# Usage on the worker, when the build is idle:  ops/worker/ocr-etnohr23.sh /path/Etnohrafichnyi_zbirnyk_T23.pdf   (copy the PDF to an ASCII path first)
# Then: HARVEST_DIR=<raw>/harvest npx tsx harvest/proverbs-owner.ts ~/work/etnohr23-ocr/etnohr23.txt ; npm run build:data (or pipelines/synphr-run.ts)
set -euo pipefail
PDF=${1:?pdf}; OUT=${OUT:-$HOME/work/etnohr23-ocr}; mkdir -p "$OUT"
[ -s "$OUT/plain.pdf" ] || qpdf --decrypt "$PDF" "$OUT/plain.pdf"          # owner-password only; if it asks for a user password, stop and tell the owner
N=$(qpdf --show-npages "$OUT/plain.pdf")
for i in $(seq 1 "$N"); do
  p=$(printf '%04d' "$i"); [ -s "$OUT/page_$p.txt" ] && continue
  nice -n 19 pdftoppm -r 300 -gray -f "$i" -l "$i" -png "$OUT/plain.pdf" "$OUT/img_$p" >/dev/null
  img=$(ls "$OUT"/img_"$p"*.png | head -1)
  OMP_THREAD_LIMIT=6 nice -n 19 tesseract "$img" "$OUT/page_$p.tmp" -l ukr --psm 6 >/dev/null 2>&1
  mv "$OUT/page_$p.tmp.txt" "$OUT/page_$p.txt"; rm -f "$img"
done
: > "$OUT/etnohr23.txt.tmp"
for f in "$OUT"/page_*.txt; do n=$((10#$(basename "$f" .txt | sed 's/page_//'))); printf "
=====PDF %s=====

" "$n" >> "$OUT/etnohr23.txt.tmp"; cat "$f" >> "$OUT/etnohr23.txt.tmp"; done
mv "$OUT/etnohr23.txt.tmp" "$OUT/etnohr23.txt"; echo "done: $N pages -> $OUT/etnohr23.txt"
