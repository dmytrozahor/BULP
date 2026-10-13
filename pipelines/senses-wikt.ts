/**
 * BL-9 harvest: uk.wiktionary wikitext of the kept lemmas, 50 titles per API request (`prop=revisions&rvprop=content|ids`, MediaWiki allows 50 content titles per call),
 * ≥ 5 s between requests, descriptive User-Agent (research/14 §8, research/22 R2-B: unidentified rapid requests are throttled).
 * `tsx pipelines/senses-wikt.ts [maxLemmas]` → data/raw/wikt/senses-<hash>.json (one file per batch; resumable: a cached batch is never fetched again).
 * Order = heteronym lemmas first, then by corpus frequency (stats.f) descending, so a partial run always holds the most frequent lemmas; the cut-off is printed.
 * Licence: Wiktionary text is CC BY-SA 4.0 — the build keeps the revision id of every sense and the UI attributes it (BL-9).
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unpackCore } from '../core/pack.ts'
import { HETERONYMS } from '../core/heteronyms.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'), DIR = resolve(ROOT, 'data/raw/wikt')
const UA = 'BULP-ukr-lexicon/0.1 (https://github.com/dmytrozahor/BULP; dmytrozah.dev@gmail.com) sense harvest'
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
export const BATCH = 50, GAP_MS = 5200
export interface WiktPage { title: string; revid?: number; content?: string; missing?: true }
export interface WiktBatch { retrieved: string; titles: string[]; pages: WiktPage[] }
export const batchFile = (titles: string[]) => resolve(DIR, `senses-${createHash('sha1').update(titles.join('\n')).digest('hex').slice(0, 12)}.json`)

/** Lemmas to harvest, in priority order. */
export function lemmaOrder(): { lemma: string; f: number }[] {
  const core = unpackCore(JSON.parse(readFileSync(resolve(ROOT, 'public/data/lexicon.json'), 'utf8'))) as { lemma: string; stats: { f: number } }[]
  const het = new Set(HETERONYMS.flatMap(h => h.readings.map(r => r.lemma)))
  return core.map(c => ({ lemma: c.lemma, f: c.stats.f })).sort((a, b) => Number(het.has(b.lemma)) - Number(het.has(a.lemma)) || b.f - a.f || a.lemma.localeCompare(b.lemma))
}

async function fetchBatch(titles: string[]): Promise<WiktPage[]> {
  const url = `https://uk.wiktionary.org/w/api.php?action=query&prop=revisions&rvprop=content|ids&rvslots=main&format=json&formatversion=2&maxlag=5&titles=${encodeURIComponent(titles.join('|'))}`
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } })
    if (r.status === 429 || r.status === 503) { console.warn(`  ! HTTP ${r.status}, waiting`); await sleep(60000); continue }
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const j = await r.json() as { error?: { code: string }; query?: { pages: { title: string; missing?: boolean; revisions?: { revid: number; slots: { main: { content: string } } }[] }[]; normalized?: { from: string; to: string }[] } }
    if (j.error) { console.warn(`  ! API ${j.error.code}, waiting`); await sleep(30000); continue }
    const back = new Map((j.query?.normalized ?? []).map(n => [n.to, n.from]))
    return (j.query?.pages ?? []).map(p => {
      const title = back.get(p.title) ?? p.title, rev = p.revisions?.[0]
      return p.missing || !rev ? { title, missing: true as const } : { title, revid: rev.revid, content: rev.slots.main.content }
    })
  }
  throw new Error('too many retries')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mkdirSync(DIR, { recursive: true })
  const max = Number(process.argv[2]) || Infinity
  const order = lemmaOrder().slice(0, max).map(x => x.lemma)
  let fetched = 0, cached = 0, t0 = Date.now()
  for (let i = 0; i < order.length; i += BATCH) {
    const titles = order.slice(i, i + BATCH), file = batchFile(titles)
    if (existsSync(file)) { cached++; continue }
    const pages = await fetchBatch(titles)
    writeFileSync(file, JSON.stringify({ retrieved: new Date().toISOString().slice(0, 10), titles, pages } satisfies WiktBatch))
    fetched++
    if (fetched % 10 === 0) console.log(`  batch ${i / BATCH + 1}/${Math.ceil(order.length / BATCH)}: ${fetched} fetched, ${cached} cached, ${((Date.now() - t0) / 60000).toFixed(1)} min`)
    await sleep(GAP_MS)
  }
  console.log(`done: ${order.length} lemmas in ${Math.ceil(order.length / BATCH)} batches (${fetched} fetched, ${cached} cached)`)
}
