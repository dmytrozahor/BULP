# GAPS — spec-gap audit (SPEC 61 GA-1, re-audited by SPEC 63 GA-2)

GA-2 audit of 2026-10-14 at `mvp` (d9d93261 + the GA-2 commit), read-only on `core/`, `pipelines/`, data. Method (as GA-1): every requirement id of SPEC 00 / 10 / 20 / 30 / 40-rusyn / 50 / 60-features / 61 / 62 and U-1…U-27 (specs/60-briefs.md) checked against (a) the code, (b) `specs/COVERAGE.md` tests (`npx vitest run`: 51 files, 728 tests, green; `vue-tsc`, `vite build` green), (c) the live routes of `src/router.ts` (`/`, `/w/:lemma`, `/f/:form`, `/witness/:id`, `/author/:id`, `/source/:id`, `/analyze`, `/derive`, `/annotate`, `/texts`, `/songs/:id?`, `/phrases`, `/sophia`, `/map`, `/corpus`, `/report`, `/method`) and component reachability from `src/views/*` (every component is now used by a view or by a component that is), (d) real data in `public/data`: 12,267 lemma cards, 2,041 lex shards, 1,912 text shards = 1,912 witnesses, 79 authors, N = 620,590 tokens (402,702 linked = 64.9 %, 217,888 unresolved).
Status: **OK** · **PARTIAL** · **MISSING** · **HIDDEN** (implemented, not reachable from the UI). Since GA-1 all 15 former top items are either closed or narrowed (see "Closed since GA-1").

## Remaining gaps, prioritised (impact on the goals: provenance of oldest forms, evidence, declension, dialects, surzhyk, epochs, stress, derivation)

Fixed in GA-2 (src/tests/specs only): COVERAGE rows for BL-1…20, UX-1…7, GA-1 and a wiring test for UX-1/UX-2/UX-7 (commit "GA-2: COVERAGE rows…"). Everything below needs `core/`, `pipelines/` or data (other agents) and is listed, not fixed.

1. **Corpus is 93 % Sophia graffiti (CX).** 1,771 of 1,912 witnesses are Sophia inscriptions (region «Київ» for 1,774); izbornyk i14 20 / o18 14 witnesses (research/19/21 list ~36 / ~19), 1 witness for each of Vyshensky, Samovydets, Pripovisti; Hetmanate chancery (research/18), Кочубей (`pipelines/authors.ts:46` `excluded`), Мазепа/Орлик absent; no Wikisource first editions of Куліш/Франко/Леся beyond one each. Dialect/region evidence, forms of 1500–1800 and U-17/U-19/U-21 depend on this. Owner: CX-1…CX-4.
2. **Dialect, surzhyk, Rusyn labels thin (DL; B-3.2, B-3.6, U-23).** dialect 249 (2.0 %), surzhyk 440 (3.6 %), palatalization 287, rusyn 0 (expected, RU-5.1) of 12,267 lemmas; witness regions are almost one value (Київ), so region evidence per lemma is not informative. BL-13 gives dialect IPA only where research/27 rules exist. Owner: DL.
3. **Linking dropped to 64.9 % (M-3.3, B-2.2).** 217,888 of 620,590 tokens unresolved (GA-1: 23.1 %); the Sophia growth added short, damaged inscriptions. `CorpusMeta.topUnresolved` is the work list; lexicon POS strings are still mixed («іменник» 114, «незмінне» 50, «advp» 380, «number» 2, «займенник, ч.р.» 12). Fix: normalise POS at build, work down the list (pipelines).
4. **`public/data/report.md` is stale (EP-8.1, P-1.6).** `/report` still shows N = 430 833 and 58 witnesses (generated 2026-10-11); corpus.json has 620,590 and 1,912. Regenerate with the next data build (the REPORT test checks structure, not freshness; add a freshness check on `corpus.json.N` in tests/gaps.test.ts after the rebuild).
5. **Adjectives, participles, numerals have no epoch grids (D7, FX-5, EP-7).** `WordView.vue:69` `epochKinds` = noun, pron, verb; 1,681 adjectives + 38 numerals show «історичні парадигми ще не побудовано» (honest, one line). Stem type `unknown` was 72 % of nouns at GA-1 and was not re-measured; model-stem fallback (D4) is still open. Owner: pipelines/core (adj/numr grids).
6. **Accusativus cum infinitivo not detected (SX-1, U-2).** no rule in `core/syntax.ts`; enclitic pronouns are now a sourced weight-0.5 row (`SX-ENCL-PRON`), so SX-2/U-3 are closed as hints, not as dated claims. Fix: AcI detector with ЕУМ/Shevelov cite (core).
7. **Зубрицький (U-11).** no witness or source anywhere (research/15 §WebSearch found no matching work). Needs a located edition; document in REPORT §1 if none exists.
8. **Usage/register coverage (UL-1, U-5).** `usage.json` 1,161 lemmas (9.5 %); register claim on 3,540 (28.8 %). Empty chip rows are collapsed. Fix: harvest more uk.wiktionary categories (pipelines).
9. **Stats do not link to their KWIC lines (P-1.6).** `WordView.vue` Statistics panel shows N and denominators, but f / byEpoch bars are not links to the filtered KWIC (src; a small UI follow-up, not done here because it needs a design for the bar → filter state).
10. **Evidence for lemma-level coverage numbers** (B-3.3): origin is present on all 12,267 cards, but how many are `unknown` was not re-counted; add a coverage line to the REPORT at the next data build.

