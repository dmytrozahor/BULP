# 45. Literature wanted / Список потрібної літератури

Updated / Оновлено: 2026-10-22 (version 2). Regenerated every 3 h by the orchestrator (SPEC 63 LW-1) / перегенерується оркестратором кожні 3 год (SPEC 63 LW-1).

English first, then Ukrainian (as in README). Every claim comes from a file in this repository or from a page I opened; «?» marks anything I could not confirm; nothing is invented. «Not found online» only means «not found by me».

---

# English

## Changes since last update (2026-10-22)

- **Supplied by the owner (matched by title in `books`):** СУМ-11 (Словник української мови in 11 vols, 11 DjVu files `Білодід … Том 01–11.djvu`) and СУМ-20 (Словник української мови in 20 vols, 15 PDF files: `2sum20.pdf` … `15sum20.pdf`, `sum20_1.pdf`; which volume each file holds is not checked, ?); РИБ т. 4 and т. 19 (noted 2026-10-21); Зизаній «Лексис» and its reprint (`Зизаній_Hrammatika_slovienska_Lieksys.pdf`, `репринт_Зизаній_Лексис_Synonima_slavenorosskaia.pdf`); Квітка «Малоросійські повісті» 1887 т. 1; «Українські грамоти XIV ст.» 1974 (`XIV1974.pdf`). All are in section C. Rights to the СУМ editions: Q-SE1 and the permission letter (research/47).
- **Still wanted, with a qualifier:** Копистенський «Книга о вірі єдиній» c. 1620 is in `books`, but its OCR is mostly garbage: status **wanted (better copy)** (a better scan or a proofread reprint). Квітка т. 1 is supplied; **т. 2 is wanted** (entry 20). Unchanged and still wanted: РИБ т. 7 (1882, «Апокрисис»), «Українські грамоти XV ст.», «Волинські грамоти XVI ст.», Транквіліон «Євангеліє учительне» 1619, Калліст 1616, the dialect dictionaries (entries 23–28), the Архів Коша, the hetman universals.
- **Corpus state (live build 202610212253-48e380c, `public/data/boot.json` on origin/mvp):** N = 48.46M full-text tokens; 5,516 witnesses; 454,027 entries (159,444 attested + 294,583 dictionary-only) against Горох 508k. Tokens by century: 14th 2,102 (about 20k after the `pum14` charters land, entry 21), 15th 136,044, 16th 113,006, 17th 342,145, 18th 493,223 (19th 4.70M, 20th 41.47M). After the 14th, the 15th and 16th centuries are now the thinnest, so the new «Top 10» (under «Where we stand») puts 15th–16th c. sources first.
- Open owner questions kept: **Q-SE1** and the СУМ permission letter (research/47).

## Changes since 2026-10-21 (first version)

