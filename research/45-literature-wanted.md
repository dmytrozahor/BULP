# 45. Literature wanted / Список потрібної літератури

Updated / Оновлено: 2026-10-23 (version 4). Regenerated every 3 h by the orchestrator (SPEC 63 LW-1) / перегенерується оркестратором кожні 3 год (SPEC 63 LW-1).

English first, then Ukrainian (as in README). Every claim comes from a file in this repository or from a page I opened; «?» marks anything I could not confirm; nothing is invented. «Not found online» only means «not found by me».

---

# English

## Changes since last update (2026-10-23, version 4)

- **Supplied and ingested (already in section C and entry 21):** «Українські грамоти XV ст.» (ed. В. М. Русанівський, Київ: Наукова думка, **1965**; 62 charters) and «Волинські грамоти XVI ст.» (ed. В. Б. Задорожний, А. М. Матвієнко, Київ: Наукова думка, **1995**, not 1987; 125 acts). Both are marked supplied everywhere; the year 1987 is removed from entry 21 and from the Top 10. Consistency check of the charter agent's earlier edits (RF-11): the figures agree (15th c. 137k → 158.9k; 16th c. 225k → 299.6k).
- **Corpus state (build 202610222130-861b7ef):** N = 49.18M tokens; 5,806 witnesses; 515,697 entries. By century: 13th 38.6k; 14th 20.1k; 15th 158.9k; 16th 299.6k; 17th 640k. The 13th and 14th c. are still the thinnest.
- **New top bottleneck: dialect labels (SPEC 63 LB).** They cover only 20.7% of lemmas: (a) dictionary 5.4%, (b) corpus-regional 10.4%, (c) 4.9%, (d) insufficient data 79.3%. Class (a) is the strongest evidence, and **regional dialect dictionaries are the only source of the cited «діалектне за словником» labels**. They move to the TOP of the owner-needed list (new table «A0» and the new Top 10). Titles and years were checked against bibliographic citations found by web search (not a library catalogue record I opened); anything not confirmed is marked «?».
- **Found online while verifying:** Аркушин, «Словник західнополіських говірок» (2 vols, Луцьк 2000) has a scan on archive.org (`slzhdplhv`, from a search result, not opened by me): it can be harvested instead of asked from the owner.
- New entries 30 («Словник говірок Середньої Наддніпрянщини», edition not identified) and 31 (Ганудель, «Лемківські говірки», nothing found). The others (13th-c. sources, charters XIV № 3 and 84, РИБ т. 7, Транквіліон 1619, Калліст 1616, Копистенський better scan, hetman universals, Архів Коша) stay, below the dialect dictionaries. Open owner questions unchanged: **Q-SE1** and the СУМ permission letter (research/47).

## Changes in version 3 (2026-10-22, build 202610221132-482eb8e)

- **Live build 202610221132-482eb8e (`public/data/boot.json` on origin/mvp):** N = 49.08M full-text tokens; nVocab = 494.7M (corpus about 544M words against Горох 260M); 5,615 witnesses; 477,951 entries (159,861 attested + 318,090 dictionary-only) against Горох 508k.
- **Tokens by century (centurySizes):** 11th 82.7k; 12th 144k; 13th 38.6k; 14th 20.1k (was 2.1k: the `pum14` charters, entry 21, are now in); 15th 137k; 16th 225k (was 113k); 17th 640k (was 342k); 18th 493k; 19th 4.78M; 20th 41.6M; 21st 0.94M.
- **Re-ranked:** the 13th, 14th and 15th c. are now the thinnest; the 16th c. is better but still thin next to the 17th. The items that fill the 13th–15th c. move up in the Top 10 (under «Where we stand»). New entry 29 (13th-c. sources, edition still to be identified). The 14th-c. charters № 3 and № 84 are still missing from `pum14`.
- **No new books were supplied since version 2.** Nothing is moved to section C. Open owner questions unchanged: **Q-SE1** and the СУМ permission letter (research/47).
- The Галицько-Волинський літопис is not requested again: it is the 13th-c. part of the Hypatian codex, and the Hypatian text is already in the corpus (`pipelines/manifest.ts`, id `hypatian`, 41 izbornyk pages). I did not check how many of the 38.6k 13th-c. tokens it supplies (?).

## Changes in version 2 (2026-10-22, earlier build 202610212253-48e380c)

