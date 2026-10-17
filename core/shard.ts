/**
 * Core / detail split of the lexicon (SPEC 20 B-5). splitCard() and mergeCard() are inverse; bucketOf() is the single hash shared by the build
 * (which writes public/data/lex/<bucket>.json) and the browser (which fetches the shard of a lemma). Pure: no node or DOM imports.
 */
import { packer, restore } from './pack.ts'
import type { CoreCard, CoreStats, FirstAttestation, LemmaCard, LemmaDetail, Shard } from './types.ts'

/** 32768 (B-5b amendment 2026-10-17: 74,739 kept lemmas at 10 M tokens, ~7.5x the 9,867 that 4096 buckets were sized for; keeps ~2 lemmas per detail shard like before) */
export const BUCKETS = 32768
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

// ── SPEC 63 PF-4: a lemma whose detail alone does not fit a 256 KiB shard is split into part files lex/<bucket>-<k>.json (lossless) ──────────────────────
const bytesOf = (lemma: string, d: LemmaDetail) => new TextEncoder().encode(JSON.stringify(packShard([[lemma, d]]))).length
/**
 * Splits one detail into fragments, each of which packs (as the only lemma of a shard) to <= limit bytes. Nothing is dropped: part 0 holds everything except the spellings and the
 * epoch paradigms, which are dealt out in order over the parts (a later part carries only `forms` and `epochs.paradigms`). joinDetail() is the inverse.
 * Throws, naming the lemma and the piece, when one spelling or one epoch paradigm alone is over the limit.
 */
export function splitDetail(lemma: string, d: LemmaDetail, limit: number): LemmaDetail[] {
  const head: LemmaDetail = { ...d, forms: [], ...(d.epochs ? { epochs: { ...d.epochs, paradigms: [] } } : {}) }
  const stub: LemmaDetail = { stress: [], oldest: d.oldest, forms: [], stats: {} as LemmaDetail['stats'], ...(d.epochs ? { epochs: { tags: [], stem: undefined as never, paradigms: [] } } : {}) }
  const hb = bytesOf(lemma, head)
  if (hb > limit) throw new Error(`lemma «${lemma}»: its detail without spellings and epoch paradigms is ${hb} B, over ${limit} B (PF-4)`)
  const atoms: { name: string; add: (p: LemmaDetail) => LemmaDetail }[] = [
    ...d.forms.map((f, i) => ({ name: `spelling #${i}`, add: (p: LemmaDetail): LemmaDetail => ({ ...p, forms: [...p.forms, f] }) })),
    ...(d.epochs?.paradigms ?? []).map((q, i) => ({ name: `epoch paradigm #${i} (${q.epoch})`, add: (p: LemmaDetail): LemmaDetail => ({ ...p, epochs: { ...p.epochs!, paradigms: [...p.epochs!.paradigms, q] } }) })),
  ]
  const parts: LemmaDetail[] = []; let cur = head
  for (const a of atoms) {
    const next = a.add(cur)
    if (bytesOf(lemma, next) <= limit) { cur = next; continue }
    parts.push(cur); cur = a.add(stub)
    const one = bytesOf(lemma, cur)
    if (one > limit) throw new Error(`lemma «${lemma}»: ${a.name} alone is ${one} B, over ${limit} B (PF-4)`)
  }
  parts.push(cur)
  return parts
}
export function joinDetail(parts: LemmaDetail[]): LemmaDetail {
  const h = parts[0]!
  return { ...h, forms: parts.flatMap(p => p.forms), ...(h.epochs ? { epochs: { ...h.epochs, paradigms: parts.flatMap(p => p.epochs?.paradigms ?? []) } } : {}) }
}
/**
 * Loads lex/<name> through `get` (which maps a name like `lex/12` to its parsed JSON) and follows the `over` pointers: the part files of every overflow lemma of the shard are fetched
 * and joined, so the returned Map holds the whole detail of every lemma of the bucket. The browser (src/composables/useData.ts) and the tests use this very function.
 */
export async function loadShardWith(get: (name: string) => Promise<unknown>, name: string): Promise<Map<string, LemmaDetail>> {
  const j = await get(`lex/${name}`), m = unpackShard(j), over = (j as Shard).over
  if (over) await Promise.all(Object.entries(over).map(async ([lemma, files]) => {
    const parts = await Promise.all(files.map(async f => { const p = unpackShard(await get(`lex/${f}`)).get(lemma); if (!p) throw new Error(`lex/${f}: lemma ${lemma} missing`); return p }))
    m.set(lemma, joinDetail(parts))
  }))
  return m
}
