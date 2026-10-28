/**
 * SPEC 63 LB-11: Аркушин, «Словник західнополіських говірок» (archive.org `slzhdplhv`) → data/work/se-parsed/arkushyn.json (policy fields only: headword, POS, villages, sense numbers, gloss ≤ 200, volume/page).
 * Usage: tsx pipelines/arkushyn-scan.ts [--fetch] [src dir (default data/raw/arkushyn)] [out dir (default data/work/se-parsed)] [status file]
 *   --fetch  downloads a-n_djvu.xml and o-ya_djvu.xml (the OCR text layer with page boundaries) through the archive.org download API into the src dir (kept out of git; the scan and the text are never committed).
 * Resumable (RS-1): the output records the source sizes and is rewritten only when they differ; atomic writes; a status file (JSON) is updated at every step.
 */
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { arkPassRate, arkRows, parseArkushyn, parseVillages, ARK_DICT, type ArkStats } from '../core/arkushyn-parse.ts'
import type { SeRow } from '../core/se.ts'
import { writeJsonAtomic } from './robust.ts'

const ITEM = 'slzhdplhv'
const VOLS = [{ vol: 1, file: 'a-n_djvu.xml' }, { vol: 2, file: 'o-ya_djvu.xml' }]
const unxml = (s: string) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
/** DjVu XML → one text per scan page (lines kept) */
export function pagesOfDjvuXml(xml: string): string[] {
  return xml.split('<OBJECT ').slice(1).map(o => o.split('<LINE>').slice(1).map(l => [...l.split('</LINE>')[0]!.matchAll(/<WORD [^>]*>([^<]*)<\/WORD>/g)].map(m => unxml(m[1]!)).join(' ')).filter(Boolean).join('\n'))
}
/** the scan page that carries the first article, and the printed page number of a scan page (vol. 1: the first article page is 1; vol. 2 prints its own numbers = the scan index) */
export function bodyRange(pages: string[], vol: number): { first: number; last: number; no: (i: number) => number | undefined } {
  const first = pages.findIndex((t, i) => i > 2 && /^[А-ЯІЇЄҐ] \S/u.test(t.split('\n')[0] ?? '') || /^[А-ЯІЇЄҐ] \S/u.test((t.split('\n')[0] ?? '')) && i > 2)
  const last = pages.findIndex((t, i) => i > first && /Наукове видання/u.test(t)) - 1
  return { first, last, no: i => (i >= first && i <= last ? (vol === 1 ? i - first + 1 : i) : undefined) }
}

export async function fetchSrc(dir: string): Promise<void> {
  mkdirSync(dir, { recursive: true })
  for (const v of VOLS) {
    const p = resolve(dir, v.file); if (existsSync(p) && statSync(p).size > 1e6) continue
    const r = await fetch(`https://archive.org/download/${ITEM}/${v.file}`, { headers: { 'user-agent': 'ukr-lexicon-research/1.0 (dmytrozah.dev@gmail.com)' } })
    if (!r.ok) throw new Error(`${v.file}: HTTP ${r.status}`)
    writeJsonAtomic(p, Buffer.from(await r.arrayBuffer()).toString('utf8'))
  }
}

export function runArkushyn(src: string, out: string, status?: string): { rows: [string, SeRow][]; stats: Record<string, ArkStats & { passRate: number }> } {
  const st = (o: object) => { if (status) writeJsonAtomic(status, JSON.stringify({ at: new Date().toISOString(), ...o })) }
  st({ step: 'start' })
  const rows: [string, SeRow][] = [], stats: Record<string, ArkStats & { passRate: number }> = {}, sizes: Record<string, number> = {}
  let villages = parseVillages([])
  for (const v of VOLS) {
    const p = resolve(src, v.file); if (!existsSync(p)) continue
    sizes[v.file] = statSync(p).size
    const pages = pagesOfDjvuXml(readFileSync(p, 'utf8')), b = bodyRange(pages, v.vol)
    if (v.vol === 1) villages = parseVillages(pages.slice(0, b.first).flatMap(t => t.split('\n')))
    const r = parseArkushyn(pages, v.vol, b.no, villages)
    for (const a of r.rows) rows.push(...arkRows(a))
    stats[`t${v.vol}`] = { ...r.stats, passRate: arkPassRate(r.stats) }
    st({ step: `vol ${v.vol} done`, stats })
  }
  mkdirSync(out, { recursive: true })
  writeJsonAtomic(resolve(out, `${ARK_DICT}.json`), JSON.stringify({ id: ARK_DICT, dict: ARK_DICT, kind: 'dialect-licensed', full: false, srcSizes: sizes, stats, rows }))
  st({ step: 'done', headwords: new Set(rows.map(r => r[0])).size, rows: rows.length, stats })
  return { rows, stats }
}

if (process.argv[1] && /arkushyn-scan\.ts$/.test(process.argv[1].replaceAll(String.fromCharCode(92), '/'))) {
  const a = process.argv.slice(2), pos = a.filter(x => !x.startsWith('--')), src = resolve(pos[0] ?? 'data/raw/arkushyn')
  if (a.includes('--fetch')) await fetchSrc(src)
  const r = runArkushyn(src, resolve(pos[1] ?? 'data/work/se-parsed'), resolve(pos[2] ?? 'data/work/arkushyn-status.json'))
  console.log(`arkushyn: ${new Set(r.rows.map(x => x[0])).size} headwords, ${r.rows.length} sense rows`, JSON.stringify(Object.fromEntries(Object.entries(r.stats).map(([k, s]) => [k, s.passRate]))))
}
