/**
 * Data contracts shared by the pipelines (producers) and the Vue app (consumer). SPEC 10 M-6, SPEC 20.
 * Every label is a Claim (core/evidence.ts) — the schema has no field where an unevidenced label could live.
 */
import type { Claim, Evidence } from './evidence.ts'
import type { EpochAssignment } from './epochs.ts'
import type { Author } from '../pipelines/authors.ts'
export type { Author }

// ── Intermediate: ingest output (data/work/<witness>.json) ───────────────────────────────────────
export interface TokenRec {
  raw: string            // as written (after site decoding; titlo marks kept)
  loc: string            // locator inside the witness: "стб. 737", "Ін 1:5", "с. 11", poem title …
  s: number              // segment index (sentence/verse/line) for KWIC windows
  lemma?: string         // TOROT lemma (scholarly annotation, D-evidence)
  morph?: string         // TOROT morphology / POS
  /** P-1.7: set when the token was inferred, not read: 'segmentation' = word boundaries of continuous (unspaced) text found by dictionary segmentation (pipelines/sophia-segment.ts) */
  method?: 'segmentation'
}
/**
 * SPEC 63 CX-9: a statement about the dialect of a witness text. `status: hypothesis` = the user's own statement (BL-20/ET-1 model: author, date, status) —
 * it is shown but NEVER becomes a dialect label; `status: sourced` = a published statement with a verbatim quote and locator (the only kind that is a label).
 */
export interface DialectStatement { group: string; author: string; status: 'hypothesis' | 'sourced'; date: string; said?: string; evidence: Evidence[]; note?: string }
export interface WitnessOut {
  id: string; unit: string; title: string; author: string; url: string
  date: [number, number]; dateCite: Evidence; msDate?: number
  lang: 'orv' | 'chu-rus' | 'chu' | 'ruthenian' | 'uk' | 'undetermined'; region?: string
  /** SPEC 63 LB-10: where `region` (the place of publication) was read when the ingester left it empty: the archive.org metadata field and its verbatim value, or a quoted reference work */
  regionCite?: Evidence
  /** SPEC 63 SRC-5: the kind of work when it is a linguistic work («лінгвістична праця», research/48); absent = not classified */ genre?: string
  /** SPEC 63 SRC-5 / RF: explicit Russian-source flag set by the harvester (research/46); build uses it before the place / institution rules */ ru?: import('./ru-source.ts').RuFlag
  witnessType: string; edition: string; orth?: string; oldI?: boolean; license?: string
  /** SPEC 63 HV-5: the school of the work as research/44 gives it (`source` names the row, `confidence` its certainty); absent when no source states it */
  school?: { id: string; source: string; confidence?: string }
  /** SPEC 60 NW-6 amendment: shown wherever the witness text is shown (/texts, media panel) when the text licence is not stated by the source */
  licenceNote?: string
  /** Sophia: the portal's diplomatic transcription (as written, abbreviations unexpanded) kept for display when the analysed text is the interpretative edition or a segmentation of it */
  diplomatic?: string
  authorEvidence?: Evidence[]   // self-reference found in the witness itself (e.g. Kyiv Chronicle)
  /** R2U-1: attestation-only witness (r2u dictionary lookups): its tokens date and attest spellings of lemmas the corpus already keeps, but are no running text — they add nothing to N, f, ipm, dispersion, collocations or the keep rule */
  noFreq?: boolean
  excludeReason?: { why: string; evidence: Evidence[] }   // set by the ingester when the text is not in the lexicon's language (e.g. Shevchenko's Russian-language poems); build admit() refuses it and REPORT §1 lists it
  /** SPEC 60 MV-1 / NW-7: the witness's media (a song's YouTube video; Sophia IIIF image). `id` = video id for youtube. Inherited by WitnessMeta. */
  media?: WitnessMedia
  /** CX-9: user hypotheses and sourced statements about the dialect of this text (DialectStatement) */
  dialect?: DialectStatement[]
  dropped: { unmapped: number; apparatus: number }
  tokens: TokenRec[]
}
export interface WitnessMedia { kind: 'iiif' | 'youtube' | 'image'; url: string; attribution: string; licence: string; id?: string; title?: string }

// ── Output: public/data/*.json ───────────────────────────────────────────────────────────────────
/** `ik`: SPEC 63 MM-11 — the VESUM block of this lemma lists, for the same tags, a second form that differs only by і for е (легінь p.v_naz: легіні ~ легені); this form is the е-variant */
export interface VesumHit { lemma: string; tags: string; ik?: 1 }
export interface Kwic { w: string; loc: string; left: string; node: string; right: string; date: [number, number] }
export interface TraceStep { rule: string; from: string; to: string }

