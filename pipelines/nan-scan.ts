/**
 * SPEC 63 SE-14: Чабаненко, «Словник говірок Нижньої Наддніпрянщини» т. 1–4 (owner-supplied scans, OCR on the worker by ops/worker/ocr-se14.sh) → data/work/se-parsed/chabanenko.json
 * (policy fields only: headword, POS, labels, settlements, sense numbers, gloss ≤ 200, volume/page). The OCR text is © and stays outside git: `NAN_OCR` (default data/raw/se14-ocr, which is gitignored) holds
 * nan1..nan4/page_NNNN.txt (Tesseract) and nan1..nan4/tl_NNNN.txt (the text layer). Absent input → the step is skipped, no error (the build runs without the book).
 * Usage: tsx pipelines/nan-scan.ts [ocr dir] [out dir (default data/work/se-parsed)] [status file]
 * Crash tolerance (RS-1): idempotent (the same input gives the same file; ≈ 15 s), atomic writes, the output records the input sizes; a status file is updated at every step.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { NAN_DICT, nanPassRate, nanRows, parseNan, parseSettlements, type NanPage, type NanStats } from '../core/nan-parse.ts'
import type { SeRow } from '../core/se.ts'
import { writeJsonAtomic } from './robust.ts'

export const NAN_VOLS = [1, 2, 3, 4]
/** printed page = scan index − 1 in т. 1 (title + preface), = scan index in т. 2–4 (checked against the printed numbers of the text layer); т. 1 body starts at scan page 48 */
export const nanPageNo = (vol: number, i: number): number => (vol === 1 ? i - 1 : i)
const FIRST_BODY: Record<number, number> = { 1: 48, 2: 3, 3: 3, 4: 3 }
const rd = (p: string): string => (existsSync(p) ? readFileSync(p, 'utf8') : '')

/** the pages of a volume from the OCR dir; the contents / imprint page at the end is not body */
export function loadNanPages(dir: string, vol: number): { pages: NanPage[]; tl: string[]; size: number } {
  const d = resolve(dir, `nan${vol}`)
  if (!existsSync(d)) return { pages: [], tl: [], size: 0 }
  const files = readdirSync(d).filter(f => /^page_\d{4}\.txt$/.test(f)).sort()
  const pages: NanPage[] = [], tl: string[] = []
  let size = 0
  for (const f of files) {
    const i = Number(f.slice(5, 9)), text = rd(resolve(d, f)), t = rd(resolve(d, `tl_${f.slice(5, 9)}.txt`))
    size += statSync(resolve(d, f)).size
    if (vol === 1 && i < 48) tl.push(t)
    if (i < FIRST_BODY[vol]!) continue
    if (/^\s*ЗМІСТ/u.test(text) || /Наукове видання|Видавництво\s+"Комунар"|Умовні видавничі|Запорізький державний університет\s*$/u.test(text.slice(-400)) && text.length < 800) continue
    pages.push({ text, ...(t ? { tl: t } : {}), no: nanPageNo(vol, i) })
  }
  return { pages, tl, size }
}

export interface NanRun { cands: Set<string>; rows: [string, SeRow][]; stats: Record<string, NanStats & { passRate: number }>; settlements: { modern: number; old: number } }
export function runNan(ocr: string, out: string, status?: string, known?: (h: string) => boolean, wordKnown?: (w: string) => boolean): NanRun | undefined {
  if (!existsSync(resolve(ocr, 'nan1'))) { console.log(`nan-scan: ${ocr}/nan1 absent, skipped`); return undefined }
  const st = (o: object) => { if (status) writeJsonAtomic(status, JSON.stringify({ at: new Date().toISOString(), ...o })) }
  st({ step: 'start' })
  const rows: [string, SeRow][] = [], stats: NanRun['stats'] = {}, sizes: Record<string, number> = {}, cands = new Set<string>()
  const v1 = loadNanPages(ocr, 1), settlements = parseSettlements(v1.tl)
  for (const vol of NAN_VOLS) {
    const l = vol === 1 ? v1 : loadNanPages(ocr, vol); if (!l.pages.length) continue
    sizes[`nan${vol}`] = l.size
    const r = parseNan(l.pages, vol, settlements, known, wordKnown)
    r.cands.forEach(c => cands.add(c))
    for (const a of r.rows) rows.push(...nanRows(a))
    stats[`t${vol}`] = { ...r.stats, passRate: nanPassRate(r.stats) }
    st({ step: `vol ${vol} done`, stats })
  }
  mkdirSync(out, { recursive: true })
  const sc = { modern: settlements.modern.size, old: settlements.old.size }
  writeJsonAtomic(resolve(out, `${NAN_DICT}.json`), JSON.stringify({ id: NAN_DICT, dict: NAN_DICT, kind: 'dialect-licensed', full: false, srcSizes: sizes, settlements: sc, stats, rows }))
  st({ step: 'done', headwords: new Set(rows.map(r => r[0])).size, rows: rows.length, stats })
  return { cands, rows, stats, settlements: sc }
}

if (process.argv[1] && /nan-scan\.ts$/.test(process.argv[1].replaceAll(String.fromCharCode(92), '/'))) {
  const a = process.argv.slice(2), ocr = resolve(a[0] ?? process.env.NAN_OCR ?? 'data/raw/se14-ocr')
  let known: ((h: string) => boolean) | undefined
  if (existsSync(resolve('data/raw/vesum'))) {
    // headwords first (a cheap pass without VESUM), then the VESUM verdict for the wordlist: a standard headword only records the place
    const first = runNan(ocr, resolve(a[1] ?? 'data/work/se-parsed'), undefined, () => false)
    if (first) {
      const { vesumVerifier } = await import('./parse-hist-lex.ts')
      known = await vesumVerifier([...first.cands])
    }
  }
  const r = runNan(ocr, resolve(a[1] ?? 'data/work/se-parsed'), resolve(a[2] ?? 'data/work/nan-status.json'), known, known)
  if (r) console.log(`chabanenko: ${new Set(r.rows.map(x => x[0])).size} headwords, ${r.rows.length} sense rows; settlements ${r.settlements.modern} modern / ${r.settlements.old} old`, JSON.stringify(Object.fromEntries(Object.entries(r.stats).map(([k, s]) => [k, s.passRate]))))
}