- **Supplied by the owner (matched by title in `books`):** СУМ-11 (Словник української мови in 11 vols, 11 DjVu files `Білодід … Том 01–11.djvu`) and СУМ-20 (Словник української мови in 20 vols, 15 PDF files: `2sum20.pdf` … `15sum20.pdf`, `sum20_1.pdf`; which volume each file holds is not checked, ?); РИБ т. 4 and т. 19 (noted 2026-10-21); Зизаній «Лексис» and its reprint (`Зизаній_Hrammatika_slovienska_Lieksys.pdf`, `репринт_Зизаній_Лексис_Synonima_slavenorosskaia.pdf`); Квітка «Малоросійські повісті» 1887 т. 1; «Українські грамоти XIV ст.» 1974 (`XIV1974.pdf`); **2026-10-22:** «Українські грамоти XV ст.» (Київ: Наукова думка, 1965; `gramotyxv.pdf`) and «Волинські грамоти XVI ст.» (Київ: Наукова думка, **1995**; `e_dzherela_gramoti_1995.pdf`). All are in section C. Rights to the СУМ editions: Q-SE1 and the permission letter (research/47).
- **Still wanted, with a qualifier (the XV ст. and Волинські грамоти XVI ст. are now supplied, see entry 21):** Копистенський «Книга о вірі єдиній» c. 1620 is in `books`, but its OCR is mostly garbage: status **wanted (better copy)** (a better scan or a proofread reprint). Квітка т. 1 is supplied; **т. 2 is wanted** (entry 20). Unchanged and still wanted: РИБ т. 7 (1882, «Апокрисис»), «Українські грамоти XV ст.», «Волинські грамоти XVI ст.», Транквіліон «Євангеліє учительне» 1619, Калліст 1616, the dialect dictionaries (entries 23–28), the Архів Коша, the hetman universals.
- **Corpus state (live build 202610212253-48e380c, `public/data/boot.json` on origin/mvp):** N = 48.46M full-text tokens; 5,516 witnesses; 454,027 entries (159,444 attested + 294,583 dictionary-only) against Горох 508k. Tokens by century: 14th 2,102 (about 20k after the `pum14` charters land, entry 21), 15th 136,044, 16th 113,006, 17th 342,145, 18th 493,223 (19th 4.70M, 20th 41.47M). After the 14th, the 15th and 16th centuries are now the thinnest, so the new «Top 10» (under «Where we stand») puts 15th–16th c. sources first.
- Open owner questions kept: **Q-SE1** and the СУМ permission letter (research/47).

## Changes since 2026-10-21 (first version)