/** One historical spelling of a lemma (e.g. кънѧзь, кънѧзоу) linked to a modern form. */
export interface FormCard {
  raw: string; norm: string; modern: string; f: number
  date: [number, number]                       // earliest attestation of this spelling (witness composition date)
  /** SPEC 63 OQ: `date` comes only from gated (low-quality or superseded) OCR: «лише OCR низької якості», never compared with `claims.oldest`, never an attestation */
  ocrOnly?: true
  link: Claim<{ lemma: string; form: string; route: 'torot-lemma' | 'stanza-lemma' | 'token' | 'direct'; alternatives: string[] }>
  derivation: TraceStep[]
  /** cs / contact / dialect labels (Claim<true>) with evidence; `rusyn` (research/10 §5) is a parallel, non-competing reading whose value is the axis label. */
  claims: Record<string, Claim<any>> & { rusyn?: Claim<string> }
  hints: string[]                              // weight-0 rule ids (P-3.1)
  epochs: string[]                             // epochs of the witnesses this spelling occurs in
  kwic: Kwic[]                                 // ≤ 6
  /** BL-6c: true token count of THIS spelling per witness id (every linked token, not only the ≤ 6 KWIC lines); absent in data built before BL-6c */
  byW?: Record<string, number>
}

export interface StressVariant {
  form: string; positions: number[]; status: 'normative' | 'admissible' | 'dialectal' | 'historical' | 'poetic' | 'unknown'
  evidence: Evidence[]; period?: string; method: 'dictionary' | 'metrical-inference' | 'corpus'
}

export interface FirstAttestation {
  author: string; witness: string; loc: string; date: [number, number]; witnessType: string
  form: string; coFirst: string[]
}

export interface LemmaStats {
  f: number; ipm: number; hk: number; dots: number; dp: number; range: number
  byEpoch: Record<string, { f: number; ipm: number }>           // epoch id → counts (denominators in corpus.json)
  byCentury: { c: number; f: number; ipm: number; smooth: number | null }[]   // c = century number (11 = XI ст.)
  shifts: { a: string; b: string; g2: number; logRatio: number; p: number }[]  // adjacent epochs (shev scheme)
  colloc: { lemma: string; fxy: number; logDice: number }[]
  /** Witness-region distribution (SPEC 20 B-3.6: regions of the witnesses, NOT a dialect claim); N = tokens of that region's witnesses. */
  byRegion?: { code: string; f: number; N: number }[]
}

export interface LemmaCard {
  lemma: string; pos: string
  /** SPEC 61 FX-5: paradigm kind by the lemma's VESUM POS (core/pos-gate.ts); absent in pre-FX data (readers infer from `paradigm` tags) */
  paradigmKind?: 'noun' | 'pron' | 'adj' | 'verb' | 'numr' | 'uninflected'
  epochs?: EpochParadigms                                       // SPEC 50 EP-1.1: lives in LemmaDetail (shards), never in CoreCard / lexicon.json
  paradigm: { form: string; tags: string }[]                    // VESUM forms, verbatim tags (D-evidence)
  stress: StressVariant[]
  forms: FormCard[]
  first: Claim<FirstAttestation>
  stats: LemmaStats
  claims: {
    register: Claim<'colloquial'>                               // literary is never inferred (research/08 B3)
    surzhyk: Claim<true>
    origin: Claim<'native' | 'church_slavonic' | 'borrowing'>
    oldest: Claim<{ form: string; date: [number, number]; epoch: string }>
    dialect: Record<string, Claim<true>>
    /** union of the modern FormCards' rusyn claims: 'rusyn' | 'rusyn:lemko' | 'rusyn:presov' | 'rusyn:pannonian' | 'rusyn:subcarpathian' */
    rusyn?: Claim<string>
    /** SPEC 60 NP-1: proper-name kind (VESUM prop/geo/fname/lname/patr, PROIEL Ne, Stanza PROPN = model); absent when nothing supports it */
    proper?: Claim<import('./places.ts').NameKind>
    /** BL-20: «друга палаталізація» (R24) — the attested forms of this velar-stem lemma that show к/г/х → ц/з/с before и/і/ѣ */
    palatalization?: Claim<{ forms: { raw: string; form: string; alt: string; f: number; via: 'R24r' | 'kept' }[] }>
  }
}

