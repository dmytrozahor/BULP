/**
 * lexicon.json packing (B-5): the same Evidence objects (one stress-dictionary note, one witness description, one Shevelov URL…) repeat thousands of times across cards.
 * pack() interns each distinct Evidence once in `ev` and replaces it inside the cards' `evidence` arrays by its integer index; unpack() restores the cards (shared objects). Lossless.
 */
import type { Evidence } from './evidence.ts'
import type { CoreCard, LemmaCard, PackedCore, PackedLexicon } from './types.ts'

/** Cards hold Evidence only in arrays under these keys (Claim.evidence, StressVariant.evidence). */
const EV_KEYS = new Set(['evidence', 'authorEvidence'])
const isEv = (o: unknown): o is Evidence => !!o && typeof o === 'object' && typeof (o as Evidence).source === 'string' && typeof (o as Evidence).quote === 'string' && typeof (o as Evidence).locator === 'string'
const map = (x: unknown, f: (k: string, v: unknown[]) => unknown[]): unknown =>
  Array.isArray(x) ? x.map(v => map(v, f)) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, EV_KEYS.has(k) && Array.isArray(v) ? f(k, v) : map(v, f)])) : x

/** An interning pool: one() packs a card (or any value holding Evidence arrays) against it, so cards (or tier variants) can be sized/packed incrementally with shared evidence. */
export function packer() {
  const ev: Evidence[] = [], ix = new Map<string, number>(); let used = new Set<number>()
  const id = (e: unknown) => {
    if (!isEv(e)) return e
    const k = JSON.stringify(e); let i = ix.get(k)
    if (i === undefined) { i = ev.length; ev.push(e); ix.set(k, i) }
    used.add(i); return i
  }
  /** one(c) → the packed card and the pool indices it references */
  return { ev, one: <T>(c: T) => { used = new Set(); const p = map(c, (_, v) => v.map(id)) as T; return { card: p, refs: [...used] } } }
}

export function pack(cards: LemmaCard[]): PackedLexicon {
  const p = packer(), out = cards.map(c => p.one(c).card)
  return { format: 2, ev: p.ev, cards: out }
}

/** Inverse of pack(); a plain LemmaCard[] (fixture, pre-pool data) passes through. */
export function unpack(j: unknown): LemmaCard[] {
  if (Array.isArray(j)) return j as LemmaCard[]
  const p = j as PackedLexicon
  if (!p || p.format !== 2 || !Array.isArray(p.ev) || !Array.isArray(p.cards)) throw new Error('lexicon.json: unknown format')
  return map(p.cards, (_, v) => v.map(i => (typeof i === 'number' ? p.ev[i]! : i))) as LemmaCard[]
}

/** Restores the Evidence objects of any value packed against `ev`. */
export const restore = <T>(ev: Evidence[], x: T): T => map(x, (_, v) => v.map(i => (typeof i === 'number' ? ev[i]! : i))) as T

// ── core wire form (B-5a): lossless, positional, defaults omitted. In memory a CoreCard keeps every field. ────────────────────────────────────────────────
const UNKNOWN = JSON.stringify({ value: 'unknown', evidence: [] })
const isDef = (x: unknown, d: unknown) => JSON.stringify(x) === JSON.stringify(d)

/**
 * Wire card = [lemma, pos, paradigm, forms, first, claims, [f, ipm, hk, dots]].
 * paradigm: ["form", tag, tag, "form2", tag …] — a string starts a form, the numbers after it index the file's tag table (VESUM tag strings repeat across 200 000 entries).
 * forms[i]: just the raw string when norm = modern = raw and there are no claims/hints, else [raw, norm, modern, claims, hints].
 * claims: register / surzhyk / dialect are left out when they hold their empty default (unknown, unknown, {}).
 */
export function packCore(cards: CoreCard[]): PackedCore {
  const p = packer(), tags = new Map<string, number>(), cnt = new Map<string, number>()
  for (const c of cards) for (const q of c.paradigm) cnt.set(q.tags, (cnt.get(q.tags) ?? 0) + 1)
  const table = [...cnt].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(e => e[0]); table.forEach((t, i) => tags.set(t, i))   // frequent tags get short indices
  const wire = cards.map(c => {
    const par: (string | number)[] = []; let last: string | undefined
    for (const q of c.paradigm) { if (q.form !== last) { par.push(q.form); last = q.form } par.push(tags.get(q.tags)!) }
    const forms = c.forms.map(f => (f.norm === f.raw && f.modern === f.raw && !Object.keys(f.claims).length && !f.hints.length ? f.raw : [f.raw, f.norm, f.modern, p.one(f.claims).card, f.hints]))
    const { register, surzhyk, dialect, ...cl } = c.claims, k: Record<string, unknown> = { ...cl }
    if (!isDef(register, JSON.parse(UNKNOWN))) k['register'] = register
    if (!isDef(surzhyk, JSON.parse(UNKNOWN))) k['surzhyk'] = surzhyk
    if (Object.keys(dialect).length) k['dialect'] = dialect
    const { f, ipm, hk, dots } = c.stats
    return [c.lemma, c.pos, par, forms, c.first, k, [f, ipm, hk, dots]].map((x, i) => (i === 4 || i === 5 ? p.one(x).card : x))
  })
  return { format: 3, ev: p.ev, tags: table, cards: wire }
}
export function unpackCore(j: unknown): CoreCard[] {
  const p = j as PackedCore
  if (!(p && !Array.isArray(p) && p.format === 3 && Array.isArray(p.ev) && Array.isArray(p.tags) && Array.isArray(p.cards))) return unpack(j)
  const R = <T>(x: T) => restore(p.ev, x)
  return p.cards.map(w => {
    const [lemma, pos, par, forms, first, claims, st] = w as [string, string, (string | number)[], (string | unknown[])[], CoreCard['first'], Record<string, unknown>, number[]]
    const paradigm: CoreCard['paradigm'] = []; let form = ''
    for (const x of par) typeof x === 'string' ? (form = x) : paradigm.push({ form, tags: p.tags[x]! })
    return {
      lemma, pos, paradigm,
      forms: forms.map(f => (typeof f === 'string' ? { raw: f, norm: f, modern: f, claims: {}, hints: [] } : { raw: f[0], norm: f[1], modern: f[2], claims: R(f[3]), hints: f[4] }) as CoreCard['forms'][number]),
      first: R(first),
      claims: { register: JSON.parse(UNKNOWN), surzhyk: JSON.parse(UNKNOWN), dialect: {}, ...R(claims) } as CoreCard['claims'],
      stats: { f: st[0]!, ipm: st[1]!, hk: st[2]!, dots: st[3]! },
    }
  })
}
