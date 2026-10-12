# GAPS — spec-gap audit (SPEC 61 GA-1)

Audit of 2026-10-12 at `mvp` (3d6ebb5), read-only on code. Method: every requirement id of SPEC 00 / 10 / 20 / 30 / 40-rusyn / 50 / 60-features / 61 and every user request U-1…U-27 (specs/60-briefs.md) was checked against (a) the code, (b) `specs/COVERAGE.md` tests (`npx vitest run`: 31 files, 551 tests, all green), (c) the live UI routes in `src/main.ts` (`/`, `/w/:lemma`, `/analyze`, `/derive`, `/annotate`, `/texts`, `/sophia`, `/map`, `/corpus`, `/report`, `/method`), and (d) the **real data** in `public/data` (12,280 lemmas, 2,042 shards, 1,601 text shards, N = 607,189 tokens).
Status: **OK** implemented · **PARTIAL** · **MISSING** · **HIDDEN** = implemented but not reachable from the live UI without knowing a URL/parameter, or the shipped data is not consumed by the UI. Green tests do not mean the user's goals are met: most defects below pass their tests.

## Top 15 (impact on the user's goals)

Goals: provenance of pure/oldest Ukrainian forms · evidence everywhere · declension · dialects · surzhyk · epochs · stress · derivation.

