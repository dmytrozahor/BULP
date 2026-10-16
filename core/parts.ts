/**
 * SPEC 63 PF — the site is loaded in parts. Pure (no node / DOM imports): shared by the build (pipelines/build-parts.ts) and the browser (src/lib/parts.ts).
 *
 *   boot.json            first load: corpus numbers, vetting records, page counts (no witnesses list, no lemmas)
 *   ix/index.json        the prefix shards: [name, weight][]; ix/<hex>.json = { tags, rows: { key → IxRow } } for the keys with that 2–5 letter prefix
 *   cd/<bucket>.json     core cards of the lemmas hashing to the bucket (core/pack.ts packCore, own evidence pool)
 *   lm/<name>/<b>.json   per-lemma sidecars (etymology, cognates, senses, usage, loanlabels, heteronyms, phrases), 256 buckets
 *   wit/<b>.json         witness records by id (64 buckets)
 *   pg/lemmas/<n>.json   paged list of all lemmas
 *   sum/*.json           precomputed summaries for statistics / maps
 */
import { bucketOf } from './shard.ts'

/** budgets of SPEC 63 PF-2, bytes transferred (gzip) */
export const BUDGET = { firstLoad: 500 * 1024, card: 300 * 1024, keystroke: 64 * 1024 } as const

// ── prefix-sharded lookup index ──────────────────────────────────────────────────────────────────
export const IX_MIN = 2, IX_MAX = 5
/** a shard is split one letter deeper while its gzip size is above this (a keystroke may load two of them) */
export const IX_GZ_MAX = 30 * 1024
export const IX_SPLIT_MIN_KEYS = 8

/** the first n characters of a key, padded with '_' (a key shorter than the prefix lives in the '_'-padded shard) */
export const ixPad = (k: string, n: number): string => { const cs = [...k]; while (cs.length < n) cs.push('_'); return cs.slice(0, n).join('') }
/** file name of a shard: hex code points (Cyrillic file names are not portable) */
export const ixName = (p: string): string => [...p].map(c => c.codePointAt(0)!.toString(16).padStart(4, '0')).join('')
export const ixUrl = (p: string) => `./data/ix/${ixName(p)}.json`
/** the leaf shard that holds key k (undefined when the manifest has none: the key is not in the index) */
export function ixLeaf(k: string, leaves: ReadonlySet<string>): string | undefined {
  for (let n = IX_MIN; n <= IX_MAX; n++) { const p = ixPad(k, n); if (leaves.has(p)) return p }
  return undefined
}
/** leaves under an unpadded prefix shorter than a leaf (a 2-letter query when 'ко' was split), heaviest first */
export function ixUnder(q: string, manifest: readonly (readonly [string, number])[], max = 3): string[] {
  return manifest.filter(([p]) => p.startsWith(q)).sort((a, b) => b[1] - a[1]).slice(0, max).map(e => e[0])
}

/**
 * SPEC 63 DO-6 — dx/: the prefix shards of the DICTIONARY-ONLY cards (VESUM lemmas and dictionary words that no corpus text attests, ~450k). Kept apart from ix/ so that the corpus-attested
 * search path (and its keystroke budget) is unchanged and an attested card is never crowded out by a dictionary-only one. dx/index.json = IxManifest; dx/<hex>.json = DxShard.
 * rows: key → '' when the card id IS the key, else the id (capitals, e.g. «Київ»).
 */
export interface DxShard { format: 1; rows: Record<string, string> }
export const dxUrl = (p: string) => `./data/dx/${ixName(p)}.json`

/** hit kinds of IxRow.h */
/** via: 0 lemma · 1 historical spelling (raw / norm: an attestation) · 2 VESUM paradigm form · 3 modern spelling of a corpus form (searchable like a form, but not an attestation) */
export type IxHit = [lemma: string, via: 0 | 1 | 2 | 3, form?: string]
export const VIA_NAME = ['lemma', 'form', 'paradigm', 'form'] as const
/**
 * h: search hits (lemma / historical spelling / paradigm form) · p: VESUM paradigm hits of the lexicon lemmas [lemma, tag index] · v: lexindex non-normative VESUM hits ·
 * l: LanguageTool entry [0 replace | 1 soft, suggestions] · c: non-lexicon cards [0 lw | 1 ar, id, spelling]
 */
