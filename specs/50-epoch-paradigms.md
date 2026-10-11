# SPEC 50 — Paradigms per historical epoch (word card)

Status: **draft for review**, 2026-10-11. Subordinate to SPEC 00 (P-1 evidence, P-1.7 inferred ≠ fact, P-3.1 unknown), SPEC 20 (linking B-2, delivery B-5 as amended: core + detail shards), SPEC 30 D-4 (visual classes).
Research basis: research/11 (sources PAVL, ENC, SHEV, TOROT header; chronology MH-01…MH-30; tag decoding §4; coverage §5).

> Goal: next to the modern VESUM paradigm the word card shows, per epoch, which forms of the lemma are **attested** in which grammatical cell, which forms a cited grammar **reconstructs**, which reconstructions an attestation **confirms**, and what the cited grammar says changed in that epoch. Every cell is evidence or `unknown`.

## Scope and phases
| phase | content | status |
|---|---|---|
| **MVP** | nouns (TOROT `Nb Ne`, UD `NOUN PROPN`, VESUM `noun`): attested cells in every shev epoch; reconstruction for `shev.proto` + `shev.old` only; chronology notes for nouns; UI panel | implement first |
| Phase 2 | adjectives (short/long sub-grids) and pronouns: attested cells; short-adjective reconstruction (PAVL p. 98: «Іменні прикметники змінювалися як іменнники з основою на *-ŏ/-јŏ та з основою на *-ā/-јā»); pronoun tables after research/11 O-4 | after MVP |
| Phase 3 | verbs: attested cells (present, aorist, imperfect, perfect/l-form, future, imperative, infinitive, supine); no reconstruction until an inflection-class source is cited | later |

## EP-1 Data model (detail shard, not core)
- **EP-1.1** Epoch paradigms live in **`LemmaDetail`** (SPEC 20 B-5.2 shard `public/data/lex/<bucket>.json`), fetched when the word card opens. `CoreCard` and `public/data/lexicon.json` gain **nothing** (B-5.1 core budget untouched). `splitCard`/`mergeCard` carry the new key unchanged (B-5.3 round-trip).
- **EP-1.2** Proposed types (`core/types.ts`, backend-owned):
```ts
/** Cell key grammar (core/cells.ts):  noun `${num}.${case}`  num ∈ sg|du|pl, case ∈ nom|gen|dat|acc|ins|loc|voc;
 *  dual cells are merged per PAVL p. 74: du.nav (Н.З.К), du.gl (Р.М), du.di (Д.О).
 *  adj/pron (phase 2) `${form}.${gender}.${num}.${case}` form ∈ short|long;  verb (phase 3) `${tense}.${num}.${person}` | `inf` | `sup` | `lpt.${gender}.${num}`. */
export type CellKey = string
export type TagSource = 'torot' | 'stanza' | 'vesum'      // manual treebank annotation | model output (P-1.7) | dictionary analysis of a modern spelling
export interface CellForm {
  raw: string            // spelling as attested (titlo kept, like FormCard.raw)
  n: number              // tokens of this spelling placed in this cell in this epoch
  src: TagSource
  t: number              // index into EpochParadigms.tags: the verbatim tag ("Nb -d---fa--i" | UD feats | VESUM tag line)
  amb?: number           // >1: each token was placed in `amb` candidate cells (underspecified tag / several VESUM lines)
  ex: [w: number, loc: string]   // first attestation: index into CorpusMeta.witnesses + locator (P-1.2)
  ctx?: string           // ≤ 60 chars context around ex (optional; dropped first when a shard is over budget)
}
export interface EpochCell { key: CellKey; forms: CellForm[]; more?: number }   // more = tokens of spellings beyond the per-cell cap
export interface EpochParadigm {
  epoch: string                                     // shev.* id (core/epochs.ts)
  grid: 'noun' | 'adj' | 'pron' | 'verb'
  N: number                                         // tagged tokens of this lemma in this epoch (denominator, P-1.6)
  cells: EpochCell[]
  dropped: { conflict: number; underspecified: number; untagged: number }   // tokens linked to the lemma but not placed, by reason
}
export type StemType = 'a' | 'ja' | 'o' | 'jo' | 'u' | 'i' | 'uu' | 'men' | 'nt' | 's' | 'r'   // uu = *-ū
export interface StemValue { type: StemType; model: string; old: string; gender: 'm' | 'f' | 'n'; rule: string }  // model = PAVL model lemma; old = Old Ukrainian lemma; rule = ST-* id
export interface EpochParadigms { tags: string[]; paradigms: EpochParadigm[]; stem: Claim<StemValue> }
// LemmaDetail gains:  epochs?: EpochParadigms
```
- **EP-1.3** Reconstructed cells are **not stored**: they are computed by the pure function `reconstruct(stem, epoch)` (core/reconstruct.ts) from `stem` + the cited tables (core/morph-tables.ts), in the build (tests, REPORT) and in the browser (display). Only the stem claim (with evidence) is stored.
- **EP-1.4** Caps (size, never evidence loss): ≤ 4 spellings per cell (most frequent, then oldest), the rest counted in `more`; one `ex` per spelling. Lemmas = the kept lemmas of B-5 (no extra lemmas are added for paradigms).
- **EP-1.5** Budget: the B-5.2 limit (each shard ≤ 256 KiB) still holds after adding `epochs`. Estimate (research/11 §5): ≈ 70 k pre-modern + ≈ 35 k modern `CellForm` × ≈ 45 B ≈ 5 MB over 512 shards ≈ +10 KB per shard (current mean ≈ 100 KB). If a shard exceeds the limit: drop `ctx` in that shard, then lower the per-cell cap to 2 for the largest lemmas; never drop `n`, `ex` or a cell. REPORT states the bytes added by `epochs`.

