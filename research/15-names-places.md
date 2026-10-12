# R15 — names & places (round 1 + round 2 FU-15)

Tags: [Q] verbatim-checked, [P] paraphrase, [U] unverified. Round 2 resolved sections 1, 5, 6 (Wikidata) and 7; the rest keep their round-1 status.

## 1. Corpus evidence for Київ variants (round 2: token-level, capitalised tokens in data/work/*.json)
Method [Q, reproducible]: `C:\Users\User\.claude\jobs\293095c9\tmp\topo.cjs` counts tokens whose `raw` starts with a capital, strips combining marks/titlo, matches a stem regex. Counts are tokens, not distinct witnesses. Witnesses: kievchr (Kyiv Chronicle), gvl (Galician-Volhynian), samovydets, kulish1882, etc. The "earliest witness" column is the earliest `date[0]` among witnesses containing the stem, so it is a ceiling for attestation in our corpus, not first attestation of the name.

Київ: 584 tokens (kievchr 460, samovydets 45, gvl 41, kulish1882 11). Top spellings: Киевъ×82, Киевѣ×73, Киеву×59, Киева×58, Киӕне×41 (Киӕнъ, "Kyivan"), Киевоу×26, Кыевъ×21, Къıевоу×18. Модерн Київ forms are rare in tokens starting with capital in these files. Киюв: 0. The round-1 "кыѥвъ ×1" and "Кіев ~12" figures are superseded by this table; check the witness before citing a form.

## 2. Phonetic derivation (research/03 §R03, R04, R12)
- [Q] research/03 row 3: velar + ы → и; example «кыѥвъ→Київ» (ch. 62).
- [Q] research/03 row 12: ѥ in newly closed syllable → ї; «кыѥвъ→Київ».
- Rule ids R03, R04, R12 give the provenance trace; rank generated candidates against СУМ/ULIF/VESUM.

## 3. Proper-name detection (method, not yet implemented)
- VESUM tags prop, geo, fname, lname, pname, patr (research/02 §2): filter, not proof.
- Suffix cues [P]: -ович, -ів/-ин/-ов, -ськ-, -ичі [U frequency].
- Capitalisation is weak in old witnesses. Note from round 2: capitalised-token lists are dominated by sentence-initial function words in modern texts (Мов, Так, Щоб, Але, Хто …), so a toponym list needs a stem whitelist or VESUM geo filter; the old chronicles capitalise names consistently.
- PROIEL `Ne`, Stanza PROPN: not checked [U].

## 4. Name variants across languages
- Polish «Kijów», Latin/English «Kiev»/«Kyiv», Russian «Киев»: standard forms, not verified against a source [U].
- Corpus variants in the data are now listed in §1/§5; a fold/derive run over the full variant set remains to do [U].

## 5. Key toponyms with spellings in the corpus (round 2, [Q] counts via topo.cjs)
Columns: tokens | earliest witness date containing it | top spellings (×count) | main witnesses.

