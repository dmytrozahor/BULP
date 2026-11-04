#!/usr/bin/env bash
# SPEC 63 SE-15: OCR of the owner-supplied scans in ~/work/nb, nb2, nb3: Онишкевич «Словник бойківських говірок» ч. 1 (onysh1 = b2.pdf, А–Н) and ч. 2 (onysh2 = b1.pdf, О–Я), Сабадош «Словник закарпатської говірки села Сокирниця» (sabadosh = b4.pdf),
# Славинецький «Лексикон латинський / словено-латинський» (slavynetsky = b5.pdf). Онишкевич and Сабадош are in copyright: the OCR text stays on this worker (never git, never CDN); the parsers keep only the policy fields.
# Layout (looked at on real pages, 2026-11-04):  onysh1/2 and polissia (Лисенко, Словник поліських говорів) = ONE column of typescript, embedded 150 ppi, so rendered at 110 dpi (3 s per page) and read with --psm 4;
#   sabadosh and slavynetsky = TWO printed columns with a rule between them: psm 3/4 on the whole page would interleave the lines, so each page is cut into a left and a right column (pdftoppm -x/-W from the embedded image width,
#   split at 49 % of the width; the printed gutter is 47-52 %), each column is read with --psm 4 and the page file is  LEFT + «\n<<COL>>\n» + RIGHT.  slavynetsky also gets a whole-page reading of pages 1-60 (full_NNNN.txt: the preface, to read the dates).
# Languages: ukr (dialect dictionaries); slavynetsky: Cyrillic+lat (Cyrillic.traineddata reads the CS letters and beat ukr+lat on a test page), tessdata in ~/work/se14-ocr/tessdata.
# Resumable (a page_NNNN.txt that exists is skipped; written tmp + mv), nice 19, OMP_THREAD_LIMIT=4, at most 4 parallel pages.
# Usage:  nohup ops/worker/ocr-se15.sh [volumes...] > ~/logs/se15-ocr.out 2>&1 &     (default: bukovyna hutsul polissia onysh1 onysh2 sabadosh slavynetsky; output ~/work/se15-ocr/<vol>/)
set -uo pipefail
# shared worker environment (SPEC 63 RS-3); the OCR settings below override its defaults
source "$(dirname "${BASH_SOURCE[0]}")/env.sh" 2>/dev/null || true
SE15=${SE15:-$HOME/work/se15-ocr}; NB=${NB:-$HOME/work/nb}; NB2=${NB2:-$HOME/work/nb2}; NB3=${NB3:-$HOME/work/nb3}; mkdir -p "$SE15"; cd "$SE15"
export TESSDATA_PREFIX=$HOME/work/se14-ocr/tessdata OMP_THREAD_LIMIT=4   # ukr rus lat grc deu eng Cyrillic (env.sh points at the shared ukr/rus/eng set)
PAR=${PAR:-4}
pdfof() { case $1 in onysh1) echo "$NB/b2.pdf";; onysh2) echo "$NB/b1.pdf";; sabadosh) echo "$NB/b4.pdf";; slavynetsky) echo "$NB/b5.pdf";; bukovyna) echo "$NB2/c4.pdf";; hutsul) echo "$NB2/c5.pdf";; berynda1627) echo "$NB2/c1.pdf";; berynda1653) echo "$NB2/c2.pdf";; berynda1961) echo "$NB2/c3.pdf";; polissia) echo "$NB3/d1.pdf";; esac; }
page() {   # page <vol> <i>
  v=$1; i=$2; p=$(printf '%04d' "$i"); d=$SE15/$v; pdf=$(pdfof "$v")
  [ -s "$d/page_$p.txt" ] && exit 0
  case $v in
    onysh*|polissia) RR=110; [ "$v" = polissia ] && RR=170; nice -n 19 pdftoppm -r $RR -gray -f "$i" -l "$i" -png "$pdf" "$d/img_$p" >/dev/null 2>&1 || exit 0
      img=$(ls "$d"/img_"$p"*.png 2>/dev/null | head -1); [ -n "$img" ] || exit 0
      nice -n 19 tesseract "$img" "$d/page_$p.tmp" -l ukr --psm 4 >/dev/null 2>&1 && mv "$d/page_$p.tmp.txt" "$d/page_$p.txt"; rm -f "$img";;
    *) L=ukr; [ "$v" = slavynetsky ] && L=Cyrillic+lat; R=300
      if [ "$v" = bukovyna ]; then R=220; read -r W H < <(pdfinfo -f "$i" -l "$i" "$pdf" 2>/dev/null | awk '/Page.*size:/{print int($4*220/72)+1, int($6*220/72)+1}')
      else read -r W H < <(pdfimages -list -f "$i" -l "$i" "$pdf" 2>/dev/null | awk 'NR>2 && $4*$5>m {m=$4*$5; w=$4; h=$5} END {print w+0, h+0}'); fi
      [ "${W:-0}" -gt 200 ] || exit 0
      S=$((W * 49 / 100)); [ "$v" = hutsul ] && { R=300; read -r W H < <(pdfinfo -f "$i" -l "$i" "$pdf" 2>/dev/null | awk '/Page.*size:/{print int($4*300/72)+1, int($6*300/72)+1}'); S=$((W * 50 / 100)); }
      nice -n 19 pdftoppm -r $R -gray -f "$i" -l "$i" -x 0 -y 0 -W "$S" -H "$((H + 20))" -png "$pdf" "$d/cl_$p" >/dev/null 2>&1
      nice -n 19 pdftoppm -r $R -gray -f "$i" -l "$i" -x "$S" -y 0 -W "$((W - S + 40))" -H "$((H + 20))" -png "$pdf" "$d/cr_$p" >/dev/null 2>&1
      cl=$(ls "$d"/cl_"$p"*.png 2>/dev/null | head -1); cr=$(ls "$d"/cr_"$p"*.png 2>/dev/null | head -1); [ -n "$cl" ] && [ -n "$cr" ] || exit 0
      nice -n 19 tesseract "$cl" "$d/l_$p" -l "$L" --psm 4 >/dev/null 2>&1; nice -n 19 tesseract "$cr" "$d/r_$p" -l "$L" --psm 4 >/dev/null 2>&1
      case $v in slavynetsky) lim=60;; *) lim=40;; esac
      if [ "$i" -le "$lim" ]; then nice -n 19 pdftoppm -r $R -gray -f "$i" -l "$i" -png "$pdf" "$d/fl_$p" >/dev/null 2>&1; fl=$(ls "$d"/fl_"$p"*.png | head -1); nice -n 19 tesseract "$fl" "$d/full_$p" -l ukr --psm 4 >/dev/null 2>&1; rm -f "$fl"; fi
      { cat "$d/l_$p.txt"; printf '\n<<COL>>\n'; cat "$d/r_$p.txt"; } > "$d/page_$p.tmp.txt" 2>/dev/null && mv "$d/page_$p.tmp.txt" "$d/page_$p.txt"
      rm -f "$cl" "$cr" "$d/l_$p.txt" "$d/r_$p.txt";;
  esac
}
export -f page pdfof; export SE15 NB NB2 NB3 TESSDATA_PREFIX OMP_THREAD_LIMIT
VOLS=("$@"); [ ${#VOLS[@]} -gt 0 ] || VOLS=(bukovyna hutsul polissia onysh1 onysh2 sabadosh slavynetsky)
for v in "${VOLS[@]}"; do
  mkdir -p "$SE15/$v"; N=$(pdfinfo "$(pdfof "$v")" | awk '/^Pages:/{print $2}')
  echo "$(date -Is) $v: $N pages"
  seq 1 "$N" | xargs -P "$PAR" -I{} bash -c 'page '"$v"' {}'
  c=$(ls "$SE15/$v"/page_????.txt 2>/dev/null | wc -l); echo "$(date -Is) $v: $c/$N pages OCRed"
  [ "$c" -eq "$N" ] && touch "$SE15/$v/DONE"
done
echo "$(date -Is) se15 ocr finished"
