# BULP · ukr-lexicon

Provenance lexicon of Ukrainian word forms: which forms are attested how early, where, and in which epoch.
Everything shown is evidence-based (source, verbatim quote, locator) or marked unknown; see `specs/00-principles.md`.

Live site: https://dmytrozahor.github.io/BULP/ (deployed by `.github/workflows/pages.yml` on every push to `mvp`).

## Run locally
```sh
npm ci
npm run data:pull   # detail shards public/data/lex from the orphan branch ukr-lexicon-data (SPEC 20 B-5e)
npm run dev
npm test
```

## Rebuild the data
The corpus inputs (`data/raw`, `data/work`) are not committed; `npm run mine` ingests `data/raw` into `data/work` (SPEC 10). Then:
```sh
UV_BIN=<path to uv> npm run build:data   # nlp/ runs via uv; add -- --no-py to reuse existing NLP outputs
npm run data:publish                     # replace ukr-lexicon-data with one squashed commit of the new shards
```

Layout: `research/` (sources) → `specs/` (requirements) → `core/` (pure rules, evidence) → `pipelines/` (mining, build) → `src/` (Vue 3 app) → `tests/`.
Data licences: VESUM, Brown-UK CC BY-NC-SA 4.0; TOROT CC BY-NC-SA 3.0; LanguageTool LGPL — derived data under the same terms.

<img width="1265" height="689" alt="image" src="https://github.com/user-attachments/assets/46981b00-060f-4557-aace-0a7f208f4a73" />
<img width="376" height="695" alt="image" src="https://github.com/user-attachments/assets/0a6f7942-1c15-4590-b6c7-c1a24d61fa6b" />