## EP-2 Tag sources and provenance
- **EP-2.1** Three tag sources only, each recorded per `CellForm.src`: `torot` (TOROT `morph`, manual annotation — TOROT licence, P-4.4), `stanza` (`.nlp.json` UD feats, model output, P-1.7), `vesum` (VESUM lines of the linked modern form). A token never takes tags from two sources.
- **EP-2.2** Decoders live in `core/cells.ts` (pure, shared with the frontend): `cellsFromProiel(morph)`, `cellsFromUd(upos, feats)`, `cellsFromVesum(tagLines)` → `{ grid, keys: CellKey[] }`, using research/11 §4 tables verbatim (PROIEL field order = TOROT header lines 60–160; UD values as observed; VESUM per research/02 §2).
- **EP-2.3** Underspecified values: PROIEL case `c|e|o`, gender `p|o|r|q`, UD/VESUM multiple analyses → all compatible keys with `amb = k` if `k ≤ 4`; value `x` (uncertain) or `k > 4` → `dropped.underspecified`.
- **EP-2.4** Dual: PROIEL number `d` / UD `Number=Dual` → `du.*`; cases n/a/v → `du.nav`, g/l → `du.gl`, d/i → `du.di` (PAVL p. 74 quote in research/11 §1).
- **EP-2.5** Cell evidence: `cellEvidence(form, paradigm, corpus)` (core/cells.ts) returns `D(witnessId, loc, "<raw> «<tag>»", note)` with note «ручна розмітка TOROT» | «модельна розмітка Stanza, не словниковий факт (P-1.7)» (+ «текст поза доменом моделі» if the witness `.nlp.json` has `outOfDomain`) | «аналіз ВЕСУМ сучасного написання». `claim(key, cellEvidence(…))` must succeed for every stored CellForm (P-1.1).

