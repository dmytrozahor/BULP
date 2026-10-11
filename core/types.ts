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
}
export interface WitnessOut {
  id: string; unit: string; title: string; author: string; url: string
  date: [number, number]; dateCite: Evidence; msDate?: number
  lang: 'orv' | 'chu-rus' | 'ruthenian' | 'uk'; region?: string
  witnessType: string; edition: string; orth?: string; oldI?: boolean; license?: string
  authorEvidence?: Evidence[]   // self-reference found in the witness itself (e.g. Kyiv Chronicle)
  excludeReason?: { why: string; evidence: Evidence[] }   // set by the ingester when the text is not in the lexicon's language (e.g. Shevchenko's Russian-language poems); build admit() refuses it and REPORT §1 lists it
  dropped: { unmapped: number; apparatus: number }
  tokens: TokenRec[]
}

// ── Output: public/data/*.json ───────────────────────────────────────────────────────────────────
export interface VesumHit { lemma: string; tags: string }
export interface Kwic { w: string; loc: string; left: string; node: string; right: string; date: [number, number] }
export interface TraceStep { rule: string; from: string; to: string }

/** One historical spelling of a lemma (e.g. кънѧзь, кънѧзоу) linked to a modern form. */
export interface FormCard {
  raw: string; norm: string; modern: string; f: number
  date: [number, number]                       // earliest attestation of this spelling (witness composition date)
  link: Claim<{ lemma: string; form: string; route: 'torot-lemma' | 'token' | 'direct'; alternatives: string[] }>
  derivation: TraceStep[]
  /** cs / contact / dialect labels (Claim<true>) with evidence; `rusyn` (research/10 §5) is a parallel, non-competing reading whose value is the axis label. */
  claims: Record<string, Claim<any>> & { rusyn?: Claim<string> }
  hints: string[]                              // weight-0 rule ids (P-3.1)
  epochs: string[]                             // epochs of the witnesses this spelling occurs in
  kwic: Kwic[]                                 // ≤ 6
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
  }
}

export interface WitnessMeta extends Omit<WitnessOut, 'tokens' | 'dropped'> {
  n: number; linked: number; dropped: WitnessOut['dropped']
  epochShev: Claim<EpochAssignment>; epochWl: Claim<EpochAssignment>
}

/** public/data/lexicon.json is a plain `LemmaCard[]` array. */
export type Lexicon = LemmaCard[]

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
