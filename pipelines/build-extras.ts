/**
 * BUILD exports requested by the W10 stream (lazy-loaded, not part of the core):
 *  - public/data/loanlabels.json   LW-2  en.wiktionary donor categories → { labels: { lemma: [donorCode, sourceLine] } }  (CC BY-SA 4.0, attribution in the header)
 *  - public/data/heteronyms.json   HT-1  ukrainian-word-stress forms whose output is ambiguous → CANDIDATES only (method 'dictionary', status 'unknown'; never verified pairs)
 * Inputs are the harvest cache data/work/loanlabels-raw.json (pipelines/loan-labels.ts) and data/work/stress.json (nlp/stress.py).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ARTISTS, SONGS, SONGS_POLICY } from '../core/songs.ts'
import { parseSenses, type SensesFile } from '../core/senses.ts'
import type { SongVocab } from './song-vocab.ts'

const rdj = <T>(p: string): T | undefined => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) as T : undefined)
const SINGLE = /^[а-яіїєґ'’-]+$/i

export function writeLoanLabels(root: string, pub: string): number {
  const raw = rdj<{ retrieved: string; categories: Record<string, { donor: string; members: string[] }> }>(resolve(root, 'data/work/loanlabels-raw.json'))
  if (!raw) return 0
  const labels: Record<string, [string, string]> = {}, multi: Record<string, [string, string][]> = {}
  for (const [cat, { donor, members }] of Object.entries(raw.categories)) for (const m of members) {
    if (!SINGLE.test(m)) continue
    const row: [string, string] = [donor, `en.wiktionary Category:${cat}`]
    ;(multi[m] ??= []).push(row)
    labels[m] ??= row
  }
  for (const k of Object.keys(multi)) if (multi[k]!.length < 2) delete multi[k]
  writeFileSync(resolve(pub, 'loanlabels.json'), JSON.stringify({
    format: 1, retrieved: raw.retrieved, licence: 'CC BY-SA 4.0',
    attribution: 'Мітки походження — категорії «Ukrainian terms borrowed from …» англійського Вікісловника (en.wiktionary.org), автори статей; ліцензія CC BY-SA 4.0. Мітки редакторів, не факти проєкту (research/26 §5).',
    labels, multi,
  }))
  return Object.keys(labels).length
}

interface StressJson { source: string; forms: Record<string, { stressed: string; positions: number[]; ambiguous?: boolean }[]> }
/** NW-7: public/data/songs.json (song metadata, ≤ 2-line quotations, YouTube ids) for the media views. */
export function writeSongs(pub: string, generated: string, vocab: Record<string, SongVocab> = {}): number {
  writeFileSync(resolve(pub, 'songs.json'), JSON.stringify({ format: 1, generated, policy: SONGS_POLICY, songs: SONGS, artists: ARTISTS, vocab }))
  return SONGS.length
}

export function writeHeteronymCandidates(root: string, pub: string): number {
  const s = rdj<StressJson>(resolve(root, 'data/work/stress.json'))
  if (!s) return 0
  const forms: Record<string, string[]> = {}
  for (const [f, vs] of Object.entries(s.forms)) {
    const st = [...new Set(vs.filter(v => v.ambiguous).map(v => v.stressed))]
    if (st.length >= 2) forms[f] = st
  }
  writeFileSync(resolve(pub, 'heteronyms.json'), JSON.stringify({
    format: 1, method: 'dictionary', status: 'unknown', source: s.source,
    note: 'кандидати: слово має кілька наголосів у виводі ukrainian-word-stress; це не підтверджені пари омографів (HT-1, P-1.7)', forms,
  }))
  return Object.keys(forms).length
}

/**
 * BL-9: public/data/senses.json = { lemma: [{ gloss, pos?, stress?, source }] } from the uk.wiktionary harvest cache (data/raw/wikt/senses-*.json, pipelines/senses-wikt.ts).
 * CC BY-SA 4.0: `source` keeps the revision id of every sense; the UI attributes «Вікісловник (uk), CC BY-SA 4.0» with the permalink. Absent cache → nothing written (an existing file stays).
 * Returns the lemmas with senses, the lemmas looked up (cache coverage) and how many senses carry a stress.
 */
/** The uk.wiktionary senses of the given lemmas from the harvest cache (BL-9); shared by writeSenses and the SE stage. Empty when there is no cache. */
export function collectSenses(root: string, lemmas: Iterable<string>): { out: SensesFile; looked: number; senses: number; withStress: number } | undefined {
  const dir = resolve(root, 'data/raw/wikt')
  if (!existsSync(dir)) return undefined
  const pages = new Map<string, { revid: number; content: string; retrieved: string }>(), looked = new Set<string>()
  for (const f of readdirSync(dir).filter(x => /^senses-.*\.json$/.test(x)).sort()) {
    const b = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as { retrieved: string; pages: { title: string; revid?: number; content?: string; missing?: true }[] }
    for (const p of b.pages) { looked.add(p.title); if (!p.missing && p.content && p.revid) pages.set(p.title, { revid: p.revid, content: p.content, retrieved: b.retrieved }) }
  }
  if (!pages.size) return undefined
  const out: SensesFile = {}
  let senses = 0, withStress = 0, nl = 0
  for (const l of lemmas) {
    if (!looked.has(l)) continue
    nl++
    const p = pages.get(l)
    if (!p) continue
    const s = parseSenses(p.content, p.revid, l)
    if (!s.length) continue
    out[l] = s; senses += s.length; withStress += s.filter(x => x.stress).length
  }
  return { out, looked: nl, senses, withStress }
}
export function writeSenses(root: string, pub: string, lemmas: Iterable<string>): { lemmas: number; looked: number; withStress: number; senses: number } {
  const c = collectSenses(root, lemmas)
  if (!c) return { lemmas: 0, looked: 0, withStress: 0, senses: 0 }
  writeFileSync(resolve(pub, 'senses.json'), JSON.stringify(c.out))
  return { lemmas: Object.keys(c.out).length, looked: c.looked, withStress: c.withStress, senses: c.senses }
}
