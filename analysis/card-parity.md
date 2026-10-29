# Card parity matrix (SPEC 63 CP-8)

Owner requirement 2026-10-21/29: «all features of ours should be implemented on each word card». Source of truth: `src/lib/cardParity.ts` (the table below is generated from it; `tests/card-parity.test.ts` walks every cell against the component sources and SSR-renders the thin card for every kind).

Cell values: **shown** = the section renders with the data the kind has; **honest-empty** = the section always renders and, without data, prints «немає даних (перевірено: …)» (or the older «немає засвідчень у корпусі» for a dictionary-only card); **n/a** = the data cannot exist for the kind (reason below); **MISSING** = silently absent (none left).

## Card kinds

- `word` — /w/:lemma
- `form` — /f/:form
- `light` — /lw/:lemma (corpus)
- `dict` — /lw/:lemma (dictionary-only, DO)
- `uv` — /uv/:id
- `att` — /uv/:id (attested-only, CV-4)
- `unlinked` — /f/:form (unlinked)
- `archaic` — /ar/:id
- `name` — /name/:id
- `orv` — /orv/:id
- `phrase` — /p/:id

## Matrix (rows = features, columns = kinds)

| feature (`block`) | `word` | `form` | `light` | `dict` | `uv` | `att` | `unlinked` | `archaic` | `name` | `orv` | `phrase` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Usage / register / loan chips (`chips`) | shown | shown | shown | shown | shown | shown | shown | shown | shown | shown | n/a |
| Приклад / KWIC (`kwic`) | shown | shown | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | shown |
| Пам’ятки (`witnesses`) | honest-empty | shown | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | n/a |
| Словозміна за епохами (`epochs`) | shown | shown | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| Виведення (`derivation`) | honest-empty | shown | shown | shown | shown | shown | shown | shown | shown | shown | n/a |
| Діалект (FD / DV, клас) (`dialect`) | shown | shown | shown | shown | shown | shown | shown | shown | shown | shown | n/a |
| Карта (`map`) | shown | shown | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | n/a |
| Статистика (sidebar) (`stats`) | shown | shown | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | n/a |
| Наголос (`stress`) | shown | shown | honest-empty | honest-empty | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| Походження / етимологія / відповідники (`etymology`) | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | n/a |
| Значення (`senses`) | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | n/a |
| Фразеологія (`phrasemes`) | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | n/a |
| Адаптація запозичення (`loan`) | shown | shown | shown | shown | shown | shown | shown | shown | shown | shown | n/a |
| Похідні (`derivatives`) | shown | shown | shown | shown | shown | shown | shown | shown | shown | shown | n/a |
| IPA (`ipa`) | shown | shown | shown | shown | shown | shown | shown | shown | shown | shown | n/a |
| Мітки LB (клас діалекту + ступінь доказу) (`labels`) | shown | shown | shown | shown | shown | shown | shown | shown | shown | shown | n/a |
| Значення за епохами (SE) (`senseTimeline`) | shown | shown | shown | shown | shown | shown | shown | shown | shown | shown | n/a |
| Вкладка «Огляд» (`overview`) | shown | shown | shown | shown | shown | shown | shown | shown | shown | shown | n/a |
| Вимова (stress + IPA) в Огляді (`pronunciation`) | shown | shown | shown | shown | shown | shown | shown | shown | shown | shown | n/a |
| Перша фіксація / Походження (`origin`) | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | n/a |
| Словозміна (таблиця) (`paradigm`) | shown | shown | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | n/a |
| Регіони (ipm), sidebar (`regions`) | shown | shown | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | n/a |
| Російське джерело (RF) (`ruFlag`) | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | shown |
| Feature chips MM-16 (`featureChips`) | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | n/a |
| Родина варіантів MM-29..36 (`variantFamily`) | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | n/a |
| Тип контактної форми MM-36 (`contactForm`) | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | n/a |
| Перемикачі правопису / говору (OV) (`switches`) | shown | shown | shown | shown | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | n/a |
| Синоніми й антоніми, uk/en Вікісловник (GG-12) (`synonyms`) | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | n/a |
| Фразеологія Вікісловника (GG-13) (`wiktPhraseology`) | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | honest-empty | n/a |

