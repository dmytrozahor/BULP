/**
 * SPEC 63 HV-2: r2u.org.ua lookups for lemmas not yet fetched. Owner's decision 2026-10-14 (robots ignored; pacing = the site's Crawl-delay 10 s).
 * Writes the dump format pipelines/ingest-r2u.ts already reads: data/raw/r2u/pages/<file>.html.gz + data/raw/r2u/index.jsonl (shared with the earlier manual runs, so it resumes where they stopped).
 * Lemma order: lexicon cards by frequency, then VESUM lemmas; the list is cached in data/raw/harvest/r2u/lemmas.txt (the card file may be mid-rebuild).
 * Also keeps data/raw/harvest/r2u/index.jsonl (a count line per fetch) so status.ps1 can report it like the other sources.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { Harvest, writeAtomic } from './lib.ts'

const DIR = 'data/raw/r2u', PAGES = `${DIR}/pages`, INDEX = `${DIR}/index.jsonl`
const LEMMA_OK = /^[а-яіїєґ'-]+$/i

export async function lemmaList(): Promise<string[]> {
  const cache = 'data/raw/harvest/r2u/lemmas.txt'
  if (existsSync(cache)) return readFileSync(cache, 'utf8').split('\n').filter(Boolean)
  const out: string[] = [], seen = new Set<string>()
  const add = (l: string) => { if (LEMMA_OK.test(l) && !seen.has(l)) { seen.add(l); out.push(l) } }
  try {   // the card file may be mid-rebuild: then only the VESUM order is used (and not cached as the final list)
    const m = await import('../core/pack.ts')
    const cards = m.unpackCore(JSON.parse(readFileSync('public/data/lexicon.json', 'utf8')))
    for (const c of [...cards].sort((a, b) => b.stats.f - a.stats.f)) add(c.lemma)
  } catch { /* fall through to VESUM */ }
  try {
    for (const line of readFileSync('data/raw/vesum/dict_corp_vis.txt', 'utf8').split('\n')) if (line && line[0] !== ' ' && line[0] !== '#') add(line.split(/\s/)[0]!.toLowerCase())
  } catch { /* no VESUM dump */ }
  if (out.length > 1000) writeAtomic(cache, out.join('\n'))
  return out
}

async function main() {
  const h = new Harvest('r2u', { delayMs: 10_000, logEvery: 100, capBytes: 2_000_000_000 })
  mkdirSync(PAGES, { recursive: true })
  const { r2uQueryUrl } = await import('../pipelines/r2u.ts')
  const done = new Set(existsSync(INDEX) ? readFileSync(INDEX, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).q as string) : [])
  const lemmas = await lemmaList()
  let n = done.size
  for (const q of lemmas) {
    if (done.has(q)) continue
    const { status, text } = await h.getText(r2uQueryUrl(q, 'ukr'))
    const file = `${String(n).padStart(5, '0')}.html.gz`
    writeAtomic(`${PAGES}/${file}`, gzipSync(text))
    appendFileSync(INDEX, JSON.stringify({ q, scope: 'ukr', file, at: new Date().toISOString(), status, bytes: text.length }) + '\n')
    h.note({ id: `r2u:${q}`, url: r2uQueryUrl(q, 'ukr'), date: null, licence: 'r2u.org.ua dictionaries (research/30; vocabulary/attestation only)', bytes: text.length, status, title: q, file })
    done.add(q); n++
  }
  h.finish()
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/r2u.ts')) await main()
