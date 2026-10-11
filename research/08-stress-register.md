# 08 — Stress (наголос) and register (літературне / розмовне)

Researched 2026-10-11. Legend: **[V]** means I fetched and checked it myself. **[P]** means partly verified (only a search snippet, or the PDF could not be read). **[U]** means unverified, from memory, and must be checked before use.

Project rule: every stress or register claim we store needs a **source**, a **verbatim quote** and a **locator** (URL, volume/page or §). If there is no evidence, the value is `unknown`.

---

## A. Stress

### A1. Machine-readable sources

| Source | URL | Format | License | Variant stress? |
|---|---|---|---|---|
| **lang-uk/ukrainian-word-stress** [V] | github.com/lang-uk/ukrainian-word-stress | Python package. Data is in `ukrainian_word_stress/data/stress.trie`, a `marisa_trie.BytesTrie` with about 2.9M forms. The key is the form without stress; the value holds the byte indices of the stressed vowels | Code is **MIT**. The data comes from ULIF (see below), so its rights are **unclear** | Yes |
| **egorsmkv/ukrainian-accentor** [V] | github.com/egorsmkv/ukrainian-accentor | Neural model, "Add accents to words in the Ukrainian language" | MIT. Last push 2022-10-31 | It is a model, so it has no provenance. **Not acceptable as evidence** |
| **brown-uk/dict_uk (VESUM)** [V] | github.com/brown-uk/dict_uk | `.lst` files plus affix rules | Data **CC BY-NC-SA 4.0**, code GPL-3.0 | **No stress data.** None of the file paths in the repo tree contain "stress", "accent" or "nahol" (checked via the GitHub API, tree not truncated). The only stress-related tags are `:towna` and `:town`, which are internal tags for the genitive -а/-у of town names |
| **Словники України online (ULIF)** [V] | lcorp.ulif.org.ua/dictua/ | HTML, full paradigms with stress (e.g. приві́т, приві́ту) | "© ULIF, 2001-2026". No license, no API. "Based on CD version 3.2 (2008)" | Yes |
| **uk.wiktionary** [V] | uk.wiktionary.org/wiki/помилка | Wikitext and HTML | CC BY-SA 4.0 | Yes, double acute: syllable split "по́-ми́л-ка", declension table "по́ми́лка". IPA "[ˈpɔˈmɪlkɐ]" |
| **goroh.pp.ua** [V] | goroh.pp.ua/Словозміна/помилка, goroh.pp.ua/Тлумачення/завжди | HTML with an acute after the vowel | No open license found | Yes, double acute: headword "ЗА́ВЖДИ́" (cites the 15-volume "Тлумачний словник української мови", i.e. СУМ-20, via sum20ua.com). For помилка it gives sg. "по́ми́лка, по́ми́лки, по́ми́лці…" and pl. "помилки́, помило́к, помилка́м…". Note that the plural has a single stress |
| **Грінченко 1907–09 (hrinchenko.com)** [V] | `hrinchenko.com/dictionary/word/{id}-{slug}` | HTML with semantic spans (`word`, `ending`, `phrases_words`, `grammar`, `illustration`). Stress is a combining U+0301 | Credits: Hrinchenko (author), OCR base by Олександр Оксимець, processing by Анатолій Євпак. No license stated. The 1907–09 text itself is public domain | Stress is marked in the HTML (verified): `<span class="word">Заба́ва</span>, -ви, <span class="phrases_words">за́бавка</span>…ж.`; also "ро́бом" in entry 8-abaz. **Not every headword is accented** in this edition |

Data provenance of ukrainian-word-stress [V]: `docs/other_languages.md` says "The dictionary is derived from ULIF's 'Dictionaries of Ukraine'". The README describes how variants are handled:
> "Some words allow for multiple stress positions. For example, по́милка and поми́лка are both acceptable. For such words we return double stress: `по´ми´лка`"

Heteronyms such as за́мок/замо́к are stored as separate records with tags, under the policy `on_ambiguity = skip | all | first`. The compile script uses `ACCENT = '́'`. The default output symbol is U+00B4, not U+0301.

**Printed normative stress references** (not machine-readable; cite by page):
- **Орфоепічний словник української мови**, 2 volumes, ed. М. Пещак, 2001 (ULIF). [P] The search snippet confirms the title and year. The ULIF online data is very likely derived from it. [U]
- **М. Погрібний, «Орфоепічний словник»**, 1984. [P] Confirmed by a secondary source. The separate title «Словник наголосів української літературної мови» (Погрібний, 1959?) is **[U]**.
- **С. Головащук, «Словник наголосів»** (Наукова думка, 2003?). **[U]** I could not confirm the bibliographic details.
- **Правопис 2019**: I found no section that codifies variant stress, and it is not an orthoepic source. **[U]** Its stress-dependent rules (e.g. town genitives, which dict_uk models as `:towna`/`:town` per "§ 82, 2.1.1.2" [V]) are morphology, not a stress inventory.