- SPEC 63 SE-10 (sense evolution): I looked for every dated-sense historical dictionary online. All were found on archive.org with an OCR text (H10–H15); none had to be moved to section A, so no new owner book is requested for them. Open questions: the archive.org items state no licence (the status is my reading of the author's death year), and the OCR quality of H13/H14 is unchecked (?).
- New file. Built from research/44-bratstva-bibliography.md, analysis/corpus-10m.md, analysis/regions.md, research/39, research/40, research/45-hv4-old-grammars.md, specs/63-corpus-dialects.md, specs/COVERAGE.md, specs/GAPS.md and the owner's `books` folder (listing taken 2026-10-21).
- Marked **supplied** (found in `books`, matched by title): Транквіліон «Зерцало богословії» (`Зерцало_богословия.pdf`, r24); Київський Псалтир з Полуставом 1643 (`1643-r.-Kyivs-kyy-Psaltyr-z-Poluustavu.pdf`); Беринда «Лексикон» 1627 and 1653; Зизаній «Лексис» (reprint) and «Граматика»; Смотрицький «Граматіка»; Метлинський «Народныя южнорусскія пѣсни» (`Narodnyja_juznorusskija_pesni.pdf`; matched by transliterated title, the year 1854 is not checked in the file).
- Moved to **harvest** (online, so not asked from the owner): r11 Зизаній «Наука ку читаню» 1596 (research/45: archive.org `zyzanii`, harvested); r30 Смотрицький «Verificatia niewinności» (Вільно 1621) is printed in «Архив Юго-Западной России» ч. 1 т. 7 (Київ 1887), pp. 279–344, and I found its scan. research/44 lists r30 as «не знайдено онлайн»; that row is outdated.

## Where we stand (evidence)

- Горох: 508k headwords and a 260M-word frequency corpus (specs/63 DO). Ours (live build 202610212253-48e380c, 2026-10-22): N = 48.46M full-text tokens in 5,516 witnesses; 454,027 entries (159,444 attested + 294,583 dictionary-only) against Горох 508k. Earlier figures (analysis/corpus-10m.md §1): about 205M tokens, of which 46,353,973 full text in 4,336 witnesses.
- 86% of corpus tokens come from archive.org OCR (`hv_ia_*`: 40,010,549 of 46.5M, not proofread). Source: analysis/corpus-10m.md §4.1.
- Epochs (N tokens, §4.3): proto 7,214; old 259,552; early_middle 148,347; middle 463,197; late_middle 195,475; modern 45,280,188 (97.7%). Everything before 1800 is under 1.2M tokens.
- Regions (analysis/regions.md): Запоріжжя, Херсонщина, Таврія, Донеччина, Луганщина have 0 tokens; the 11 historical territories (Берестейщина … Курщина) have 0 witnesses; Київ has 400k, Галичина 156k, Слобожанщина 100k. specs/GAPS.md adds: Hetmanate chancery, Мазепа and Орлик absent.
- Genre: the modern bulk is newspaper OCR; proofread book text of 1800–1950 is rare.

**Top 10 now (re-ranked 2026-10-22; centuries: 14th 2,102; 15th 136k; 16th 113k; 17th 342k; 18th 493k):**

1. «Українські грамоти XV ст.» (entry 21): the 15th c. is the thinnest after the 14th; dated, localised charters.
2. «Волинські грамоти XVI ст.», Київ 1987 (entry 21): the 16th c. has only 113k tokens; Volhynian chancery language.
3. РИБ т. 7, СПб. 1882, «Апокрисис» (entry 3): the one missing volume of the polemical set; 16th–17th c. prose.
4. Транквіліон-Ставровецький, «Євангеліє учительне», 1619 (entry 1): popular ПМ language, named most valuable in research/44.
5. Калліст, «Євангеліє учительноє», Євє 1616 (entry 2): ПМ translation «на руський язик».
6. Копистенський, «Книга о вірі єдиній», c. 1620 (entry 4): a better scan or proofread reprint; the supplied copy has garbage OCR.
7. Hetman universals and letters, Мазепа, Орлик, Кочубей (entry 19): 18th-c. chancery is absent.
8. «Архів Коша Нової Запорозької Січі» (entry 17): Запоріжжя has 0 tokens.
9. Dialect dictionaries 23–28 (GG-8), Чабаненко «Словник говірок Нижньої Наддніпрянщини» first: the 0-token South-East.
10. Квітка, «Малоросійські повісті», т. 2 (entry 20): т. 1 is in; Слобожанщина 19th c.

Priority rule: (1) ПМ and lexis-rich works named by research/44; (2) epochs and regions with zero or near-zero tokens; (3) works that unblock a SPEC item; (4) Polish and Church Slavonic items last. Format for every entry unless stated: scan PDF or DjVu at 300 dpi or more; a text layer is a bonus. Drop files into `C:\Users\User\IdeaProjects\dmitrijza\.claude\worktrees\ukr-lexicon-mvp\books`.

## Owner questions

- **Q-SE1** (SPEC 63 SE-11): the OCR of three copyrighted dictionaries is parsed, but only the headword, a gloss ≤ 200 characters, the sigla and the quotation dates are stored (СУМ XVI – першої половини XVII ст., Інститут українознавства НАН; «Матеріали до словника XV–XVIII ст.» ed. Німчук, Лиса 2002–2003; Словник мови Шевченка, Інститут мовознавства 1964). May we store more (full definitions, quotation text)? Who holds the rights: НАН, the institutes, the editors (?). Until you confirm, nothing more is stored.
- **СУМ permission letter** (research/47): СУМ-11 and СУМ-20 are now supplied as scans; the letter asking the rights holder for permission to use them beyond headword-level data is still open.

## A. Wanted from the owner (28 entries)

| # | Work (author, year, edition wanted) | Why it matters / unblocks | Where it may be found | Status |
|---|---|---|---|---|
| 1 | Кирило Транквіліон-Ставровецький, «Євангеліє учительне», Рахманів 1619 (r28). Best scholarly edition: not identified (?); the original print or a facsimile | ПМ, popular language (condemned by the 1627 council); research/44 names it most valuable. Fills early 17th c. and the ПМ register (middle epoch has only 463k tokens) | not found online. A 1697 Могильов edition is shown by the Museum of the Book (https://www.mkdu.com.ua/kolektsiia/kolektsiia-onlajn/ievanheliie-uchytelne-1697/, linked from uk.wikipedia; my fetch got HTTP 403, so unopened). A 2014 Свічадо modern translation is listed on uk.wikipedia (not a source for old forms). Ask НБУВ, ЛННБ Стефаника (?) | wanted |
| 2 | Мелетій Смотрицький (translator), «Євангеліє учительноє, албо Казання на каждую неделю … Калліста», Євє 1616 (r22) | ПМ translation «на руський язик»; second item named most valuable in research/44. Excerpts only: http://litopys.org.ua/old17/old17_11.htm (link from research/44, not reopened) | not found online | wanted |
| 3 | «Памятники полемической литературы в Западной Руси» = РИБ т. 4 (1878, ed. П. Гильтебрандт: library record seen in a search result), т. 7 (СПб. 1882, Апокрисис) and т. 19 (СПб. 1903, Антирисис). Volume numbers come from search summaries; I did not open a scan | Full text of Копистенський «Палінодія» (1621–22, r32; research/44 has only excerpts and says to look in РИБ т. IV); fills the middle epoch with ПМ/КУ prose | I found no scan. Ask e-ВНБУ, Google Books, HathiTrust (?) | wanted **SUPPLIED 2026-10-21 (part):** РИБ т. 4 (1878, ed. Гильтебрандт; `Русская_историческая_библиотека_Том_04_1878(2).pdf`, 441 spreads, no text layer; Палінодія = printed cols 313–1200, text 313–1180) and РИБ т. 19 (1903, кн. 3; `Памятники_полемической_литературы_в_Западной_Руси.pdf`: Ектезис, Отпис клирика, Антирисис Потія …). Still wanted: т. 7 (Апокрисис, кн. 2). Both volumes are Russian editions (flag `ru`, research/46); OCR queued. |
| 4 | Захарія Копистенський, «Книга о вірі єдиній» (1619–1621, ms; r29) and «Книга о правдивой єдності» (1623, ms; r34). Edition: not identified (?) | КУ/ПМ (?) polemical prose of the Лаврський гурток | not found online | wanted **SUPPLIED 2026-10-21 (part):** «Книга о вірі єдиній» as the original Kyiv print, c. 1620 (title: «ок. 1620»; copy of the Державна історична бібліотека УРСР; file `0c97cd6d…pdf` → worker `Копистенський_Книга_о_вірі_єдиній_1620.pdf`; no editor apparatus, not a Russian edition). Its OCR is mostly garbage: **wanted (better copy)**, i.e. a better scan or a proofread reprint. Also still wanted: «Книга о правдивой єдності» (1623). |
| 5 | Йов Борецький, «Аполлія», Київ 1628 (r38) | ПМ/КУ (?), reply to Смотрицький's «Апологія» | not found online | wanted |
| 6 | Лаврентій Зизаній, «Катехізис», Москва 1627 (r36) | ПМ (?); burned by order of patriarch Філарет, so rare | not found online | wanted |
| 7 | Йов Борецький, «Лімонар, или Квітник», Київ 1628 (r37) | КУ/ПМ (?), hagiography, folk lexis possible | not found online | wanted |
| 8 | Йов Борецький, «Діалог о вере православной», 1606 (r17; place disputed in research/44) | КУ/ПМ (?) dialogue | not found online | wanted |
| 9 | Ісая Копинський, «Алфавіт духовний» (date not stated, r43) | ПМ/КУ (?) didactic text of the Київ school | not found online | wanted |
| 10 | «Лямент по отцю Івану Василевичу», Луцьк 1628 (r40) | Волинь, verse, КУ/ПМ (?) | not found online | wanted |
| 11 | Й. Борецький, І. Курцевич, І. Копинський, «Протестація», Київ 1621 (r31) | КУ/ПМ (?) public act | not found online | wanted |
| 12 | Зизаній, «Поученіє при погребі Софії, княгині Чарториської» (r25) | ПМ/ЦС (?) sermon, date unknown | not found online | wanted |
| 13 | Олександр Митура, «Візерунок цнот … Єлисея Плетенецького», Київ 1618 (r23) | КУ verse panegyric | not found online | wanted |
| 14 | Тарасій Земка, prefaces to the Печерський «Служебник» 1629 (r41) and «Тріодь цвітна» 1631 (r42) | КУ/ПМ (?), church-singing terms | not found online | wanted |
| 15 | Й. Борецький, «Анфологіон», Київ 1619 (r27) | ЦС, low lexical value for Ukrainian | not found online | wanted (low) |
| 16 | Смотрицький «Апологія» (Львів 1628, r39) and the Vilnius Polish reply to Потій (1608, r19) | Polish; context only | not found online | wanted (low) |
| 17 | «Архів Коша Нової Запорозької Січі» (printed edition: ?) | Запоріжжя has 0 tokens; CX-5 asks for Cossack chancery documents | my search found no scan on archive.org, diasporiana or chtyvo | wanted |
| 18 | Д. Яворницький, further works on Запоріжжя (the corpus already has `yavornytsky1912`, `yavornytsky1923`, 9,349 tokens, Катеринославщина). Which are missing: ? | South-East gap: Запоріжжя, Херсонщина, Таврія, Донеччина, Луганщина are at 0 | nothing verified | wanted |
| 19 | Hetman chancery: universals and letters of Мазепа, Орлик, Кочубей (research/18; edition: ?) | specs/GAPS.md: absent; late_middle has only 195k tokens | edition not identified (?) | wanted |
| 20 | Квітка-Основ'яненко, «Малороссійскія повѣсти», Харків 1887, ed. Потебня (CX-6) | Слобожанщина, 19th c.; research/39: no copy found (archive.org, 7 queries) | not found online | wanted **SUPPLIED 2026-10-21:** exactly the wanted edition: «Сочиненія Григорія Ѳедоровича Квитки (Основьяненка). Малороссійскія повѣсти, разсказанныя Грыцькомъ Основьяненкомъ», т. 1, Харьковъ 1887, ed. А. А. Потебня (Харківське земство; Каплан і Бірюков); Russian-language preface, text in the edition's own Ukrainian orthography; т. 1 holds Салдацькый патрет, Маруся, Мертвецькый велык-день, Добре роби добре и буде, Конотопська відьма. Worker `Квітка_Малоросійські_повісті_1887.pdf`; flag `ru` apparatus (research/46). Per-повість first-publication dates still need a cited source. **Dated 2026-10-22 (specs/63 RF-9; first-publication years as stated in the 1887 edition's own notes):** Суплика 1833; Салдацький патрет 1833–34 (almanac «Утренняя Звѣзда» на 1833 г., Харків, printed 1834); Маруся 1834; Мертвецький велик-день 1834; Добре роби, добре й буде and Конотопська відьма 1833–34 (the note gives only the censor mark of the first edition, Москва 4.10.1833, the mark of the 1834 book; no printing year stated). Ingested by `pipelines/ingest-kvitka.ts`; Potebnja's Russian apparatus excluded; none skipped. **Still wanted: т. 2 of the same edition.** |
| 21 | «Пам'ятки української мови»: «Українські грамоти XIV ст.», «… XV ст.», «Волинські грамоти XVI ст.», «Приватні листи XVIII ст.», Київ 1965, 1974, 1987, 1995 (CX-6) | Dated, localised Middle Ukrainian charters; 353 `pum14` charters are excluded for lack of an author record (corpus-10m §2). Ingest status of the later volumes: ? | catalogue entry only (spec CX-6); no scan found | wanted **SUPPLIED 2026-10-21 (XIV ст. part only):** «Грамоти XIV ст.» (Пам'ятки української мови), упорядкування, вступна стаття, коментарі, словники-покажчики М. М. Пещак; відп. ред. В. М. Русанівський; АН УРСР, Інститут мовознавства ім. О. О. Потебні; Київ: Наукова думка, 1974; 84 charters; file `XIV1974.pdf` → worker `Українські_грамоти_XIV_ст_1974.pdf`. Licence: the 14th-c. texts are public domain; the 1974 apparatus (introduction, commentary, bibliography, variants, indexes) is © Наукова думка 1974 and is excluded entirely. Kyiv, USSR publication: not a `ru` edition. XV ст., Волинські грамоти XVI ст. and the later volumes remain wanted. **Status 2026-10-22 (specs/63 RF-8):** the transcription of this edition on izbornyk.org.ua (82 of 84 charters, 19,020 tokens; № 3 and № 84 missing) was NOT in the corpus: the files were untracked and author `pum14` had no verification record, so the build dropped them (the earlier «already covered» in RF-7 was wrong in effect). Now tracked in `data/seed/pum14/`, author record `pum14`, ingested by `pipelines/ingest-pum.ts` from `ops/worker/ingest.sh`, each charter dated by its own date line; projected 14th-c. tokens 2,102 → 20,083. The 1974 OCR was not used to fill № 3 and № 84 (diplomatic print, Ukrainian apparatus interleaved). Still wanted: XV ст., Волинські грамоти XVI ст., later volumes. |
| 22 | Онуфрій Манчук, «Жиб'ївські новелі» (Брустури 2024, 105 p., ISBN 9786178326630) | Hutsul dialect literature (research/40); copyrighted print, needs a legal copy (vocabulary-only use) | no free copy found (research/40) | wanted |
| 23 | Чабаненко (ed.), «Словник говірок Нижньої Наддніпрянщини», 4 vols (Запоріжжя 1992). Headwords: not confirmed (?) | SPEC 63 GG-8: headword plus a short gloss (© dictionary, same policy as SE); Запоріжжя/Херсонщина/Таврія have 0 tokens (analysis/regions.md) | searched archive.org (0 hits), web search (no scan); not found online | wanted |
| 24 | Онишкевич, «Словник бойківських говірок», ч. 1–2 (Київ 1984–85). Headwords: not confirmed (?) | GG-8, Boyko area | archive.org: 0 hits; web search: citations only, no scan | wanted |
| 25 | Лисенко (ed.), «Словник поліських говорів» (Київ 1974). Headwords: not confirmed (?) | GG-8, Polissia | archive.org: 0 hits; no scan found | wanted |
| 26 | Сабадош, «Словник закарпатської говірки села Сокирниця» (2008; 2nd ed. 2021, over 22.2 thousand dialect words per a search summary, unopened). The village name in the owner's brief («Холмець») is not confirmed (?) | GG-8, Transcarpathia; the largest postwar dialect dictionary of its kind | not found as a PDF; dspace.uzhnu.edu.ua (UzhNU repository, robots.txt not read) is where to ask | wanted |
| 27 | «Словник гуцульських говірок» (2019?). The exact title is not confirmed (?): search found «Гуцульська діалектна лексика та фраземіка в українській художній мові» vol. 1 (2019) and Астаф'єва–Воронич, «Словник гуцульських говірок Річки та Яворова» (2014) | GG-8, Hutsul area (research/40) | no full text found | wanted |
| 28 | «Словник буковинських говірок», ed. Гуйванюк (Чернівці: Рута, 2005, 688 pp.; the editor is from a search summary, the brief's «Загнітко» is not confirmed (?)) | GG-8, Bukovyna | no full text found | wanted |

## B. We'll harvest (online, no owner action; 16 entries)

| # | Work | Why | Link | Status |
|---|---|---|---|---|
| H1 | «Архив Юго-Западной России», 35 volumes (ч. 1 т. 1–12, 1859–1914; ч. 2–8). Item ids 0006697–0006731 listed on the page; contents of volumes other than ч. 1 т. 7 not opened (?) | 16th–17th c. documents and polemics, Middle Ukrainian; fills middle and late_middle | https://resource.history.org.ua/item/0006703 | harvest (to do) |
| H2 | Смотрицький, «Verificatia niewinności» (Вільно 1621), АЮЗР ч. 1 т. 7 (Київ 1887), pp. 279–344; «Obrona verificaciey» pp. 345–442 | Polish; context (r30) | https://www.uknol.info/en/Records/ArchivJuZR_1_07.html | harvest (low) |
| H3 | Сумцов, «Слобожане», Харків 1918, archive.org `slobozhane` (PDF 11.9 MB, DjVu 5.0 MB) | Слобожанщина; OCR-only text today (research/39) | https://archive.org/details/slobozhane | harvested as OCR; clean text wanted |
| H4 | Степан Руданський, «Твори» т. I (Львів 1912), «Співомовки» (Scranton 1920) and others on the uk.wikisource author page | Поділля, 19th c. | https://uk.wikisource.org/wiki/Автор:Степан_Руданський | harvest (proofread status ?; P-2 check) |
| H5 | Черемшина: «Село вигибає» 1925, «Верховина» 1929, «Село потерпає» 1930, «Парасочка» 1939 (research/40: scans without proofread pages) | Hutsul/Pokuttia | uk.wikisource scans (research/40) | harvest as OCR |
| H6 | «Опришки» (ЕЗ т. 26) scan, OCR only | 83 of 104 records recognised (research/40) | uk.wikisource scan | harvested (OCR) |
| H7 | Зизаній «Наука ку читаню» 1596 (r11) | research/45-hv4 | archive.org `zyzanii` | harvested |
| H8 | Литопис/Ізборник items of research/44 «Пріоритет для корпусу» 1–10 (Лексис, Беринда, Апокрисис, Вишенський …) | ПМ and polemic prose | http://litopys.org.ua/ (links in research/44) | harvested/ingested (status per hv4) |
| H9 | uk.wikisource harvest: 103,450 index lines versus 76,600 in the last build (corpus-10m §7) | corpus size | — | harvesting |
| H10 | Тимченко, «Історичний словник українського язика», т. 1, зошити 1–2 (Харків–Київ 1930, 1932; А—Жял, only two зошити were printed) — dated 14th–18th-c. quotations per sense (SPEC 63 SE-1) | gives sense lines with dated quotations; Є. Тимченко † 1948, so the text is public domain | https://archive.org/details/tymch1930 (OCR, 3.8 MB), https://archive.org/details/1.2.1932 (OCR, 3.1 MB), second scan https://archive.org/details/ISUJa (2 files) | queued (harvest/se-dicts.ts after HV-5) |
| H11 | Білецький-Носенко, «Словник української мови» (written 1838–1843; edition Німчук, Київ 1966, «Пам'ятки української мови») | language of the 1840s with dated usage; author † 1856 (PD); the 1966 editor's apparatus is not taken | https://archive.org/details/slovnyk33 (OCR, 2.1 MB) | queued |
| H12 | Закревський, «Словарь малороссийских идиомов» (1861, in «Старосветский бандуриста») | mid-19th-c. senses; author † 1871 (PD) | https://archive.org/details/bandurista3 (OCR, 1.5 MB); the item title says «Старосветский бандуриста» (kn. 3?) | queued |
| H13 | «Словник української мови XVI – першої половини XVII ст.», вип. 1–17 (1994–2017) and вип. 18– (2022–) | dated quotations of the 1500–1650 language per sense; copyrighted (Інститут українознавства НАН), so only headword and quotes ≤ 200 characters are kept (SE-9) | https://archive.org/details/SUM-28 (17 OCR files), https://archive.org/details/SUM-28_2 | queued; licence of the upload not stated |
| H14 | «Матеріали до словника писемної та книжної української мови XV–XVIII ст.» кн. 1–2 (Тимченко, ed. Німчук, Лиса, 2002–2003) and «Словник мови Шевченка» т. 1–2 (1964) | dated quotations (15th–18th c.; Shevchenko 1837–1861); editions are copyrighted: headword and quotes ≤ 200 characters only | https://archive.org/details/kniga1, https://archive.org/details/kniga2, https://archive.org/details/1_20230624_20230624, https://archive.org/details/2_20230624_202306 | queued; licence of the upload not stated |
| H15 | Словник староукраїнської мови XIV–XV ст. (1977–78) | already in the corpus (BL-11, headword lines by quotation decade); SE-1 reads it | archive.org `staroukr1`, `staroukr2` | harvested |
| H16 | Open lexical data already in the project: VESUM (CC BY-NC-SA 4.0), uk.wiktionary and en.wiktionary dumps (CC BY-SA), LanguageTool/Hunspell uk_UA (derived from VESUM, so no new headwords). No other openly licensed Ukrainian headword list was found (checked: archive.org search, Wikipedia; Chtyvo has closed — its robots.txt URL returns a closing notice, chtyvo.org.ua 2026-10-21) | GG-8: nothing new to add | — | have |

## C. Already supplied (do not send again)

Added 2026-10-21 (owner books, identified from the PDFs): РИБ т. 4 (1878) and РИБ т. 19 (1903) (Russian editions); Копистенський «Книга о вірі єдиній», Kyiv print c. 1620; Зизаній «Лексис» 1596–1946 reprint, ed. Др. Ярослав Рудницький (a different file from the earlier reprints; place not stated on the title page, so not recorded); Квітка «Малороссійскія повѣсти» т. 1 (Харьковъ 1887, Потебня); «Грамоти XIV ст.» (Пещак, Київ 1974). OCR of all of them is queued on the worker behind the build chain (`~/post-chain-ocr.sh`, charters first).

Added 2026-10-22 (owner books, matched by title in `books`): СУМ-11, «Словник української мови» in 11 vols (11 DjVu files) and СУМ-20, the 20-vol. «Словник української мови» (15 PDF files, `2sum20.pdf` … `15sum20.pdf`, `sum20_1.pdf`). Rights: Q-SE1 and research/47. Копистенський c. 1620 stays in A as «wanted (better copy)».

Matched by title against the folder listing of 2026-10-21: Зерцало богословия (Транквіліон 1618, r24); Київський Псалтир з Полуставом 1643; Беринда «Лексикон» 1627 (two scans) and 1653; Зизаній «Лексис» (reprint) and «Граматика»; Смотрицький «Граматіка»; Метлинський «Народныя южнорусскія пѣсни» (title match); the 1517–1519 Bible books (Бытія, Царств, Іова …); Огоновський, Смаль-Стоцький, Барвінський, Желехівський, Шухевич «Гуцульщина»; Берестейщина and Polissia dictionaries and atlases; АУМ т. 1–3; Лукаш «Фауст»; «Лісові чорти» 1983. Full listing: the `books` folder.

## D. Spec items blocked by a missing source

- CX-6 (specs/63): Квітка 1887 and the charter volumes: entries 20 and 21.
- AT-3 (specs/COVERAGE.md): manual row; blocked by a rebuild, not by a book.
- CV-4: pending implementation, not a source.

---

# Українською

## Зміни з останнього оновлення (2026-10-22)

- **Подано власником (збіг за назвою в `books`):** СУМ-11 (11 DjVu) і СУМ-20 (15 PDF: `2sum20.pdf` … `15sum20.pdf`, `sum20_1.pdf`); РИБ т. 4 і т. 19; Зизаній «Лексис» і передрук; Квітка «Малоросійські повісті» 1887, т. 1; «Українські грамоти XIV ст.» 1974. Усе в розділі В. Права на СУМ: Q-SE1 і лист-дозвіл (research/47).
- **Досі потрібно:** Копистенський «Книга о вірі єдиній» (бл. 1620) є в `books`, але OCR здебільшого сміття: «потрібно (кращий примірник)», тобто кращий скан або вичитаний передрук. Квітка т. 1 подано, **потрібен т. 2** (запис 20). Також РИБ т. 7 (1882, «Апокрисис»); «Українські грамоти XV ст.»; «Волинські грамоти XVI ст.»; Транквіліон «Євангеліє учительне» 1619; Калліст 1616; діалектні словники (23–28); Архів Коша; гетьманські універсали.
- **Стан корпусу (збірка 202610212253-48e380c):** N = 48,46 млн токенів повного тексту; 5 516 свідків; 454 027 статей (159 444 засвідчених + 294 583 лише зі словників) проти 508 тис. у Гороха. За століттями: XIV 2 102 (≈ 20 тис. після `pum14`), XV 136 044, XVI 113 006, XVII 342 145, XVIII 493 223. Після XIV ст. найтонші XV і XVI ст.
- Питання власнику збережено: **Q-SE1** і лист-дозвіл на СУМ (research/47).

**Топ-10 (2026-10-22):** 1) «Українські грамоти XV ст.»; 2) «Волинські грамоти XVI ст.» (1987); 3) РИБ т. 7 «Апокрисис» (1882); 4) Транквіліон, «Євангеліє учительне» 1619; 5) Калліст 1616; 6) Копистенський бл. 1620, кращий скан; 7) гетьманські універсали (Мазепа, Орлик, Кочубей); 8) «Архів Коша Нової Запорозької Січі»; 9) діалектні словники 23–28 (спершу Чабаненко); 10) Квітка, т. 2.

