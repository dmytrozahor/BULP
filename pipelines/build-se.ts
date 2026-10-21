/**
 * BUILD stage, SPEC 63 SE: the sense inventory per lemma (all dictionaries that carry a sense line), its alignment, the transitions and the corpus contexts assigned by evidence.
 * Pure parts live in core/se.ts; this file only GATHERS rows from what the build already holds and what the harvesters left on disk:
 *  - the dictionary witnesses of the corpus (r2u: Желехівський, Уманець–Спілка, Грінченко, Ніковський, Кримський …; Словник староукраїнської мови XIV–XV ст.): every token linked to a lemma
 *    (or to a light / archaic card) carries the locator of its article line (core/sn.ts reads the gloss, SN-1);
 *  - uk.wiktionary senses (data/raw/wikt, BL-9) and en.wiktionary senses via kaikki (data/raw/kaikki/uk.jsonl), both modern and undated.
 * Output: data/work/se.json = { key: SeEntry } (not committed); pipelines/build-parts.ts shards it into public/data/lm/se/<bucket>.json (lazy, read only when the block opens).
 */
import { createReadStream, existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { lk } from '../core/cv.ts'
import { buildEntry, dictOfWitness, rowOfLine, typeLabels, type SeEntry, type SeKwicIn, type SeRow } from '../core/se.ts'
import { collectSenses } from './build-extras.ts'

export interface SeDictIn { w: { id: string; tokens: { raw: string; loc: string }[]; witnessType?: string; date: [number, number] } }
const PER_SOURCE = 6   // rows per lemma and modern source (keeps lm/se shards small)
const PER_PARSED = 8    // rows per lemma and parsed historical dictionary (SE-11)

/** SE-1: a row for every (dictionary witness, article line) that documents the lemma; `target` = the lemma / card word a token links to (undefined = no card). */
export function dictRows(ins: SeDictIn[], target: (wi: number, ti: number) => string | undefined, into = new Map<string, SeRow[]>()): Map<string, SeRow[]> {
  const seen = new Set<string>()
  ins.forEach(({ w }, wi) => {
    if (w.witnessType !== 'dictionary' || !dictOfWitness(w.id)) return
    w.tokens.forEach((t, ti) => {
      const word = target(wi, ti); if (!word) return
      const k = lk(word), id = `${k}\0${w.id}\0${t.loc}`
      if (seen.has(id)) return
      seen.add(id)
      const row = rowOfLine(w.id, t.loc, t.raw, word, w.date); if (!row) return
      const list = into.get(k) ?? into.set(k, []).get(k)!
      if (list.filter(r => r.d === row.d).length < PER_SOURCE) list.push(row)
    })
  })
  return into
}

/** SE-1: modern rows from uk.wiktionary (BL-9 parser) */
export function wiktRows(root: string, lemmas: Iterable<string>, into: Map<string, SeRow[]>): number {
  const c = collectSenses(root, lemmas); if (!c) return 0
  let n = 0
  for (const [lemma, senses] of Object.entries(c.out)) {
    const list = into.get(lk(lemma)) ?? into.set(lk(lemma), []).get(lk(lemma))!
    for (const s of senses.slice(0, PER_SOURCE)) {
      const row: SeRow = { d: 'wikt.uk', g: s.gloss.slice(0, 160), l: s.source }
      if (s.pos) row.p = s.pos
      const t = typeLabels(s.gloss); if (t.length) row.t = t
      list.push(row); n++
    }
  }
  return n
}

/** SE-1: modern rows from en.wiktionary (kaikki.org dump data/raw/kaikki/uk.jsonl, streamed once; form-of / alt-of senses are no senses of the lemma). The sense tags («figuratively», «pejorative») are the source's own type labels. */
export async function kaikkiRows(root: string, wanted: (k: string) => boolean, into: Map<string, SeRow[]>): Promise<number> {
  const src = resolve(root, 'data/raw/kaikki/uk.jsonl')
  if (!existsSync(src)) return 0
  let n = 0
  const rl = createInterface({ input: createReadStream(src, 'utf8'), crlfDelay: Infinity })
  for await (const line of rl) {
    let e: { word?: string; lang_code?: string; pos?: string; senses?: { tags?: string[]; glosses?: string[] }[] }
    try { e = JSON.parse(line) } catch { continue }
    if (e.lang_code !== 'uk' || !e.word) continue
    const k = lk(e.word); if (!wanted(k)) continue
    const list = into.get(k) ?? into.set(k, []).get(k)!
    let own = list.filter(r => r.d === 'wikt.en').length
    for (const s of e.senses ?? []) {
      const tags = s.tags ?? [], g = (s.glosses?.[0] ?? '').trim()
      if (!g || tags.includes('form-of') || tags.includes('alt-of') || own >= PER_SOURCE) continue
      if (list.some(r => r.d === 'wikt.en' && r.g === g.slice(0, 160))) continue
      const row: SeRow = { d: 'wikt.en', g: g.slice(0, 160), l: 'kaikki.org' }
      if (e.pos) row.p = e.pos
      const t = typeLabels(`${tags.join(' ')} ${g}`); if (t.length) row.t = t
      list.push(row); own++; n++
    }
  }
  return n
}

/**
 * SE-11: rows of the parsed historical dictionaries (pipelines/parse-se-dicts.ts → data/work/se-parsed/<id>.json). A row is attached to the card whose key equals the headword (lk); a headword that no
 * card has is tried through `alt` (the first derivation candidate of the headword, flagged `m: 'd'`); otherwise it is dropped: an OCR headword never creates a lemma.
 */
export function parsedRows(root: string, wanted: (k: string) => boolean, alt: (head: string) => string[], into: Map<string, SeRow[]>): { files: number; rows: number; derived: number } {
  const dir = resolve(root, 'data/work/se-parsed')
  let files = 0, n = 0, derived = 0
  if (!existsSync(dir)) return { files, rows: n, derived }
  for (const f of readdirSync(dir).filter(x => x.endsWith('.json')).sort()) {
    let j: { rows: [string, SeRow][] }
    try { j = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) } catch { continue }   // a torn file is ignored (RS-1)
    files++
    for (const [head, row] of j.rows) {
      let k = lk(head), r = row
      if (!wanted(k)) { const a = alt(head).map(lk).find(wanted); if (!a) continue; k = a; r = { ...row, m: 'd' as const }; derived++ }
      const list = into.get(k) ?? into.set(k, []).get(k)!
      if (list.filter(x => x.d === r.d).length < PER_PARSED) { list.push(r); n++ }
    }
  }
  return { files, rows: n, derived }
}

