# SPEC 10 — Data mining and annotated statistical analysis (Phase 1)

Depends on SPEC 00. Research inputs: research/01, 03, 06, 06b, 09.

## M-1 Corpus manifest (`pipelines/manifest.ts`)
- **M-1.1** Every witness (text) declares: `id, title, author, kind (torot|izbornyk|wikisource|vira), urls, date:[from,to]` (composition),
  `dateCite: Evidence`, `msDate?`, `lang (orv|chu-rus|ruthenian|uk)`, `region?`, `witnessType (autograph|ms_copy|first_ed|later_ed|edition)`, `edition`, `license`.
- **M-1.2** A witness whose author is not `vetted|provisional` (P-2.2) is not ingested.
- **M-1.3** Church-Slavonic texts of the Kyivan recension (Archangel Gospel, colophons) are admissible, flagged `lang=chu-rus` (research/06 §2.1.3).
- **M-1.4** віра.укр "Київський ізвод" prayer books are **not** witnesses: *"Київський ізвод означає саме українську вимову, або транслітерацію… Усі молитви транслітеровані з синодальної редакції"* (research/01 §3). Only its Archangel Gospel 1092 edition is used.

## M-2 Ingestion (`pipelines/ingest.ts`)
- **M-2.1** Decoders are tables: izbornyk font substitutes (`Ђ→ѣ`, numeric entities), віра.укр UstavUCS3 (`э→ѣ, z→ѧ, U→ѹ, t→ѿ, w→ѡ`, digits/©/™/¦ → titlo flag). A token containing an unmapped Latin letter is dropped and counted (`dropped.unmapped`).
- **M-2.2** Editorial apparatus is removed: `[n]`, `(n)`, ПСРЛ column numbers, page headers; every token keeps a locator (column/page/verse/line).
- **M-2.3** The Hypatian codex (izbornyk) is split by annal headers `В лѣто NNNN` (year = NNNN − 5508) into PVL (≤1117), Kyiv Chronicle (1118–1200), Galician-Volhynian Chronicle (≥1201); each segment is a separate witness with its own author and date.
- **M-2.4** TOROT tokens keep TOROT `lemma`, `morphology`, `citation-part` as `D`-evidence.

## M-3 Linking tokens to modern lemmas (`core/phonology.ts`, `pipelines/vesum.ts`)
- **M-3.1** Normalisation stage N (research/03 §1) then ordered rules R02–R24 produce modern candidates with a per-rule trace (P-1.5).
  Scope `L` rules emit candidates only; scope `D` rules are never applied to the standard output.
- **M-3.2** A candidate becomes a link only if it is a VESUM form (`D`-evidence: the VESUM line). Route A (TOROT lemma → derived → VESUM lemma) beats route B (token → derived → VESUM form).
- **M-3.3** Unlinked tokens are kept as `unresolved` and counted; nothing is guessed.

## M-4 Annotations per attestation
`epoch` (both schemes, research/09 §4 algorithm), `csMarkers` (research/03 §4), `dialect` markers (research/04 §1), `nonstandard` (VESUM tags + LT replace, gated to `shev.modern`), `derivation trace`. All are `Claim`s.

## M-5 Statistics (`core/stats.ts`, research/07 §2)
- **M-5.1** `ipm = f/N·1e6` per witness, per epoch, per century slice; denominators stored.
- **M-5.2** Frequency class `HK = round(log2(f_max/f))`; dots `clamp(6 − floor(HK/3), 0, 6)`.
- **M-5.3** Dispersion: Gries `DP` over witnesses; evenness = 1 − DP.
- **M-5.4** Epoch comparison: G² (UCREL) + Log Ratio; zero → 0.5.
- **M-5.5** Collocations: lemma window ±3, `logDice = 14 + log2(2f_xy/(f_x+f_y))`, keep `f_xy ≥ 3` (corpus is small; DWDS uses 5 — deviation documented) and `logDice > 0`.
- **M-5.6** Smoothing: centred moving average, window 1 (slices are centuries).

## M-6 Outputs
- `public/data/lexicon.json` — lemma cards (forms, attestations ≤ 12 KWIC per lemma, claims, stats).
- `public/data/corpus.json` — witnesses, authors, epoch sizes, source registry.
- `public/data/lexindex.json` — compact VESUM `bad/subst/slang/arch` + LT replace index for arbitrary-word analysis.
- `analysis/REPORT.md` — Phase-1 annotated statistical analysis: corpus size per epoch/witness, link coverage, top lemmas per epoch,
  most significant epoch shifts (G²), forms with CS markers vs vernacular doublets, earliest attestations. Every number carries its denominator.

## Tests
`tests/evidence.test.ts` (P-1.1–1.4), `tests/phonology.test.ts` (worked derivations research/03 §2.1: видѣти→видіти, конь→кінь, кыѥвъ→Київ, ходилъ→ходив, городъ→город),
`tests/epochs.test.ts` (research/09 examples: 1556–1561 → shev.early_middle; 1798 → shev.late_middle + wl.new), `tests/stats.test.ts` (Wikipedia HK example 76/3 789 654 → 16; logDice max 14; G² symmetric), `tests/detect.test.ts`.
