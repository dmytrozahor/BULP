/**
 * Stage 1 — ingestion dispatcher (SPEC 10 M-2). Each source kind has its own module with the same shape:
 *   discover(unit)  → extra URLs to fetch (TOC pages, wiki subpages, chapters)
 *   parse(unit, files) → WitnessOut[] (one unit may yield several witnesses)
 * Usage: `tsx pipelines/ingest.ts` → writes data/work/<witness>.json
 */
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { MANIFEST, type Unit, type Kind } from './manifest.ts'
import { authorById, admissible } from './authors.ts'
import type { WitnessOut } from '../core/types.ts'

export interface RawFile { url: string; path: string; body: Buffer }
export interface Ingester {
  discover?: (u: Unit, fetchText: (url: string) => Promise<string>) => Promise<string[]>
  parse: (u: Unit, files: RawFile[]) => Promise<WitnessOut[]> | WitnessOut[]
}

export const INGESTERS: Partial<Record<Kind, () => Promise<Ingester>>> = {
  izbornyk: () => import('./ingest-izbornyk.ts').then(m => m.default),
  torot: () => import('./ingest-torot.ts').then(m => m.default),
  vira: () => import('./ingest-vira.ts').then(m => m.default),
  wikisource: () => import('./ingest-wikisource.ts').then(m => m.default),
}

/** Files of a unit as cached by fetch.ts: data/raw/<kind>/<unit>/NNN.* plus urls.json (index → url). */
export async function rawFiles(u: Unit): Promise<RawFile[]> {
  const dir = `data/raw/${u.kind}/${u.id}`
  const urls: string[] = JSON.parse(await readFile(`${dir}/urls.json`, 'utf8').catch(() => '[]'))
  const names = (await readdir(dir).catch(() => [] as string[])).filter(n => /^\d{3}\./.test(n)).sort()
  return Promise.all(names.map(async n => ({ url: urls[+n.slice(0, 3)] ?? '', path: `${dir}/${n}`, body: await readFile(`${dir}/${n}`) })))
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('ingest.ts')) {
  await mkdir('data/work', { recursive: true })
  const only = process.argv[2]
  for (const u of MANIFEST.filter(u => !only || u.id === only)) {
    if (!admissible(authorById[u.author])) { console.warn(`skip ${u.id}: author ${u.author} not admissible (P-2.2)`); continue }
    const ing = await INGESTERS[u.kind]?.()
    if (!ing) { console.warn(`no ingester for ${u.kind}`); continue }
    const out = await ing.parse(u, await rawFiles(u))
    for (const w of out) {
      await writeFile(`data/work/${w.id}.json`, JSON.stringify(w))
      console.log(`✓ ${w.id}: ${w.tokens.length} tokens, dropped ${JSON.stringify(w.dropped)}`)
    }
  }
}
