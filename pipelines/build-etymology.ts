/** BUILD step ET-1…ET-3: merges the harvested Wiktionary etymologies (data/work/etymology-kaikki.json), the cite-only ЕСУМ quotes (etymology-goroh.json) and the project hypotheses
 *  (pipelines/etymology-hypotheses.json) into public/data/etymology.json for the lemmas of the lexicon. Absent inputs simply give fewer entries. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isKnown } from '../core/evidence.ts'
import { buildEtymology, type EtymHypothesis, type EtymologyFile, type KaikkiRec } from '../core/etymology.ts'
import type { FamilyLink } from '../core/etymology.ts'
import type { UkEtymStage } from './build-etymuk.ts'
import type { LemmaCard } from '../core/types.ts'

const rdj = <T>(p: string, d: T): T => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) as T : d)

export function writeEtymology(
  cards: Pick<LemmaCard, 'lemma' | 'first'>[], root: string, pub: string, generated: string, ukw?: Pick<UkEtymStage, 'dump' | 'date' | 'entries'>): { entries: number; conflicts: number; uk: number; ukOnly: number; ukAlso: number; ukEsum: number } {
  const kk = rdj<{ file: string; sha256: string; extracted: string; words: Record<string, KaikkiRec> } | undefined>(resolve(root, 'data/work/etymology-kaikki.json'), undefined)
  const gh = rdj<Record<string, string | null>>(resolve(root, 'data/work/etymology-goroh.json'), {})
  const hyps = rdj<(EtymHypothesis & { lemma: string })[]>(resolve(root, 'pipelines/etymology-hypotheses.json'), [])
  const fam = rdj<{ edges: { a: string; b: string; rel: string; basis: FamilyLink['basis']; evidence: FamilyLink['evidence'] }[] }[]>(resolve(root, 'pipelines/word-families.json'), []).flatMap(g => g.edges)
  const have = new Set(cards.map(c => c.lemma))
  const famOf = (l: string): FamilyLink[] => fam.flatMap(e => e.a === l ? [{ lemma: e.b, rel: e.rel, basis: e.basis, evidence: e.evidence, inLexicon: have.has(e.b) }] : e.b === l ? [{ lemma: e.a, rel: e.rel, basis: e.basis, evidence: e.evidence, inLexicon: have.has(e.a) }] : [])
  const entries: EtymologyFile['entries'] = {}
  let conflicts = 0, nUk = 0, ukOnly = 0, ukAlso = 0, ukEsum = 0
  for (const c of cards) {
    const first = isKnown(c.first) ? c.first.value.date : undefined
    const e = buildEtymology(c.lemma, kk?.words[c.lemma], gh[c.lemma] ?? undefined, hyps.filter(h => h.lemma === c.lemma).map(({ lemma: _l, ...h }) => h), first, kk?.extracted ?? '', famOf(c.lemma), ukw?.entries[c.lemma], ukw?.dump.replace(/^ukwiktionary-(d{4})(dd)(dd).*$/, '$1-$2-$3') ?? '')
    if (e) {
      entries[c.lemma] = e; if (e.conflict) conflicts++
      if (e.uk) { nUk++; if (e.text) ukAlso++; else if (!e.sources.some(s => s.source === 'ESUM')) ukOnly++; if (e.uk.cites?.some(x => x.src === 'ЕСУМ')) ukEsum++ }
    }
  }
  const file: EtymologyFile = {
    format: 1, generated,
    attribution: {
      wiktionary: 'Тексти етимологій — Вікісловник (en.wiktionary.org), автори статей; витяг Wiktextract / kaikki.org (Tatu Ylönen)', licence: 'CC BY-SA 4.0 — зберігайте атрибуцію й ліцензію',
      esum: 'Цитати ЕСУМ — за дзеркалом goroh.pp.ua, ≤ 2 фрагменти, з посиланням на сторінку',
      kaikki: { file: kk?.file ?? '', sha256: kk?.sha256 ?? '', extracted: kk?.extracted ?? '' },
      ...(ukw ? { ukwikt: { dump: ukw.dump, date: ukw.date, licence: 'CC BY-SA 4.0' } } : {}),
    },
    entries,
  }
  writeFileSync(resolve(pub, 'etymology.json'), JSON.stringify(file))
  return { entries: Object.keys(entries).length, conflicts, uk: nUk, ukOnly, ukAlso, ukEsum }
}
