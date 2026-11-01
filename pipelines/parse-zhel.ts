/**
 * SPEC 63 SE-13: Желехівський–Недільський 1886 (archive.org zhelekhivsk1/2, harvest/zhelekhivsky.ts) -> data/work/zhel-parsed.json, read by build.ts (attested spellings, sense rows) and build-labels.ts.
 *   npx tsx pipelines/parse-zhel.ts [harvestDir] [outFile]
 * Gates and decoding: core/zhel.ts. The German vocabulary for the gloss gate is taken from the clean r2u rows of the same dictionary (data/work/r2u-rows.json, dict 21); without it no gloss is kept.
 * RS-1: idempotent (an output whose `srcBytes` equals the size of the current input is kept), tmp + rename; a missing input is reported, not an error.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { lk } from '../core/cv.ts'
import { germanVocab, parseVolume, type ZhelArticle, type ZhelPagesIn, type ZhelStats } from '../core/zhel.ts'
import { ZHEL_PRINT_LABELS, scanArticle } from '../core/dict-labels.ts'
import { writeJsonAtomic } from './robust.ts'

/** a label counts for the article's headword only if no other headword («Вшиткий, a.») stands between the start of the article and the label (the OCR often runs two articles into one line) */
export function ownLabels(t: string): [string, string][] {
  return scanArticle(ZHEL_PRINT_LABELS, t).flatMap(h => {
    const at = t.indexOf(h.quote.slice(0, 30)); const before = at < 0 ? '' : t.slice(0, at + Math.min(40, h.quote.length))
    return (/[.;\])]\s+[А-ЯІЇЄҐ][а-яіїєґ'’]+\s*,/.test(before) || [...before.matchAll(/\p{Lu}[\p{L}' ]{2,20},\s*(?:[aа]|[mтш]|[fж/]|[nп]|[VvУу]\.?\s?[аaпn])\s?\./gu)].some(m => m.index! > 4)) ? [] : [[h.row.abbr, h.quote.slice(0, 160)] as [string, string]]   // a match at the very start is the article's own headword
  })
}
export interface ZhelParsed { format: 1; srcBytes: number; stats: Record<string, ZhelStats>; total: ZhelStats; articles: ZhelArticle[] }
const payload = (dir: string, id: string): Buffer | undefined => {
  const idx = resolve(dir, 'index.jsonl'); if (!existsSync(idx)) return undefined
  for (const l of readFileSync(idx, 'utf8').split('\n').reverse()) {
    if (!l) continue
    let it: { id?: string; file?: string; status?: number }; try { it = JSON.parse(l) } catch { continue }
    if (it.id === id && it.status === 200 && it.file) { const p = resolve(dir, 'items', it.file + '.gz'); return existsSync(p) ? gunzipSync(readFileSync(p)) : undefined }
  }
  return undefined
}
export async function parseZhel(harvestDir: string, outFile: string, root = '.'): Promise<ZhelParsed | undefined> {
  const dir = resolve(harvestDir, 'ia-zhelekhivsky')
  const vols = ([1, 2] as const).map(v => ({ v, text: payload(dir, `zhel:zhelekhivsk${v}`)?.toString('utf8'), pg: payload(dir, `zhel:zhelekhivsk${v}:pages2`)?.toString('utf8') }))
  if (vols.some(x => !x.text || !x.pg)) { console.warn('zhel: harvest incomplete (harvest/zhelekhivsky.ts), no rows'); return undefined }
  const srcBytes = vols.reduce((n, x) => n + Buffer.byteLength(x.text!), 0)
  if (existsSync(outFile)) { try { const j = JSON.parse(readFileSync(outFile, 'utf8')) as ZhelParsed; if (j.srcBytes === srcBytes && j.format === 1) return j } catch { /* torn: reparse */ } }
  const { vesumLemmaList } = await import('./vesum.ts')
  const lemmas = await vesumLemmaList(), isLemma = (m: string) => lemmas.has(lk(m))
  const rp = resolve(root, 'data/work/r2u-rows.json')
  const vocab = existsSync(rp) ? germanVocab((JSON.parse(readFileSync(rp, 'utf8')) as { rows: { dict: number; text: string }[] }).rows.filter(r => r.dict === 21).map(r => r.text)) : undefined
  if (!vocab) console.warn('zhel: data/work/r2u-rows.json is missing, no German gloss is kept')
  const labels = (t: string): [string, string][] => ownLabels(t)
  const articles: ZhelArticle[] = [], stats: Record<string, ZhelStats> = {}
  for (const x of vols) {
    const r = parseVolume(x.text!, x.v, JSON.parse(x.pg!) as ZhelPagesIn, { isLemma, vocab, labels })
    articles.push(...r.articles); stats[`т. ${x.v}`] = r.stats
  }
  const total: ZhelStats = { candidates: 0, kept: 0, keptLinked: 0, withStress: 0, withPos: 0, withGloss: 0, rejected: {} }
  for (const s of Object.values(stats)) { for (const k of ['candidates', 'kept', 'keptLinked', 'withStress', 'withPos', 'withGloss'] as const) total[k] += s[k]; for (const [k, n] of Object.entries(s.rejected)) total.rejected[k] = (total.rejected[k] ?? 0) + n }
  const out: ZhelParsed = { format: 1, srcBytes, stats, total, articles }
  writeJsonAtomic(outFile, JSON.stringify(out))
  return out
}
if (process.argv[1] && /parse-zhel\.ts$/.test(process.argv[1].split(String.fromCharCode(92)).join('/'))) {
  const r = await parseZhel(resolve(process.argv[2] ?? 'data/raw/harvest'), resolve(process.argv[3] ?? 'data/work/zhel-parsed.json'), process.env.ZHEL_ROOT ?? '.')
  if (r) { const t = r.total; console.log(`zhel (SE-13): ${t.candidates} candidate articles, kept ${t.kept} (linked ${t.keptLinked}, stress ${t.withStress}, POS ${t.withPos}, German gloss ${t.withGloss}), rejected ${t.candidates - t.kept} (${(100 * (t.candidates - t.kept) / t.candidates).toFixed(1)} %): ${JSON.stringify(t.rejected)}`) }
}
