# 45 — HV-4: sources for Зизаній (1596), Смотрицький (1619), Беринда (1627) (SPEC 63 HV-4)

Status: sources checked 2026-10-17 (plain http(s), User-Agent «BULP research … contact», ≥ 1.5 s between requests). Tags as in research/31: **[Q]** observed on the fetched page, **[U]** unverified.

## 1. Sources

| source | what | access / terms | verdict |
|---|---|---|---|
| archive.org `gramat0slovenska` (`gramat0slovenska_djvu.txt`, 228 KB OCR) | Зизаній, «Граматіка словєнска», Вільно 1596 | `https://archive.org/download/<id>/<file>`; robots.txt: only /control/ /report/ disallowed [Q]; no licence field, 1596 print = PD by age | **harvested** |
| archive.org `zyzanii` (`zyzanii_djvu.txt`, 67 KB) | Зизаній, «Лексис» + «Наука ку читаню», Вільно 1596 (same scan as `leksys` 02) | as above | **harvested** |
| archive.org `g1619s` (`g1619s_djvu.txt`, 568 KB) | Смотрицький, «Грамматіки славенския правилноє синтаґма», Єв'є 1619 | as above | **harvested** |
| archive.org `slovnyk-Pamva-Beryndy` (`52857744008540_djvu.txt`, 696 KB) | Беринда, «Лексікон», Київ 1627 | `licenseurl` = Public Domain Mark 1.0 [Q] | **harvested** |
| archive.org `Pamva_Berynda_1653` (`PamvaBerynda1653_djvu.txt`, 700 KB) | Беринда, 2-ге вид., Кутеїн 1653 (a separate, later witness) | as above | **harvested** |
| archive.org `smotrickij-grammatiki-slavenskija-pravilnoe-syntagma`, `leksyk0n`, `leksikon`, `leksys` 01/02 | duplicate scans of the same prints (identical PDF sizes to the items above) | — | not fetched (duplicates) |
| archive.org `leksykon1961`, `zyzanii2` = `leksys` 03, `hramslavenski` (1979) | Німчук's scholarly editions (apparatus, transcription), © 1961/1964/1979 | — | **skipped**: in copyright |
| izbornyk.org.ua `zyzlex/ zyzgram/ smotrgram/ berlex/` | the same four works page by page (zyz01…102, zy01…94, sm01…253, be01…271) | robots.txt: only /dos /mac /koi disallowed [Q]. The work pages are PNG facsimiles (`imageNNN.png`, no text layer) [Q]; the only typed text is Німчук's introductions (© author) and zyz70–73 «Синоніма» (Німчук 1964 transcription) | **skipped** (images need OCR the archive.org text already gives; typed text has unclear rights → DECISIONS-NEEDED) |
| uk.wikisource «Граматика слов'янська 1619» | stub (2.9 KB, title page only) | open | not useful |

## 2. Dating metadata (P-2)
Date = the print year stated by the archive.org item AND the title page (1596 Вільно, 1619 Єв'є, 1627 Київ, 1653 Кутеїн); author and place from the item metadata (`creator`, `description`); recorded per index line (`date`, `author`, `region`, `edition`, `iaItem`, `iaFile`).

## 3. What the data is for
`data/raw/harvest/hv4/` → `npm run harvest:ingest -- --only hv4` writes `data/work/harvest-vocab/hv4.json` (family `middle-ukrainian-church-slavonic`, vocabulary-only counts with dated items). The Lexis/Lexikon entries (CS headword → простa мова equivalent) need an entry parser over the OCR layout; OCR of 17th-century type is noisy, so this is a follow-up (re-OCR of the PDFs with a Cyrillic-old model if the quality is too low).
