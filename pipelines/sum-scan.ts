/**
 * SPEC 63 GG-7: parses the owner's scans of СУМ-11 (DjVu) and СУМ-20 (PDF) into the policy fields and feeds the licensed-dump import.
 * Usage: tsx pipelines/sum-scan.ts <sum11|sum20> [books dir] [out dir] [--vol N]
 *   books dir  default $BOOKS/<dict> or ~/work/books/<dict>   (files sum11_tNN.djvu / sum20_tNN.pdf)      out dir  default data/work/<dict>-parsed
 * Per volume: text layer by `djvutxt` / `pdftotext` (held in memory, NEVER written to disk), parse (core/sum11-parse.ts, core/sum20-parse.ts), <out>/tNN.jsonl (policy fields only) + tNN.stats.json.
 * Resumable (RS-1): a volume whose stats file records the same source size is skipped; every file is written to a temp name and renamed. Then <out>/all.jsonl is rebuilt and imported with
 * pipelines/sum-import.ts (data/work/se-parsed/<dict>.json, which the build reads), and <out>/summary.json holds the per-volume pass rates. FULL_SENSES_* stay 0 unless set.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { parseSum11 } from '../core/sum11-parse.ts'
import { parseSum20 } from '../core/sum20-parse.ts'
import { passRate, type SumStats } from '../core/sum-article.ts'
import { SUM_DICTS, type SumArticleIn, type SumDict } from '../core/sum-import.ts'
import { runSumImport } from './sum-import.ts'
import { writeJsonAtomic } from './robust.ts'


export function textOf(dict: SumDict, file: string): string {
  const out = dict === 'sum11' ? execFileSync('djvutxt', [file], { maxBuffer: 1 << 30 }) : execFileSync('pdftotext', ['-enc', 'UTF-8', file, '-'], { maxBuffer: 1 << 30 })
  return out.toString('utf8')
}

export function runSumScan(dict: SumDict, booksDir: string, outDir: string, only?: number): { vols: Record<string, { stats: SumStats; passRate: number }>; articles: number } {
  mkdirSync(outDir, { recursive: true })
  const ext = dict === 'sum11' ? 'djvu' : 'pdf', re = new RegExp(`^${dict}_t(\\d\\d)\\.${ext}$`)
  const vols: Record<string, { stats: SumStats; passRate: number }> = {}
  for (const f of readdirSync(booksDir).sort()) {
    const m = re.exec(f); if (!m) continue
    const vol = Number(m[1]); if (only !== undefined && vol !== only) continue
    const src = resolve(booksDir, f), size = statSync(src).size, jl = resolve(outDir, `t${m[1]}.jsonl`), sf = resolve(outDir, `t${m[1]}.stats.json`)
    if (existsSync(jl) && existsSync(sf)) {
      try { const j = JSON.parse(readFileSync(sf, 'utf8')) as { srcSize: number; stats: SumStats }; if (j.srcSize === size) { vols[m[1]!] = { stats: j.stats, passRate: passRate(j.stats) }; console.log(`skip t${m[1]} (done)`); continue } } catch { /* torn: redo */ }
    }
    const t0 = Date.now(), r = (dict === 'sum11' ? parseSum11 : parseSum20)(textOf(dict, src), vol)
    const lines = (r.articles as SumArticleIn[]).map(a => JSON.stringify(a)).join('\n')
    writeJsonAtomic(jl, lines ? lines + '\n' : '')
    writeJsonAtomic(sf, JSON.stringify({ srcSize: size, stats: r.stats, passRate: passRate(r.stats) }))
    vols[m[1]!] = { stats: r.stats, passRate: passRate(r.stats) }
    console.log(`t${m[1]}: ${r.stats.pages} pages, ${r.stats.entries} entries, ${r.stats.senses} senses, pass rate ${passRate(r.stats)} (${Math.round((Date.now() - t0) / 1000)} s)`)
  }
  const files = readdirSync(outDir).filter(f => /^t\d\d\.jsonl$/.test(f)).sort()
  writeJsonAtomic(resolve(outDir, 'all.jsonl'), files.map(f => readFileSync(resolve(outDir, f), 'utf8')).join(''))
  const articles = files.reduce((n, f) => n + readFileSync(resolve(outDir, f), 'utf8').split('\n').filter(Boolean).length, 0)
  writeJsonAtomic(resolve(outDir, 'summary.json'), JSON.stringify({ dict, articles, vols }, null, 1))
  return { vols, articles }
}

if (process.argv[1] && /sum-scan\.ts$/.test(process.argv[1].replaceAll('\\', '/'))) {
  const a = process.argv.slice(2), vi = a.indexOf('--vol'), only = vi >= 0 ? Number(a[vi + 1]) : undefined
  const pos = a.filter((x, i) => !x.startsWith('--') && i !== vi + 1), dict = pos[0] as SumDict
  if (!SUM_DICTS.includes(dict)) { console.error('usage: tsx pipelines/sum-scan.ts <sum11|sum20> [books dir] [out dir] [--vol N]'); process.exit(2) }
  const books = resolve(pos[1] ?? resolve(process.env.BOOKS ?? resolve(homedir(), 'work/books'), dict)), out = resolve(pos[2] ?? `data/work/${dict}-parsed`)
  const r = runSumScan(dict, books, out, only)
  console.log(`${dict}: ${r.articles} articles from ${Object.keys(r.vols).length} volumes`)
  if (only === undefined) runSumImport(dict, resolve(out, 'all.jsonl'), resolve('data/work/se-parsed'))
}
