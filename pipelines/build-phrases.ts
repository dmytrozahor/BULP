/**
 * BL-12 BUILD step: public/data/phrases.json = { candidates (model, method 'collocation+archaism'), attested (uk.wiktionary «Фразеологізми», CC BY-SA 4.0) }.
 * The two classes stay separate (P-1.7): a candidate is a statistical model; «засвідчений фразеологізм» is a dictionary-style fact with D evidence (category + permalink).
 * BL-12b: candidates = >= 2 source families (core/phrasemes.ts phraseFamily) or attested; formulas = single-family repetitions (graffiti formulas).
 * A candidate whose lemma sequence equals the words of an attested title is cross-marked (`attested`), which never changes its score.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { idiomWords, PHRASE_METHOD, type Phraseme } from '../core/phrasemes.ts'
import { detailShardOf, phraseId, phraseKey, type PhraseDetail, type PhraseEvidence } from '../core/phraseme-pages.ts'
import { harvestKaikkiPhrases } from './phrase-dict.ts'

export function writePhrases(root: string, pub: string, generated: string, cands: Phraseme[], frames: Phraseme[] = [], pages: { evidence?: Map<Phraseme, PhraseEvidence>; posOf?: (lemma: string) => string } = {}): { candidates: number; formulas: number; attestedTitles: number; matched: number; details: number; withGloss: number; withEtymology: number; withEvidence: number } {
  const p = resolve(root, 'data/work/phraseology-wikt.json')
  const w = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) as { retrieved: string; categories: Record<string, string[]> } : undefined
  const titles = [...new Set(Object.values(w?.categories ?? {}).flat())].filter(t => idiomWords(t).length >= 2).sort((a, b) => a.localeCompare(b, 'uk'))
  const byWords = new Map(titles.map(t => [idiomWords(t).join(' '), t]))
  let matched = 0
  for (const c of cands) { const t = byWords.get(c.lemmas.map(l => l.replace(/^~/, '').toLowerCase()).join(' ')); if (t) { c.attested = t; matched++ } }
  // BL-12b: the top list needs >= 2 source families or attested status; single-family repetitions (Sophia graffiti, one chronicle's redactions) go to the separate «формули графіті» list
  const top = cands.filter(c => c.nF >= 2 || c.attested).slice(0, 3000), formulas = cands.filter(c => c.nF < 2 && !c.attested).slice(0, 1000)
  // SPEC 63 PH: stable ids + per-phraseme detail shards (public/data/phr/<hex>.json), harvested quotes only
  const kk = harvestKaikkiPhrases(root), details: Record<string, PhraseDetail> = {}
  const seen = new Set<string>()
  for (const c of [...top, ...formulas]) {
    c.id = phraseId(c.lemmas)
    const k = phraseKey(c.lemmas), d = kk.get(k)?.[0], det: PhraseDetail = details[c.id] ?? { kind: 'candidate' }
    if (d) Object.assign(det, { gloss: d.gloss, etymology: d.etymology, tags: d.tags, synonyms: d.synonyms, title: d.word })
    const ev = pages.evidence?.get(c); if (ev) det.evidence = ev
    if (pages.posOf) det.pos = c.lemmas.map(l => (l.startsWith('~') ? '' : pages.posOf!(l)))
    details[c.id] = det; seen.add(k)
  }
  const attestedIds = titles.map(t => {
    const id = phraseId(idiomWords(t)), k = phraseKey(idiomWords(t)), d = kk.get(k)?.[0], det: PhraseDetail = details[id] ?? { kind: 'attested' }
    det.kind = 'attested'; det.title = t
    if (d) Object.assign(det, { gloss: d.gloss, etymology: d.etymology, tags: d.tags, synonyms: d.synonyms })
    details[id] = det; seen.add(k); return id
  })
  const dict: { id: string; t: string }[] = []
  for (const [k, es] of kk) {
    const e = es.find(x => x.pos === 'proverb' || x.pos === 'prep_phrase'); if (!e || seen.has(k)) continue
    const id = phraseId(idiomWords(e.word)); dict.push({ id, t: e.word })
    details[id] = { kind: 'dict', title: e.word, gloss: e.gloss, etymology: e.etymology, tags: e.tags, synonyms: e.synonyms }
  }
  dict.sort((a, b) => a.t.localeCompare(b.t, 'uk'))
  const shards = new Map<string, Record<string, PhraseDetail>>()
  for (const [id, det] of Object.entries(details)) { const s = detailShardOf(id), m = shards.get(s) ?? {}; m[id] = det; shards.set(s, m) }
  mkdirSync(resolve(pub, 'phr'), { recursive: true })
  for (const [s, m] of shards) writeFileSync(resolve(pub, 'phr', s + '.json'), JSON.stringify({ format: 1, details: m }))
  writeFileSync(resolve(pub, 'phrases.json'), JSON.stringify({
    format: 1, generated, method: PHRASE_METHOD,
    note: 'кандидати — модель (асоціація logDice × архаїчність), а не словникові факти (P-1.7); «засвідчений фразеологізм» — окремий клас зі словникових категорій',
    attestedSource: { name: 'Вікісловник (uk): Категорія:Фразеологізми, Категорія:Українські фразеологізми', licence: 'CC BY-SA 4.0', retrieved: w?.retrieved ?? '', url: 'https://uk.wiktionary.org/wiki/Категорія:Фразеологізми' },
    attested: titles, attestedIds, dict, candidates: top, formulas, frames: frames.slice(0, 500),
  }))
  return { candidates: top.length, formulas: formulas.length, attestedTitles: titles.length, matched, details: Object.keys(details).length, withGloss: Object.values(details).filter(d => d.gloss?.length).length, withEtymology: Object.values(details).filter(d => d.etymology?.length).length, withEvidence: Object.values(details).filter(d => d.evidence).length }
}
