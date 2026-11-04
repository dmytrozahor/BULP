/**
 * SPEC 63 SE-15: the © dialect dictionaries from the owner-supplied scans (OCR on the worker by ops/worker/ocr-se15.sh) → data/work/se-parsed/<dict>.json
 * (policy fields only: headword, POS, labels, places, sense numbers, gloss ≤ 200, volume/page). The OCR text is © and stays outside git: `SE15_OCR` (default data/raw/se15-ocr, which is gitignored) holds
 * onysh1, onysh2, sabadosh, bukovyna, hutsul, polissia / page_NNNN.txt. Absent input → each missing volume is skipped, no error (the build runs without the books).
 * Usage: tsx pipelines/se15-scan.ts [ocr dir] [out dir (default data/work/se-parsed)] [status file]
 * Crash tolerance (RS-1): idempotent (the same input gives the same file), atomic writes, the output records the input sizes; a status file is updated at every step.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { BUK_DICT, BUK_LABEL, HUT_DICT, HUT_LABEL, ONY_DICT, ONY_LABEL, ONY_SHORT, POL_LABEL, SAB_DICT, SAB_LABEL, SAB_SHORT, POL_DICT, dialPassRate, dialRows, parseBukovyna, parseHutsul, parseOnyPlaces, parseOnyshkevych, parsePolissia, parsePolPlaces, parseSabadosh, type DialPage, type DialRow, type DialStats } from '../core/se15-parse.ts'
import type { SeRow } from '../core/se.ts'
import { maxChars } from '../core/rights.ts'
import { SLA_DICT, foldLatin, foldSlav, onSpine, parseLatinPages, parseSlovPages, slaGlossRows, slaSlovRows, type SlaPage, type SlaStats } from '../core/slavynetsky-parse.ts'
import { writeJsonAtomic } from './robust.ts'
import { ocrMissing } from './ocr-required.ts'

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

/**
 * CR-1 hook (core/corr-src.ts dialectLexPairs, read by pipelines/build-corr.ts from data/work/corr-extra/*.json as {"rows": LexRow[]}): a WORD-LEVEL row (the headword is no standard word, so it is a dialect word of the
 * book's area) whose gloss is ONE word. A place-only row (a standard headword) is never a correspondence. The areas are the dialect codes the book's area has in the project map (Лисенко: the preface names the
 * middle- and east-Polissian speech = MPL + CHN); Буковина has no code, so the area is named as a village-level label.
 */
