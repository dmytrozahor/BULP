/**
 * SPEC 63 SE-12 input: the two typed glossaries of uk.wikisource.org (core/hist-ws.ts) → data/raw/hist-ws/<id>/<n>.json (the MediaWiki `action=parse` answer: rendered HTML + revid).
 * Etiquette: the API (not scraping), one request per page (4 in all), 3 s apart, a neutral research User-Agent without personal data; a "too many requests" answer is retried twice after a pause.
 * RS-1: an existing file is kept, tmp + rename, a failed download is a warning (build:data then has no rows of that glossary), never a build error.
 *   tsx pipelines/fetch-hist-ws.ts
 */
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { WS_API, WS_SPECS } from '../core/hist-ws.ts'
import { writeJsonAtomic } from './robust.ts'

export const WS_ROOT = 'data/raw/hist-ws'
const UA = 'BULP-research/1.0 (Ukrainian historical lexicon; non-commercial; github.com/dmytrozahor/BULP)'
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
export async function fetchWs(root = WS_ROOT, api = WS_API, get: typeof fetch = fetch, pause = 3000): Promise<Record<string, number>> {
  const out: Record<string, number> = { kept: 0, fetched: 0, failed: 0 }
  for (const spec of WS_SPECS) for (let n = 0; n < spec.titles.length; n++) {
    const dest = resolve(root, spec.id, `${n}.json`)
    if (existsSync(dest)) { out.kept!++; continue }
    const url = `${api}?action=parse&page=${encodeURIComponent(spec.titles[n]!)}&prop=text|revid&format=json&formatversion=2`
    let done = false
    for (let t = 0; t < 3 && !done; t++) {
      try {
        const res = await get(url, { headers: { 'user-agent': UA } }); const txt = await res.text()
        if (!txt.startsWith('{')) { if (t < 2) { await sleep(pause * 3); continue } throw new Error(`HTTP ${res.status}: ${txt.slice(0, 60)}`) }
        const j = JSON.parse(txt) as { parse?: { text?: string; revid?: number } }; if (!j.parse?.text || j.parse.text.length < 3000) throw new Error('empty page')
        mkdirSync(resolve(root, spec.id), { recursive: true }); writeJsonAtomic(dest, JSON.stringify({ title: spec.titles[n], revid: j.parse.revid, fetched: new Date().toISOString().slice(0, 10), html: j.parse.text }))
        out.fetched!++; done = true
      } catch (e) { if (t === 2) { console.warn(`✗ ${spec.titles[n]}: ${(e as Error).message} (no ${spec.short} rows from this page in this build)`); out.failed!++ } else await sleep(pause * 3) }
    }
    await sleep(pause)
  }
  return out
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('fetch-hist-ws.ts')) console.log('hist-ws:', JSON.stringify(await fetchWs()))
