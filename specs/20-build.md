# SPEC 20 — Build stage: linking, annotation, statistics, report

Inputs: `data/work/<witness>.json` (WitnessOut), `data/work/<witness>.nlp.json` (Stanza orv lemmas), VESUM (`pipelines/vesum.ts`),
LanguageTool (`pipelines/lt.ts`), `data/work/stress.json`, `data/work/ru.json`. Outputs: `public/data/{corpus,lexicon,lexindex}.json`, `analysis/REPORT.md`.
Entry point: `pipelines/build.ts` (`npm run build:data`). Contract: `core/types.ts`.

## B-1 Admission
- **B-1.1** A witness is used iff its author is admissible (`pipelines/authors.ts admissible()`), or the witness carries `authorEvidence` (≥1 Q) for an institutional author whose record has empty evidence (`kyiv_chron_12`). Otherwise excluded and listed in REPORT §Exclusions.

## B-2 Linking tokens to modern lemmas (SPEC 10 M-3)
For each token, in order (first success wins; all evidence kept):
1. **torot-lemma**: TOROT lemma → `derive(lemma, {oldI})` candidates → VESUM *lemma* lines.
2. **stanza-lemma** (orv/chu-rus witnesses with `.nlp.json`): Stanza lemma → derive → VESUM lemma. Evidence `D('stanza …', model, lemma)`; method `stanza` (model output, not a dictionary fact — P-1.7).
3. **token**: `derive(raw)` candidates → VESUM *forms* → their lemma.
4. **direct** (modern witnesses, lang=uk): `key(raw)`, plus orthography folding for pre-1919 editions — ярижка/кулішівка/желехівка: `ѣ→і, ы→и, ъ#→∅, э→е, ё→ьо/йо`, kulishivka `е` for /є/ after vowel is not folded (ambiguous) — each fold step recorded as a `TraceStep` with rule id `ORTH-<era>` and citation of the era (research/09 §3 quotes).
- **B-2.1** Ambiguity: several VESUM lemmas → choose by (a) frequency *class* of the lemma among *modern* witnesses (direct links; class = number of decimal digits of f, 0 = unattested) — because ikavism R10 is a rule with lexical exceptions and its "applied" branch always has fewer branches (богъ → біг, отъ → іт, скотъ → скіт in the first full build); then (b) fewest branch rules (`Candidate.branches`), then (c) higher frequency, then (d) keep the first and list the others in `link.value.alternatives`. The method string records which tie-breaker decided.
- **B-2.2** Unresolved tokens are counted (`CorpusMeta.unresolved`, top 200 by frequency) — never guessed.

## B-3 Annotations
- **B-3.1** Per historical spelling (`FormCard`): run `detect()` with CS_RULES + CONTACT_RULES + DIALECT_RULES (ctx.year = witness date.to, ctx.norm = stage-N form, ctx.vesum = VESUM hits of the *modern* form, ctx.inLexicon = VESUM lookup, ctx.derive = derive). Hints → `hints`.
- **B-3.2** Per lemma: `register` = REGISTER_RULES over the modern paradigm forms' VESUM tags (colloquial or unknown). `surzhyk` = derived claim iff any modern-epoch FormCard (or the lemma itself) has a label in `SURZHYK_BASIS`, plus `SURZHYK_DEF` as evidence; LT-only non-normative entries are upgraded to `russianism_or_hybrid` only if `ru.json` says the form is a known Russian dictionary word (evidence D: pymorphy3-dicts-ru) **and** VESUM has no normative analysis.
- **B-3.3** `origin`: `church_slavonic` if ≥1 FormCard has a `church_slavonic` claim and no FormCard of the same lemma shows the vernacular doublet; `native` iff the lemma is attested in an `orv` witness by route torot-lemma/token with no CS claim **and** its derivation uses only G/X rules — evidence: the earliest attestation + trace. Else unknown.
- **B-3.4** `oldest`: earliest attested spelling (min date.to) with its epoch (shev scheme).
- **B-3.5** `first` (P-2.3): earliest `date.to` among admissible witnesses; tie-breaks research/06 §3.2 (vetted > provisional; narrower range; autograph > ms_copy > first_ed > scholarly_ed; person > institution; else coFirst). Evidence: author vetting quote + KWIC line + witness dateCite.
- **B-3.6** `dialect`: union of FormCard dialect claims for witnesses ≥1798, plus — as separate evidence kind — the *witness region* of attestations (`D(witness, 'region', region)`), never as a dialect label by itself.
- **B-3.7** `stress`: from `stress.json` for the lemma's modern forms; status `unknown` (the source is not a normative dictionary; research/08 A3 "A merely attested stress … with no label is unknown"), method `dictionary`, evidence `D('ukrainian-word-stress', 'ULIF-derived', stressed)` + licence note. Two acutes → two variants.

## B-4 Statistics (SPEC 10 M-5) — per lemma
f, ipm over admitted N; HK vs the most frequent lemma; dots; DP over witnesses; byEpoch (shev scheme, plus wl scheme), byCentury with `smooth(window=1)`; shifts = `compare()` for each pair of adjacent shev epochs with data; colloc: lemma window ±3 within segment `s`, `f_xy ≥ 3`, `logDice > 0`, top 12.

