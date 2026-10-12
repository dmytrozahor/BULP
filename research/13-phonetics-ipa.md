# 13 — Phonetics, spelling-to-standard rules, and IPA (brief R13)

Run status: partial. Local context read (research/03 R01–R17 table, research/08 §A, core/orthography.ts header). No web source fetched in this run (cost cap), so every Правопис 2019 / Тоцька / Пономарів / Wikipedia claim below is [U] until checked. Tags: [Q] verbatim-checked (local file), [P] paraphrase, [U] unverified.

## A. Modern spelling rules (phonetic/old/dialect spelling -> standard)

| id | rule | input -> standard | source | status |
|---|---|---|---|---|
| S1 | apostrophe after labial before я ю є ї | м'ясо, п'ять, здоров'я | research/03 R02, R13 [P] | local ok; Правопис § [U] |
| S2 | apostrophe after р before я ю є ї | бурян -> бур'ян | U-4 request | [U] Правопис 2019 apostrophe § to be quoted |
| S3 | exceptions without apostrophe | буряк, свято, цвях (as requested) | U-4 request | [U] confirm list in Правопис § |
| S4 | ѣ reflex | вѣра -> віра, хлѣбъ -> хліб, ѣсти -> їсти | research/03 R09 [P] | local ok |
| S5 | ikavism (new ять, о/е in new closed syllable) | конь -> кінь, столъ -> стіл; exception городъ, берегъ | research/03 R10 [P] | local ok |
| S6 | и/ы merger | сынъ -> син, рыба -> риба | research/03 R11 [P] | local ok |
| S7 | l > в (ў) | ходилъ -> ходив, вълкъ -> вовк | research/03 R16 [P] | local ok |
| S8 | gemination / -ье > -я | житьѥ -> життя, весельѥ -> весілля | research/03 R13 [P] | local ok |
| S9 | no final devoicing in standard | дубъ -> дуб, возъ -> віз | research/03 R08 [P] | local ok |
| S10 | ґ, ьо/йо, cluster simplification, -ськ- alternations, loanwords | (to fill) | — | [U] not researched in this run |

Implementation note: core/orthography.ts already folds these as branch candidates (VESUM decides); S2/S3 need a lexicon-driven exception list, not a regex.

## B. IPA (standard orthoepy)

| grapheme | IPA (standard) | note | source |
|---|---|---|---|
| в | [ʋ] (word-initial / before vowel); [u̯] / [w] after vowel or before consonant in dialects | U-13 dialect overrides | [U] Тоцька / Пономарів not fetched |
| г | [ɦ] | | [U] |
| ґ | [ɡ] | | [U] |
| щ | [ʃt͡ʃ] | | [U] |
| ц, ч, дж, дз | [t͡s], [t͡ʃ], [d͡ʒ], [d͡z] | | [U] |
| soft consonants before я ю є і ь | palatalised C^j | | [U] |
| і / и | distinction by position and stress | | [U] |
| unstressed е / и | reduced (ɛ̝ / ɪ) | stress-dependent | [U], research/08 §A |
| voicing assimilation | before voiceless -> voiceless | no final devoicing (S9) | [U] |
| -ться | [t͡sʲːɐ] | | [U] |

## C. Dialect / colloquial overrides (keyed by research/04 codes)

Override rows to add once research/04 §1 codes are mapped (not read in this run):
- Polissian diphthongs (research/03 R09 [Q]: Polissia kept іе) -> [i̯e] type
- akanye (unstressed о -> [ɐ]/[a]) -> keyed to region code
- hard р (р [r] vs [r̝]) -> region
- ў = [w] (research/03 R16) -> northern/Polissian
- Carpathian ы -> [ɨ]
- Galician а -> е (unstressed) -> code G
- Southwest final devoicing (contradicts S9 for SW) -> code SW

All rows [U] until research/04 codes are checked.

## D. Grapheme -> IPA implementation sketch

Ordered rules: (1) apply S-rules to get standard spelling; (2) map graphemes with table B; (3) apply stress from research/08 §A; (4) apply reduction for unstressed е/и/о; (5) apply voicing assimilation; (6) apply dialect override rows only when a witness region code is set; otherwise emit standard IPA with flag `dialect=none`.

## Open items [U]
- Fetch Правопис 2019 apostrophe and exceptions sections (S2, S3) with verbatim quotes.
- Fetch Тоцька / Пономарів / Орфоепічний словник for B; cite Wikipedia phonology articles only as secondary.
- Map research/04 dialect codes to override rows (C).
- Add S10 items.