**How a dictionary declares variant stress (verbatim, [V])**: СУМ-20 vol. 1 (2010), front matter (archive.org item `SUM-20`, file `SUM-20_1_djvu.txt`, section "Побудова словникової статті"):
> "Усі слова - - компоненти реєстрових рядів, крім односкладових, подаються з наголосами -- одним (але, державний) або двома (завжди, помилка)."

The OCR dropped the accent marks. The examples завжди and помилка match goroh's ЗА́ВЖДИ́ and по́ми́лка. The same preface says the headword series covers "варіативністю (фонетичною, морфологічною, словотвірною, акцентуаційною…)". Two acutes in one form therefore means **two admissible stresses**, with **no ranking** given. Do not read the first acute as "primary".

Of the user's examples, ви́падок/випа́док and the dialectal помилка́ are **[U]**: I did not fetch an entry for them. Treat them as test cases to verify, not as facts.

### A2. Historical evidence

- **Грінченко 1907–09**: the best digitized source with dated stress (period "early 20th c., based on 19th c. material"). The accents are in the HTML and can be parsed. [V]
- **Смотрицький, Граматика 1619**: the text is accented, but in **Church Slavonic**, not vernacular Ukrainian. Scholarship uses it as indirect evidence: А. Ю. Полуектова, "Акцентні відмінності іменників середнього роду *Ŏ-/*jŎ-основ в українському виданні «Граматики» М. Смотрицького 1619 р. та в російському виданні 1648 р.", *Мовознавство* 2016 № 4, pp. 47–59. [P] Only the search snippet was seen; the NASU repository blocked access.
- **Беринда, Лексикон 1627** (about 6,982 entries, Church Slavonic to Ukrainian; digitized at rusneb.ru and Wikimedia `File:Lexicon_1627.pdf`). Whether its Ukrainian glosses carry stress marks is **[U]**. Check the scan before claiming it.
- **Shevchenko's meter**: there is scholarship on his authorial stress and on old/new stress coexisting in noun case forms (lib.chmnu.edu.ua/pdf/naukpraci/movoznavtvo/2009/105-92-10.pdf). I found the PDF but could not extract its text, so author, title and examples are **[P]**. Warning: much of Shevchenko's verse is described as syllabic or syllabo-tonic in a loose sense (elibrary.kubg.edu.ua/5780/…). Stress inferred from meter is therefore **an inference, not a dictionary fact**. Store it with `status: poetic` and `method: metrical-inference`, and give the line reference.
- **Old Kyivan accentuated manuscripts**: none examined. **[U]**

### A3. Data model

```ts
type StressStatus = 'normative' | 'admissible' | 'dialectal' | 'historical' | 'poetic' | 'unknown';
interface StressVariant {
  form: string;            // NFC, no stress marks (join key)
  positions: number[];     // 0-based indices of stressed vowels in `form` (code units after NFC)
  status: StressStatus;    // only from source labels; no label + normative dictionary ⇒ 'normative'
  source: string;          // e.g. 'СУМ-20', 'Грінченко 1907–09', 'ukrainian-word-stress (ULIF)'
  quote: string;           // verbatim headword/line as printed, e.g. 'Заба́ва, -ви'
  locator: string;         // URL / vol:page / §
  period?: string;         // '1907–1909', '2010–', '1840s'
  method?: 'dictionary' | 'metrical-inference' | 'corpus';
  morph?: string;          // VESUM tag when stress is form-specific (голови́ v_rod:s vs го́лови v_naz:p)
}
```

Rules:
- Store **one `StressVariant` per stress position**. Split a two-acute dictionary form (по́ми́лка) into two variants, positions [0] and [3], both `normative`, because the dictionary declares both admissible. Keep the original two-acute string in `quote`.
- Keep variant stress separate from heteronyms (за́мок/замо́к). Heteronyms are different lexemes or forms and belong on separate form records, via `morph` or the lemma.
- Status comes **only** from a label: діал. → `dialectal`, заст. → `historical`, поет./metrical → `poetic`. With no label, an entry in a normative dictionary is `normative`. A merely attested stress (Грінченко, a corpus) with no label is `unknown`, plus its `period`. Never infer a status.

