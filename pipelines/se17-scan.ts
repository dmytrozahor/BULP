/**
 * SPEC 63 SE-17: the four owner-supplied scans of the fifth set → work files. The OCR / text layers stay outside git: `SE17_OCR` (default data/raw/se17-ocr, gitignored) holds
 * e1 (Закревський, public domain), e2 (Верхратський, public domain), e3 (Караванський, ©), e4 (Говірки Західної Полтавщини, ©) / page_NNNN.txt. Absent input → each missing book is skipped, no error.
 *  - e3 Караванський: the FULL parse goes to data/work/se17-private/karavansky-full.json (never published); the published file data/work/karavansky-links.json holds only the word-to-word links
 *    of the owner's option (b) (≤ 5 per headword, VESUM lemmas of the same POS, mutual first, no labels / examples, dictionary + spread cited). KARAVANSKY_PUBLISH=0 switches the links off.
 * Crash tolerance (RS-1): idempotent, atomic writes, the output records the input sizes.
 * Usage: tsx pipelines/se17-scan.ts [ocr dir] [books: e1,e2,e3,e4]
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { KAR_DICT, KAR_SHORT, newKarStats, parseKaravansky, selectKarLinks, allPairs, type KarPage, type KarRow } from '../core/se17-karavansky.ts'
import { stageVesum } from './build-corr.ts'
import { plain } from '../core/corr.ts'
import { writeJsonAtomic } from './robust.ts'

export const KARAVANSKY_PUBLISH = (): boolean => process.env.KARAVANSKY_PUBLISH !== '0'
const pageFiles = (dir: string): { f: string; i: number }[] => (existsSync(dir) ? readdirSync(dir).filter(f => /^page_\d{4}\.txt$/.test(f)).sort().map(f => ({ f, i: Number(f.slice(5, 9)) })) : [])

export async function runKaravansky(ocr: string, work: string): Promise<{ rows: number; links: number; stats: unknown } | undefined> {
  const d = resolve(ocr, 'e3'); const files = pageFiles(d)
  if (!files.length) { console.log(`se17-scan: ${d} absent, Караванський skipped`); return undefined }
  const pages: KarPage[] = []; let size = 0
  for (const { f, i } of files) { if (i < 6 || i > 236) continue; size += statSync(resolve(d, f)).size; pages.push({ text: readFileSync(resolve(d, f), 'utf8'), no: i }) }
  const st = newKarStats(), rows: KarRow[] = parseKaravansky(pages, st)
  mkdirSync(resolve(work, 'se17-private'), { recursive: true })
  writeJsonAtomic(resolve(work, 'se17-private/karavansky-full.json'), JSON.stringify({ id: KAR_DICT, srcSize: size, stats: st, rows }))   // © full parse: private
  const vesum = await stageVesum()
  if (!vesum) { console.log('se17-scan: VESUM absent, no links'); return { rows: rows.length, links: 0, stats: st } }
  const posOf = (w: string) => vesum.get(plain(w))?.cls
  const { links, stats } = selectKarLinks(rows, posOf, 5)
  const pairs = allPairs(rows); let nPairs = 0; for (const s of pairs.values()) nPairs += s.size
  const out = { id: KAR_DICT, short: KAR_SHORT, srcSize: size, publish: KARAVANSKY_PUBLISH(), stats: { parse: st, links: stats, headwordsWithSeries: pairs.size, directedPairs: nPairs }, links: KARAVANSKY_PUBLISH() ? links : [] }
  writeJsonAtomic(resolve(work, 'karavansky-links.json'), JSON.stringify(out))
  console.log(JSON.stringify(out.stats))
  return { rows: rows.length, links: links.length, stats: out.stats }
}

if (process.argv[1] && /se17-scan\.ts$/.test(process.argv[1].replaceAll(String.fromCharCode(92), '/'))) {
  const a = process.argv.slice(2), ocr = resolve(a[0] ?? process.env.SE17_OCR ?? 'data/raw/se17-ocr'), work = resolve('data/work')
  const books = (a[1] ?? 'e1,e2,e3,e4').split(',')
  if (!existsSync(ocr)) { console.log(`se17-scan: ${ocr} absent, nothing to do`); process.exit(0) }
  mkdirSync(work, { recursive: true })
  if (books.includes('e3')) await runKaravansky(ocr, work)
}