- SPEC 63 SE-10 (sense evolution): I looked for every dated-sense historical dictionary online. All were found on archive.org with an OCR text (H10–H15); none had to be moved to section A, so no new owner book is requested for them. Open questions: the archive.org items state no licence (the status is my reading of the author's death year), and the OCR quality of H13/H14 is unchecked (?).
- New file. Built from research/44-bratstva-bibliography.md, analysis/corpus-10m.md, analysis/regions.md, research/39, research/40, research/45-hv4-old-grammars.md, specs/63-corpus-dialects.md, specs/COVERAGE.md, specs/GAPS.md and the owner's `books` folder (listing taken 2026-10-21).
- Marked **supplied** (found in `books`, matched by title): Транквіліон «Зерцало богословії» (`Зерцало_богословия.pdf`, r24); Київський Псалтир з Полуставом 1643 (`1643-r.-Kyivs-kyy-Psaltyr-z-Poluustavu.pdf`); Беринда «Лексикон» 1627 and 1653; Зизаній «Лексис» (reprint) and «Граматика»; Смотрицький «Граматіка»; Метлинський «Народныя южнорусскія пѣсни» (`Narodnyja_juznorusskija_pesni.pdf`; matched by transliterated title, the year 1854 is not checked in the file).
- Moved to **harvest** (online, so not asked from the owner): r11 Зизаній «Наука ку читаню» 1596 (research/45: archive.org `zyzanii`, harvested); r30 Смотрицький «Verificatia niewinności» (Вільно 1621) is printed in «Архив Юго-Западной России» ч. 1 т. 7 (Київ 1887), pp. 279–344, and I found its scan. research/44 lists r30 as «не знайдено онлайн»; that row is outdated.

## Where we stand (evidence)

- Горох: 508k headwords and a 260M-word frequency corpus (specs/63 DO). Ours (live build 202610221132-482eb8e, 2026-10-22): N = 49.08M full-text tokens in 5,615 witnesses, plus nVocab 494.7M (corpus about 544M); 477,951 entries (159,861 attested + 318,090 dictionary-only) against Горох 508k. By century: 13th 38.6k, 14th 20.1k, 15th 137k, 16th 225k, 17th 640k, 18th 493k. Earlier figures (analysis/corpus-10m.md §1): about 205M tokens, of which 46,353,973 full text in 4,336 witnesses.
- 86% of corpus tokens come from archive.org OCR (`hv_ia_*`: 40,010,549 of 46.5M, not proofread). Source: analysis/corpus-10m.md §4.1.
- Epochs (N tokens, §4.3): proto 7,214; old 259,552; early_middle 148,347; middle 463,197; late_middle 195,475; modern 45,280,188 (97.7%). Everything before 1800 is under 1.2M tokens.
- Regions (analysis/regions.md): Запоріжжя, Херсонщина, Таврія, Донеччина, Луганщина have 0 tokens; the 11 historical territories (Берестейщина … Курщина) have 0 witnesses; Київ has 400k, Галичина 156k, Слобожанщина 100k. specs/GAPS.md adds: Hetmanate chancery, Мазепа and Орлик absent.
- Genre: the modern bulk is newspaper OCR; proofread book text of 1800–1950 is rare.

**Top 10 now (re-ranked 2026-10-23, version 4; reason: dialect labels cover 20.7% of lemmas, class (a) «діалектне за словником» comes only from regional dictionaries):**

1. Чабаненко (ed.), «Словник говірок Нижньої Наддніпрянщини», 4 vols (Запоріжжя: Комунар, 1992 or 1993 ?): the South-East (Запоріжжя, Херсонщина, Таврія have 0 tokens); headwords ? (entry 23).
2. Онишкевич, «Словник бойківських говірок», ч. 1 (Київ 1984; ч. 2 1985 ?): Boyko area; headwords ? (entry 24).
3. Лисенко (ed.), «Словник поліських говорів» (Київ 1974 ?): Polissia; not found in any search, title and year unconfirmed (entry 25).
4. Сабадош, «Словник закарпатської говірки села Сокирниця» (Ужгород 2008; 2nd ed. 2021): Transcarpathia (Хустський район); over 22.2k dialect words in the 2021 ed. (entry 26).
5. «Гуцульські говірки: короткий словник» (Львів: Інститут українознавства, 1997, 232 pp., ed. Я. Закревська): Hutsul area; headwords ? (entry 27).
6. «Словник буковинських говірок» (Чернівці: Рута, 2005, 688 pp., ed. Н. Гуйванюк; also the chrestomathy «Буковинські говірки», Рута 2006, 383 pp.): Bukovyna; headwords ? (entry 28).
7. Аркушин, «Словник західнополіських говірок», 2 vols (Луцьк 2000): Western Polissia/Volyn; about 13,000 words; a scan exists on archive.org (`slzhdplhv`), so harvest first (entry 28a below).
8. «Словник говірок Середньої Наддніпрянщини»: Middle Dnipro region; the edition, year and editor are not identified (?) (entry 30).
9. Ганудель, «Лемківські говірки»: Lemko area; title, year, publisher not found (?) (entry 31).
10. 13th-c. sources (entry 29; edition to be identified, ?): the 13th c. has 38.6k tokens.

Below them, unchanged (not dialect-related): clean text of 14th-c. charters № 3 and № 84 (entry 21; transcription task); РИБ т. 7, СПб. 1882 «Апокрисис» (entry 3); Транквіліон, «Євангеліє учительне», 1619 (entry 1); Калліст, Євє 1616 (entry 2); Копистенський c. 1620, better scan (entry 4); hetman universals (entry 19); «Архів Коша» (entry 17); Квітка т. 2 (entry 20). Supplied and removed from the list: «Українські грамоти XV ст.» (1965) and «Волинські грамоти XVI ст.» (1995).

Priority rule: (1) ПМ and lexis-rich works named by research/44; (2) epochs and regions with zero or near-zero tokens; (3) works that unblock a SPEC item; (4) Polish and Church Slavonic items last. Format for every entry unless stated: scan PDF or DjVu at 300 dpi or more; a text layer is a bonus. Drop files into `C:\Users\User\IdeaProjects\dmitrijza\.claude\worktrees\ukr-lexicon-mvp\books`.

## Owner questions

- **Q-SE1** (SPEC 63 SE-11): the OCR of three copyrighted dictionaries is parsed, but only the headword, a gloss ≤ 200 characters, the sigla and the quotation dates are stored (СУМ XVI – першої половини XVII ст., Інститут українознавства НАН; «Матеріали до словника XV–XVIII ст.» ed. Німчук, Лиса 2002–2003; Словник мови Шевченка, Інститут мовознавства 1964). May we store more (full definitions, quotation text)? Who holds the rights: НАН, the institutes, the editors (?). Until you confirm, nothing more is stored.
- **СУМ permission letter** (research/47): СУМ-11 and СУМ-20 are now supplied as scans; the letter asking the rights holder for permission to use them beyond headword-level data is still open.

## A0. Top of the owner-needed list: regional dialect dictionaries (SPEC 63 LB / GG-8)

Why: they are the only source of the cited «діалектне за словником» labels (class a, 5.4% of lemmas now). Headword counts are from search summaries where given, otherwise «?». Format: scan or text; headword plus a short gloss only (same © policy as SE).

| # | Dictionary (title, year) | Region | Est. headwords | Verified from | Entry |
|---|---|---|---|---|---|
| 1 | Чабаненко (ed.), «Словник говірок Нижньої Наддніпрянщини», т. 1–4, Запоріжжя: Комунар, 1992 (? one source suggests 1993) | Lower Dnipro: Запоріжжя, Херсонщина, Таврія | ? | bibliographic citation (4 vols, Комунар); year unconfirmed | 23 |
| 2 | Онишкевич М. Й., «Словник бойківських говірок», ч. 1, Київ 1984 (ч. 2: 1985 ?) | Boyko (Carpathians) | ? | citation in a Lviv thesis; publisher not named | 24 |
| 3 | Лисенко П. С. (?), «Словник поліських говорів», 1974 (?) | Polissia | ? | not found in any source (?) | 25 |
| 4 | Сабадош І., «Словник закарпатської говірки села Сокирниця Хустського району», Ужгород 2008; 2nd ed. 2021 | Transcarpathia (Мараморощина) | over 22,200 (2021 ed.) | citations in UzhNU papers | 26 |
| 5 | «Гуцульські говірки: короткий словник», відп. ред. Я. Закревська, Львів: Інститут українознавства НАН України, 1997, 232 pp. | Hutsul | ? | 2 bibliographies agree | 27 |
| 6 | «Словник буковинських говірок», за заг. ред. Н. Гуйванюк, Чернівці: Рута, 2005, 688 pp. (+ «Буковинські говірки», хрестоматія, Рута 2006, 383 pp.) | Bukovyna | ? | bibliography; 2 reviews exist | 28 |
| 7 | Аркушин Г. Л., «Словник західнополіських говірок», 2 vols, Луцьк: Вежа, 2000 (ISBN 966-600-007-5; 966-600-013-X) | Western Polissia, Volyn | about 13,000 | archive.org item `slzhdplhv` (search result) | 28a |
| 8 | «Словник говірок Середньої Наддніпрянщини» | Middle Dnipro | ? | no record found: editor, year ? | 30 |
| 9 | Ганудель, «Лемківські говірки» | Lemko | ? | nothing found (?) | 31 |

## A. Wanted from the owner (31 entries; entries 23–28, 30, 31 are the dialect dictionaries of A0)

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
| 21 | «Пам'ятки української мови»: «Українські грамоти XIV ст.», «… XV ст.», «Волинські грамоти XVI ст.», «Приватні листи XVIII ст.», Київ 1965, 1974, 1995 (the earlier «1987» was a guess; «Приватні листи XVIII ст.»: year ?) (CX-6) | Dated, localised Middle Ukrainian charters; 353 `pum14` charters are excluded for lack of an author record (corpus-10m §2). Ingest status of the later volumes: ? | catalogue entry only (spec CX-6); no scan found | wanted **SUPPLIED 2026-10-21 (XIV ст. part only):** «Грамоти XIV ст.» (Пам'ятки української мови), упорядкування, вступна стаття, коментарі, словники-покажчики М. М. Пещак; відп. ред. В. М. Русанівський; АН УРСР, Інститут мовознавства ім. О. О. Потебні; Київ: Наукова думка, 1974; 84 charters; file `XIV1974.pdf` → worker `Українські_грамоти_XIV_ст_1974.pdf`. Licence: the 14th-c. texts are public domain; the 1974 apparatus (introduction, commentary, bibliography, variants, indexes) is © Наукова думка 1974 and is excluded entirely. Kyiv, USSR publication: not a `ru` edition. XV ст. and the Волинські грамоти XVI ст. were supplied 2026-10-22 (below); the later volumes remain wanted. **Status 2026-10-22 (specs/63 RF-8):** the transcription of this edition on izbornyk.org.ua (82 of 84 charters, 19,020 tokens; № 3 and № 84 missing) was NOT in the corpus: the files were untracked and author `pum14` had no verification record, so the build dropped them (the earlier «already covered» in RF-7 was wrong in effect). Now tracked in `data/seed/pum14/`, author record `pum14`, ingested by `pipelines/ingest-pum.ts` from `ops/worker/ingest.sh`, each charter dated by its own date line; projected 14th-c. tokens 2,102 → 20,083 (confirmed in build 202610221132-482eb8e: 20.1k). The 1974 OCR was not used to fill № 3 and № 84 (diplomatic print, Ukrainian apparatus interleaved). **SUPPLIED 2026-10-22 (specs/63 RF-11):** `gramotyxv.pdf` = «Українські грамоти XV ст.», підготовка тексту, вступна стаття й коментарі В. М. Русанівського, АН УРСР, Інститут мовознавства ім. О. О. Потебні, серія юридичної літератури, Київ: Наукова думка, 1965 (65 charters + 2 appendices; text layer; 62 ingested, 20.0k tokens; № 9 = № 57 of the 1974 edition, not counted twice); `e_dzherela_gramoti_1995.pdf` = «Волинські грамоти XVI ст.», упорядники В. Б. Задорожний, А. М. Матвієнко, НАН України, Інститут української мови, Інститут української археографії, Київ: Наукова думка, **1995** (128 acts of the Volodymyr land court books 1540–1580; no text layer, local Tesseract OCR; 125 ingested, 74.3k tokens). Both apparatus parts are © Наукова думка and excluded. Still wanted: later volumes («Приватні листи XVIII ст.» etc.). |
| 22 | Онуфрій Манчук, «Жиб'ївські новелі» (Брустури 2024, 105 p., ISBN 9786178326630) | Hutsul dialect literature (research/40); copyrighted print, needs a legal copy (vocabulary-only use) | no free copy found (research/40) | wanted |
| 23 | **(A0 #1)** Чабаненко (ed.), «Словник говірок Нижньої Наддніпрянщини», 4 vols (Запоріжжя: Комунар, 1992; year not confirmed, one source suggests 1993). Headwords: ? | SPEC 63 GG-8: headword plus a short gloss (© dictionary, same policy as SE); Запоріжжя/Херсонщина/Таврія have 0 tokens (analysis/regions.md) | searched archive.org (0 hits), web search (no scan); not found online | wanted |
| 24 | **(A0 #2)** Онишкевич, «Словник бойківських говірок», ч. 1 (Київ 1984; ч. 2 1985 ?). Headwords: ? | GG-8, Boyko area | archive.org: 0 hits; web search: citations only, no scan | wanted |
| 25 | **(A0 #3)** Лисенко (ed.), «Словник поліських говорів» (Київ 1974): a search found no record, so title and year are unconfirmed (?). Headwords: ? | GG-8, Polissia | archive.org: 0 hits; no scan found | wanted |
| 26 | Сабадош, «Словник закарпатської говірки села Сокирниця» (2008; 2nd ed. 2021, over 22.2 thousand dialect words per a search summary, unopened). Village Сокирниця (Хустський район) is confirmed by UzhNU papers. **(A0 #4)** | GG-8, Transcarpathia; the largest postwar dialect dictionary of its kind | not found as a PDF; dspace.uzhnu.edu.ua (UzhNU repository, robots.txt not read) is where to ask | wanted |
| 27 | **(A0 #5)** «Гуцульські говірки: короткий словник», відп. ред. Я. Закревська, Львів: Інститут українознавства НАН України, 1997, 232 pp. (title, year and pages agree in two bibliographies; the earlier «2019?» guess is dropped). Related, not the same: Астаф'єва–Воронич, «Словник гуцульських говірок Річки та Яворова» (2014) | GG-8, Hutsul area (research/40) | no full text found | wanted |
| 28 | **(A0 #6)** «Словник буковинських говірок», за заг. ред. Н. В. Гуйванюк (Чернівці: Рута, 2005, 688 pp.; confirmed by a bibliography; the Буковинські говірки materials: хрестоматія, Рута 2006, 383 pp., and the earlier six issues of «Матеріали до словника буковинських говірок», 1971–1979, А–К) | GG-8, Bukovyna | no full text found | wanted |
| 28a | **(A0 #7)** Аркушин Г. Л., «Словник західнополіських говірок», 2 vols (Луцьк: Вежа, 2000; т. 1 А–Н 354 pp., т. 2 О–Я 456 pp.; about 13,000 words) | GG-8, Western Polissia/Volyn | archive.org `slzhdplhv` (from a search result, not opened by me); harvest first, ask the owner only if the scan fails | harvest (to verify), else wanted |
| 29 | 13th-c. Ruthenian texts other than the Hypatian codex (the Галицько-Волинський літопис is already in via `hypatian`). Candidates and editions: **not identified (?)**; I name no edition here | The 13th c. has 38.6k tokens (centurySizes, build 202610221132-482eb8e), thinner than the 15th–17th | not searched yet | wanted (edition to be identified) |
| 30 | **(A0 #8)** «Словник говірок Середньої Наддніпрянщини» (editor, year, publisher: not identified, ?) | GG-8, Middle Dnipro; no dictionary of this name turned up in a search | not found | wanted (edition to be identified) |
| 31 | **(A0 #9)** Ганудель, «Лемківські говірки» (title, year: nothing found, ?) | GG-8, Lemko area. Related, not the same: П. Пиртей, «Словник лемківської говірки. Матеріали для словника» (a chtyvo PDF was in search results, unopened) | not found | wanted (edition to be identified) |

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

## Зміни з останнього оновлення (2026-10-23, версія 4)

- **Подано й введено (уже в розділі В і записі 21):** «Українські грамоти XV ст.» (ред. В. М. Русанівський, Київ: Наукова думка, **1965**; 62 грамоти) і «Волинські грамоти XVI ст.» (упорядники В. Б. Задорожний, А. М. Матвієнко, Київ: Наукова думка, **1995**, а не 1987; 125 актів). Скрізь позначено «подано»; рік 1987 прибрано із запису 21 і з Топ-10. Перевірка правок агента грамот (RF-11): цифри збігаються (XV ст. 137 → 158,9 тис.; XVI ст. 225 → 299,6 тис.).
- **Стан корпусу (збірка 202610222130-861b7ef):** N = 49,18 млн токенів; 5 806 свідків; 515 697 статей. За століттями: XIII 38,6 тис.; XIV 20,1 тис.; XV 158,9 тис.; XVI 299,6 тис.; XVII 640 тис. Найтонші досі XIII і XIV ст.
- **Нове найвужче місце: діалектні мітки (SPEC 63 LB).** Охоплено лише 20,7% лем: (а) словник 5,4%, (б) регіональний корпус 10,4%, (в) 4,9%, (г) недостатньо даних 79,3%. Клас (а) найсильніший, а **регіональні діалектні словники — єдине джерело міток «діалектне за словником»**. Їх піднято на ВЕРХ списку «потрібно від власника» (нова таблиця А0 і новий Топ-10). Назви й роки звірено з бібліографічними посиланнями, знайденими пошуком (не з бібліотечним каталожним записом, який я відкрив); непідтверджене позначено «?».
- **Знайдено онлайн:** у Аркушина, «Словник західнополіських говірок» (2 т., Луцьк 2000), є скан на archive.org (`slzhdplhv`, з результату пошуку, не відкривав): його можна зібрати самим.
- Нові записи 30 («Словник говірок Середньої Наддніпрянщини», видання не визначено) і 31 (Ганудель, «Лемківські говірки», нічого не знайдено). Решта (XIII ст., грамоти XIV ст. № 3 і 84, РИБ т. 7, Транквіліон 1619, Калліст 1616, кращий скан Копистенського, гетьманські універсали, Архів Коша) лишається нижче діалектних словників. Питання власнику без змін: **Q-SE1** і лист-дозвіл на СУМ (research/47).

## Зміни у версії 3 (2026-10-22, збірка 202610221132-482eb8e)

- **Жива збірка 202610221132-482eb8e (`public/data/boot.json` в origin/mvp):** N = 49,08 млн токенів повного тексту; nVocab = 494,7 млн (корпус ≈ 544 млн слів проти 260 млн у Гороха); 5 615 свідків; 477 951 стаття (159 861 засвідчена + 318 090 лише зі словників) проти 508 тис. у Гороха.
- **Токени за століттями:** XI 82,7 тис.; XII 144 тис.; XIII 38,6 тис.; XIV 20,1 тис. (було 2,1 тис.: грамоти `pum14`, запис 21, тепер у корпусі); XV 137 тис.; XVI 225 тис. (було 113 тис.); XVII 640 тис. (було 342 тис.); XVIII 493 тис.; XIX 4,78 млн; XX 41,6 млн; XXI 0,94 млн.
- **Переранжовано:** найтонші тепер XIII, XIV і XV ст.; XVI ст. краще, але все ще тонке порівняно з XVII. Джерела XIII–XV ст. піднято у Топ-10. Новий запис 29 (джерела XIII ст., видання ще треба визначити). Грамот XIV ст. № 3 і № 84 у `pum14` досі немає.
- **Нових книг після версії 2 не подано.** До розділу В нічого не переносилось. Питання власнику без змін: **Q-SE1** і лист-дозвіл на СУМ (research/47).
- Галицько-Волинський літопис повторно не просимо: це частина Іпатіївського кодексу XIII ст., а Іпатіївський текст уже в корпусі (`pipelines/manifest.ts`, id `hypatian`, 41 сторінка izbornyk). Скільки з 38,6 тис. токенів XIII ст. він дає, не перевіряв (?).

## Зміни у версії 2 (2026-10-22, попередня збірка 202610212253-48e380c)

- **Подано власником (збіг за назвою в `books`):** СУМ-11 (11 DjVu) і СУМ-20 (15 PDF: `2sum20.pdf` … `15sum20.pdf`, `sum20_1.pdf`); РИБ т. 4 і т. 19; Зизаній «Лексис» і передрук; Квітка «Малоросійські повісті» 1887, т. 1; «Українські грамоти XIV ст.» 1974. Усе в розділі В. Права на СУМ: Q-SE1 і лист-дозвіл (research/47).
- **Досі потрібно:** Копистенський «Книга о вірі єдиній» (бл. 1620) є в `books`, але OCR здебільшого сміття: «потрібно (кращий примірник)», тобто кращий скан або вичитаний передрук. Квітка т. 1 подано, **потрібен т. 2** (запис 20). Також РИБ т. 7 (1882, «Апокрисис»); Транквіліон «Євангеліє учительне» 1619; Калліст 1616; діалектні словники (23–28); Архів Коша; гетьманські універсали.
- **Стан корпусу (збірка 202610212253-48e380c):** N = 48,46 млн токенів повного тексту; 5 516 свідків; 454 027 статей (159 444 засвідчених + 294 583 лише зі словників) проти 508 тис. у Гороха. За століттями: XIV 2 102 (≈ 20 тис. після `pum14`), XV 136 044, XVI 113 006, XVII 342 145, XVIII 493 223. Після XIV ст. найтонші XV і XVI ст.
- Питання власнику збережено: **Q-SE1** і лист-дозвіл на СУМ (research/47).

**Оновлення 2026-10-22 (RF-11): «Українські грамоти XV ст.» (Київ 1965, Русанівський) і «Волинські грамоти XVI ст.» (Київ 1995, Задорожний, Матвієнко) подано власником і введено.**

**Топ-10 (2026-10-23, версія 4; причина: діалектні мітки охоплюють 20,7% лем, клас (а) «діалектне за словником» дають лише регіональні словники):** 1) Чабаненко, «Словник говірок Нижньої Наддніпрянщини», 4 т. (Запоріжжя, Комунар, 1992 або 1993 ?): Південний Схід; 2) Онишкевич, «Словник бойківських говірок», ч. 1 (Київ 1984): Бойківщина; 3) Лисенко, «Словник поліських говорів» (1974 ?, запису не знайдено): Полісся; 4) Сабадош, «Словник закарпатської говірки села Сокирниця» (Ужгород 2008; 2-ге вид. 2021, понад 22,2 тис. слів): Закарпаття; 5) «Гуцульські говірки: короткий словник» (Львів 1997, 232 с., ред. Я. Закревська): Гуцульщина; 6) «Словник буковинських говірок» (Чернівці, Рута, 2005, 688 с., ред. Н. Гуйванюк) і «Буковинські говірки» (Рута 2006): Буковина; 7) Аркушин, «Словник західнополіських говірок», 2 т. (Луцьк 2000, ≈13 000 слів; скан на archive.org `slzhdplhv`, спершу зібрати); 8) «Словник говірок Середньої Наддніпрянщини» (видання не визначено ?); 9) Ганудель, «Лемківські говірки» (нічого не знайдено ?); 10) джерела XIII ст. (запис 29). Нижче без змін: чистий текст грамот XIV ст. № 3 і № 84; РИБ т. 7 «Апокрисис»; Транквіліон 1619; Калліст 1616; Копистенський бл. 1620, кращий скан; гетьманські універсали; «Архів Коша»; Квітка, т. 2. Подані й зняті зі списку: «Українські грамоти XV ст.» (1965), «Волинські грамоти XVI ст.» (1995).

