/**
 * BUILD step MM-45: public/data/oa.json (-> lm/oa/<bucket>.json by build-parts): modern і- lemma -> the и- spelling Грінченко 1907–09 / Желехівський 1886 print (core/orth-attested.ts).
 * Reads data/work/r2u-rows.json (pipelines/ingest-r2u.ts); a lemma counts when it is a card of the lexicon or a VESUM headword. Idempotent, atomic (RS-1).
 *   tsx pipelines/build-orth-attested.ts            (standalone: lemma set = VESUM headwords)
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { attestedInitI, type OaFile, type OaRow } from '../core/orth-attested.ts'
import { writeJsonAtomic } from './robust.ts'

const lk = (s: string) => s.normalize('NFC').replace(/[́]/g, '').toLowerCase()

export function writeOrthAttested(root: string, pub: string, generated: string, lemmas: Iterable<string>): { lemmas: number; zhel: number; kul: number } {
  const p = resolve(root, 'data/work/r2u-rows.json')
  if (!existsSync(p)) return { lemmas: 0, zhel: 0, kul: 0 }
  const rows = (JSON.parse(readFileSync(p, 'utf8')) as { rows: OaRow[] }).rows
  const have = new Set([...lemmas].map(lk))
  const found = attestedInitI(rows, l => have.has(l))
  const entries = Object.fromEntries(Object.entries(found).sort((a, b) => a[0].localeCompare(b[0], 'uk')))
  const file: OaFile = { format: 1, generated, entries }
  writeJsonAtomic(resolve(pub, 'oa.json'), JSON.stringify(file))
  const v = Object.values(entries)
  return { lemmas: v.length, zhel: v.filter(e => e.zhel).length, kul: v.filter(e => e.kul).length }
}

if (process.argv[1] && /build-orth-attested\.ts$/.test(process.argv[1].replace(/[\\]/g, '/'))) {
  const { vesumLemmaList } = await import('./vesum.ts')
  const root = resolve(process.argv[2] ?? '.'), pub = resolve(process.argv[3] ?? 'public/data')
  const r = writeOrthAttested(root, pub, new Date().toISOString(), (await vesumLemmaList()).keys())
  console.log(`oa.json (MM-45): ${r.lemmas} lemmas gain an attested initial-и spelling (Желехівський ${r.zhel}, Грінченко ${r.kul})`)
}