## EP-3 Build stage (`pipelines/build-epochs.ts`, called by build.ts after linking B-2, output into LemmaDetail)
- **EP-3.1** Input per token: its witness, its chosen link (lemma, route, B-2), its tag (EP-2.1 priority: `morph` if present, else stanza feats, else — only for `direct` route in modern witnesses — VESUM lines of the linked form for that lemma). Tokens without a tag → `dropped.untagged`.
- **EP-3.2** Epoch = the witness `epochShev` (core/epochs.ts). **Scheme: shev only**, because B-3.4 and B-4 shifts already use shev, and the dated changes (13th c., 14th–15th c., 16th c., research/11 §3) fall inside shev boundaries, whereas `wl.ruthenian` (1350–1797) would put MH-04, MH-16, MH-19, MH-28 into one tab. A witness with several epochs (`confidence: low`) contributes to each, with the epoch list shown on its cell popover.
- **EP-3.3** Grid: from the tag's POS (EP-2.2). A token whose grid ≠ the lemma's VESUM POS grid (e.g. a participle tagged V- under an adjective lemma) → `dropped.conflict`.
- **EP-3.4** Linking route consistency: a `stanza` tag is used only if the link route is `stanza-lemma`, or the stanza lemma's derive() candidates contain the linked VESUM lemma; else `dropped.conflict` (the tag belongs to another analysis). For nouns the stanza `Gender` must equal the VESUM gender of the lemma (m/f/n); mismatch → `dropped.conflict`.
- **EP-3.5** VESUM placement (modern and late_middle witnesses, route `direct`): the token's folded modern form (B-2 step 4) is looked up among the lemma's VESUM lines; each matching line → one key; `amb` = number of distinct keys. The raw (unfolded) spelling is stored.
- **EP-3.6** Aggregation per (lemma, epoch, key, raw): `n`, first `ex` (min witness `date.to`, then witness order, then token order), tag of the first token. Caps per EP-1.4.
- **EP-3.7** `N` = tokens of the lemma in the epoch with a tag (placed + dropped.conflict + dropped.underspecified); `dropped` is stored so the UI can show "N placed of M linked".
- **EP-3.8** Absence is never evidence: a cell with zero tokens is `unknown` in the UI, never "not used". In particular stanza under-detects the dual ≈ 9× (research/11 §4.2), so no rule may infer dual loss from stanza data.

## EP-4 Stem-type assignment (evidence-bearing)
- **EP-4.1** `stem` is a `Claim<StemValue>`; value `unknown` unless one ST rule fires. Input: the Old Ukrainian lemma `old` = TOROT lemma (manual) of a token linked to this lemma in shev.proto/old, else the stanza lemma (method `stanza`, P-1.7), choosing the most frequent; gender from the majority TOROT/UD gender of those tokens, else VESUM gender.
- **EP-4.2** Rules (data table `STEM_RULES` in core/stem.ts, each with `cite` = PAVL quote from research/11 §1, P-1.3), first match wins:
  | id | condition on `old`, gender | type, model |
  |---|---|---|
  | ST-01 | lemma ∈ PAVL p. 71 ŭ-list (сынъ, волъ, полъ, вьрхъ, медъ, домъ, ледъ, чинъ, садъ, рядъ, разъ, пиръ, солодъ, миръ, станъ, низъ, долъ, олъ) | u, сынъ — score 0.5 («з меншою або більшою мірою достовірності») |
  | ST-02 | lemma ∈ p. 72 s-list (небо, слово, тѣло, око, ухо, чюдо) | s, небо |
  | ST-03 | neut. ending -мя | men, имя |
  | ST-04 | neut. ending -я/-ѧ, not -мя (теля, отроча, дитя) | nt, теля |
  | ST-05 | lemma ∈ {мати, дъчи} | r, мати |
  | ST-06 | fem. ending -ы (буки, мърки, цьрки written -ы/-и per p. 72) | uu, боукы |
  | ST-07 | masc. ending -ь after б п в д т с, or ∈ {звѣрь, огнь, угль} (p. 71) | i, зять |
  | ST-08 | fem. ending -ь | i, печь |
  | ST-09 | masc. ending -ъ (not ST-01/02) | o, плодъ |
  | ST-10 | masc. ending -ь / -и / -й (not ST-07) | jo, конь (мечь if the stem ends in ж ч ш щ) |
  | ST-11 | neut. ending -о (not ST-02) | o, село |
  | ST-12 | neut. ending -е/-ие/-ье | jo, поле |
  | ST-13 | m/f ending -а after a hard consonant | a, рѣка |
  | ST-14 | m/f ending -я/-ѧ, or -а after ж ч ш щ (p. 74 «шиплячі приголосні в той час були м’якими»), or fem. -ыни/-ини. Stems in -ц- (птица) stay `unknown` until a source for their softness is cited (open question) | ja, земля (доуша after ж ч ш щ) |
