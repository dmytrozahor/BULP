# 01. Old sources: what's digitised and how to mine it

Researched 2026-10-11. **Verified** means I fetched the URL during this research and saw the content described. **Unverified** means it comes from search results or background knowledge and has not been checked.

## TL;DR: ranking for the MVP

| # | Source | Machine-readable? | ѣ/ъ/titlo kept? | License | Feasibility |
|---|---|---|---|---|---|
| 1 | TOROT treebank (GitHub) | Yes: PROIEL XML + CoNLL, lemma + morphology | Yes, real Unicode (`г҃и`, `ꙗ`, `ѧ`, `ѣ`) | CC BY-NC-SA 3.0 | **Best**: download one file |
| 2 | віра.укр Archangel Gospel 1092 | HTML, one verse per `div`, stable IDs | Yes, but in a **legacy font encoding** (э=ѣ, z=ѧ/ꙗ, digits = titlo) | not stated | Good: needs a decoder |
| 3 | izbornyk.org.ua / litopys.org.ua | static HTML, cp1251 + numeric entities | Yes (`&#1123;`=ѣ, `&#1127;`=ѧ, `&#1155;`=titlo) | not stated; academic mirror | Good: plain crawl, column refs in text |
| 4 | uk.wikisource | MediaWiki API, raw wikitext per scan page | Yes, original orthography (e.g. Енеїда 1798) | PD / CC BY-SA | Very good |
| 5 | Dictionaries (r2u, hrinchenko.com, goroh ЕСУМ, archive.org scans) | HTML / OCR txt | partly | mixed | Good for evidence, not for bulk import |
| ✗ | Ostromir Gospel full text | **No usable full Unicode text found** (only the colophon in TOROT plus PDFs) | — | — | Low |

---

## 1. Остромирове Євангеліє (1056–57)

**TOROT, colophon only (verified).** The repo is `https://github.com/torottreebank/treebank-releases`, with files `ostromir-col.xml` and `ostromir-col.conll`. The README lists *"Colophon to the Ostromir Codex | Old Russian | ostromir-col | 199 tokens"*. File metadata: *"Digitised from manuscript facsimile of the Ostromir Gospel available at http://www.nlr.ru/exib/Gospel/ostr/ill.html"*, edited by Catherine Sykes and Hanne Eckhoff, `<license>CC BY-NC-SA 3.0</license>`. Each token carries `form`, `lemma`, `part-of-speech` and `morphology`, for example `form="г҃и" lemma="господь"`. The latest release is tagged `20200116`, checked via the GitHub API.

**The Gospel text itself.** I found no open, full, machine-readable Unicode text.
- віра.укр/downloads (verified) hosts three PDFs on Google Cloud Storage:
  - `…/202602030027_698124efea0ed_ostromirovo_1056_1057.pdf`, the facsimile
  - `…/202602030028_698124fdb295d_ostromirovo_1056_1057_text.pdf`
  - `…/Остромирово_евангелие_1056-1057_года_по_изданию_А.Х._Востокова.pdf`

  The URL prefix for all three is `https://storage.googleapis.com/vira-upload/downloadable-books/files/2026/02/`. I downloaded the "_text" PDF (61 MB). Its text layer is **garbage OCR**: pdftotext gives output like "БАНЖНША(САКУХКЬ…". It is useless without re-OCR.
- Image viewer at NLR: `https://vivaldi.nlr.ru/bc000000414/view/` (unverified, from search). There is also the old NLR exhibit `http://www.nlr.ru/exib/Gospel/ostr/`, cited by TOROT.
- manuscripts.ru ("Манускрипт", see §2) did not list Ostromir in the sections I could load. Several section pages timed out, so treat this as **unverified negative**.
- The Vostokov 1843 edition is a scan on archive.org (unverified, per search). It is a scan, not text.

**Recommendation.** For the MVP, use the TOROT colophon only. The full Gospel would need OCR of the Vostokov edition, which is a later project.

## 2. Архангельське Євангеліє (1092)