1. **Wrong linking of function words / pronouns (D1, D6, FX-1, FX-2; B-2, M-3.2).** `я`, `ти`, `ми`, `ви`, `себе`, `аз`, `да` are lemmas of POS «іменник» (`я` f = 3,003, `ти` 4,001, `себе` 5,036, `да` 1,798, `аз` 2,264); `мене` and the pronoun lemmas do not exist. Provenance of the commonest words is false. No POS gate exists (no `core/correspondences.ts`, no PROIEL↔UD↔VESUM table). Fix: FX-1 POS gate + FX-2 suppletive table, rebuild.
2. **Epoch paradigms drown in "конфлікт міток" (D3, FX-6, EP-3.4).** 51,687 of 169,511 epoch-tagged noun tokens (30.5 %) are `dropped.conflict`; in `shev.old` 26,595 of 64,273 (41 %); for `аз`/`я`/`ти`/`себе` the `shev.old` grid has 0–1 cells with N = 1,850/89/1,743/3,135 all conflict. Fix: FX-6 diagnosis (gender/lemma consistency filter `pipelines/build-epochs.ts`), re-verify on рука, земля, князь, город, син; summary-only panel when placed = 0 (UX-3).
3. **Declension is nouns-only and mostly stem-less (D7, FX-5, EP-4.1, EP-7).** `WordView.vue:49,174` shows the epoch panel only for POS «іменник»; adjectives (1,627), verbs (3,652), pronouns, numerals have none; uninflected words (conj/part/prep/adv/intj, 944 lemmas) get no «незмінне слово» line. Of 5,777 lemmas with epoch data, 4,184 (72 %) have stem type `unknown` (no reconstruction). Fix: FX-5 grids by POS; ST rules for more stem classes; model-stem fallback (D4).
4. **First attestation vs oldest form disagree (D2, FX-3, B-3.4/B-3.5).** 2,710 of 12,280 lemmas (22 %) show `first.form ≠ claims.oldest.form` with the same start year (e.g. «1037–1050 · мя» vs «ми»). Fix: derive both from one tie-break (shared function in `pipelines/build.ts`), add a test over the built data.
5. **Stress is never a verified fact (B-3.7, HT-1, U-26).** RESOLVED as a misreading: stress DOES reach the data — 10,682 of 11,776 lemmas (90.7 %) carry >= 1 dictionary stress variant (44,077 forms requested, 33,569 with a dictionary stress); the "0 known" meant status `unknown` by design (source ULIF-derived). The 1,094 lemmas without one are proper names, non-standard spellings and monosyllables the dictionary lacks. 37 curated heteronym pairs are embedded in `core/heteronyms.ts`; `public/data/heteronyms.json` (2,614 candidate forms) is **not loaded by any UI code** (HIDDEN). Fix: load the JSON in `HeteronymReadings.vue` as `method: dictionary` candidates; surface «наголос не встановлено» as one line, not per-form.
6. **Words outside the corpus are a dead end (D5, UX-7, U-25).** Search shows «У словнику немає» + a link to `/analyze` (`SearchView.vue`); отуточки / онтамека / осьтамека / озьдо are in no lemma (absent) so the deictic analysis (DX-1…3) is reachable only after that extra click and never inline. Fix: UX-7 fallback analysis in search.
7. **Derivatives (DV-3, U-1) and IPA (IP-3, U-13) are missing on the word page.** `DerivativesBlock` and `IpaRow` exist only in the annotator popover (`WordCard.vue:54,58`); `WordView.vue` (`/w/:lemma`) imports neither (HIDDEN). The IP-2 dialect toggle therefore never appears on the card users actually open. Fix: add both blocks to `WordView.vue`.
8. **Loanword donor labels shipped but unused (LW-2, U-27).** `public/data/loanlabels.json` holds 3,154 Wiktionary donor labels (+124 multi); `core/loanwords.ts` uses only 13 hard-coded `WK_LABELS`; no `fetch` of the JSON in `src` (HIDDEN). Fix: lazy loader like `usageData.ts`, pass as `analyzeLoan(..., { labels })`.
9. **Information overload on the word card (UX-1…UX-6).** No headline/collapsible panels yet; repeated claim «архаїчний правопис 0.9» per spelling; policy sentences inline (`WordView.vue` Labels panel, last paragraph); form chips unbounded (60 + «ще N»). UX work is in progress (uncommitted `src/lib/ux.ts`, `src/components/Panel.vue`); not part of the committed head. Fix: finish UX-1…UX-6.
10. **Songs are in the data but have no UI (NW-7, MV-1, U-7, U-9).** `songs.json` (10 songs, 7 artists) is read by no component; only 1 witness (`song_zhentsi`, Maksymovych 1834) carries YouTube media; the other 9 U-7 songs and the contemporary repertoire cannot be found. Fix: `/songs` view or a section in `/texts` listing songs.json with ≤2-line quotes and embeds.
11. **Dialect, surzhyk, Rusyn coverage is thin (B-3.2, B-3.6, DD-1…2, U-23).** Lemma-level labels: dialect 241 (2.0 %), surzhyk 438 (3.6 %), rusyn 0 (expected for canonical authors, RU-5.1), origin 3,018 (24.6 %), register 3,858. The UI shows them but «невідомо» dominates; region evidence is not summarised per lemma. Fix: broaden sourced rows (research/04, /20, /23) and show witness-region evidence as an explicit chip.
12. **Linking coverage 77 %, POS vocabulary inconsistent (M-3.3, B-2.2).** 140,045 of 607,189 tokens (23.1 %) unresolved; lexicon POS strings mix «іменник, ч.р.», «іменник», «незмінне» (68), «advp» (241), «number» (2). Fix: normalise POS at build (feeds FX-1/FX-5); work down `CorpusMeta.unresolved`.
13. **Witness coverage gaps (NW-3, NW-5, U-17, U-19, U-21, U-11).** Кочубей Рѣчь/Доношеніе: author `kochubei` is `excluded` (no Q self-identification), no Hetmanate originals (Мазепа, Орлик) ingested; izbornyk XIV–XVI: 26 witnesses vs ~36 non-translation texts in research/19; XVIII: 17 of ~19; Зубрицький (U-11) has no witness or source anywhere in code. Fix: ingest or document each exclusion in REPORT §1.
14. **Usage labels cover 9 % of lemmas (UL-1, U-5).** `usage.json` has 1,156 lemmas; sociolect/diaspora/ritual taxonomy exists but is empty for 91 %. Fix: harvest more uk.wiktionary categories; show «немає даних» one-liner, not an empty chip row.
15. **Syntax gaps (SX-1, SX-2, U-2, U-3).** Accusativus cum infinitivo is not implemented (no rule in `core/syntax.ts`); the enclitics мні / тебі / т'я / м'я / ни remain weight-0 hints (SX-2), so U-3 «питомі» cannot be asserted. Fix: add AcI detector with a ЕУМ/Shevelov cite; obtain a Q source for the enclitic dating or keep the hint with the explanation.