- **EP-4.3** Evidence of `stem`: the rule's cite (Q, PAVL) + `D(witness, loc, "<raw> → «<old>»", 'TOROT lemma' | 'stanza lemma')` + the gender evidence (P-1.4). Masc. n-stems (камы, корень) have no model table → `unknown`.

## EP-5 Reconstruction (shev.proto, shev.old only)
- **EP-5.1** `reconstruct(stem, epoch)` returns cells only for `shev.proto` and `shev.old`: PAVL's tables describe the system of «найдавніших східнослов’янських пам’ятках» (p. 69) while «вже наприкінці дописемного періоду розвитку мови почалося змішування типів відмінювання» (p. 78); no cited table exists for later epochs → no reconstruction there (`unknown`).
- **EP-5.2** Method: suffix substitution on the PAVL model paradigm. `stemOf(old, model)` strips the model's nominative ending; oblique stems of consonant types take the model's extension (имя→имен-, теля→телят-, небо→небес-, мати→матер-, боукы→боукъв-). A lemma whose nominative does not end like the model → `unknown`. PAVL bracketed variants become extra candidates of the same cell.
- **EP-5.3** Velar alternation: if the stem ends in к г х and the model ending begins with ѣ or и in that cell (рѣцѣ, плодѣ, плоди), apply к→ц, г→з, х→с; cite WUK «друга палаталізація перед -и, -ѣ (друзи … вълцѣ …)» + PAVL p. 74 рѣка–рѣцѣ. Trace step id `MOR-VEL`.
- **EP-5.4** Each reconstructed form carries `method: 'reconstruction'`, a trace `[ST-xx, model-table cell, (MOR-VEL)]` with citations (P-1.5), and is never stored or displayed as an attestation (D-2.4, D-4.1).
- **EP-5.5** Confirmation: a reconstructed form whose stage-N normalisation (core/phonology N-rules, research/03 §1: оу→у, ꙑ→ы …) equals the normalisation of an attested `CellForm.raw` **in the same cell and epoch** is `confirmed`; its evidence adds that CellForm's `cellEvidence`. Same spelling in another cell does not confirm.
- **EP-5.6** Vocative pl/du and neuter vocative are not reconstructed separately: the cell shows «= Н.» with PAVL p. 74 quote (vocative coincides with nominative).

## EP-6 Per-epoch grammatical system and chronology notes
- **EP-6.1** `core/morph-history.ts` = the MH-01…MH-30 table of research/11 §3 as data `{ id, scope: 'noun'|'adj'|'pron'|'verb', keys?: CellKey pattern, from?: epochId, to?: epochId, dated: string | null, cite: Evidence[] }`; every entry ≥ 1 Q evidence (P-1.3). `dated: null` is shown as «дата в джерелі не вказана».
- **EP-6.2** Rows/columns per epoch (nouns):
  | epoch | sg | du | pl | voc row | basis |
  |---|---|---|---|---|---|
  | shev.proto, shev.old | ✓ | ✓ (3 merged rows) | ✓ | ✓ | PAVL p. 68, 74; MH-01 note (dual loss from 13th c.) |
  | shev.early_middle, shev.middle, shev.late_middle | ✓ | only if ≥ 1 attested du cell in that epoch; else hidden with MH-01 + MH-02 notes | ✓ | ✓ | MH-02 («аж до 19 ст.» in the written language) |
  | shev.modern | VESUM grid (existing Paradigm.vue) + attested modern spellings placed in it | no column; MH-03 relics note | ✓ | ✓ | MH-03, MH-17 |
  Verbs (phase 3): aorist/imperfect blocks in proto/old; later epochs only if attested, with MH-21/22 notes; dual persons per MH-04.
- **EP-6.3** An epoch with no witness in the corpus (currently `shev.early_middle`) shows a disabled tab «у корпусі немає пам’яток цієї доби (N = 0)» plus its MH notes; no cells, no reconstruction.
- **EP-6.4** Notes are attached to cells when `keys` matches (e.g. MH-07 on `sg.dat`, MH-09 on `pl.dat`, MH-11 on `pl.gen`) and listed under the grid; each opens its quote + locator (EvidencePopover).