Smaller open items: BL-2 has no automated test (keyboard-language switch cannot be simulated in SSR; manual row); BL-3 spoiler is covered indirectly by EP-6.4 tests; sub-ids BL-5b, BL-6b, BL-12b-cite are not rows of the SPEC 62 table so COVERAGE cannot list them (tests exist: derivation.test.ts BL-5b, formstats.test.ts BL-6b); D1…D7 are covered through FX-1/2/3/5/6/8 and UX-3/4/7 rows; MV-1 has YouTube media for songs only (1 + Maksymovych witnesses), Sophia has IIIF; `ModernForms`/`SyntaxSpans` are intentionally on `/analyze`, `/derive`, `/annotate` only (not on `/w/:lemma`).

## Closed since GA-1 (evidence)

| GA-1 item | now | evidence |
|---|---|---|
| #1 wrong linking of pronouns / function words (D1, D6, FX-1, FX-2) | OK | lemma `я` «займенник» f 3,848, `ти` 3,513, `себе` 2,739, `да` «частка»; tests/fx.test.ts FX-1/FX-2 |
| #2 epoch «конфлікт міток» (D3, FX-6, FX-8) | OK on tested lemmas | tests/fx.test.ts FX-6; tests/epoch-pron.test.ts; aggregate rate not re-measured (see 10) |
| #3 declension by POS (D7, FX-5) | PARTIAL (noun, pron, verb OK; adj/numr open = gap 5) | `WordView.vue:69`, tests/verb-paradigm.test.ts |
| #4 first ≠ oldest (D2, FX-3) | OK | tests/fx.test.ts FX-3 (one tie-break); not re-counted over the built data |
| #5 stress / heteronyms (HT-1, U-26) | OK | `heteronyms.json` 2,658 forms merged lazily in `HeteronymReadings`; BL-1 note in `StressForms.vue` |
| #6 words outside the corpus (D5, UX-7, U-25) | OK | `SearchView.vue:60` banner; `WordView.vue:158`; tests/ui.test.ts UX-7 |
| #7 DerivativesBlock, IpaRow on the word page (DV-3, IP-3) | OK | `WordView.vue` Panels `h-ipa`; tests/ui.test.ts DV-3 / IP-3 |
| #8 loanlabels (LW-2) | OK | 3,154 labels via lazy lookup; tests/ui.test.ts LW-2 |
| #9 information overload (UX-1…6) | OK | `Panel.vue`, headline; tests/ui.test.ts UX-3…UX-6 and the new wiring test |
| #10 songs UI (NW-7, U-7, U-9) | OK / PARTIAL | `/songs/:id?`, 14 songs; 5 Maksymovych-1834 song witnesses (BL-18) |
| #15 SX-2 enclitics (U-3) | OK as hint | `core/syntax.ts:63` `SX-ENCL-PRON` 0.5 |

