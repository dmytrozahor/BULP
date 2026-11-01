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
  const m = /^(т\.\d+ ряд\. \d+):\s*[«"“]?(.*)$/.exec(loc) ?? /^(с\. \d+, № \d+):\s*(.*)$/.exec(loc)   // 2nd form: term list (mtt1925) «с. 1, № 1: …»
  return m ? { rowRef: m[1]!, text: m[2]!.trim() } : { rowRef: loc, text: loc }
}
/** NV-4: a term-list locator («с. N, № M: Приборниця, пристрійниця = Готовальня | Rýsovadlo | Reiszeug») → the equivalents after «=», verbatim, in the list's own order (uk, then ru | cs | de) */
export const isTermLoc = (loc: string) => /^с\. \d+, № \d+:/.test(loc)
export function termGloss(loc: string): string[] {
  const { text } = parseLoc(loc), i = text.indexOf(' = ')
  return i < 0 ? [] : text.slice(i + 3).split(' | ').map(s => s.trim()).filter(Boolean)
}
const POS_RE = /\s(ч|ж|с|мн|прикм|дієсл|присл|прийм|спол|част|займ|числ|вигук|виг|дієпр|незм)\.\s*(?:\((\d+)\))?/
/** Bracketed marks of the header line, verbatim («(особова назва, молд., пор. Ананий)»). */
export function parseHead(loc: string, variants: string[]): HeadLine {
  const { rowRef, text } = parseLoc(loc), pm = isTermLoc(loc) ? null : POS_RE.exec(text)
  const marks = [...text.matchAll(/\(([^()\d][^()]*)\)/g)].map(m => m[1]!.trim()).filter(s => !/^\d+$/.test(s)).slice(0, 3)
  return { variants, ...(pm ? { pos: pm[1]! } : {}), ...(pm?.[2] ? { count: Number(pm[2]) } : {}), marks, text: text.slice(0, 240), rowRef }
}

export type ArchStatus = 'dictionary' | 'unverified'
/** `kind: 'term'` (NV-4) = a headword of a 20th-century term list (not an archaic word); `gloss` = its quoted equivalents (ru | cs | de for mtt1925) */
export interface ArchDict { w: string; epoch?: string; quote: string; locator: string; pos?: string; marks: string[]; date: [number, number]; kind?: 'term'; gloss?: string[] }
export interface ArchForm { raw: string; f: number }
/** One archaic lemma card (public/data/archaic.json). */
export interface ArchEntry {
  id: string; head: string; variants: string[]; status: ArchStatus
  /** dictionary entries: the header line as printed (quote), its locator, the dictionary witness and its period */
  dict?: ArchDict
  /** NV-4: the same headword in further dictionary witnesses */
  more?: ArchDict[]
  /** corpus tokens (outside the dictionary witnesses) linked to this lemma */
  n: number; forms: ArchForm[]; epochs: Record<string, number>; witnesses: Record<string, number>
  first?: { w: string; loc: string; raw: string; date: [number, number] }
  kwic: { w: string; loc: string; raw: string }[]
  /** MM-46: historical-dictionary articles for this headword (from the SE rows); present = «attested in a dictionary», whatever `status` says */
  hist?: HistAttest[]
  /** MM-46: modern counterparts named by those glosses / cross-references (grade «зіставлено») */
  modern?: HistModern[]
}
/** MM-46: a historical-dictionary article (СУМ XVI–XVII, Тимченко, Матеріали …) that lists the headword: the dictionary's own gloss line, its locator and period. Attestation, not a VESUM verdict. */
export interface HistAttest { d: string; loc: string; g: string; date: [number, number] | null }
/** MM-46: a modern word the dictionary's gloss names. grade «зіставлено» = a gloss match (the gloss text contains this word), NEVER «підтверджено»; `via` = how it was reached. */
export interface HistModern { form: string; d: string; loc: string; grade: 'зіставлено'; via: 'gloss' | 'xr' }
export interface ArchFile { generated: string; source: string; entries: ArchEntry[] }

export const archId = (head: string) => head.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}'’ʼ-]+/gu, '')

