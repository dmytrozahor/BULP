# 05: Surzhyk, Russianisms, and Contact Layers

Research date: 2026-10-11. Everything marked **[verified]** was fetched and read during this research. Items marked **[secondary]** are quoted through another publication, and items marked **[unverified]** could not be checked online.

## 1. Definitions

**Енциклопедія «Українська мова»** (ред. В. М. Русанівський та ін., К.: Українська енциклопедія, 2000), entry СУРЖИК, p. 616. [secondary: quoted in С. А. Бузько, *Філологічні студії*, вип. 4, 2010, p. 63, https://journal.kdpu.edu.ua/filstd/article/download/930/930]
> «Уживається переважно щодо українського просторіччя, засміченого невмотивовано запозиченими (унаслідок українсько-російської інтерференції) російськими елементами».

The same article quotes **Масенко** (Суржик як соціолінгвістичний феномен, *Дивослово*, 2002, № 3, p. 11): суржик is «гібридне українсько-російське мовлення» or «мішана субмова». [secondary]

**Масенко, «Суржик: між мовою і язиком»** (К.: Києво-Могилянська академія, 2011). I found no open full text. The quotations below come from a 2016 *Дивослово* review (https://dyvoslovo.com.ua/wp-content/uploads/2016/03/12-1112.pdf). That review cites "[4; 122]" and "[4; 125]". Its reference list did not extract, so the attribution of [4] to the 2011 book rests on the review's context. [secondary]
> «Побутування суржику як українсько-російського мовного гібриду, що постав унаслідок асиміляційних процесів витіснення української мови російською, в майбутньому не має перспектив» [4; 122].
> «Оскільки суржик нищить узус (практичну спонтанну норму) української мови і відриває її від літературної основи…» [4; 125].

Масенко 2002, quoted in the search results: «семантичне ядро слова суржик поєднує два елементи значення – змішування двох різних субстанцій і пониження якости утвореного внаслідок змішування продукту». [secondary]

**Словникове визначення.** Українська Вікіпедія «Суржик» cites СУМ-11 and ЕСУМ т. 5. [verified page] It defines суржик as «елементи двох або кількох мов, об'єднані штучно, без дотримання норм літературної мови». It also cites ВТССУМ 2005: мовлення, «в якому об'єднано лексичні та граматичні елементи різних мов без дотримання норм літературної мови».

**Bilaniuk, *Contested Tongues*** (Cornell UP, 2005). [secondary: English Wikipedia "Surzhyk", which cites the page numbers below]
- p. 105: "Any perceived mixing of different languages may merit the label" … "Thus the definition of 'surzhyk' as a whole remains primarily ideological, although we can list the influences and forms that fall under this umbrella term."
- p. 125: five types: urbanized-peasant, village-dialect, Sovietized Ukrainian, urban bilinguals', and post-independence ("reverse") surzhyk.
- p. 138, gender mismatch: "The gender of nouns with the same referent may be different in the two languages, leading to incorrect suffixes on adjectives and verbs" (рос. *язык* m. vs укр. *мова* f.).
- Kennan Institute summary of a 2002 talk (https://wilsoncenter.org/publication/defining-surzhyk-contemporary-ukraine) [verified]: "The definition of surzhyk in Ukraine today is therefore determined by the pervasive discourse of linguistic purism."

**What this means for the pipeline.** "Surzhyk" is a **sociolinguistic and evaluative label**. It is not a fixed list of words, and Bilaniuk calls it "primarily ideological". The classifier should therefore output narrower, testable labels: `russianism_lexical`, `russianism_morph`, `russianism_orth`, `calque`, `church_slavonic`, `polonism`, `dialect`, and `archaic_orthography`. It should apply `surzhyk` only as a derived label: modern attestation, non-normative, with a Russian source.

**Dialects are not surzhyk.** The uk.wiki article [verified] gives dialect forms that are *wrongly* called surzhyk: лемківське «сын», закарпатське «быв», поліське «мешок», закарпатське/лемківське «видіти». Note that several of them contain **ы**. It treats «сємдесят» on Poltava territory as real surzhyk (АУМ т. 1, 1984).

## 2. Machine-readable resources

### 2.1 LanguageTool (Ukrainian module) [verified]
- **Directory:** https://github.com/languagetool-org/languagetool/tree/master/languagetool-language-modules/uk/src/main/resources/org/languagetool/rules/uk
  Files: `replace.txt`, `replace_soft.txt`, `replace_renamed.txt`, `replace_spelling_2019.txt`, `grammar-barbarism.xml`, `grammar-style.xml`, `grammar-spelling.xml`, `grammar-grammar.xml`, `grammar-punctuation.xml`, `grammar.xml`.
- **License:** LGPL 2.1 or later. The repository README says: "The LanguageTool core (this repo) is freely available under the LGPL 2.1 or later".
- **`replace.txt`:** 550 KB, **8,038 entries**. Format: header `# Format: word=suggestion1|suggestion2|...`, one entry per line: `wrong=sugg1|sugg2; extra notes`. A `;` separates looser alternatives. It is loaded by `SimpleReplaceRule.java` as rule id `UK_SIMPLE_REPLACE` («Пошук помилкових слів»), with the message ««X» - помилкове слово, виправлення: …». Keys are **word forms**, often lemmas, and the rule also generates derivative suggestions.
  **Caveat:** the file mixes Russianisms with misspellings («Кембрідж=Кембридж», «Марусе=Марусю»), Anglicisms and spelling variants. It has **no origin tag**, so an entry means "non-normative", not necessarily "Russian".
- **`replace_soft.txt`:** 88 KB, same format. Rule `UK_SIMPLE_REPLACE_SOFT` («Пошук нерекомендованих слів», «нерекомендоване слово, кращий варіант»). Some entries carry a context prefix. Examples: «азіатський=азійський», «офіціальний=офіційний», «позволивши=дозволивши», «айда=гайда».
- **`grammar-barbarism.xml`:** 214 rules in the category `BARBARISM` («Варваризми»). These are multi-word calques: `PRYIMATY_VS_BRATY` (приймати участь), `KORYSTUVATYSIA_POPYTOM` (користуватися попитом), `VSTUPATY_V_SYLU` (вступати в силу), `DIAKUYUCHI_INANIM` (дякуючи → завдяки), `sliduye` (слідує → варто), `RAHUVATYSIA_SCHO`, and others. Useful for phrase-level detection.

**Thirty entries copied verbatim from `replace.txt`:**

| wrong form | suggestion(s) |
|---|---|
| брюки | штани |
| бутилка | пляшка |
| мусор | сміття |
| нравитися | подобатися |
| всьо | все |
| кофе | кава |
| понятно | зрозуміло |
| слідуючий | наступний\|черговий\|дальший\|подальший\|другий; такий |
| співпадати | збігатися\|сходитися |
| тапочки | капці |
| тоже | теж\|також |
| ше | ще |
| заказ | замовлення |
| міроприємство | захід |
| сапог | чобіт |
| учбовий | навчальний |
| хватить | досить\|достатньо |
| шутка | жарт |
| грязний | брудний |
| затилок | потилиця |
| кувшин | глек\|глечик |
| начинати | починати |
| одобрити | схвалити |
| свая | паля |
| сустав | суглоб |
| челюсть | щелепа |
| шахмати | шахи |
| вертольот | вертоліт |
| визивати | викликати |
| залишившийся | що залишився |
| курящий | що палить\|що курить\|курець\|курій |
| авось | ану ж\|а може\|може-таки\|ачей |

**Pattern counts over the 8,038 `replace.txt` keys** (my own regex pass, used as evidence in §3):
- `(уч|юч|ач|яч)(ий|а|е|і)$`: **1,407** keys (participle calques, e.g. абсорбуючий, авіанесучий).
- `ьо`: **117** keys, of which `ьот`: 17 (вертольот, авіанальот).
- `ство$`: 64 (агенство, бігство). These are lexical, not suffixal.
- `(ющ|ущ|ящ|ащ)…$`: 22 (блуждающий, вищестоящий, курящий, імущий).
- `^вс[^ьяюєі]`: 22 (вскривати, всезагальний).
- `ивати$`: 7.
- `ш(ий|ій)ся$`: 1.
- `[ыэъё]`: **0**, and `тся$`: **0**.

Non-Ukrainian letters never appear in `replace.txt` because the speller catches them. A lexical lookup will therefore miss these forms, and a separate orthographic rule is needed.

### 2.2 VESUM / dict_uk (brown-uk) [verified]
- **Repository:** https://github.com/brown-uk/dict_uk. **License:** data under **CC BY-NC-SA 4.0** and code under GPL-3.0 (README: «Дані словника доступні … "Creative Commons Attribution-NonCommercial-ShareAlike 4.0"»). **NonCommercial**: check this against the project's license.
- **Tag documentation:** `doc/tags.txt`, lines 109–116:
  - `bad`: покруч
  - `err (+bad)`: помилкове написання
  - `subst`: нестандартна форма
  - `rare`
  - `coll`: розмовне
  - `arch`: застаріле/архаїчне/(інколи) діалектне
  - `slang`
  - `alt`: альтернативне написання (не за чинним правописом)
  - `up92`: за правописом 1992
- **`doc/nonstandard_items.md`** says that `bad` covers:
  - `:adjp:actv:imperf`, e.g. «існуючий»
  - `-учи`, e.g. «будучи, хочучи»
  - «росіянізми — кляча»
  - frequent misspellings: «біржевий, грунт, експресо»
  - `:bad` forms such as «автомобілей, альманаха, болгарів»
  - `subst` lemmas: «благодіяти, відціля, сьодні, шо, шоби»
- **Source lists** (`data/dict/`): `invalid.lst` (72 KB), `subst.lst` (35 KB), `arch.lst` (289 KB), `slang.lst`, `alt.lst`, `base.lst`, and others.
  - `invalid.lst` format: `lemma /flags :tags  #> correction`. Examples: `авторітет /n20`, `аккаунт /n20.p  #> акаунт|обліковий запис`, `чіпування /n2n  #> чипування`, `автотюнинг /n20  #> автотюнінг`.
  - `subst.lst` format: `form lemma postag  #> correction`. Examples: `аеропорта аеропорт noun:inanim:m:v_rod`, `автомобілей автомобіль noun:p:v_rod`, `каталога каталог noun:m:v_rod`, `вибухли вибухнути verb:perf:past:p #> вибухнули`. Russian-type genitive `-а` and plural genitive `-ей` are **morphological** Russianisms.
- **Use in the pipeline:** VESUM is the normative gate. A form in VESUM without `bad/subst/alt/arch` is normative and blocks every suffix heuristic. `:arch` routes to the historical layer, not to surzhyk.

### 2.3 Print guides (no machine-readable version found)
- **Сербенська, «Антисуржик»**: only shop listings were found (book-ye.com.ua). No digital text. [unverified]
- **Головащук, «Словник-довідник з українського літературного слововживання»**: no online edition found. [unverified]
- **«Не говори так — говори правильно»**: not located online. [unverified]
- **r2u.org.ua** [verified] hosts digitized Russian–Ukrainian dictionaries: Кримський, Ізюмов, Ніковський, Голоскевич (правописний), Караванський (складної лексики), Желехівський 1886, Скалозуб 1933, and others. The site has no license statement, only a citation request and "© 2026 r2u.org.ua". Treat it as reference only and do not redistribute.

**Recommendation:** use LT `replace*.txt` (LGPL) and the VESUM `bad/subst` tags as the primary lexical sources. Do not scrape the print guides.

## 3. Heuristics for Russian-influenced forms

### 3.1 Core caveat: date and register gating
1. **Pre-modern Ukrainian orthographies used ы, ъ, э, ё, ѣ.** Source: uk.wiki «Українська абетка» [verified]. Shashkevych (1837) dropped ы and ъ. Zhelekhivka (1886) used no ѣ, ъ, ы. Kotlyarevsky wrote **э** word-initially. Maksymovych used **ё** for йо/ьо and **ѣ** for [і]. In Kulishivka «Літери ъ та ь виконували функцію апострофа». A Ukrainian text from 1800–1890 with ы, ъ or ё is therefore **normal**, not Russified.
2. **Ruthenian / руська мова.** The 1588 Lithuanian Statute caption «рꙋскиⸯ єзыкь» contains ы (en.wiki «Ruthenian language» [verified]). Chancery Slavonic was "based on Old Church Slavonic, but influenced by various local dialects".
3. **Church Slavonic participles.** uk.wiki «Дієприкметник» [verified]: full active participles «широко вживалися в староукраїнській мові». Normative modern Ukrainian keeps a few CS-origin `-ущ-/-ющ-/-ащ-` forms («видющий, значущий, кричущий, цілющий» — «запозичені зі церковнослов'янської мови»). So `-ущий` alone does **not** mean Russianism.
4. **Dialects** contain ы and Russian-looking forms (§1).

**Gating rule.** Orthographic and morphological Russianism rules fire only when:
- `attestation.year ≥ 1920`, and
- `register ∈ {modern_standard, press, web}`, and
- the form is not in VESUM as normative.

For earlier dates, output `archaic_orthography`, `church_slavonic` or `ruthenian` instead. The 1920 cutoff is a **design parameter** and is not taken from a source.

### 3.2 Rule table

`weight`: 0–1 contribution to the label score. **Rules without a published source have weight 0** (user requirement). "LT-count" means the counts from §2.1 over LanguageTool `replace.txt`.

| id | pattern (JS regex, on lowercase form) | label | weight | gate | example | source |
|---|---|---|---|---|---|---|
| LEX-LT | exact key in LT `replace.txt` | nonnormative (origin unknown; Russian if the key fails VESUM and the Russian lexicon) | 0.8 | modern | слідуючий→наступний | LT `replace.txt`, rule UK_SIMPLE_REPLACE (LGPL) |
| LEX-LT-SOFT | exact key in LT `replace_soft.txt` | not_recommended | 0.4 | modern | офіціальний→офіційний | LT `replace_soft.txt`, UK_SIMPLE_REPLACE_SOFT |
| LEX-VESUM-BAD | VESUM tag `:bad` | nonnormative / russianism | 0.8 | modern | кляча, існуючий | dict_uk `doc/tags.txt` l.109; `nonstandard_items.md` |
| LEX-VESUM-SUBST | VESUM tag `:subst` | nonstandard (colloquial / surzhyk) | 0.6 | modern | шо, сьодні | dict_uk `doc/nonstandard_items.md` |
| PHR-LT-BARB | LT `grammar-barbarism.xml` match | calque_phrase | 0.7 | modern | приймати участь | LT `grammar-barbarism.xml` (category BARBARISM) |
| ORT-YI | `/[ыэъё]/` | russianism_orth | 0.9 | year≥1920 and not dialect | (any modern web form with ы; contrast dialect «сын», which is vetoed) | Півторак, «Український алфавіт», енц. «Українська мова» 2004 (33 letters), via uk.wiki «Українська абетка» |
| ORT-YI-OLD | `/[ыэъёѣ]/` and year<1920 | archaic_orthography / ruthenian | 0.9 (to the old layer) | year<1920 | рꙋскиⸯ єзыкь (1588) | uk.wiki «Українська абетка»; en.wiki «Ruthenian language» |
| ORT-JO | `/ьо[тк]/` not in VESUM | russianism_phon (Russian ё→ьо) | 0.6 | modern | вертольот→вертоліт | LT-count: 117 keys with ьо |
| MOR-PART-UCH | `/(уч|юч|ач|яч)(ий|а|е|і|ого)$/` and VESUM `:bad` or LT key | calque_participle | 0.6 | modern | абсорбуючий→поглинальний | LT-count 1,407; dict_uk nonstandard_items («існуючий» :bad). Normative adjectives (колючий) are blocked by VESUM. |
| MOR-PART-SHCH | `/(ющ|ущ|ящ|ащ)(ий|а|е|і|ого)$/` not in VESUM | russianism_morph | 0.7 | year≥1920 | курящий, вищестоящий | uk.wiki «Дієприкметник»; LT-count 22 |
| MOR-PART-SHCH-CS | same pattern, in VESUM, or year<1800 | church_slavonic | 0.7 | any | цілющий, значущий | uk.wiki «Дієприкметник» (CS borrowings) |
| MOR-SHIISIA | `/ш(ий|ій|ая|еє)ся$/` | russianism_morph | 0.5 | modern | залишившийся→що залишився | LT `replace.txt` (1 key); weak evidence |
| MOR-UCHY | `/(учи|ючи)$/` adverbial participle of бути/хотіти | nonnormative | 0.5 | modern | будучи, хочучи | dict_uk `nonstandard_items.md` |
| MOR-GEN-A | noun `v_rod` `-а` where the norm is `-у` (VESUM subst) | russianism_morph | 0.6 | modern | аеропорта, каталога | dict_uk `subst.lst` |
| MOR-GEN-EI | plural genitive `-ей` (VESUM subst/bad) | russianism_morph | 0.6 | modern | автомобілей | dict_uk `nonstandard_items.md` |
| MOR-TSIA | `/тся$/` on a verb | russianism_orth | 0.8 | year≥1920 | (verb form ending in -тся) | Український правопис 2019 (-ться; § number not verified). LT-count 0, handled by the speller |
| PFX-VS | `/^вс[^ьяюєі]/` not in VESUM | russianism_morph (рос. вс- / укр. ви-, з-) | 0.4 | modern | вскривати→викривати | LT-count 22 |
| PFX-RAZ | `/^раз(?!ом|ів|у\b)/` not in VESUM | russianism_morph (роз-) | 0 | modern | разбити | **unsourced**: Правопис paragraph not verified; LT-count 2 (both idioms) |
| SFX-YVA | `/ив(ати|ає)$/` not in VESUM | russianism_morph (-ыва-/-ива- vs -ува-) | 0.2 | modern | визивати→викликати | LT-count 7; weak |
| SFX-STVO | `/ство$/` | — | 0 | — | агенство | **unsourced as a marker**: -ство is native (товариство). The 64 LT keys are lexical |
| AGR-GENDER | adjective gender ≠ noun gender, where the Russian noun gender agrees | surzhyk_syntax | 0.5 | modern | (мій мова) | Bilaniuk 2005:138 [secondary] |
| ORT-E-YE | е/є, и/і positional | — | 0 | — | — | **unsourced**: no specific published rule fetched |
| ORT-AGO | `/аго$/` adjective genitive | archaic_orthography / church_slavonic | 0 | — | святаго | **unsourced** in this research |

**Scoring.** Use `score(label) = 1 − Π(1 − wᵢ)` over the rules that fire. A normative VESUM hit with no `bad/subst/alt/arch` vetoes every MOR-, SFX- and PFX- rule. Dialect metadata vetoes ORT-YI.

## 4. Polonisms and Germanisms (origin layer)

Source: uk.wiki «Полонізм» [verified], based mainly on ЕСУМ; it also cites Півторак, Шимановський, Огієнко and others. Definition: «Полонізм … — запозичення з польської мови. Полонізмом може бути не обов'язково лексема, а й фонетична, граматична чи фразеологічна форма.»

- **Lexical:** бидло < bydło, пан < pan, шлюб < ślub, пончик < pączek.
- **Phonetic** (Polish shape replacing the native one): вежа < wieża (native віжа), дзбан < dzban (native джбан), шкура < skóra (native скора).
- **Semantic:** мова < mowa, місто < miasto, псувати < Old Polish psować.
- **Calques:** виняток < wyjątek, підручник < podręcznik, горілка (cf. gorzałka).
- **Germanisms via Polish:**
  - потяг < pociąg < Zug
  - кріль < królik < MHG küniklīn
  - навіть < nawet < MHG wet
  - тамувати < tama
  - грабунок < rabunek
  - розташувати < Old Polish taszować < Tasche
  - внесок (cf. wniosek)
  - набакир < na bakier
  - аґрус, ґрати, шинка, шукати and ярмарок are German or Latin words that came through Polish.

**Pipeline guidance.** These are **lexical** facts and should be stored per lemma with ЕСУМ provenance. The candidate shape cues (`дз-` for native `дж-`, the suffix `-унок`) are productive in native Ukrainian (дзвін, малюнок), so they get weight ≤0.2 and work only as prompts for ЕСУМ lookup. I verified no regex-level Polonism rule. Treat Polish and German layers in Ruthenian (16th–17th c.) as `polonism` or `germanism_via_polish`, never `surzhyk`.

## 5. Implementation notes (TypeScript)
- Load `replace.txt` by splitting on the first `=`, then on `|`. Strip `; …` tails into a `notes` field. Skip `#` lines.
- Load the VESUM tagged dictionary (released `dict_corp_lt.txt` from the dict_uk releases) and index forms → tags. CC BY-NC-SA applies.
- Keep provenance on every flag: `{ruleId, source, weight, gate}`. Expose `unsourced: true` rules, which have weight 0, for later review.
- Open items:
  - Verify the Правопис 2019 paragraphs for `-ться` and `роз-`.
  - Obtain Масенко 2011 for direct quotations.
  - Build a Russian lemma list (e.g. OpenCorpora) to separate Russian-origin from other non-normative LT keys.