| Toponym | n | earliest | Spellings | Witnesses |
|---|---|---|---|---|
| Київ | 584 | 1037 | Киевъ×82, Киевѣ×73, Киеву×59, Киева×58, Киӕне×41, Киевоу×26, Кыевъ×21, Къıевоу×18 | kievchr 460, samovydets 45, gvl 41 |
| Володимер/Володимир (city AND personal name; not separable by regex) | 996 | 1037 | Володимеръ×153, Володимиръ×134, Володимерь×50, Володимѣръ×50, Володимира×48, Володимера×44 | kievchr 681, gvl 299 |
| Русь (land and adjective) | 321 | 1037 | Роусь×49, Роускои×31, Роускоую×25, Роуси×24, Русь×23, Руси×12, Рускои×12 | kievchr 199, gvl 87 |
| Галич | 305 | 1117 | Галичь×69, Галича×35, Галичю×27, Галичи×24, Галичѣ×15, Галичьскъıи×9 | kievchr 159, gvl 137 |
| Чернігів | 184 | 1096 | Чернигову×41, Черниговоу×33, Черниговѣ×24, Черниговъ×22, Чернигова×16, Черниговьскии×9 | kievchr 157, gvl 17, monomakh 10 |
| Переяслав | 159 | 1096 | Переӕславлю×42, Переӕславлѧ×31, Переӕславль×28, Переӕславли×16, Переяславлю×6 | kievchr 146, monomakh 11 |
| Смоленськ | 147 | 1096 | Смоленьску×22, Смоленьска×21, Смолнѧнъ×18, Смоленьскоу×16, Смолнескъ×7, Смоленск×4 | kievchr 128, samovydets 12 |
| Новгород | 144 | 1096 | Новгородци×40, Новугороду×24, Новагорода×23, Новгородъ×4 | kievchr 122, gvl 13 |
| Дніпро | 209 | 1117 | Днѣпръ×49, Днѣпра×44, Днѣпр×31, Днѣпру×16, Дніпро×8, Днѣпроу×7 | samovydets 86, kievchr 71, kulish1882 11 |
| Москва | 138 | 1117 | Москву×39, Москвѣ×30, Москви×10, Москві×6, Москва×6 | samovydets 85, kulish1882 20 |
| Україна | 269 | 1672 | Україну×58, Вкраі́ні×29, України×28, Українѣ×26, Україні×18, Украі́ни×15 | kulish1882 91, samovydets 88 |
| Чигирин | 93 | 1672 | Чигирина×39, Чигирин×31, Чигиринѣ×9, Чигирину×8 | samovydets 93 |
| Литва | 107 | 1117 | Литвоу×24, Литва×20, Литвѣ×15, Литовьскои×9 | gvl 80, samovydets 16 |
| Крим | 50 | 1672 | Крим×29, Криму×14, Кримського×2 | samovydets 44 |
| Запоріжжя | 51 | 1672 | Запорожже×11, Запорожжя×7, Запорожжа×6, Запороже×5, Запорожа×5, Запорожю×4 | samovydets 46 |
| Львів | 65 | 1200 | Лвови×21, Лвов×6, Лвова×5, Лвовъ×4, ЛЬВІВ×3, Львів×3 (stem also matches Лев/Лвъ, partly personal name Левъ) | gvl 39, samovydets 14 |
| Курськ/Рязань/Суздаль/Ростов | 130 | 1096 | Соуждалю×10, Соуждаль×10, Рѧзань×8, Ростовци×7, Ростовъ×6 | kievchr 110 |
| Туров/Пінськ | 29 | 1096 | Турова×7, Пинескъ×6, Турову×6, Туровъ×6 | kievchr 25 |
| Корсунь | 28 | 1117 | Корсуня×8, Корсуню×6, Корсунѣ×3 | samovydets 26 |
| Полтава | 28 | 1672 | Полтави×7, Полтаву×5, Полтавскій×4, Полтавѣ×3 | samovydets 19 |
| Батурин | 26 | 1672 | Батурин×10, Батурина×7, Батуринѣ×5 | samovydets 21 |
| Дорогобуж | 17 | 1117 | Дорогобужю×9, Дорогобужа×5, Дорогобужь×2 | kievchr 17 |
| Звенигород | 16 | 1117 | Звенигородѣ×3, Звенигородоу×2, Звенигородьци×2 | gvl 9, kievchr 7 |
| Луцьк | 15 | 1117 | Лучьска×5, Лучьску×4, Луцко×1 | kievchr 13 |
| Полоцьк | 14 | 1117 | Полоцко×4, Полочанѣ×2, Полочанъ×2 | kievchr 7, samovydets 6 |
| Волинь | 12 | 1672 | Волинь×3, Волиню×3, Волині×2, Волинѣ×1 | samovydets 7 |
| Теребовль | 8 | 1117 | Теребовлу×3, Теребовль×2 | gvl 4, kievchr 4 |
| Перемишль | 6 | 1200 | Перемышль×2, Перемышльскомоу×1 | gvl 6 |
| Цариград | 2 | 1672 | Цариграда×2 | samovydets 2 |
| Острог | 1 | 1672 | Острог×1 | samovydets 1 |

Ethnonym-like capitalised stems (not toponyms but useful gazetteer rows): Половці 326 (Половци×215), Угри 218 (Оугръ×73), Ляхи 212 (Лѧхъ×59). Not found as capitalised tokens: Білгород, Вишгород (0 hits with the stems used; they may appear under Бѣлъ-/Вышь- spellings, stem not exhaustive) [U].
Caveats [P]: derived adjectives and ethnonyms are folded together with the city; "Володимер" cannot be split between the city and the prince without NER; earliest-date column is witness-level.

