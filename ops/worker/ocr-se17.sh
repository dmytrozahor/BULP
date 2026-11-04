#!/usr/bin/env bash
# SPEC 63 SE-17: OCR of the owner-supplied scans e1 = Закревський, «Старосвѣтскій бандуриста» кн. 3 (1861, public domain) and e2 = Верхратський, «Говор галицких Лемків» (НТШ, public domain);
# e3 (Караванський 2000, (c), text layer, pdftotext in reading order, no -layout) and e4 (Говірки Західної Полтавщини 2012, (c); its text layer is a broken phonetic font, so it is OCRed like e1/e2, ukr only) stay on the worker.
# Resumable (one page_NNNN.txt per page, a page that exists is skipped), nice 19, OMP_THREAD_LIMIT=4, at most 4 parallel pages.
# Usage: nohup ops/worker/ocr-se17.sh [vols...] > ~/logs/se17-ocr.out 2>&1 &    (default: e3 e4 e1 e2; PDFs in ~/work/nb4, output in $SE17=~/work/se17-ocr)
set -uo pipefail
SE17=${SE17:-$HOME/work/se17-ocr}; SRC=${SRC:-$HOME/work/nb4}; mkdir -p "$SE17"; cd "$SE17"
export TESSDATA_PREFIX=${TESSDATA_PREFIX:-$HOME/work/se14-ocr/tessdata}
export OMP_THREAD_LIMIT=4
PAR=${PAR:-4}
page() {   # page <vol> <i>
  v=$1; i=$2; p=$(printf '%04d' "$i"); d=$SE17/$v
  [ -s "$d/page_$p.txt" ] && exit 0
  case $v in
    e3) nice -n 19 pdftotext -f "$i" -l "$i" "$SRC/$v.pdf" "$d/page_$p.tmp" 2>/dev/null && mv "$d/page_$p.tmp" "$d/page_$p.txt"; exit 0;;
  esac
  nice -n 19 pdftoppm -r 300 -gray -f "$i" -l "$i" -png "$SRC/$v.pdf" "$d/img_$p" >/dev/null 2>&1 || exit 0
  img=$(ls "$d"/img_"$p"*.png 2>/dev/null | head -1); [ -n "$img" ] || exit 0
  nice -n 19 pdftotext -f "$i" -l "$i" -layout "$SRC/$v.pdf" "$d/tl_$p.txt" 2>/dev/null   # the text layer where the scan has one (e2), a second reading
  case $v in e4) L=ukr;; *) L=ukr+rus;; esac
  nice -n 19 tesseract "$img" "$d/page_$p.tmp" -l "$L" --psm 3 >/dev/null 2>&1 && mv "$d/page_$p.tmp.txt" "$d/page_$p.txt"
  rm -f "$img"
}
export -f page; export SE17 SRC TESSDATA_PREFIX OMP_THREAD_LIMIT
VOLS=("$@"); [ ${#VOLS[@]} -gt 0 ] || VOLS=(e3 e4 e1 e2)
for v in "${VOLS[@]}"; do
  mkdir -p "$SE17/$v"; N=$(pdfinfo "$SRC/$v.pdf" 2>/dev/null | awk '/^Pages:/{print $2}')
  echo "$(date -Is) $v: $N pages"
  seq 1 "$N" | xargs -P "$PAR" -I{} bash -c 'page '"$v"' {}'
  c=$(ls "$SE17/$v"/page_????.txt 2>/dev/null | wc -l); echo "$(date -Is) $v: $c/$N pages"
  [ "$c" -eq "$N" ] && touch "$SE17/$v/DONE"
done
echo "$(date -Is) se17 ocr finished"
