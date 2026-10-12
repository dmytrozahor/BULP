# R16 — Sophia graffiti, Kyiv Glagolitic leaves, Слово о полку Ігоревім

Tags: [Q] verbatim-checked against fetched page · [P] paraphrase of fetched page · [U] unverified / not reached within the 25-call cap.
Budget used: 13 tool calls (cap 25). Several saintsophia.dh.gu.se pages returned only the title; portal details are therefore [U].

## 1. saintsophia.dh.gu.se (U-6, U-9)

| Item | Status | Evidence |
|---|---|---|
| Portal exists, public | [Q] page title only: "Saint Sophia's Inscriptions" (saintsophia.dh.gu.se, fetched 2026-10-12; /about returned the same title only) | WebFetch |
| Launch | [P] portal released 9 Dec 2024 by Univ. of Gothenburg, >7,000 inscriptions, 1000+ years, Church Slavonic, Latin, Armenian, Greek, possible Old Norse | [P] gu.se event page "release of open resource saint sophias inscriptions" https://www.gu.se/en/event/release-of-open-resource-saint-sophias-inscriptions ; news https://www.gu.se/en/news/researchers-document-thousand-year-old-graffiti-in-kyiv |
| Methods | [P] RTI (reflectance transformation imaging) and other digital techniques | gu.se research page https://gu.se/en/research/digital-documentation-of-inscriptions-in-the-saint-sophia-cathedral-in-kyiv |
| Project director | [P] Jonathan Westin (contact for URL and licence) | gu.se event page |
| Data types | [Q] resolved in R2.1 (was [U]) not confirmed; portal pages not readable | — |
| API / downloads / IIIF | [Q] resolved in R2.1 (was [U]) not confirmed | — |
| URL pattern for an inscription | [U] not confirmed; no inscription page fetched | — |
| Licence | [U] not confirmed; must be checked on the portal's own pages or asked from the director | — |
| Citation | [U] use portal's own "cite" text once readable | — |
| 10 verbatim inscriptions | [Q] resolved in R2.2 (was [U]) NOT obtained (no inscription page reached). Do not invent; obtain from portal or from Корнієнко/Висоцький (see §1b). | — |

