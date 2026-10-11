# PLAN 40 — Phase 2 work plan (backend ∥ frontend fan-out)

Status: **work plan**, written 2026-10-11 from the repo state at the WIP commit after 583240f. Subordinate to SPEC 00/10/20/30.
Two implementers work in parallel on the same branch `worktree-ukr-lexicon-mvp` with **disjoint file ownership** (below).
Before every push: `git pull --rebase origin worktree-ukr-lexicon-mvp`, then `npm test` + `npx vue-tsc --noEmit` must be green.

## State found (2026-10-11)
- 119/120 tests pass. Fails: `ui.test.ts › year gates rules` — expects `быти` (modern) → `russianism_orth`, but the new Rusyn veto
  (`rusynStrong`, research/10 §5) suppresses it. Research/10 §5 is right: `-ти` infinitive with ы is a Rusyn marker; the Russian
  positive signal is the `-ть` infinitive (`быть`). → the **test** is outdated, not the rule.
- `pipelines/build.ts` (+ build-link/annotate/stats/report) exists but has **never run on the real corpus**: `public/data/lexicon.json`
  is the 8-lemma fixture, `analysis/REPORT.md` does not exist, `data/work/stress.json` / `ru.json` do not exist.
- `data/work/` lacks `vyshensky` (manifest entry exists) and `shevchenko_*` has only 4 short pieces (TOC discovery likely incomplete).
- `RUSYN_RULES` / `RUSYN_STATUS` exist in `core/rules.ts` but are not used by the build or the UI; no spec has `RU-*` IDs.
- `tests/build.test.ts` (SPEC 20 §Tests) is missing. P-4.1 coverage (each requirement ID → test or `manual`) is unaudited.
- `nlp/pyproject.toml` lacks `pymorphy3-dicts-ru`; `build.ts` hard-codes a `uv.exe` path from a past job directory.
- DWDS regional panel (research/07 §3.3) not implemented.

## Contract between the two halves (fixed now — do not change unilaterally)
Backend owns `core/types.ts`. These additions are **agreed**; backend adds them first (task B0) and pushes early, frontend codes against them:
```ts
// FormCard.claims and LemmaCard.claims gain an optional key:
rusyn?: Claim<string>          // label ∈ 'rusyn' | 'rusyn:lemko' | 'rusyn:presov' | 'rusyn:pannonian' | 'rusyn:subcarpathian'
// CorpusMeta gains:
rusynStatus: { note: string; evidence: Evidence[] }   // = RUSYN_STATUS, shown next to any rusyn:* label
regions: { code: string; name: string; oblasts: string[]; N: number }[]   // witness region → ISO 3166-2 oblast codes, N tokens
// LemmaCard.stats gains:
byRegion?: { code: string; f: number; N: number }[]
```
New files the frontend reads: `public/data/report.md` (copy of `analysis/REPORT.md`), `public/geo/ukr-oblasts.json` (frontend makes it, see F5).
Until the real build lands, the frontend uses `pipelines/fixture.ts` output (backend extends the fixture with one rusyn claim + one region in B0).