## Зміни з 2026-10-21 (перша версія)

- SPEC 63 SE-10: усі історичні словники з датованими значеннями знайдено онлайн (archive.org, OCR; H10–H15), у розділ А нічого не додано.
- Новий файл. Побудовано з research/44, analysis/corpus-10m.md, analysis/regions.md, research/39, 40, 45-hv4-old-grammars.md, specs/63, specs/COVERAGE.md, specs/GAPS.md і теки `books` (стан на 2026-10-21).
- **Подано** (знайдено в `books`, збіг за назвою): «Зерцало богословії» Транквіліона (r24); Псалтир з Полуставом 1643; Беринда 1627 і 1653; Зизаній «Лексис» і «Граматика»; Смотрицький «Граматіка»; Метлинський «Народныя южнорусскія пѣсни» (за транслітерованою назвою; рік у файлі не перевірено).
- **Переведено в «зберемо самі»**: r11 Зизаній «Наука ку читаню» 1596 (archive.org `zyzanii`, уже зібрано); r30 «Verificatia niewinności» Смотрицького (Вільно 1621) надруковано в «Архиве Юго-Западной России» ч. 1 т. 7 (Київ 1887), с. 279–344, скан знайдено. Рядок r30 у research/44 («не знайдено онлайн») застарів.

