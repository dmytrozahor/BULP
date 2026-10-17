/**
 * SPEC 63 HV-2: r2u.org.ua lookups for lemmas not yet fetched. Owner's decision 2026-10-14 (robots ignored; pacing = the site's Crawl-delay 10 s).
 * Writes the dump format pipelines/ingest-r2u.ts already reads: data/raw/r2u/pages/<file>.html.gz + data/raw/r2u/index.jsonl (shared with the earlier manual runs, so it resumes where they stopped).
 * Lemma order: lexicon cards by frequency, then VESUM lemmas; the list is cached in data/raw/harvest/r2u/lemmas.txt (the card file may be mid-rebuild).
 * CV-6: specs/user-words.txt (the owner's words) is looked up FIRST, in the scopes given (core/sn.ts priorityQueries); a run resumes by (query, scope).
 * Also keeps data/raw/harvest/r2u/index.jsonl (a count line per fetch) so status.ps1 can report it like the other sources.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { Harvest, writeAtomic } from './lib.ts'
import { parseUserWords, priorityQueries } from '../core/sn.ts'

const DIR = 'data/raw/r2u', PAGES = `${DIR}/pages`, INDEX = `${DIR}/index.jsonl`
export const USER_WORDS = 'specs/user-words.txt'
/** done-set key of a lookup: a ukr-scope query is the bare query (as before), a ru-scope one is «ru:<query>» */
export const doneKey = (q: string, scope: string) => (scope === 'ukr' ? q : `${scope}:${q}`)
const LEMMA_OK = /^[а-яіїєґ'-]+$/i

export async function lemmaList(opts: { cache?: string; lexicon?: string } = {}): Promise<string[]> {
  const cache = opts.cache ?? 'data/raw/harvest/r2u/lemmas.txt', LEXICON = opts.lexicon ?? 'public/data/lexicon.json'
  if (existsSync(cache)) return readFileSync(cache, 'utf8').split('\n').filter(Boolean)
  const out: string[] = [], seen = new Set<string>()
  const add = (l: string) => { if (LEMMA_OK.test(l) && !seen.has(l)) { seen.add(l); out.push(l) } }
  let lexiconOk = false
  try {   // the card file may be mid-rebuild: then only the VESUM order is used (and NOT cached as the final list)
    const m = await import('../core/pack.ts')
    const cards = m.unpackCore(JSON.parse(readFileSync(LEXICON, 'utf8')))
    for (const c of [...cards].sort((a, b) => b.stats.f - a.stats.f)) add(c.lemma)
    lexiconOk = true
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') console.error(`r2u lemmaList: lexicon.json unreadable (${(e as Error).message}); VESUM order only, list not cached`)
  }
  try {
    for (const line of readFileSync('data/raw/vesum/dict_corp_vis.txt', 'utf8').split('\n')) if (line && line[0] !== ' ' && line[0] !== '#') add(line.split(/\s/)[0]!.toLowerCase())
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') console.error(`r2u lemmaList: VESUM dump unreadable (${(e as Error).message})`)
  }
  if (lexiconOk && out.length > 1000) writeAtomic(cache, out.join('\n'))
  return out
}

/** the queries already fetched; a torn line (kill mid-append) is skipped and logged, never a crash */
export function doneQueries(index: string): Set<string> {
  const done = new Set<string>()
  if (!existsSync(index)) return done
  for (const l of readFileSync(index, 'utf8').split('\n')) {
    if (!l) continue
    try { { const j = JSON.parse(l); done.add(doneKey(j.q as string, (j.scope as string) ?? 'ukr')) } } catch { console.error(`r2u: skipping torn index line: ${l.slice(0, 60)}`) }
  }
  return done
}
/** page file numbers never collide with existing pages: max existing + 1 (the done count can be lower after a torn line) */
export function nextFileNumber(pagesDir: string, fallback: number): number {
  let max = -1
  try { for (const f of readdirSync(pagesDir)) { const m = /^(\d+)\.html\.gz$/.exec(f); if (m) max = Math.max(max, +m[1]!) } } catch { /* none yet */ }
  return max < 0 ? fallback : max + 1
}

async function main() {
  const h = new Harvest('r2u', { delayMs: 10_000, logEvery: 100, capBytes: 2_000_000_000 })
  mkdirSync(PAGES, { recursive: true })
  const { r2uQueryUrl } = await import('../pipelines/r2u.ts')
  const done = doneQueries(INDEX)
  const lemmas = await lemmaList()
  let n = nextFileNumber(PAGES, done.size)
  const userQ = existsSync(USER_WORDS) ? priorityQueries(parseUserWords(readFileSync(USER_WORDS, 'utf8'))) : []
  const queue: [string, 'ukr' | 'ru'][] = [...userQ, ...lemmas.map(q => [q, 'ukr'] as [string, 'ukr' | 'ru'])]
  for (const [q, scope] of queue) {
    if (done.has(doneKey(q, scope))) continue
    const { status, text } = await h.getText(r2uQueryUrl(q, scope))
    const file = `${String(n).padStart(5, '0')}.html.gz`
    writeAtomic(`${PAGES}/${file}`, gzipSync(text))
    appendFileSync(INDEX, JSON.stringify({ q, scope, file, at: new Date().toISOString(), status, bytes: text.length }) + '\n')
    h.note({ id: `r2u:${doneKey(q, scope)}`, url: r2uQueryUrl(q, scope), date: null, licence: 'r2u.org.ua dictionaries (research/30; vocabulary/attestation only)', bytes: text.length, status, title: q, file })
    done.add(doneKey(q, scope)); n++
  }
  h.finish()
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/r2u.ts')) await main()
