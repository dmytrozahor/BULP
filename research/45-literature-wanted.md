# 45. Literature wanted / Список потрібної літератури

Updated / Оновлено: 2026-10-21 (version 1). Regenerated every 3 h by the orchestrator (SPEC 63 LW-1) / перегенерується оркестратором кожні 3 год (SPEC 63 LW-1).

English first, then Ukrainian (as in README). Every claim comes from a file in this repository or from a page I opened; «?» marks anything I could not confirm; nothing is invented. «Not found online» only means «not found by me».

---

# English

## Changes since last update (2026-10-21, first version)

- SPEC 63 SE-10 (sense evolution): I looked for every dated-sense historical dictionary online. All were found on archive.org with an OCR text (H10–H15); none had to be moved to section A, so no new owner book is requested for them. Open questions: the archive.org items state no licence (the status is my reading of the author's death year), and the OCR quality of H13/H14 is unchecked (?).
- New file. Built from research/44-bratstva-bibliography.md, analysis/corpus-10m.md, analysis/regions.md, research/39, research/40, research/45-hv4-old-grammars.md, specs/63-corpus-dialects.md, specs/COVERAGE.md, specs/GAPS.md and the owner's `books` folder (listing taken 2026-10-21).
- Marked **supplied** (found in `books`, matched by title): Транквіліон «Зерцало богословії» (`Зерцало_богословия.pdf`, r24); Київський Псалтир з Полуставом 1643 (`1643-r.-Kyivs-kyy-Psaltyr-z-Poluustavu.pdf`); Беринда «Лексикон» 1627 and 1653; Зизаній «Лексис» (reprint) and «Граматика»; Смотрицький «Граматіка»; Метлинський «Народныя южнорусскія пѣсни» (`Narodnyja_juznorusskija_pesni.pdf`; matched by transliterated title, the year 1854 is not checked in the file).
- Moved to **harvest** (online, so not asked from the owner): r11 Зизаній «Наука ку читаню» 1596 (research/45: archive.org `zyzanii`, harvested); r30 Смотрицький «Verificatia niewinności» (Вільно 1621) is printed in «Архив Юго-Западной России» ч. 1 т. 7 (Київ 1887), pp. 279–344, and I found its scan. research/44 lists r30 as «не знайдено онлайн»; that row is outdated.

## Where we stand (evidence)

- Горох: 508k headwords and a 260M-word frequency corpus (specs/63 DO). Ours: about 205M tokens, of which 46,353,973 are full text in 4,336 witnesses (analysis/corpus-10m.md §1); the rest is vocabulary only (about 159M).
- 86% of corpus tokens come from archive.org OCR (`hv_ia_*`: 40,010,549 of 46.5M, not proofread). Source: analysis/corpus-10m.md §4.1.
- Epochs (N tokens, §4.3): proto 7,214; old 259,552; early_middle 148,347; middle 463,197; late_middle 195,475; modern 45,280,188 (97.7%). Everything before 1800 is under 1.2M tokens.
- Regions (analysis/regions.md): Запоріжжя, Херсонщина, Таврія, Донеччина, Луганщина have 0 tokens; the 11 historical territories (Берестейщина … Курщина) have 0 witnesses; Київ has 400k, Галичина 156k, Слобожанщина 100k. specs/GAPS.md adds: Hetmanate chancery, Мазепа and Орлик absent.
- Genre: the modern bulk is newspaper OCR; proofread book text of 1800–1950 is rare.

Priority rule: (1) ПМ and lexis-rich works named by research/44; (2) epochs and regions with zero or near-zero tokens; (3) works that unblock a SPEC item; (4) Polish and Church Slavonic items last. Format for every entry unless stated: scan PDF or DjVu at 300 dpi or more; a text layer is a bonus. Drop files into `C:\Users\User\IdeaProjects\dmitrijza\.claude\worktrees\ukr-lexicon-mvp\books`.

## A. Wanted from the owner (22 entries)

| # | Work (author, year, edition wanted) | Why it matters / unblocks | Where it may be found | Status |
|---|---|---|---|---|
| 1 | Кирило Транквіліон-Ставровецький, «Євангеліє учительне», Рахманів 1619 (r28). Best scholarly edition: not identified (?); the original print or a facsimile | ПМ, popular language (condemned by the 1627 council); research/44 names it most valuable. Fills early 17th c. and the ПМ register (middle epoch has only 463k tokens) | not found online. A 1697 Могильов edition is shown by the Museum of the Book (https://www.mkdu.com.ua/kolektsiia/kolektsiia-onlajn/ievanheliie-uchytelne-1697/, linked from uk.wikipedia; my fetch got HTTP 403, so unopened). A 2014 Свічадо modern translation is listed on uk.wikipedia (not a source for old forms). Ask НБУВ, ЛННБ Стефаника (?) | wanted |
| 2 | Мелетій Смотрицький (translator), «Євангеліє учительноє, албо Казання на каждую неделю … Калліста», Євє 1616 (r22) | ПМ translation «на руський язик»; second item named most valuable in research/44. Excerpts only: http://litopys.org.ua/old17/old17_11.htm (link from research/44, not reopened) | not found online | wanted |
| 3 | «Памятники полемической литературы в Западной Руси» = РИБ т. 4 (1878, ed. П. Гильтебрандт: library record seen in a search result), т. 7 (СПб. 1882, Апокрисис) and т. 19 (СПб. 1903, Антирисис). Volume numbers come from search summaries; I did not open a scan | Full text of Копистенський «Палінодія» (1621–22, r32; research/44 has only excerpts and says to look in РИБ т. IV); fills the middle epoch with ПМ/КУ prose | I found no scan. Ask e-ВНБУ, Google Books, HathiTrust (?) | wanted |
| 4 | Захарія Копистенський, «Книга о вірі єдиній» (1619–1621, ms; r29) and «Книга о правдивой єдності» (1623, ms; r34). Edition: not identified (?) | КУ/ПМ (?) polemical prose of the Лаврський гурток | not found online | wanted |
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
| 20 | Квітка-Основ'яненко, «Малороссійскія повѣсти», Харків 1887, ed. Потебня (CX-6) | Слобожанщина, 19th c.; research/39: no copy found (archive.org, 7 queries) | not found online | wanted |
| 21 | «Пам'ятки української мови»: «Українські грамоти XIV ст.», «… XV ст.», «Волинські грамоти XVI ст.», «Приватні листи XVIII ст.», Київ 1965, 1974, 1987, 1995 (CX-6) | Dated, localised Middle Ukrainian charters; 353 `pum14` charters are excluded for lack of an author record (corpus-10m §2). Ingest status of the later volumes: ? | catalogue entry only (spec CX-6); no scan found | wanted |
| 22 | Онуфрій Манчук, «Жиб'ївські новелі» (Брустури 2024, 105 p., ISBN 9786178326630) | Hutsul dialect literature (research/40); copyrighted print, needs a legal copy (vocabulary-only use) | no free copy found (research/40) | wanted |

## B. We'll harvest (online, no owner action; 15 entries)

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

## C. Already supplied (do not send again)

Matched by title against the folder listing of 2026-10-21: Зерцало богословия (Транквіліон 1618, r24); Київський Псалтир з Полуставом 1643; Беринда «Лексикон» 1627 (two scans) and 1653; Зизаній «Лексис» (reprint) and «Граматика»; Смотрицький «Граматіка»; Метлинський «Народныя южнорусскія пѣсни» (title match); the 1517–1519 Bible books (Бытія, Царств, Іова …); Огоновський, Смаль-Стоцький, Барвінський, Желехівський, Шухевич «Гуцульщина»; Берестейщина and Polissia dictionaries and atlases; АУМ т. 1–3; Лукаш «Фауст»; «Лісові чорти» 1983. Full listing: the `books` folder.

## D. Spec items blocked by a missing source

- CX-6 (specs/63): Квітка 1887 and the charter volumes: entries 20 and 21.
- AT-3 (specs/COVERAGE.md): manual row; blocked by a rebuild, not by a book.
- CV-4: pending implementation, not a source.

---

# Українською

## Зміни з останнього оновлення (2026-10-21, перша версія)

- SPEC 63 SE-10: усі історичні словники з датованими значеннями знайдено онлайн (archive.org, OCR; H10–H15), у розділ А нічого не додано.
- Новий файл. Побудовано з research/44, analysis/corpus-10m.md, analysis/regions.md, research/39, 40, 45-hv4-old-grammars.md, specs/63, specs/COVERAGE.md, specs/GAPS.md і теки `books` (стан на 2026-10-21).
- **Подано** (знайдено в `books`, збіг за назвою): «Зерцало богословії» Транквіліона (r24); Псалтир з Полуставом 1643; Беринда 1627 і 1653; Зизаній «Лексис» і «Граматика»; Смотрицький «Граматіка»; Метлинський «Народныя южнорусскія пѣсни» (за транслітерованою назвою; рік у файлі не перевірено).
- **Переведено в «зберемо самі»**: r11 Зизаній «Наука ку читаню» 1596 (archive.org `zyzanii`, уже зібрано); r30 «Verificatia niewinności» Смотрицького (Вільно 1621) надруковано в «Архиве Юго-Западной России» ч. 1 т. 7 (Київ 1887), с. 279–344, скан знайдено. Рядок r30 у research/44 («не знайдено онлайн») застарів.

## Стан (докази)

- Горох: 508 тис. заголовних слів, корпус 260 млн слів. У нас ≈205 млн токенів, з них 46 353 973 повного тексту у 4 336 свідках; решта лише лексика (≈159 млн).
- 86% токенів корпусу з OCR газет archive.org (не вичитано).
- Епохи: proto 7 214; old 259 552; early_middle 148 347; middle 463 197; late_middle 195 475; modern 45 280 188 (97,7%). Усе до 1800 р. менше 1,2 млн токенів.
- Регіони: Запоріжжя, Херсонщина, Таврія, Донеччина, Луганщина мають 0; 11 історичних територій мають 0 свідків; Київ 400 тис., Галичина 156 тис., Слобожанщина 100 тис. Гетьманська канцелярія, Мазепа й Орлик відсутні (GAPS).
- Жанр: вичитаних книг 1800–1950 мало.

Формат кожного запису: скан PDF або DjVu від 300 dpi, текстовий шар бажаний. Класти в `C:\Users\User\IdeaProjects\dmitrijza\.claude\worktrees\ukr-lexicon-mvp\books`.

## А. Потрібно від власника (22 записи; нумерація як в англійській таблиці)

Якщо не сказано інакше: статус «потрібно», «не знайдено онлайн».

1. Транквіліон, «Євангеліє учительне», Рахманів 1619 (r28): ПМ, найціннішa лексика. Видання 1697 р. (Могильов) показує Музей книги (https://www.mkdu.com.ua/kolektsiia/kolektsiia-onlajn/ievanheliie-uchytelne-1697/; посилання з Вікіпедії, мій запит дав HTTP 403, не відкрито). Найкраще наукове видання не з'ясовано (?).
2. Смотрицький (перекладач), «Євангеліє учительноє … Калліста», Євє 1616 (r22): ПМ; уривки http://litopys.org.ua/old17/old17_11.htm (за research/44).
3. РИБ т. 4 (1878), т. 7 (1882), т. 19 (1903) = «Памятники полемической литературы в Западной Руси»: повний текст «Палінодії» Копистенського й Антирисису. Номери томів за пошуковою довідкою; скан не відкривав (?).
4. Копистенський, «Книга о вірі єдиній» (1619–1621) і «Книга о правдивой єдності» (1623), рукописи (r29, r34); видання не з'ясовано (?).
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
20. Квітка-Основ'яненко, «Малороссійскія повѣсти», Харків 1887, ред. Потебня (CX-6): копії не знайдено.
21. «Пам'ятки української мови»: грамоти XIV, XV ст., Волинські грамоти XVI ст., Приватні листи XVIII ст., Київ 1965, 1974, 1987, 1995 (CX-6).
22. Манчук, «Жиб'ївські новелі» (Брустури 2024, ISBN 9786178326630): гуцульська говірка, потрібна легальна копія.

## Б. Зберемо самі (онлайн; 15 записів)

- H10 Тимченко, «Історичний словник українського язика», т. 1, зошити 1–2 (1930, 1932; А—Жял): https://archive.org/details/tymch1930, https://archive.org/details/1.2.1932 (друге сканування: ISUJa). H11 Білецький-Носенко, словник 1838–1843, вид. 1966: https://archive.org/details/slovnyk33. H12 Закревський 1861: https://archive.org/details/bandurista3. H13 СУМ XVI – 1-ї пол. XVII ст.: https://archive.org/details/SUM-28. H14 «Матеріали до словника XV–XVIII ст.» (kniga1, kniga2) і «Словник мови Шевченка» (1_20230624_20230624, 2_20230624_202306). H15 Словник староукраїнської мови XIV–XV ст. (уже в корпусі). Усе знайдено, нічого не додано до розділу А; ліцензію архів не вказує (статус — моє прочитання за роком смерті автора), якість OCR H13/H14 ?.

- H1 «Архив Юго-Западной России», 35 томів: https://resource.history.org.ua/item/0006703 (перелік відкрито; вміст томів, крім ч. 1 т. 7, не перевіряв).
- H2 Смотрицький «Verificatia niewinności» (1621) в АЮЗР ч. 1 т. 7: https://www.uknol.info/en/Records/ArchivJuZR_1_07.html.
- H3 Сумцов, «Слобожане», Харків 1918: https://archive.org/details/slobozhane (зібрано як OCR; потрібен чистий текст).
- H4 Руданський, Твори т. I (1912) та інші: https://uk.wikisource.org/wiki/Автор:Степан_Руданський (стан вичитки ?).
- H5 Черемшина, чотири збірки (research/40), OCR.
- H6 «Опришки» (OCR, зібрано). H7 Зизаній 1596 (зібрано). H8 литопис/ізборник за research/44. H9 Вікіджерела: 103 450 рядків проти 76 600 у збірці.

## В. Уже подано (не надсилати)

Див. англійський розділ C: Зерцало, Псалтир 1643, Беринда, Зизаній, Смотрицький, Метлинський, граматики, Берестейщина, Полісся, АУМ т. 1–3, «Лісові чорти» 1983.

## Г. Блокери специфікацій

CX-6 (записи 20, 21); AT-3 (чекає на перебудову, не на книгу); CV-4 (реалізація).