## Зміни з 2026-10-21 (перша версія)

- SPEC 63 SE-10: усі історичні словники з датованими значеннями знайдено онлайн (archive.org, OCR; H10–H15), у розділ А нічого не додано.
- Новий файл. Побудовано з research/44, analysis/corpus-10m.md, analysis/regions.md, research/39, 40, 45-hv4-old-grammars.md, specs/63, specs/COVERAGE.md, specs/GAPS.md і теки `books` (стан на 2026-10-21).
- **Подано** (знайдено в `books`, збіг за назвою): «Зерцало богословії» Транквіліона (r24); Псалтир з Полуставом 1643; Беринда 1627 і 1653; Зизаній «Лексис» і «Граматика»; Смотрицький «Граматіка»; Метлинський «Народныя южнорусскія пѣсни» (за транслітерованою назвою; рік у файлі не перевірено).
- **Переведено в «зберемо самі»**: r11 Зизаній «Наука ку читаню» 1596 (archive.org `zyzanii`, уже зібрано); r30 «Verificatia niewinności» Смотрицького (Вільно 1621) надруковано в «Архиве Юго-Западной России» ч. 1 т. 7 (Київ 1887), с. 279–344, скан знайдено. Рядок r30 у research/44 («не знайдено онлайн») застарів.

