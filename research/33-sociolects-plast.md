# research/33 — sociolects, Plast vocabulary, loanwords (SPEC 63 SL)

Fetched 2026-10-14. Rule (SPEC 00): source + verbatim quote + locator, otherwise **unknown**. Data: `pipelines/ingest-plast.ts` → `public/data/sociolect.json`; labels computed in `core/sociolect.ts`.

## 1. The five words (SL-1)

| word | process | source / quote | status |
|---|---|---|---|
| всм | abbreviation of «в смислі» (UA) / «в смысле» (RU) | FBRU (Крылова, fb.ru, 16.10.2023, about Russian «всмысле»): «"Всмысле" - это разговорная аббревиатура от полного выражения "в смысле".»; «Первое упоминание "всмысле" в Национальном корпусе русского языка относится к 2003 году.» | Russian form documented; **Ukrainian «всм» and a contact source of «смисл» — no source found (unknown)**. Row attached to «всмысле», not to «всм» |
| екстремітет, екстреміті | adaptation of English *extremity* / Latin *extremitas* | **no Ukrainian source found that describes these forms (unknown)**. The English etymon is real (WebSearch summaries of Oxford/Merriam-Webster; their pages returned HTTP 403, so no quote is recorded) | unknown |
| аплікейбіліті, аплікабіліті | phonetic (-bility → -біліті) vs graphic (applicab- → -абіліті) borrowing of *applicability* | **no source found (unknown)**; the pattern -іті/-ітет is the user's hypothesis, not a documented fact | unknown |

Literary status (SL-4): VESUM (dict_uk 6.8.6, local) has **none** of the five words (lemma or form lines); related: `екстремум`, `екстремальність`, `смисл` (unflagged) are present. СУМ-11 (sum.in.ua refused the connection, ECONNREFUSED) and СУМ-20 / slovnyk.me (HTTP 403 to bots) could not be queried from the build host → **СУМ status not established**; open item for a manual look. Standard equivalents: none stated by any dictionary we could read.

## 2. Plast vocabulary (SL-2)

Ingested: **PLSEA** «Пластові "Пластологізми" та абревіації», упорядкував Ярко Запотоцький (з допомогою пластунів), 14.05.2021, https://plastseattle.org/plast-101/dictionary/. robots.txt: `Disallow: /wp-admin/` only → crawl allowed. Licence: «Copyright © 2026 Пласт Сієтл», no open licence → **cite-only**: headword + first sentence (≤160 chars) + locator (line in the glossary / abbreviation list). 68 entries: 37 terms + 31 abbreviations (the abbreviation part gets the «абревіатура» badge by structure, not by hand). The raw page stays in `data/raw/plast/` (git-ignored, never published).

Rejected / not used:
- 100krokiv.info «Пластове назовництво» (М. Дуда, 2011; 28 glossed terms + 169-term list, with the only dialect remarks: вірлиця ~ Наддністрянщина, гутірка ← гуторити): `robots.txt` = `Disallow: /` → not ingested, not quoted. Re-check if the site changes policy.
- plastovabanka.org.ua «Пластове назовництво…»: site returned a WordPress database error and an expired TLS certificate (2026-10-14).
- Subtelny, *Plast: Ukrainian Scouting, a Unique Story* (2016) glossary: PDF > 10 MB for the fetcher; copyrighted; not read.
- uk.wiktionary: no «Пластова лексика» category exists (allcategories prefix «Пласт» → only Пласті/uk, Пластика, Пластини, Пластуни/uk, Пластунство/uk; none is a lexicon label); search in the Category namespace for «пластова» = 0 hits.
- Linguistic studies of Plast jargon: none found by three web searches (Ukrainian and English). No frequent-use claim «пластовий жаргон» is made; the badge says only «пластова лексика» = the word is in PLSEA's Plast glossary.

## 3. Dialect characterisation (SL-3)

No study located that states a dialect/region for Plast terms (the only statements are in the rejected 100krokiv text). Context only, uk.wikipedia «Пласт (організація)» (CC BY-SA 4.0): «21 квітня 1912 року у Львові відбулись перші сходини гуртка «Крук».» · «Протягом 1912 р. пластові гуртки поширились по всій Галичині.» · «Слово походить від назви козаків-пластунів, які виконували функції розвідників у козацькому війську». These are facts about the organisation, **not** about the dialect of any word, so every Plast entry shows «діалектна належність не встановлена».

## 4. Cross-checks
VESUM present for 36 of 73 checked headwords (the 5 SL-1 words are all absent): common words such as `гурток`, `курінь`, `ватра`, `рій` exist in the literary language and the Plast sense is a specialised use; the full per-word result is `public/data/sociolect.json › literary` (null = absent).