## EP-7 UI (word card)
- **EP-7.1** `EpochParadigm.vue` panel on WordCard next to the modern Paradigm: tabs in shev order, label = `Epoch.uk` + years + «N = …» (EP-3.7); default tab = the oldest epoch with data. Shard not yet loaded → skeleton; shard missing `epochs` → «історичні парадигми: немає даних» (not an error).
- **EP-7.2** Grid built by `src/lib/epochGrid.ts` in the style of `src/lib/paradigm.ts` (rows = cases with the Ukrainian labels of paradigm.ts, columns per EP-6.2), keys from `core/cells.ts`.
- **EP-7.3** Cell content, three classes per SPEC 30 D-4 (shape + text, never colour only): **attested** (solid; spelling, `n`, source badge «T» ручна розмітка / «M» модель / «В» ВЕСУМ, «≈k» when `amb`), **reconstruction** (dashed, italic, badge «реконструкція»), **confirmed reconstruction** (dashed + ✓ «підтверджено пам’яткою»). Attested and reconstructed forms appear side by side when they differ; an attestation is never hidden.
- **EP-7.4** Empty cell with no evidence → «невідомо» (P-3.1), never «—» (structurally absent cells are simply not rendered, EP-6.2).
- **EP-7.5** Cell click → popover: per spelling the witness title, author badge (P-2.4 period label), `loc`, `ctx`, verbatim tag, source note (EP-2.5); if the spelling equals a FormCard.raw of the lemma, link to its KWIC (Kwic.vue); for reconstructions the trace with citations (DerivationSteps style).
- **EP-7.6** Legend on the panel (FormLegend extension): the three classes, source badges, «≈k», «невідомо», «= Н.», CS-witness badge (witness `lang: 'chu-rus'`, MH-30 note).
- **EP-7.7** Stanza cells from `outOfDomain` witnesses carry an extra badge «модель поза доменом».

## EP-8 Report
- **EP-8.1** REPORT gets a subsection (under §2 linking coverage): per epoch and source — tagged tokens, placed / conflict / underspecified / untagged, lemmas with ≥ 1 cell, stem claims by rule id, reconstructed cells and confirmed share, bytes added to shards.

## Tests
Backend `tests/epoch-paradigm.test.ts` (fixture tokens, no full build needed except EP-1.5):
- EP-1.1: split/merge round-trip keeps `epochs`; CoreCard has no `epochs` key.
- EP-1.3: no `reconstruct`ed form is present in stored data (every stored CellForm has `src`).
- EP-1.4: a cell with 6 spellings stores 4 and `more` = tokens of the other 2.
- EP-1.5: built shards ≤ 256 KiB with `epochs` (extends B-5 budget test).
- EP-2.2: `cellsFromProiel("Nb -d---fa--i")` → `du.nav`; `"Nb -s---mv--i"` → `sg.voc`; `cellsFromUd('NOUN','Case=Ins|Gender=Fem|Number=Dual')` → `du.di`; `cellsFromVesum(['noun:inanim:f:v_rod','noun:inanim:p:v_naz', …])` for руки → 4 keys.
- EP-2.3: gender `q` / case `c` → amb; case `x` → dropped.underspecified.
- EP-2.4: dual g and l both → `du.gl`.
- EP-2.5: every CellForm of the fixture yields a valid `claim()`; stanza note contains «P-1.7»; outOfDomain note present for samovydets.
- EP-3.1: torot morph wins over stanza feats for the same token.
- EP-3.2: an Eneida token lands in `shev.late_middle`, a low-confidence two-epoch witness in both.
- EP-3.3/3.4: stanza lemma not deriving to the link lemma → conflict; stanza Gender=Fem for a masc. lemma → conflict.
- EP-3.5: modern «руки» under рука → 4 keys, amb = 4, raw unfolded.
- EP-3.6: first `ex` = earliest witness.
- EP-3.7: N = placed + conflict + underspecified.
- EP-3.8: a lemma with stanza data only and no dual token shows du cells as unknown (no "lost" label exists in the schema).
- EP-4.1/4.2: сынъ → ST-01 u (score 0.5); конь → ST-10 jo; мечь → jo model мечь; гость → ST-07 i; печь → ST-08 i; рука → ST-13 a; душа → ST-14 ja model доуша; имя → men; камы → unknown; every STEM_RULES row has a Q cite.
- EP-4.3: stem claim evidence = rule cite + lemma D (+ gender).
- EP-5.1: reconstruct(stem, 'shev.middle') = ∅.
- EP-5.2: рука → sg.ins рукою, pl.loc рукахъ, du.di рукама; имя → sg.gen имене + variant имени.
- EP-5.3: рука → sg.dat руцѣ; нога → sg.loc нозѣ; вълкъ → sg.loc вълцѣ, pl.nom вълци; плодъ → плодѣ unchanged.
- EP-5.4: every reconstructed form has method `reconstruction` and a trace whose steps all have citations.
- EP-5.5: attested руцѣ in sg.dat confirms; attested руцѣ only in du.nav does not confirm sg.dat.
- EP-5.6: neuter voc → «= Н.» marker with PAVL cite.
- EP-6.1: every MH entry has ≥ 1 Q evidence; ids unique.
- EP-6.2: du column hidden in shev.middle without attested du, shown with one attested du token.
- EP-6.3: shev.early_middle → disabled, N = 0.
- EP-8.1: REPORT contains the epoch-paradigm subsection with denominators.

