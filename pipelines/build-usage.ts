/** BUILD step UL-1: usage rows per lemma from VESUM lemma tags and the harvested uk.wiktionary label categories → public/data/usage.json (lemmas without any label are left out). */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { VESUM_LOC } from './build-annotate.ts'
import { usageRows, type UsageFile, type UsageRow } from '../core/usage.ts'
import { key } from '../core/text.ts'
import type { KaikkiTags } from './build-autolabel.ts'

export function writeUsage(lemmaTags: Map<string, string>, root: string, pub: string, generated: string, kaikki?: KaikkiTags, r2u?: Map<string, UsageRow[]>): { lemmas: number; wikt: number; vesum: number; kaikki: number; kaikkiOnly: number; r2u: number } {
  const wp = resolve(root, 'data/work/usage-wikt.json')
  const w = existsSync(wp) ? JSON.parse(readFileSync(wp, 'utf8')) as { retrieved: string; categories: Record<string, string[]> } : undefined
  const idx = new Map(Object.entries(w?.categories ?? {}).map(([c, m]) => [c, new Set(m)]))
  const lemmas: Record<string, UsageRow[]> = {}
  let nw = 0, nv = 0, nk = 0, nko = 0, nr = 0
  for (const [lemma, tags] of lemmaTags) {
    const rows = usageRows(lemma, tags, idx, kaikki?.get(key(lemma)), r2u?.get(key(lemma)))
    if (!rows.length) continue
    lemmas[lemma] = rows
    if (rows.some(r => r[1] === 'w')) nw++
    if (rows.some(r => r[1] === 'v')) nv++
    if (rows.some(r => r[1] === 'k')) nk++
    if (rows.some(r => r[1] === 'r')) nr++
    if (rows.every(r => r[1] === 'k' || r[1] === 'r')) nko++
  }
  const file: UsageFile = {
    format: 1, generated, vesumLoc: VESUM_LOC,
    wikt: { retrieved: w?.retrieved ?? '', licence: 'CC BY-SA 4.0', attribution: 'Мітки з категорій Вікісловника (uk.wiktionary.org); автори статей — на сторінках слів' },
    lemmas,
  }
  writeFileSync(resolve(pub, 'usage.json'), JSON.stringify(file))
  return { lemmas: Object.keys(lemmas).length, wikt: nw, vesum: nv, kaikki: nk, kaikkiOnly: nko, r2u: nr }
}