## Reachability and data checks

| artefact | present / non-empty | consumed by UI | verdict |
|---|---|---|---|
| lexicon.json (core) | 12,280 cards | `useData.ts` | OK |
| lex/ shards | 2,042 files | `fullOf()` | OK |
| texts/ shards | 1,601 files = 1,601 witnesses | `/texts` | OK |
| corpus.json | 77 authors, 1,601 witnesses, 1,503 with media | `/corpus`, `/texts`, Kwic | OK |
| lexindex.json | VESUM 33,140 / LT 9,738 | annotator, `/analyze` | OK |
| usage.json | 1,156 lemmas | `usageData.ts` → `UsageChips` | OK (low coverage, #14) |
| etymology.json | 5,217 entries | `etymologyData.ts` → `EtymologyBlock` | OK |
| places.json | 32 places | `placesData.ts` → `/map`, `PlaceBlock` | OK |
| sophia.json | 4,295 items | `sophiaData.ts` → `/sophia` | OK |
| songs.json | 10 songs, 7 artists | none | HIDDEN (#10) |
| heteronyms.json | 2,614 forms | none (UI uses embedded 37 pairs) | HIDDEN (#5) |
| loanlabels.json | 3,154 labels | none (UI uses 13 embedded) | HIDDEN (#8) |
| report.md | present | `/report` | OK |

Deployment: `.github/workflows/pages.yml` runs `npm run data:pull` (shards + texts from `ukr-lexicon-data`) before `npm run build`; `vite.config.ts base './'`.

Component reachability (from `src/views/*`): HIDDEN on `/w/:lemma`: `DerivativesBlock`, `IpaRow`, `SyntaxSpans`, `ModernForms` (only annotator / `/analyze` / `/derive`). `MediaPanel` only through Kwic of media witnesses and `/sophia`.

## Full table

Test evidence for rows marked OK is the test named in `specs/COVERAGE.md` (all pass); only deviations carry their own evidence.

### SPEC 00
| id | status | evidence | fix |
|---|---|---|---|
| P-1.1 | OK | `core/evidence.ts`; core.test | — |
| P-1.2 | OK | gaps.test (300-char cut) | — |
| P-1.3 | OK | core.test detector rules | — |
| P-1.4 | OK | core.test | — |
| P-1.5 | OK | gaps.test; DerivationSteps | — |
| P-1.6 | PARTIAL | denominators shown (`WordView.vue` Statistics N=); statistics do not link to the producing KWIC lines | link f / byEpoch bars to filtered Kwic |
| P-1.7 | OK | stanza link says model; stress `unknown` | — |
| P-2.1 | OK | gaps.test | — |
| P-2.2 | PARTIAL | kochubei excluded; admission works, but see #13 coverage | document exclusions |
| P-2.3 | PARTIAL | tie-break exists (build.test) but first ≠ oldest in 2,710 lemmas (D2) | FX-3 |
| P-2.4 | OK | gaps.test | — |
| P-3.1 | OK | core.test | — |
| P-4.1 | OK | coverage.test | extend to SPEC 60/61 ids (this file lists them) |
| P-4.2 | OK | core.test | — |
| P-4.3 | OK | gaps.test | — |
| P-4.4 | OK | footer in `App.vue`, `/corpus` licences | — |
| P-4.5 | OK (manual) | COVERAGE | — |

### SPEC 10
| id | status | evidence | fix |
|---|---|---|---|
| M-1.1 | OK | gaps.test | — |
| M-1.2 | OK | gaps.test | — |
| M-1.3 | OK | gaps.test; `arch`, `ostromir`, `kiev-mis` in corpus | — |
| M-1.4 | OK | gaps.test | — |
| M-2.1 | OK | ingest-old.test | — |
| M-2.2 | OK | ingest-old.test | — |
| M-2.3 | OK | ingest-old.test; corpus has `kievchr`, `gvl` | — |
| M-2.4 | OK | ingest-old.test | — |
| M-3.1 | OK | core.test | — |
| M-3.2 | PARTIAL | VESUM-form gate exists, POS gate does not: «азъ»→noun «аз», «да»→noun (D1, D6) | FX-1 |
| M-3.3 | OK | gaps.test; 140,045 unresolved (23.1 %) counted in `corpus.json` | see #12 |
| M-4 | OK | build.test | — |
| M-5.1–M-5.6 | OK | gaps.test / core.test (COVERAGE) | — |
| M-6 | OK | gaps.test; all three files present | — |

### SPEC 20
| id | status | evidence | fix |
|---|---|---|---|
| B-1.1 | OK | build.test | — |
| B-2.1 | OK | build.test | — |
| B-2.2 | OK | build.test | — |
| B-2 (routes) | PARTIAL | four routes work; no POS/suppletion handling (FX-1/2) | FX-1, FX-2 |
| B-3.1 | OK | gaps.test | — |
| B-3.2 | OK | build.test; 438 surzhyk lemmas | thin (#11) |
| B-3.3 | PARTIAL | manual row; origin known for 3,018 / 12,280 | review rules coverage |
| B-3.4 | PARTIAL | gaps.test passes yet 2,710 lemmas disagree with `first` at equal date | FX-3 |
| B-3.5 | PARTIAL | build.test tie-break OK; form differs from oldest | FX-3 |
| B-3.6 | OK | gaps.test; dialect on 241 lemmas | thin (#11) |
| B-3.7 | PARTIAL | status always `unknown` by spec; 11,041 stress records, 0 known | see #5 |
| B-4 | OK | gaps.test | — |
| B-5 / B-5a–f | OK | build.test size guard; core 13.45 MB, shards max 212 KB, texts 1,601 | — |
| B-6 | OK | gaps.test | — |

### SPEC 30
| id | status | evidence | fix |
|---|---|---|---|
| D-1.1, D-1.2 | OK | core.test; `/derive` old2new | — |
| D-2.1–D-2.4 | OK | reverse.test | — |
| D-3.1, D-3.2 | OK | reverse.test; `/derive?to=` | — |
| D-4.1, D-4.2 | OK | FormLegend / FormBadge in WordView, Analyze, Derive, Annotate | — |
| D-4.3 | OK | `/derive` in nav (`App.vue`) | — |

### SPEC 40-rusyn
| id | status | evidence | fix |
|---|---|---|---|
| RU-1.1, RU-1.2 | OK | rusyn.test; `ClaimSet.vue:17` shows `rusynStatus` | — |
| RU-2.1, RU-2.2 | OK | rusyn.test | — |
| RU-3.1–RU-3.4 | OK | rusyn.test | — |
| RU-4.1, RU-4.2 | OK | rusyn.test | — |
| RU-5.1 | OK | 0 lemmas with rusyn claim in data (expected, REPORT §7) | — |

### SPEC 50
| id | status | evidence | fix |
|---|---|---|---|
| EP-1.1–EP-1.5 | OK | epoch-paradigm.test, build.test size | — |
| EP-2.1–EP-2.5 | OK | epoch-paradigm.test | — |
| EP-3.1, EP-3.2, EP-3.5–EP-3.8 | OK | epoch-paradigm.test | — |
| EP-3.3 | PARTIAL | grid check exists; pronouns tagged as nouns pass it wrongly (POS bug) | FX-1 |
| EP-3.4 | PARTIAL | filter over-drops: 30.5 % conflict, 41 % in shev.old | FX-6 |
| EP-4.1 | PARTIAL | stem unknown for 4,184 / 5,777 lemmas (72 %) | more ST rules (D4 model-stem) |
| EP-4.2, EP-4.3 | OK | epoch-paradigm.test | — |
| EP-5.1–EP-5.6 | OK | epoch-paradigm.test | — |
| EP-6.1–EP-6.4 | OK | epoch-paradigm.test; notes in `EpochParadigm.vue` | — |
| EP-7.1–EP-7.7 | PARTIAL | tests pass; panel only for nouns (`WordView.vue:49`); all-conflict epochs print grids of «невідомо» (D3); table overflows on phone | UX-3, FX-5 |
| EP-8.1 | OK | gaps.test | — |

### SPEC 60-features
| id | status | evidence | fix |
|---|---|---|---|
| DV-1, DV-2 | OK | derivation.test | — |
| DV-3 | HIDDEN | block only in `WordCard.vue:58` (annotator); `/derive?dir=prefix` reachable via example link only | add `DerivativesBlock` to `WordView.vue` |
| SX-1 | OK | syntax.test; spans in `/annotate`, `/analyze` | — |
| SX-2 | PARTIAL | only weight-0 hints (no Q for мні/тебі/т'я/м'я/ни dating) | find Q source or keep hint |
| SX-3 | OK | syntax.test | — |
| SX-4 | OK | `SyntaxSpans` in Annotate, Analyze | — |
| MO-1 | OK | modernize.test | — |
| MO-2 | OK | `/derive`, `/analyze` | — |
| IP-1, IP-2 | OK | ipa.test | — |
| IP-3 | HIDDEN | `IpaRow` only in `WordCard.vue:54` | add to `WordView.vue` header |
| DD-1–DD-3 | OK | dialect-dating.test | — |
| BK-1 | OK | banks.test | — |
| BK-2 | OK | `BankChip` in WordView, WordCard | — |
| ET-1–ET-3 | OK | etymology.test; 5,217 entries; `EtymologyBlock` in WordView | — |
| NP-1 | OK | places.test | — |
| NP-2 | OK | places.test; 32 places | — |
| NP-3 | OK | `/map` in nav; `PlaceBlock` | — |
| NW-1 | OK | `spi` in corpus | — |
| NW-2 | OK | `kiev-mis` in corpus (950–1100, disputed provenance) | — |
| NW-3 | MISSING | `pipelines/authors.ts:45` kochubei `excluded`; no witness | Q self-ID from Бантыш-Каменский pp. 97–99 or document |
| NW-4 | OK | `pripovisti` (1700–1709) | — |
| NW-5 | PARTIAL | 26 i14_* / 17 o18_* witnesses vs research/19, 21 lists | diff against research tables, ingest rest |
| NW-6 | OK | 1,503 Sophia witnesses, `/sophia`, sophia.json 4,295 items | — |
| NW-7 | PARTIAL | songs.json (10) + 1 witness `song_zhentsi`; songs.json unused by UI | songs view (#10) |
| MV-1 | PARTIAL | `MediaPanel` via Kwic and `/sophia`; 1 YouTube witness only | #10 |
| MV-2 | OK | `AffiliationChips` in `/sophia` | add to `/texts` for other kinds |
| UL-1 | PARTIAL | `UsageChips` in card and annotator; legend in annotator; 1,156 lemmas (9 %) | broaden harvest |
| DX-1, DX-2 | OK | deictics.test | — |
| DX-3 | PARTIAL | `/analyze`, popover, card exist; not reachable from search for non-lemmas (D5) | UX-7 |
| HT-1 | PARTIAL | embedded 37 pairs; heteronyms.json (2,614) unused | #5 |
| HT-2 | OK | `HeteronymReadings` in WordView, WordCard, annotator flag | — |
| HT-3 | OK | `[U]` послуха́тися kept as unverified | — |
| LW-1 | OK | loanwords.test | — |
| LW-2 | PARTIAL | 13 embedded labels vs 3,154 shipped | #8 |
| LW-3 | OK | loanwords.test; `LoanChip` | — |

### SPEC 61
| id | status | evidence | fix |
|---|---|---|---|
| D1 | MISSING (open defect) | lemma `аз` POS «іменник, ч.р.» (f 2,264) | FX-1/FX-2 |
| D2 | MISSING (open defect) | 2,710 lemmas first ≠ oldest | FX-3 |
| D3 | MISSING (open defect) | see Top-15 #2 | FX-6, UX-3 |
| D4 | MISSING (open defect) | repeated badge/policy text | UX-4 |
| D5 | MISSING (open defect) | search dead end | UX-7 |
| D6 | MISSING (open defect) | lemma `да` noun, f 1,798 | FX-1 |
| D7 | MISSING (open defect) | nouns-only epochs; no pronoun grid | FX-5 |
| FX-1 | MISSING | no POS table in `core/` | implement |
| FX-2 | MISSING | no `core/correspondences.ts` | implement with ЕСУМ/Shevelov cites |
| FX-3 | MISSING | — | implement |
| FX-4 | MISSING | rebuild after FX-1/2/3/5/6 | orchestrator |
| FX-5 | MISSING | `WordView.vue:49` nouns only; no «незмінне слово» | implement |
| FX-6 | MISSING | numbers in #2 | implement, report in REPORT §epoch |
| UX-1…UX-4 | PARTIAL (in progress) | uncommitted `src/lib/ux.ts`, `src/components/Panel.vue`, `src/ux.css` | finish |
| UX-5, UX-6 | MISSING | chips unbounded; nav is 10 links (`App.vue`) | implement |
| UX-7 | MISSING | `SearchView.vue` links to `/analyze` only | implement |
| GA-1 | OK | this file | — |

### User requests U-1…U-27
| id | status | evidence | fix |
|---|---|---|---|
| U-1 prefixes | HIDDEN | DV-1/2 work; block not on `/w/:lemma`; `/derive?dir=prefix` | #7 |
| U-2 би-м, буду зробив, AcI | PARTIAL | SX-1 covers би-м, буду/був + l-participle; accusativus cum infinitivo missing | #15 |
| U-3 enclitics | PARTIAL | hints only | #15 |
| U-4 бурян → бур'ян | OK | MO in `/derive`, `/analyze` | — |
| U-5 usage highlighting | PARTIAL | UL-1; 9 % coverage | #14 |
| U-6 Софія | OK | `/sophia`, 1,503 witnesses | — |
| U-7 folk songs | PARTIAL | 10 song records, no UI, 1 witness | #10 |
| U-8 annotate corpus texts | OK | `/texts` (annotated reader, 1,601 witnesses) | — |
| U-9 media views | PARTIAL | Sophia IIIF + 1 YouTube | #10 |
| U-10 link to document | OK | `sourceLink` in Kwic, TextsView, WordView, SourceCite | — |
| U-11 Зубрицький (name of Kyiv) | MISSING | no witness / source | #13 |
| U-12 д, ко, д велик_ому | OK | SX-3 hints | — |
| U-13 IPA | HIDDEN | `IpaRow` annotator only | #7 |
| U-14 names, map, variants | OK | `/map`, `PlaceBlock`, 32 places | variants limited to gazetteer |
| U-15 Слово | OK | `spi` | — |
| U-16 concrete source + page | OK | `SourceCite`, Kwic locators | — |
| U-17 Кочубей vs Мазепа | MISSING | #13 | — |
| U-18 глаголичні листки | OK | `kiev-mis` | — |
| U-19 izbornyk XIV–XVI | PARTIAL | 26 witnesses | #13 |
| U-20 Приповісти + banks | OK | `pripovisti`; `BankChip` | — |
| U-21 izbornyk XVIII | PARTIAL | 17 witnesses | #13 |
| U-22 etymology | OK | `EtymologyBlock` | — |
| U-23 diachronic dialects | PARTIAL | rules OK; 241 lemmas | #11 |
| U-24 statistics explained | OK | `StatsExplainer` in WordView | — |
| U-25 deictics | PARTIAL | DX works; not reachable from search (D5) | #6 |
| U-26 stress meaning | PARTIAL | 37 pairs; послухатися `[U]` by design; JSON unused | #5 |
| U-27 foreign forms | PARTIAL | rules OK; labels unused | #8 |