Frontend `tests/ui.test.ts`:
- EP-7.1: tabs order and N labels; default = oldest epoch with data; missing `epochs` → «немає даних».
- EP-7.2: epochGrid for a fixture noun → 7 rows × (sg, du, pl) in shev.old.
- EP-7.3: three classes render distinct classes **and** text badges; attested + differing reconstruction both visible.
- EP-7.4: empty cell text «невідомо».
- EP-7.5: popover shows witness, loc, verbatim tag, source note; KWIC link when raw ∈ forms.
- EP-7.6: legend lists all markers.
- EP-7.7: outOfDomain badge on a samovydets cell.
- EP-6.4: MH-09 note visible on `pl.dat` with its quote.

## COVERAGE rows to add (specs/COVERAGE.md is edited by its owner, not by this spec)
Also add `'50-epoch-paradigms'` to `SPECS` in tests/coverage.test.ts (it reads a fixed list; ids are matched by `**XX-n.n**`).
| id | test or manual |
|---|---|
| EP-1.1 | tests/epoch-paradigm.test.ts › split/merge keeps epochs; core has none |
| EP-1.2 | tests/epoch-paradigm.test.ts › fixture epochs type-check against EpochParadigms |
| EP-1.3 | tests/epoch-paradigm.test.ts › no reconstruction is stored |
| EP-1.4 | tests/epoch-paradigm.test.ts › per-cell cap 4 + more |
| EP-1.5 | tests/build.test.ts › B-5 size budget (shards incl. epochs) |
| EP-2.1 | tests/epoch-paradigm.test.ts › torot morph wins over stanza feats |
| EP-2.2 | tests/epoch-paradigm.test.ts › decoders: proiel, ud, vesum |
| EP-2.3 | tests/epoch-paradigm.test.ts › underspecified → amb or dropped |
| EP-2.4 | tests/epoch-paradigm.test.ts › dual g and l → du.gl |
| EP-2.5 | tests/epoch-paradigm.test.ts › every cell form yields a valid claim |
| EP-3.1 | tests/epoch-paradigm.test.ts › untagged tokens are counted, not placed |
| EP-3.2 | tests/epoch-paradigm.test.ts › shev epoch of the witness |
| EP-3.3 | tests/epoch-paradigm.test.ts › grid mismatch → conflict |
| EP-3.4 | tests/epoch-paradigm.test.ts › stanza lemma/gender disagreement → conflict |
| EP-3.5 | tests/epoch-paradigm.test.ts › руки → 4 keys, amb 4 |
| EP-3.6 | tests/epoch-paradigm.test.ts › first ex = earliest witness |
| EP-3.7 | tests/epoch-paradigm.test.ts › N = placed + conflict + underspecified |
| EP-3.8 | tests/epoch-paradigm.test.ts › no dual loss inferred from absence |
| EP-4.1 | tests/epoch-paradigm.test.ts › stem rules on old lemmas |
| EP-4.2 | tests/epoch-paradigm.test.ts › every STEM_RULES row has a Q cite |
| EP-4.3 | tests/epoch-paradigm.test.ts › stem claim evidence = rule cite + lemma record |
| EP-5.1 | tests/epoch-paradigm.test.ts › no reconstruction after shev.old |
| EP-5.2 | tests/epoch-paradigm.test.ts › рука / имя reconstructions |
| EP-5.3 | tests/epoch-paradigm.test.ts › velar alternation нога / вълкъ |
| EP-5.4 | tests/epoch-paradigm.test.ts › reconstructions carry method and cited trace |
| EP-5.5 | tests/epoch-paradigm.test.ts › confirmation only in the same cell |
| EP-5.6 | tests/epoch-paradigm.test.ts › vocative = nominative marker |
| EP-6.1 | tests/epoch-paradigm.test.ts › every MH entry has a Q cite |
| EP-6.2 | tests/epoch-paradigm.test.ts › dual column only where attested after shev.old |
| EP-6.3 | tests/epoch-paradigm.test.ts › epoch without witnesses is disabled |
| EP-6.4 | tests/ui.test.ts › MH note on pl.dat |
| EP-7.1 | tests/ui.test.ts › epoch tabs order and N |
| EP-7.2 | tests/ui.test.ts › epochGrid rows and columns |
| EP-7.3 | tests/ui.test.ts › three classes with text badges |
| EP-7.4 | tests/ui.test.ts › empty cell says невідомо |
| EP-7.5 | tests/ui.test.ts › cell popover evidence |
| EP-7.6 | tests/ui.test.ts › epoch legend markers |
| EP-7.7 | tests/ui.test.ts › out-of-domain badge |
| EP-8.1 | tests/gaps.test.ts › REPORT has the epoch-paradigm subsection |

