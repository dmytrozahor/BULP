/**
 * BUILD exports requested by the W10 stream (lazy-loaded, not part of the core):
 *  - public/data/loanlabels.json   LW-2  en.wiktionary donor categories → { labels: { lemma: [donorCode, sourceLine] } }  (CC BY-SA 4.0, attribution in the header)
 *  - public/data/heteronyms.json   HT-1  ukrainian-word-stress forms whose output is ambiguous → CANDIDATES only (method 'dictionary', status 'unknown'; never verified pairs)
 * Inputs are the harvest cache data/work/loanlabels-raw.json (pipelines/loan-labels.ts) and data/work/stress.json (nlp/stress.py).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ARTISTS, SONGS, SONGS_POLICY } from '../core/songs.ts'

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
export function writeSongs(pub: string, generated: string): number {
  writeFileSync(resolve(pub, 'songs.json'), JSON.stringify({ format: 1, generated, policy: SONGS_POLICY, songs: SONGS, artists: ARTISTS }))
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
