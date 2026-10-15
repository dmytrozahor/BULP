# R40 - CX-9: dialect literature (SPEC 63, user 2026-10-15)

Fetched 2026-10-15. Quotes are verbatim from the cited page; archive.org OCR quotes keep the OCR errors. Per-witness numbers and rule firing: `analysis/dialect-literature.md` (`tsx pipelines/dialect-literature.ts`).

## Model
`WitnessOut.dialect` / `Unit.dialect` = `DialectStatement[]` (core/types.ts). The user's sentence is stored verbatim as `status: hypothesis` (author user, date 2026-10-15) and never becomes a label. A `status: sourced` statement (published, quote + locator) is the only label. Group codes are those of `DIALECTS` (research/04).

## Ingested
| witness | text | PD / date evidence | dialect: user hypothesis | dialect: sourced label |
|---|---|---|---|---|
| `ez26_shekerik` | Етноґрафічний збірник т. 26 «Народні оповідання про опришків», ред. В. Гнатюк, Львів 1910 (archive.org `etnohr_26`, OCR), only the 83 records signed «зап. Петро Шекерик-Доників» (Голови, Косівський пов., 1907–08) | Гнатюк † 1926; Шекерик b. 1889, arrested 1940, «d ? in Siberia» (Encyclopedia of Ukraine) - death date unknown, printed 1910, treated as PD (flagged in the author note) | HUT («Опришки») | HUT: Гнатюк, preface II, p. XII: «Найкраще відданий і най- чистїйше захований гуцульський діялект у ваписях д. П. Шекерика-До- нпкового» (OCR) |
| `stefanyk1917_dlg`, `stefanyk1917_nar` | Стефаник, «Новина та инші оповідання», Новоросійськ 1917 (uk.wikisource, proofread; Новина, Катруся, Лист, Діти) | Стефаник † 1936 (Wikisource licence box: life + 70) | PKB (speech) | PKB: uk.wikipedia «Стефаник Василь Семенович»: «Органічним засобом його художнього письма стало віртуозне застосування покутського діалекту …» (secondary; no ЕУМ/ЕСУ text found) |
| `cheremshyna1940_dlg`, `cheremshyna1940_nar` | Черемшина, «Верховина і інші оповідання», Краків 1940 (uk.wikisource, proofread; 5 stories; the 1940 editor's preface not ingested) | Черемшина † 1927 | PKB (speech) | **HUT**, not PKB: the 1940 edition's preface, p. 4: «Розмови селян подавав у гуцульському говорі так, як у горах говорять.»; uk.wikipedia names Hutsul dialect elements. The user's PKB stays a hypothesis; the conflict is shown, not resolved |
| `rusalka1837` | «Русалка Днѣстровая», Буда 1837, about 55 subpages on uk.wikisource (proofread, original orthography, folds `максимовичівка`) | authors † 1843 / 1866 / 1888 | NDN (user: «Доста галицка») | **none**: no published statement on the dialect of this text was found (uk.wikipedia says only «народною мовою», «фонетичним правописом») |

Authors (P-2): Стефаник vetted (explicit): «Гімназія, крім формального навчання й ворожого відношення до нас, українців-учнів, нічого нам не давала.» (Автобіографія, Твори, Львів 1942). Черемшина and Шекерик-Доників provisional (secondary only: uk.wikipedia; Encyclopedia of Ukraine «He was a member of the Ukrainian National Rada in Stanyslaviv in 1918–19.»): no self-identifying sentence of their own was found in the texts we hold. «Руська трійця»: institutional, vetted, label `ruthenian`: «однакож язик и хороша душа руска була серед Славлянщини» (Передслівє).

## Speech / narration split (Стефаник, Черемшина)
`splitSpeech` (pipelines/ingest-wikisource.ts), a heuristic: a paragraph starting with a dash is speech up to the next « — » (the author's remark), then speech again, alternately; a dash inside narration opens speech only after a colon; quoted spans „…“ «…» are speech. Known noise: a pause dash inside a speech turns the rest into «narration»; thought in quotes counts as speech. The two parts are two witnesses (`_dlg`, `_nar`); only `_dlg` carries the dialect statements, `_nar` is the control.

## Not ingested (and why)
- «Дідо Иванчік» (Шекерик-Доників): written late 1930s, manuscript hidden and found in the 1990s, first printing 1998+ (zaxid.net, life.pravda.com.ua 2020); author's death date unknown (arrested 1940). No free copy; modern editions are not PD. Not opened.
- «Жиб'ївські новелі» (Онуфрій Манчук, 1899–1941): PD by death date (1941 + 70), but the only text is the Брустури 2024 print (105 p., ISBN 9786178326630, UCU catalogue record, book-ye.com.ua); no free copy found (Wikisource, diasporiana, archive.org, chtyvo: nothing). Needs the owner to supply a legal copy.
- «Опришки», Брустури: Discursus 2023 (272 p.) is a modern edition of the 1910 records; ЕЗ т. 26 is the PD source and is ingested instead. The Wikisource scan of т. 26 has no proofread pages, so the witness is OCR (witnessType `ocr`, weakest tie-break). 83 records were recognised by their signature, the 2023 edition says 104: OCR missed signatures or broke paragraphs (not recovered).
- Стефаник early prints («Синя книжечка» 1899 - 18 proofread pages, 1918 - 57, «Камінний хрест» 1900, «Дорога» 1901, «Моє слово» 1905): only the Page namespace of uk.wikisource, partly proofread, no main-namespace text; «Оповідання» Київ 1920 (182 pages) likewise. A Page-namespace ingester is a follow-up (CX-9b); the 1917 edition is the full proofread text available.
- Черемшина: «Село вигибає» 1925, «Верховина» 1929, «Село потерпає» 1930, «Парасочка» 1939: scans without proofread pages.
- Mixed-voice caveat: «Русалка Днѣстровая» contains songs from several regions and Shashkevych's, Holovatsky's and Vahylevych's own texts; the witness is the whole almanac, region Галичина by its compilers.

## Findings on the rules
See `analysis/dialect-literature.md`. In short: on the Hutsul records the rows of the group HUT fire on few tokens (`MONO-UY`, `PKB-DEPAL-S`, `SW-3SG-CONTRACT`, `SW-KJ-GJ`); `SW-UKANYE`, `SW-LABIAL-J`, `HUT-COND`, `PKB-VI-PREFIX` and every lexical `LEX-*` row never fire; on the Pokuttian dialogues no PKB row fires at all; the commonest firings are generic (`3SG-HARD-T`, `SW-DAT-OVY`, `HARD-C-FINAL`) and shared by several groups, so they do not discriminate. Hnatiuk's own list of Hutsul features (preface, p. XII-XIII: а > е «предїд, пребабка», ї for а after palatals) is the natural source for new HUT rows (DL follow-up).
