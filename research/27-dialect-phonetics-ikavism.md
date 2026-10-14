# 27 — Dialect pronunciation of a standard form (BL-13) and the intermediate reflexes of new ikavism (BL-14)

Status: researched 2026-10-14. Tags: **[Q]** verbatim from a fetched source (locator given); **[P]** paraphrase / our IPA value derived from a [Q]; **[U]** unverified, must not gate or label anything (P-1.3: a rule without a source has weight 0).
Read first: specs/00 (P-1), specs/62 BL-13/BL-14, research/04 §1, research/13 C', research/23, research/03 R10, core/ipa.ts `DROWS`, core/phonology.ts R10.

Sources fetched (plain http/https, helper in `C:\Users\User\.claude\jobs\293095c9\tmp\`):
- SHEV-62 = Шевельов, *Історична фонологія*, ch. 62, http://litopys.org.ua/shevelov/shev08.htm ; SHEV-43 = ch. 43 (shev06); SHEV-29 = ch. 29 (shev05); SHEV-57 = ch. 57 (shev07). Chapters 20–22, 33, 45 (the body chapters on the new ikavism) are NOT online; all cites to them are as Shevelov cross-references them.
- EUM-ІКАВІЗМ = ЕУМ «Ікавізм» http://litopys.org.ua/ukrmova/um183.htm
- WP-x = uk.wikipedia raw wikitext `https://uk.wikipedia.org/w/index.php?title=<title>&action=raw` for Ікавізм, Західнополіський_говір, Середньополіський_говір, Східнополіський_говір, Закарпатський_говір, Лемківський_говір, Гуцульський_говір, Бойківський_говір, Наддністрянський_говір, Назви_Львова, Новий_ять.
- Not found as separate articles (404): Буковинські_говірки, Закарпатські_говірки, Буковинський_діалект.

## 1. The key structural fact (P)

Every dialect difference below that concerns **і** needs to know *what the standard і came from*: ѣ (R09), old *и* before jer (R11), or о/е in a newly closed syllable (R10). The standard spelling does not tell (стіл < о, сніг < ѣ, піч < е, ніс < е). So a dialect IPA for a **written standard form** can only be produced from the **derivation trace** (which rule created each і), never from the spelling alone. Conversely, a form **written in dialect spelling** (вуол, кун’, мÿист, пôл) carries its own evidence and can be recognised from the letters. This split is the "RECOGNISED vs IMPLIED" column below.

- **REC** = recognisable from spelling (the dialect letters/graphemes are in the string).
- **IMP** = only implied: the standard spelling is compatible with several pronunciations; we may only *offer* the dialect pronunciation when the user picks a region (P-3.1: pattern hints queue, never label).
- **TRC** = implied, but computable from the R-rule trace of our own derivation (the origin of і/е/о is known).

## 2. BL-13 — features that change the IPA of a standard form

All values for IPA are [P] (our transcription of a [Q] description) unless stated. «Cond.» = condition. Regions use research/04 codes (CHN, MPL, WPL, NORTH; MDN, SLB, STP, SE; VOL, POD, NDN, HUT, BOY, LEM, SW) plus **ZAK** (Transcarpathian, no 04 code yet — proposed) and **BUK** (Bukovinian, no 04 code — proposed; only mentioned in SHEV as the origin of ikavism).

### 2.1 Vowel reflexes in the newly closed syllable (the ikavism family)

| # | feature | regions | cond. (from trace) | std → dialect IPA [P] | recog. | source quote [Q] + locator |
|---|---|---|---|---|---|---|
| V1 | о > diphthong уо/уе/уі | WPL north, Nadbuzh Polissia (also CHN) | і < о (R10 о), stressed | вiл [vil] → [vu̯ɔl]/[vu̯ɛl]/[vu̯il]; кінь → [ku̯inʲ] | REC (вуол, куін’) / TRC | WP-Західнополіський: «зустрічаються ще й дифтонги [уо], [уе], [уі], (вуол, муой, вуел, муей, вуіл, куін’ та ін.)» ; WP-Східнополіський п.1: «Дифтонги на місці старих «о», «е», «ě» (вуол, піеч, діед)» |
| V2 | о > monophthong у/и/і/іи | WPL, east MPL, LEM, HUT, ZAK | і < о, stressed | вiл → [vul]/[vɪl]/[vil]; кінь → [kunʲ] | REC (кун’, вул) / TRC | WP-Західнополіський: «Відповідно до етимологічного [о] в новозакритих складах під наголосом виступають здебільшого монофтонги [у], [и], [і], [іи] (кун’, вул, кин’, вил, кіин’, віил, кін’, віл та ін.)» |
| V3 | о > ÿ (rounded front [y]-type) | ZAK central, HUT (мÿист), SHEV: SW Polissia «ü» | і < о | міст → [mʲyst] ([ÿ] = [ʏ]/[y]; sound value of «ÿ» is [U] — WP-Закарпатський calls it «лабіалізований [і]») | REC (ÿ) | WP-Закарпатський: «Континуанти етимологічного «о» в новозакритих складах: «у» в східних та західних говорах «вус „віз“», «ÿ» в центральних «вÿс»»; WP-Гуцульський: «також и, ы, у, ÿ на місці етимологічного [о] в нових закритих складах: вин, вын, вун — ‘він’; виз, вуз — ‘віз’; мист, мÿист — ‘міст’» |
| V4 | о > ў / [u̯]-glide | LEM | і < о, е | вечір → [ˈvɛt͡ʃu̯r̩]-type (**exact IPA [U]**) | REC (вечўр, пўух) | WP-Лемківський: «Наявність рефлексів давніх [о], [е] в нових закритих складах як [ў], наявність лабіалізованого [ыо].»; «Розвиток давнього [е] в [у], [ў], що відповідають літературному [і] (вечўр ‘вечір’, т'утка ‘тітка’)» |
| V5 | е before ъ-syllable > 'у / 'ÿ (not і) | ZAK, NDN-Sian (надсянські) | і < е only where the following jer was ъ (hard) | ніс (masc. past) → [nʲus]/[nʲys]; тітка → [ˈtʲutka]; приніс → [prɪˈnʲus] | REC | WP-Закарпатський: «у складах, після яких занепав давній «ъ», виступають ‘у, ‘ÿ «мн'ут „мед“, т’ýтка, прин’ýс, привйýх „привів“; мн’ÿт, т’ÿтка, прин’ÿс, привÿх»»; SHEV-62: «уживанням ’u як рефлекса е, якщо далі первісно йшов склад зі слабким ъ (n’us ’ніс’ чол. рід мин. часу — при тому, що альтернатом о виступає i!)» |
| V6 | е > іе / ие | CHN, MPL (esp. north), WPL Nadbuzh | і < е or ѣ, stressed | піч → [pi̯ɛt͡ʃ]; ліс → [lʲi̯ɛs]; сіно → [ˈsʲi̯ɛnɔ] | REC (піеч, л’іес) | WP-Західнополіський: «під наголосом зустрічається ще й дифтонг [іе] чи [ие] (с'и́ено, л'іес, т'и́есто та ін.)»; «[іе] (хміел’)»; WP-Східнополіський: «піеч, діед» |
| V7 | **ê, ô** as phonemic closed vowels | MPL (south, "Boikian-type" six-vowel system) | і < о (ô) / е (ê) | поріг → [porvɪ̯ɛk]-type (**IPA [U]**) | REC (ê, ô) | WP-Середньополіський: «ê розвинулося на місці о в новозакритих складах після зміни першого компонента дифтонга: порвêг (поріг), стêл і ствêл (стіл), лопухвêв (лопухів), а також з е: с’êм (сім)» ; «Закриті голосні ô та ê мають фонологічний статус» |
| V8 | monophthongisation unstressed | all NORTH | unstressed і < о/е/ѣ | ненаголошене: not diphthong, [i]/[ɪ] | TRC | SHEV-62: «дифтонгічна вимова рефлексів о…, е…, ѣ зникла тільки в ненаголошеній позиції»; also «Ці процеси монофтонгізації припали переважно на XIX-XX ст.» (середньополіські) |
| V9 | о preserved (no ikavism) | MDN north fringe | і < о | міст → [mɔst]; поріг → [pɔˈrɪɦ] | REC (воз, кóстка, порóг, рáдост’) | WP via research/04 MDN-O-KEPT: «давня фонема [о] в новоутв. закритих складах змінилася на [і] непослідовно, тому тут відзначено форми воз, кóстка. порóг, рáдост’» |
| V10 | *е > е· (narrowed), not і* | Sian (надсянські) | stressed е in closed syllable | небо → [ˈnʲɛ˞bu] with e· = [e] | REC (ne·bu) | SHEV-62: «звуження артикуляції наголошеного е (ne·bu ’небо’)» |
| V11 | ѣ unstressed > и/у | NORTH, Nadbuzh | ѣ unstressed | пісок → [pɪˈsɔk]; ліс/лісо́к → [lʲɪˈsɔk] | REC (мишóк, писóк, дидóк) / TRC | WP-Західнополіський: «у ненаголош. позиції може бути й [и] (мишóк, писóк)»; SHEV-62: «рефлексація наголошеного ѣ як i, а ненаголошеного — як у (звідки випливає, що південноукраїнський рефлекс ѣ як і набув поширення в цій зоні ще до злиття i та y)» |
| V12 | о > і also in open syllable / by analogy | Eastern dialects | analogy | беріг, стороні; -івл- | TRC (levelling) | SHEV-57: «появу і у відкритих складах замість о та е в словах типу кінéць та в закритих складах у повноголосих сполуках (типу бéрег > діал. бéріг, storon > сторíн ґен. мн.)» ; WP-Ікавізм: «буд**овл**я → буд**івл**я… Зміну [о] в [і] тут викликано аналогією» |

### 2.2 Galician / Bukovinian / Carpathian features

| # | feature | regions | cond. | std → dialect IPA [P] | recog. | source [Q] + locator |
|---|---|---|---|---|---|---|
| G1 | **'а > е/і/и after soft & sibilants** (the "Galician ê") | NDN, HUT (Galician-Bukovinian) | stressed я/а after soft or Ж Ч Ш | час → [t͡ʃis]-type; теля → [tʲɛˈlʲɛ]; шапка → [ˈʃɪpka]; яблуко → [ˈjɛbluku] (HUT) | REC for dial. spelling (чіс, ши́пка); IMP for std spelling | research/04 NDN-A-E, W-SW: «а після м'яких приголосних і шиплячих змінюється на голосний переднього ряду е, і, и (час > чіс …)». Opposite: ZAK «Збереження «а» після м'яких приголосних та шиплячих «т'агнýти, йáвур / йáвÿр; час»» (WP-Закарпатський) |
| G2 | ѣ > і in all positions (no е/и alternation) | NDN, VOL, all SW | ѣ | пісок [pʲiˈsɔk]; діло | TRC | WP via 04 SW-IKAVISM; SHEV-62 (above) |
| G3 | **hard-палатал**: ж, ч, ш → palatalised | SW, BOY: soft ж ч ш; POD/NDN | all ж ч ш | чай → [t͡ɕɑj]-type | IMP | BOY: WP-Бойківський: «м'які ж, ч, ш (меж'а, ч'ас, пш'оно)»; ipa.ts `SW-PALATAL-SIBILANTS` |
| G4 | **ы** retained, distinct from и | BOY, LEM, HUT, ZAK, NDN (after labials) | R11 not applied | сини → [ˈsɨnɨ]; бик → [bɨk] | REC (ы) / IMP | WP-Закарпатський п.17: «Фонема заднього ряду /ɨ/ … від праслов'янського *y («сын»…)»; WP-Наддністрянський: «ы, що зберігає давню вимову, відмінну від и (бы̊к, мы̊ш, вы̊ …)» |
| G5 | **ий < -и/-і, -ы** | LEM | ending only | коли → [kɔlɪj]; гуси → [ˈɦusɪj] | REC (колий) | WP-Лемківський: «Вимова на місці давніх [ы] та [і] як [ий] (колий «коли», гусий «гуси», ідий «іди»)» |
| G6 | **ў** < в, л | LEM, NDN, SW | after vowel, before consonant/final | кров → [krɔu̯]; плуг → [pu̯uɦ] (LEM) | REC (ў) / IMP (в after vowel is already [u̯] in standard, WP-Українська_фонетика) | WP-Лемківський: «Звук [л] у позиції перед лабіалізованим голосним заступається звуком [ў] (пўух ‘плуг’)» (via research/04 LEM-W-L) |
| G7 | final devoicing | LEM (мет), STP (міх), SW | word-final voiced obstruent | зуб [zup]; мед [mɛt] | IMP | research/04 CHN-VOICED-FINAL; SHEV-62: «знеголошення дзвінких приголосних наприкінці слова та перед глухим приголосним» (як риса західнополіських, спільна з SW); CHN **keeps** voice |
| G8 | **hard р** (ря > ра) | POD, VOL, STP west | р + я/ю/і | зоря → [zɔˈra]; буряк → [buˈrak] | IMP | research/04 HARD-R: «Твердість p перед голосними — бурáк, радóк, расни́й, зорá, говóру» |
| G9 | final hard ц | NDN, POD, HUT | -ець, -иць | хлопець → [ˈxlɔpɪt͡s] | IMP | 04 HARD-C-FINAL «втрата м'якості ць у кінці слова (хлóпиц, жнец)» |
| G10 | ґ’/к’ for д’/т’ | NDN, HUT, SW | before і/є | дід → [ɡʲid]; тісто → [ˈcʲistɔ] | REC (ґ'ід, к’істо) / IMP | 04 SW-KJ-GJ: «перехід м'яких приголосних д’, т’ в ґ’, к’ (д'ід > ґ'ід, т’íсто > к’íсто)» |
| G11 | -ті/-ть finals | see §4 | | | | |
| G12 | -кій/-хій (adj.) | NDN | -кий unstressed | глибокий → [ɦlɪˈbɔkij] | IMP | 04 NDN-ADJ-KIJ |
| G13 | epenthetic л’/н’ after labial | POD, MDN, NDN, SLB | м'я в'я | здоров'я → [zdɔˈrɔu̯lʲa] | REC | 04 EPENTH-L-N |
| G14 | unstressed о > у | LEM, HUT, NDN, SW | unstressed о | говорити → [ɦuvɔˈrɪtɪ]; кожух → [kuˈʒux] | IMP (std already [ʊ] before stressed у/і) | HUT: «укання відзначається перед складом з голосним високого підняття у, і (хоудíм, гуд’íўл'а, кужýх)»; SHEV-43: «"укання" (ko≥uxž) …» (ch. 43 lines 327–330); LEM: «перехід [о] в [уо], [у] … у ненаголошеній позиції» (WP-Лемківський) |
| G15 | unstressed е > у/и | SW | unstressed е | | | WP-Наддністрянський / SHEV-62 «ненаголошений о … як u, а ненаголошений е — як у» |
| G16 | **акання** | CHN (Desna), WPL north, STP/SLB margin | unstressed о | голова → [ɦɑˈlɔvɑ] | REC (галава́) / IMP | WP-Східнополіський: «Акання: ненаголошене «о» → «а» (галава́, пабіегла, вада́)»; SHEV-62: «говірки, поширені на північ від Десни, з характерним для них аканням … є в ґрунті речі білоруські» |
| G17 | ф > х / хв | CHN, MDN, SE | всі ф | фабрика → [ˈxʋabrɪka] | REC | 04 F-TO-X |

Not found or only [U] (do not implement): value of the Lemko ў-vowel, value of ÿ, value of ê/ô (all described only as «лабіалізований [і]» or by letters — no acoustic description fetched); the Bukovinian bundle (ikavism, ''а > е'', hard р) has no separate wiki article under the titles tried — SHEV-43 names Bukovina only as innovation centre: «Буковина першою зініціювала такі важливі зміни, як злиття і та у (і > у, потім у > у·: milo, mylo > my·lo) та звуження е та о в новозакритих складах після занепаду єрів (šе·st’, sto·l > šíst’, stu·l)».

### 2.3 What the code already has (core/ipa.ts `DROWS`) and gaps

Existing: N-DIPH-UO, N-DIPH-IE, N-MONO-UY, MDN-O-KEPT, CHN-AKANYE, UKANYE, CHN-V-W, HARD-R, HARD-C-FINAL, R-SOFT-FINAL, EPENTH-L-N, F-TO-X, NDN-A-E, SW-KJ-GJ, FINAL-DEVOICE, SW-PALATAL-SIBILANTS, CARP-Y, LEM-SIBILANTS.
Gaps (all because the row `apply` works on spelling; the diphthong rows only fire if the string already contains уо/іе):
1. **V1/V2/V6/V9/V3/V4/V5 do not fire on a standard string** such as «кінь», «піч», «стіл». They need the derivation trace (origin of і = R10 о, R10 е, R09 ѣ). The reverse engine already has `ikav()` in core/reverse.ts; ipa.ts needs a `iOrigin[]` input: `toIpa(form, positions, dialect, origins?)`.
2. G2/G11 (ѣ unstressed > и) — needs origin tag R09 + stress.
3. V5 (е before ъ-syllable) needs to remember *which jer* followed (derivation knows: havlik marks S/W jers; **LOST** token).
4. ZAK, BUK, Sian regions are missing from `IPA_DIALECTS`.
5. G6 `ў` for LEM л-before-rounded; G5 `-ий`; G12 -кій not in DROWS.

## 3. BL-14 — intermediate reflexes of new ikavism and written traces

### 3.1 The scheme (Q from Shevelov, EUM, WP)

- [Q] EUM-ІКАВІЗМ: «Останні внаслідок занепаду у наступному складі редукованих ъ та ь подовжилися і через стадію дифтонгізації (*о > ō > уо, уи, уі, уе ... > і; *е > ē > іе > і) чи звуження цих голосних у монофтонги і делабіалізацію (*о, *е > ō, е > у, ÿ > і) у всіх пд.-сх. та багатьох пд.-зх. говорах змінилися в і: *stolъ > stōl >... > стіл; *selъ, > sēl > ... > сіл.»
- [Q] SHEV-43 (ch. 43, shev06.htm): «Звужені (реалізовані з вищим піднесенням) o· та e· в новозакритих складах за інерцією ще більше наблизилися до і (у випадку e· : šе·st’ > šist’ ; те саме стосується й e·, посталого з ѣ) та до u· > ü > і (у випадку о : sto·l > stu·l > stül > stil).»
- [Q] SHEV-57 / SHEV-62 (ch. 62, shev08.htm): «у послідовних переходах е > е· > і чи (цього разу йдеться про процес, початок якому дала не внутріскладова акомодація) о > о· > и > ü > і (див. розділи 21, 33, 45).»
- [Q] SHEV-62 on the contrast north/south: «на південних землях безпосереднім вислідом цього процесу була поява звужених голосних е· та о· (а також о), то на північних — дифтонгів типу іе та ио (див. 20.4; 21.1; 22.1).» — i.e. **two parallel paths** (north diphthongs, south narrowing).
- [Q] SHEV-62 (West Polissia, mixed): «рефлексація наголошеного звука е в новозакритих складах … як і, а звука о за тих самих умов — як ü, і, у або u залежно від місцевості» — the intermediate «ü» is still a living reflex in some villages.
- [Q] SHEV-62 on relative age/dating: «Ці південноукраїнські риси защепилися в XVI ст. (або — щонайпізніше — в XVII ст.)»; «… перехід 'u· в і як альтернат е (бік : боку, ніс : несла). Вони обидва датуються XVI-XVII ст.»; and on the direction: «дані пам'яток суґерують, що розпросторення йшло з Волині на захід у напрямку Львова, а відтак на південний схід, але перші його з'яви в пам'ятках можуть мати випадковий, а отже й оманливий характер. Натомість у випадку і, що чергується з о, навіть такого ґатунку даних не знайти.»
- [Q] SHEV-29 (ch. 29, shev05.htm): «Але … не відбито й української твердості приголосних перед е й переходу о > u в новозакритих складах (дуже часто).» — Middle Ukrainian writing usually does **not** show о > u; the scribe keeps о/ѡ.
- [Q] WP-Ікавізм: «У давньоруських пам'ятках на місці етимологічного [o] засвідчені написання з подвоєним о (воовця, воотчину), але частіше — з у чи ю (добровулно, грошювь).»
- [Q] WP-Ікавізм: «[возъ] → [вōз] → [вуиз] → [вуіз]… → [віз]» ; «[стогъ] → [стōг] → [стуог] → [стуиг] → [стуіг]… → [стіг]» ; «[с'ел] → [с'ÿол] → [с'ÿил] → [с'ÿіл].. → [с'іл]»; «[п'еч'] → [п'ēч'] → [п'ḭеч'] → [піч]»  (this article is a textbook reconstruction; the reflexes are not tied to a dated monument here).

### 3.2 Written traces (spellings)

| stage | spelling | where | status | source |
|---|---|---|---|---|
| о (kept) | Львовъ, воз, кость | std. etymological spelling | [Q] | WP-Назви_Львова: «Фонетично старішою є «неікана» форма Львовъ; етимологічним правописом давня форма і новітнє звучання поєднувались у написанні Львôвъ.» |
| ô | Львôвъ, кôнь, мôй, жалôбно | Maksymovych / Galician etymological orthography, 19th c. | [Q] | WP-Ікавізм «Графіка»: «[i] від [o] та від [e] — як о і е з «дашком» (мôй, жалôбно, ôнъ, матêрью)» ; same system writes **ѣ** for ѣ-i |
| оо | воовця, воотчину | Old East Slavic MSS | [Q] | WP-Ікавізм (above); **not located in our corpus** |
| у/ю | добровулно, грошювь | OES MSS | [Q] | WP-Ікавізм |
| и for ѣ | ницииѣ… | 11th–13th c. | [Q] | WP-Ікавізм «Дані пам'яток» |
| ꙋ / у for o | кунь, Львув, куонь, вуз | [U] — **no dated Middle Ukrainian attestation of «Львув» was found** | [U] | Nothing in SHEV-29/43/57/62 or WP-Назви_Львова lists the form. Do not claim it. The *dialect* forms with the same vowel: ZAK «вус „віз“», «вÿс» (WP-Закарпатський), HUT «вун, вуз, мÿист», WPL «кун’, вул». By these, a hypothetical «Львув» type is **derivable** (Львовъ → R10 → [lʲvu̯uw] ...) but not attested. |
| ü, ÿ | вÿс, мÿист | dialect transcription, Transcarpathian / Hutsul | [Q] | WP-Закарпатський, WP-Гуцульський |
| ê, ô | порвêг, стêл, ствêл, д’êн’ | MPL transcription | [Q] | WP-Середньополіський |
| іо/уо | куін’ вуол | WPL | [Q] | WP-Західнополіський |
| ї | хлїб, дїд | Zhelekhivka, Galician 19th c., for **ѣ and new ѣ after soft dentals** | [Q] | WP-Ікавізм «Графіка»: «на місці ятя (у тому числі й нового) у позиції після м'яких зубних приголосних д, т, з, ц, с, л, н використовувалася літера ї; вона передавала «сильно пом'якшений» [і] (хлїб, дїд, нинї, цїлий)» |
| ѣ for new і | камѣнь, матѣрь, шѣсть, пѣчь | OES/Middle Ukr. | [Q] | WP-Новий_ять: «На письмі позначався літерою ѣ: наприклад, камѣнь, матѣрь» |
| илвов | Илвовъ, до Илвова (1407), воєводі Илвовскомъ (1371) | Galicia/Moldova chancery | [Q] | WP-Назви_Львова «Илвов»: «воєводі Илвовскомъ (1371); мѣстьчяны Илвовского мѣста, до Илвова (1407)… Ця форма збереглася до сьогодні в західноукраїнських говорах, що зафіксовано у словнику Желехівського (стор. 322).» — a *dialect* form of the same name; the vowel was still о |
| Лвовъ, Львовъ городъ | близу града Лвова (1654), на городъ на Львовъ (1283 entry), городъ Львовъ (1648) | AZR | [Q] | WP-Назви_Львова |
| Львів | first in a dictionary 1886 (Желехівський); folk saying in Nomys 1864 | | [Q] | WP-Назви_Львова: «Форма Львів у словниках вперше виступає в словнику в 1886 році … ще в 1864 році М.Номис фіксує приказку «Львів не всякому здорів»» |
| Lwów | Polish, 1356 earliest | Pol. | [Q] | WP-Назви_Львова: «Вони знають тільки Lwów, напр. під 1356» — Polish ó [u] is a *parallel* raising (SHEV-62 «обидві мови прийшли до схожих результатів, отримавши u … та і … але різними способами … і тому ці процеси в обох мовах напевне не пов'язані»). Do not use as evidence for Ukrainian intermediate [u]. |

Conclusion for «Львув»: the user's intuition (о → у (ū) → і) is **the documented path** (SHEV-43: sto·l > stu·l > stül > stil), and Львув-type outputs exist in living dialects as у/ÿ reflexes (ZAK вус/вÿс, HUT вун/вуз, WPL вул/кун’). But **no dated written «Львув» is in our fetched sources** → [U] as an attestation; [P] as a derived intermediate.

### 3.3 Intermediate chain to emit in the derivation trace (draft, [P] with each stage's [Q])

For *конь* (R04 → R10) the existing trace says кôнь → кüнь → кінь (research/03, ~line 93). From the sources the following **branching** trace is the supportable one:

```
конъ(ь) → [R04 jer fall] → кo·нь   (о· = лабіалізований, звужений; SHEV-62 «о· (а також о)»)
   south branch:  кo·нь → кu·нь (u·) → кünь (ü) → кінь    [SHEV-43 sto·l > stu·l > stül > stil]
   north branch:  кo·нь → куо́нь / кио́нь → куінь / кінь     [SHEV-62 «дифтонгів типу іе та ио»; WP-Ікавізм стуог → стуіг]
   live dialect continuants:  кун’ (WPL/ZAK/HUT), кÿн’ (ZAK centre), кин’ (WPL), кіин’, кін’
```
Date caps (all [Q] SHEV-62): fall of jers 1050–1150; reflexes of closed syllable stabilised «XVI–XVII ст.»; diphthong monophthongisation in Middle Polissian «переважно на XIX-XX ст.»; consequently any ü-stage orthographic claim before the 16th c. is [U].

### 3.4 Form classes our derivation currently misses (core/phonology.ts R10 `(?<![ое][рл])[ое]((?:C){1,2}ь?)LOST`)

1. **-овъ > -ів** (Львів, Київ? no — Київ < Кыєвъ; it is Львів, Борів, Тернів-type toponyms; **the common class is gen. pl. -овъ > -ів**: братовъ → братів, ковалевъ → ковалів). Requires the nominal ending's jer-fall context; check that LOST sees the final ъ of an ending, not only stem jers. [P]
2. **Vowel alternation with analogical restoration** (R10 levelled): кінь/коня, але стола — the genitive keeps о because the following syllable is open. Fine in trace, but dialect "стул" (V2) must apply *only* to the stressed closed-syllable member of the alternation. [P]
3. **-івл- suffix** (будівля, зимівля, куплівля): о > і *by analogy* (WP-Ікавізм: «нефонетично, бо в наступому складі ніколи не було зредукованого ь чи ъ»); R10 will not derive it — needs a lexicalised analogy tag; and the **hypercorrect** «куп'увл'я, торг'увл'я» in the Hutsul area. [Q: WP-Ікавізм]
4. **Pleophonic і** (беріг, сторін gen. pl.): SHEV-57 «бéрег > діал. бéріг, storon > сторíн ґен. мн.» — R10 blocks them (exception b), but the standard *has* сторін, зсторін, тощо; so exception b must be **lexically overridden** for gen. pl. and for dialect forms (беріг, холодів?). [Q]
5. **Open-syllable і < е/о** (кінéць, пісок < пѣсъкъ? no — кінéць): SHEV-57 «появу і у відкритих складах замість о та е в словах типу кінéць». Classed as *later accommodation*, not R10; our trace does not mark it. [Q]
6. **Prothesis + і** (вікно, вісім, вітер?): R21 and R10 interplay; ok but the **prothetic stage ordering** (вокно → вікно) should be shown. [P]
7. **е before ъ-syllable vs ь-syllable** (мед → мід(діал.) / мед; ніс (masc. past) vs несла): SHEV-62 «двоїстість рефлексів … (мед : меду проти ніс : несла)» — standard is mostly е/і, but the R10 trace should record which jer followed so dialect V5 can fire. [Q]
8. **е > о after sibilants (R17) before R10** (шість < шесть; жінка < жена-; чотири), ordering; **шість** vs «шоста» etc. [P]
9. **ѣ-new vs ѣ-old** (шѣсть = new ѣ → і; but a Church-Slavonic spelling would keep ѣ unshifted): our trace uses `ѣ` for both; WP-Новий_ять distinguishes: «протягом XIII ст. не фіксується перехід «нового ятя» в [ɪ] (на письмі — «и»), тоді як у випадку з давнім [ě] вона звичайна». [Q] Needs a separate token `ѣ₂` in the R-pipeline so that **и-spelling for old ѣ** (дитина) is not applied to new ѣ.
10. **Written ô / ѣ in Galician etymological orthography** (Львôвъ, мôй): our input normaliser (N-rules) does not read «ô»/«ê» as o/e-with-ikavism; they should map to (о→і marker). [Q: WP-Ікавізм «Графіка»]
11. **Илвов-type prothetic и- before л/р + jer** (илвов, иржа, ильняний): WP-Назви_Львова «приставного «и» перед звуками «л» та «р», головно коли після них була редукована голосна»; our pipeline has no R-rule. [Q]
12. **Nasal/west Slavic parallels** not needed.

### 3.5 Recognisable vs implied — summary

| class | recognise from spelling | implied only |
|---|---|---|
| вуол, куін’, піеч, мÿист, вÿс, вечўр, порвêг, колий, ы, ў | REC | |
| кінь, піч, стіл, ніс, міст (standard) | | IMP/TRC: dialect IPA only on user-selected region AND origin from trace |
| акання, укання, hard р, final devoicing, final ц | | IMP |
| «Львув» as 19th-century dialect orthography | [U] | |

## 4. Verb/ending features that change IPA (BL-13 short list)

| # | feature | regions | std → dialect | IPA effect | recog. | source |
|---|---|---|---|---|---|---|
| E1 | inf. -ти > -т’ / -ть | CHN, MDN, SLB, STP | робити → робит’ | final [tʲ] instead of [tɪ] | REC | WP-Східнополіський: «Інфінітивний суфікс -т' при дієсл. основі на голосний (гаманіет', бит')»; WP via 04 |
| E2 | 3sg -ть hard -т | POD, NDN | робить → робит | [rɔbɪt] | REC | 04 3SG-HARD-T «рóбит, нóсит» |
| E3 | 3sg zero -т | HUT | ходять → ходє | | REC | 04 HUT-3SG-ZERO |
| E4 | -ться [t͡sʲːɐ] vs [t͡sːɐ] | all | | standard already | | research/13 B |
| E5 | -оў/-еў instr. fem. | SW | рукою → рукоў | final [u̯] | REC | 04 SW-INSTR-OW: «рукóў, землéў» |
| E6 | -ом (1pl) MPL | north | несемо → несом | | REC | 04 MPL-PL1-OM |

(Morphological rows are not IPA-changing per se; included only because -т’/-т and ў alter the final consonant/vowel.)

## 5. Recommendations (not implemented here)

1. Add `iOrigin` to the derivation output (per і: `R09|R10o|R10e|R11|init`) and pass it to `toIpa`; dialect rows V1–V6, V9, V11 are then TRC rules.
2. Add regions ZAK, BUK, SIAN to `IPA_DIALECTS` with a note [P: described only in WP-Закарпатський / SHEV-62].
3. Only the **south narrowing chain** кo·нь → кu·нь → кünь → кінь and the north diphthong chain are citable; ship them as an expandable "intermediate stages" in the trace, with SHEV-43/SHEV-62 quotes above; do not claim «Львув» as attested.
4. Keep IPA for ÿ, ê, ô, Lemko ў-vowel [U] until an acoustic source (АУМ/Верхратський/Dejna) is fetched.
5. Fix list §3.4 items 1, 3, 4, 5, 9, 10, 11 in `core/phonology.ts` (ordered by value).

## 6. Fetch log (2026-10-14)
- http://litopys.org.ua/shevelov/shev05.htm (ch. 29), shev06 (ch. 43), shev07 (ch. 57), shev08 (ch. 62): OK (cp1251 decoded).
- http://litopys.org.ua/ukrmova/um183.htm (ЕУМ Ікавізм), um159, um161: OK.
- uk.wikipedia raw (User-Agent set; the bare `curl` got a Wikimedia error page): Східнополіський_говір, Західнополіський_говір, Середньополіський_говір, Наддністрянський_говір, Гуцульський_говір, Лемківський_говір, Бойківський_говір, Подільський_говір, Волинський_говір, Північне_/Південно-західне_наріччя, Ікавізм, Львів, Назви_Львова, Новий_ять, Закарпатський_говір, Українська_фонетика: OK. Буковинські_говірки, Закарпатські_говірки, Буковинський_діалект, Поліські_говірки, Покутсько-буковинські_говірки: 404.
- Searched but not done: ЕУМ entries on individual dialects (um162–um177 not fetched), Верхратський / АУМ / Ганцов «Характеристика поліських дифтонгів» (cited in SHEV-62 bibliography, not fetched), any web search for «Львув» (no attestation claimed).