export const CORR_AREA: Record<string, { codes: string[]; village?: string; src: string; word: string }> = {
  onyshkevych: { codes: ['BOY'], src: ONY_SHORT, word: ONY_LABEL }, sabadosh: { codes: ['ZAK'], village: 'Сокирниця', src: SAB_SHORT, word: SAB_LABEL },
  bukovyna: { codes: [], village: 'Буковина (Чернівецька обл.)', src: 'Словник буковинських говірок (2005)', word: BUK_LABEL }, hutsul: { codes: ['HUT'], src: 'Гуцульські говірки. Короткий словник (1997)', word: HUT_LABEL },
  verkhratsky: { codes: ['LEM'], src: 'Верхратський, Говор галицких Лемків (1902)', word: 'лемк.' },
  lysenko: { codes: ['MPL', 'CHN'], src: 'Лисенко, Словник поліських говорів (1974)', word: POL_LABEL }, chabanenko: { codes: ['STP'], src: 'Чабаненко, Словник говірок Нижньої Наддніпрянщини (1992)', word: 'ниж.-наддн.' },
}
export interface CorrLexRow { w: string[]; gloss: string; codes: string[]; src: string; loc: string; q: string; village?: string }
export function corrRowsOf(dict: string, rows: [string, SeRow][]): CorrLexRow[] {
  const c = CORR_AREA[dict]; if (!c) return []
  const out: CorrLexRow[] = [], seen = new Set<string>()
  for (const [h, r] of rows) {
    if (r.unv || r.lb?.[0] !== c.word || !r.g || r.oq) continue
    const g = r.g.replace(/…$/, '').trim().toLowerCase()
    if (!/^[а-яіїєґ]+(?:['’-][а-яіїєґ]+)*$/u.test(g) || g.length < 3 || g === h || seen.has(h + '|' + g)) continue
    seen.add(h + '|' + g)
    out.push({ w: [h], gloss: g, codes: c.codes, src: c.src, loc: r.l ?? '', q: (h + ' — ' + g).slice(0, maxChars(dict)), ...(c.village ? { village: c.village } : {}) })
  }
  return out
}
/** Славинецький (public-domain text of 1642 / 1650; core/slavynetsky-parse.ts): scan pages 62–419 = Лексикон латинський, 423–541 = Лексикон словено-латинський; printed page = scan index */
export const SLA_LATIN = { first: 62, last: 419 }, SLA_SLOV = { first: 423, last: 541 }
export function runSlavynetsky(ocr: string, out: string): { latin: number; slov: number; gloss: number; stats: { latin: SlaStats; slov: SlaStats } } | undefined {
  const d = resolve(ocr, 'slavynetsky'); if (!existsSync(d)) return ocrMissing(`se15-scan: ${d} absent (slavynetsky)`)
  const pagesOf = (a: number, b: number): SlaPage[] => { const o: SlaPage[] = []; for (let i = a; i <= b; i++) { const t = rd(resolve(d, `page_${String(i).padStart(4, '0')}.txt`)); if (t) o.push({ text: t, no: i }) } return o }
  const stL: SlaStats = { pages: 0, candidates: 0, kept: 0, keyed: 0, badGloss: 0, footnoteCuts: 0 }, stS = { ...stL }
  const lat0 = parseLatinPages(pagesOf(SLA_LATIN.first, SLA_LATIN.last), stL), slov0 = parseSlovPages(pagesOf(SLA_SLOV.first, SLA_SLOV.last), stS)
  const lat = onSpine(lat0, foldLatin), slov = onSpine(slov0, foldSlav); stL.spineDropped = lat0.length - lat.length; stS.spineDropped = slov0.length - slov.length
  const gloss = slaGlossRows(lat, stL), heads = slaSlovRows(slov, stS)
  mkdirSync(out, { recursive: true })
  writeJsonAtomic(resolve(out, 'slavynetsky-gloss.json'), JSON.stringify({ id: 'slavynetsky-gloss', dict: SLA_DICT, kind: 'hist-gloss', full: true, stats: stL, rows: gloss }))
  writeJsonAtomic(resolve(out, 'slavynetsky.json'), JSON.stringify({ id: 'slavynetsky', dict: SLA_DICT, kind: 'heads', full: true, stats: stS, rows: heads }))
  return { latin: lat.length, slov: slov.length, gloss: gloss.length, stats: { latin: stL, slov: stS } }
}
export interface Se15Run { dict: string; cands: Set<string>; rows: [string, SeRow][]; stats: Record<string, DialStats & { passRate: number }>; heads: number }
export function runSe15(ocr: string, out: string, status?: string, known?: (h: string) => boolean, only?: string[]): Se15Run[] {
  const st = (o: object) => { if (status) writeJsonAtomic(status, JSON.stringify({ at: new Date().toISOString(), ...o })) }
  const res: Se15Run[] = []
  const dicts = [...new Set(SE15_VOLS.map(v => v.dict))].filter(d => !only || only.includes(d))
  for (const dict of dicts) {
    const vols = SE15_VOLS.filter(v => v.dict === dict && existsSync(resolve(ocr, v.dir)))
    if (!vols.length) { ocrMissing(`se15-scan: ${dict}: no OCR dir under ${ocr}`); continue }
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
    mkdirSync(out, { recursive: true }); mkdirSync(resolve(out, '..', 'corr-extra'), { recursive: true })
    writeJsonAtomic(resolve(out, `${dict}.json`), JSON.stringify({ id: dict, dict, kind: 'dialect-licensed', full: false, srcSizes: sizes, places: places?.size ?? polPlaces?.size ?? 0, stats, rows }))
    writeJsonAtomic(resolve(out, '..', 'corr-extra', `se15-${dict}.json`), JSON.stringify({ rows: corrRowsOf(dict, rows) }))   // CR-1 hook
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
  if (!rs.length) ocrMissing(`se15-scan: ${ocr} has no volume`)
  const sla = runSlavynetsky(ocr, outDir); if (sla) console.log(`slavynetsky: ${sla.latin} Latin entries, ${sla.slov} word-pair entries, ${sla.gloss} keyed gloss rows`, JSON.stringify(sla.stats))
  const nan = resolve(outDir, 'chabanenko.json')   // SE-14's Чабаненко rows feed the same CR-1 hook (its one-word glosses)
  if (existsSync(nan)) { try { const j = JSON.parse(readFileSync(nan, 'utf8')) as { rows: [string, SeRow][] }; mkdirSync(resolve(outDir, '..', 'corr-extra'), { recursive: true }); writeJsonAtomic(resolve(outDir, '..', 'corr-extra', 'se15-chabanenko.json'), JSON.stringify({ rows: corrRowsOf('chabanenko', j.rows) })) } catch { /* torn: skipped (RS-1) */ } }
}
