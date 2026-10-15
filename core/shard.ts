/**
 * Core / detail split of the lexicon (SPEC 20 B-5). splitCard() and mergeCard() are inverse; bucketOf() is the single hash shared by the build
 * (which writes public/data/lex/<bucket>.json) and the browser (which fetches the shard of a lemma). Pure: no node or DOM imports.
 */
import { packer, restore } from './pack.ts'
import type { CoreCard, CoreStats, FirstAttestation, LemmaCard, LemmaDetail, Shard } from './types.ts'

export const BUCKETS = 4096
/** FNV-1a (32 bit) over the UTF-16 code units of the NFC lemma, modulo the bucket count. */
export function bucketOf(lemma: string, buckets = BUCKETS): number {
  let h = 0x811c9dc5
  for (const ch of lemma.normalize('NFC')) for (let i = 0; i < ch.length; i++) { h ^= ch.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return h % buckets
}
export const shardUrl = (lemma: string) => `./data/lex/${bucketOf(lemma)}.json`

/** A known first attestation is split (B-5a amendment); anything else (unknown, odd fixture value) stays whole in core. */
const thin = (c: LemmaCard['first']) => { const v = c.value as Partial<FirstAttestation> | string; return typeof v === 'object' && v !== null && typeof v.author === 'string' && Array.isArray(v.date) }

export function splitCard(c: LemmaCard): { core: CoreCard; detail: LemmaDetail } {
  const { stress, forms, stats, epochs, first, claims: { oldest, ...claims }, ...rest } = c, { f, ipm, hk, dots, ...more } = stats
  const split = thin(first), v = first.value as FirstAttestation
  return {
    core: { ...rest, first: split ? { value: { author: v.author, witness: v.witness, date: v.date, form: v.form }, evidence: [] } : first, claims, forms: forms.map(({ raw, norm, modern, claims, hints }) => ({ raw, norm, modern, claims, hints })), stats: { f, ipm, hk, dots } satisfies CoreStats },
    detail: { ...(split ? { first: { ...first, value: { loc: v.loc, witnessType: v.witnessType, coFirst: v.coFirst } } } : {}), stress, oldest, forms: forms.map(({ raw: _r, norm: _n, modern: _m, claims: _c, hints: _h, ...fd }) => fd), stats: more, ...(epochs ? { epochs } : {}) },
  }
}

export function mergeCard(core: CoreCard, d: LemmaDetail): LemmaCard {
  if (d.forms.length !== core.forms.length) throw new Error(`${core.lemma}: detail has ${d.forms.length} spellings, core ${core.forms.length}`)
  const first: LemmaCard['first'] = d.first ? { ...d.first, value: { ...(core.first.value as object), ...d.first.value } as FirstAttestation } : core.first as LemmaCard['first']
  return { ...core, first, stress: d.stress, claims: { ...core.claims, oldest: d.oldest }, forms: core.forms.map((f, i) => ({ ...f, ...d.forms[i]! })), stats: { ...core.stats, ...d.stats }, ...(d.epochs ? { epochs: d.epochs } : {}) }
}

/** A card that already carries its detail (fixture, pre-split data): no shard fetch needed. */
export const isFull = (c: CoreCard | LemmaCard): c is LemmaCard => 'stress' in c

/** One shard file: the details of `lemmas`, Evidence interned in the shard's own pool. */
export function packShard(entries: [string, LemmaDetail][]): Shard {
  const p = packer(), details = entries.map(([, d]) => p.one(d).card)
  return { format: 1, ev: p.ev, lemmas: entries.map(e => e[0]), details }
}
export function unpackShard(j: unknown): Map<string, LemmaDetail> {
  const s = j as Shard
  if (!s || s.format !== 1 || !Array.isArray(s.ev) || !Array.isArray(s.lemmas) || !Array.isArray(s.details)) throw new Error('lex shard: unknown format')
  const d = restore(s.ev, s.details)
  return new Map(s.lemmas.map((l, i) => [l, d[i]!]))
}
