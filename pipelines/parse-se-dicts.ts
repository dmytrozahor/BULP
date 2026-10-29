/**
 * SPEC 63 SE-11: parse the OCR text of the historical dictionaries (harvest/se-dicts.ts → data/raw/harvest/se-dicts/items/*.gz) into dated sense rows.
 *   npx tsx pipelines/parse-se-dicts.ts [harvestDir] [outDir]     (npm run parse:se)
 * Output: data/work/se-parsed/<archive id>.json = { id, dict, kind, srcBytes, stats, rows: [headword, SeRow][] }, and analysis/se-parse.md (pass rates, projected rows per epoch).
 * Where it runs: on the machine that holds the OCR text. The harvester box finishes `se-dicts.ts`; the parse is a pure CPU pass of seconds per dictionary, run (a) on the worker as part of ingest
 * (the harvest dump is synced there like the other harvests) and (b) optionally on the box by the last step of harvest/se-chain.sh. The build stage `senses` reads data/work/se-parsed.
 * RS-1: resumable and idempotent: an output whose `srcBytes` equals the size of the current OCR payload is kept; every output is written tmp + rename; a missing payload is skipped, not an error.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { PARSE_SPECS, parseDictionary, siglaDates, type ParseKind, type ParseStats } from '../core/se-parse.ts'
import { atOf, epochsOf, SE_EPOCH_IDS, type SeRow } from '../core/se.ts'
import { writeJsonAtomic } from './robust.ts'
import type { Ptr } from '../core/xref.ts'

/** archive.org id of the harvest → parser kind (ISUJa is the second scan of Тимченко, kept for OCR comparison, not parsed twice) */
export const PARSE_IDS: Record<string, ParseKind> = {
  tymch1930: 'timchenko', '1.2.1932': 'timchenko', slovnyk33: 'bn', bandurista3: 'zakrevsky', 'SUM-28': 'sum16', 'SUM-28_2': 'sum16', kniga1: 'materials', kniga2: 'materials',
  '1_20230624_20230624': 'shevchenko', '2_20230624_202306': 'shevchenko',
}
interface IndexLine { id: string; file?: string; bytes?: number; status?: number }
export interface Parsed { id: string; dict: string; kind: ParseKind; srcBytes: number; stats: ParseStats; rows: [string, SeRow][]; /** GG-18: cross-reference entries (headword → target), absent in files made before it */ ptrs?: Ptr[] }

export function readPayloads(harvestDir: string): Map<string, string> {
  const idx = resolve(harvestDir, 'index.jsonl'), out = new Map<string, string>()
  if (!existsSync(idx)) return out
  for (const l of readFileSync(idx, 'utf8').split('\n')) {
    if (!l) continue
    let it: IndexLine; try { it = JSON.parse(l) } catch { continue }   // torn last line after a kill
    if (!it.file || it.status !== 200 || !(it.id in PARSE_IDS)) continue
    const p = resolve(harvestDir, 'items', it.file + '.gz')
    if (existsSync(p)) out.set(it.id, gunzipSync(readFileSync(p)).toString('utf8'))
  }
  return out
}

export function parseAll(harvestDir: string, outDir: string): { parsed: Parsed[]; reused: string[] } {
  mkdirSync(outDir, { recursive: true })
  const parsed: Parsed[] = [], reused: string[] = []
  for (const [id, text] of readPayloads(harvestDir)) {
    const kind = PARSE_IDS[id]!, spec = PARSE_SPECS[kind], file = resolve(outDir, id.replace(/[^\w.-]/g, '_') + '.json'), srcBytes = Buffer.byteLength(text)
    if (existsSync(file)) { try { const j = JSON.parse(readFileSync(file, 'utf8')) as Parsed; if (j.srcBytes === srcBytes && j.ptrs) { parsed.push(j); reused.push(id); continue } } catch { /* torn: reparse */ } }
    const siglaYears = kind === 'timchenko' || kind === 'materials' ? siglaDates(text) : new Map<string, number>()
    const r = parseDictionary(spec, text, siglaYears)
    const p: Parsed = { id, dict: spec.dict, kind, srcBytes, stats: r.stats, rows: r.rows, ptrs: r.ptrs }
    writeJsonAtomic(file, JSON.stringify(p)); parsed.push(p)
  }
  return { parsed, reused }
}

/** the markdown report: per-dictionary pass rate, and the rows per Shevelov epoch (dated by a quotation vs. only by the coverage period) */
export function report(parsed: Parsed[], reused: string[] = []): string {
  const head = '| item | dictionary | candidates | cross-refs | pointers kept (GG-18) | passed | skipped (OCR score) | skipped (headword) | skipped (no sense) | pass rate | rows | dated |\n|---|---|---|---|---|---|---|---|---|---|---|---|'
  const lines = parsed.map(p => `| ${p.id} | ${p.dict} | ${p.stats.candidates} | ${p.stats.crossRefs} | ${p.stats.pointers ?? p.ptrs?.length ?? 0} | ${p.stats.passed} | ${p.stats.skippedScore} | ${p.stats.skippedHead} | ${p.stats.skippedNoSense} | ${(p.stats.passRate * 100).toFixed(1)} % | ${p.stats.rows} | ${p.stats.dated} |`)
  const ep: Record<string, { dated: number; period: number }> = Object.fromEntries(SE_EPOCH_IDS.map(e => [e, { dated: 0, period: 0 }]))
  for (const p of parsed) for (const [, r] of p.rows) { const pl = epochsOf(atOf(r)); for (const id of pl.ids) ep[id]![r.e ? 'dated' : 'period']++ }
  const epLines = SE_EPOCH_IDS.map(e => `| ${e} | ${ep[e]!.dated} | ${ep[e]!.period} |`)
  return ['# Historical-dictionary parse (SPEC 63 SE-11)', '', `Generated ${new Date().toISOString().slice(0, 10)} by \`npm run parse:se\` (pipelines/parse-se-dicts.ts); do not edit. Reused unchanged: ${reused.length}.`, '',
    'Pass rate = passed / (candidate articles − cross-references). An article is skipped when its OCR score is below the dictionary threshold or its headword does not look like a word; nothing garbled is emitted. A headword is only a key: the build attaches a row to an existing card.', '',
    head, ...lines, '', 'Rows per Shevelov epoch, one count per (headword spelling, sense, epoch bucket). «dated» = the date of a quotation (year, century label); «period» = only the coverage period of the dictionary (the card labels it «період», with «?» where it spans epochs).', '',
    '| epoch | dated by a quotation | by the coverage period only |', '|---|---|---|', ...epLines, ''].join('\n')
}

if (process.argv[1] && /parse-se-dicts\.ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  const hv = resolve(process.argv[2] ?? 'data/raw/harvest/se-dicts'), out = resolve(process.argv[3] ?? 'data/work/se-parsed')
  const r = parseAll(hv, out), md = report(r.parsed, r.reused)
  mkdirSync('analysis', { recursive: true }); writeJsonAtomic('analysis/se-parse.md', md); console.log(md)
}