---
## Round 2 (FU-13) — resolved items, supersede the [U] rows above

Tags: [Q] verbatim from a fetched page (locator given), [P] paraphrase/derived, [U] still unverified. Sources: PRAV = Правопис 2019 via https://slovnyk.ua/pravopys.php?prav_par=N (page strips letter-spacing; quotes normalised); WP = uk.wikipedia «Українська фонетика» wikitext (`action=raw`; the title «Фонетика української мови» is only a `#REDIRECT [[Українська фонетика]]`); EUM = ЕУМ litopys.org.ua/ukrmova/umNN.htm.

### A'. Spelling rules, resolved (replace S1–S3, S10)
| id | rule | verbatim quote [Q] | locator | note |
|---|---|---|---|---|
| S1' | apostrophe after labial | «Апостроф пишемо перед я, ю, є, ї: 1. Після букв на позначення губних приголосних б, п, в, м, ф: б’ю, п’ять, п’є, в’язи, солов’ї, м’ясо, рум’яний, (на) тімʼї, жираф’ячий, мереф’янський» | PRAV §7 п.1 | |
| S3' | no apostrophe if another root letter (except р) precedes the labial: свято, цвях | «Апостроф не пишемо, коли перед буквою на позначення губного звука є інша буква (крім р), що належить до кореня (основи): дзвякнути, духмяний, мавпячий, медвяний, морквяний, різдвяний, свято, тьмяний, цвях, але: арф’яр, верб’я, торф’яний, черв’як» | PRAV §7 п.1 Примітка | Prefix case keeps it: «Коли така буква належить до префікса, то апостроф пишемо …: зв’язок, зв’ялити, підв’язати, розм’якнути, сп’яніти» |
| S2' | apostrophe after р: бур’ян | «2. Після р: бур’ян, міжгір’я, пір’я, матір’ю, кур’єр, (на) подвір’ї; Валер’ян, Мар’яна, Мар’яненко» | PRAV §7 п.2 | Counter-note: «Апостроф не пишемо, коли ря, рю, рє означають сполучення пом’якшеного р із наступними а, у, е: буряк, буряний, крякати, рябий, рюмсати, крюк; Рєпнін». So буряк (soft р) vs бур’ян (hard р + j) is a lexical/phonological contrast, not a regex: lexicon-driven list (as noted in Implementation note) |
| S3b | к only in Лук’ян | «3. Після к у слові Лук’ян і похідних від нього: Лук’яненко, Лук’янюк, Лук’янець» | PRAV §7 п.3 | |
| S3c | prefix / first compound part ending in hard consonant | «4. Після префіксів та першої частини складних слів, що закінчуються на твердий приголосний: без’ядерний, без’язикий, від’їзд, з’єднаний, з’їхати, з’явитися, напів’європейський, об’єм, під’їхати, під’юдити, роз’юшити, пан’європейський; дит’ясла, камер’юнкер, Мін’юст» | PRAV §7 п.4 | |
| S10a | ґ | «Буква ґ передає на письмі задньоязиковий зімкнений приголосний: 1. В українських та в давно запозичених і зукраїнізованих словах: ґанок, ґатунок, ґвалт, ґедзь, ґудзик, ґуля, … ґрунт …» | PRAV §6 п.1 | §6 п.2: toponyms (Ґорґани) and surnames. Old texts write г for [ɡ]: restore only via lexicon |
| S10b | йо / ьо | «1. Буквосполучення йо передає звукосполучення й + о: 1) на початку слова та після букви, що позначає голосний: його, йому, завойований, район … 2. Буквосполучення ьо пишемо після букви для позначення м’якості приголосного перед о: всього, Ковальов, льон, сьогодні, сьомий, трьох, цього» | PRAV §8 | |
| S10c | -ськ-/-ств- alternations | «к, м’який ц, ч + -ськ-(ий), -ство-(о) → -цьк-(ий), -цтв-(о): гірник — гірницький — гірництво; козак — козацький — козацтво … 2) г, ж, з + -ськ-(ий), -ств-(о) → -зьк-(ий), -зтв-(о): Прага — празький; убогий — убозтво … 3) х, ш, с + -ськ-, -ств- → -ськ-, -ств-: волох — волоський; чех — чеський … але: шахський, цюрихський» | PRAV §19 | old -цкій/-ській/-скій fold via lexicon match |
| S10d | gemination | §29: «Подвоєння букв на позначення приголосних звуків маємо, якщо збігаються однакові приголосні: 1) префікса й кореня: ввіч, віддати, оббити …» ; §30: «Приголосні д, т, з, с, л, н, ж, ш, ц, ч подовжуються (на письмі їх позначаємо двома буквами), коли вжиті після голосного: 1) перед я, ю, і, є в усіх відмінкових формах іменників середнього роду другої відміни … знаряддя, життя, мотуззя, гілля, знання, збіжжя, сторіччя» | PRAV §29, §30 | covers житьє > життя (S8) |
| S10e | loanword apostrophe | «1. Апостроф у словах іншомовного походження та похідних пишемо перед я, ю, є, ї … 1) після приголосних б, п, в, м, ф, г, к, х, ж, ч, ш, р: б’єф, комп’ютер, інтерв’ю, прем’єр, кар’єра … 2. Апостроф не пишемо: 1) перед йо: курйоз, серйозний; 2) коли я, ю позначають пом’якшення попереднього приголосного перед а, у: бязь; бюджет, бюро, кювет …» | PRAV §138 | surname/toponym apostrophe: §144, §151 (index links only) [U] |
| S11 | depalatalisation (explains hard labials) | «Д. почалася з кін. 12 ст. Найперше втратили м’якість губні приголосні, після яких занепав [ь] … Твердо вимовлялися губні в позиції перед [j]: здоровъю, пробъєшь» | EUM um13 «ДЕПАЛАТАЛІЗАЦІЯ» (Л. І. Прокопова) | origin of the apostrophe context; old `-мъ/-въ` forms |