**віра.укр (verified): the only full-text online edition found.**
- Index: `https://віра.укр/b/arch-gospel`. Self-description (meta): *"Архангельське Євангеліє, 1092р., написане ймовірно в Києві, пам'ятка Київської Руси та української писемності"*.
- Chapter URL: `/b/arch-gospel/{matt|mark|luke|john}-cs-ar-{N}`. The index exposes 37 chapter links.
- Verse anchor: `#{book}-cs-ar-{N}:{v}`. HTML is `<div id="matt-cs-ar-1:1" …>` followed by `<div class="verse-body cs-arch">TEXT</div>`.
- Printable view: `/b/arch-gospel/matt-cs-ar-1/print?chapters_count=1&mode=regular&print=1`.
- **Encoding pitfall.** Text is rendered with the font `UstavUCS3.ttf` (CSS `.cs-arch`), so the HTML holds a font-specific transliteration:
  - `э` → ѣ (`бэ`, `свэтъ`, `вавилоньсцэмь`)
  - `z` → ѧ/ꙗ (`сънzстасz`)
  - `U` → ѹ/оу (`юдU`, `мUжа`)
  - `t` → ѿ
  - `w` → ѡ
  - digits / `©` / `™` / `¦` = titlo or superscript letters (`iс7ъ хв7а` = і҃съ х҃а)

  Real Unicode `ѥ`, `ѫ` and `ѩ` are mixed in. **A mapping table must be built** by comparing against the font, before matching forms.
- The Mironova scholarly edition is downloadable as a PDF from /downloads: *"Архангельское Евангелие 1092 года. Исследования. Древнерусский текст. Словоуказатели, Миронова_compress.pdf"*. A manuscript facsimile PDF is also there.
- License: none stated. robots.txt contains only `Disallow: /login`. Scraping is technically fine; contact admin.vira@ukr.net before redistributing.
- manuscripts.ru (verified homepage only) describes itself: *"сайт содержит коллекции древнейших и средневековых славянских и русских текстов"*. Its project pages carry *"© Авторы разрешают свободное копирование всех материалов электронного издания"*. It has a section "Славянские Евангелия XI - XIV веков" at `portal.main?p1=…`. **I could not confirm** that the Archangel or Ostromir Gospel is in it, because pages timed out. Its TLS cert is broken (use http). Text pages have the pattern `mns/main?p_text=<id>`.

## 3. віра.укр (`xn--80ad6b1e.xn--j1amh` = **віра.укр**)

- **What it is (verified).** *"Віра.Укр – портал про основи Православної віри та особливості українського обряду. Актуальний церковний календар на сьогодні, молитви та богослужбові читання."* It is a Laravel-style site with bootstrap, Google Analytics, and a mirror domain `viraukr.net` that appears in `data-link`. Telegram: @kyiv_izvod.
- **Київський ізвод, as the site defines it** (`/b/molytvoslov-cs-ukr/vstup`): *"У назві даного молитвослова Київський ізвод означає саме українську вимову, або транслітерацію… Усі молитви транслітеровані з синодальної редакції"*. So the prayer book is **modern Ukrainian-letter transliteration** of the Synodal CS text, not a historical source. Do not use it as an attestation of old forms. It is useful as a statement of pronunciation norms, for example *"Ѣ завжди транслітерується як і"*. It also cites old forms: *"у київських Євангеліях XI ст. (Остромирове, Архангельське, Мстиславове та ін.) зустрічаємо форми: отця, отцю, отець"*, *"прецедент у Луцькому псалтирі 1384 року"*, and the Полуустав Петра Могили 1643 (*Утѣши́телю*).
- **Structure.** Books are at `/b/{slug}` and sections at `/b/{slug}/{section}`. Useful slugs:
  - `arch-gospel` (historical, see §2)
  - `molytvoslov-cs-ukr` (ізвод transliteration)
  - `molytvoslov-cs` (CS)
  - `psaltyr-sliduvany`
  - `bible-ukr-filaret`
  - `sluzhebnyk-cs-ukr`, `trebnyk-cs-ukr`
  - `/bible-search` (search) and `/cs-type` (CS text editor)
- **Downloads** (`/downloads`, verified) is the most valuable part for this project. Direct GCS PDF links include:
  - Остромирове (3 PDFs)
  - Архангельське (facsimile + Mironova)
  - **Київський Псалтир 1397** (facsimile + `kyiv-psaltyr_1397_text.pdf`)
  - **Острозька Біблія 1581** (also a version with a Ukrainian translation)
  - **Полуустав Петра Могили 1643** (`1643_Poluustav_Petro_Mohyla.pdf`)
  - Служебник Львів 1691
  - Молитовник Ц-СЛ-УКР 1917
  - граматика василіян 1958
  - Шевченко "Давидові Псалми"

  These are scans; text layers are unverified, apart from the Ostromir one, which is garbage.
