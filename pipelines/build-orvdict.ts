/**
 * BUILD step MM-28 (owner file «слинути точно є відповідник.png»): an ORV-only card («давньоруська лема без сучасного відповідника») whose rule-derived modern form is NOT in VESUM but IS a headword
 * of a dictionary we hold (СУМ-11 / СУМ-20 first, then the other parsed dictionaries: data/work/se-parsed/<id>.json) gets «сучасний відповідник за словником» with the dictionary, the locator
 * (volume / page) and the gloss (≤ 200 characters, the GG-7 policy). Pure matching in \`dictCounterparts\`; \`attachDictModern\` reads the files.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { DictModern, OrvCard } from '../core/torot.ts'
import type { SeRow } from '../core/se.ts'
import { loadPointers, type XrRow } from './build-xref.ts'

const lk = (s: string) => s.normalize('NFC').replace(/[\u0301]/g, '').toLowerCase()
const RANK = (d: string) => (d === 'sum11' ? 0 : d === 'sum20' ? 1 : 2)

/** `cands` = the rule-derived modern forms of a lemma (best first); `rows` = every parsed dictionary row by lower-cased headword. The first candidate with a row wins, СУМ before the others. */
export function dictCounterparts(cands: string[], rows: Map<string, SeRow[]>, ptrs: Map<string, XrRow[]> = new Map()): DictModern | undefined {
  for (const c of cands.map(lk)) {
    const rs = (rows.get(c) ?? []).filter(r => r.d !== 'wikt' && r.g)
    if (!rs.length) continue
    const r = [...rs].sort((a, b) => RANK(a.d) - RANK(b.d))[0]!
    return { form: c, dict: r.d, loc: r.l ?? '', q: r.g.slice(0, 200) }
  }
  // GG-18: a headword that is only a cross-reference («слинути — див. линути») is still the dictionary's counterpart; the pointer is shown as a pointer
  for (const c of cands.map(lk)) {
    const p = [...(ptrs.get(c) ?? [])].sort((a, b) => RANK(a.d) - RANK(b.d))[0]
    if (p) return { form: c, dict: p.d, loc: p.l ?? '', q: '', ptr: { k: p.k, t: p.t, ...(p.r ? { r: p.r } : {}), ...(p.a ? { a: p.a } : {}) } }
  }
  return undefined
}

export function loadParsedRows(root: string, heads: Set<string>): Map<string, SeRow[]> {
  const dir = resolve(root, 'data/work/se-parsed'), out = new Map<string, SeRow[]>()
  if (!existsSync(dir)) return out
  for (const f of readdirSync(dir).filter(x => x.endsWith('.json')).sort()) {
    let j: { rows: [string, SeRow][] }
    try { j = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) } catch { continue }   // a torn file is ignored (RS-1)
    for (const [h, r] of j.rows) { const k = lk(h); if (heads.has(k)) (out.get(k) ?? out.set(k, []).get(k)!).push(r) }
  }
  return out
}

/** mutates the ORV cards: `dictModern` for every card whose derived form is a dictionary headword; returns how many gained one */
export function attachDictModern(root: string, orv: (OrvCard & { dictModern?: DictModern })[], derive: (lemma: string) => string[]): number {
  const cand = new Map(orv.map(c => [c.id, derive(c.lemma).filter(f => /^[а-яіїєґ'’-]+$/.test(f)).slice(0, 6)] as const))
  const rows = loadParsedRows(root, new Set([...cand.values()].flat().map(lk)))
  let n = 0
  const ptrs = loadPointers(root).byHead
  for (const c of orv) { const d = dictCounterparts(cand.get(c.id)!, rows, ptrs); if (d) { c.dictModern = d; n++ } }
  return n
}