## Reachability and data checks

| artefact | non-empty | consumed by | verdict |
|---|---|---|---|
| lexicon.json (core) | 12,267 cards, 13.02 MB | `useData.ts` | OK |
| lex/ shards | 2,041 | `fullOf()` | OK |
| texts/ shards | 1,912 | `/texts`, `/witness/:id` | OK |
| corpus.json | 79 authors, 1,912 witnesses | `/corpus`, `/texts`, Kwic | OK |
| usage.json | 1,161 lemmas | `UsageChips` | OK (low coverage, gap 8) |
| etymology.json | 5,116 | `EtymologyBlock` | OK |
| cognates.json | 2,212 | `CognatesPanel` | OK |
| senses.json | 2,150 lemmas | `SensesBlock` | OK |
| phrases.json | 3,000 candidates, 35 attested | `/phrases`, `PhrasePanel` | OK |
| places.json | 32 | `/map`, `PlaceBlock` | OK |
| sophia.json | present | `/sophia` | OK |
| songs.json | 14 | `/songs` | OK |
| heteronyms.json | 2,658 | `HeteronymReadings` | OK |
| loanlabels.json | 3,154 | `LoanChip`, `/analyze` | OK |
| report.md | stale | `/report` | PARTIAL (gap 4) |

## Full table (only deviations carry their own evidence; OK rows are the tests named in specs/COVERAGE.md, all green)

### SPEC 00 / 10 / 20 / 30 / 40-rusyn
| id | status | evidence | fix |
|---|---|---|---|
| P-1.6 | PARTIAL | denominators shown; statistics are not links to KWIC | gap 9 |
| P-2.2 | PARTIAL | `pipelines/authors.ts:46` kochubei `excluded` | gap 1 |
| M-3.3 | PARTIAL | 35.1 % unresolved | gap 3 |
| B-3.3 | PARTIAL | origin on all cards; unknown share not reported | gap 10 |
| B-3.2, B-3.6 | OK, thin | 440 surzhyk, 249 dialect | gap 2 |
| all other P-, M-, B-, D-, RU- ids | OK | COVERAGE | — |

### SPEC 50
| id | status | evidence | fix |
|---|---|---|---|
| EP-3.3, EP-3.4 | OK on tested lemmas | tests/fx.test.ts FX-6, epoch-pron.test.ts | re-measure aggregate at next build |
| EP-4.1 | PARTIAL | stem `unknown` share not re-measured | gap 5 |
| EP-7.1–EP-7.7 | PARTIAL | noun, pron, verb only (`WordView.vue:69`) | gap 5 |
| EP-8.1 | PARTIAL | report.md stale | gap 4 |
| other EP- ids | OK | COVERAGE | — |

### SPEC 60-features
| id | status | evidence | fix |
|---|---|---|---|
| DV-3, IP-3 | OK | `WordView.vue` Panels | — |
| SX-1 | PARTIAL | AcI missing | gap 6 |
| SX-2 | OK as hint | `SX-ENCL-PRON` 0.5 | — |
| NW-3 | MISSING | kochubei excluded | gap 1 |
| NW-5 | PARTIAL | i14 20, o18 14 witnesses | gap 1 |
| NW-6 | OK | 1,771 Sophia witnesses | — |
| NW-7, MV-1 | OK / PARTIAL | `/songs`; YouTube only for songs | gap 1 |
| MV-2 | OK | `AffiliationChips` via `MediaPanel` on `/sophia`, `/witness/:id` | — |
| UL-1 | PARTIAL | 9.5 % | gap 8 |
| DX-3, HT-1, LW-2 | OK | see Closed | — |
| other ids | OK | COVERAGE | — |

