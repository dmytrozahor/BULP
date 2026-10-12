/** BUILD step ET-1…ET-3: merges the harvested Wiktionary etymologies (data/work/etymology-kaikki.json), the cite-only ЕСУМ quotes (etymology-goroh.json) and the project hypotheses
 *  (pipelines/etymology-hypotheses.json) into public/data/etymology.json for the lemmas of the lexicon. Absent inputs simply give fewer entries. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isKnown } from '../core/evidence.ts'
import { buildEtymology, type EtymHypothesis, type EtymologyFile, type KaikkiRec } from '../core/etymology.ts'
import type { LemmaCard } from '../core/types.ts'

const rdj = <T>(p: string, d: T): T => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) as T : d)

export function writeEtymology(cards: Pick<LemmaCard, 'lemma' | 'first'>[], root: string, pub: string, generated: string): { entries: number; conflicts: number } {
  const kk = rdj<{ file: string; sha256: string; extracted: string; words: Record<string, KaikkiRec> } | undefined>(resolve(root, 'data/work/etymology-kaikki.json'), undefined)
  const gh = rdj<Record<string, string | null>>(resolve(root, 'data/work/etymology-goroh.json'), {})
  const hyps = rdj<(EtymHypothesis & { lemma: string })[]>(resolve(root, 'pipelines/etymology-hypotheses.json'), [])
  const entries: EtymologyFile['entries'] = {}
  let conflicts = 0
  for (const c of cards) {
    const first = isKnown(c.first) ? c.first.value.date : undefined
    const e = buildEtymology(c.lemma, kk?.words[c.lemma], gh[c.lemma] ?? undefined, hyps.filter(h => h.lemma === c.lemma).map(({ lemma: _l, ...h }) => h), first, kk?.extracted ?? '')
    if (e) { entries[c.lemma] = e; if (e.conflict) conflicts++ }
  }
  const file: EtymologyFile = {
    format: 1, generated,
    attribution: {
      wiktionary: 'Тексти етимологій — Вікісловник (en.wiktionary.org), автори статей; витяг Wiktextract / kaikki.org (Tatu Ylönen)', licence: 'CC BY-SA 4.0 — зберігайте атрибуцію й ліцензію',
      esum: 'Цитати ЕСУМ — за дзеркалом goroh.pp.ua, ≤ 2 фрагменти, з посиланням на сторінку',
      kaikki: { file: kk?.file ?? '', sha256: kk?.sha256 ?? '', extracted: kk?.extracted ?? '' },
    },
    entries,
  }
  writeFileSync(resolve(pub, 'etymology.json'), JSON.stringify(file))
  return { entries: Object.keys(entries).length, conflicts }
}
