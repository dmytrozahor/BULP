# 25 — Stress-distinguished meanings (U-26)

Researched 2026-10-12 (R25). Tags: **[Q]** verbatim, checked against the fetched page; **[P]** paraphrase; **[U]** unverified / not fetched. Raw pages kept in `C:\Users\User\.claude\jobs\293095c9\tmp\r25\` (goroh `gt*.html`, Grinchenko `hg_*.html`, `wp_omo.json`).

## 0. Headline findings

1. **The user's example is NOT supported by the dictionaries I could read.** U-26 asserts «послухАтися (послушатися, послушання) ≠ послУхатися». In every source checked there is **one** headword, stressed **послу́хатися** (penult-minus-one: пос-**лу́**-ха-ти-ся), perfective of слу́хатися; no entry with stress on the third syllable (*послуха́тися*) exists in ULIF/СУМ-20 (via goroh), СУМ-11, or Грінченко (Грінченко marks stress only on the infinitive: «-ха́ю»). See §1. The meaning difference the user wants (obey vs. listen) is carried by **aspect/prefix/sense of слу́хатися**, not by stress. Treat the claim as **[U] — unconfirmed; needs the user's source** (an Орфоепічний словник page or a speaker report). Do NOT encode it as fact (SPEC 00 P-1.7).
2. Real, source-backed stress-distinguished pairs exist and are plentiful (uk.Wikipedia «Омографи» lists ~35, §2; СУМ-20 separates entries by stress, §3).
3. Two structurally different phenomena must be kept apart in the data model (§4): **free variants** (за́вжди́) vs **heteronyms** (за́мок/замо́к), and within heteronyms three sub-kinds: different lexemes; different *aspect partners* (перево́зити/перевози́ти); different *inflectional forms* of one lexeme (ру́ки/руки́).

## 1. послухатися / послух / послушний — what the sources say

| Source | Locator | Verbatim [Q] | Reading |
|---|---|---|---|
| СУМ-20 vols 1–15 (A–П'ЯТЬ), via goroh.pp.ua/Тлумачення/послухатися | goroh «Тлумачення», entry id 1097372 | Headword «ПОСЛУ́ХАТИСЯ», «аюся, аєшся, кого, чого і без прям. дод.» / «Док. до слу́хатися 1, 2.» | one lexeme, perfective of слу́хатися in senses 1 (дотримуватися порад) and 2 (коритися) |
| СУМ-11 via goroh.pp.ua/Тлумачення/слухатися | «Тлумачний словник української мови в 11-ти томах» | «СЛУ́ХАТИСЯ» 1 «Дотримуватися чиїх-небудь порад, прохань, повчань.» 2 «Коритися кому-, чому-небудь, виконувати чиїсь накази, розпорядження і т. ін.» 3 «тільки 1 ос. слу́хаюсь.» «Те саме, що слу́хати 8.» 4 «Пас. до слу́хати 1–4.» | sense 3 = reply «слухаюсь!» (≈ слухати 8, acknowledge an order); sense 4 = passive of слухати («listen»). Stress on У throughout |
| ULIF (paradigm, via goroh «Словозміна») | goroh.pp.ua/Словозміна/послухатися | «послу́хатись , послу́хатися , послухаться»; «послу́хаюсь», «послу́хався», «послу́халась» … | the whole paradigm is stressed on the 3rd-from-last-but-one syllable ‑лу́‑; no alternative column |
| Грінченко 1907–09, vol. 3 p. 363 (hrinchenko.com/dictionary/word/45847-posluxatisia) | | «Послухатися, -хаюся, -єшся, гл. Послушаться. Послухайся мене хоч тепер. МВ. І. 27.» | obey. No stress mark on the headword |
| Грінченко vol. 3 p. 363 (…/45846-posluxati) | | «Послухати, -ха́ю, -єш, сов. в. послухати, -хаю, -єшь, гл. 1) Слушаться, послушаться. … 2) Только сов. в. Послушать.» | **the listen sense (2) belongs to the perfective of слухати (послухати «to listen for a while»), not to the reflexive.** Only here a stress mark: «-ха́ю» (= послуха́ю, 1st sg.) |
| Грінченко (…/45844-poslux) | p. 363 | «Послух, -ху, м. Послушаніе. Желех.» | |
| Грінченко (…/45850-posluxnianii) | p. 364 | «Послухняний, -а, -е. Послушный.» | no entry «послушний/послушання» in the headword list near these ids ( «послушки» p. 364 = «Слушаніе») [P] |
| СУМ-20 via goroh/Тлумачення/послух | | «ПО́СЛУХ у, ч.» 1 «Слухняне виконання чиїх-небудь наказів, розпоряджень, побажань, підкорення чиїйсь волі; покора.» + рел.-церк. «Певні обов'язки, покладені на кожного ченця…»; «ПО́СЛУХ у, ч., розм.» «Слух (у 3 знач.), чутки.»; «ПО́СЛУХ а, ч., заст.» «У Давній Русі – свідок на суді.» | три лексеми з однаковим наголосом: they differ by **gender/declension class and register** (у vs а), not by stress |
| СУМ-20 via goroh/Тлумачення/послушний | | «ПОСЛУ́ШНИЙ а, е, заст., розм.» «Слухняний.» | stress on 3rd syllable of the *adjective* (по-**слу́**-шний), i.e. same -лу́- as послу́хатися |
| «послушання» on goroh | | only a generated entry: «Велика мовна модель … архаїчне, релігія. Покора…» | **[U]** — LLM-generated gloss on goroh, not a lexicographic source; do not cite. Stress not given |

**Derivational skeleton found [P]:** слух → слу́хати (ipf.) → послу́хати / послу́хатися (pf.) → по́слух (n.), послу́шний (adj., заст./розм.), послу́шання (n.). Stress is fixed on the root in all of them (-слу́х-/-слу́ш-), so *stress does not separate the obey and the listen senses*. Meaning is split by (a) reflexive vs. non-reflexive, (b) government (кого/чого vs. що), (c) СУМ sense numbers. The user's intended stress contrast, if it exists in speech, is probably a **dialect/colloquial/hypercorrect** feature → needs a source; flag [U].

**Action for the data:** store one lemma `послухатися` with stress `[послу́хатися]` (source: СУМ-20/ULIF via goroh) and two senses; add a TODO row «user-asserted stress-contrast послуха́тися — [U], awaiting source» rather than a second lemma.

## 2. General lists of Ukrainian heteronyms

### 2a. uk.Wikipedia «Омографи» (CC BY-SA)
Source: https://uk.wikipedia.org/wiki/Омографи (pageid 293659, API `prop=extracts`, fetched 2026-10-12). Cites at the end: «Омографи // Літературознавча енциклопедія : у 2 т. / авт.-уклад. Ю. І. Ковалів. — Київ : ВЦ «Академія», 2007. — Т. 2 : М — Я. — С. 152.» [Q]. The pair list itself is **not** individually referenced in the article → each pair needs confirmation in СУМ/ULIF before it becomes a claim (they are [P] until then; the ones I confirmed in СУМ-20 are marked ✔ in §3).

Verbatim [Q] pairs (stress → gloss as given there):
аба́ка (архітектурна деталь) / абака́ (рослина, волокно) · а́тлас (збірка мап) / атла́с (тканина) ✔ · гла́дкий (рівний) / гладки́й (повний, угодований) · го́род (місто) / горо́д (сад) · гребі́нник (рослина) / гребінни́к (майстер…) · гря́да (грядка) / гряда́ (пасмо) · де́рен / дере́н · за́мок (фортеця, садиба) / замо́к (прилад) ✔ · за́пал / запа́л · зо́льник / зольни́к · ко́лос (суцвіття) / коло́с (велет) · лу́па / лупа́ · лю́фа / люфа́ · наві́сний / навісни́й · наре́чений («названий») / нарече́ний («жених») · ні́коли («наразі нема часу…») / ніко́ли («за жодних обставин») · о́бід (обруч, деталь колеса) / обі́д (прийом їжі) ✔ — «омографія існує лише в називному і знахідному відмінках» · о́бруч / обру́ч · о́писка / опи́ска · о́чник / очни́к · па́хол / пахо́л · по́діл / поді́л · пра́вило / прави́ло · си́тник / ситни́к · сі́м'я (насіння) / сім'я́ (родина) — homographic only in Nom. · сі́яти / сія́ти · те́рен / тере́н · ті́пати / тіпа́ти · ко́пати / копа́ти · фа́нза / фанза́ · ці́лик / ціли́к. Also «граматичні форми слів, що відрізняються лише наголосом: ру́ки (Н. мн.)/руки́ (Р. одн.)».

Non-stress homograph types noted there (for completeness): softness/hardness of dentals before і (ніс/ніс, надійний/надійний, дружні/дружні, насінні/насінні) and ґ/г before 1933 («ґніт/гніт, ґрати/грати»). These are NOT stress phenomena → out of scope for the stress record but relevant to R13.

### 2b. Orthoepic dictionaries (cite by page)
- Орфоепічний словник української мови, 2 vols., ed. М. Пещак (ULIF, 2001) [P, from research/08 §A1]; ULIF online is derived from it [U].
- Погрібний 1984; Головащук «Складні випадки наголошення» (1995) and Калашник–Савченко «Українсько-російський словник наголосів» (1997) — titles from a web-search summary, **[U]**, not opened.
- Wiktionary: uk.wiktionary has `Категорія:Омографи/uk` containing a single member (`музика`) when queried 2026-10-12 [Q: API result] → **no usable heteronym category**; en.wiktionary has no «Ukrainian heteronyms/homographs» category either (allcategories prefix queries returned empty). The brief's «Українські омографи» category does not exist under that name.
- uk.wiktionary pages for замок/обід/приклад/мука did not exist as plain titles (`missing`) when I queried them; броня, атлас, виходити exist but their wikitext is an unfilled template (stress only in `{{склади|ви|хо́|ди|ти}}`) → Wiktionary is a weak source here. Rate-limit (HTTP 429) hit after ~8 calls at 2.6 s spacing; later calls spaced ≥5 s.
- Scholarly: Потебня Inst. paper on «акцентуаційний спосіб словотворення» (nasplib.isofts.kiev.ua/handle/123456789/182916) — blocked by Anubis, **[U]**; iul-nasu.org.ua/pdf/kulturaslova/84/29-ks_84.pdf — PDF not decoded, **[U]**.

## 3. The brief's test cases, checked in СУМ-20 (via goroh «Тлумачення»; all [Q] glosses)

| Pair | Stress A → sense | Stress B → sense | Kind | Note |
|---|---|---|---|---|
| замок | ЗАМО́К мка́, ч. «Пристрій для замикання дверей у приміщеннях, дверцят шафи…» (+ застібка, блискавка, архіт. «Центральний камінь арки») | ЗА́МОК мку, ч. «Укріплене житло феодала доби Середньовіччя…»; «Великий панський маєток; палац»; заст. «Тюремна будівля; тюрма» | 2 lexemes, **different inflection** (мка́ vs мку) | confirmed |
| обід | ОБІ́Д у, ч. «Споживання їжі серед дня…» | О́БІД о́бода, ч. «Зовнішня частина колеса…» | 2 lexemes, different genitive (обі́ду / о́бода) | gen. differs → homograph only Nom/Acc (matches Wikipedia) |
| приклад | ПРИКЛА́Д а, ч. «Розширена частина ложа гвинтівки…» | ПРИ́КЛАД у, ч. «Те, що варто наслідувати; зразок» (+ математичний вираз); another ПРИ́КЛАД у, ч., заст. «Влучний, часто римований вислів…» | 2 lexemes; gen. -а / -у | confirmed |
| мука | МУКА́ и́, ж., розм. «Те саме, що бо́рошно 1.» | МУ́КА и, ж. «Страждання, зумовлене фізичним болем…» | 2 lexemes, same gender, different stress through the paradigm (муки́ Gen / му́ки) | confirmed |
| броня | БРОНЯ́ і́, ж. заст. «Металевий одяг для захисту тіла воїна»; «Захисне облицювання зі сталевих плит…» | БРО́НЯ і, ж. «Офіційне закріплення за ким-, чим-небудь пільгових прав…» | 2 lexemes | confirmed (also personal name Броня, Бро́ню — separate «Власні імена» source) |
| атлас | АТЛА́С у, ч., текст. «Шовкова або напівшовкова тканина…» | А́ТЛАС у, ч. «…збірник географічних… карт» | 2 lexemes, same paradigm class | confirmed; **homograph in all cases** |
| виходити | ВИХО́ДИТИ «джу, диш, недок., ВИ́ЙТИ …; док.» «Іти звідки-небудь назовні…» | ВИ́ХОДИТИ «Див. вихо́джувати 1.» and «Див. вихо́джувати 2.» (= to nurse back / to walk a distance, perfective of ходити-type) | 2 lexemes; first = imperfective of вийти, second = *perfective* | **aspect-bearing**: the stress identifies the aspect (ви́-prefix always stressed in pf. verbs, wiktionary-style rule [P]) |
| насипати | НАСИПА́ТИ а́ю, а́єш, недок., НАСИ́ПАТИ, плю…; док. | НАСИ́ПАТИ «Див. насипа́ти 1.» (the pf. partner) | **same lexeme-pair**, stress marks aspect (насипа́ти ipf. ↔ наси́пати pf.) | not a heteronym in the semantic sense; also second lexeme НАСИПА́ТИ… НАСПА́ТИ «Сплячи, набувати…» [Q] = different verb |
| перевозити | ПЕРЕВОЗИ́ТИ ожу́, о́зиш, док. «Везучи, по черзі перемістити… усіх, багатьох…» | ПЕРЕВО́ЗИТИ о́жу, о́зиш, недок., ПЕРЕВЕЗТИ́ … «Везучи, переправляти через що-небудь…» | **two different aspect pairs** (перевози́ти pf.[distributive] ≠ перево́зити ipf. of перевезти́) | confirmed — the key aspect-by-stress example |
| викладачка | ВИКЛАДА́ЧКА и, ж. «Жін. до виклада́ч.» — single entry, no alternative | | not a heteronym | the brief's «?» → **no** evidence for ви́кладачка in СУМ-20; [U] for any variant |
| дорога | ДОРО́ГА и, ж. «Смуга землі, по якій їздять і ходять.» | ДОРОГИ́Й а́, е́ (adj.) — different lemma | only an inflected-form coincidence (доро́гу acc. vs. дорогу́ short form?) → not checked [U] | |
| гора / гори | ГОРА́ и́, ж. | ГО́РЕ я, с. (гори́ vs го́ри? ) [P] | form-level homographs of different lexemes, e.g. го́ри (Nom pl of гора́ in СУМ is гори́) | [U] — needs paradigm check in ULIF |
| сталий/стала | СТА́ЛИЙ → ста́ла (fem. noun «стала величина») | СТАЛЬ / стала (past of стати) | form-level | [U] |

(Rows 11–13 are ideas for the corpus test, not confirmed claims.)

## 4. Data model proposal

Existing: `StressVariant { form, positions[], status, evidence[], period?, method }` (core/types.ts) = **free variants of one lexeme/form**; `nlp/stress.py` `lookup()` already sets `ambiguous: true` when the trie value holds >1 distinct stress tuples (it cannot say *why*).

New record for heteronyms (a separate collection keyed by unstressed form; NOT merged into `stress[]` of one lemma):

```ts
interface Heteronym {                  // key = form without accent, NFC
  form: string
  readings: HeteronymReading[]         // ≥2
  source: Evidence[]                   // СУМ-20/ULIF entries
}
interface HeteronymReading {
  stressed: string                     // за́мок
  positions: number[]                  // vowel indices
  lemma: string                        // lemma id (distinct lexeme) — or same lemma when kind='aspect' or 'form'
  gloss: string                        // first СУМ definition, verbatim
  pos: string                          // VESUM
  aspect?: 'pf' | 'ipf'                // for перево́зити / перевози́ти
  kind: 'lexeme' | 'aspect-partner' | 'inflected-form'   // замок | насипа́ти/наси́пати | ру́ки/руки́
  cases?: string[]                     // homograph scope, e.g. ['nom','acc'] for о́бід/обі́д (Wikipedia note) — optional
  evidence: Evidence[]                 // SUM-20 locator + quote [Q]
}
```
Rules:
- Free variants (за́вжди́, по́ми́лка) stay in `LemmaDetail.stress[]` (single lexeme, one meaning, СУМ double acute).
- A heteronym is created only when ≥2 *lemmas or aspect/form-cells* share the unstressed spelling and differ in stress (compute: group VESUM forms by NFC unstressed form, intersect with `lookup()` tuples; confirm gloss from СУМ-20/ULIF). Uncertain pairs (Wikipedia-only) get `evidence.confidence = 'P'`.
- Derivational links by stress: `Derivation{ from: lemmaId, to: lemmaId, relation, stressShift?: 'root-fixed'|'mobile' }` — e.g. слу́хати → послу́хатися, по́слух, послу́шний (all root-fixed). Cross-heteronym links (не-ітерація): no link between замок/за́мок.
- UI: the word card for an ambiguous unstressed form shows a «Наголос і значення» table: one row per reading (stressed form, lemma, gloss, POS/aspect, source), plus a warning when a corpus token cannot be disambiguated (default: show all readings, mark «омограф», do not pick one — matches `on_ambiguity='all'`).

## 5. Open points for the user / next steps
1. Ask for the source of «послухАтися ≠ послУхатися»; absent that, keep as [U] (§1).
2. Python/uv is not runnable in this agent's shell (WindowsApps stub, no `uv` on PATH) → I could **not** run `nlp/stress.py lookup` to read the trie for the test words; do it in the main session: `uv run --project nlp python -c "import nlp.stress as s; print(s.lookup('послухатися'))"` and the §3 list.
3. Verify the remaining Wikipedia pairs one by one in ULIF/goroh before storing; goroh is cite-only (no licence), ULIF cite-only; Wikipedia list usable under CC BY-SA with attribution.
4. Sources not reached: Орфоепічний словник (Пещак 2001) pages, Головащук 1995, Потебня-Inst. paper (Anubis block).
