/**
 * UL-1 harvest: members of the uk.wiktionary label categories (research/14 §2) via the MediaWiki API (`list=categorymembers`, namespace 0).
 * `tsx pipelines/usage-wikt.ts` → data/work/usage-wikt.json   (resumable per category; ≥ 5 s between API calls; descriptive User-Agent)
 *
 * > "uk.wiktionary: API open, CC BY-SA 4.0. … Rate limit hit at rapid-fire requests without User-Agent; use ≥2.5 s delay and a descriptive User-Agent." — research/14 §8
 * Category membership is the licence-bearing data: the page title is the lemma, the category is the label (CC BY-SA 4.0, attributed in the UI).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WIKT_CATEGORIES } from '../core/usage.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'), OUT = resolve(ROOT, 'data/work/usage-wikt.json')
const UA = 'BULP-ukr-lexicon/0.1 (https://github.com/dmytrozahor/BULP; dmytrozah.dev@gmail.com) category harvest'
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

interface Out { retrieved: string; categories: Record<string, string[]> }

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out: Out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { retrieved: new Date().toISOString().slice(0, 10), categories: {} }
  for (const c of WIKT_CATEGORIES) {
    if (out.categories[c.cat]) continue
    const members: string[] = []; let cont = ''
    for (;;) {
      const url = `https://uk.wiktionary.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent('Категорія:' + c.cat)}&cmnamespace=0&cmlimit=500&format=json&formatversion=2${cont}`
      const r = await fetch(url, { headers: { 'User-Agent': UA } })
      await sleep(5200)
      if (!r.ok) { console.warn(`  ! ${c.cat}: HTTP ${r.status}`); if (r.status === 429) await sleep(30000); break }
      const j = await r.json() as { query?: { categorymembers: { title: string }[] }; continue?: { cmcontinue: string } }
      members.push(...(j.query?.categorymembers ?? []).map(m => m.title))
      if (!j.continue) { out.categories[c.cat] = members; break }
      cont = `&cmcontinue=${encodeURIComponent(j.continue.cmcontinue)}`
    }
    writeFileSync(OUT, JSON.stringify(out)); console.log(`${c.cat}: ${out.categories[c.cat]?.length ?? 'failed'}`)
  }
}
