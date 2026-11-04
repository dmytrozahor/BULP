/**
 * SPEC 63 SE-14 (SE-16: column-aware OCR in data/raw/se16-ocr, graded rows a/b/c incl. page pointers): ЕСУМ т. 1–6 (owner-supplied scans, OCR on the worker by ops/worker/ocr-se14.sh) → data/work/etymology-esum-scan.json (policy fields only: headword, ЕСУМ volume/page, one excerpt ≤ 200 characters
 * that starts at the etymological statement). The OCR text is © and stays outside git: `ESUM_OCR` (default data/raw/se14-ocr, gitignored) holds esum1..esum6/page_NNNN.txt. Absent input → skipped, no error.
 * writeEtymology (pipelines/build-etymology.ts) merges the file into public/data/etymology.json as a Q-evidence «ЕСУМ т. N, с. M (друкований том)» for the lemmas of the lexicon.
 * Usage: tsx pipelines/esum-scan.ts [ocr dir] [out file] [status file]
 * Crash tolerance (RS-1): atomic writes, the output records the input sizes; a status file is updated at every step.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { ESUM_VOLS, esumPassRate, parseEsum, parseEsum16, type EsumPage, type EsumStats, type Esum16Stats } from '../core/esum-parse.ts'
import { writeJsonAtomic } from './robust.ts'

export interface EsumScanEntry { t?: string; v: number; p: number; k?: 'bor' | 'proto' | 'other'; n?: number; g?: 'a' | 'b' | 'c' }
export interface EsumScan { v: 1 | 2; srcSizes: Record<string, number>; stats: Record<string, (EsumStats | Esum16Stats) & { passRate: number }>; known: number; entries: Record<string, EsumScanEntry> }

export function loadEsumPages(dir: string, vol: number): { pages: EsumPage[]; size: number } {
  const d = resolve(dir, `esum${vol}`)
  if (!existsSync(d)) return { pages: [], size: 0 }
  const pages: EsumPage[] = []; let size = 0
  for (const f of readdirSync(d).filter(x => /^page_\d{4}\.txt$/.test(x)).sort()) { size += statSync(resolve(d, f)).size; pages.push({ idx: Number(f.slice(5, 9)), text: readFileSync(resolve(d, f), 'utf8') }) }
  return { pages, size }
}

/** SE-16: the column-aware OCR (ops/worker/ocr-se16.mjs) is preferred when its volume directory is complete; `ESUM16_OCR` (default data/raw/se16-ocr) */
export const complete16 = (ocr16: string, vol: number): boolean => existsSync(resolve(ocr16, `esum${vol}`, 'DONE.shard0')) || (existsSync(resolve(ocr16, `esum${vol}`)) && readdirSync(resolve(ocr16, `esum${vol}`)).filter(f => /^page_\d{4}\.txt$/.test(f)).length >= 0.99 * ESUM_PAGES[vol]!)
export const ESUM_PAGES: Record<number, number> = { 1: 634, 2: 573, 3: 553, 4: 657, 5: 705, 6: 569 }

export function runEsum(ocr: string, outFile: string, status?: string, known: (h: string) => boolean = () => false, ocr16 = resolve(process.env.ESUM16_OCR ?? 'data/raw/se16-ocr')): (EsumScan & { cands: Set<string> }) | undefined {
  if (!existsSync(resolve(ocr, 'esum1')) && !existsSync(resolve(ocr16, 'esum1'))) { console.log(`esum-scan: ${ocr}/esum1 absent, skipped`); return undefined }
  const st = (o: object) => { if (status) writeJsonAtomic(status, JSON.stringify({ at: new Date().toISOString(), ...o })) }
  st({ step: 'start' })
  const entries: Record<string, EsumScanEntry> = {}, stats: EsumScan['stats'] = {}, srcSizes: Record<string, number> = {}, cands = new Set<string>()
  let nKnown = 0
  for (const vol of Object.keys(ESUM_VOLS).map(Number)) {
    const new16 = complete16(ocr16, vol), l = loadEsumPages(new16 ? ocr16 : ocr, vol); if (!l.pages.length) continue
    srcSizes[`esum${vol}${new16 ? 'c' : ''}`] = l.size
    const r = new16 ? parseEsum16(l.pages, vol, known) : parseEsum(l.pages, vol)
    for (const x of r.rows) {
      cands.add(x.head)
      const prev = entries[x.head]
      if (prev) { prev.n = (prev.n ?? 1) + 1; if (!prev.t && x.t) Object.assign(prev, { t: x.t, v: x.vol, p: x.page, ...(x.kind ? { k: x.kind } : {}), ...('grade' in x ? { g: x.grade } : {}) }); continue }   // a headword in two volumes (a homonym): the first article is kept (the first with an excerpt), the number says there are more
      entries[x.head] = { ...(x.t ? { t: x.t } : {}), v: x.vol, p: x.page, ...(x.kind ? { k: x.kind } : {}), ...('grade' in x ? { g: x.grade } : {}) }
      if (known(x.head)) nKnown++
    }
    stats[`t${vol}`] = { ...r.stats, passRate: new16 ? ((r.stats as Esum16Stats).paragraphs ? Math.round((r.stats.entries / (r.stats as Esum16Stats).starts) * 1000) / 1000 : 0) : esumPassRate(r.stats as EsumStats) }
    st({ step: `vol ${vol} done`, stats })
  }
  mkdirSync(dirname(outFile), { recursive: true })
  const out: EsumScan = { v: 2, srcSizes, stats, known: nKnown, entries }
  writeJsonAtomic(outFile, JSON.stringify(out))
  st({ step: 'done', headwords: Object.keys(entries).length, stats })
  return { ...out, cands }
}

if (process.argv[1] && /esum-scan\.ts$/.test(process.argv[1].replaceAll(String.fromCharCode(92), '/'))) {
  const a = process.argv.slice(2), ocr = resolve(a[0] ?? process.env.ESUM_OCR ?? 'data/raw/se14-ocr'), out = resolve(a[1] ?? 'data/work/etymology-esum-scan.json')
  let known: (h: string) => boolean = () => false
  if (existsSync(resolve('data/raw/vesum'))) {
    const first = runEsum(ocr, out, undefined, () => false)
    if (first) { const { vesumVerifier } = await import('./parse-hist-lex.ts'); known = await vesumVerifier([...first.cands]) }
  }
  const r = runEsum(ocr, out, resolve(a[2] ?? 'data/work/esum-scan-status.json'), known)
  if (r) console.log(`esum: ${Object.keys(r.entries).length} headwords (${r.known} VESUM lemmas)`, JSON.stringify(Object.fromEntries(Object.entries(r.stats).map(([k, s]) => [k, s.passRate]))))
}
