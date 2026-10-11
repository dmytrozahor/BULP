# 06 — Corpora and the author-vetting model

Status: research draft, 2026-10-11. Scope: (1) which corpora we can use and what metadata they carry, (2) an auditable "self-identification" model for authors, (3) a rule for the "first-attesting author".

User requirement this serves: *"For Ukrainian forms only rely on verified Ukrainian or Ruthenian authors who identified themselves as Ruthenian or Ukrainian, and always record the source for a lexeme/word: the first author it was found in."*

Verification legend used throughout:
- **FETCHED**: I fetched the text during this research and the quote matches the page character for character (apart from the site's font transliteration, see §1.8).
- **SECONDARY**: the quote is confirmed only through a secondary page (school or educational site). It must be re-checked against a scholarly edition.
- **UNVERIFIED**: the quote is plausible or well known but was not fetched. **It must not go into the database as a quote** until someone fetches it.
- **n/a**: the evidence is not a quote (for example a self-chosen pseudonym or a documented public role).

---

## 1. Corpora

### 1.1 Summary table

| id | name | url | license (as stated) | per-text metadata | access / download | scrape feasibility | use for us |
|---|---|---|---|---|---|---|---|
| grac | ГРАК (General Regionally Annotated Corpus of Ukrainian; Shvedova, von Waldenfels, Yarygin et al.) | https://uacorpus.org/ ; search at sketch.uacorpus.org | No license stated; asks you to cite it. Texts are mostly in copyright. | Yes, rich: `DOC.DATE` (year written, or the latest possible year), `DOC.PUBLICATIONYEAR`, author info (incl. region), original language, spelling system, genre, source | NoSketch Engine web UI (ГРАК-18/19). KWIC and frequency export through the UI. Bulk text download is not offered, except PluG (below). | Do not scrape (ToS and copyright). Use manual or semi-automated KWIC queries per lemma and record `DOC.*` attributes. | **The main dating oracle for 1816 to now** (>150k texts, ~35k authors per the homepage) |
| plug | PluG ("Pluperfect GRAC"), GRAC's out-of-copyright subset | https://uacorpus.org/poshuk-u-graku/korpus-dlya-zavantazhennya-plug → Zenodo | Not stated on the GRAC page. Check the Zenodo record; the texts themselves are public domain. | "with metadata" per GRAC. Fields need checking on Zenodo. | Zenodo download | Bulk, legal | **Best bulk source for 19th to early 20th c. texts with author and year** |
| brown | Brown-UK (БрУК) | https://github.com/brown-uk/corpus | **CC BY-NC-SA 4.0** per the README (not CC BY 4.0 as the brief assumed). Non-commercial use only. | Yes, `meta/meta.csv`: `author_surname, author_name, title, publ_in, url, publ_place, publisher, year, alt_orth, …` | git clone; disambiguated morphology in `data/` | Trivial | Modern texts (≈2010s), 1M words. **Useless for first attestation.** Good for the gold morphology tagset and for normalisation tests. |
| ubertext | UberText 2.0 (lang-uk) | https://lang.org.ua/en/ubertext/ | No license stated on the page. Check the preprint and the download page before use. | Per-document metadata not documented on the page. Shipped files are `.txt.bz2` "text_only" in four layers (base, cleansed, sentence-split, tokenized). | Direct download (fiction ≈414 MB) | Download only | 3.27B tokens, mostly 21st c. Useful for frequency and "is the form current", **not for provenance** (no reliable author or year). |
| wikisource | Українська Вікіджерела | https://uk.wikisource.org | CC BY-SA 4.0 for the site, with texts mostly public domain | Author pages (`Автор:…`) with lifespan. Wikidata links give dates. The edition used is often named (e.g. *Енеїда*, Berlin 1922, ed. Lepkyi, with a DjVu scan). | MediaWiki API (`action=parse`, categories), dumps.wikimedia.org | Easy and legal | **Good secondary witness**, but it often uses modernised later editions. Record the `edition` and never treat its spelling as the first-edition spelling. |
| izbornyk | Ізборник (litopys.org.ua / izbornyk.org.ua) | http://izbornyk.org.ua/ (HTTP only; WebFetch's forced HTTPS redirect loops, plain `curl http://` works) | No explicit license. A non-commercial scholarly mirror of print editions (PSRL, Shevchenko's complete works, anthologies). Cite the print edition. | Implicit only: the page is per work and the editor's preface gives the edition. Needs a hand-built `work → year` table. | Static HTML, cp1251 | Feasible, but see the font issue (§1.8). Scrape politely. | **The key source for the 11th–18th c.**: Hypatian and Laurentian chronicles, Ilarion, Smolyatych, Zatochnyk, Vyshensky, Smotrytsky's *Grammar*, Berynda's *Lexicon*, the Samovydets chronicle |
| ukrlib | Українська література (ukrlib.com.ua) | https://www.ukrlib.com.ua | Rights reserved. Texts reproduced without edition data. | Author and title only. No edition, often modernised spelling. | HTML | Technically easy, but legally and evidentially weak | **Do not use as evidence**, only as a lookup aid |
| mova | Корпус української мови, mova.info (KNU computational linguistics lab) | http://www.mova.info/corpus.aspx | Not stated | Filters for author gender, morphology and "search zone" (text selection). Per-hit author is shown in citation mode. | Web UI, login for a custom corpus | UI only | Secondary cross-check for 20th c. literary texts |

### 1.2 How the corpora map onto periods

| period | primary | secondary |
|---|---|---|
| 11th–13th c. (Rus'/Kyivan) | izbornyk (PSRL editions of the Hypatian and Laurentian chronicles; Ilarion; *oldukr2/* texts) | Wikisource |
| 14th–18th c. (Ruthenian/"проста мова") | izbornyk (*old14_16/*, *old17/*, *old18/*, Smotrytsky, Berynda, Zyzaniy) | Wikisource scans |
| 1798–1920 | PluG (bulk), GRAC (dating) | Wikisource (with the edition named) |
| 1920–now | GRAC | mova.info, UberText (frequency only) |

### 1.3 Checked facts (fetched 2026-10-11)
- GRAC dates each text by **year of writing** (`DOC.DATE`). Publication year is a separate field, `DOC.PUBLICATIONYEAR`. Granularity is the year, and range queries use regex (`19[89].`). Source: https://uacorpus.org/rozmitka-tekstiv/datuvannya
- GRAC also offers Rada_Trees (parliament transcripts 1990–2024, 88M tokens, on Hugging Face) and ParaFarm.
- Brown-UK `meta/meta.csv` header (fetched): `group,cat,file,author_surname,author_name,title,publ_in,url,publ_part,publ_place,publisher,year,pages,length,alt_orth,proofread,errors,comments`.

### 1.8 Ізборник encoding caveat
The pages are cp1251, but early-Cyrillic letters are rendered either through a custom font (ѣ shows up as `Ђ` after cp1251 decoding, e.g. `въ худЂ` = `въ худѣ`) or as numeric entities (`&#1123;` = ѣ, `&#1127;` = ѧ, `&#1237;` = ӕ-like ligature). Chronicle pages also have inline collation numbers (`пошла Руска&#1237; земл&#1127; стала 21`). The ingest pipeline needs (a) a per-site char map, (b) footnote-number stripping, and (c) storage of both `raw` and `normalised` strings. Without this, string matching on Old East Slavic forms will fail silently.

---

## 2. Author-vetting model

### 2.1 Principles
1. **The evidence must be the author's own words** (endonym or self-descriptor), or a self-chosen public act (a pseudonym, a signature formula, membership of a national organisation). What others say about the author is recorded but never sufficient alone.
2. **Use the period-appropriate ethnonym.** "Русь/руський" (11th–13th c.), "русин/руський/Roxolanus" (14th–19th c., and in Galicia, Bukovina and Transcarpathia to ~1918), "малоросійський/малоросіянин" (18th–19th c., Hetmanate and Russian Empire), "українець" (19th c. onward). All count, but they get different **labels**, so downstream users can filter.
3. **Language of the text is a separate test.** An author can pass the identity test and still write the relevant text in Polish, Latin or Russian. Only texts in Ukrainian or Ruthenian (incl. Church Slavonic of the Kyivan or Ruthenian redaction, flagged as such) can provide attestations.
4. **No quote without a URL and a fetch date.** An unverified quote stays in `status=unverified` and does not let the author pass.

### 2.2 Schema (compact, auditable)

```yaml
author:
  id: shevchenko_taras           # stable slug
  name_uk: Тарас Шевченко
  born: 1814; died: 1861         # ints; uncertain → "c.1030" in *_note
  label: ukrainian               # ukrainian | ruthenian | ruthenian-rus | malorossian | institutional | excluded
  status: vetted                 # vetted | provisional | unverified | excluded
  evidence:                      # ≥1 item with kind=self and verification ∈ {fetched, scholarly}
    - kind: self                 # self | self-act | exo
      term: "Украйна / земляки"  # the ethnonym/self-descriptor used
      quote: "…"                 # ≤ 25 words, verbatim, original orthography
      work: "І мертвим, і живим… посланіє"
      year: 1845
      locator: "title"
      url: https://…
      edition: "Повне зібр. творів, т.1"   # print edition behind the URL
      verification: fetched      # fetched | scholarly | secondary | unverified
      fetched_at: 2026-10-11
      checked_by: agent|human-id
  disputes: [ "…free text…" ]
  lang_policy: "uk-texts-only"   # which of their texts count
```

**Pass rule.** `status=vetted` requires at least one `kind ∈ {self, self-act}` item with `verification ∈ {fetched, scholarly}`. A single `secondary` item gives `provisional`, which is allowed in the MVP but shown with a warning badge. `exo` alone always gives `unverified`.

**Confidence (derived, not entered by hand):**
- `explicit`: the author uses an ethnonym of himself or herself or "us" ("наша русь", "я українець", a self-chosen pseudonym "Українка").
- `implicit`: identification through "our land", "my Ukraine", "земляки", or programmatic writing in the vernacular and for it, without a first-person ethnonym.
- `disputed`: a scholarly dispute about attribution, identity or nationality (see §2.4).

### 2.3 Seed list (≈40 authors)

Lifespans are standard reference values. Quote cells with ⟂ mean no verbatim quote has been fetched yet. **These are research tasks, not evidence.** I have deliberately not written quotes I could not fetch.

| id | name_uk | lifespan | label | self_term | quote (verbatim, original) | source_url | verification | confidence | notes |
|---|---|---|---|---|---|---|---|---|---|
| ilarion | Іларіон Київський | fl. 1037–1055 | ruthenian-rus | "Руська [земля]" | "Не въ худѣ бо и невѣдомѣ земли владычьствоваша, нъ въ Руськѣ, яже вѣдома и слышима есть всѣми четырьми конци земли" | http://izbornyk.org.ua/oldukr2/oldukr01.htm | fetched | explicit | *Слово о законі і благодаті*. The first metropolitan of Rus' origin. |
| kyiv_chron | Київський літописець (ПВЛ; трад. Нестор) | text c.1113 | institutional | "Руская земля" | "…откуду єсть пошла Рускаӕ земля…" (Hypatian; collation numbers stripped) | http://izbornyk.org.ua/ipatlet/ipat01.htm | fetched | explicit | Nestor's authorship is disputed (Sylvester's 1116 redaction). Use the institutional author; see §3.3. |
| nestor | Нестор Літописець | c.1056–after 1113 | ruthenian-rus | "Руская земля" | ⟂ (attested in *Житіє Феодосія* / *Чтеніє о Борисі і Глібі*) | — | unverified | disputed | Attribute only works securely his (the *Чтеніє*, the *Житіє*), not the ПВЛ. |
| volyn_chron | Галицько-Волинський літописець | text c.1290 | institutional | "Руская земля" | ⟂ | http://izbornyk.org.ua/ipatlet/ipat.htm | unverified | explicit (expected) | Part of the Hypatian codex |
| monomakh | Володимир Мономах | 1053–1125 | ruthenian-rus | "русьскый" (of himself) | "Азъ худый, дѣдомъ своимъ Ярославомъ, благословленымъ, славнымъ, нареченѣмь въ крещеніи Василий, русьскымь именемь Володимиръ" | http://izbornyk.org.ua/oldukr/pouch.htm | fetched | explicit | Tied to Kyiv and Pereiaslav, but also ruled Rostov and Suzdal |
| smoliatych | Климентій Смолятич | d. after 1164 | ruthenian-rus | exo: chronicle "в Рускои земли" | ⟂ | http://izbornyk.org.ua/oldukr2/oldukr29.htm | unverified | disputed | From Smolensk. Metropolitan of Kyiv 1147–55. The evidence is the chronicler's, not his own. Grepped the fetched *Посланіє* (oldukr29.htm, 2026-10-11) for рус-/смол-: no self-ethnonym found. Exo evidence only, so it stays `unverified`. |
| turovsky | Кирило Туровський | c.1130–c.1182 | ruthenian-rus | — | ⟂ | — | unverified | disputed | Turov lies in today's Belarus but was a Rus' principality in the Kyivan orbit. Shared Belarusian and Ukrainian heritage. The label stays `ruthenian-rus`, and his attestations must be tagged `region=Turov`. |
| zatochnyk | Данило Заточник | late 12th–13th c. | ruthenian-rus | — | ⟂ | http://izbornyk.org.ua/oldukr2/oldukr33.htm | unverified | disputed | Identity is unknown. The addressee was Yaroslav (Pereiaslav-Rus' or Pereslavl-Zalessky?). Recommend `excluded` from first attestation until resolved. Grepped the fetched *Моління* (oldukr33.htm, 2026-10-11) for рус-/переясл-: no ethnonym found. |
| slovo_igor | Автор «Слова о полку Ігоревім» | c.1187 | institutional | "Руская земля" | ⟂ | — | unverified | disputed | Anonymous, and the manuscript is lost (1800 edition). Use with the flag `witness=1800-edition`. |
| ostroh_smotr | Герасим Смотрицький | d. 1594 | ruthenian | "руський" | ⟂ | http://izbornyk.org.ua/old14_16/old14.htm (#sm1) | unverified | explicit (expected) | Preface to the Ostroh Bible, 1581 |
| vyshensky | Іван Вишенський | c.1550–c.1621 | ruthenian | "наша русь", "русин", "пѣснь руская" | "…болгаре, словяне, арабанаши, мултяне, богданци, москва и наша русь…"; "простою же нашею пѣснию рускою поюще" | http://izbornyk.org.ua/old14_16/old14_19.htm | fetched | explicit | *Книжка* (c.1600). Lived on Mount Athos; a native of Sudova Vyshnia (Galicia). |
| zyzaniy | Лаврентій Зизаній | c.1560–1634 | ruthenian | "руский/простый" | ⟂ | http://izbornyk.org.ua/zyzlex/zyz.htm | unverified | implicit | *Лексис* 1596: Church Slavonic glossed into "простая мова". A key lexical source. |
| smotrytsky | Мелетій Смотрицький | c.1577–1633 | ruthenian | "naród ruski" | ⟂ (*Θρῆνος*, 1610; Polish) | — | unverified | explicit (expected) | *Θρῆνος* is in Polish, so only the 1619 *Грамматіки* (Church Slavonic, Ruthenian redaction) counts as attestation, flagged `lang=csl-ru`. |
| berynda | Памво Беринда | c.1550s–1632 | ruthenian | "словенороський" | ⟂ | http://izbornyk.org.ua/berlex/be.htm | unverified | implicit | *Лексикон словенороський* 1627: the main early lexicon |
| mohyla | Петро Могила | 1596–1647 | ruthenian | "руський народ" | ⟂ | — | unverified | disputed | Moldavian princely family and Kyiv metropolitan. Most of his writing is in Polish or Church Slavonic. Admit only Ruthenian-language texts. |
| baranovych | Лазар Баранович | 1620–1693 | ruthenian | "русин", "руська мова" | Translation only: "Звір се дикий для русина — / Що польщизна, що латина." (tr. V. Krekoten from Polish *Lutnia Apollinowa*, 1671) | http://izbornyk.org.ua/old17/old17_18.htm | secondary (translation) | explicit (in the original, presumably) | **An audit lesson**: the fetched text is a modern Ukrainian translation. It is valid only after the Polish original is fetched. |
| samovydets | Самовидець (Р. Ракушка-Романовський?) | text 1672–1702 | institutional | "Україна/руський" | ⟂ | http://izbornyk.org.ua/samovyd/sam.htm | unverified | explicit (expected) | Attribution disputed, so use an institutional author |
| velychkovsky | Іван Величковський | c.1650–1701 | ruthenian | — | ⟂ | http://izbornyk.org.ua/old17/old17.htm | unverified | implicit | *Зегар з полузегарком* 1690 |
| velychko | Самійло Величко | 1670–c.1728 | malorossian | "малороссійская отчизна" (expected) | ⟂ | — | unverified | implicit | Chronicle 1720. Check the Kyiv 1848–64 edition. |
| skovoroda | Григорій Сковорода | 1722–1794 | malorossian | "Малороссия" | ⟂ | — | unverified | implicit | Wrote in bookish Slaveno-Russian with Ukrainian elements. Lexically mixed, so attestations need a `register=bookish` flag. |
| kotliarevsky | Іван Котляревський | 1769–1838 | malorossian | "малороссійскій языкъ" | ⟂ (title of the 1809 ed.: "…на малороссійскій языкъ перелицїованная…") | https://uk.wikisource.org/wiki/Енеїда_(Котляревський) (Berlin 1922 ed. only) | unverified | implicit | The 1798 edition was published without his consent (Parpura). Use the 1809 or 1842 editions as witnesses. Secondary sources disagree on the 1809 title wording ("перелицованная" vs "преложенная", e.g. https://fantlab.ru/work491122), so a scan of the 1809 title page is required. |
| kvitka | Григорій Квітка-Основ'яненко | 1778–1843 | malorossian | "малороссійскій" | ⟂ (letters to Pletnyov defending the language) | — | unverified | implicit | |
| hulak_art | Петро Гулак-Артемовський | 1790–1865 | malorossian | — | ⟂ | — | unverified | implicit | Fables from 1818 |
| shevchenko | Тарас Шевченко | 1814–1861 | ukrainian | "земляки… в Украйні" | "І мертвим, і живим, і ненарожденним землякам моїм в Украйні і не в Украйні моє дружнєє посланіє" (1845) | https://osvita.ua/school/literature/sh/63737/ | secondary | implicit→explicit | Re-verify against izbornyk's *Повне зібрання творів*. His Russian-language prose (diary, novellas) is excluded. |
| kulish | Пантелеймон Куліш | 1819–1897 | ukrainian | "українець/русин" | ⟂ | — | unverified | explicit (expected) | Also wrote in Russian; use only his Ukrainian texts. Inventor of the *кулішівка* spelling, so store `orth=kulishivka`. |
| vovchok | Марко Вовчок (Марія Вілінська) | 1833–1907 | excluded→provisional | — | ⟂ | — | unverified | disputed | Born in Oryol gubernia, ethnically Russian, but wrote major Ukrainian prose (*Народні оповідання*, 1857). **Fails the self-identification test as written.** Options: (a) exclude, or (b) add a separate label `uk-language-author` that does not count for "Ukrainian author" provenance. Recommend (b), not counted by default. |
| nechuy | Іван Нечуй-Левицький | 1838–1918 | ukrainian | "українці" | ⟂ (*Сьогочасне літературне прямування*, 1878; *Українство на літературних позвах з Московщиною*, 1891) | — | unverified | explicit (expected) | |
| myrnyi | Панас Мирний | 1849–1920 | ukrainian | — | ⟂ | — | unverified | implicit | |
| drahomanov | Михайло Драгоманов | 1841–1895 | ukrainian | "українець" | ⟂ | http://izbornyk.org.ua/drag/drag.htm | unverified | explicit (expected) | Publicist. Useful for 19th-c. political vocabulary. |
| franko | Іван Франко | 1856–1916 | ruthenian→ukrainian | "русин"/"українець" | ⟂ (*Теперішня хвиля і русини*, 1883; *Поза межами можливого*, 1900) | — | unverified | explicit (expected) | Galician "русин" in the 1880s, "українець" by the 1900s. Note the label shift by year. |
| hrinchenko | Борис Грінченко | 1863–1910 | ukrainian | "українці" | ⟂ (*Листи з України Наддніпрянської*, 1892–93) | — | unverified | explicit (expected) | Compiler of the *Словарь української мови* (1907–09), a key lexical source but secondary (dictionary) |
| lesya | Леся Українка (Лариса Косач) | 1871–1913 | ukrainian | pseudonym "Українка" | n/a: self-chosen pseudonym, first used 1884 (*Конвалія*, *Сафо*, Lviv *Зоря*) | — | scholarly (standard bibliography; fetch a scan of *Зоря* 1884) | explicit | Kind `self-act` |
| kotsiubynsky | Михайло Коцюбинський | 1864–1913 | ukrainian | — | ⟂ | — | unverified | implicit | |
| kobylianska | Ольга Кобилянська | 1863–1942 | ruthenian→ukrainian | "русинка" | ⟂ | — | unverified | disputed | Early works in German. Count only her Ukrainian texts. |
| stefanyk | Василь Стефаник | 1871–1936 | ruthenian→ukrainian | "русин" | ⟂ | — | unverified | explicit (expected) | Deputy in the Austrian Reichsrat; later in the West Ukrainian People's Republic (ЗУНР) |
| khvylovy | Микола Хвильовий | 1893–1933 | ukrainian | "Україна чи Малоросія?" | ⟂ (pamphlet title 1926; text published 1990) | — | unverified | explicit (expected) | Dating: **written 1926, published 1990.** GRAC dates by writing year, which suits us. |
| tychyna | Павло Тичина | 1891–1967 | ukrainian | — | ⟂ | — | unverified | implicit | |
| rylsky | Максим Рильський | 1895–1964 | ukrainian | — | ⟂ | — | unverified | implicit | Of Polish-gentry descent ("Rylski"). Needs explicit evidence. |
| zerov | Микола Зеров | 1890–1937 | ukrainian | — | ⟂ | — | unverified | implicit | |
| honchar | Олесь Гончар | 1918–1995 | ukrainian | — | ⟂ | — | unverified | implicit | |
| stus | Василь Стус | 1938–1985 | ukrainian | "українець" | ⟂ (prison statements and letters) | — | unverified | explicit (expected) | |
| kostenko | Ліна Костенко | b. 1930 | ukrainian | — | ⟂ | — | unverified | implicit | Living author: copyright applies, so store only short snippets |
| gogol | Микола Гоголь | 1809–1852 | excluded | — | — | — | — | — | Russian-language works. Excluded by language, whatever his identity. |

Count: 43 rows, of which 41 are candidates and 2 are excluded or provisional.

### 2.4 Hard cases and the rule for each
- **Pre-ethnonym Rus' (11th–13th c.)**: the self-term is "Русь/руськая земля". The label is `ruthenian-rus`. These authors are a shared East Slavic heritage, so in the UI the provenance reads "Kyivan Rus' author", never "Ukrainian author". Attestations from Vladimir-Suzdal or Novgorod writers (Laurentian or Novgorod chronicle passages written there) get `region` tags. Only Kyiv, Chernihiv, Pereiaslav, Halych-Volhynia and Turov count for "ruthenian-rus" by default, and Turov carries a flag.
- **Language-only authors** (Marko Vovchok): a separate label, not counted by default.
- **Multilingual authors** (Smotrytsky, Mohyla, Baranovych, Kobylianska, Kvitka, Shevchenko's prose): the gate is per text, through `text.lang`.
- **Disputed attribution** (ПВЛ/Nestor, Samovydets, *Слово о полку*): use an institutional author.
- **Translations as evidence**: never. Fetch the original (Baranovych case).

---

## 3. Rule for the "first-attesting author"

### 3.1 Definitions
- **Attestation**: `(form | lemma, text_id, locator, witness_date, author_id)`, where the text passes the language gate and the author has `status ∈ {vetted, provisional}`.
- **witness_date**: the best-supported date of *composition*, taken in this order: (1) a dated autograph or manuscript; (2) GRAC `DOC.DATE` (year of writing); (3) the date of the first edition; (4) a scholarly composition range, stored as `[from, to]`.
- **first_attesting_author(lemma)** = the author of the attestation with the earliest `witness_date.to` (the latest possible date, a conservative "certainly by"). The record also stores `witness_date.from`.

### 3.2 Tie-breaking (applied in order)
1. Prefer `status=vetted` over `provisional`.
2. Prefer the narrower date range (a smaller `to - from`).
3. Prefer an author original over a manuscript copy, and a copy over a modern edition. Store `witness_type ∈ {autograph, ms_copy, first_ed, later_ed}`.
4. Prefer a **named individual** over an institutional author.
5. If it is still tied, keep **both** as `co_first` (an array). Never pick silently.

### 3.3 Institutional authors
Anonymous or composite texts get synthetic authors with `label=institutional` and the identity evidence of the text community, e.g.
`kyiv_chron` "Київський літописець (ПВЛ, ред. 1113/1116)", `volyn_chron` "Галицько-Волинський літописець", `samovydets` "Літопис Самовидця". Dates are the redaction dates, not the year of the annal entry. A form in the 1015 entry of the ПВЛ is dated **c.1113**, and the oldest manuscript witness (Laurentian 1377, Hypatian c.1425) goes in `witness_ms_date`.

### 3.4 What gets shown and stored
Every lexicon entry carries:
```
first_attestation: {author_id, work, locator, witness_date:[from,to], witness_type,
                    witness_ms_date?, source_corpus (izbornyk|grac|plug|wikisource),
                    source_url, edition, fetched_at, form_raw, form_normalised}
also_attested: [top-N later attestations]   # helps reviewers catch misdatings
```
Re-computation: when a new author is vetted, or a quote is promoted from `unverified`, recompute `first_attestation` for every lemma that author attests, and log the diff (audit trail).

### 3.5 Known biases to disclose in the UI
- "First attested" means first **in our vetted corpus**, not first in the language. Corpus coverage of 1600–1800 is thin.
- Dictionaries (Berynda 1627, Hrinchenko 1907–09) are attestations of the *lexicographer's* knowledge. Tag them `witness_type=dictionary` and treat them as weaker than running text in tie-break rule 3.
- Spelling systems (ярижка, максимовичівка, кулішівка, желехівка, Skrypnyk 1928, 1933, 2019) affect string matching. Normalise before comparing, and store the raw form.

---

## 4. Next actions
1. Fetch quotes for the ⟂ rows, priority: Kotliarevsky (1809 title page), Franko 1883, Hrinchenko 1892, Nechuy 1878, Kulish, Stefanyk, Smotrytsky's *Θρῆνος*, Baranovych's Polish original.
2. Pull the PluG Zenodo record and confirm its license and metadata fields.
3. Build the izbornyk char map (ѣ←`Ђ`, entity decoding, collation-number strip) and a `work→date` table for about 60 pre-1800 works.
4. Ask the GRAC team for research access or export terms for KWIC with `DOC.DATE` and author attributes.
