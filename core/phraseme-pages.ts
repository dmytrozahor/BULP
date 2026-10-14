/**
 * SPEC 63 PH: one page per phraseme (/p/:id). Pure helpers shared by the build (pipelines/build-phrases.ts) and the PhraseView.
 * > P-1.7 / SPEC 00: only what a source states is shown, with the source and a locator; everything else is «невідомо» (never guessed).
 */
import type { Phraseme } from './phrasemes.ts'
import type { Kwic } from './types.ts'

/** normalised word list of a phraseme (lemmas «~»-stripped, stress and case dropped, apostrophes unified) */
export const phraseKey = (words: string[]): string => words.map(w => w.replace(/^~/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC').toLowerCase().replace(/[’ʼ`]/g, "'")).join(' ')
/** stable id: p + 10 hex of a 2×32-bit FNV-1a/djb2 hash of the key (same words → same id across rebuilds) */
export function phraseId(words: string[]): string {
  const s = phraseKey(words); let a = 0x811c9dc5, b = 5381
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 0x01000193) >>> 0; b = (Math.imul(b, 33) ^ c) >>> 0 }
  return 'p' + (a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0')).slice(0, 10)
}
/** a quoted source statement: text + where it was read (SPEC 00) */
export interface Quoted { text: string; src: string; loc: string; licence: string }
export interface PhraseEvidence {
  n: number                                  // all occurrences found in the admitted corpus
  kwic: Kwic[]                               // ≤ 5 lines, spread over the dated range
  byCentury: Record<string, number>          // century (e.g. "11") → occurrences
  earliest?: { w: string; loc: string; date: [number, number] }
}
export interface PhraseDetail {
  kind: 'candidate' | 'attested' | 'dict'
  title?: string
  gloss?: Quoted[]; etymology?: Quoted[]; tags?: Quoted[]; synonyms?: Quoted[]
  evidence?: PhraseEvidence
  pos?: string[]                             // POS label per component (build time, from the lemma cards; '' = unknown)
}
export interface PhrasesDetailShard { format: 1; details: Record<string, PhraseDetail> }
export const detailShardOf = (id: string): string => id.slice(1, 2)
export const centuryOf = (d: [number, number]): string => String(Math.floor((d[0] + d[1]) / 2 / 100) + 1)
const POS_SHORT: Record<string, string> = { 'іменник': 'N', 'прикметник': 'Adj', 'дієслово': 'V', 'прийменник': 'Prep', 'прислівник': 'Adv', 'займенник': 'Pron', 'сполучник': 'Conj', 'частка': 'Part', 'числівник': 'Num', 'вигук': 'Intj' }
/** computed syntactic pattern from per-component POS labels («Adj+N»); undefined when any component's POS is unknown */
export function syntaxPattern(pos: (string | undefined)[]): string | undefined {
  const out = pos.map(p => (p ? POS_SHORT[p.split(',')[0]!.trim()] : undefined))
  return out.length && out.every(Boolean) ? out.join('+') : undefined
}
/** component-order variants (same lemma set, other order) and lexical variants (same length, exactly one lemma differs) among the other phrasemes */
export function phraseVariants(p: Phraseme, all: Phraseme[]): { order: Phraseme[]; lexical: Phraseme[] } {
  const k = phraseKey(p.lemmas).split(' '), sk = [...k].sort().join(' '), order: Phraseme[] = [], lexical: Phraseme[] = []
  for (const q of all) {
    if (q === p || q.lemmas.length !== k.length) continue
    const qk = phraseKey(q.lemmas).split(' ')
    if (qk.join(' ') === k.join(' ')) continue
    if ([...qk].sort().join(' ') === sk) order.push(q)
    else if (qk.filter((w, i) => w !== k[i]).length === 1) lexical.push(q)
  }
  return { order: order.slice(0, 8), lexical: lexical.slice(0, 8) }
}
/** other phrasemes that share a component lemma (content words only, ≥ 4 letters), strongest first */
export function relatedBy(p: Phraseme, all: Phraseme[], limit = 10): Phraseme[] {
  const ks = new Set(phraseKey(p.lemmas).split(' ').filter(w => w.length >= 4))
  return all.filter(q => q !== p && phraseKey(q.lemmas).split(' ').some(w => ks.has(w))).sort((a, b) => b.score - a.score).slice(0, limit)
}
import type { PhraseDoc } from './phrasemes.ts'
/**
 * PH-2: every occurrence of the target n-grams in the admitted corpus (one scan; the same keys / segments as `mine`, so variants merged by BL-12b are merged here too).
 * `kwicAt(docIndex, tokenIndex, n)` builds the concordance line (the build owns the tokens).
 */
export function collectEvidence(docs: PhraseDoc[], targets: Map<Phraseme, number[]>, kwicAt: (wi: number, ti: number, n: number) => Kwic, perPhrase = 5): Map<Phraseme, PhraseEvidence> {
  const byFirst = new Map<number, { p: Phraseme; ks: number[] }[]>()
  for (const [p, ks] of targets) { const a = byFirst.get(ks[0]!) ?? []; a.push({ p, ks }); byFirst.set(ks[0]!, a) }
  interface Acc { n: number; byCentury: Record<string, number>; hits: { wi: number; ti: number; y: number }[]; first?: { wi: number; ti: number; y: number } }
  const acc = new Map<Phraseme, Acc>()
  docs.forEach((d, wi) => {
    for (let i = 0; i < d.keys.length; i++) {
      const c = byFirst.get(d.keys[i]!); if (!c) continue
      for (const { p, ks } of c) {
        if (i + ks.length > d.keys.length) continue
        let ok = true
        for (let j = 1; j < ks.length && ok; j++) ok = d.keys[i + j] === ks[j] && d.seg[i + j] === d.seg[i]
        if (!ok) continue
        const a = acc.get(p) ?? { n: 0, byCentury: {}, hits: [] }; acc.set(p, a)
        a.n++; const cen = centuryOf(d.date); a.byCentury[cen] = (a.byCentury[cen] ?? 0) + 1
        const h = { wi, ti: i, y: d.date[0] }
        if (a.hits.length < 400) a.hits.push(h)
        if (!a.first || h.y < a.first.y) a.first = h
      }
    }
  })
  const out = new Map<Phraseme, PhraseEvidence>()
  for (const [p, a] of acc) {
    const hs = [...a.hits].sort((x, y) => x.y - y.y), pick = new Set<number>()
    for (let k = 0; k < Math.min(perPhrase, hs.length); k++) pick.add(Math.round((k * (hs.length - 1)) / Math.max(1, Math.min(perPhrase, hs.length) - 1)))
    const kwic = [...pick].sort((x, y) => x - y).map(i => kwicAt(hs[i]!.wi, hs[i]!.ti, targets.get(p)!.length))
    const f = a.first ? kwicAt(a.first.wi, a.first.ti, targets.get(p)!.length) : undefined
    out.set(p, { n: a.n, kwic, byCentury: a.byCentury, ...(f ? { earliest: { w: f.w, loc: f.loc, date: f.date } } : {}) })
  }
  return out
}