### B'. IPA resolved against WP (secondary; its `<ref>` block cites Тоцька 1981, Погрібний «Орфоепічний словник» 1984, Пономарів та ін. 2001 — [Q])
Corrections to table B: **в is phoneme /w/ with allophones**, not /ʋ/-default; щ is not a phoneme row in WP.
| item | [Q] from WP wikitext | locator |
|---|---|---|
| в | «Фонема /w/ твориться як губно-губний [w] ([β̞]) перед огубленими голосними /u ɔ/, часто й перед /ɑ/, а інколи й перед /ɛ ɪ/. Перед /i/, часто перед /ɪ ɛ/, а інколи й перед /ɑ/ твориться як губно-зубний [ʋ]. Перед дзвінкими приголосними на початку слова твориться як [w], а перед глухими приголосними — як [ʍ]. Після голосного в середині та кінці слова … [u̯]» | «Приголосні / Фонетичні особливості» |
| й | «[j] у позиції перед голосними … перед приголосними та в кінці слова … [i̯]» | same |
| г, ґ | table rows /ɦ/ and /ɡ/; «Приголосний /ɦ/ деякі вчені описують як глотковий (фарингальний — /ʕ/)» | same |
| vowels | і [i]; и [ɪ] (unstressed [ɪ]/[ɛ̝]); е [ɛ] (after soft [e], unstressed [ɛ̝]); а [ɑ] (after soft [ɑ̈]); о [ɔ] ([ɔ̈]); у [u] ([ʊ] after soft). «Сплутування ненаголошених /ɪ/ та /ɛ/ — одна з найхарактерніших рис українського вокалізму … мине́—мене́ [mɛ̝ˈnɛ]» | «Голосні» |
| no reduction | «Ненаголошені голосні, так само як і наголошені, є звуками повного творення» | «Голосні» |
| softness | «Звуки [mʲ bʲ pʲ wʲ fʲ d͡ʒʲ t͡ʃʲ ʒʲ ʃʲ ɡʲ kʲ xʲ ɦʲ] трапляються переважно перед голосним /i/. Проте деякі з них трапляються в таких українських словах, як свято, тьмяний … перед /ɑ/» — so свято has softness without any apostrophe | «Фонетичні особливості» |
| long C | знання [znɑˈɲːɑ], життя [ʒɪ̞ˈcːɑ], зілля [ˈzʲiʎːɑ], обличчя [ɔˈblɪt͡ʃʲːɑ], збіжжя [ˈzbiʒʲːɑ], затишшя [zɑˈtɪʃʲːɑ] | «Довгі приголосні» (↔ PRAV §30) |
| voicing | «регресивна асиміляція за дзвінкістю … /x/ може вимовлятись як [ɣ]»; exceptions «вогко, легко, кігті, нігті, дігтяр: /ɦ/ … [h] … [x]: [ˈlɛɦkɔ] [ˈlɛhkɔ] [ˈlɛxkɔ]»; prefix |z|, |roz| devoice before voiceless | «Уподібнення за голосом» |
| no final devoicing | intro list of euphony devices: «дзвінкі приголосні не оглушуються» | intro |
| SW softened sibilants | «У південно-західній діалектній групі … [d͡ʑ t͡ɕ ʑ ɕ]» (cites Погрібний p. 13) | same |
| Lemko | «шиплячі /ʃ/ і /ʒ/ стверділи сильніше … [ʂ] і [ʐ] … /ɪ/ … [ɨ]» | same |
| phoneme count | «налічується 38 фонем: 6 голосних і 32 приголосні» ; EUM: «У складі Ф. с. укр. мови налічується 38 фонем; … уживаються лише тверді губні, фонема в виступає як сонорна» | WP intro; EUM um215 |
| -ться [t͡sʲːɐ], щ [ʃt͡ʃ] | not stated in the WP wikitext | [U] |