## Counts

All 319 cells: {"shown":120,"empty":158,"na":41}. MISSING (silently absent): **0**.

## Before / after the CP-8 pass (the ten card-wide features added to the matrix)

Before (read from the code at origin/mvp da1f4656): 25 MISSING cells of the 110 new cells.

- Feature chips MM-16: only `word` (lemma header) and `form` (form page) printed them; the eight thin kinds (`light`, `dict`, `uv`, `att`, `unlinked`, `archaic`, `name`, `orv`) had none: 8 MISSING.
- Contact form-type MM-36 (and the pair / variant rules of MM-29..35): printed only by the annotator and «Аналіз слова»; `word` and the eight thin kinds had nothing (the form page prints its contact claims): 9 MISSING.
- Orthography switch (OV): the thin cards printed the word as a plain string; the orthography switch had no visible effect there (the dialect switch only showed in Огляд › Вимова when a dialect was chosen): 8 MISSING.
- Not counted as missing but not honest enough: the Огляд lines «регіон пам’яток невідомий», «прикладів немає», «парадигми немає в джерелах цієї картки» did not say what was checked.

After: 0 MISSING. Fixes: new `CardRules.vue` (panel «Ознаки й варіанти», id `cp-rules`: MM-16 chips via `featureMarks`, MM-29..35 pairs and variant family and MM-36 contact class via `wordRules`; the same functions as the annotator) mounted by `LemmaBlocks` (all thin kinds and the form page) and by `WordView`; `OvPronunciation` prints «Написання» through `Spell` (both switches) on every card, and for a historical spelling (ORV / archaic / Middle Ukrainian / unlinked) the line «немає даних (перевірено: …)»; `OverviewTab` paradigm, regions and example lines name what was checked.

## GG-12 / GG-13 pass (2026-10-29): two new blocks

Before: no card kind showed synonyms, antonyms or a Wiktionary phraseology list (the `phrasemes` block is the corpus panel of attested/candidate phrasemes, a different thing). After: 0 MISSING. `synonyms` («Синоніми й антоніми», `SynAntBlock`) and `wiktPhraseology` («Фразеологія», `PhraseologyBlock`) are mounted by the Огляд tab (`OverviewTab.vue`), so every kind that has the Огляд shows them: `honest-empty` on all ten lemma-bearing kinds (the line «немає даних (перевірено: …)» names the sources read), `n/a` on the `phrase` page (a multi-word quotation, no headword). Both components are `defineAsyncComponent` chunks and read their own sidecar shards (`lm/syn`, `lm/phr`), so the first load of a card does not grow. The matrix in `src/lib/cardParity.ts` was extended by the two blocks; the cell counts above include them.

## n/a reasons

- `phrase` (/p/:id): a multi-word quotation, not a lemma; the single-lemma cards' features are replaced by the PH-1..PH-3 fields with sources; the orthography / dialect switches do not respell quotations. Only the RF flag (Kwic -> SourceCite) applies and is shown.
- `epochs` on the thin kinds: no VESUM paradigm with dated forms; `stress` on `uv`, `att`, `unlinked`, `archaic`, `name`, `orv`: no dictionary knows the word.

## What stays open

- (CP-9, implemented) the thin cards' Словозміна now loads the VESUM paradigm from `lm/par` (the modern equivalent only, labelled, for historical cards), and the thin-card `<h1>` goes through `ThinTitle` (`Spell` for a modern word; historical spellings are not respelled). It appears after the next `build:data` on the worker, which produces the sidecar; until then the cards print the honest line.
- The `paradigm` cell of the thin kinds stays `honest-empty`: a lemma VESUM lacks, a historical word with no modern equivalent, or a word with a full card has no sidecar entry.
- The feature chips on thin cards carry no witness qualifier (galician / edition / older): the card spans several witnesses, so the qualifier is `neutral`.
- Live check (CP-10, 2026-10-29): see `analysis/card-parity-live.md` (Playwright against the deployed site, `npm run e2e:cards`).
