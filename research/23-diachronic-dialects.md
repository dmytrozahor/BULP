# R23 — Diachronic dialect mapping (U-23)

Scope: replace the blanket `dialectGate` (core/rules.ts:102, fires only on forms with year ≥ 1798) with per-feature earliest-attestation dates, applied oldest feature first. Context read: research/04 §1 and §4–5, research/03 (R09–R21), research/09 §1. No new primary sources were fetched in this run (cap reached on reuse of existing research); every date below is either a [Q] quote already in research/03–04 with its locator, or [P]/[U] and must be verified before it is used as a gate.

Marking: [Q] verbatim from a file in research/, locator given; [P] paraphrase or handbook knowledge; [U] unverified, do not gate on it.

## 0. Procedure (ordered)

1. Sort candidate features by `earliest` ascending (oldest first).
2. A feature may fire only if `witness.year >= feature.earliest` (witness.year = composition/copy date, lower bound if range).
3. Feature region is the regional value for the feature's period, not today's. Store it as `region_at(period)`.
4. Witness region (where the text was written, e.g. Chernihiv chancery book) is a separate axis. Never equate a feature's region with the witness's region. Report both.
5. Scribal conventions override dialect: Church Slavonic norms (research/03 §CS) suppress R10/R16/R21 and any feature whose orthography is a conventional CS spelling. Flag the form `cs_scribal=true` and skip dialect claims for it.
6. Stop at the first decisive oldest feature only as a tag; features are otherwise noisy-OR combined as in detect().

## 1. Feature table (machine-friendly)

