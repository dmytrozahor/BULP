# Galician (Желехівка) witnesses and common-word linking (SPEC 63 GZ)

User, 2026-10-14, screenshot Франко «Мойсей» (Львів 1905): «Поліпши і тут розпізнаванням». Code: `core/gz-light.ts`, `core/zhel-folds.ts`, `pipelines/build.ts`; tests: `tests/gz.test.ts`.

## GZ-1 root cause (measured)

Method: for every text shard (`public/data/texts/*.json`, 988 770 tokens, all admitted witnesses) a token counts as an **unlinked VESUM-form token** when it has no ref (`n:`/`o:`/`l:`/`a:`/`w:`), the lexicon search index (`lexicon.json`, form/paradigm/lemma keys, the same index the reader's `annotate()` uses) does not contain its key, and `dict_corp_vis.txt` lists the key as a form.

- **Before: 732** such tokens (kobzar1876 140, nechuy1879 108, franko1906 66, franko1903 54, franko1902 52, chaichenko1893 39, franko1893 35, lesya1899 24, franko1905 8). Examples: матері 114, матір 85, разу 79, разів 45, ножем 25, кількох 20, чим 19, червоне 14.
- **Cause: FX-3 («one lemma = one POS class», `pipelines/build.ts`).** Where the same lemma id was linked in several POS classes (noun *мати* «матері» vs verb *мати*; noun *раз* «разу, разів» vs adverb *раз*; noun *ніж* «ножем» vs conjunction *ніж*; *кілька*, *чим*), the class with most tokens wins and the other class's token types are set to «unresolved» (`dropped`: 747 types). A dropped type is correctly not a strict link of the kept card, but it also received **no light-card reference**, so the reader showed a bare word although VESUM lists it. KEEP_MIN_F was *not* the cause for these (the PV-6 light index already covers lemmas dropped by frequency); capitalisation (`key()` lowercases), the tokeniser and the text-shard ref column were checked and are fine; the POS gate only concerns non-`uk` witnesses.
- **Not a bug, user's examples:** *залізних* and *сусідів* are linked (paradigm of залізний, сусід; `via: paradigm`). *пізних*, *роздорожу*, *кровою* are **not** VESUM forms (`пізній` has *пізніх*; *роздоріжжя*; *кров'ю*): they stay unlinked until a cited fold or a dictionary claim exists (see «refused»).
- **Fix** (`core/gz-light.ts`, called from `build.ts` after the PV-6 light index): every unresolved token of a `uk` witness whose own spelling is a VESUM form references a light card `/lw/:lemma` (VESUM lemma + tags, count, first example; unflagged common noun preferred to a proper name). Strict link counts are unchanged by this step; the raw spelling is now always in the single VESUM pass. Old Cyrillic witnesses are excluded (a modern homograph is no evidence there).
- **After: 18** (target 0 not reached). All 18 are tokens the build did link to a kept lemma whose card paradigm lacks the spelling: *моему* 9, *украіна* 3, *ів* 3, *украіно* 2, *мол* 1 (kulish1882 7, eneida 6, nechuy1879 3, kulish1862 1, sophia-3150 1). Left open; they need a form-level rather than a lemma-level ref.

## GZ-2 folds (cited; era `желехівка`; `core/zhel-folds.ts`)

Source: uk.wikipedia «Желехівка» (text agrees with ЕУМ um17; the ЕУМ host had a certificate error on 2026-10-15, so the page was read via Wikipedia). All folds branch; VESUM decides.

| fold | statement quoted | effect |
|---|---|---|
| ORTH-ZHEL-SOFT | «За допомогою ь відбито м'якість: сьміх, сьвято, сьвіт, цьвях, цьвіркати, зьвір» | сьв/зьв/цьв/сьм → св/зв/цв/см |
| ORTH-ZHEL-SKY | «Прикметникових суфіксів -ський, -цький не пом'якшувано: україньский, нїмецкий» | -ский/-цкий and inflections → -ський/-цький (Беднарского → Беднарського) |
| ORTH-ZHEL-INIT-I | «буква и на початку слова читалась як [і]» | initial и → і |
| ORTH-ZHEL-JE | «писано закінчення є відповідно до наддніпрянського я: зїлє, житє, знанє» | final -є → -я, geminate after a soft consonant (знанє → знання, житє → життя) |