### C'. Dialect override rows keyed to research/04 §1 codes (IPA values [P], derived from the 04 [Q] descriptions + WP; test before shipping)
| 04 code | spelled | emit (only when witness region matches) |
|---|---|---|
| N-DIPH-UO, N-DIPH-IE | вуол, піеч, діед | [u̯ɔ], [pi̯ɛt͡ʃ]-type diphthong instead of /i/ |
| N-MONO-UY, MDN-O-KEPT | вул, кун’, воз | as spelled: [vul], [kunʲ], [vɔz] |
| CHN-AKANYE | галава́, вада́ | unstressed [ɑ] (needs stress) |
| UKANYE | муги́ла | [u]~[ʊ] (standard already raises о before і/у; row only when spelled у) |
| CHN-V-W, LEM-W-L | ў | [w]/[u̯] (WP: standard в after vowel is already [u̯]) |
| CHN-VOICED-FINAL vs LEM/STP/SW | зуб/кров vs мет, міх | only these SW/LEM/STP rows devoice finally; standard and CHN do not |
| HARD-R | бурак, зора | hard [r] — this is why PRAV §7 п.2 Примітка: буряк (soft) ≠ бур’ян |
| HARD-C-FINAL | хлопиц | [t͡s] not [t͡sʲ] |
| R-SOFT-FINAL | гончар’ | final [rʲ] |
| EPENTH-L-N | мн’ясо, здоровл’а | extra [nʲ]/[lʲ] after labial (reverse of the apostrophe rule) |
| F-TO-X | хвабрика | [xʋ] |
| NDN-A-E | чіс, шипка | vowel as spelled after sibilant/soft |
| SW-KJ-GJ | ґ’ід, к’істо | palatal stops [ɡʲ]/[cʲ] |
| SW palatal sibilants | (all SW) | [d͡ʑ t͡ɕ ʑ ɕ] (WP) |
| CARP-Y | ы | [ɨ] (BOY, LEM, HUT); LEM-IJ ий = [ɪj] |
| LEM | ш ж | [ʂ ʐ] + [ɨ] |
| morphology-only rows (HUT-3SG-ZERO, SE-TRUNC-3SG, SW-PERF-M, etc.) | — | no IPA override |

### Round 2 log (fetched 2026-10-12)
- https://slovnyk.ua/pravopys.php (index) and ?prav_par=7, 6, 8, 19, 29, 30, 138 — OK (§144, §151 seen only as index links)
- https://uk.wikipedia.org/w/index.php?title=Фонетика_української_мови&action=raw — only `#REDIRECT [[Українська фонетика]]`; …title=Українська_фонетика&action=raw — OK (77 kB, 3 refs)
- http://litopys.org.ua/ukrmova/um.htm (224 entries) — **not found in this ЕУМ index: «Орфоепія», «Губні приголосні», «В» (sound), «Асиміляція»**. Nearest fetched: um215 ФОНОЛОГІЧНА СИСТЕМА (quoted), um13 ДЕПАЛАТАЛІЗАЦІЯ (quoted), um216 ФОНОЛОГІЯ, um217 ФОНОСТИЛІСТИКА, um202, um183 ІКАВІЗМ, um80, um25, um58 ОРФОГРАФІЯ, um77 ПРАВОПИС (fetched, not quoted).
- research/04-dialectology.md §1 — read.

### Still [U]
- -ться [t͡sʲːɐ], щ [ʃt͡ʃ], ц/ч/дж/дз values: need Погрібний 1984 / Тоцька 1981 (print only).
- Правопис §144, §151.
