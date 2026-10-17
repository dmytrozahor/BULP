/**
 * SPEC 63 MD-2: uk.wiktionary neologism / slang / IT categories → data/raw/wikt-modern/entries.json (`tsx pipelines/ingest-modern-wikt.ts`).
 * Access: MediaWiki API (robots.txt of uk.wiktionary allows /w/api.php; Wikimedia User-Agent policy: identified client, serial requests).
 * Pacing 2.1 s per request. Licence CC BY-SA 4.0 → headword + gloss ≤ 160 chars may be stored, with attribution.
 * Date of an entry = timestamp of its FIRST revision (when the word was added to the dictionary). It is NOT the date the word was first used: the badge says so.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeAtomic } from '../harvest/lib.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const WIKT_OUT = resolve(ROOT, 'data/raw/wikt-modern/entries.json')
const API = 'https://uk.wiktionary.org/w/api.php'
const UA = { 'User-Agent': 'BULP-ukr-lexicon/0.1 (https://github.com/dmytrozahor/BULP; dmytrozah.dev@gmail.com) modern-vocabulary research' }
/** category → kind (the category name is the evidence quote) */
export const WIKT_CATS: { cat: string; kind: 'neologism' | 'slang' | 'it' }[] = [
  { cat: 'Неологізми/uk', kind: 'neologism' }, { cat: 'Жаргонізми/uk', kind: 'slang' }, { cat: 'Інтернетний жаргон/uk', kind: 'it' },
  { cat: 'Інтернет-жаргон', kind: 'it' }, { cat: 'Комп\'ютерні терміни/uk', kind: 'it' },
]
export interface WiktEntry { w: string; kind: 'neologism' | 'slang' | 'it'; cat: string; gloss?: string; created: string; url: string }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
async function api(params: Record<string, string>): Promise<any> {
  await sleep(2100)
  const r = await fetch(API + '?' + new URLSearchParams({ format: 'json', ...params }), { headers: UA })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}
/** first definition line of a uk.wiktionary entry: «# …» with templates/links/markup stripped */
export function firstGloss(wikitext: string): string | undefined {
  for (const l of wikitext.split('\n')) {
    const m = /^#(?![:*#])\s*(.+)$/.exec(l)
    if (!m) continue
    const t = m[1]!.replace(/\{\{[^{}]*\}\}/g, '').replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/'{2,}/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (t.length > 3) return t.length > 160 ? t.slice(0, 159) + '…' : t
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out: WiktEntry[] = existsSync(WIKT_OUT) ? JSON.parse(readFileSync(WIKT_OUT, 'utf8')) : []
  const have = new Set(out.map(e => e.w + '|' + e.cat))
  for (const { cat, kind } of WIKT_CATS) {
    const j = await api({ action: 'query', list: 'categorymembers', cmtitle: 'Категорія:' + cat, cmlimit: '500', cmnamespace: '0' })
    const titles: string[] = j.query.categorymembers.map((m: any) => m.title)
    console.log(cat, titles.length)
    const gloss = new Map<string, string | undefined>()
    for (let i = 0; i < titles.length; i += 20) {
      const g = await api({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: titles.slice(i, i + 20).join('|') })
      for (const p of Object.values<any>(g.query.pages)) gloss.set(p.title, firstGloss(p.revisions?.[0]?.slots?.main?.['*'] ?? ''))
    }
    for (const w of titles) {
      if (have.has(w + '|' + cat)) continue
      const r = await api({ action: 'query', prop: 'revisions', rvprop: 'timestamp', rvdir: 'newer', rvlimit: '1', titles: w })
      const created = Object.values<any>(r.query.pages)[0]?.revisions?.[0]?.timestamp as string | undefined
      if (!created) continue
      out.push({ w, kind, cat, gloss: gloss.get(w), created, url: 'https://uk.wiktionary.org/wiki/' + encodeURIComponent(w) })
      mkdirSync(dirname(WIKT_OUT), { recursive: true }); writeAtomic(WIKT_OUT, JSON.stringify(out))
    }
  }
  console.log('entries', out.length)
}
