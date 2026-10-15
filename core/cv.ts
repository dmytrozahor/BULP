/**
 * SPEC 63 CV — a card for every attested word. Pure (no node / DOM imports).
 *
 * > "запобігти is in Російсько-український словник військової термінології (Якубські, 1928) — заголовні слова та відповідники but absent as a word card … there are really many words without cards" — user, 2026-10-15
 *
 * Root cause: the dictionary witnesses (r2u: headwords and the Ukrainian equivalents quoted in ru→uk articles) are noFreq, so their lemmas never reach KEEP_MIN_F; only lemmas the
 * pipeline *looked up* were kept, and light cards (PV-6) were made for corpus tokens only. Equivalents VESUM does not link were archaic cards only when NO other equivalent of the same
 * article linked. Search looked into the full lexicon alone, so even the existing /lw and /ar cards were unreachable by typing.
 *
 * Fix: every token of a dictionary witness whose lemma has no full card gets a LIGHT card /lw/:word with its attestation lines (dictionary, date, quoted article start, locator):
 *  - VESUM links the token → the card is the VESUM lemma (`tags` = VESUM tags);
 *  - VESUM does not know it and no archaic card (/ar) owns the spelling → the attested spelling as is (`tags` = '').
 * `cardindex.json` lists every card that is not a full lexicon card (light, archaic, CV) so search / analyser / text links resolve over all kinds.
 */
import { bucketOf } from './shard.ts'
import { key } from './text.ts'

/** lookup key: key() plus Latin look-alikes folded to Cyrillic inside a Cyrillic word (source quirk «BЮВ» with a Latin B); used for LOOKUP only, the source spelling is shown as is */
const LAT: Record<string, string> = { a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', i: 'і', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у' }
export const lk = (s: string): string => { const k = key(s); return /\p{Script=Cyrillic}/u.test(k) && /[a-z]/.test(k) ? k.replace(/[a-z]/g, c => LAT[c] ?? c) : k }

export const CV_BUCKETS = 256
/** public/data/cv/<bucket>.json holds { [key(word)]: CvEntry } */
export const cvBucket = (word: string) => bucketOf(lk(word), CV_BUCKETS)
export const cvShardUrl = (word: string) => `./data/cv/${cvBucket(word)}.json`

/** [witness id, locator (dictionary + lookup + quoted article start), attested spelling] */
export type CvAtt = [w: string, loc: string, raw: string]
/** [displayed word, VESUM tags ('' = spelling not in VESUM), attestations in total, first MAX_ATT attestations] */
export type CvEntry = [word: string, tags: string, n: number, atts: CvAtt[]]
export const MAX_ATT = 5

/** a word worth a card: letters (apostrophe / hyphen inside), not a bare letter */
export const isCvWord = (s: string) => /^\p{L}[\p{L}'’ʼ-]*$/u.test(s) && [...s].length >= 2

export class CvScan {
  readonly m = new Map<string, { word: string; tags: string; seen: Set<string>; n: number; atts: CvAtt[]; forms: Set<string> }>()
  /** one attestation; a VESUM-linked reading (tags) wins over an as-is spelling that shares the key */
  add(word: string, tags: string, w: string, loc: string, raw: string): void {
    const k = lk(word); if (!k) return
    let e = this.m.get(k)
    if (!e) this.m.set(k, e = { word, tags, seen: new Set(), n: 0, atts: [], forms: new Set() })
    else if (tags && !e.tags) { e.word = word; e.tags = tags }
    if (e.forms.size < 12) e.forms.add(raw)
    const id = w + '\0' + loc
    if (e.seen.has(id)) return
    e.seen.add(id); e.n++
    if (e.atts.length < MAX_ATT) e.atts.push([w, loc, raw])
  }
  /** attested spellings that differ from the card word (inflected forms, pre-reform spellings): [spelling, word] */
  forms(): [string, string][] { return [...this.m].flatMap(([k, e]) => [...e.forms].filter(f => lk(f) !== k).map(f => [f, e.word] as [string, string])) }
  /** a card without dictionary lines (e.g. a Plast headword): the word is attested by another source that the card view joins */
  addBare(word: string): boolean { const k = lk(word); if (!k || this.m.has(k)) return false; this.m.set(k, { word, tags: '', seen: new Set(), n: 0, atts: [], forms: new Set() }); return true }
  entries(): [string, CvEntry][] { return [...this.m].map(([k, e]) => [k, [e.word, e.tags, e.n, e.atts]] as [string, CvEntry]) }
}

export function shardsOfCv(entries: [string, CvEntry][]): Record<string, CvEntry>[] {
  const out: Record<string, CvEntry>[] = Array.from({ length: CV_BUCKETS }, () => ({}))
  for (const [k, e] of entries) out[cvBucket(k)]![k] = e
  return out
}

// ── the index of every non-lexicon card ───────────────────────────────────────────────────────────
/** `lw`: words with a /lw/:word card (light cards of the corpus + CV cards); `ar`: archaic / dictionary cards, [id, ...other spellings] */
export interface CardIndexFile { format: 1; generated: string; lw: string[]; ar: string[][]; /** attested spellings of CV words that are not the card word: [spelling, card word] */ lf?: [string, string][] }
export type CardKind = 'lw' | 'ar'
export interface CardHit { kind: CardKind; id: string; form: string }
export const cardRoute = (h: Pick<CardHit, 'kind' | 'id'>) => `/${h.kind}/${encodeURIComponent(h.id)}`

export function buildCardIndex(generated: string, light: Iterable<string>, cv: Iterable<string>, arch: { id: string; variants: string[] }[], forms: [string, string][] = []): CardIndexFile {
  const lw = [...new Set([...light, ...cv])].sort((a, b) => a.localeCompare(b, 'uk'))
  return { format: 1, generated, lw, ar: arch.map(e => [e.id, ...e.variants.filter(v => v !== e.id)]), ...(forms.length ? { lf: forms } : {}) }
}

/** key → card hits (lookup is case- and stress-insensitive through core/text.ts key()) */
export function cardMap(ci: CardIndexFile): Map<string, CardHit[]> {
  const m = new Map<string, CardHit[]>()
  const put = (form: string, kind: CardKind, id: string) => {
    const k = lk(form); if (!k) return
    const l = m.get(k) ?? []; if (!l.some(h => h.kind === kind && h.id === id)) l.push({ kind, id, form }); m.set(k, l)
  }
  for (const w of ci.lw) put(w, 'lw', w)
  for (const [f, w] of ci.lf ?? []) put(f, 'lw', w)
  for (const [id = "", ...vs] of ci.ar) { put(id, 'ar', id); for (const v of vs) put(v, 'ar', id) }
  return m
}
