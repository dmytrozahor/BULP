/**
 * SPEC 63 SE-17: the four owner-supplied scans of the fifth set → work files. The OCR / text layers stay outside git: `SE17_OCR` (default data/raw/se17-ocr, gitignored) holds
 * e1 (Закревський, public domain), e2 (Верхратський, public domain), e3 (Караванський, ©), e4 (Говірки Західної Полтавщини, ©) / page_NNNN.txt. Absent input → each missing book is skipped, no error.
 *  - e3 Караванський: the FULL parse goes to data/work/se17-private/karavansky-full.json (never published); the published file data/work/karavansky-links.json holds only the word-to-word links
 *    of the owner's option (b) (≤ 5 per headword, VESUM lemmas of the same POS, mutual first, no labels / examples, dictionary + spread cited). KARAVANSKY_PUBLISH=0 switches the links off.
 * Crash tolerance (RS-1): idempotent, atomic writes, the output records the input sizes.
 * Usage: tsx pipelines/se17-scan.ts [ocr dir] [books: e1,e2,e3,e4]
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { KAR_DICT, KAR_SHORT, newKarStats, parseKaravansky, selectKarLinks, allPairs, type KarPage, type KarRow } from '../core/se17-karavansky.ts'
import { stageVesum } from './build-corr.ts'
import { newZakStats, parseZakrevsky, zakSeRows, ZAK_DICT, type ZakPage, type ZakStats } from '../core/se17-zakrevsky.ts'
import { LEM_DICT, lemSeRow, newLemStats, parseVerkhratsky, type LemPage, type LemStats } from '../core/se17-lemko.ts'
import { POLT_DICT, poltCandidates, poltSeRow, readPolt } from '../core/se17-poltava.ts'
import { corrRowsOf } from './se15-scan.ts'
import type { SeRow } from '../core/se.ts'
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

// ── e1 Закревський (public domain) ──────────────────────────────────────────────────────────────
export function runZakrevsky(ocr: string, outDir: string): { entries: number; rows: number; stats: ZakStats } | undefined {
  const d = resolve(ocr, 'e1'); const files = pageFiles(d)
  if (!files.length) { console.log(`se17-scan: ${d} absent, Закревський skipped`); return undefined }
  const pages: ZakPage[] = []; let size = 0
  for (const { f, i } of files) { if (i < 12 || i > 376) continue; size += statSync(resolve(d, f)).size; pages.push({ text: readFileSync(resolve(d, f), 'utf8'), no: i }) }
  const st = newZakStats(), zr = parseZakrevsky(pages, st), rows = zr.flatMap(zakSeRows)
  mkdirSync(outDir, { recursive: true })
  writeJsonAtomic(resolve(outDir, 'zakrevsky-scan.json'), JSON.stringify({ id: 'zakrevsky-scan', dict: ZAK_DICT, kind: 'zakrevsky', full: true, srcBytes: size, stats: st, rows, ptrs: [] }))
  const stale = resolve(outDir, 'bandurista3.json'); if (existsSync(stale)) rmSync(stale)   // the archive.org OCR parse of the same book: replaced by the scan's
  return { entries: zr.length, rows: rows.length, stats: st }
}

// ── e2 Верхратський (public domain) ─────────────────────────────────────────────────────────────
export async function runVerkhratsky(ocr: string, outDir: string): Promise<{ entries: number; rows: number; wordLevel: number; stats: LemStats } | undefined> {
  const d = resolve(ocr, 'e2'); const files = pageFiles(d)
  if (!files.length) { console.log(`se17-scan: ${d} absent, Верхратський skipped`); return undefined }
  const pages: LemPage[] = []; let size = 0
  for (const { f, i } of files) { if (i < 390 || i > 487) continue; size += statSync(resolve(d, f)).size; pages.push({ text: readFileSync(resolve(d, f), 'utf8'), no: i }) }
  const st = newLemStats(), lr = parseVerkhratsky(pages, st)
  let known: (w: string) => boolean = () => true
  if (existsSync(resolve('data/raw/vesum'))) { const { vesumVerifier } = await import('./parse-hist-lex.ts'); known = await vesumVerifier([...new Set([...lr.map(r => r.head), ...lr.flatMap(r => r.gloss.split(/[\s,;.]+/))])].filter(Boolean)) }
  // a gloss is shown only when ALL of its words (≥ 3 letters, at most 10) are VESUM words (the German tail the OCR reads as Cyrillic is not)
  for (const r of lr) if (!r.oq) { const ws = r.gloss.split(/[\s,;.„“"]+/).filter(w => w.length >= 3); if (!ws.length || ws.filter(known).length < ws.length || ws.length > 10 || !ws.some(w => w.length >= 5)) { r.oq = true; st.garbled++ } }
  let wl = 0; const rows: [string, SeRow][] = lr.map(r => { const w = !known(r.head); if (w) wl++; return lemSeRow(r, w) })
  mkdirSync(resolve(outDir, '..', 'corr-extra'), { recursive: true })
  writeJsonAtomic(resolve(outDir, `${LEM_DICT}.json`), JSON.stringify({ id: LEM_DICT, dict: LEM_DICT, kind: 'dialect-licensed', full: true, srcBytes: size, stats: st, rows }))
  writeJsonAtomic(resolve(outDir, '..', 'corr-extra', `se17-${LEM_DICT}.json`), JSON.stringify({ rows: corrRowsOf(LEM_DICT, rows) }))   // CR-1 hook (word-level rows with a one-word gloss)
  return { entries: lr.length, rows: rows.length, wordLevel: wl, stats: st }
}

// ── e4 Говірки Західної Полтавщини (©) ──────────────────────────────────────────────────────────
export async function runPoltava(ocr: string, outDir: string): Promise<Record<string, number> | undefined> {
  const d = resolve(ocr, 'e4'); const files = pageFiles(d)
  if (!files.length) { console.log(`se17-scan: ${d} absent, Полтавщина skipped`); return undefined }
  if (!existsSync(resolve('data/raw/vesum'))) { console.log('se17-scan: VESUM absent, Полтавщина skipped'); return undefined }
  const pages: { text: string; no: number }[] = []; let size = 0
  for (const { f, i } of files) { if (i < 25) continue; size += statSync(resolve(d, f)).size; pages.push({ text: readFileSync(resolve(d, f), 'utf8'), no: i }) }
  const st = { pages: 0, villages: 0, tokens: 0, normalised: 0, informantLines: 0 }, { villages, toks } = readPolt(pages, st)
  const forms = new Set<string>(); for (const t of toks) for (const c of poltCandidates(t.norm.word)) forms.add(c)
  const { vesumIndex } = await import('./vesum.ts'), ix = await vesumIndex(forms, new Set())
  const rows = new Map<string, SeRow>(); let confirmed = 0, departures = 0, stressed = 0
  for (const t of toks) {
    if (t.norm.word.length < 3) continue
    const c = poltCandidates(t.norm.word).find(x => ix.hits.has(x)); if (!c) continue
    confirmed++
    const dep = c !== t.norm.word, hasStress = t.norm.stress !== undefined
    if (dep) departures++; if (hasStress) stressed++
    if (!dep && !hasStress) continue   // a form that is itself standard and carries no stress mark is no evidence of the speech
    const lemma = ix.hits.get(c)![0]!.lemma.toLowerCase(), prev = rows.get(lemma)
    if (prev && (prev.a?.includes('́') || !hasStress)) continue
    rows.set(lemma, poltSeRow(t, t.page))
  }
  mkdirSync(outDir, { recursive: true })
  const out = [...rows].sort((a, b) => (a[0] < b[0] ? -1 : 1))
  writeJsonAtomic(resolve(outDir, `${POLT_DICT}.json`), JSON.stringify({ id: POLT_DICT, dict: POLT_DICT, kind: 'dialect-licensed', full: false, srcBytes: size, stats: { ...st, confirmed, departures, stressed, lemmas: out.length, villages: villages.map(v => v.name) }, rows: out }))
  return { ...st, confirmed, departures, stressed, lemmas: out.length }
}

if (process.argv[1] && /se17-scan\.ts$/.test(process.argv[1].replaceAll(String.fromCharCode(92), '/'))) {
  const a = process.argv.slice(2), ocr = resolve(a[0] ?? process.env.SE17_OCR ?? 'data/raw/se17-ocr'), work = resolve('data/work'), outDir = resolve(work, 'se-parsed')
  const books = (a[1] ?? 'e1,e2,e3,e4').split(',')
  if (!existsSync(ocr)) { console.log(`se17-scan: ${ocr} absent, nothing to do`); process.exit(0) }
  mkdirSync(work, { recursive: true })
  if (books.includes('e1')) console.log('e1 Закревський', JSON.stringify(runZakrevsky(ocr, outDir)))
  if (books.includes('e2')) console.log('e2 Верхратський', JSON.stringify(await runVerkhratsky(ocr, outDir)))
  if (books.includes('e3')) await runKaravansky(ocr, work)
  if (books.includes('e4')) console.log('e4 Полтавщина', JSON.stringify(await runPoltava(ocr, outDir)))
}