## 6. Geocoding and map
Wikidata SPARQL (https://query.wikidata.org/sparql, fetched 2026-10-12, HTTP 200) [Q]:
| City | QID | P625 | Names |
|---|---|---|---|
| Київ | Q1899 | Point(30.523611 50.45) | P1448 uk «Київ»; P1449 uk «Мати міст Руських», «Місто, де все починається», ru «Мать городов русских» |
| Чернігів | Q157053 | Point(31.294722 51.493889) | P1448 uk «Чернігів» |
| Галич | Q146450 | Point(24.721667 49.112778) | P1448 uk «Галич» |
| Володимир (Volyn) | Q33544 | Point(24.322222 50.848056) | P1448 uk «Володимир» |
| Переяслав | Q639839 | Point(31.445 50.065) | P1448 uk «Переяслав», «Переяслав-Хмельницький», ru «Переяслав-Хмельницкий», be, ro |
Findings [Q]: (1) the round-1 id guesses were wrong; resolve QIDs by label (`rdfs:label "…"@uk; wdt:P17 wd:Q212; wdt:P31/wdt:P279* wd:Q515`). (2) P1448 = official name, P1449 = nickname; neither carries historical spellings, so Wikidata does NOT supply Кыѥвъ/Киевъ. Historical names must come from our corpus (§5) and the project's own variant table; Wikidata gives only coordinates and modern labels (use rdfs:label/skos:altLabel for modern multilingual forms). Note Q1899 has no P1448 in ru/pl labels here, so Kijów/Киев must come from labels, not P1448.
- GeoNames: CC BY 4.0, attribution required [U, not re-fetched].
- Map: Leaflet + OSM tiles needs attribution and respects the tile usage policy; offline Natural Earth SVG avoids tile dependency. Recommendation: Leaflet + OSM with attribution for the MVP, Natural Earth fallback [P].

## 7. Михайло Зубрицький (U-11)
Fetched uk.wikipedia «Зубрицький Михайло Іванович» `action=raw` (200, 81 593 bytes) and read the full bibliography (lines 644–661) and "Цікаві факти" [Q].
- Result: NO work on the name «Київ» is listed. NOT FOUND in Wikipedia, in a web search, or in the bibliography of the article. The user's premise (U-11) is therefore unconfirmed [U]; do not invent a title/year.
- The nearest toponymic claim in the article: «Першим дослідив, коли вперше написано топонім «Україна» — у 1187 році в Київському Літописі.» (fact #3 of «Цікаві факти», no citation attached to it in the article) [Q for the sentence, U for the underlying claim]. This is the name «Україна», not «Київ»; the source work is not named. Candidates to check: Зап. НТШ articles; Зубрицький's collected works (Львів, ed. Франко Сисин, 2013–2019, ciuspress.com) [U].
- Other name-related works [Q titles from the article's bibliography]: «Імена, назви і прозвища селян с. Мшанця, Старосамбірського повіта», Зап. НТШ, Л., 1906, Т. 79, кн. 5 (onomastics of personal names, not Kyiv).
- Self-identification quotes [Q, from the article quoting him; original location not given]: «Розвій руського народу, єго піднесенє не прийде ані від півночи, ані від заходу, але довершиться власними силами русинів» (anti-Moscophile; he speaks as a Rusyn/Ruthenian of Galicia); and «світло правди і науки в свійській руській одежі». Article title of a 1903 «Діло» piece (No. 139, 23 June (6 July) 1903): «Право греків на Македонію, а поляків на Русь-Україну». Vetting note [P]: he identifies as «русин» of Galician Rus' and uses «Русь-Україна»; full text in chtyvo/diasporiana not located in this pass [U].
- Biography [Q]: b. 22 Oct 1856, Кіндратів; priest in Мшанець 17 Nov 1883–25 Apr 1914; infobox nationality «українець».
- Secondary literature (nz.lviv.ua, Народознавчі зошити 2008 №3–4, pp. 358–408, incl. Дем'ян, «Національно-державницьке спрямування…» 18.pdf) lists his work; the Kyiv-name item was not seen in the abstracts/web search [U].

## Open items
1. Fold/derive variant run over all data/work incl. non-capitalised forms [U].
2. Білгород/Вишгород/Київ-adjective stems with Бѣл-/Вышь- spellings [U].
3. Зубрицький: read Дем'ян's bibliographic survey (nz.lviv.ua 2008-3-4/18.pdf) and the collected works' contents for «Київ»/«Україна»; ask the user for the intended source [U].
4. GeoNames licence re-check [U].

## Round 2 log
- C:\Users\User\.claude\jobs\293095c9\tmp\caps.cjs (capitalised-token frequency, top 600) and topo.cjs (toponym stems) over C:\Users\User\IdeaProjects\BULP\data\work\*.json.
- https://query.wikidata.org/sparql (5 city queries; first attempt with guessed QIDs failed, redone by label) — OK.
- https://uk.wikipedia.org/w/index.php?title=Зубрицький_Михайло_Іванович&action=raw — OK.
- WebSearch (standard) «Зубрицький назва Київ» — no matching work; hits: nz.lviv.ua 2008-3-4/23.pdf, chtyvo Braichevskyi «Ще про походження назви Київ» (not Zubrytskyi).