Sub-status on the paper catalogues (1b):
- Висоцький, *Древнерусские надписи Софии Киевской XI–XIV вв.*, Киев, 1966 — [Q-bibliographic] cited in a bibliography reproduced by the search engine; source: https://chtyvo.org.ua/authors/Korniienko_Viacheslav/Naidavnishi_hrafiti_Sofii_Kyivskoi_ta_ii_datuvannia.pdf (locator: bibliography, not paged).
- Висоцький, *Киевские граффити XI–XVII вв.*, К., 1985 — [P] mentioned in a monograph on Spas-na-Berestove graffiti (chtyvo, Hordiienko, https://chtyvo.org.ua/authors/Hordiienko_Dmytro/Cpas_na_Berestovi_iak_pysemna_pamiatka.pdf).
- 1976 Висоцький volume — [U] NOT found; do not cite as a corpus volume until a bibliography confirms it.
- Корнієнко, *Корпус графіті Софії Київської* — [P] per Радіо Свобода https://www.radiosvoboda.org/a/2005788.html: ca. 500 inscriptions/drawings XI–XVI c. read and studied; Lb.ua https://lb.ua/society/2010/04/09/37339_nekompetentnist_chi_profanatsiya_.html: first part of monograph published, >400 graffiti, 2010, covers St George side-chapel (придільчастина св. Георгія). Full part-list [U].

Recommendation (for ingester/viewer, provisional): ingest only after portal's licence and export format are read; until then store witness metadata (catalogue no., Висоцький/Корнієнко ref) with `source=unverified-portal`. For the viewer, a IIIF-capable viewer (OpenSeadragon) is the default choice IF the portal exposes IIIF; otherwise plain image + RTI as static assets. [U] until the portal is read.

## 2. Київські глаголичні листки (Kyiv Missal / Kiev Folios) (U-18)

Treat as the last item (U-18 "at the very last").

| Claim | Tag | Evidence |
|---|---|---|
| 7 parchment folios, ~14.5 × 10.5 cm | [P] | https://en.wikipedia.org/wiki/Kiev_Missal (fetched) |
| Dating: "dated at no later than the latter half of the 10th century"; first page of folio 1 written "probably at the boundary of the 11th and 12th centuries" | [P] (Wikipedia summary of an article; the article's exact wording not reached) | same |
| Origin in article: "Linguistic, paleographic and graphic features indicate South Croatia as its place of origin." | [P]-quote from a cited article [U] for exact source | same |
| Dubrovnik-area attribution of first page portion (Pantelić) | [P] | same |
| Origin debate: Hamm 1979 — 19th-c. forgery by Czech patriots | [P] | same; encyclopediaofukraine says forgery claim not held by most Slavists |
| Pukanec: Eastern Obodrites / Ukraine region, 894–900 | [P] | https://www.encyclopediaofukraine.com/... (via search summary); [U] verify in Pukanec's book |
| Found in Jerusalem by Archimandrite Antonin Kapustin, given to Kyiv Theological Academy | [P] per Wikipedia (Jerusalem) — encyclopediaofukraine page does NOT mention Jerusalem; it says "In 1872 it was deposited in the library of the Kyiv Theological Academy" [Q] | https://www.encyclopediaofukraine.com/pages%5CK%5CY%5CKyivMissal.htm |
| Encyclopedia of Ukraine: origin "of undetermined origin" [Q] "seven parchment sheets of undetermined origin" | [Q] | same |
| First edition: Sreznevsky 1874 | [P] | Wikipedia |
| Current location: Vernadsky National Library of Ukraine, Kyiv | [P] | Wikipedia |
| Transcriptions online: Old Church Slavonic Institute (kiev.stin.hr); TITUS (titus.uni-frankfurt.de); MANUSCRIPT (manuscripts.ru) | [P] | Wikipedia external links; [U] none fetched, licence [U] |
| TOROT entry | [U] not checked | — |

Treatment proposal: a witness of Church Slavonic (Glagolitic) of disputed origin; origin field = `disputed` with both positions cited (Croatian/South-Croatian; Czech-forgery hypothesis; Pukanec's Eastern Obodrite thesis). Do not state Kyiv as place of writing (encyclopediaofukraine names only the depository). Linguistic class: "Bohemian-Moravian recension features" per Wikipedia summary [P]. Ingestion: use the stin.hr or TITUS transcription only after licence check [U]. Glagolitic graffiti in Kyiv: [U] not searched (budget).

## 3. Слово о полку Ігоревім (U-15)

| Claim | Tag | Evidence |
|---|---|---|
| Only the 1800 first edition survives as the basis; manuscript lost | [P] — the Musin-Pushkin manuscript burned in the 1812 Moscow fire is commonly cited, but NOT verified in fetched sources [U] | https://lk.msu.ru/uploads/attachments/attachment_1772_1584526194.pdf (acquisition, search summary); fire claim [U] |
| Musin-Pushkin acquired the codex from Archimandrite Ioil; date of acquisition disputed | [P] | search summary, svoboda.org/a/24196112.html |
| Early doubts: Musin-Pushkin, Bantysh-Kamensky, Malinovsky: manuscript is a copy (XV & XVII c.) not original | [P] | search summary |
| Dating of composition: late XII c. (Pritsak: after 1190–1192) | [P] | library.bdpu.org.ua PDF; gazeta.ua 2016 (anti-forgery article) https://gazeta.ua/articles/history/_comu-slovo-o-polku-igorevim-ne-falsifikat/676501 |
| TOROT text (spi) | [P] per research/01 line 108 (2,850 tokens, from nevmenandr.net, "slightly corrected version of the first edition from 1800") | research/01-old-sources.md |
| Insider self-reference «О Руская земле! уже за шеломянемъ еси!» | [U] — the line is in the text but the fetch of a candidate URL returned 404; verbatim locator not confirmed. Use the TOROT spi file as the verification source. | — |

Vetting (P-2): author unknown; `authors.ts` slovo_igor entry (research/06 line 103) remains "anonymous, institutional, unverified, disputed". Use `witness=1800-edition` flag as the brief already suggests.

Authenticity debate: both sides cited — (a) authentic XII c. (Pritsak and most Ukrainian/Russian philologists in cited sources [P]); (b) 1800 forgery claims by parts of 19th-c. and Soviet-era critics [U] not checked; the search summary did not show named forgery authors.

## 4. Open items (round 1; see Round 2 log below for resolutions)

1. Portal: data types, API/IIIF, URL pattern, licence, 10 verbatim inscriptions — need a successful read of a portal inscription page or the director's answer.
2. Висоцький 1976 volume — not confirmed.
3. Pukanec book bibliographic data — not verified.
4. Glagolitic graffiti in Kyiv — not searched.
5. TOROT kiev-mis / spi URLs — not fetched.
6. Slovo insider quote locator and forgery-advocate names — not verified.

---
## Round 2 log (FU-16, Sonnet, 2026-10-12)

Fetched (curl/PowerShell, once each): saintsophia.dh.gu.se/about and /robots.txt (both return the SPA shell, HTTP 200; **no robots.txt exists**, the catch-all serves index.html); /assets/index-D_6w-k34.js (2.7 MB bundle, grepped for API URLs); /api/ (DRF root listing); /api/inscriptions/data-summary/; /api/inscriptions/inscription/?depth=2&limit=300; /api/inscriptions/image/?type_of_image=1; http://kiev.stin.hr/; raw.githubusercontent.com/torottreebank/treebank-releases/master/kiev-mis.xml and spi.xml; http://izbornyk.org.ua/slovo/slovo.htm (cp1251). Not found: raw.githubusercontent.com/torottt/torot/... and proiel/proiel-treebank/... (404; the correct repo is torottreebank/treebank-releases as in research/01); torottt.github.io (404).

### R2.1 Portal data and API (resolves section 1 [U] rows)
| Item | Tag | Evidence |
|---|---|---|
| Public JSON REST API (Django REST Framework), base `https://saintsophia.dh.gu.se/api/`; no key needed | [Q] | GET /api/ lists endpoints under inscriptions/: tags, language, writingsystem, historicalperson, geojson/panel, panel, panel-metadata, coordinates, info/panels, panel-string, image, korniienko-image, object-rti, object-mesh-3d, inscription, search, autocomplete, data-summary |
| Bulk export is a portal feature: its JS pages through `inscription/?depth=2` following `next` and saves `inscriptionData.json` | [Q] | bundle index-D_6w-k34.js (string `inscriptionData.json`) |
| Size: `"count":4272` published inscriptions; types: textual 3184, pictorial 1017, composite 56; scripts: Cyrillic 2035, Latin 370, Greek 160, Armenian 31, mixed 7 (Glagolitic also listed) | [Q] | /api/inscriptions/data-summary/ and inscription/ |
| Inscription fields: title, panel (room, lon/lat geometry, medium, material), type_of_inscription, language (+ISO 639-3 URI), writing_system, min_year/max_year, dating_criteria, transcription (HTML), interpretative_edition, epidoc_text, epidoc_interpretation, romanisation, translation_eng, translation_ukr, comments_eng/ukr, genre (Wikidata URIs), mentioned_person, condition, alignment, bibliography, author, inscription_iiif_url, korniienko_image | [Q] | inscription/?depth=2 |
| IIIF: `https://img.dh.gu.se/saintsophia/static/inscriptions/iiif/{uuid}.tif/` with crop `pct:x,y,w,h/` per inscription; originals `https://data.dh.gu.se/saintsophia/static/inscriptions/original/{panel}.jpg`; viewer is OpenSeadragon (bundled); RTI and 3D-mesh endpoints exist | [Q] | inscription/, image/, bundle |
| Image licence field `type_of_license` = "CC BY-NC" on every image row sampled | [Q] | inscription/ korniienko_image[].type_of_license |
| Licence of TEXT/transcription data and a "cite as" statement: not found in API or bundle | [U] | ask director (J. Westin) |
| Human URL pattern: `https://saintsophia.dh.gu.se/viewer/?q={panelTitle}/{inscriptionId}` | [Q] | bundle |
| Scholarly attribution in data: author Viacheslav Korniienko; bibliography id 11 = «Корпус Графіті Софії Київської - Частина IХ: північні внутрішня та зовнішня галереї», Корнієнко, 2019, НАН України / Інститут української археографії та джерелознавства ім. М.С. Грушевського / НЗ «Софія Київська» | [Q] | inscription/ |
| Documentation phase 3 (2025-26) team: Almevik, Westin (Gothenburg), Ganshin, Kovalska, Trofymchuk (NZ Sophia Kyivska), Prokopenko, Diachenko (National Museum of the History of Ukraine), Hortvík | [Q] | panel.documentation |

Ingester recommendation (replaces provisional one): paginate `inscription/?depth=2&limit=300` (about 15 requests, 300 ms apart), store transcription + min/max_year + language + panel + API id; show images via IIIF URL in OpenSeadragon; image licence CC BY-NC (use noncommercially; confirm in writing).

### R2.2 Ten real inscriptions (verbatim from API)
Locator: `https://saintsophia.dh.gu.se/api/inscriptions/inscription/` plus API id; `---` = lacuna in the portal's transcription. All [Q] (as transcribed by the portal; reading is the portal's/Korniienko's).
| API id | Panel | Lang | Date | Transcription | Translation (portal) |
|---|---|---|---|---|---|
| 3469 | 113-26b | Church Slavonic | 1125-1315 | сємєонъ / фєод-оръ ѱлъ | Semen-Fedir wrote |
| 3518 | 114-15 | Church Slavonic | 1175-1215 | ✠гпомозираб у | Lord, help your servant. |
| 3605 | 114-15 | Church Slavonic | 1025-1150 | гпомзрабесвое | Lord, help Your servant. |
| 1234 | 114-21 | Church Slavonic | 1170-1350 | иѧковъѱлъ / чрньць✠ | Yakiv wrote, a monk |
| 3606 | 114-15 | Church Slavonic | 1175-1200 | грабасвоѥ-- / вас-- / на | O Lord, your servant Vasian. |
| 2454 | 114-36 | Church Slavonic | 1125-1215 | гипомъзирабоусвъемоудь | Lord, help your servant Dmytro |
| 808 | 121-03 | Church Slavonic | 1125-1300 | г͠помо / ꙁнетⷭо-- / в | Lord, help Nestor. |
| 448 | 120-18 | Ukrainian | 1570-1700 | Спаси Господи раба сво[е]го Иполита | Save, O Lord, Your servant Hippolytus |
| 3945 | 109-14 | Ukrainian | 1585-1700 | Помени Г(оспо)ди раба с[воего] Са(...) | none |
| 3847 | 109-13 | Ukrainian | 1605 | Року ҂ахе мѣс[ѧц]а апріл[ѧ] 9 Міх[аи]л... | none |

Bonus (first API record, title 6140, panel 109-14, 1629, Polish, Latin script): «Ja byl 1629 Waw(rzyniec) Berezecki lowczy kyiowski.» / «Я був, Вавринець Бережецький, ловчий київський.» Lexicon note: Ukrainian-language entries (e.g. 448, 1570-1700) are usable witnesses with region=Kyiv; Church Slavonic ones are formulaic.

### R2.3 Kiev Folia (resolves section 2 [U] rows)
| Item | Tag | Evidence |
|---|---|---|
| TOROT has it: id `kiev-mis`, title "Kiev Missal", language `chu`, 44 sentences, 370 tokens, CC BY-NC-SA 3.0 (http://creativecommons.org/licenses/by-nc-sa/3.0/us/), annotator Katie Sykes (129 sentences) and Hanne Eckhoff (1 sentence), reviewer Hanne Eckhoff (44 sentences), export 2018-03-23; sections "On the day of St. Clement", "Mass for every day of the year", ... | [Q] | https://raw.githubusercontent.com/torottreebank/treebank-releases/master/kiev-mis.xml (73 KB) |
| Class is `chu` (Church Slavonic), not `orv`: supports treating it as a non-Kyivan CS witness | [Q] | same |
| kiev.stin.hr: "Dekodirana grafička struktura Kijevskih listića", authors Marica Čunčić, Antonio Magdić; footer «Copyright © 2007-2026 Staroslavenski institut. All rights reserved.», no open licence: cite and link only, do not ingest | [Q] | http://kiev.stin.hr/ |

### R2.4 Слово (resolves section 3 [U] rows)
| Item | Tag | Evidence |
|---|---|---|
| TOROT `spi` "The tale of Igor's campaign", language `orv`, 360 sentences, 2850 tokens, CC BY-NC-SA 3.0; annotators Marek Majer (189) and Katie Sykes (174); reviewers Majer (180), Sykes (180); `electronic-text-original-url` http://nevmenandr.net/slovo/ ; export 2019-05-01 | [Q] | https://raw.githubusercontent.com/torottreebank/treebank-releases/master/spi.xml |
| Insider quote, TOROT forms: `О Руская земле! Уже за шеломянемъ еси!` (lemmas русьскыи, земля voc, шеломя, быти); locator citation-part="32", sentence id 211031, token ids 2292587-2292592 | [Q] | spi.xml |
| izbornyk spelling: «О Руская земле! Уже за Шеломянемъ єси.» after «лисици брешутъ на чръленыя щиты.» and before «Длъго. Ночь мркнетъ.»; page title «СЛОВО О ПЛЪКУ ИГОРЕВЂ. Слово о полку Ігоревім. Слово о полку Игореве.»; page has no line numbers (locator = paragraph position as stated). Sibling pages ../slovo67/sl.htm, ../slovo67/sl30.htm, ../slovoyan/yatzenko1.htm not fetched | [Q] | http://izbornyk.org.ua/slovo/slovo.htm (cp1251) |
| Forgery-advocate names; Musin-Pushkin manuscript fire 1812 | [U] still unverified (outside FU-16 targets) | none |