Rendering and pitfalls:
- Render with **U+0301 COMBINING ACUTE ACCENT immediately after the vowel**: `form.slice(0,i+1) + '́' + form.slice(i+1)`. Some fonts and Windows render it badly; the README notes "some platforms (Windows, for example) render it incorrectly". Offer an alternative such as bold or underline.
- **NFC does not compose** a Cyrillic vowel with U+0301, because no precomposed code point exists. The mark stays a separate code point in both NFC and NFD.
- **Do not strip all `\p{M}`.** Under NFD, `й` becomes `и`+U+0306 and `ї` becomes `і`+U+0308, so a blanket mark-strip turns `її` into `іі`. Strip only stress marks: `s.normalize('NFC').replace(/[́´ˊ]/g, '')`. Then re-NFC, and keep U+0306 and U+0308.
- Normalize input mistakes: Latin look-alikes with a precomposed acute (á U+00E1, ó U+00F3, é U+00E9, í U+00ED, ý U+00FD) typed into Cyrillic words, ASCII `'` or `+` used as stress markers (ukrainian-word-stress supports `--symbol +`), and the apostrophe (ʼ U+02BC vs ' U+0027 vs ’ U+2019), which must not be mistaken for stress.
- Search by building the index on the stress-stripped NFC key. Do not rely on `Intl.Collator('uk',{sensitivity:'base'})` for this: whether it keeps й≠и and ї≠і is [U], so test it or avoid it.
- Positions are fragile under any change to the base string. Recompute them from `quote` on import and verify that `strip(quote) === form`.

---

## B. Register

### B1. Sources that mark register

**VESUM / dict_uk tags**: verbatim from `doc/tags.txt` [V] (raw.githubusercontent.com/brown-uk/dict_uk/master/doc/tags.txt, lines 109–121, 31–61):
```
bad   покруч
err (+bad)  помилкове написання (яке часто зустрічається в текстах)
subst нестандартні форма
rare  другий зн. в. для істот (в президенти), плюс декілька рідкісних форм - матір v_naz тощо
coll  розмовне слово/розмовна форма (наразі не генеруємо на виході)
arch  застаріле/архаїчне/(інколи) діалектне
slang сленг та (проф)жаргонізми
alt   альтернативне написання (не за чинним правописом)
vulg  вульгарне
obsc  обсценне
up92 за правописом 1992 (на виході конвертуємо в alt)
up19 за правописом 2019 (на виході вилучаємо)
short   короткі форми дієслів 3-ї особи, інфінітиви на -ть
long    наказові форми на -іте
```

Key findings:
- **`:coll` exists but is not emitted** ("наразі не генеруємо на виході"). VESUM therefore gives no direct "colloquial" signal.
- `:arch` mixes obsolete forms with "(інколи) діалектне", so it cannot by itself prove a form is dialectal.
- `:rare` is mostly a grammatical tag (second accusative), not a register tag.
- Sample data [V]: the online VESUM (vesum.nlp.net.ua, v6.8.6) returns `шо conj:subord:slang` and `шо noun:inanim:n:v_naz:pron:int:rel:slang`. In the source, шо and щас are in `data/dict/slang.lst`; тепера is in `arch.lst`. `data/dict/subst.lst` holds `робе робити verb:imperf:pres:s:3 #> робить`, `їсиш`, and `ходють ходити verb:imperf:pres:p:3`. `doc/nonstandard_items.md` lists ":short - красен, співа, допомагать, гарніш" and "subst - благодіяти, відціля, сьодні, шо, шоби", and the latter conflicts with шо sitting in slang.lst.
- **The online VESUM returned nothing** for `ходють`, `допомагать`, `сьодні` or `робе` [V]. `:subst` and `:short` items therefore appear to be **excluded from the default output** (the build switch is [U]). Build from `dict_uk` source with these lists enabled if we want them.

**СУМ-20** (Словник української мови у 20 т., vol. 1, 2010), §2.8 «Стилістична характеристика реєстрових слів». Verbatim from the archive.org OCR [V], with OCR typos silently fixed only where obvious:
- **розм.**: "характеризує одиниці, що належать до складу літературної мови, не виходять за рамки літературного слововживання, але використовуються переважно в усній мові та в мові персонажів художньої літератури у побутовому, повсякденному спілкуванні."
- **прост.**: "…хоч і поширені на всій або значній території функціонування української мови, не входять, проте, до складу літературної мови (носіям літературної мови такі одиниці відомі, але звичайно відчуваються ними як ненормативні, субстандартні, знижені…)"
- **діал.**: "характеризує одиниці, які, зберігаючи свою територіально обмежену належність, уживаються в мові художньої літератури або в усно-розмовній мові осіб, що спілкуються літературною мовою…"
- **книжн.**: "характеризує одиниці, що не властиві живій усній мові та використовуються звичайно у непобутових сферах спілкування (переважно в писемній мові)…"
- **заст.**: "характеризує назви предметів та явищ, що вийшли з ужитку носіїв мови або витіснені новими, сучасними назвами і сприймаються вже як архаїзми…"
- Others in the same section: поет., нар.-поет., зах., жарг., зневажл., лайл. The abbreviation list has "розм. -- розмовне слово (вислів)", "прост. -- просторічне слово", "рідко -- рідковживане слово".
- Intro to §2.8: the labels describe "тієї частини складу сучасної літературної мови, яка обмежена у своєму вживанні".

**Design consequence: in the source dictionary, "розм." is still literary.** The real boundary of the literary standard is **прост.** (and жарг.), not розм.

**СУМ-11** (1970–80, sum.in.ua): it uses the same family of labels, but I could not fetch its preface (connection refused), so its definitions are **[U]**. Do not attribute the СУМ-20 quotes to СУМ-11.

**Грінченко**: the labels are mostly geographic or source locators, e.g. "Путимець, -мця, м. = путивець. Борз. у." [V] ("Борз. у." is Борзенський повіт). These are provenance and dialect-area evidence, not register labels.

**goroh.pp.ua**: it reproduces СУМ-20 labels. The завжди page shows only "присл." [V]. Cite the underlying СУМ-20 entry, not goroh.

### B2. Orthographic heuristics: hints only, never evidence

| Pattern | Example | Evidence status |
|---|---|---|
| Infinitive in -ть | допомагать | dict_uk `:short` = "інфінітиви на -ть" [V]. Its register value (colloquial or poetic?) is not stated in dict_uk. Правопис 2019 wording [U] |
| Short 3sg | співа | dict_uk `:short` [V] |
| шо, шоб(и) for що | шо | VESUM `:slang` [V] / nonstandard_items "subst" [V] |
| щас, чо | щас | dict_uk slang.lst [V] |
| Non-standard 1sg/3pl/3sg | ходю / ходють / робе | ходють and робе are in subst.lst [V]; **ходю not found** [U] |
| сьодні | сьодні | nonstandard_items "subst" [V] |
| -ця for -ться | вчиця | **no source found** [U] |
| тре' for треба | тре | **no source found** [U] |

Rule: a pattern match may **queue a form for review** but must never set the register. Only a dictionary tag or label with a quote and locator can set it.

### B3. Tri-state classification (evidence-based)

```ts
type Register = 'literary' | 'colloquial' | 'unknown';
interface RegisterEvidence {
  value: Register; source: string; label: string; // verbatim label, e.g. 'розм.', ':slang'
  quote: string; locator: string; definitionRef: string; // pointer to the label definition quoted above
}
```

Mapping (each row is backed by a quoted definition):
- СУМ-20 **no stylistic label**, or **книжн.** or **поет.** → `literary`. **розм.** → `literary`, with sub-label `rozm`. Per the quoted definition, розм. belongs "до складу літературної мови", so do not call it colloquial.
- СУМ-20 **прост.** or **жарг.** → `colloquial`, meaning non-literary or substandard.
- СУМ-20 **діал.** or **зах.** → keep as **separate axes** (dialect, regional). If forced onto the tri-state, use `unknown`.
- СУМ-20 **заст.** → time axis (`historical`). Register stays `unknown` unless another label says otherwise.
- VESUM **`:slang`**, **`:subst`**, **`:short` infinitive** → `colloquial`. Store the tag verbatim. Note that `:subst` is defined only as "нестандартні форма", and that `:short` covers poetic or archaic forms too, so keep `label` and `definitionRef` so the UI can show the nuance.
- VESUM `:bad`/`:err`/`:alt`/`:up92` → **not register**. These are orthographic or normative status and go in a separate `normStatus` field.
- VESUM entry with no register tag → `unknown`, **not** `literary`. VESUM includes non-normative material and does not emit `:coll`.
- Conflicting sources → keep all evidence records. The displayed value is the most specific dictionary label, and the UI shows "conflict".
- No evidence → `unknown`.

---

## Open items
1. Pull ULIF orthoepic data rights/terms before shipping any ULIF-derived stress (this includes ukrainian-word-stress's trie).
2. Check Беринда 1627 scans for vernacular accents, and get the Полуектова 2016 PDF.
3. Get the СУМ-11 preface (sum.in.ua was down) and find the Правопис 2019 § on -ть infinitives.
4. Confirm the dict_uk build flag that includes `subst`/`short` in output.
