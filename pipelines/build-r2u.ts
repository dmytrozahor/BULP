/**
 * public/data/r2u.json (research/30 §5): the Russian-contact evidence from the r2u.org.ua dictionaries — for a Russian word, the Ukrainian equivalents each dictionary
 * gives (Уманець–Спілка 1893–98: «выглядеть» = видава́ти-ся, здава́ти-ся; Кримський: выглядывать = вигляда́ти …) and, for a Ukrainian headword, the Russian glosses (Ніковський 1927,
 * Грінченко 1907–09). A lemma's `by` list says in which articles it appears as the NATIVE equivalent of a Russian word — the dictionary-attested alternative that a
 * surzhyk/calque claim is measured against. Quotes are ≤ 300 characters; articles are not reproduced (cite-only, no licence on the portal).
 *
 * rows[i] = [dict, rowId, lookup, scope, head[], eq[], quote]   ·   by[lemma] = indices of the ru→uk rows whose equivalents contain the lemma (kept lemmas only)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { key } from '../core/text.ts'
import { fold } from '../core/orthography.ts'
import { R2U_DICTS, r2uDictById } from './r2u.ts'
import { tokenRaw, type RowsFile } from './ingest-r2u.ts'
import { buildRuHeadEntries, type RuHeadFile } from '../core/ru-head.ts'
import { writeJsonAtomic } from './robust.ts'

export interface R2uFile {
  format: 1; generated: string; lookups: number
  source: { site: string; licence: string; note: string }
  dicts: { id: number; unit: string; short: string; title: string; authors: string; years: [number, number]; dir: string; page: string }[]
  rows: [number, number, string, string, string[], string[], string][]
  by: Record<string, number[]>
}

export function buildR2u(rows: RowsFile, lemmas: string[], generated: string): R2uFile {
  const out: R2uFile['rows'] = rows.rows.filter(r => r.eq.length).map(r => [r.dict, r.rowId, r.q, r.scope, r.head, r.eq, r.text])
  const want = new Map(lemmas.map(l => [key(l), l])), by: Record<string, number[]> = {}
  out.forEach((r, i) => {
    const d = r2uDictById[r[0]]
    if (d?.dir !== 'ru-uk') return
    for (const e of r[5]) {
      // the dictionary's spelling folded to modern (core/orthography.ts); every fold candidate is tried against the kept lemmas
      const l = fold(tokenRaw(e), d.orth).map(c => want.get(key(c.form))).find((x): x is string => !!x)
      if (l && !(by[l] ??= []).includes(i)) by[l]!.push(i)
    }
  })
  return {
    format: 1, generated, lookups: rows.lookups,
    source: { site: 'https://r2u.org.ua', licence: 'не вказана (© r2u.org.ua; репозиторій brown-uk/r2u.org.ua порожній — лише трекер помилок)', note: 'Зберігаються написання заголовних слів/відповідників і цитата ≤ 300 знаків; статті не відтворюються (research/30)' },
    dicts: R2U_DICTS.map(d => ({ id: d.id, unit: d.unitId, short: d.short, title: d.title, authors: d.authors, years: d.years, dir: d.dir, page: d.page })),
    rows: out, by,
  }
}

/** SPEC 63 MM-36: public/data/ruhead.json (→ lm/ru/<bucket>.json): the ru→uk rows filed under the folded Russian headword, for the client classifier of Russian-looking forms (core/ru-contact.ts) */
export function buildRuHead(f: R2uFile): RuHeadFile {
  return { format: 1, generated: f.generated, entries: buildRuHeadEntries(f.rows, new Map(f.dicts.map(d => [d.id, { short: d.short, dir: d.dir }]))) }
}

/** build.ts hook: reads data/work/r2u-rows.json (written by the r2u ingester); nothing to do before the first lookups exist. */
export function writeR2u(root: string, pub: string, generated: string, lemmas: string[]): { rows: number; lookups: number; lemmasWith: number; ruHeads?: number } {
  const p = resolve(root, 'data/work/r2u-rows.json')
  if (!existsSync(p)) return { rows: 0, lookups: 0, lemmasWith: 0 }
  const f = buildR2u(JSON.parse(readFileSync(p, 'utf8')) as RowsFile, lemmas, generated)
  writeFileSync(resolve(pub, 'r2u.json'), JSON.stringify(f))
  const rh = buildRuHead(f); writeJsonAtomic(resolve(pub, 'ruhead.json'), JSON.stringify(rh))   // MM-36
  return { rows: f.rows.length, lookups: f.lookups, lemmasWith: Object.keys(f.by).length, ruHeads: Object.keys(rh.entries).length }
}