- **Sample lines** (verbatim HTML, Archangel Gospel, with decoding in brackets):
  1. `/b/arch-gospel/john-cs-ar-1#john-cs-ar-1:1`: «Искони бэ слово. и слово бэ отъ бога. и богъ бэ слово.» [бѣ]
  2. `john-cs-ar-1:4`: «въ томь животъ бэ и животъ бэ свэть чловэкомъ.» [свѣтъ, чловѣкомъ]
  3. `john-cs-ar-1:5`: «и свэтъ въ тьмэ свьтить сz и тьма ѥго не обьѩтъ.» [тьмѣ, ся]
  4. `matt-cs-ar-1:12`: «по преселѥнии же вавилоньсцэмь. иохониа же роди. салафиила.»
  5. `matt-cs-ar-1:1`: «Книгы р9ства iс7ъ хв7а. сн7а авраамова.» [титла]

## 4. Kyivan literature of all periods

### izbornyk.org.ua, mirrored at litopys.org.ua (verified)
- Self-description: *"«Ізборник» — Історія України IX-XVIII ст. Першоджерела та інтерпретації — проект електронної бібліотеки давньої української літератури."*
- Encoding is `windows-1251`, with **Old Cyrillic as numeric entities**: `кн&#1127;земъ` = кнѧземъ, `Києв&#1123;` = Києвѣ, `Ст&#1155;ополкъ` = С҃тополкъ, `&#1120;легъ` = Ѡлегъ. **ѣ, ѧ, ї, titlo and і are preserved.** Decode with cp1251 and then html-unescape.
- Column references appear inline ("стб.1"). The Іпатський список is in ПСРЛ т.2 edition with apparatus notes (footnote numbers are mixed into the text, so strip digits carefully).
- Key URLs (all verified as links on the home page or section page):
  - `ipatlet/ipat.htm` → `ipatlet/ipat01.htm`…: Літопис руський (Іпатський); includes ПВЛ
  - `lavrlet/lavr.htm` → `lavrlet/lavr01.htm`: Лаврентіївський
  - `novglet/novg.htm`, `psrl3235/lytov.htm` (Литовсько-білоруські літописи), `samovyd/sam.htm` (Самовидець)
  - `oldukr2/oldukr2.htm`: Тексти XI–XIII ст. It includes Борис і Гліб, «Ізборник Святослава 1073 року (уривок, переклад)» (`oldukr57.htm`), «Ізборник Святослава 1076 року (уривки)» (`oldukr58.htm`), Хожденіє Даніїла (`oldukr19.htm`) and Правда Руська. **Note:** `oldukr58.htm` turned out to be a *modern Ukrainian translation*, not the original text.
  - `old14_16/old14.htm`, `ukrpoetry/anto.htm` (поезія XVI–XVII), `old17/old17.htm`, `old18/old18.htm`: the places to look for полемісти, Вишенський, Смотрицький and Сковорода. I did not drill into these; **unverified** which have the original orthography.
  - `slovo/slovo.htm`: Слово о полку Ігоревім. Meta: *"Слово про Ігорів похід - найвизначніша пам'ятка давньої українськ[ої літератури]"*.
  - `shevchenko/shevh.htm` (works) and **`shevchenko/slovn.htm` (Шевченківський словник)**
  - `pravopys/pravopys2015.htm`, `ukrmova/um.htm` (енциклопедія «Українська мова»)
- License: none found on the about page. Treat it as "cite, don't redistribute".

### TOROT (verified), the best structured old-East-Slavic data
Relevant files in `treebank-releases` (README token counts):
- `pvl-hyp` *"The Primary Chronicle, Codex Hypatianus"* (3,610 tokens; from *"The e-PVL"* by Ostrowski/Birnbaum/Lunt, `http://pvl.obdurodon.org/`)
- `lav` (ПВЛ Лаврентіївський, 56,725 tokens)
- `kiev-hyp` (Київський літопис, 544 tokens)
- `spi` (Слово о полку, 2,850 tokens; *"a slightly corrected version of the first edition from 1800"*, source `http://nevmenandr.net/slovo/`)
- `rusprav`, `usp-sbor`, `kiev-mis`, `mstislav-col`, `ostromir-col`, `birchbark`