| id | feature | region (research/04 code, historical area) | earliest | monument / period | regex over old spelling (draft) | weight | source + quote + locator | caveats |
|---|---|---|---|---|---|---|---|---|
| D-OLD-R | r' > r in Kyiv-Polissian texts | KIEV-POL (CHN/MPL, historical Kyiv) | ~XI–XII [U date] | Kyiv-Polissian monuments | `р(?!['’ь])` before vowel in word-initial/medial position where modern has р' | 0.5 | [Q] «у київсько-поліських текстах r < r'» (research/03 CS note, ch. 14.5 via Shevelov) | Date not in the extracted quote; verify ch. 14.5 |
| D-IY-AFTER-VELAR | и (not ы) after k, g, x | Kyiv-Polissian scribal norm | 1125 [Q] | from 1125 per ch. 14.5 | `[кгх]ы` → counter-evidence; `[кгх]и` → supports Kyiv-Polissian | 0.3 | [Q] «(з 1125 р.) вживання и (й невживання ы) після k, g, x» (research/03 CS note, ch. 14.5) | Scribal diagnostic, not a dialect per se; conflicts with modern ZAK-Y-VELAR, which must be gated to ≥ XVI [U] |
| D-YAT-IE | ѣ > ie (monophthong e· later) in Polissia; Galicia ie → e monophthong | NORTH (CHN/MPL/WPL) vs SW | prehist.; e· > i XIII–XIV | ch. 14.3 for Polissia vs Galicia | `іе\|иê` in pre-XIV texts → north; `ě`→`і`/`і` in SW | 0.8 | [Q] Shevelov ch. 14.3 quoted in research/03 R09: «Polissia kept "іе як рефлексу ě, тимчасом як Галичина… ě > іe з подальшою монофтонгізацією…»| Date of e· > i per R09 table: XIII–XIV [P/other]; the regional split is Q |
| D-ULAN-UKANYE | unstressed о > у before stressed і/у ("укання") | MDN, STP, SLB, SW, LEM | XIV c. [P/other, research/03 note] | Middle Ukrainian | `у(?=[íý])` where std о | 0.4 | research/03 note: "Unstressed о > у ("укання", XIV c.) … tag them D" | Shared marker, low weight (research/04 §6) |
| D-LW | l > w (ў) after о/е/и | WPL, SW, Polissia relic [U region] | XIV c. onward [Q ch. 30 via research/03 R16] | Middle Ukrainian | `[ое]в\b` where pre-XIV `[ое]л` | 0.2 | research/03 R16: "l > w (ў) — XIV c. onward"; [Q, ch. 62] "l > v після о" | Region assigned in research/03 not stated [U]; do not use as regional evidence alone |
| D-R-SOFT-FINAL-POL | final р' → р (Polissia first) | NORTH (Polissia) | XIV c. [P, research/03 R19] | Polissia XIV c. | `рь#` → `р` | 0.3 | research/03 R19: "XIV c. (Polissia) → standard" [P] | Shared with standard; weak |
| D-HARD-SHSH | hardening of ж, ч, ш before ю/я | Lviv area and NE [P ch. 42] | XIV–XVI c. | Middle Ukrainian | `[жчш]ю` → `[жчш]у` | 0.2 | research/03 R18 [P ch. 42] | Standard change, not dialect; use only as dating aid |
| D-PROTH-V | prothetic в- before u (вухо) | regional [U] | XIV–XVI c. | Middle Ukrainian | `^вух\|^вулиц` | 0.2 | research/03 R21 [Q ch. 62] "протетичного приголосного десь із XVI ст." | Lexical; region not established |
| D-DUAL-LOSS | loss of dual (дві руці) | dialect remnant | XIII–XIV c. | Old Ukrainian | `руці\|очі` as non-dual | 0.1 | research/03 M05 [P/other] | Remnant forms only; weak |
| D-FUT-BUDU | буду + infinitive/-т' (Chernihiv FUT-BUDU-INF) | CHN, MDN | [U] | — | `\bбуду\s+\w+т[ьи’']?\b` | 0.5 | research/04 §1 FUT-BUDU-INF (W-EPL) | Date not in research; belongs with R12 (analytic forms) |
| D-SW-PERF | past + clitic (ходив-єм) | NDN, WPL, SW | [U] | — | research/04 SW-PERF-M | 0.5 | research/04 §1 SW-PERF-M | Date pending R12 |
| D-SW-INSTR-OW | -ов/-оў instrumental fem. | SW | [U] | — | research/04 SW-INSTR-OW | 0.6 | research/04 §1 | Date pending R12/R13 |
| D-CHN-INSTR | -ой/-ою parallelism | CHN, SLB | [U] | — | research/04 CHN-INSTR-SHORT | 0.4 | research/04 §1 | Date pending |
| D-PRON-N | з йем / до йійі (no н in oblique 3sg) | CHN, SLB-north, STP | [U] | — | research/04 CHN-PRON-NO-N | 0.5 | research/04 §1 | Date pending |

Note on the gate: rows marked [U] stay gated at 1798 (current behaviour) until verified. Rows with a [Q] or [P] date may be lowered to that date once a primary check confirms it.

## 2. Replacing the ≥1798 gate

- Keep `dialectGate` as the fallback for any feature without `earliest`.
- Add field `earliest: number | null` and `region_at: Record<period, DialectCode[]>` to each DIALECT_RULES row.
- Change the gate to `c.year === undefined || c.year >= (rule.earliest ?? 1798)`, combined with `!normative(c)` as now.
- Report two separate claims: `dialect:<code>` (linguistic, from feature) and `witness.region` (from metadata). Never write a dialect claim whose value is the witness region.

## 3. Open items [U]

- Verify D-OLD-R and D-IY-AFTER-VELAR dates in Shevelov ch. 14.5 (text is only partly online per research/03).
- Find primary dates for SW/NDN analytic forms (R12 owns them).
- Non-Ukrainian scholars listed in the brief (Lehr-Spławiński, Stieber, Kuraszkiewicz, Соболевский, Дурново) are not yet cited by any research file; no quotes were checked here. Do not use their claims until verified.
- Bevzenko 1980 and Жовтобрюх are cited only through secondary text in research/04; no claims from them are included here.

---
## Round 2 — resolved dated features (FU-23)

Source for all [Q] rows: Shevelov, «Історична фонологія української мови» (uk. transl.), izbornyk.org.ua/shevelov/shev04.htm (ch. 14, «Перехід (I) від протоукраїнської до давньоукраїнської доби») and shev08.htm («Заміть підсумків», sections «Формування діалектних груп (північної та південної)», «Диференціація в північному наріччі», «Диференціація в південно-західному наріччі», «Південно-східне наріччя», «Загальний огляд хронології постання українських діалектів»). Quotes verbatim from the cp1251-decoded page text. Locator = page + section title (pages have no stable anchors).

Updates to round-1 rows:
- D-OLD-R: now [Q] but period-dated: shev04 «Типові ознаки давньоукраїнських текстів»: «у київсько-поліських текстах r < r’». shev08 (north/south): r' hardening in the north «ще в XI ст.» ([Q] «ствердіння r’ (повторення в XV-XVI ст. звукозміни, яка на півночі відбулася ще в XI ст.»). Set earliest = 1050 (north); south see D-R-HARD-SW.
- D-IY-AFTER-VELAR: [Q] date confirmed, shev04 same section: «протягом майже століття (з 1125 р.) вживання и (й невживання ы) після k, g, x (на російських землях ця ознака також постала, але щойно з середини XIII ст.)». Old-Ukrainian vs Old-Russian discriminator for c.1125–1225, not a modern-dialect rule. earliest = 1125.
- D-YAT-IE: [Q] shev04: «Полісся характеризувалося … збереженням іе як рефлексу ě, тимчасом як Галичина … ě > іe з подальшою монофтонгізацією, датованою ще доісторичними часами»; shev08: the south monophthongised «ще за доісторичних часів», the north keeps the diphthong. The split predates writing, so it is a region tag for any dated text.
- D-ULAN-UKANYE: [Q] shev08 Hutsul section: «поява укання (ще одна зміна, датована XIV ст.)»; Volhynia: «Укання мусило прийти з півдня в XVI ст.» (region-specific: SW XIV c., Volhynia XVI c.).
- D-PROTH-V: [Q] shev08 Hutsul: «постання протетичних приголосних (XIV ст.»; W. Polissia: «протетичного v … ще з XV ст., хоча функцію протетичного приголосного десь із XVI ст. почав виконувати також звук h»; Volhynia: «протетичного h перед о-, відоме з XVI ст.». Earliest v = XIV (SW), h = XVI.
- D-LW: [Q] shev08: south l-rounding after о «в середині XVII ст.», north «двомастами роками» earlier (c. mid-XV c., derived [P]).

New [Q] dated rows

| id | feature | region_at | earliest | weight | quote + locator | caveats |
|---|---|---|---|---|---|---|
| D-KYGY-N | ky, gy, xy > k'i, g'i, x'i | north (Kyiv-Polissian) | early historical, pre-XII [no year] | 0.5 | shev08 «Формування діалектних груп»: «На початку історичної доби в північних діалектах мала місце зміна сполук ky, gy, xy на k’i, g’i, х’і» | no year |
| D-KYGY-S | same change in south | Galicia-Podillia | end XIII c. | 0.4 | same: «натомість на півдні аналогічний процес відбувся приблизно двома з половиною сторіччями пізніше, тобто наприкінці XIII ст.» | Boiko/Lemko/Hutsul keep ы after velars (shev08 Boiko: «зберегли вимову у після велярних») |
| D-LUDEJ | gen.pl. -ej / -uj (людей / людуй); соловей / соловій | Kyiv-Polissian vs Galician-Podillian | c.1050–1150 (jer fall) | 0.4 | shev08: «(київ.-поліс, люде́й проти гал.-под. люду́й) та … соловей проти гал.-под. соловій» | no monument date |
| D-ZOLOBA | золоба vs зълоба | Kyiv only vs Galicia-Podillia | before jer fall | 0.3 | shev04: «тільки в Києві до занепаду єрів — золоба проти давн. рос. (і гал.-под.) зълоба» | single word |
| D-ZHCH | жч < zdj, zgj | Old Ukr. | earliest texts | 0.3 | shev04 list of «Типові ознаки давньоукраїнських текстів» | not intra-Ukrainian |
| D-NEWYAT | «новий ять» for е before weak ь syllable | Old Ukr. | 1164 | 0.3 | shev04: «З 1164 р. типовою прикметою давньоукраїнських текстів стає вживання "нового ятя" на місці е перед складом із занепалим ь» | rare in Old Russian |
| D-VY-I | vъ- confused with и- | Old Ukr. (also Pskov, N. Belarus) | earliest texts | 0.2 | shev04: «поплутання vъ- з и- перед приголосним на початку слова» | not Ukrainian-specific |
| D-MONOPH-N | monophthongisation of northern diphthongs | Polissia | first decades XV c. | 0.4 | shev08: «розпочався з перших десятиріч XV ст., коли відбулася монофтонгізація дифтонгів» | |
| D-UNSTR-A | а/м for unstressed о | south | end XV c. | 0.3 | shev08: «десь із кінця XV ст., коли засвідчено перші випадки вживання а та м на місці ненаголошеного о» | |
| D-A-SOFT | а > е/и/і after soft cons. (шапка > шіпка) | SW (Galicia-Bukovyna; not Hutsul) | XV c. | 0.4 | shev08: «зміщення вперед і вгору артикуляції а після м’яких приголосних … зафіксоване з XV ст. (але не на Гуцульщині)» | |
| D-HARD-PAL | hardening of mid-palatals; r' hardening in Volhynia | other dialects XV-XVI; Volhynia r' XV c. | XV c. | 0.3 | shev08: «Ствердіння середньопіднебінних в інших діалектах відбулося в XV-XVI ст.»; «Ствердіння r’, розпочавшися на Волині в XV ст.» | |
| D-R-HARD-SW | r' hardening in south | SW > SE | XV-XVI c. (soft until c.1600) | 0.3 | shev08: «у південно-західному приблизно до 1600 р. зберігав м’якість» | |
| D-DEVOICE-SW | devoicing of final/pre-voiceless consonants | Volhynia/SW | XV c. | 0.4 | shev08: «знеголошення дзвінких приголосних — у XV ст.» | |
| D-O-I | о : і alternation in closed syllable | Volhynia, Podillia, SE | XVI-XVII c. | 0.5 | shev08: «чергування о з і, яке поширилося в XVI-XVII ст.»; SE: «Вони обидва датуються XVI-XVII ст.» | |

Dialect-group formation chronology ([Q] shev08 «Загальний огляд хронології постання українських діалектів»), for gating `region_at`:
- Nadsnistrian, Nadsianian, Lemko, Boiko: «Існування наддністрянських, надсянських, лемківських і бойківських говірок простежується від XIII ст.»
- W. Polissian, Bukovyna-Pokuttia, Hutsul: «Імовірним часом постання … є XIV ст.»
- Volhynian: «Ознаки волинських говірок починають оприявнюватися з XV ст., закарпатських — до початку XVI ст., подільських — щойно в XVI ст.»
- Rest of north: «діалектна диференціація ледве чи могла статися раніше, ніж у XVI ст.»; E./Mid-Polissia «щойно починаючи з XVI ст.»; «до XIII-XIV ст. у північноукраїнському наріччі жодних проявів диференціації не було».
- South-east: «формування … припадає головно на XVI -XVII ст.»; «до того часу в них не відбувалося жодних власних звукозмін».
- Old-period labels: Shevelov renames north/south «київсько-поліські та галицько-подільські» (fn. 3, same section).

Gate implication: for texts before c.1250 emit only the two-valued Kyiv-Polissian vs Galician-Podillian region; the nine SW subgroups only from the dates above; SE (Slobozhan, Steppe, Middle Dnieper) only from XVI-XVII c. Replace the ≥1798 default with per-feature `earliest` and per-group `from`.

Caveat ([Q] shev04 fn. 13): «жодний текст не виявляє всіх цих рис систематично. Зазвичай вони виступають як відхилення від традиційного правопису (тобто змодифікованого церковнослов’янського)» — absence of a feature is not evidence; the CS-scribal flag (§0.5) stands.

ЕУМ [Q]: um159.htm ПІВДЕННО-ЗАХІДНЕ НАРІЧЧЯ: «Складна історія людності пд.-зх. регіону України від доби Київ. Русі до серед. 20 ст. … зумовила значну діал. диференціацію цього наріччя»; um158.htm НАРІЧЧЯ: three-way division proposed by К. Михальчук 1872. No ЕУМ entries «Історична діалектологія» or «Діалектна основа»: fetched http://litopys.org.ua/ukrmova/um.htm, links matching ДІАЛЕКТ/ІСТОРИЧН/ОСНОВ checked, not found.

shev05/06/07 (history, literary language chapters): grep for «засвідчен», «з XI-XIV», «перші випадки», «уперше», «датується» found only historical/chancery dating, no further dialect-feature attestations.

Remaining [U]: Дурново, Соболевський, Lehr-Spławiński, Stieber, Kuraszkiewicz, Бевзенко, Жовтобрюх not fetched; D-FUT-BUDU, D-SW-PERF, D-SW-INSTR-OW, D-CHN-INSTR, D-PRON-N await FU-12 dates.

### Round 2 log (fetched)
- http://izbornyk.org.ua/shevelov/shev04.htm, shev05.htm, shev06.htm, shev07.htm, shev08.htm (all OK, cp1251)
- http://litopys.org.ua/ukrmova/um.htm, um158.htm, um159.htm, um161.htm (all OK)