## B-5 Size limits
lexicon.json: lemmas with f ≥ 2 or with ≥1 pre-1400 attestation; ≤ 6 KWIC per FormCard, ≤ 12 FormCards per lemma (most frequent + oldest). Target ≤ 15 MB raw.

**Amendment 2026-10-11 — core file + detail shards (supersedes the single-file limit above).** Measured on the real build: 9,805 lemmas are kept (f ≥ 2 or pre-1400), but one lexicon.json under 15 MiB held only 2,017 of them and 1,567 of those had no KWIC; the fixed per-card weight (paradigm, stats, first, claims) is ~5 KB/lemma, so lowering KWIC tiers cannot fit all lemmas. Dropping lemmas to meet a size loses evidence, so the delivery is split instead (nothing is dropped; every claim keeps its full evidence):
- **Core (B-5a)** — `public/data/lexicon.json` (format 3, `{ format, ev, tags, cards }`, compact positional wire form of core/pack.ts) holds ALL kept lemmas and only what search, the annotator, analyse, derive and the lists read: lemma, pos, paradigm (forms + verbatim tags; tags in a per-file table), `first`, the lemma-level claims register / surzhyk / origin / dialect / rusyn, `stats.{f,ipm,hk,dots}`, and per spelling raw / norm / modern / claims / hints. Evidence is pooled (`ev`); defaults (norm = modern = raw, unknown claims, empty hints) are omitted on the wire and restored on load, so the codec is lossless. Measured (9,867 kept lemmas): paradigm 4.0, evidence pool 4.4, `first` 2.4, claims 2.2, spellings 2.0 MB; the first plain-JSON cut was 27.9 MB, so paradigm tuples, omitted defaults and moving `oldest` (1.1 MB + evidence) to detail were needed to fit. Limit: **core ≤ 15 MiB** (built: 14.2 MiB).
- **Detail shards (B-5b)** — `public/data/lex/<bucket>.json` (format 1, `{ format, ev, lemmas, details }`), `BUCKETS = 1024` buckets by `bucketOf(lemma)` (FNV-1a of the NFC lemma, core/shard.ts — one pure function shared by the build and the browser). A lemma lives in exactly one shard; a shard has its own evidence pool. LemmaDetail = stress, `claims.oldest` (with its evidence), per spelling f / date / epochs / link / derivation / KWIC (≤ 6 per FormCard, ≤ 12 FormCards: the full B-5 tier, never reduced), stats beyond the core fields (dp, range, byEpoch, byCentury, shifts, colloc, byRegion). Limit: **each shard ≤ 192 KiB** (target ≈ 150 KB; built: max 156 KB, median 54 KB over 1,024 shards — 512 buckets gave max 215 KB, hence 1,024).
- **Merge (B-5c)** — `splitCard(card) → {core, detail}` and `mergeCard(core, detail) → LemmaCard` are inverse (round-trip deep-equal). The word card fetches the shard on open, caches it and shows the detail sections after the merge; annotator / analyse / derive / lists run on core only. A plain `LemmaCard[]` (the test fixture) is accepted as a core whose detail is embedded: no shard fetch.
- **Storage (B-5e, 2026-10-11, user decision)** — the shards (~59 MB, 1,024 files) are not committed to the code branch (`public/data/lex/` is gitignored): every rebuild would add their full size to history. They live on the orphan branch `ukr-lexicon-data` (lex/ at its root), which `npm run data:publish` replaces with ONE squashed commit (force-push, so history never grows); `npm run data:pull` restores `public/data/lex`. Core, corpus, lexindex and REPORT stay on the code branch. Real-data tests skip when the shards are absent.
- **Safety net (B-5d)** — the lemma-dropping fitBudget path is removed; if core or a shard exceeds its limit the build fails loudly instead of silently dropping lemmas. REPORT states core size, shard count / max / median and lemmas written.
lexindex.json (target ≤ 4 MB): VESUM `lexIndexVesum()` restricted to headword lines for every tag, plus all corpus-attested forms; LT index in full (≈ 0.8 MB).
LT entries are stored as tuples `[file, suggest]` (pipelines/lt.ts) and mapped to `Ctx.lt = {file, suggest}` for `detect()`.

## B-6 REPORT.md (Phase 1 deliverable — annotated statistical analysis)
Sections, every number with its denominator and each method with its citation:
1. Corpus: witnesses × author × epoch × N; exclusions and why.
2. Linking coverage per witness and route; top unresolved forms (what the rules miss).
3. Rule firing statistics: how often each sound rule appears in successful derivations; each detector rule's hit count.
4. Lexical statistics: top 30 lemmas per shev epoch (ipm); strongest epoch shifts (G², Log Ratio) — "rising" and "falling" lemmas.
5. Church Slavonic vs vernacular doublets found (pairs with dates).
6. Earliest attestations: 30 oldest lemmas with first author/witness/locator.
7. Surzhyk/contact & dialect hits (expected few in this literary corpus — say so).
8. Caveats: corpus bias (research/06 §3.5), model outputs vs dictionary facts, licences.

## Tests
`tests/build.test.ts`: admission (B-1.1), tie-break order (B-3.5), ambiguity resolution order (B-2.1), surzhyk upgrade requires both conditions (B-3.2), every claim in a built fixture passes `claim()` validation (P-1.1).
