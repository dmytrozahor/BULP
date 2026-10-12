# SPEC 60 — Phase-3 features (requirements + work packages)

Status: **normative** for phase 3. Subordinate to SPEC 00 (Evidence Invariant). Inputs: research/12–23 (cited by §), user requests U-1…U-24 (specs/60-briefs.md).
Every new label is a `Claim` with evidence; every rule row carries a `cite` (P-1.3); derived/model output carries `method` (P-1.7); weight-0 rows are hints only (P-3.1).
Trunk-based: one commit per requirement group, on `mvp`, no Co-Authored-By. Each requirement id needs a test or `manual` row in specs/COVERAGE.md.

## DV — derivation by prefixes (U-1) · research/12 §A + Round 2 (Правопис §31)
- **DV-1** `core/derivation.ts`: prefix table (з-/с-/зі-/зо-, роз-, без-, від-/од-, ви-, при-/пре-/прі-, пере-, на-, за-, по-, у-/в-, об-/обі-, під-/піді-, над-/наді-, до-, недо-, перед-, про-) with allomorph conditions as data; every row cites §31 (Q) or is weight-0.
- **DV-2** `derivatives(lemma)` generates candidate prefixed lemmas (+ reflexive -ся/-сь) and keeps only those attested in VESUM (D-evidence) or in the corpus; unattested candidates are shown as `method: 'derivation'` suggestions, visually as reconstructions (SPEC 30 D-4).
- **DV-3** Word card block «Похідні» (prefix → derivative, ✓VESUM / ✓corpus / suggestion), and `/derive` mode `prefix`.

## SX — analytic forms, enclitics, prepositions (U-2, U-3, U-12) · research/12 §B–D + Round 2 (ЕУМ um159)
- **SX-1** `core/syntax.ts`: multi-token detectors over a token window — conditional `би` + person clitic (бим, бись, бисьмо), past + clitic (робив-єм, робилисмо), SW future `буду + l-participle`, pluperfect `був + l-participle`, `к/ко/ік + dative`, free `ся/сі/си` — each cites um159 (Q) with dialect code; undated ones say «датування не встановлено».
- **SX-2** enclitic/short pronouns мні, тобі/тебі, собі/себі, мі, ми, ті, ти, си, м'я/м'а, т'я/т'а, ни, ви → modern form + label `native_enclitic` only with a Q source; otherwise hint.
- **SX-3** reduced prepositions д/ді, ко/к/ік, ув, зо, од → modern preposition; contamination `до + dative` is a weight-0 hint until sourced (research/12 open).
- **SX-4** annotator and `/analyze` show multi-token spans (bracket underline) with the claim popover.

## MO — modern orthography derivation (U-4) · research/13 Round 2 A'
- **MO-1** `core/modernize.ts`: rules §7 apostrophe (бурян → бур'ян; exceptions буряк, свято, цвях, prefix/Лук'ян cases), §6 ґ, §8 йо/ьо, §19 -ськ-/-ств-, §29–30 gemination, §138 loanwords — each with § cite; output = suggestions with trace.
- **MO-2** applied as the last step of old→modern derivation and in `/analyze` («сучасний правопис: …»); never overrides a VESUM-attested form.

## IP — IPA (U-13) · research/13 Round 2 B', C'
- **IP-1** `core/ipa.ts`: grapheme→IPA for standard Ukrainian (в = /w/ with [w]/[ʋ]/[ʍ]/[u̯] by position, quoted), needs stress (unknown stress → no vowel-reduction, flagged).
- **IP-2** dialect overrides keyed by research/04 codes (≈17 rows); values are `method: 'derived'` unless quoted; UI toggle «вимова: літературна / <говір>».
- **IP-3** word card IPA row per stress variant.

## DD — diachronic dialect identification (U-23) · research/23 Round 2
- **DD-1** each dialect rule gets `earliest: number` (first attestation, Q) and fires only for texts ≥ earliest; rules without a dated source keep the 1798 gate.
- **DD-2** feature order = oldest first; the claim lists features in that order; group-formation chronology (Наддністрянський/Лемківський/Бойківський XIII, Гуцульський/Західнополіський XIV, Волинський XV, Подільський XVI, SE XVI–XVII) gates group labels.
- **DD-3** witness region stays separate evidence (B-3.6), never conflated.

## BK — SW vs SE type per form (U-20) · research/20
- **BK-1** 17 cited features → per-form score (log-odds, date-gated, scribal-norm half weight, «недостатньо даних» threshold); calibration constant flagged as project choice.
- **BK-2** UI chip «тип: південно-західний / південно-східний» with the explanation that the source split is SW vs SE dialect, not the Dnipro banks (central Right bank = SE).

## ET — etymology (U-22) · research/22
- **ET-1** data: `etymology: { sources: Evidence[]; text; chain?; hypotheses: {author, text, status, evidence, date}[]; conflict?: 'corpus-antedates'|'corpus-postdates' }`; extracted content and project hypotheses are separate fields.
- **ET-2** sources: Wiktionary/kaikki `etymology_text` (CC BY-SA, attributed), ЕСУМ via goroh as ≤2-sentence quotation + link (cite-only).
- **ET-3** conflict flag compares the dictionary's dating with our first attestation; review prompt only.

