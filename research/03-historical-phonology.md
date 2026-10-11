# 03 — Historical phonology: ordered rules, Old Rus'/Old Ukrainian → modern Ukrainian

Scope: an ordered, implementable rule set for deriving modern standard Ukrainian forms from Old Kyivan (Old Rus') and Middle Ukrainian (Ruthenian) spellings. Each rule carries a dating and a provenance note following G. Y. Shevelov.

## 0. Sources and citation conventions

- **HP79**: Shevelov, *A Historical Phonology of the Ukrainian Language*, Heidelberg: Winter, 1979.
- **IF02**: Шевельов, *Історична фонологія української мови*, пер. С. Вакуленка та А. Даниленка, Харків: Акта, 2002. Online at `http://izbornyk.org.ua/shevelov/shev.htm` (cp1251; plain HTTP only, because HTTPS redirects back to HTTP).
  - izbornyk hosts **only** the front matter, ch. 1, the four "transition" chapters and the conclusion: ch. 14 (`shev04.htm`), ch. 29 (`shev05.htm`), ch. 43 (`shev06.htm`), ch. 57 (`shev07.htm`) and ch. 62 (`shev08.htm`). The body chapters (16 "Занепад єрів", 25 "Спірантизація g", 32, 34 and so on) are **not online**. Where I cite them, the citation is the chapter or section number exactly as Shevelov cross-references it from chapters 14, 29 or 62.
  - The HTML has **no page numbers**, so citations give chapter.section, which is identical in HP79 and IF02.
- Marking: **[Q]** means a verbatim quote from IF02, copied from izbornyk on 2026-10-11. **[P]** means my paraphrase or standard handbook knowledge, attributed to the chapter whose title covers it. **[P/other]** means the point is not from Shevelov (morphology, which HP79 mostly does not cover); confirm it against Безпалько et al., *Історична граматика укр. мови*, or Жовтобрюх.

### Shevelov's periodization (used for the `date` column)

| Period (IF02 term) | Span |
|---|---|
| протоукраїнська | VII–XI c. ("від VII до XI ст.", ch. 14.1 [Q]) |
| давньоукраїнська | mid-XI to XIV c. ("історичний період … починається … з середини XI ст.", ch. 14.1 [Q]) |
| ранньосередньоукраїнська | XV to mid-XVI c. |
| середньоукраїнська | mid-XVI to XVIII c. |
| новітня | XIX c. onward |

Key verbatim anchors:
- [Q, ch. 62] "…була вивершена занепадом єрів у 1050-1150 рр. (див. 8.1; 16.1)"
- [Q, ch. 62] On the post-jer "adjustment" period: "Тривав він від середини XII ст. до початку XV ст. (у північноукраїнських діалектах) чи до його кінця (у південноукраїнських діалектах)".
- [Q, ch. 62] "Модифікації скупчень приголосних засвідчені з початку XIV ст.; скупчення з новопосталим j усунено в XV ст. (див. 37.1)".

---

## 1. Stage N: orthographic normalization (applied first, no phonology)

Normalize to a canonical **Old-Kyivan spelling**, but **keep ѣ ъ ь ы ѧ ѥ**: these letters carry the historical information the later rules need. Do NFD first, then strip combining marks.

| id | from (regex) | to | note |
|---|---|---|---|
| N01 | `[҃-҇҈҉̀́̑̆꙯-꙽]` | `` | titlo ҃ (U+0483), psili/dasia ҆ ҅, kamora, accents. **Run N10 (titlo expansion) BEFORE N01.** |
| N02 | `[ⷠ-ⷿꙴ-ꙻꚞꚟ]` | base letter | superscript letters (ⷠ б, ⷣ д, ⷦ к, ⷧ л, ⷨ м, ⷩ н, ⷪ о, ⷬ р, ⷭ с, ⷮ т, ⷯ х, ⷱ ч, ⷲ ш…). Insert the letter in place: `днⷭ҇ь → днсь`. |
| N03 | `[ѡѽѻꙩꙫꙭꚙꚛ]` | `о` | omega variants. ѿ → `от` (separate rule, before this one). |
| N04 | `оу\|ѹ\|ꙋ\|ᲂу` | `у` | the digraph ou |
| N05 | `ꙑ\|ъі\|ъı\|ъи\|ꙑи` | `ы` | yery variants (keep `ы` for R10) |
| N06 | `[іїı](?=…)` | `и` | Old Rus' і/ı = и. Keep a flag `i_dec=true` so the modern initial І- can be restored (R11). |
| N07 | `ꙗ\|ѩ` | `ѧ` | iotated a → ѧ (both give я later). `ѭ`→`ю`; `ѫ`, `ꙛ`→`ѫ` |
| N08 | `ѳ`→`ф`; `ѯ`→`кс`; `ѱ`→`пс`; `[ѕꙃꙅ]`→`з`; `ꙁ`→`з`; `ѵ` → `в` after а/е, else `и`; `ꙇ`→`и`; `ꙉ`→`ђ`→`дж` | | Greek letters. Vernacular names often take т for ѳ (Ѳедоръ → Федір / dial. Хведір, Тодор). That is lexical, not a rule. |
| N09 | `ѥ`→`є` *(only at the very end)*, `ꙓ`→`ѣ` | | keep ѥ until R13 has run |
| N10 | titlo expansion (table §5) | | dictionary lookup on the stem plus a flexible ending |
| N11 | `҂?[а-ѵ]҃` standalone | NUMERAL | Cyrillic numerals: skip, do not derive |
| N12 | `ъ$` after a consonant in **Middle Ukrainian** (post-1400) texts | keep, but mark `jer_graphic=true` | after ~1400 a final ъ is purely graphic, as is the Euthymian `ь` for `ъ` (ch. 29.4: "ь наприкінці слова … незалежно від його етимології та вимови (такь 'такий', връхь 'верх')" [Q]) |

---

## 2. Stage R: ordered sound-change rules (machine table)

Notation: `C` consonant, `V` vowel, `J` = `ъ|ь`. `W` = weak jer (Havlík, R04), `S` = strong jer. `#` word boundary. `'` = softness of the preceding consonant. Order = the order of application. `scope`: G = general (apply automatically); L = lexical (apply only if confirmed by the modern dictionary or ULIF); D = dialectal (no output in the standard; emit as a variant).

| # | id | name | date (Shevelov) | input → output (orthographic) | conditions | examples | scope | cite |
|---|---|---|---|---|---|---|---|---|
| 1 | R01 | Pleophony (detector) | prehist. (VIII–IX c.) | `CraC/CrěC/ClaC/CléC` (CS) ↔ `CoroC/CereC/ColoC` (EastSl.) | no transform; flags a CS form (§4) | градъ/городъ, млѣко/молоко, брѣгъ/берегъ | detector | ch. 6 "Метатеза плинних і повноголос" [P] |
| 2 | R02 | Denasalization | prehist. (X c.) | `ѧ`→`я`, `ѫ`→`у`, `ѭ`→`ю` | after a labial: `я` → `'я` (apostrophe); after ж ч ш (and ц, see R18) `я`→`а` | мѧсо→м'ясо, пѧть→п'ять, рѫка→рука, чѧсъ→час | G | ch. 8 "Деназалізація носових голосних"; ch. 14.2: "злиття ę з а, oн з u" [Q] |
| 3 | R03 | Velar + ы | N: beg. of hist. period; S: end XIII c. | `([кгх])ы`→`$1и` | everywhere | кыѥвъ→Київ, кысѣлъ→кисіль, хытрыи→хитрий | G | [Q, ch. 62] "у північних діалектах мала місце зміна сполук ky, gy, xy на k'i, g'i, х'і; натомість на півдні … наприкінці XIII ст. (див. 15.4)" |
| 4 | R04 | Jer fall (Havlík's law) | 1050–1150 | parse jers right→left: word-final J = W; J before a syllable with a full vowel = W; J before a syllable with W = S. W→∅ (`ь`W after a dental/л/н/р → keep softness as `ь`); S `ъ`→`о`, S `ь`→`е` | do **not** apply to ъ/ь before `и/ѥ/ю/ѧ` (R05); CJrC/CJlC → R06 | сънъ→сон, дьнь→день, отьць→отець, шьвьць→швець, кънѧзь→князь, вьсь→весь | G | [Q, ch. 62] "Її першим виразним проявом був занепад єрів (бл. 1050—1150 рр.)"; ch. 16 [P] |
| 5 | R05 | Tense jers (ы, и, ъ, ь + j) | XI–XII c. | `ыи#`→`ий`, `ии#`→`ій`, `ьи`→`ий/ій`, `ьѥ`/`ьѧ` → see R13; gen. pl. `-ии`→`-ей` (Kyiv-Polissian) / `-ій` (Gal.-Podol.) | adjective/pronoun endings; ъ/ь before j ≠ ordinary weak jer | добрыи→добрий, синии→синій, шьꙗ→шия, мыю→мию, людии→людей | G | ch. 17 "Еволюція у, і, ъ та ь в позиції поряд із j"; [Q, ch. 62] "розбіжностей у передачі звукосполуки -iji в закінченні ґен. мн. (київ.-поліс. людéй проти гал.-под. людúй)" |
| 6 | R06 | CъrC / CьrC / CъlC | XII c. | `CъrC`→`CорC`, `CьrC`→`CерC`, `CъlC`→`CолC` (then → `ов` by R16) | ignore whether the jer is W or S; CS spelling `CrъC` (кръвь) = CS/Bulg. marker | търгъ→торг, вьрхъ→верх, смьрть→смерть, вълкъ→волк→вовк | G | ch. 18 "Еволюція єрів перед сонантом між двома приголосними (сполуки CъSC, CьSC)" [P]; ch. 14.4: "написання СъrС" adapted locally [Q] |
| 7 | R07 | Epenthesis in final clusters | XIII–XVIII c. | `C[рлн]#` (after W loss) → `Cер/Cол/Cон` etc., by analogy with the o,e:∅ alternation | only where the modern form confirms it | вѣтръ→вітер, огнь→огонь, вѣпрь→вепр | L | [Q, ch. 62] "вставні голосні е та о поширилися… (давн. укр. ogn'ь > суч. укр. огóнь — див. 35.6)" |
| 8 | R08 | No final devoicing | — (constant) | none: keep `б д з ж г` before # | do not devoice | дубъ→дуб, возъ→віз, ножь→ніж | G (no-op) | ch. 23.6; [Q, ch. 62] "приголосні в позиції наприкінці слова чи складу зберігали дзвінкість… (besреčьnъ > bezpečnyj)" |
| 9 | R09 | ѣ reflex | ě > e· (S) / ie (N): prehist.; e· > i: XIII–XIV c. | `ѣ`→`і`; `#ѣ` and `Vѣ` → `ї` | standard = southern; northern ie and Transcarpathian/Lemko i/e/y are D | видѣти→видіти, вѣра→віра, хлѣбъ→хліб, ѣсти→їсти, рѣка→ріка | G | ch. 13 "Потрактування ě"; ch. 32 "Просунення вперед е· з перетворенням його на і" [P]; [Q, ch. 14.3] Polissia kept "іе як рефлексу ě, тимчасом як Галичина… ě > іe з подальшою монофтонгізацією… що в її висліді постав голосний е·" |
| 10 | R10 | New ikavism (о, е in newly closed syllables) | after the jer fall: "новий ять" from the XII–XIII c. in writing; e·>i and o·>u·>ü>i finished by the XVI–XVII c. | `е` in σ followed by σ with **W** → `і` (written `ѣ` in Middle Ukrainian, the "новий ять"); `о` → `і` (intermediate o· > u· > ü > i; spellings `у`, `ô`, `ѡ`, `ꙋ` in Middle Ukrainian) | (a) only **etymological** о/е, never о/е < jer (сънъ→сон, дьнь→день); (b) not the **2nd vowel of pleophony** (городъ→город, ворогъ→ворог, берегъ→берег, морозъ→мороз); (c) not if the jer was S; (d) paradigm levelling is lexical; (e) е before a hard W ъ → western і / eastern е (медъ→мед, тетъка→тітка) | конь→кінь, печь→піч, столъ→стіл, ночь→ніч, камень→камінь, мостъ→міст, шесть→шість | G + exceptions list | ch. 20 "так званий новий ять", ch. 21–22, 33, 45, 59; [Q, ch. 62] "Буковина першою зініціювала… звуження е та о в новозакритих складах після занепаду єрів (še·st', sto·l > šíst', stu·l)" |
| 11 | R11 | Merger и/ы → и [ɪ] | XIII–XIV c. (from Bukovyna) | `ы`→`и`; old `и` → `и`; `#и`→`і` (Іван, іскра, ім'я) | old и after a hardened consonant → [ɪ]; the і of modern Ukrainian comes only from R09, R10, R12 or from the initial position | быти→бути (see R14), сынъ→син, рыба→риба, видѣти→видіти, искра→іскра | G | ch. 28/31 "Злиття і та у"; [Q, ch. 62] "Результатом злиття і та у на півдні був звук у, а на півночі — передніший звук у"; "Буковина першою зініціювала… злиття і та у (і > у, потім у > у·: milo, mylo > my·lo)" |
| 12 | R12 | ji and і after vowels | Old Ukr. → Middle Ukr. | `ѥ` in a newly closed σ (before W) → `ї`; `[аоуеи]и` (old ji) → `ї` | iotation preserved | кыѥвъ→Київ, моѥи→моєї, ѥмоу→йому (lexical), ѣхати→їхати | G | ch. 9, 10, 17 [P] |
| 13 | R13 | C + j clusters: gemination and -ье > -я | -ьje > -ьja: Old Ukr. (ch. 24); gemination: XV c. | `Cьѥ#`/`Cьѧ#`/`Cье#` → `CCя` (neuter); `Cьи`/`Cьѧ` in other cases → `CCі`/`CCя`; labials → `C'я` (no gemination); `рь`+j → `р'я` | the jer here is tense; dentals, sibilants, л and н geminate | житьѥ→життя, зельѥ→зілля, весельѥ→весілля, судьѧ→суддя, здоровьѥ→здоров'я, пьрьѥ→пір'я | G | ch. 24 "перехід е в а у звукосполуці ije ~ ьje"; ch. 37; [Q, ch. 62] "скупчення з новопосталим j усунено в XV ст. (див. 37.1)" |
| 14 | R14 | Special ы after labials (бути type) | Middle Ukr. | `быти`→`бути`, `былъ`→`був` | lexical (labial rounding) | быти→бути, былъ→був | L | ch. 54 "Діалектна асимілятивна лабіалізація неогублених голосних" [P] |
| 15 | R15 | Hardening of labials (final / before C) | Old Ukr. (XIII c.) | `([бпвмф])ь(#\|C)` → `$1$2` | — | кровь→кров, любовь→любов, семь→сім, голубь→голуб | G | ch. 26 "Ствердіння губних у позиції перед приголосним та наприкінці слова"; [Q, ch. 62] "ствердіння губних наприкінці складу (див. 26.3)" |
| 16 | R16 | l > w (ў) | XIV c. onward | after o/е/и: `[ое]л(C\|#)` → `ов`; l-participle `-лъ#` → `-в` (masc. sg.); `ъл`→`ов` | not before a vowel (ходила); сълнце → сонце (cluster simplification) | ходилъ→ходив, вълкъ→вовк, жълтыи→жовтий, пълнъ→повний, шьлъ→шов | G | ch. 30 "Огублення l"; [Q, ch. 62] "l > v після о (див. 30.1)" |
| 17 | R17 | е > о after ж ш ч й (before a hard C) | XII–XIII c. | `([жчшй])е(?=[hard C])` → `$1о` | very lexical (честь, жена stay as they are) | чьрнъ→чорний, шестыи→шостий, пьшено→пшоно, жьлтъ→жовтий | L | ch. 14.2 "пьшоно проти пьшєниця" [Q]; ch. 51 ("Новий о < е після зубних") for the later dental type [P] |
| 18 | R18 | Hardening of ж ч ш (and ц partly) | XIV–XVI c. | `([жчшщ])ю`→`$1у`, `([жчш])ѧ/я`→`$1а`, `([жчш])ь#`→`$1` (except 2sg imperative and verbs -ишь→-иш) | ць stays soft (отець, вулиця) | чюдо→чудо, жѧль→жаль, ножь→ніж, мужь→муж | G | ch. 42 "Ствердіння середньопіднебінних" (Lviv area and NE, ch. 62 [Q]) [P] |
| 19 | R19 | Hardening of final r' | XIV c. (Polissia) → standard; second hardening XVII c. | `рь#`→`р`, `рь(C)`→`р` | inflected forms keep р' (царя, царю) | царь→цар, звѣрь→звір, косарь→косар | G | ch. 12; ch. 49 "Друге ствердіння r'" [P] |
| 20 | R20 | Spirantization g > γ > h | Old Ukr. (XII–XIII c.) | orthography unchanged (`г`); g in loanwords → `ґ` (from the XVI c.) | the modern letter г = /ɦ/; kg > ґ | гора, богъ→бог, нога; loan ґанокъ→ґанок | G (no-op) + pronunciation tag | ch. 25 "Спірантизація g"; [Q, ch. 62] "перетворення зімкненого g на щілинний h (див. 25.6)"; "Наявність звука γ у тюркських мовах могла викопати роль каталізатора при переході g > у (> h)" |
| 21 | R21 | Prothetic в / г | XIV–XVI c.; "h … десь із XVI ст." | `#у`→`ву`; `#о`→`во`/`ві` (with R10), `#о`→`го` (rare) | lexical; the standard has око, озеро, острів, but вухо, вулиця, вісім, гострий | ухо→вухо, улица→вулиця, осмь→вісім, окно→вікно, острыи→гострий | L | ch. 34 "Протетичні приголосні"; [Q, ch. 62] "протетичного приголосного десь із XVI ст. почав виконувати також звук h" |
| 22 | R22 | dj > ž; дж in verb alternation | prehist. ž; дж in -джу from the XV–XVI c. | `хожю`→`ходжу`, `сажю`→`саджу` (1sg of д-stem verbs and their participles) | the old ž stays in nouns: межа, чужий, одежа | хожю→ходжу, вожю→воджу, чюжии→чужий | L/G | ch. 48 "Нові приголосні звуки g, дз та f, розповсюдження звука дж" [P] |
| 23 | R23 | Adjective contraction | XIV–XVI c. | `-аѧ#`→`-а`, `-оѥ/-ое#`→`-е`, `-ую#`→`-у`, `-ыѧ`→`-і` | long forms of adjectives | добраѧ→добра, доброѥ→добре | G | ch. 53 "Усічення та стягнення" [P] |
| 24 | R24 | Second-palatalization alternations kept | — | keep `ц з с` + `ѣ`→`і` in dat./loc. (руцѣ→руці, нозѣ→нозі) | Ukrainian keeps them (Russian levels them) | руцѣ→руці, нозѣ→нозі, мусѣ→мусі | G | ch. 50, 60 [P] |
| 25 | M01 | 3sg present | morph. | `-етъ/-еть#` → `-е` (1st conj.); `-ить#` → `-ить` (2nd conj. keeps -ть) | standard Ukrainian | несеть→несе, пишеть→пише, ходить→ходить | G | [P/other] |
| 26 | M02 | Infinitive | — | `-ти#` → `-ти` (keep); `-чи` stays (печи→пекти is lexical) | -ть is Russian/Belarusian or colloquial | видѣти→видіти, писати→писати | G | [P/other] |
| 27 | M03 | Dat. sg. -ові | Old Ukr. → Middle Ukr. | `-ови#`→`-ові`; also -у | masc. o-/u-stems | сынови→синові, Петрови→Петрові | G | [P/other]; "‑ovi" is cited as a dialect marker in ch. 62 [Q: "роду (замість -ovy)"] |
| 28 | M04 | Vocative retained | — | keep: `-е`, `-о`, `-у`, `-ю` | — | отьче→отче, боже, брате, сыну→сину | G (no-op) | [P/other] |
| 29 | M05 | Loss of the dual | XIII–XIV c. | `-а/-ѣ` dual + 2 → modern plural (with remnants: дві руці (dial.), очима, плечима) | numerals 2–4 keep the old dual stress | двѣ руцѣ→дві руки, очима | L | [P/other] |
| 30 | M06 | Participles -ущ- → -уч- | — | vernacular `-уч-/-юч-`; `-ущ/-ющ/-ящ` = CS | see §4 | горѧчии→гарячий, летѧщии (CS) | detector | [P] |

Unstressed о > у ("укання", XIV c.) and the а > е umlaut (ch. 41) are dialectal: tag them D and do not apply them.

### 2.1 Worked derivations

- `видѣти` → R09 `видіти` → R11 (и stays и) → **видіти**.
- `конь` → R04 (ь is W, kept as softness) → R10 о → і in the newly closed σ → **кінь**. Intermediate stages: кôнь → кüнь → кінь. North: куoнь.
- `кыѥвъ` → R03 `киѥвъ` → R04 → R12 ѥ → ї in the closed σ → **Київ**.
- `ходилъ` → R04 → R16 → **ходив**.
- `городъ` → R04 → R10 is blocked (exception b) → **город**.
- `свѣща` → §4 marks it CS (щ < tj); the vernacular doublet is `свѣча` → R09 → **свіча**.

### 2.2 Implementation notes

1. Run N01–N12, then R02–R24 in order, then M01–M06. R01 and M06 only annotate.
2. R04 needs a syllabifier: build the vowel set `[аеиоуыѣѧѫюяєѥъь]` and scan right to left, toggling weak/strong.
3. Because of the lexical rules (L), generate **candidates** and rank them against the modern lexicon (СУМ/ULIF/VESUM). Keep the rule trace (ids) for the provenance explanation.
4. Middle Ukrainian spellings already reflect changes: `ѣ` for new і (печь → пѣчь), `ы` for и, `ꙋ/у/ô` for o·. Detect them and mark the corresponding rule as "attested in source".

---

## 3. Exception lists (seed)

- **R10 blocked (pleophony, 2nd vowel)**: город, голод, холод, ворог, мороз, берег, сторож, порох, полон. In verbs berег → беріг is a separate past-tense form.
- **R10 blocked (vowel from a jer)**: сон, день, пень, лоб (лъбъ), рот (ръть), мох (мъхъ).
- **R10 levelled**: кінь/коня (alternation kept); говорю (no closed syllable); роки vs рік.

## 4. Church Slavonic vs vernacular markers (CS detector)

| # | CS (South Slavic) marker | regex (CS side) | East Slavic / Ukrainian vernacular | examples CS / vernacular |
|---|---|---|---|---|
| C1 | Non-pleophony CraC, CrěC, ClaC, ClěC | `[бвгдзкмпстхчжш][рл][аѣ](?=[бвгдзкмнпрстхцчшж])` | CoroC, CereC, ColoC, CeloC | градъ/городъ, глава/голова, брѣгъ/берегъ, млѣко/молоко, врата/ворота |
| C2 | Initial ra-, la- (from *or-, *ol-) | `^(ра\|ла)` | ро-, ло- | работа/робота, разумъ/розумъ, ладии/лодья |
| C3 | щ < *tj | `щ` (outside -щик-/-ще-) | ч | свѣща/свіча, помощь/поміч, хощу/хочу, горящии/гарячий |
| C4 | жд < *dj | `жд` | ж (ходжу by analogy) | одежда/одежа, рождениѥ/роження, вождь/вож |
| C5 | Initial е- (for *je- / o-) | `^е(дин\|зер\|сен)` | о- | ѥдинъ/одинъ, ѥзеро/озеро, ѥсень/осінь |
| C6 | Initial ю- (for *ju-) | `^ю(н\|г)` | у- | юношa/уноша, югъ (CS) |
| C7 | Initial а- (*ja-/a-) | `^агн` | я- | агньць/ягня |
| C8 | -ие/-ии (neuter/abstract), not -ьѥ | `ие#\|иѥ#` | -ьѥ > -ття/-ння | знаниѥ (CS)/знання |
| C9 | CrъC/ClъC spelling | `[бвгдкмпстхчжш][рл][ъь][бвгдкмпстхчжшзн]` | CъrC → CорC | кръвь/кровь, сльза/слеза (сльоза) |
| C10 | Prefixes пре-, пред-, чрез-, воз-/вос-, из- | `^(пре\|пред\|чрез\|воз\|вос\|из)` | пере-, перед-, через-, ви-, роз-, з- | прешьдъ/перейшов, изити/вийти, возвратити/повернути |
| C11 | Participles -ущ-/-ющ-/-ящ- | `[ую]щ\|ащ\|ящ` | -уч-/-юч-/-яч- | могущии/могучий, горящии/гарячий |
| C12 | Gen. sg. adj. -аго/-ѧго | `[аѧя]го#` | -ого/-его | святаго/святого |
| C13 | Lexemes | list | — | глаголати, ѥсмь, азъ, отроча, уста, перси, длань |
| C14 | рабъ vs робъ | `^раб` | роб- | рабъ/робъ (Old Ukr. vernacular "роб", now раб) |

Use: a form flagged CS **must not** run R10, R16 or R21 unless it is a known Ukrainianized CS loan (e.g., `благословити`, `храм` both remain). Shevelov on the scribal practice: [Q, ch. 14.4] "Деякі риси церковнослов'янського письма відкинуто (Ж, СrěС, жд), інші частково або повністю пристосовано до місцевої вимови (написання СъrС), решту підпорядковано досить довільним правилам уживання (А, частково шт < tj, повноголос)." And: "дехто кохався в уживанні неповноголосих сполук або шт < tj, убачаючи, мабуть, у цьому прояв найвищої вишуканості." Diagnostics for Old Ukrainian texts: [Q, ch. 14.5] "в основному правильне вживання Ђ, який лише зрідка плутано з є…; жч < zdj, zgj; поплутання vъ- з и- перед приголосним на початку слова; у київсько-поліських текстах r < r'; … (з 1125 р.) вживання и (й невживання ы) після k, g, x". Bulgarian texts by contrast "містять žd, št < dj, tj, написання типу СrъС… повноголос у них ніколи не трапляється" [Q, ch. 14.5].

## 5. Titlo (nomina sacra) expansion seed (N10)

Matching: strip the titlo and superscripts, keeping a flag; then match the stem and take the ending from the form. Expand to the Old spelling, and then run the rules.

| abbrev | expansion | modern |
|---|---|---|
| бг҃ъ, бг҃а, бз҃ѣ | богъ, бога, бозѣ | бог, бога, богові/бозі |
| бж҃ии, бж҃ьство | божии, божьство | божий, божество |
| бц҃а, бг҃ородица | богородица | Богородиця |
| гдь, гс҃ь, г҃ь | господь | Господь |
| гн҃ь, гсдⷭ҇нь | господень | Господній |
| іс҃ъ, і҃с, ісⷭ҇ | іисусъ | Ісус |
| хс҃ъ, х҃съ, хрⷭ҇тосъ | христосъ | Христос |
| хрⷭ҇тиѧнинъ | христиѧнинъ | християнин |
| ст҃ыи, ст҃аѧ, ст҃ое | святыи… | святий |
| дх҃ъ | духъ | дух |
| нб҃о, нбс҃ныи | небо, небесныи | небо, небесний |
| чл҃вкъ, чл҃вѣкъ | человѣкъ | чоловік / людина |
| ѡ҆ц҃ъ, ѿц҃ь, ѡ҆ч҃е | отьць, отьче | отець, отче |
| мт҃и, мт҃рь | мати, матерь | мати |
| сн҃ъ | сынъ | син |
| дщ҃и | дъщи (CS; vern. дъчи) | дочка |
| цр҃ь, цр҃ство | царь, цесарьство | цар, царство |
| црк҃вь, цркⷪ҇вь | церкы/церковь | церква |
| бл҃гъ, бл҃годать, бл҃гословити | благъ… | благодать, благословити (CS) |
| млт҃ва, мл҃тва | молитва | молитва |
| ап҃лъ, ап҃ⷭ҇лъ | апостолъ | апостол |
| агг҃лъ, ан҃гелъ | ангелъ | ангел |
| ѥп҃пъ, епⷭ҇кпъ | ѥпископъ | єпископ |
| прⷭ҇тлъ | престолъ | престол |
| дв҃ца, дв҃а | дѣвица, дѣва | діва |
| і҆ер҃лмъ, ѥрⷭ҇лмъ | иерусалимъ | Єрусалим |
| ꙁлⷮ҇о | злато | золото |
| кнѧ҃зь, кн҃зь | кънѧзь | князь |
| днⷭ҇ь | дьньсь | днесь (CS), сьогодні |
| мⷭ҇ць, мцⷭ҇ь | мѣсѧць | місяць |
| слн҃це | сълньце | сонце |
| вл҃дка, влⷣка | владыка | владика (CS) |
| чтⷭ҇ь, чⷭ҇тныи | чьсть, чьстьныи | честь, чесний |
| спⷭ҇ъ, сп҃съ | съпасъ | Спас |
| пррⷪ҇къ | пророкъ | пророк |
| еѵⷢ҇лїе | евангелиѥ | євангеліє |
| вскрⷭ҇нїе | въскрьсениѥ | воскресіння |
| рж҃ство | рождьство | Різдво (CS-marked) |
| крⷭ҇тъ | крьстъ | хрест |
| мⷭ҇то | мѣсто | місто / місце |
| грⷣъ | градъ | град (CS; vernacular город) |

## 6. Old → modern letter normalization (for display only)

ѡ ѻ → о · ѹ ꙋ оу → у · ꙗ ѧ ѩ → я · ѫ → у · ѭ → ю · ѥ → є · ѣ → і (ї after a vowel or at the word start) · ы → и · і ı (decimal) → и, but word-initial І- → І · ї (Middle Ukr.) → ї · ѳ → ф · ѵ → и (в after а/е) · ѯ → кс · ѱ → пс · ѕ → з/дз · ѿ → от/від · ъ# → ∅ · ь# → ь (soft dental) or ∅ (labial, hushing, р) · ҃ and superscripts → expand. Middle Ukrainian `ѣ` for і < е (пѣчь) and `ô/ꙋ/у` for і < о (кꙋнь, нꙋчь) → і.

## 7. Open issues

- Dates for R09 (e· > i), R10 (o·>i), R11 and R16 come from the chapter placement and summaries in ch. 29 and 62. The body chapters 13, 20–22, 28, 30–33 and 45 were not accessible online. Verify their exact centuries in IF02 print or the HP79 PDF (diasporiana.org.ua may host HP79).
- Морфологія (M01–M06) is outside HP79; take it from historical grammars.
- *Внесок Галичини…* (1996) is relevant to the ґ, -ові and western ikavism; *The Ukrainian Language in the First Half of the 20th c.* is relevant only to the 1928 orthography (ґ, -ія, `ль` in loanwords). Neither was consulted for quotes here.