// ── B-5 delivery split: core (loaded at startup) + per-lemma detail (fetched with the word card). LemmaCard = mergeCard(core, detail) ───
/** Core spelling: what search, the annotator and derive read (a full FormCard is assignable). */
export type CoreForm = Pick<FormCard, 'raw' | 'norm' | 'modern' | 'claims' | 'hints'>
export type CoreStats = Pick<LemmaStats, 'f' | 'ipm' | 'hk' | 'dots'>
/** B-5a (amendment 2026-10-12): core keeps only author / witness / date / form of the first attestation and an EMPTY evidence list; locator, witness type, coFirst, evidence and method are detail. */
export type CoreFirst = Claim<Pick<FirstAttestation, 'author' | 'witness' | 'date' | 'form'>>
export interface CoreCard extends Omit<LemmaCard, 'stress' | 'forms' | 'stats' | 'claims' | 'epochs' | 'first'> { first: CoreFirst; forms: CoreForm[]; stats: CoreStats; claims: Omit<LemmaCard['claims'], 'oldest'> }
/** The rest of a known first attestation: the claim without core's value fields (value = loc, witnessType, coFirst). Absent when the claim is unknown or kept whole in core. */
export type FirstDetail = Omit<Claim<FirstAttestation>, 'value'> & { value: Pick<FirstAttestation, 'loc' | 'witnessType' | 'coFirst'> }
export type FormDetail = Omit<FormCard, keyof CoreForm>
export interface LemmaDetail { first?: FirstDetail; stress: StressVariant[]; oldest: LemmaCard['claims']['oldest']; forms: FormDetail[]; stats: Omit<LemmaStats, keyof CoreStats>; epochs?: EpochParadigms }   // forms[i] belongs to core.forms[i]
/** public/data/lexicon.json (format 3): CoreCard[] in the compact wire form of core/pack.ts (tag table, defaults omitted) with the shared evidence pool. */
export interface PackedCore { format: 3 | 4; ev: Evidence[]; tags: string[]; cards: unknown[][] }
/** public/data/lex/<bucket>.json (format 1): the details of the lemmas hashing to the bucket, own evidence pool. */
export interface Shard {
  format: 1; ev: Evidence[]; lemmas: string[]; details: LemmaDetail[]
  /** SPEC 63 PF-4: lemmas whose detail does not fit this shard → names (relative to lex/, without .json) of the part files that hold it, in order; such a lemma is NOT in `lemmas`. Absent in an ordinary shard. */
  over?: Record<string, string[]>
}

// ── SPEC 50 EP-1.2: attested cells per epoch (detail shard). Reconstructions are NOT stored (EP-1.3): core/reconstruct.ts computes them from `stem`. ──
/** Cell key grammar (core/cells.ts):  noun `${num}.${case}`  num ∈ sg|du|pl, case ∈ nom|gen|dat|acc|ins|loc|voc;
 *  dual cells are merged per PAVL p. 74: du.nav (Н.З.К), du.gl (Р.М), du.di (Д.О).
 *  pron (grid 'pron'): `${num}.${case}`, case without voc, dual unmerged (`du.nom` …); adj (phase 2) `${form}.${gender}.${num}.${case}` form ∈ short|long;  verb (phase 3) `${tense}.${num}.${person}` | `inf` | `sup` | `lpt.${gender}.${num}`. */
export type CellKey = string
export type TagSource = 'torot' | 'stanza' | 'vesum'      // manual treebank annotation | model output (P-1.7) | dictionary analysis of a modern spelling
export interface CellForm {
  raw: string            // spelling as attested (titlo kept, like FormCard.raw)
  n: number              // tokens of this spelling placed in this cell in this epoch
  src: TagSource
  t: number              // index into EpochParadigms.tags: the verbatim tag ("Nb -d---fa--i" | UD feats | VESUM tag line)
  enc?: true             // pronoun grid: enclitic (short) form мя/ми/тя/ти/ся/си/ны/вы, recognised by spelling in its cell (core/cells.ts isEnclitic; our classification, not a source claim)
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

export interface WitnessMeta extends Omit<WitnessOut, 'tokens' | 'dropped'> {
  /** SPEC 63 RU-2: the edition / description of this source is Russian (core/ru-source.ts; reasons in research/46); absent = no such flag */
  ru?: import('./ru-source.ts').RuFlag
  /** SPEC 63 OQ: OCR quality flag (core/ocr-quality.ts); absent = proofread or good OCR */
  oq?: { score: number; band: 'low' | 'garbage'; preferred?: string[] }
  n: number; linked: number; dropped: WitnessOut['dropped']
  epochShev: Claim<EpochAssignment>; epochWl: Claim<EpochAssignment>
  /** the witness's Stanza output (.nlp.json) is flagged outOfDomain (SPEC 50 EP-2.5/EP-7.7): its model tags are shown with an extra badge */
  outOfDomain?: boolean
}

/** In-memory lexicon: a plain `LemmaCard[]`. */
export type Lexicon = LemmaCard[]
/** public/data/lexicon.json (format 2): cards whose Evidence objects are replaced by indices into the shared pool `ev` (core/pack.ts). */
export interface PackedLexicon { format: 2; ev: Evidence[]; cards: LemmaCard[] }

export interface CorpusMeta {
  generated: string
  authors: Author[]                                            // vetting records (WitnessMeta.author = Author.id)
  witnesses: WitnessMeta[]
  epochSizes: Record<string, number>                           // N tokens per epoch id (denominators)
  centurySizes: Record<string, number>
  N: number; linked: number; unresolved: number
  topUnresolved: { form: string; f: number }[]
  /** neutral status note shown next to any rusyn:* label (core/rules.ts RUSYN_STATUS, research/10 §0) */
  rusynStatus: { note: string; evidence: Evidence[] }
  /** witness region → ISO 3166-2 oblast codes (`code` = region key used in LemmaStats.byRegion), N tokens of the region's witnesses */
  regions: { code: string; name: string; oblasts: string[]; N: number }[]
}

/** Compact lexical index for analysing arbitrary user input in the browser. */
export interface LexIndex {
  generated: string
  lt: Record<string, ['replace' | 'soft', string]>              // form → [file, suggestions]
  vesum: Record<string, VesumHit[]>                             // forms with bad/subst/slang/arch/short/vulg tags
}