## Стан (докази)

- Горох: 508 тис. заголовних слів, корпус 260 млн слів. У нас (збірка 202610212253-48e380c): 48,46 млн токенів повного тексту у 5 516 свідках; 454 027 статей. Раніше: ≈205 млн токенів, з них 46 353 973 повного тексту у 4 336 свідках.
- 86% токенів корпусу з OCR газет archive.org (не вичитано).
- Епохи: proto 7 214; old 259 552; early_middle 148 347; middle 463 197; late_middle 195 475; modern 45 280 188 (97,7%). Усе до 1800 р. менше 1,2 млн токенів.
- Регіони: Запоріжжя, Херсонщина, Таврія, Донеччина, Луганщина мають 0; 11 історичних територій мають 0 свідків; Київ 400 тис., Галичина 156 тис., Слобожанщина 100 тис. Гетьманська канцелярія, Мазепа й Орлик відсутні (GAPS).
- Жанр: вичитаних книг 1800–1950 мало.

Формат кожного запису: скан PDF або DjVu від 300 dpi, текстовий шар бажаний. Класти в `C:\Users\User\IdeaProjects\dmitrijza\.claude\worktrees\ukr-lexicon-mvp\books`.

## Питання власнику

- **Q-SE1** (SPEC 63 SE-11): OCR трьох словників під © розібрано, але зберігаємо лише заголовне слово, глосу ≤ 200 знаків, сигли й дати цитат (СУМ XVI – 1-ї пол. XVII ст.; «Матеріали до словника XV–XVIII ст.»; Словник мови Шевченка). Чи можна зберігати більше (повні дефініції, текст цитат)? Правовласники: НАН, інститути, упорядники (?). До вашого підтвердження більше нічого не зберігається.
- **Лист-дозвіл на СУМ** (research/47): СУМ-11 і СУМ-20 подано як скани; лист правовласнику щодо використання понад заголовні слова ще відкритий.

