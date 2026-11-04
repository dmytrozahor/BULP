/**
 * SPEC 63 SE-15: the © dialect dictionaries from the owner-supplied scans (OCR on the worker by ops/worker/ocr-se15.sh) → data/work/se-parsed/<dict>.json
 * (policy fields only: headword, POS, labels, places, sense numbers, gloss ≤ 200, volume/page). The OCR text is © and stays outside git: `SE15_OCR` (default data/raw/se15-ocr, which is gitignored) holds
 * onysh1, onysh2, sabadosh, bukovyna, hutsul, polissia / page_NNNN.txt. Absent input → each missing volume is skipped, no error (the build runs without the books).
 * Usage: tsx pipelines/se15-scan.ts [ocr dir] [out dir (default data/work/se-parsed)] [status file]
 * Crash tolerance (RS-1): idempotent (the same input gives the same file), atomic writes, the output records the input sizes; a status file is updated at every step.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { BUK_DICT, HUT_DICT, ONY_DICT, SAB_DICT, POL_DICT, dialPassRate, dialRows, parseBukovyna, parseHutsul, parseOnyPlaces, parseOnyshkevych, parsePolissia, parsePolPlaces, parseSabadosh, type DialPage, type DialRow, type DialStats } from '../core/se15-parse.ts'
import type { SeRow } from '../core/se.ts'
import { writeJsonAtomic } from './robust.ts'

/** per volume: the scan index of the first body page and of the last (the index / contents pages are not body), printed page = scan index − offset (checked against the printed numbers of the OCR) */
export interface VolSpec { dir: string; dict: string; vol: number; first: number; last?: number; offset: number }
export const SE15_VOLS: VolSpec[] = [
  { dir: 'onysh1', dict: ONY_DICT, vol: 1, first: 33, last: 496, offset: 1 },
  { dir: 'onysh2', dict: ONY_DICT, vol: 2, first: 4, last: 407, offset: 1 },
  { dir: 'sabadosh', dict: SAB_DICT, vol: 1, first: 17, last: 430, offset: 1 },
  { dir: 'bukovyna', dict: BUK_DICT, vol: 1, first: 18, last: 688, offset: 1 },
  { dir: 'hutsul', dict: HUT_DICT, vol: 1, first: 19, last: 227, offset: 2 },
  { dir: 'polissia', dict: POL_DICT, vol: 1, first: 24, last: 241, offset: 1 },
]
const rd = (p: string): string => (existsSync(p) ? readFileSync(p, 'utf8') : '')
const BACK = /^\s*(?:ПОКАЖЧИК|ЗМІСТ|Зміст|ЛІТЕРАТУРА|ПЕРЕДМОВА|ЗМ\s?І\s?С\s?Т)\b/mu

export function loadPages(dir: string, v: VolSpec): { pages: DialPage[]; front: string[]; size: number } {
  const d = resolve(dir, v.dir)
  if (!existsSync(d)) return { pages: [], front: [], size: 0 }
  const files = readdirSync(d).filter(f => /^page_\d{4}\.txt$/.test(f)).sort()
  const pages: DialPage[] = [], front: string[] = []
  let size = 0, ended = false
  for (const f of files) {
    const i = Number(f.slice(5, 9)), text = rd(resolve(d, f))
    size += statSync(resolve(d, f)).size
    if (i < v.first) { front.push(text); continue }
    if (ended || (v.last && i > v.last)) continue
    if (i > v.first + 40 && BACK.test(text.slice(0, 200))) { ended = true; continue }
    pages.push({ text, no: i - v.offset })
  }
  return { pages, front, size }
}

