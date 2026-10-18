#!/usr/bin/env bash
# One-shot worker status: harvesters, OCR progress per book, load. Safe to run any time.
. "$(dirname "$(readlink -f "$0")")/env.sh"
cd "$BULP_REPO" && bash harvest/status.sh 2>&1 | head -30
echo "--- load: $(uptime | sed 's/.*load average: //')  tesseract procs: $(pgrep -c tesseract)  pdftoppm: $(pgrep -c pdftoppm)"
echo "--- OCR (books done: $(ls ~/work/ocr/*/DONE 2>/dev/null | wc -l) of $(ls ~/work/books | wc -l))"
for d in ~/work/ocr/*/; do
  n=$(cat "$d/NAME" 2>/dev/null); t=$(ls "$d" | grep -c '\.txt$'); p=$(ls "$d" | grep -c '\.png$')
  echo "$( [ -f "$d/DONE" ] && echo DONE || echo '....' )  txt=$t png=$p  $n"
done | tail -12
tail -2 ~/ocr.log