## А. Потрібно від власника (22 записи; нумерація як в англійській таблиці)

Якщо не сказано інакше: статус «потрібно», «не знайдено онлайн».

1. Транквіліон, «Євангеліє учительне», Рахманів 1619 (r28): ПМ, найціннішa лексика. Видання 1697 р. (Могильов) показує Музей книги (https://www.mkdu.com.ua/kolektsiia/kolektsiia-onlajn/ievanheliie-uchytelne-1697/; посилання з Вікіпедії, мій запит дав HTTP 403, не відкрито). Найкраще наукове видання не з'ясовано (?).
2. Смотрицький (перекладач), «Євангеліє учительноє … Калліста», Євє 1616 (r22): ПМ; уривки http://litopys.org.ua/old17/old17_11.htm (за research/44).
3. РИБ т. 4 (1878), т. 7 (1882), т. 19 (1903) = «Памятники полемической литературы в Западной Руси»: повний текст «Палінодії» Копистенського й Антирисису. Номери томів за пошуковою довідкою; скан не відкривав (?). **ПОДАНО 2026-10-21 (частково):** РИБ т. 4 (1878, ред. Гильтебрандт; `Русская_историческая_библиотека_Том_04_1878(2).pdf`, 441 розворот, без текстового шару; Палінодія = друковані стовпці 313–1200, текст 313–1180) і РИБ т. 19 (1903, кн. 3: Ектезис, Отпис клирика, Антирисис Потія …). Досі потрібен т. 7 (Апокрисис, кн. 2). Обидва томи — російські видання (прапорець `ru`, research/46); OCR у черзі.
4. Копистенський, «Книга о вірі єдиній» (1619–1621) і «Книга о правдивой єдності» (1623), рукописи (r29, r34); видання не з'ясовано (?). **ПОДАНО 2026-10-21 (частково):** «Книга о вірі єдиній» — оригінальний київський друк, бл. 1620 (на титулі «ок. 1620»; примірник Державної історичної бібліотеки УРСР), без видавничого апарату, не російське видання. Досі потрібна «Книга о правдивой єдності» (1623).
5. Борецький, «Аполлія», Київ 1628 (r38).
6. Зизаній, «Катехізис», Москва 1627 (r36).
7. Борецький, «Лімонар», Київ 1628 (r37).
8. Борецький, «Діалог о вере православной», 1606 (r17).
9. Копинський, «Алфавіт духовний» (r43), дата невідома.
10. «Лямент по отцю Івану Василевичу», Луцьк 1628 (r40).
11. «Протестація», Київ 1621 (r31).
12. Зизаній, «Поученіє при погребі Софії Чарториської» (r25).
13. Митура, «Візерунок цнот», Київ 1618 (r23).
14. Земка, передмови до «Служебника» 1629 і «Тріоді цвітної» 1631 (r41, r42).
15. Борецький, «Анфологіон», Київ 1619 (r27), ЦС, низький пріоритет.
16. Смотрицький «Апологія», Львів 1628 (r39), і віленська польська відповідь Потію 1608 (r19): польська мова, низький пріоритет.
17. «Архів Коша Нової Запорозької Січі» (видання не з'ясовано, ?): Запоріжжя має 0; скану не знайшов.
18. Яворницький, інші праці про Запоріжжя (у корпусі вже `yavornytsky1912`, `yavornytsky1923`); яких бракує, ?.
19. Гетьманська канцелярія: універсали та листи Мазепи, Орлика, Кочубея (research/18; видання ?).
20. (потрібен також т. 2) Квітка-Основ'яненко, «Малороссійскія повѣсти», Харків 1887, ред. Потебня (CX-6): копії не знайдено. **ПОДАНО 2026-10-21:** саме потрібне видання: Квітка (Основьяненко), «Малороссійскія повѣсти», т. 1, Харьковъ 1887, ред. А. А. Потебня (Харківське земство); передмова російською, текст — власна українська орфографія видання. Прапорець `ru`: apparatus (research/46). Дати першодруку кожної повісті ще потребують джерела з цитатою. **Датовано 2026-10-22 (specs/63 RF-9; роки першого друку за примітками самого видання 1887 р.):** Суплика 1833; Салдацький патрет 1833–34 (альманах «Утренняя Звѣзда» на 1833 р., Харків, друк 1834); Маруся 1834; Мертвецький велик-день 1834; Добре роби, добре й буде та Конотопська відьма 1833–34 (примітка називає лише цензурну помітку першого видання, Москва 4.10.1833, — помітку книги 1834 р.; рік друку прямо не названо). Завантаження: `pipelines/ingest-kvitka.ts`; російський апарат Потебні виключено; жодної не пропущено.
21. «Пам'ятки української мови»: грамоти XIV, XV ст., Волинські грамоти XVI ст., Приватні листи XVIII ст., Київ 1965, 1974, 1987, 1995 (CX-6). **ПОДАНО 2026-10-21 (лише XIV ст.):** «Грамоти XIV ст.», упорядкування, вступна стаття, коментарі, словники-покажчики М. М. Пещак; відп. ред. В. М. Русанівський; АН УРСР, Інститут мовознавства ім. О. О. Потебні; Київ: Наукова думка, 1974; 84 грамоти. Ліцензія: тексти XIV ст. — суспільне надбання; апарат видання 1974 р. (вступ, коментарі, бібліографія, різночитання, покажчики) — © Наукова думка, виключений повністю. Київ, УРСР: не `ru`. XV ст., Волинські грамоти XVI ст. та пізніші томи й надалі потрібні. **Стан 2026-10-22 (specs/63 RF-8):** транскрипція цього видання на izbornyk.org.ua (82 з 84 грамот, 19 020 токенів; немає № 3 і № 84) досі НЕ входила до корпусу: файли були неподані до репозиторію, а автор `pum14` не мав запису верифікації, тож збірка їх відкидала. Тепер файли в `data/seed/pum14/`, запис автора `pum14`, завантаження `pipelines/ingest-pum.ts` через `ops/worker/ingest.sh`, кожна грамота датована власним рядком дати; XIV ст.: 2 102 → 20 083 токени. OCR 1974 р. для № 3 і № 84 не використано. XV ст., Волинські грамоти XVI ст. та пізніші томи й надалі потрібні.
22. Манчук, «Жиб'ївські новелі» (Брустури 2024, ISBN 9786178326630): гуцульська говірка, потрібна легальна копія.
23–28. Діалектні словники (SPEC 63 GG-8): Чабаненко, «Словник говірок Нижньої Наддніпрянщини» (4 т., 1992); Онишкевич, «Словник бойківських говірок» (1984–85); Лисенко, «Словник поліських говорів» (1974); Сабадош, словник закарпатської говірки (с. Сокирниця? 2008/2021, понад 22,2 тис. слів за пошуковою довідкою); гуцульські говірки (назву уточнити ?); «Словник буковинських говірок» (Рута 2005, ред. Гуйванюк ?). Онлайн-скан я не знайшов (archive.org: 0 збігів). Кількість заголовних слів не підтверджена (?). Опрацьовувати як інші © словники: заголовне слово + коротка глоса.

## Б. Зберемо самі (онлайн; 15 записів)

- H10 Тимченко, «Історичний словник українського язика», т. 1, зошити 1–2 (1930, 1932; А—Жял): https://archive.org/details/tymch1930, https://archive.org/details/1.2.1932 (друге сканування: ISUJa). H11 Білецький-Носенко, словник 1838–1843, вид. 1966: https://archive.org/details/slovnyk33. H12 Закревський 1861: https://archive.org/details/bandurista3. H13 СУМ XVI – 1-ї пол. XVII ст.: https://archive.org/details/SUM-28. H14 «Матеріали до словника XV–XVIII ст.» (kniga1, kniga2) і «Словник мови Шевченка» (1_20230624_20230624, 2_20230624_202306). H15 Словник староукраїнської мови XIV–XV ст. (уже в корпусі). Усе знайдено, нічого не додано до розділу А; ліцензію архів не вказує (статус — моє прочитання за роком смерті автора), якість OCR H13/H14 ?.

- H1 «Архив Юго-Западной России», 35 томів: https://resource.history.org.ua/item/0006703 (перелік відкрито; вміст томів, крім ч. 1 т. 7, не перевіряв).
- H2 Смотрицький «Verificatia niewinności» (1621) в АЮЗР ч. 1 т. 7: https://www.uknol.info/en/Records/ArchivJuZR_1_07.html.
- H3 Сумцов, «Слобожане», Харків 1918: https://archive.org/details/slobozhane (зібрано як OCR; потрібен чистий текст).
- H4 Руданський, Твори т. I (1912) та інші: https://uk.wikisource.org/wiki/Автор:Степан_Руданський (стан вичитки ?).
- H5 Черемшина, чотири збірки (research/40), OCR.
- H6 «Опришки» (OCR, зібрано). H7 Зизаній 1596 (зібрано). H8 литопис/ізборник за research/44. H9 Вікіджерела: 103 450 рядків проти 76 600 у збірці.

## В. Уже подано (не надсилати)

Додано 2026-10-21 (книги власника, визначені за PDF): РИБ т. 4 (1878) і т. 19 (1903) (російські видання); Копистенський «Книга о вірі єдиній», київський друк бл. 1620; Зизаній «Лексис» 1596–1946, передрук за ред. Др. Ярослава Рудницького (інший файл, ніж раніші передруки; місце на титулі не вказано); Квітка «Малороссійскія повѣсти» т. 1 (Харьковъ 1887, Потебня); «Грамоти XIV ст.» (Пещак, Київ 1974). Їхній OCR стоїть у черзі на сервері після ланцюга збірки (`~/post-chain-ocr.sh`, спершу грамоти).

Додано 2026-10-22: СУМ-11 (11 томів, DjVu) і СУМ-20 (15 PDF). Права: Q-SE1 і research/47. Копистенський бл. 1620 лишається в А як «потрібно (кращий примірник)».

Див. англійський розділ C: Зерцало, Псалтир 1643, Беринда, Зизаній, Смотрицький, Метлинський, граматики, Берестейщина, Полісся, АУМ т. 1–3, «Лісові чорти» 1983.

## Г. Блокери специфікацій

CX-6 (записи 20, 21); AT-3 (чекає на перебудову, не на книгу); CV-4 (реалізація).
