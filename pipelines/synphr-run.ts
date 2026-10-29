/** `tsx pipelines/synphr-run.ts [rawRoot]` — GG-12/13 standalone: known = VESUM lemmas ∪ lexicon cards ∪ dictionary-only cards. rawRoot (default: this repo) holds data/raw; outputs go to data/work here. */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lk } from '../core/cv.ts'
import { writeSynPhr } from './build-synphr.ts'
import { fileLines, lemmaLines } from './vesum.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'), raw = process.argv[2] ? resolve(process.argv[2]) : ROOT
const known = new Set<string>()
for (const k of (await lemmaLines(fileLines(resolve(raw, 'data/raw/vesum/dict_corp_vis.txt')))).keys()) known.add(k)
const nV = known.size
const lex = JSON.parse(readFileSync(resolve(ROOT, 'public/data/lexicon.json'), 'utf8')) as { cards: Record<string, unknown> | unknown[] }
const cardKeys = Array.isArray(lex.cards) ? lex.cards.map(c => String(Array.isArray(c) ? c[0] : c)) : Object.keys(lex.cards)
for (const c of cardKeys) known.add(lk(c))
const ci = JSON.parse(readFileSync(resolve(ROOT, 'public/data/cardindex.json'), 'utf8')) as { lw: string[] }
for (const c of ci.lw) known.add(lk(c))
console.log(`known lemmas: ${known.size} (VESUM ${nV}, lexicon cards ${cardKeys.length}, dict-only cards ${ci.lw.length})`)
const t0 = Date.now(), stats = await writeSynPhr(raw, ROOT, k => known.has(k))
console.log(JSON.stringify(stats, null, 1), `${((Date.now() - t0) / 1000).toFixed(0)} s`)