Existing: ORTH-ZHEL-TY / ORTH-ZHEL-TE (ї, є after dentals), ORTH-SYA, ORTH-KUL-JER.

### Refused (no source, no rule)

- сьв is cited, **дзь** is not mentioned in the source: no fold written for дзь itself (дзьвін → дзвін happens only through the cited зьв).
- **-ою → -'ю** (любовою → любов'ю, кровою → кров'ю): the source does not mention instrumental endings.
- **е/і** (трівожу → тривожу) and **и/і** (бистро- → швидко-): no statement; a lexical substitution would be a dictionary claim and no dictionary was read.
- **participles -уч-** (будущим → майбутнім): not in the source; lexical claim only with a dictionary.
- *дзь*, *ь before other vowels*: the source covers ьо and labials only.

## GZ-3 link % of Galician 1880–1914 witnesses (strict VESUM link; `tokens linked` before → after this change)

Before = `public/data/corpus.json` at HEAD before GZ; after = rebuilt data. «Covered» = linked + `l:`/`a:` refs in the text shard; it is an upper bound (a ref is also stored on some tokens the lexicon links, so it can exceed 100% and is then shown as n/a).

| witness | orth | tokens | linked before | linked after | light refs | archaic refs | covered after |
|---|---|---|---|---|---|---|---|
| boa1884 | максимовичівка | 26196 | 21065 (80.4%) | 21065 (80.4%) | 1406 | 223 | 22694 (86.6%) |
| chaichenko1893 | желехівка | 31972 | 30256 (94.6%) | 30552 (95.6%) | 1337 | 7 | 31896 (99.8%) |
| franko1893 | желехівка | 36521 | 33631 (92.1%) | 33658 (92.2%) | 1893 | 74 | 35625 (97.5%) |
| lesya1899 | желехівка | 18341 | 17567 (95.8%) | 17679 (96.4%) | 899 | 9 | n/a |
| franko1902 | желехівка | 25278 | 23427 (92.7%) | 23580 (93.3%) | 1616 | 60 | 25256 (99.9%) |
| franko1903 | желехівка | 28878 | 26960 (93.4%) | 27111 (93.9%) | 1953 | 32 | n/a |
| franko1905 «Мойсей» | желехівка | 7656 | 7153 (93.4%) | 7218 (94.3%) | 441 | 1 | n/a |
| franko1906 | желехівка | 31416 | 29266 (93.2%) | 29485 (93.9%) | 2099 | 51 | n/a |

(The ref is only drawn when the lexicon has no lemma, `rowRef`.) The strict gain (+0.1 … +1.0 pt) comes from the four cited folds. Franko «Мойсей»: 65 more strict links; 8 VESUM-form tokens that had no card now have one.

## GZ-4 / GZ-5

- GZ-4: `/lw/:lemma` no longer says «рідкісна»; it says «Мало засвідчена в нашому корпусі (f = n)» and shows the ikavism chain (`IkavismChain`) when a relative with о/е in the same stem proves the alternation (покірність ~ покора), `src/lib/lightcard.ts`.
- GZ-5: cognate rows are split (`core/cognates.ts` `otherWord`): a Wiktionary-marked borrowing (`b`) or a row whose own etymology says «Borrowed from» / «Doublet of» and whose first gloss shares no content word with the Proto-Slavic gloss (`o`, with the gloss) is listed under «Споріднені за етимоном, інше слово», never as a correspondence, and never feeds the ET-3 flag. князь: be/ru *ксёндз* (borrowed) and pl *ksiądz* («Christian priest», doublet of kniaź) moved. Limit: pl *xiądz* has no gloss in the filtered Polish extract and stays among the correspondences; Old Polish *ksiądz* (senses «prince», «priest») stays (same word then).