### SPEC 61
| id | status | evidence | fix |
|---|---|---|---|
| D1…D7 | OK | rows FX-1/2/3/5/6/8, UX-3/4/7 | D7: adj/numr = gap 5 |
| FX-1…FX-3, FX-5, FX-6, FX-8 | OK | tests/fx.test.ts, epoch-pron.test.ts | — |
| FX-4, FX-7 | OK (manual) | COVERAGE | — |
| UX-1…UX-7 | OK | tests/ui.test.ts | — |
| GA-1, GA-2 | OK | this file | — |

### SPEC 62 (BL-*)
| id | status | evidence | fix |
|---|---|---|---|
| BL-1, BL-2, BL-3 | OK (BL-2, BL-3 manual rows) | COVERAGE | — |
| BL-4 numerals | OK | tests/numerals.test.ts | — |
| BL-5, BL-5b derivation prefix | OK | tests/derivation.test.ts | — |
| BL-6, BL-6b, BL-6c form page | OK | tests/formstats*.test.ts, `/f/:form` | — |
| BL-7 phone epoch paradigm | OK | tests/ui.test.ts | — |
| BL-8 conjugation | OK modern + epoch verbs | tests/verb-paradigm.test.ts | — |
| BL-9 senses | PARTIAL | 2,150 lemmas (17.5 %), heteronym mapping where Wiktionary gives stress | extend harvest (pipelines) |
| BL-10 Sophia | OK | 1,771 witnesses (GA-1: 1,503) | — |
| BL-11 dictionaries | PARTIAL | one dictionary (39 witnesses); Срезневський and the XVI–XVII c. dictionary not ingested | CX |
| BL-12, BL-12b, BL-12c phrases | OK | tests/phrasemes-*.test.ts | — |
| BL-13 dialect IPA, BL-14 ikavism | OK | tests/dialect-ipa.test.ts, ikavism.test.ts, form-classes.test.ts | dialects limited to research/27 rules (gap 2) |
| BL-15, BL-15b cognates | PARTIAL | 2,212 of 12,267 lemmas (18 %); PL/BE/RU only through Wiktionary | extend (pipelines) |
| BL-16 navigation closure | OK | tests/nav.test.ts | — |
| BL-17, BL-17b, BL-17c | OK | tests/ui.test.ts, nav.test.ts | — |
| BL-18 songs | PARTIAL | 5 song witnesses of the 14 songs | CX |
| BL-19, BL-20 | OK | tests/fx.test.ts, palatalization.test.ts | — |

### User requests U-1…U-27
| id | status | evidence | fix |
|---|---|---|---|
| U-1, U-4, U-6, U-8, U-10, U-12…U-16, U-18, U-20, U-22, U-24 | OK | as GA-1; U-1 now on `/w/:lemma` | — |
| U-2 | PARTIAL | AcI missing | gap 6 |
| U-3 | OK as hint | `SX-ENCL-PRON` | — |
| U-5 | PARTIAL | 9.5 % | gap 8 |
| U-7, U-9 | PARTIAL | `/songs`, 5 witnesses | gap 1 |
| U-11 | MISSING | no source | gap 7 |
| U-13 | OK | `IpaRow` on `/w/:lemma` | — |
| U-17 | MISSING | Кочубей excluded, Мазепа absent | gap 1 |
| U-19, U-21 | PARTIAL | 20 / 14 witnesses | gap 1 |
| U-23 | PARTIAL | 249 dialect lemmas | gap 2 |
| U-25, U-26, U-27 | OK | search banner, heteronyms.json, loanlabels.json | — |
