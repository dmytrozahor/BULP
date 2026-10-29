/**
 * SPEC 63 SRC-28 — owner-supplied sources (photos / page scans) as witnesses. Two input shapes, chosen by what exists:
 *  1. a COMMITTED transcription `pipelines/src-owner-<unit id>.tsv` (loc \t text; `#` lines are comments): the song of the 1690s songbook. Brackets `[?]` / `[...]` mark uncertain or
 *     illegible readings and are cut before tokenising; a token with a Latin letter or a digit is dropped like every OCR garbage token.
 *  2. a directory of Tesseract page files `data/raw/owner-ocr/<unit id>/page_NNNN.txt` (synced from the worker, `OWNER_OCR_DIR` overrides): Калліст 1616. Not proofread: the witness type is `ocr`,
 *     so the OQ gate (core/ocr-quality.ts) decides what it may set.
 * When neither exists the unit yields no witness (the OCR arrives by sync; nothing is invented).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Ingester } from './ingest.ts'
import type { Unit } from './manifest.ts'
import type { TokenRec, WitnessOut } from '../core/types.ts'
import { textTokens } from './ingest-harvest.ts'
import { witnessOf } from './ingest-torot.ts'

/** OWNER_OCR_DIR (exclusive when set), else data/raw/owner-ocr, else the worker's ~/work/ocr (where the OCR was run): the first root that holds the unit's directory */
export const ownerOcrDir = (id: string) => {
  const roots = [process.env.OWNER_OCR_DIR, 'data/raw/owner-ocr', resolve(process.env.HOME ?? process.env.USERPROFILE ?? '.', 'work/ocr')].filter(Boolean) as string[]
  return resolve(roots.find(r => existsSync(resolve(r, id))) ?? roots[0]!, id)
}
/** cut the transcriber's brackets: «ин(ыи)» keeps its text, «[?]» and «[...]» vanish */
export const cleanTranscription = (s: string): string => s.replace(/\[(?:\?|\.{3}|…)\]/g, ' ').replace(/\(\?\)/g, ' ').replace(/[()[\]]/g, '')

export function parseTsv(tsv: string): { loc: string; text: string }[] {
  return tsv.split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => { const [loc, ...t] = l.split('\t'); return { loc: loc!, text: t.join('\t') } })
}
export function tsvTokens(rows: { loc: string; text: string }[]): { tokens: TokenRec[]; unmapped: number; apparatus: number } {
  const tokens: TokenRec[] = []; let unmapped = 0, apparatus = 0, s = 0
  for (const r of rows) { const t = textTokens(cleanTranscription(r.text), r.loc, true); for (const k of t.tokens) tokens.push({ ...k, s }); unmapped += t.unmapped; apparatus += t.apparatus; s++ }
  return { tokens, unmapped, apparatus }
}
export function ocrPages(dir: string): { page: number; text: string }[] {
  return readdirSync(dir).filter(f => /^page_\d+\.txt$/.test(f)).sort().map(f => ({ page: +f.slice(5, 9), text: readFileSync(resolve(dir, f), 'utf8') }))
}
export function ocrTokens(pages: { page: number; text: string }[], title: string): { tokens: TokenRec[]; unmapped: number; apparatus: number } {
  const tokens: TokenRec[] = []; let unmapped = 0, apparatus = 0, s = 0
  for (const p of pages) { const t = textTokens(p.text, `${title}, скан ${p.page} (OCR)`, true); for (const k of t.tokens) tokens.push({ ...k, s: s + k.s }); s += t.tokens.length ? Math.max(...t.tokens.map(k => k.s)) + 1 : 0; unmapped += t.unmapped; apparatus += t.apparatus }
  return { tokens, unmapped, apparatus }
}

export default {
  parse(u: Unit): WitnessOut[] {
    const tsv = new URL(`./src-owner-${u.id}.tsv`, import.meta.url)
    let r: { tokens: TokenRec[]; unmapped: number; apparatus: number }
    if (existsSync(tsv)) r = tsvTokens(parseTsv(readFileSync(tsv, 'utf8')))
    else if (existsSync(ownerOcrDir(u.id))) r = ocrTokens(ocrPages(ownerOcrDir(u.id)), u.title.split(' (')[0]!)
    else { console.warn(`${u.id}: no transcription and no OCR directory (${ownerOcrDir(u.id)}): skipped`); return [] }
    console.log(`${u.id}: ${r.tokens.length} tokens (${r.unmapped} unmapped, ${r.apparatus} apparatus)`)
    return [witnessOf(u, r.tokens, { dropped: { unmapped: r.unmapped, apparatus: r.apparatus }, ...(u.school ? { school: u.school } : {}) })]
  },
} satisfies Ingester
