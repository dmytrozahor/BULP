/**
 * BL-12 BUILD step: public/data/phrases.json = { candidates (model, method 'collocation+archaism'), attested (uk.wiktionary «Фразеологізми», CC BY-SA 4.0) }.
 * The two classes stay separate (P-1.7): a candidate is a statistical model; «засвідчений фразеологізм» is a dictionary-style fact with D evidence (category + permalink).
 * BL-12b: candidates = >= 2 source families (core/phrasemes.ts phraseFamily) or attested; formulas = single-family repetitions (graffiti formulas).
 * A candidate whose lemma sequence equals the words of an attested title is cross-marked (`attested`), which never changes its score.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { idiomWords, PHRASE_METHOD, type Phraseme } from '../core/phrasemes.ts'

export function writePhrases(root: string, pub: string, generated: string, cands: Phraseme[], frames: Phraseme[] = []): { candidates: number; formulas: number; attestedTitles: number; matched: number } {
  const p = resolve(root, 'data/work/phraseology-wikt.json')
  const w = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) as { retrieved: string; categories: Record<string, string[]> } : undefined
  const titles = [...new Set(Object.values(w?.categories ?? {}).flat())].filter(t => idiomWords(t).length >= 2).sort((a, b) => a.localeCompare(b, 'uk'))
  const byWords = new Map(titles.map(t => [idiomWords(t).join(' '), t]))
  let matched = 0
  for (const c of cands) { const t = byWords.get(c.lemmas.map(l => l.replace(/^~/, '').toLowerCase()).join(' ')); if (t) { c.attested = t; matched++ } }
  // BL-12b: the top list needs >= 2 source families or attested status; single-family repetitions (Sophia graffiti, one chronicle's redactions) go to the separate «формули графіті» list
  const top = cands.filter(c => c.nF >= 2 || c.attested).slice(0, 3000), formulas = cands.filter(c => c.nF < 2 && !c.attested).slice(0, 1000)
  writeFileSync(resolve(pub, 'phrases.json'), JSON.stringify({
    format: 1, generated, method: PHRASE_METHOD,
    note: 'кандидати — модель (асоціація logDice × архаїчність), а не словникові факти (P-1.7); «засвідчений фразеологізм» — окремий клас зі словникових категорій',
    attestedSource: { name: 'Вікісловник (uk): Категорія:Фразеологізми, Категорія:Українські фразеологізми', licence: 'CC BY-SA 4.0', retrieved: w?.retrieved ?? '', url: 'https://uk.wiktionary.org/wiki/Категорія:Фразеологізми' },
    attested: titles, candidates: top, formulas, frames: frames.slice(0, 500),
  }))
  return { candidates: top.length, formulas: formulas.length, attestedTitles: titles.length, matched }
}
