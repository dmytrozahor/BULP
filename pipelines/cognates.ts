/**
 * BL-15 harvest (offline): data/raw/kaikki/{Proto-Slavic,Old Polish,Old East Slavic,Belarusian}.jsonl + {Polish,Russian}.filtered.jsonl (pipelines/kaikki-filter.ts)
 * → data/work/cognates-kaikki.json = { files[], pivots: { <uk word, stress stripped>: { pivot, gloss, rows[] } } }.
 * Join: Proto-Slavic record with a `uk` node in its `descendants` tree → every pl / be / ru / Old Polish / Old Ruthenian / Old East Slavic node of that tree;
 * dates from the cognate's own Wiktionary etymology text or the tree tag (core/cognates.ts). Run: npm run data:cognates
 */
import { createHash } from 'node:crypto'
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cognateDating, stripAccent, treeTagDating, type CogLang, type CogRow } from '../core/cognates.ts'

const ROOT = resolve(import.meta.dirname, '..'), RAW = resolve(ROOT, 'data/raw/kaikki')
const FILES: { file: string; url: string; lang?: CogLang }[] = [
  { file: 'kaikki.org-dictionary-ProtoSlavic.jsonl', url: 'https://kaikki.org/dictionary/Proto-Slavic/kaikki.org-dictionary-ProtoSlavic.jsonl' },
  { file: 'kaikki.org-dictionary-OldPolish.jsonl', url: 'https://kaikki.org/dictionary/Old%20Polish/kaikki.org-dictionary-OldPolish.jsonl', lang: 'zlw-opl' },
  { file: 'kaikki.org-dictionary-OldEastSlavic.jsonl', url: 'https://kaikki.org/dictionary/Old%20East%20Slavic/kaikki.org-dictionary-OldEastSlavic.jsonl', lang: 'orv' },
  { file: 'kaikki.org-dictionary-Belarusian.jsonl', url: 'https://kaikki.org/dictionary/Belarusian/kaikki.org-dictionary-Belarusian.jsonl', lang: 'be' },
  { file: 'Polish.filtered.jsonl', url: 'https://kaikki.org/dictionary/Polish/kaikki.org-dictionary-Polish.jsonl', lang: 'pl' },
  { file: 'Russian.filtered.jsonl', url: 'https://kaikki.org/dictionary/Russian/kaikki.org-dictionary-Russian.jsonl', lang: 'ru' },
]
const wanted = new Set<string>(['pl', 'be', 'ru', 'zlw-opl', 'zle-ort', 'orv'])
const lines = (f: string) => readFileSync(resolve(RAW, f), 'utf8').replace(/^﻿/, '').split('\n').filter(Boolean).map(l => JSON.parse(l))

interface Node { lang_code: string; word?: string; raw_tags?: string[]; descendants?: Node[] }
interface Tree { lang_code?: string; descendants?: Node[] }

// 1. dates of cognate entries: lang|word → earliest dating
const dates = new Map<string, { from: number; to: number; quote: string }>()
for (const f of FILES.filter(x => x.lang)) {
  for (const e of lines(f.file)) {
    const d = e.etymology_text ? cognateDating(e.etymology_text) : undefined
    if (!d) continue
    const k = `${e.lang_code}|${stripAccent(e.word)}`, o = dates.get(k)
    if (!o || d.from < o.from) dates.set(k, d)
  }
}

// 2. Proto-Slavic pivot → rows
const pivots: Record<string, { pivot: string; gloss?: string; rows: CogRow[] }> = {}
let psl = 0, withUk = 0
for (const e of lines(FILES[0]!.file)) {
  psl++
  if (!e.descendants) continue
  const rows = new Map<string, CogRow>(), uks = new Set<string>()
  const walk = (ns: Node[], underUk: boolean) => {
    for (const n of ns) {
      const w = n.word
      if (n.lang_code === 'uk' && w) uks.add(stripAccent(w))
      if (w && !w.startsWith('*') && wanted.has(n.lang_code)) {
        const l = n.lang_code as CogLang, key = `${l}|${stripAccent(w)}`
        if (!rows.has(key)) {
          const dd = dates.get(key), dt = dd ? { ...dd, k: 'etym' as const } : (() => { const t = treeTagDating(n.raw_tags); return t ? { ...t, k: 'tree' as const } : undefined })()
          const borrowed = underUk || (n.raw_tags ?? []).includes('borrowed')
          rows.set(key, { l, w, ...(borrowed ? { b: 1 as const } : {}), ...(dt ? { d: [dt.from, dt.to] as [number, number], q: dt.quote.slice(0, 160), k: dt.k } : {}) })
        }
      }
      if (n.descendants) walk(n.descendants, underUk || n.lang_code === 'uk')
    }
  }
  walk(e.descendants as Node[], false)
  if (!uks.size) continue
  withUk++
  const rs = [...rows.values()]
  if (!rs.length) continue
  const pivot = String(e.word), gloss = e.senses?.[0]?.glosses?.[0] as string | undefined
  for (const u of uks) {
    const cur = pivots[u]
    if (!cur || cur.rows.length < rs.length) pivots[u] = { pivot, ...(gloss ? { gloss: gloss.slice(0, 80) } : {}), rows: rs }
  }
}
const files = FILES.map(f => { const p = resolve(RAW, f.file); return { file: f.file, url: f.url, bytes: statSync(p).size, sha256: createHash('sha256').update(readFileSync(p)).digest('hex'), date: '2026-10-14' } })
writeFileSync(resolve(ROOT, 'data/work/cognates-kaikki.json'), JSON.stringify({ files, pivots }))
const nd = Object.values(pivots).filter(p => p.rows.some(r => r.d)).length
console.log(`PSl records ${psl}, with uk node ${withUk}; uk words with cognates ${Object.keys(pivots).length}, with a dated cognate ${nd}; dated forms indexed ${dates.size}`)
