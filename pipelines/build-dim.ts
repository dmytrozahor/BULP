/**
 * BUILD step MM-23: diminutive / endearing / augmentative / intensive derivative → base lemma links (core/dim-links.ts) → public/data/dim.json (split into lm/dim/<bucket>.json by build-parts).
 * Sources: the parsed СУМ-11 / СУМ-20 glosses (data/work/se-parsed/<dict>.json, written by pipelines/sum-import.ts: the gloss already holds «Зменш.-пестл. до тонкий», the row holds volume / page)
 * and the en.wiktionary sense lines of the kaikki dump (data/raw/kaikki/uk.jsonl). A link is kept when the derivative or the base is a card of the lexicon.
 */
import { createReadStream, existsSync, readdirSync, readFileSync } from 'node:fs'
import { writeJsonAtomic } from './robust.ts'
import { createInterface } from 'node:readline'
import { resolve } from 'node:path'
import { addDim, parseSumRel, parseWiktRel, type DimEntry, type DimFile, type DimSrcId } from '../core/dim-links.ts'
import type { SeRow } from '../core/se.ts'

const lk = (s: string) => s.normalize('NFC').replace(/[\u0301]/g, '').toLowerCase()

export function sumLinks(root: string, keep: (l: string) => boolean, into: Map<string, DimEntry>): { files: number; rows: number; links: number } {
  const dir = resolve(root, 'data/work/se-parsed'); let files = 0, rows = 0, links = 0
  if (!existsSync(dir)) return { files, rows, links }
  for (const f of readdirSync(dir).filter(x => x.endsWith('.json')).sort()) {
    let j: { id?: string; dict?: string; rows: [string, SeRow][] }
    try { j = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) } catch { continue }   // a torn file is ignored (RS-1)
    const src = (j.dict ?? j.id ?? f.replace(/\.json$/, '')) as string
    if (src !== 'sum11' && src !== 'sum20') continue
    files++
    for (const [head, row] of j.rows) {
      rows++
      const r = parseSumRel(row.g ?? ''); if (!r) continue
      const d = lk(head), b = lk(r.base)
      if (!keep(d) && !keep(b)) continue
      if (addDim(into, d, b, r.rel, src as DimSrcId, row.g, [row.l, row.u].filter(Boolean).join(' · '))) links++
    }
  }
  return { files, rows, links }
}

export async function wiktLinks(file: string, keep: (l: string) => boolean, into: Map<string, DimEntry>): Promise<{ lines: number; links: number }> {
  let lines = 0, links = 0
  if (!existsSync(file)) return { lines, links }
  const rl = createInterface({ input: createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line || !line.includes('of ')) continue
    lines++
    let j: { word?: string; senses?: { glosses?: string[] }[] }; try { j = JSON.parse(line) } catch { continue }
    if (!j.word) continue
    for (const s of j.senses ?? []) for (const g of s.glosses ?? []) {
      const r = parseWiktRel(g); if (!r) continue
      const d = lk(j.word), b = lk(r.base)
      if (!keep(d) && !keep(b)) continue
      if (addDim(into, d, b, r.rel, 'wikt', g, `https://en.wiktionary.org/wiki/${encodeURIComponent(j.word)}#Ukrainian`)) links++
    }
  }
  return { lines, links }
}

export async function writeDim(root: string, pub: string, generated: string, lemmas: Iterable<string>): Promise<{ derivatives: number; bases: number; sum: number; wikt: number }> {
  const have = new Set([...lemmas].map(lk)), keep = (l: string) => have.has(l), into = new Map<string, DimEntry>()
  const s = sumLinks(root, keep, into), w = await wiktLinks(resolve(root, 'data/raw/kaikki/uk.jsonl'), keep, into)
  const entries = Object.fromEntries([...into].sort((a, b) => a[0].localeCompare(b[0], 'uk')))
  const file: DimFile = { format: 1, generated, entries }
  writeJsonAtomic(resolve(pub, 'dim.json'), JSON.stringify(file))
  return { derivatives: [...into.values()].filter(e => e.of).length, bases: [...into.values()].filter(e => e.ds).length, sum: s.links, wikt: w.links }
}