export interface Se15Run { dict: string; cands: Set<string>; rows: [string, SeRow][]; stats: Record<string, DialStats & { passRate: number }>; heads: number }
export function runSe15(ocr: string, out: string, status?: string, known?: (h: string) => boolean, only?: string[]): Se15Run[] {
  const st = (o: object) => { if (status) writeJsonAtomic(status, JSON.stringify({ at: new Date().toISOString(), ...o })) }
  const res: Se15Run[] = []
  const dicts = [...new Set(SE15_VOLS.map(v => v.dict))].filter(d => !only || only.includes(d))
  for (const dict of dicts) {
    const vols = SE15_VOLS.filter(v => v.dict === dict && existsSync(resolve(ocr, v.dir)))
    if (!vols.length) { console.log(`se15-scan: ${dict}: no OCR dir under ${ocr}, skipped`); continue }
    st({ step: `start ${dict}` })
    const rows: [string, SeRow][] = [], stats: Se15Run['stats'] = {}, sizes: Record<string, number> = {}, cands = new Set<string>(), heads = new Set<string>()
    const loaded = vols.map(v => ({ v, ...loadPages(ocr, v) }))
    const places = dict === ONY_DICT ? parseOnyPlaces(loaded.find(l => l.v.vol === 1)?.front.slice(19, 33) ?? []) : undefined
    const polPlaces = dict === POL_DICT ? parsePolPlaces(loaded[0]?.front ?? []) : undefined
    for (const l of loaded) {
      if (!l.pages.length) continue
      sizes[l.v.dir] = l.size
      const r = dict === ONY_DICT ? parseOnyshkevych(l.pages, l.v.vol, places!, known)
        : dict === SAB_DICT ? parseSabadosh(l.pages, known) : dict === BUK_DICT ? parseBukovyna(l.pages, known)
        : dict === HUT_DICT ? parseHutsul(l.pages, known) : parsePolissia(l.pages, polPlaces!, known)
      r.cands.forEach(c => cands.add(c))
      for (const a of r.rows as DialRow[]) for (const x of dialRows(dict, { ...a, vol: l.v.vol })) { rows.push(x); heads.add(x[0]) }
      stats[l.v.dir] = { ...r.stats, passRate: dialPassRate(r.stats) }
      st({ step: `${l.v.dir} done`, stats })
    }
    mkdirSync(out, { recursive: true })
    writeJsonAtomic(resolve(out, `${dict}.json`), JSON.stringify({ id: dict, dict, kind: 'dialect-licensed', full: false, srcSizes: sizes, places: places?.size ?? polPlaces?.size ?? 0, stats, rows }))
    res.push({ dict, cands, rows, stats, heads: heads.size })
    st({ step: `done ${dict}`, headwords: heads.size, rows: rows.length, stats })
  }
  return res
}

if (process.argv[1] && /se15-scan\.ts$/.test(process.argv[1].replaceAll(String.fromCharCode(92), '/'))) {
  const a = process.argv.slice(2), ocr = resolve(a[0] ?? process.env.SE15_OCR ?? 'data/raw/se15-ocr'), outDir = resolve(a[1] ?? 'data/work/se-parsed')
  let known: ((h: string) => boolean) | undefined
  if (existsSync(resolve('data/raw/vesum')) && existsSync(ocr)) {
    // headwords first (a cheap pass without VESUM), then the VESUM verdict for the wordlist: a standard headword only records the place
    const first = runSe15(ocr, outDir, undefined, () => false)
    if (first.length) {
      const { vesumVerifier } = await import('./parse-hist-lex.ts')
      known = await vesumVerifier([...new Set(first.flatMap(r => [...r.cands]))])
    }
  }
  const rs = runSe15(ocr, outDir, resolve(a[2] ?? 'data/work/se15-status.json'), known)
  for (const r of rs) console.log(`${r.dict}: ${r.heads} headwords, ${r.rows.length} sense rows`, JSON.stringify(Object.fromEntries(Object.entries(r.stats).map(([k, s]) => [k, [s.entries, s.cardOk, s.passRate]]))))
  if (!rs.length) console.log(`se15-scan: ${ocr} has no volume, skipped`)
}
