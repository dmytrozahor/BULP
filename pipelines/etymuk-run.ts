/** `tsx pipelines/etymuk-run.ts [rawRoot]` — GG-11 standalone: parse the uk.wiktionary dump (rawRoot/data/raw/ukwikt-dump; default: this repo) → data/work/etymology-ukwikt.json, and print the local measurement
 *  against public/data/etymology.json (entries before) and the lexicon lemmas. */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeUkEtym } from './build-etymuk.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'), raw = process.argv[2] ? resolve(process.argv[2]) : ROOT
const t0 = Date.now(), s = await writeUkEtym(raw, ROOT)
if (!s) { console.log('no uk.wiktionary dump under', raw); process.exit(0) }
const rj = <T>(p: string): T | undefined => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) as T : undefined)
const E = rj<{ entries: Record<string, { text: string; sources: { source: string }[]; uk?: unknown }> }>(resolve(raw, 'public/data/etymology.json'))
const lex = rj<{ cards: Record<string, unknown> | unknown[] }>(resolve(raw, 'public/data/lexicon.json'))
const lemmas = new Set<string>(lex ? (Array.isArray(lex.cards) ? lex.cards.map(c => String(Array.isArray(c) ? c[0] : c)) : Object.keys(lex.cards)) : [])
const ci = rj<{ lw: string[] }>(resolve(raw, 'public/data/cardindex.json')); for (const l of ci?.lw ?? []) lemmas.add(l)
const uk = Object.keys(s.entries), inLex = uk.filter(l => lemmas.has(l))
const en = new Set(Object.entries(E?.entries ?? {}).filter(([, e]) => e.text).map(([l]) => l)), any = new Set(Object.keys(E?.entries ?? {}))
const esumCite = inLex.filter(l => s.entries[l]!.cites?.some(c => c.src === 'ЕСУМ')), esumAll = uk.filter(l => s.entries[l]!.cites?.some(c => c.src === 'ЕСУМ'))
const pg = esumAll.filter(l => s.entries[l]!.cites?.some(c => c.src === 'ЕСУМ' && c.page))
const out = {
  languageOnly: uk.filter(l => s.entries[l]!.lo).length, languageOnlyInLexicon: inLex.filter(l => s.entries[l]!.lo).length,
  withWord: uk.filter(l => !s.entries[l]!.lo).length, withWordInLexicon: inLex.filter(l => !s.entries[l]!.lo).length,
  newWithWordInLexicon: inLex.filter(l => !s.entries[l]!.lo && !en.has(l)).length, overlapWithWordInLexicon: inLex.filter(l => !s.entries[l]!.lo && en.has(l)).length,
  dump: s.dump, date: s.date, templates: s.templates, counts: s.counts, ukwiktEntries: uk.length, lexiconLemmas: lemmas.size, ukwiktInLexicon: inLex.length,
  enEtymBefore: en.size, anyEtymEntryBefore: any.size,
  afterLexiconOnly: new Set([...any, ...inLex]).size, newLemmas: inLex.filter(l => !en.has(l)).length, overlapWithEn: inLex.filter(l => en.has(l)).length,
  citeEsumAll: esumAll.length, citeEsumInLexicon: esumCite.length, citeEsumWithPage: pg.length, partial: uk.filter(l => s.entries[l]!.part).length,
  ms: Date.now() - t0,
}
console.log(JSON.stringify(out, null, 1))