export class ArchScan {
  readonly byId = new Map<string, ArchEntry>(); private readonly index = new Map<string, string>(); private readonly formIx = new Map<string, Map<string, ArchForm>>()   // perf: entry id → raw → form (was a linear find per token)
  /** register a dictionary entry (variants = spellings sharing the header line); returns its id */
  addDictEntry(w: { id: string; date: [number, number]; epoch?: string }, loc: string, variants: string[]): string | undefined {
    const vs = [...new Set(variants.map(archId).filter(Boolean))]; if (!vs.length) return undefined
    const id = vs[0]!, ex = this.byId.get(id), h = parseHead(loc, vs)
    const dict: ArchDict = { w: w.id, ...(w.epoch ? { epoch: w.epoch } : {}), quote: h.text, locator: h.rowRef, ...(h.pos ? { pos: h.pos } : {}), marks: h.marks, date: w.date, ...(isTermLoc(loc) ? { kind: 'term' as const, gloss: termGloss(loc) } : {}) }
    if (ex) {
      for (const v of vs) if (!ex.variants.includes(v)) { ex.variants.push(v); this.index.set(v, id) }
      if (ex.dict && ex.dict.w !== w.id && !(ex.more ?? []).some(m => m.w === w.id)) (ex.more ??= []).push(dict)   // NV-4: same headword, another dictionary
      return id
    }
    this.byId.set(id, { id, head: vs[0]!, variants: vs, status: 'dictionary', dict, n: 0, forms: [], epochs: {}, witnesses: {}, kwic: [] })
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
    let fi = this.formIx.get(id); if (!fi) { fi = new Map(e.forms.map(x => [x.raw, x] as const).reverse()); this.formIx.set(id, fi) }   // reverse: first form of a raw wins, as find() did
    const f = fi.get(t.raw); if (f) f.f++; else { const nf = { raw: t.raw, f: 1 }; e.forms.push(nf); fi.set(t.raw, nf) }
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

/** MM-46: modern single words a historical gloss names: «(приєднує підрядне речення умови) коли, якщо» → [коли, якщо]; parenthetical remarks are dropped, only whole one-word items count. */
export function glossWords(g: string): string[] {
  const t = g.replace(/\([^()]*\)/g, ' ').replace(/[«»"“”]/g, '')
  return [...new Set(t.split(/[,;]/).map(x => x.trim().replace(/[.\s]+$/, '').toLowerCase()).filter(x => /^[а-яіїєґ'’-]{2,}$/.test(x)))]
}
const lkA = (s: string) => s.normalize('NFC').replace(/́/g, '').toLowerCase()
/**
 * MM-46 (owner file «як не знайдено якщо знайдено в сум»): an archaic card whose head the senses panel finds in a historical dictionary is NOT «словникового запису не знайдено». `rowsOf(head)` = SE rows of the
 * headword (any dictionary); `isHist(d)` picks the historical ones; `known(w)` = a modern word (VESUM / a card); `ptrs(head)` = cross-reference targets (GG-18). Mutates the entries; returns how many gained `hist`.
 */
export function attachHist(entries: ArchEntry[], rowsOf: (head: string) => { d: string; g: string; l?: string; e?: [number, number]; oq?: 1 }[], isHist: (d: string) => boolean,
  coverOf: (d: string) => [number, number] | null, known: (w: string) => boolean, ptrs: (head: string) => { d: string; l?: string; t: string }[] = () => []): number {
  let n = 0
  for (const e of entries) {
    const heads = [...new Set([e.head, ...e.variants])], rows = heads.flatMap(h => rowsOf(h)).filter(r => isHist(r.d))
    if (!rows.length) continue
    const hist: HistAttest[] = [], modern: HistModern[] = [], seen = new Set<string>()
    for (const r of rows) {
      const k = r.d + '|' + (r.l ?? '') + '|' + r.g; if (seen.has(k)) continue; seen.add(k)
      hist.push({ d: r.d, loc: r.l ?? '', g: r.oq ? '' : r.g.slice(0, 200), date: r.e ?? coverOf(r.d) })
      if (!r.oq) for (const w of glossWords(r.g)) if (known(w) && !heads.some(h => lkA(h) === lkA(w)) && !modern.some(m => m.form === w)) modern.push({ form: w, d: r.d, loc: r.l ?? '', grade: 'зіставлено', via: 'gloss' })
    }
    for (const h of heads) for (const p of ptrs(h)) if (known(p.t) && !modern.some(m => m.form === lkA(p.t))) modern.push({ form: lkA(p.t), d: p.d, loc: p.l ?? '', grade: 'зіставлено', via: 'xr' })
    e.hist = hist.slice(0, 6); if (modern.length) e.modern = modern.slice(0, 4); n++
  }
  return n
}
