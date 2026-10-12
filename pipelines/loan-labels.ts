/**
 * LW-2 harvest (requested by the W10 stream): en.wiktionary donor categories «Ukrainian terms borrowed from <language>» (research/26 §5) via the MediaWiki API.
 * `tsx pipelines/loan-labels.ts` → data/work/loanlabels-raw.json (resumable per category; ≥ 5 s between calls; descriptive User-Agent).
 * Single-word lemmas only (letters, apostrophe, hyphen); CC BY-SA 4.0 — the category name is the label, the page title the lemma.
 * Caveat from research/26 §5: editors' labels, immediate-source bias, incomplete — they validate patterns, not individual etymologies.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const LOAN_CATEGORIES: { donor: string; cats: string[] }[] = [
  { donor: 'pl', cats: ['Polish'] }, { donor: 'fr', cats: ['French'] }, { donor: 'en', cats: ['English'] }, { donor: 'de', cats: ['German', 'Middle High German'] },
  { donor: 'ru', cats: ['Russian'] }, { donor: 'la', cats: ['Latin'] }, { donor: 'grc', cats: ['Ancient Greek'] }, { donor: 'cu', cats: ['Old Church Slavonic'] },
  { donor: 'tr', cats: ['Turkish', 'Tatar'] }, { donor: 'it', cats: ['Italian'] }, { donor: 'nl', cats: ['Dutch'] }, { donor: 'hu', cats: ['Hungarian'] },
]
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'), OUT = resolve(ROOT, 'data/work/loanlabels-raw.json')
const UA = 'BULP-ukr-lexicon/0.1 (https://github.com/dmytrozahor/BULP; dmytrozah.dev@gmail.com) category harvest'
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
export interface LoanRaw { retrieved: string; categories: Record<string, { donor: string; members: string[] }> }

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out: LoanRaw = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { retrieved: new Date().toISOString().slice(0, 10), categories: {} }
  for (const { donor, cats } of LOAN_CATEGORIES) for (const lang of cats) {
    const cat = `Ukrainian terms borrowed from ${lang}`
    if (out.categories[cat]) continue
    const members: string[] = []; let cont = ''
    for (;;) {
      const url = `https://en.wiktionary.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent('Category:' + cat)}&cmnamespace=0&cmlimit=500&format=json&formatversion=2${cont}`
      const r = await fetch(url, { headers: { 'User-Agent': UA } })
      await sleep(5200)
      if (!r.ok) { console.warn(`  ! ${cat}: HTTP ${r.status}`); if (r.status === 429) await sleep(30000); break }
      const j = await r.json() as { query?: { categorymembers: { title: string }[] }; continue?: { cmcontinue: string } }
      members.push(...(j.query?.categorymembers ?? []).map(m => m.title))
      if (!j.continue) { out.categories[cat] = { donor, members }; break }
      cont = `&cmcontinue=${encodeURIComponent(j.continue.cmcontinue)}`
    }
    writeFileSync(OUT, JSON.stringify(out)); console.log(`${cat}: ${out.categories[cat]?.members.length ?? 'failed'}`)
  }
}
