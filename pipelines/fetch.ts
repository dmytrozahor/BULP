/**
 * Stage 0 — acquisition (SPEC 10 M-1, P-4.5). Downloads every unit's URLs (+ URLs found by the kind's `discover`)
 * into data/raw/<kind>/<unit>/NNN.*, with urls.json mapping index → URL. Downloads are data; nothing is executed.
 *
 * > "Plain `curl http://` works; WebFetch's forced HTTPS redirect loops" — research/06 §1.1 (izbornyk)
 * Usage: `tsx pipelines/fetch.ts [unitId]`
 */
import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { MANIFEST, rawPath } from './manifest.ts'
import { INGESTERS } from './ingest.ts'

const UA = { 'user-agent': 'ukr-lexicon-research/0.1 (non-commercial; dmytrozah.dev)' }
const exists = (p: string) => access(p).then(() => true, () => false)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function get(url: string): Promise<Buffer> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: UA }).catch(() => null)
    if (res?.ok) return Buffer.from(await res.arrayBuffer())
    await sleep(1000 * (attempt + 1))
  }
  throw new Error(`fetch failed: ${url}`)
}
const fetchText = async (url: string) => (await get(url)).toString('utf8')

const only = process.argv[2]
for (const u of MANIFEST.filter(u => !only || u.id === only)) {
  const dir = `data/raw/${u.kind}/${u.id}`
  await mkdir(dir, { recursive: true })
  const idx = `${dir}/urls.json`
  let urls: string[] = (await exists(idx)) ? JSON.parse(await readFile(idx, 'utf8')) : []
  if (!urls.length) {
    const extra = (await (await INGESTERS[u.kind]?.())?.discover?.(u, fetchText)) ?? []
    urls = [...new Set([...u.urls, ...extra])]
    await writeFile(idx, JSON.stringify(urls, null, 1))
  }
  for (const [i, url] of urls.entries()) {
    const out = rawPath(u, i)
    if (await exists(out)) continue
    try { await writeFile(out, await get(url)); console.log(`✓ ${u.id}[${i}] ${url}`) } catch (e) { console.warn(`✗ ${(e as Error).message}`) }
    await sleep(350) // politeness
  }
}