`citation-part` gives column.line, for example `25.10`. Raw URL pattern: `https://raw.githubusercontent.com/torottreebank/treebank-releases/master/{id}.xml`.

### Ukrainian Wikisource (verified)
- `uk.wikisource.org/wiki/Енеїда_(1798)`. Header: *"Малороссійская Енеида въ трехъ частяхъ… рік = 1798 … правопис = ЯГ"*, license `{{PD-auto}}`.
- Per-scan-page raw text: `index.php?title=Сторінка:Котляревський. Енеида на малороссійскій языкъ перелицїованная. 1798.pdf/{n}&action=raw`. The first stanza is at page 11, with proofreading level 4 (validated).
- The orthography is the original *ярижка* (ѣ, ъ, ы). Ideal for first-attestation of Ukrainian forms.
- The API (`action=parse&prop=wikitext`) works. Other titles (PVL, Кобзар 1840) were not found under my guessed names; **unverified**.

## 5. Historical dictionaries as evidence

| Dictionary | Online? | URL / pattern | Notes |
|---|---|---|---|
| Словник староукраїнської мови XIV–XV ст. (1977–78) | Scans + OCR on archive.org (verified) | `archive.org/details/staroukr1` (Т.1 А–М), `staroukr2` (Т.2 Н–Ф), `strukrainsk` | Not queryable; OCR text via `/download/{id}/{id}_djvu.txt` (pattern verified for slovn6) |
| Словник української мови XVI – пер. пол. XVII ст. (ІУ НАНУ, Львів) | Scans on archive.org (verified) | `archive.org/details/slovn6`, `slovn7`, `slovn12`, `slovn14`, `SUM-28`… | slovn6 description: *"Випуск містить 1214 слів на літери В (выпросити – вѳундрованьє) і Г (г – головный)"*; files include `slovn6_djvu.txt` and `_abbyy.gz`. No official online search found |
| Срезневский, Материалы (1890–1912) | archive.org scans (verified listing) | `materialydljaslovarjadrevnerusskagojazy47` (Т.1 А–К), `I.I.Sreznevsky.DrevnerusskySlovar` | Public domain; sreznevskiy.ru did not respond (unverified) |
| Грінченко, Словарь (1907–09) | **Queryable** (verified) | `https://hrinchenko.com/dictionary/word/{id}-{translit}` (self-description: *"Онлайн версія словника української мови за редакцією Бориса Грінченка, що містить тлумачення понад 60 тисяч слів."*); `https://r2u.org.ua/s?w={word}&scope=all&dicts=12` (dicts=12 is the 1907–09 edition, 18 is the 3rd edition 1927–28) | r2u keeps the **source sigla** ("Котл. Ен. І. 24", "Кв. II. 19", "Шевч. 8", "Ном. № 7159"), which are direct first-author pointers. Glosses are in pre-1917 Russian orthography (ѣ, ъ) |
| ЕСУМ | Queryable via goroh (verified) | `https://goroh.pp.ua/Етимологія/{word}` | Gives the псл./др./стсл. forms, e.g. *"псл. xlěbъ … др. хлѣбъ … стсл. хлѣбъ"* |

---

## Seed attestations (all seen during this research)

Normalised forms for the Archangel Gospel come from decoding the font encoding: э→ѣ, z→ѧ, U→ѹ.

