/**
 * SPEC 63 AR: archaic words as first-class lemmas. Pure (no node/DOM imports).
 *
 * > "Застарілі слова (менувати, подстароста, небытность, кастелян) вестимуть на картки! ми маємо всі застарілі слова теж реагувати" — user, 2026-10-14
 *
 * An archaic lemma is (a) a HEADWORD of a historical dictionary witness (witnessType «dictionary», BL-11 Словник староукраїнської мови XIV–XV ст.) none of whose variants is a VESUM form
 * (`dictionary`), or (b) a recurring unresolved token cluster of a Middle Ukrainian witness without any dictionary entry (`unverified`). Nothing here is guessed: the headword, the part-of-speech
 * abbreviation, the marks in brackets and the gloss are the dictionary's own header line, quoted with its locator (the ingester keeps only that line, license in the witness).
 * Corpus tokens link to an archaic lemma only through an exact spelling or a derive()/MU candidate that equals a dictionary variant.
 */

export interface HeadLine { variants: string[]; pos?: string; count?: number; marks: string[]; text: string; rowRef: string }
/** Locator of the ingester: «т.N ряд. L: <header line>» → the line without the locator and a leading «. */
export function parseLoc(loc: string): { rowRef: string; text: string } {
  const m = /^(т\.\d+ ряд\. \d+):\s*[«"“]?(.*)$/.exec(loc)
  return m ? { rowRef: m[1]!, text: m[2]!.trim() } : { rowRef: loc, text: loc }
}
const POS_RE = /\s(ч|ж|с|мн|прикм|дієсл|присл|прийм|спол|част|займ|числ|вигук|виг|дієпр|незм)\.\s*(?:\((\d+)\))?/
/** Bracketed marks of the header line, verbatim («(особова назва, молд., пор. Ананий)»). */
export function parseHead(loc: string, variants: string[]): HeadLine {
  const { rowRef, text } = parseLoc(loc), pm = POS_RE.exec(text)
  const marks = [...text.matchAll(/\(([^()\d][^()]*)\)/g)].map(m => m[1]!.trim()).filter(s => !/^\d+$/.test(s)).slice(0, 3)
  return { variants, ...(pm ? { pos: pm[1]! } : {}), ...(pm?.[2] ? { count: Number(pm[2]) } : {}), marks, text: text.slice(0, 240), rowRef }
}

export type ArchStatus = 'dictionary' | 'unverified'
export interface ArchForm { raw: string; f: number }
/** One archaic lemma card (public/data/archaic.json). */
export interface ArchEntry {
  id: string; head: string; variants: string[]; status: ArchStatus
  /** dictionary entries: the header line as printed (quote), its locator, the dictionary witness and its period */
  dict?: { w: string; epoch?: string; quote: string; locator: string; pos?: string; marks: string[]; date: [number, number] }
  /** corpus tokens (outside the dictionary witnesses) linked to this lemma */
  n: number; forms: ArchForm[]; epochs: Record<string, number>; witnesses: Record<string, number>
  first?: { w: string; loc: string; raw: string; date: [number, number] }
  kwic: { w: string; loc: string; raw: string }[]
}
export interface ArchFile { generated: string; source: string; entries: ArchEntry[] }

export const archId = (head: string) => head.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}'’ʼ-]+/gu, '')

export class ArchScan {
  readonly byId = new Map<string, ArchEntry>(); private readonly index = new Map<string, string>()
  /** register a dictionary entry (variants = spellings sharing the header line); returns its id */
  addDictEntry(w: { id: string; date: [number, number]; epoch?: string }, loc: string, variants: string[]): string | undefined {
    const vs = [...new Set(variants.map(archId).filter(Boolean))]; if (!vs.length) return undefined
    const id = vs[0]!, ex = this.byId.get(id)
    if (ex) { for (const v of vs) if (!ex.variants.includes(v)) { ex.variants.push(v); this.index.set(v, id) } return id }
    const h = parseHead(loc, vs)
    this.byId.set(id, { id, head: vs[0]!, variants: vs, status: 'dictionary', dict: { w: w.id, ...(w.epoch ? { epoch: w.epoch } : {}), quote: h.text, locator: h.rowRef, ...(h.pos ? { pos: h.pos } : {}), marks: h.marks, date: w.date }, n: 0, forms: [], epochs: {}, witnesses: {}, kwic: [] })
    for (const v of vs) if (!this.index.has(v)) this.index.set(v, id)
    return id
  }
  /** register an `unverified` candidate (a recurring unresolved cluster without dictionary entry) */
  addUnverified(head: string, variants: string[]): string {
    const id = 'u:' + archId(head)
    if (!this.byId.has(id)) { this.byId.set(id, { id, head, variants: [...new Set(variants)], status: 'unverified', n: 0, forms: [], epochs: {}, witnesses: {}, kwic: [] }); for (const v of variants) this.index.set(archId(v), id) }
    return id
  }
  /** another spelling key (a derive() form of a variant) that leads to the same lemma */
  alias(key: string, id: string): void { if (key && !this.index.has(key)) this.index.set(key, id) }
  lookup(keys: Iterable<string>): string | undefined { for (const k of keys) { const id = this.index.get(k); if (id) return id } return undefined }
  /** count one corpus token */
  hit(id: string, w: { id: string; date: [number, number] }, epoch: string | undefined, t: { raw: string; loc: string }): void {
    const e = this.byId.get(id); if (!e) return
    e.n++; e.witnesses[w.id] = (e.witnesses[w.id] ?? 0) + 1; if (epoch) e.epochs[epoch] = (e.epochs[epoch] ?? 0) + 1
    const f = e.forms.find(x => x.raw === t.raw); f ? f.f++ : e.forms.push({ raw: t.raw, f: 1 })
    if (!e.first || w.date[1] < e.first.date[1]) e.first = { w: w.id, loc: t.loc, raw: t.raw, date: w.date }
    if (e.kwic.length < 6 && !e.kwic.some(k => k.w === w.id && k.loc === t.loc)) e.kwic.push({ w: w.id, loc: t.loc, raw: t.raw })
  }
  file(generated: string): ArchFile {
    const entries = [...this.byId.values()]; for (const e of entries) e.forms.sort((a, b) => b.f - a.f)
    entries.sort((a, b) => b.n - a.n || a.id.localeCompare(b.id))
    return { generated, source: 'Словник староукраїнської мови XIV–XV ст. (К., 1977–78), заголовні рядки (BL-11, archive.org OCR) + рядки корпусу', entries }
  }
}

export interface ArchStats { dictionary: number; unverified: number; tokens: number; byEpoch: Record<string, { lemmas: number; tokens: number }> }
export function archStats(f: ArchFile): ArchStats {
  const s: ArchStats = { dictionary: 0, unverified: 0, tokens: 0, byEpoch: {} }
  for (const e of f.entries) {
    s[e.status]++; s.tokens += e.n
    const eps = new Set(Object.keys(e.epochs)); if (e.dict?.epoch) eps.add(e.dict.epoch)   // a dictionary lemma counts in the epoch of the dictionary period as well
    for (const ep of eps) { const b = (s.byEpoch[ep] ??= { lemmas: 0, tokens: 0 }); b.lemmas++; b.tokens += e.epochs[ep] ?? 0 }
  }
  return s
}
