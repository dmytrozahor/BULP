/**
 * BL-12 harvest: members of uk.wiktionary «Фразеологізми» / «Українські фразеологізми» (categorymembers, ns 0) → data/work/phraseology-wikt.json (cached, resumable).
 * CC BY-SA 4.0: the title is the idiom, the category the label; the UI attributes «Вікісловник (uk)». ≥ 5 s between calls, descriptive User-Agent (research/14 §8).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
export const PHRASE_CATEGORIES = ['Фразеологізми', 'Українські фразеологізми']
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../data/work/phraseology-wikt.json')
const UA = 'BULP-ukr-lexicon/0.1 (https://github.com/dmytrozahor/BULP; dmytrozah.dev@gmail.com) phraseology category harvest'
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
export interface PhraseWikt { retrieved: string; categories: Record<string, string[]> }
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out: PhraseWikt = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { retrieved: new Date().toISOString().slice(0, 10), categories: {} }
  for (const cat of PHRASE_CATEGORIES) {
    if (out.categories[cat]) continue
    const members: string[] = []; let cont = ''
    for (;;) {
      const r = await fetch(`https://uk.wiktionary.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent('Категорія:' + cat)}&cmnamespace=0&cmlimit=500&format=json&formatversion=2${cont}`, { headers: { 'User-Agent': UA } })
      await sleep(5200)
      if (!r.ok) { console.warn(`  ! ${cat}: HTTP ${r.status}`); if (r.status === 429) await sleep(30000); break }
      const j = await r.json() as { query?: { categorymembers: { title: string }[] }; continue?: { cmcontinue: string } }
      members.push(...(j.query?.categorymembers ?? []).map(m => m.title))
      if (!j.continue) { out.categories[cat] = members; break }
      cont = `&cmcontinue=${encodeURIComponent(j.continue.cmcontinue)}`
    }
    writeFileSync(OUT, JSON.stringify(out)); console.log(`${cat}: ${out.categories[cat]?.length ?? 'failed'}`)
  }
}