| # | Form as written | Normalised / lemma | Source | Location | Date |
|---|---|---|---|---|---|
| 1 | бэ | бѣ (быти, 3sg past) | Архангельське Єв. | віра.укр `john-cs-ar-1:1` | 1092 |
| 2 | искони | искони | Арханг. Єв. | `john-cs-ar-1:1` | 1092 |
| 3 | свэтъ | свѣтъ | Арханг. Єв. | `john-cs-ar-1:5` | 1092 |
| 4 | чловэкомъ | чловѣкомъ (чловѣкъ, dat.pl.) | Арханг. Єв. | `john-cs-ar-1:4` | 1092 |
| 5 | тьмэ | тьмѣ (тьма, loc.) | Арханг. Єв. | `john-cs-ar-1:5` | 1092 |
| 6 | съвэдэтельство | съвѣдѣтельство | Арханг. Єв. | `john-cs-ar-1:7` | 1092 |
| 7 | вавилоньсцэмь | вавилоньсцѣмь | Арханг. Єв. | `matt-cs-ar-1:12` | 1092 |
| 8 | пьрвэньць | пьрвѣньць | Арханг. Єв. | `matt-cs-ar-1:25` | 1092 |
| 9 | правьдьнъ | правьдьнъ | Арханг. Єв. | `matt-cs-ar-1:19` | 1092 |
| 10 | ѥго | ѥго | Арханг. Єв. | `matt-cs-ar-1:2` | 1092 |
| 11 | тебѣ | ты (dat.) | Остромирове Єв., colophon | TOROT `ostromir-col.xml` | 1056–57 |
| 12 | цр҃ю | цѣсарь (voc.) | Остромирове, colophon | TOROT `ostromir-col` | 1056–57 |
| 13 | кънѧзоу | кънязь (dat.) | Остромирове, colophon | TOROT `ostromir-col` | 1056–57 |
| 14 | ꙗрослава | ярославъ | Остромирове, colophon | TOROT `ostromir-col` | 1056–57 |
| 15 | володимира | володимиръ (gen.) | Остромирове, colophon | TOROT `ostromir-col` | 1056–57 |
| 16 | оконьчахъ | оконьчати (aor. 1sg) | Остромирове, colophon | TOROT `ostromir-col` | 1056–57 |
| 17 | киевъ | кыевъ | ПВЛ, Іпатський сп. | TOROT `pvl-hyp` 25.10 (year 6406) | ms. c. 1425; text 1110s |
| 18 | зоветь | зъвати (3sg, soft -ть) | ПВЛ Іпат. | `pvl-hyp` 25.11 | same |
| 19 | н҃нѣ | нынѣ | ПВЛ Іпат. | `pvl-hyp` 25.11 | same |
| 20 | днѣпру | дънѣпръ (dat.) | ПВЛ Іпат. | `pvl-hyp` 25.12 | same |
| 21 | кыевѣ | кыевъ (loc.) | ПВЛ Іпат. | `pvl-hyp` 29.20 | same |
| 22 | Києв&#1123; | Києвѣ | Іпатський літопис, list of princes | izbornyk `ipatlet/ipat01.htm`, стб.1 | ms. c. 1425 |
| 23 | Києвьскы | києвьскыи | Іпатський літопис | izbornyk `ipat01.htm`, стб.1 | ms. c. 1425 |
| 24 | лѣпо | лѣпыи | Слово о полку | TOROT `spi`, §1 (ed. 1800) | ed. 1800 |
| 25 | пълку | пълкъ (loc.) | Слово о полку | TOROT `spi` §1 | ed. 1800 |
| 26 | былинамь | былина (dat.pl.) | Слово о полку | TOROT `spi` §2 | ed. 1800 |
| 27 | паробокъ моторный | паробок моторний | Котляревський, Енеида | uk.wikisource, scan p.11, line 1 | 1798 |
| 28 | хлопець | хлопець | Котляревський | same, line 2 | 1798 |
| 29 | винъ | він (ikavism і written as и) | Котляревський | same, line 3 | 1798 |
| 30 | Троянцивъ | троянців (gen.pl. -ів written as -ив) | Котляревський | same, line 8 | 1798 |
| 31 | бенькети | бенкети | Грінченко (cites Котл. Ен. І. 24) | r2u.org.ua dicts=12 | 1798 via 1907–09 |

The Ostromir colophon tokens have no folio `citation-part` in TOROT. The colophon sits at the end of the codex; I have not verified the folio number.

## Open issues / unverified

- No full Unicode Ostromir text found. CCMH, TITUS and ruscorpora were not checked directly.
- The manuscripts.ru catalogue was only partly loaded because of timeouts.
- The izbornyk sections XIV–XVIII were not drilled (Вишенський, Смотрицький, Сковорода, Литовські статути).
- The віра.укр font mapping is not yet formalised. It needs a full table from UstavUCS3.ttf.