## Стан (докази)

- Горох: 508 тис. заголовних слів, корпус 260 млн слів. У нас (збірка 202610221132-482eb8e): 49,08 млн токенів повного тексту у 5 615 свідках, плюс nVocab 494,7 млн (корпус ≈ 544 млн); 477 951 стаття. За століттями: XIII 38,6 тис., XIV 20,1 тис., XV 137 тис., XVI 225 тис., XVII 640 тис., XVIII 493 тис. Раніше: ≈205 млн токенів, з них 46 353 973 повного тексту у 4 336 свідках.
- 86% токенів корпусу з OCR газет archive.org (не вичитано).
- Епохи: proto 7 214; old 259 552; early_middle 148 347; middle 463 197; late_middle 195 475; modern 45 280 188 (97,7%). Усе до 1800 р. менше 1,2 млн токенів.
- Регіони: Запоріжжя, Херсонщина, Таврія, Донеччина, Луганщина мають 0; 11 історичних територій мають 0 свідків; Київ 400 тис., Галичина 156 тис., Слобожанщина 100 тис. Гетьманська канцелярія, Мазепа й Орлик відсутні (GAPS).
- Жанр: вичитаних книг 1800–1950 мало.

Формат кожного запису: скан PDF або DjVu від 300 dpi, текстовий шар бажаний. Класти в `C:\Users\User\IdeaProjects\dmitrijza\.claude\worktrees\ukr-lexicon-mvp\books`.

