/**
 * SPEC 63 GG: reads the headwords of the historical dictionaries for core/dx-hist.ts.
 *  - r2u: data/work/r2u-rows.json (pipelines/ingest-r2u.ts): the Ukrainian side of every stored article (headwords of the Ukrainian-headword dictionaries, the quoted Ukrainian
 *    equivalents of the Russian-headword ones — the same words the dictionary witnesses carry);
 *  - SE-11: data/work/se-parsed/<archive id>.json (pipelines/parse-se-dicts.ts): the headword of every article that passed the OCR gate.
 * A missing file is no error (the sources are optional and arrive by sync); the corpus counter is built by the caller from its token types.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { HistHead } from '../core/dx-hist.ts'
import { r2uDictById } from './r2u.ts'
import { tokenRaw } from './ingest-r2u.ts'

export function r2uHeads(root: string): HistHead[] {
  const p = resolve(root, 'data/work/r2u-rows.json'); if (!existsSync(p)) return []
  const rows = (JSON.parse(readFileSync(p, 'utf8')) as { rows: { dict: number; head: string[]; eq: string[] }[] }).rows, out: HistHead[] = []
  for (const r of rows) {
    const d = r2uDictById[r.dict]; if (!d) continue
    for (const f of new Set((d.dir === 'ru-uk' ? r.eq : r.head).map(tokenRaw))) out.push({ word: f, src: d.unitId })
  }
  return out
}

export function seHeads(root: string, dir0 = resolve(root, 'data/work/se-parsed')): HistHead[] {
  const dir = dir0; if (!existsSync(dir)) return []
  const out: HistHead[] = []
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith('.json')) continue
    let j: { dict: string; rows: [string, unknown][] }; try { j = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) } catch { continue }   // torn output: skipped
    for (const h of new Set(j.rows.filter(r => !(r[1] as { unv?: number })?.unv).map(r => r[0]))) out.push({ word: h, src: j.dict })
  }
  return out
}

export const histHeads = (root: string): HistHead[] => [...r2uHeads(root), ...seHeads(root)]