## Ownership
| Backend (session "lexicon-backend") | Frontend (session "lexicon-frontend") |
|---|---|
| `core/**`, `pipelines/**`, `nlp/**`, `data/**`, `analysis/**`, `public/data/**`, `specs/**` (except this file's checkboxes for F), `research/**`, `tests/*` except `ui.test.ts` | `src/**`, `public/geo/**`, `index.html`, `vite.config.ts`, `tests/ui.test.ts` |

`src/lib/annotate.ts` is frontend-owned but imports `core/rules.ts`; if a rule change is needed, the frontend asks (it doesn't edit `core/`).

## Backend tasks
- [x] **B0 contract** — add the type fields above; extend `pipelines/fixture.ts` (one `rusyn:subcarpathian` FormCard e.g. `гынути`, one region); regenerate fixture data; push **first**.
- [x] **B1 Rusyn gate per research/10 §5** — write `specs/40-rusyn.md` with `RU-*` IDs: axis labels, `!normative` gate (no year gate), shared rows count only
      if a RUE-*/PAN-* row fires, ORT-Y veto list = RUSYN_STRONG, `ambiguous_y` (weight 0.2) for мы/ты/вы/сын/рыба/был without discriminator,
      ORT-YI veto only via RUE-PRESOV-YO (э stays a russianism signal), positive Russian evidence (ы+э, `-ть` with ы, `-ский`) keeps ORT-Y.
      `[rend]` quotes become `P()` (paraphrase kind) until browser-verified. Fix `tests/ui.test.ts` expectation? **No** — that file is frontend's:
      instead add `tests/rusyn.test.ts` (быть → russianism_orth; быти → rusyn, no russianism_orth; гынути → rusyn + dialect ZAK; синьый; every RUSYN rule has cite)
      and tell the frontend session the new expectation (F0).
- [x] **B2 wire Rusyn into build** — `build-annotate.ts detectCard` runs RUSYN_RULES; lemma-level `rusyn` claim = union of modern FormCard rusyn claims;
      `CorpusMeta.rusynStatus`; REPORT §7 gets Rusyn hit counts (expected ~0 in this corpus — say so).
- [x] **B3 corpus completeness** — mine `vyshensky`; fix Shevchenko TOC discovery so the whole volume 1 is ingested; ingest tests for both.
- [x] **B4 NLP plumbing** — add `pymorphy3-dicts-ru` to `nlp/pyproject.toml`; replace the hard-coded `DEFAULT_UV` with `UV_BIN` env → `uv` on PATH;
      run `lemmatize_orv.py` for any orv/chu-rus/ruthenian witness lacking `.nlp.json` (vyshensky), `stress.py`, `russian_check.py` (selftests first).
- [x] **B5 full build** — `npm run build:data`; meet B-5 limits (lexicon ≤ 15 MB, lexindex ≤ 4 MB); write `public/data/report.md`;
      add `regions` + `byRegion` (witness `region` → oblast codes, mapping table with citation of research/04 §1 / research/07 §3.3).
      Read REPORT.md critically: link coverage per witness, top unresolved forms → fix the 3–5 biggest systematic misses in rules/orthography folds
      (each fix cited; no uncited rule — P-1.3), rebuild.
- [x] **B6 `tests/build.test.ts`** per SPEC 20 §Tests (admission B-1.1, tie-break B-3.5, ambiguity B-2.1, surzhyk upgrade needs both conditions B-3.2,
      every claim in the built fixture passes `claim()`).
- [x] **B7 coverage audit** — `specs/COVERAGE.md`: every requirement ID in SPEC 00/10/20/30/40-rusyn → test name or `manual`; add tests for gaps.
- [x] **B8 commit** the built `public/data/*` and `analysis/REPORT.md`, push, report: corpus N, coverage %, top findings.

## Frontend tasks
- [ ] **F0 test fix** — update `tests/ui.test.ts › year gates rules` to research/10 §5: modern `быть` → `russianism_orth`; modern `быти` → no `russianism_orth`.
      Make `src/lib/annotate.ts` run `RUSYN_RULES` too (as a separate `rusyn` axis), so the annotator shows them.
- [ ] **F1 Rusyn display** — a `rusyn:*` claim renders as its own badge next to `dialect:ZAK/LEM` (two parallel readings, neither wins),
      always with the neutral `rusynStatus` note in a popover (both positions' evidence). Word card, annotator, analyze. Never colour-only.
- [ ] **F2 real-data readiness** — the app must work with a ~15 MB `lexicon.json`: loading state with progress, search index built once
      (web worker if > 150 ms), long lists virtualised or paged; test with a synthetic 15 MB fixture (generate in the test, do not commit).
- [ ] **F3 report route** — `/report` renders `public/data/report.md` via `src/lib/md.ts` (tables, headings, anchors); link from nav and MethodView.
- [ ] **F4 SPEC 30 D-4 audit** — three visual classes (attested / reconstruction / confirmed reconstruction) everywhere: word card, timeline, annotator,
      analyze, derive; legend on each of those pages; `/derive?from=&dir=` deep-links round-trip; ui tests for each.
- [ ] **F5 regional panel** (research/07 §3.3) — Natural Earth admin-1 (public domain) filtered to UKR, simplified ≤ 100 KB →
      `public/geo/ukr-oblasts.json` keyed by ISO 3166-2; `RegionMap.vue` shows `byRegion` ipm with N per region; Crimea/Sevastopol as Ukraine;
      attribution "Natural Earth (public domain)". Regions are witness regions — label "регіон пам'ятки", not a dialect claim (B-3.6).
- [ ] **F6 stress & register** — StressForms shows every variant with its source and the "unknown status" note (B-3.7); register badge shows
      `unknown` explicitly when no evidence (P-3.1).
- [ ] **F7** `npm run build` green, `npm test` green, screenshots of word card / annotator / derive / report in the final message.

## Done when
Both checklists ticked, `npm test` + `npm run build` green on the branch head, real `public/data` committed, REPORT.md readable at `/report`.