export interface SeStats { lemmas: number; rows: number; groups: number; aligned: number; transitions: number; typed: number; byDict: Record<string, number>; withHistory: number; kwicAssigned: number }
/** SE-2…SE-4: rows → entries. `kwic(key)` = the corpus contexts of the card (dictionary witnesses excluded by the caller). */
export function buildSenseEntries(rows: Map<string, SeRow[]>, kwic: (k: string) => SeKwicIn[] = () => []): { entries: Map<string, SeEntry>; stats: SeStats } {
  const entries = new Map<string, SeEntry>(), st: SeStats = { lemmas: 0, rows: 0, groups: 0, aligned: 0, transitions: 0, typed: 0, byDict: {}, withHistory: 0, kwicAssigned: 0 }
  for (const k of [...rows.keys()].sort()) {
    const rs = rows.get(k)!; if (!rs.length) continue
    const e = buildEntry(rs, kwic(k))
    entries.set(k, e)
    st.lemmas++; st.rows += e.rows.length; st.groups += e.groups.length; st.aligned += e.groups.filter(g => g.rows.length > 1 && g.sc !== null).length
    st.transitions += e.trans.length; st.typed += e.trans.filter(t => t.type).length; st.kwicAssigned += e.kw?.length ?? 0
    for (const r of e.rows) st.byDict[r.d] = (st.byDict[r.d] ?? 0) + 1
    if (e.rows.some(r => r.e || ['dsu14', 'timchenko', 'sum16'].includes(r.d))) st.withHistory++
  }
  return { entries, stats: st }
}