export interface IxRow { h?: IxHit[]; p?: [string, number][]; v?: [string, number][]; l?: [0 | 1, string]; c?: [0 | 1, string, string?][] }
export interface IxShard { format: 1; tags: string[]; rows: Record<string, IxRow> }
export interface IxManifest { format: 1; leaves: [string, number][] }

// ── per-lemma sidecars ───────────────────────────────────────────────────────────────────────────
export const LM_BUCKETS = 256
export const LM_NAMES = ['etymology', 'cognates', 'senses', 'usage', 'loanlabels', 'heteronyms', 'phrases'] as const
export type LmName = (typeof LM_NAMES)[number]
/** the key a sidecar entry is filed under: the lemma (phrases: lower-cased lemma, heteronyms: heteronymKey of the spelling, passed in by the caller) */
export const lmBucket = (k: string) => bucketOf(k, LM_BUCKETS)
export const lmUrl = (name: LmName, k: string) => `./data/lm/${name}/${lmBucket(k)}.json`

export const WIT_BUCKETS = 64
export const witBucket = (id: string) => bucketOf(id, WIT_BUCKETS)
export const witUrl = (id: string) => `./data/wit/${witBucket(id)}.json`

export const cdUrl = (lemma: string) => `./data/cd/${bucketOf(lemma)}.json`

export const LEMMA_PAGE = 120
export const lemmaPageUrl = (n: number) => `./data/pg/lemmas/${n}.json`

/** boot.json: what every page needs, nothing per word */
export interface BootFile {
  format: 1; generated: string; N: number; linked: number; unresolved: number
  nLemmas: number; nWitnesses: number; lemmaPage: number
  /** SPEC 63 DO-5: «з засвідченнями» = nAttested (full lexicon cards + corpus-attested light cards), «лише словник» = nDictOnly; nLemmas stays the number of full lexicon cards (the paged lemma list) */
  nAttested?: number; nDictOnly?: number
  epochSizes: Record<string, number>; centurySizes: Record<string, number>
  rusynStatus: unknown; regions: unknown[]; authors: unknown[]
}

// ── per-card shards of the TOROT names / ORV-only lemmas, light cards and archaic cards ──────────
export const TC_BUCKETS = 256
export type TcKind = 'names' | 'orv' | 'light' | 'arch'
/** tc/<kind>/<bucket>.json: names / orv by card id, light by key(lemma), arch by archId (an entry is filed under its id; `alias` maps its other spellings to the id) */
export const tcBucket = (k: string) => bucketOf(k, TC_BUCKETS)

/**
 * The data a word card (WordView, panels collapsed) fetches on open, as ./data-relative files (the budget test sums their gzip size): its core shard, its detail shard, the shard of the
 * witness of its first attestation, the sidecar shards read at mount (etymology, cognates, senses, heteronyms, phrases) and the small gazetteer. Panels that open on demand (KWIC, epoch grid,
 * derivatives, labels) fetch more when the visitor opens them.
 */
export const CARD_SMALL_FILES = ['places.json'] as const
export function cardData(lemma: string, firstWitness?: string, heteronymKey?: string): string[] {
  return [
    cdUrl(lemma), `./data/lex/${bucketOf(lemma)}.json`, ...(firstWitness ? [witUrl(firstWitness)] : []),
    lmUrl('etymology', lemma), lmUrl('cognates', lemma), lmUrl('senses', lemma), lmUrl('heteronyms', heteronymKey ?? lemma.toLowerCase()), lmUrl('phrases', lemma.toLowerCase()),
    ...CARD_SMALL_FILES.map(f => `./data/${f}`),
  ].map(u => u.replace(/^\.\/data\//, ''))
}

/** data files the home page fetches (the budget test sums their gzip size with index.html + the entry chunk graph) */
export const BOOT_DATA = ['boot.json'] as const