## Питання власнику

- **Q-SE1** (SPEC 63 SE-11): OCR трьох словників під © розібрано, але зберігаємо лише заголовне слово, глосу ≤ 200 знаків, сигли й дати цитат (СУМ XVI – 1-ї пол. XVII ст.; «Матеріали до словника XV–XVIII ст.»; Словник мови Шевченка). Чи можна зберігати більше (повні дефініції, текст цитат)? Правовласники: НАН, інститути, упорядники (?). До вашого підтвердження більше нічого не зберігається.
- **Лист-дозвіл на СУМ** (research/47): СУМ-11 і СУМ-20 подано як скани; лист правовласнику щодо використання понад заголовні слова ще відкритий.

## А. Потрібно від власника (31 запис; нумерація як в англійській таблиці; записи 23–28, 30, 31 — діалектні словники, угорі списку, див. таблицю A0 англійською)

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
21. «Пам'ятки української мови»: грамоти XIV, XV ст., Волинські грамоти XVI ст., Приватні листи XVIII ст., Київ 1965, 1974, 1995 (рік 1987 був припущенням; «Приватні листи XVIII ст.»: рік ?) (CX-6). **ПОДАНО 2026-10-21 (лише XIV ст.):** «Грамоти XIV ст.», упорядкування, вступна стаття, коментарі, словники-покажчики М. М. Пещак; відп. ред. В. М. Русанівський; АН УРСР, Інститут мовознавства ім. О. О. Потебні; Київ: Наукова думка, 1974; 84 грамоти. Ліцензія: тексти XIV ст. — суспільне надбання; апарат видання 1974 р. (вступ, коментарі, бібліографія, різночитання, покажчики) — © Наукова думка, виключений повністю. Київ, УРСР: не `ru`. XV ст., Волинські грамоти XVI ст. та пізніші томи й надалі потрібні. **Стан 2026-10-22 (specs/63 RF-8):** транскрипція цього видання на izbornyk.org.ua (82 з 84 грамот, 19 020 токенів; немає № 3 і № 84) досі НЕ входила до корпусу: файли були неподані до репозиторію, а автор `pum14` не мав запису верифікації, тож збірка їх відкидала. Тепер файли в `data/seed/pum14/`, запис автора `pum14`, завантаження `pipelines/ingest-pum.ts` через `ops/worker/ingest.sh`, кожна грамота датована власним рядком дати; XIV ст.: 2 102 → 20 083 токени. OCR 1974 р. для № 3 і № 84 не використано. XV ст., Волинські грамоти XVI ст. та пізніші томи й надалі потрібні.
22. Манчук, «Жиб'ївські новелі» (Брустури 2024, ISBN 9786178326630): гуцульська говірка, потрібна легальна копія.
29. Тексти XIII ст., крім Іпатіївського кодексу (Галицько-Волинський літопис уже в корпусі через `hypatian`): кандидатів і видань не визначено (?), жодного видання не називаю. XIII ст. має 38,6 тис. токенів.
23–28, 28a, 30, 31. **НАЙВАЖЛИВІШЕ.** Регіональні діалектні словники (SPEC 63 LB / GG-8): єдине джерело міток «діалектне за словником» (клас а, зараз 5,4% лем). Опрацьовувати як інші © словники: заголовне слово + коротка глоса. Назви й роки звірено з бібліографічними посиланнями (не з каталожним записом); «?» там, де не підтверджено.
    - 23. Чабаненко (ред.), «Словник говірок Нижньої Наддніпрянщини», т. 1–4, Запоріжжя: Комунар, 1992 (? за одним джерелом 1993): Нижня Наддніпрянщина (Запоріжжя, Херсонщина, Таврія); заголовних слів ?
    - 24. Онишкевич М. Й., «Словник бойківських говірок», ч. 1, Київ 1984 (ч. 2, 1985 ?): Бойківщина; слів ?
    - 25. Лисенко, «Словник поліських говорів» (1974 ?): Полісся; запису не знайдено, назва й рік не підтверджені (?).
    - 26. Сабадош І., «Словник закарпатської говірки села Сокирниця Хустського району», Ужгород 2008; 2-ге вид. 2021, понад 22 200 діалектних слів: Закарпаття.
    - 27. «Гуцульські говірки: короткий словник», відп. ред. Я. Закревська, Львів: Інститут українознавства НАН України, 1997, 232 с.: Гуцульщина; слів ?
    - 28. «Словник буковинських говірок», за заг. ред. Н. Гуйванюк, Чернівці: Рута, 2005, 688 с.; також «Буковинські говірки», хрестоматія, Рута 2006, 383 с.: Буковина; слів ?
    - 28a. Аркушин Г. Л., «Словник західнополіських говірок», 2 т., Луцьк: Вежа, 2000, ≈13 000 слів: Західне Полісся, Волинь; скан на archive.org `slzhdplhv` (з результату пошуку, не відкривав), тож спершу зібрати самим.
    - 30. «Словник говірок Середньої Наддніпрянщини»: Середня Наддніпрянщина; редактор, рік, видавець не визначені (?).
    - 31. Ганудель, «Лемківські говірки»: Лемківщина; назву, рік нічого не підтверджує (?). Суміжне, не те саме: П. Пиртей, «Словник лемківської говірки».

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

Додано 2026-10-22 (RF-11): «Українські грамоти XV ст.» (Київ: Наукова думка, 1965, Русанівський; 62 грамоти введено) і «Волинські грамоти XVI ст.» (Київ: Наукова думка, 1995, Задорожний, Матвієнко; 125 актів введено).

Див. англійський розділ C: Зерцало, Псалтир 1643, Беринда, Зизаній, Смотрицький, Метлинський, граматики, Берестейщина, Полісся, АУМ т. 1–3, «Лісові чорти» 1983.

## Г. Блокери специфікацій

CX-6 (записи 20, 21); AT-3 (чекає на перебудову, не на книгу); CV-4 (реалізація).
