/**
 * SPEC 63 LB-10 — read the place of publication of every archive.org witness from the item's OWN metadata and write data/seed/ia-places.json
 * (committed; the build reads it, so the build itself needs no network):
 *   npx tsx pipelines/ia-places.ts [corpus.json]     (default public/data/corpus.json; network, ~2 s per 40 items + 1 request per item without a publisher)
 * Source per witness = the field the place was read from and its verbatim value (core/witness-place.ts placeFromIaMeta): `publisher`, the corporate `creator`/`contributor`
 * with its location in brackets, the imprint line of the `description`, or the quoted reference work of IA_SERIES. An item that names no place (or two) is not written.
 * robots.txt of archive.org disallows only /control/ and /report/; pacing below.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { placeFromIaMeta, type IaMeta, type IaPlace } from '../core/witness-place.ts'

const OUT = resolve('data/seed/ia-places.json')
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const UA = { 'User-Agent': 'BULP-region/1.0 (https://github.com/dmytrozahor/BULP; research, polite)' }
async function getJson<T>(url: string): Promise<T> {
  for (let t = 0; t < 5; t++) { try { const r = await fetch(url, { headers: UA }); if (r.ok) return (await r.json()) as T } catch { /* retry */ } await sleep(3000) }
  throw new Error(`unreachable: ${url}`)
}
export const iaIdOf = (url: string | undefined): string | undefined => /archive\.org\/details\/([^/?#]+)/.exec(url ?? '')?.[1]

export interface IaPlacesFile { format: 1; retrieved: string; items: number; placed: number; byField: Record<string, number>; places: Record<string, IaPlace> }

async function main() {
  const corpus = JSON.parse(readFileSync(resolve(process.argv[2] ?? 'public/data/corpus.json'), 'utf8')) as { witnesses: { id: string; url: string }[] }
  const ids = [...new Set(corpus.witnesses.filter(w => w.id.startsWith('hv_ia_')).map(w => iaIdOf(w.url)).filter((x): x is string => !!x))]
  const metas = new Map<string, IaMeta>()
  const fl = ['identifier', 'publisher', 'creator', 'contributor', 'description'].map(f => `fl[]=${f}`).join('&')
  for (let i = 0; i < ids.length; i += 40) {
    const q = 'identifier:(' + ids.slice(i, i + 40).map(x => `"${x}"`).join(' OR ') + ')'
    const j = await getJson<{ response: { docs: IaMeta[] } }>(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&${fl}&rows=100&page=1&output=json`)
    for (const d of j.response.docs) metas.set(d.identifier, d)
    await sleep(1500)
  }
  // the search index lacks the long fields for some items: the item's metadata API has them
  for (const id of ids) {
    const m = metas.get(id) ?? { identifier: id }
    if (placeFromIaMeta(m)?.field === 'publisher') continue
    const j = await getJson<{ result?: Record<string, string | string[]> }>(`https://archive.org/metadata/${id}/metadata`)
    const r = j.result ?? {}
    metas.set(id, { ...m, ...(r['creator'] ? { creator: r['creator'] } : {}), ...(r['contributor'] ? { contributor: r['contributor'] } : {}), ...(r['description'] ? { description: r['description'] } : {}), ...(r['publisher'] ? { publisher: r['publisher'] } : {}) })
    await sleep(700)
  }
  const places: Record<string, IaPlace> = {}, byField: Record<string, number> = {}
  for (const id of ids.sort()) { const p = placeFromIaMeta(metas.get(id) ?? { identifier: id }); if (p) { places[id] = p; byField[p.field] = (byField[p.field] ?? 0) + 1 } }
  const file: IaPlacesFile = { format: 1, retrieved: new Date().toISOString().slice(0, 10), items: ids.length, placed: Object.keys(places).length, byField, places }
  mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, JSON.stringify(file, null, 1) + '\n')
  console.log(`ia-places: ${file.placed} of ${file.items} archive.org items placed ${JSON.stringify(byField)} → ${OUT}`)
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('pipelines/ia-places.ts')) await main()