## Implementation tasks (disjoint ownership, like PLAN 40)
Contract first: backend lands **E-B0** (types EP-1.2 + `core/cells.ts` key grammar + fixture with one noun having `epochs` and a stem claim) and pushes before the frontend starts E-F1.

**Backend** — owns `core/{types,cells,stem,morph-tables,morph-history,reconstruct}.ts`, `core/sources.ts` (add PAVL), `pipelines/build-epochs.ts` (+ the call in build.ts and REPORT subsection), `pipelines/fixture.ts`, `tests/epoch-paradigm.test.ts`, the B-5 budget assertion in `tests/build.test.ts`, `specs/COVERAGE.md` rows above.
- [ ] E-B0 contract: types, CellKey grammar, fixture.
- [ ] E-B1 `core/cells.ts`: three decoders + `cellEvidence` (EP-2.*).
- [ ] E-B2 `core/morph-tables.ts` (PAVL pp. 74–77 models as data, each table with its Q\* cite and page; resolve research/11 O-1 first), `core/stem.ts` (STEM_RULES, EP-4), `core/reconstruct.ts` (EP-5).
- [ ] E-B3 `core/morph-history.ts` (MH-01…30, EP-6.1).
- [ ] E-B4 `pipelines/build-epochs.ts` (EP-3), written into LemmaDetail; budget handling EP-1.5; REPORT EP-8.1.
- [ ] E-B5 tests + COVERAGE rows; full build; check shard sizes.

**Frontend** — owns `src/components/EpochParadigm.vue`, `src/lib/epochGrid.ts`, edits in `src/components/WordCard.vue` and `FormLegend.vue`, `tests/ui.test.ts`; imports `core/cells.ts`, `core/reconstruct.ts`, `core/morph-history.ts` read-only (asks backend for changes).
- [ ] E-F1 `epochGrid.ts` (EP-7.2, EP-6.2 visibility).
- [ ] E-F2 `EpochParadigm.vue` tabs, cells, classes, «невідомо», notes (EP-7.1, 7.3, 7.4, 6.3, 6.4).
- [ ] E-F3 popovers, legend, badges (EP-7.5–7.7).
- [ ] E-F4 ui tests; screenshots of a noun card (e.g. кінь / рука) with shev.old and shev.modern tabs.

MVP done when: nouns only, E-B0…B5 and E-F1…F4 ticked, `npm test` + `npx vue-tsc --noEmit` + `npm run build` green, every shard ≤ 256 KiB.
