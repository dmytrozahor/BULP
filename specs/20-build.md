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
- **B-2.1** Ambiguity: several VESUM lemmas → choose by (a) fewest branch rules (`Candidate.branches`), then (b) highest frequency of that lemma among *modern* witnesses (direct links), then (c) keep the first and list the others in `link.value.alternatives`. The method string records which tie-breaker decided.
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