## NP — names & places (U-11, U-14) · research/15
- **NP-1** proper-name claim from VESUM prop/geo/fname/lname/patr, PROIEL `Ne`, Stanza PROPN (model, P-1.7).
- **NP-2** toponym gazetteer: top-30 corpus toponyms with Wikidata QIDs + P625; spelling-variant cluster (corpus spellings + derive/fold candidates) — Київ: Киевъ/Киевѣ/Кыевъ/… .
- **NP-3** `/map` (Leaflet + OSM tiles with attribution, lazy-loaded) with markers linking to word cards; word card «на мапі».

## NW — new witnesses (U-6, U-15, U-17, U-18, U-19, U-20, U-21) · research/16, 18, 19, 20, 21
One commit per witness; each passes P-2 vetting with a Q quote or stays out.
- **NW-1** Слово о полку Ігоревім — TOROT `spi`, institutional author vetted by «О Руская земле! уже за шеломянемъ еси!» (cit. 32).
- **NW-2** Київські глаголичні листки — TOROT `kiev-mis`, lang `chu`, provenance «disputed» (both positions cited); last.
- **NW-3** Кочубей «Рѣчь» + «Доношеніе» — Бантыш-Каменский 1859 ч.2 pp. 97–99 (archive.org djvu), page locators.
- **NW-4** Климентій Зиновіїв «Приповісти посполиті» — izbornyk klyment/kly08.htm, 1700–09.
- **NW-5** izbornyk XIV–XVI originals (research/19 table) and XVIII texts (research/21; modernised orthography → `orth: 'modernised'`, lexical witness only, no spelling evidence; Russian-orthography texts excluded by language gate).
- **NW-6** Sophia graffiti — `/api/inscriptions/inscription/?depth=2` (4272), one witness per inscription, IIIF image links (CC BY-NC, attributed); text licence to confirm before shipping texts (until then metadata + links only).
- **NW-7** songs (after research/17 round 3): kind `song`, folk = institutional «народна пісня (регіон)», ≤4 lines quotation, YouTube ids.

## MV — media views (U-9) · research/16, 17
- **MV-1** witness `media: {kind: 'iiif'|'youtube'|'image', url, attribution, licence}`; word/KWIC «переглянути» opens a media panel (IIIF image viewer or YouTube embed) next to the annotated text.
- **MV-2** affiliation links to Ukrainian culture projects (Sophia portal, Polyphony, Wikisource, izbornyk) shown as «джерело/проєкт».

## UL — usage labels (U-5) · research/14 (after FU-14)
- **UL-1** `usage` axis: taxonomy (stylistic, sociolect, territorial incl. діаспорне, chronological, thematic/ritual) from VESUM tags + Wiktionary categories (harvested, CC BY-SA); highlight chips + annotator legend.

## Work packages (Sonnet), waves
- **Wave A (now, low file overlap):** W3a = DV + MO (core/derivation.ts, core/modernize.ts, src block + derive mode) · W3b = SX (core/syntax.ts, annotate/analyze spans) · W3c = IP (core/ipa.ts, word-card row) · W3d = DD + BK (core/rules.ts dialect section + new core/banks.ts, chips).
- **Wave B (after A, touches build):** W4 = NP + map · W5 = NW-1…NW-6 (one commit per witness, then full data rebuild + data:publish) · W6 = MV · W7 = ET · W8 = UL · W9 = NW-7 songs.
- **W5 detail (starts in parallel with Wave A — it only touches `pipelines/manifest.ts`, `pipelines/authors.ts`, new `pipelines/ingest-*.ts`, tests):** NW-1…NW-6 in this order — Слово (TOROT spi; author record `slovo_author` institutional with the cit. 32 quote), Кочубей (archive.org `bantueshkam2` djvu pp. 97–99; author `kochubei` vetted only with a Q self-identification quote from those pages, else excluded and listed), Приповісти (izbornyk klyment/kly08.htm; author `zinoviiv` with «Іеромонах Климентій Зіновієв син»), izbornyk XIV–XVI originals per research/19 manifest table (skip translations: 02, 03, 08, 22, 23, 24), XVIII texts per research/21 (`orth: 'modernised'` → lexical witness only; skip translations 03, 05–08 and Russian 09, 31, 34), Sophia graffiti metadata + IIIF links (no inscription texts until the text licence is confirmed), Київські глаголичні листки (TOROT kiev-mis, lang chu, provenance disputed) last. One commit per witness/group; then `npm run build:data` once and commit data.
  **Data-branch publish must never force-push** (the classifier rightly blocked it): change `pipelines/data-branch.ts publish` to add a new commit on top of `origin/ukr-lexicon-data` (fetch, check out the branch in a temp worktree, replace the tree contents, commit, push fast-forward). Add a test for the command sequence.
Conflict rule: new code in new files; edits to shared files (WordCard.vue, build-annotate.ts, core/types.ts) are minimal, additive, and rebased just before commit.
