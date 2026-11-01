/**
 * BUILD step MM-45: public/data/oa.json (-> lm/oa/<bucket>.json by build-parts): modern і- lemma -> the и- spelling Грінченко 1907–09 / Желехівський 1886 print (core/orth-attested.ts).
 * Reads data/work/r2u-rows.json (pipelines/ingest-r2u.ts); a lemma counts when it is a card of the lexicon or a VESUM headword. Idempotent, atomic (RS-1).
 *   tsx pipelines/build-orth-attested.ts            (standalone: lemma set = VESUM headwords)
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { attestedFromZhel, attestedInitI, type OaEntry, type OaFile, type OaRow, type OaZhelIn } from '../core/orth-attested.ts'
import { writeJsonAtomic } from './robust.ts'

const lk = (s: string) => s.normalize('NFC').replace(/[́]/g, '').toLowerCase()

export function writeOrthAttested(root: string, pub: string, generated: string, lemmas: Iterable<string>, zhelFile = resolve(root, 'data/work/zhel-parsed.json')): { lemmas: number; zhel: number; kul: number; zhelFull: number; zhelChanged: number } {
  const p = resolve(root, 'data/work/r2u-rows.json')
  const have = new Set([...lemmas].map(lk))
  const rows = existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as { rows: OaRow[] }).rows : []
  const found: Record<string, OaEntry> = attestedInitI(rows, l => have.has(l))
  // SE-13: the headword spelling of the full 1886 print for every linked lemma (the r2u initial-и cite, a clean typed text, stays where there is one)
  let zhelFull = 0, zhelChanged = 0
  if (existsSync(zhelFile)) {
    try {
      const j = JSON.parse(readFileSync(zhelFile, 'utf8')) as { articles: OaZhelIn[] }
      for (const [k, e] of Object.entries(attestedFromZhel(j.articles, l => have.has(l)))) { const f = (found[k] ??= {}); if (!f.zhel) { f.zhel = e.zhel; zhelFull++; if (e.zhel!.form !== k) zhelChanged++ } }
    } catch { /* torn file: ignored, the next build reparses (RS-1) */ }
  }
  if (!rows.length && !zhelFull) return { lemmas: 0, zhel: 0, kul: 0, zhelFull, zhelChanged }
  const entries = Object.fromEntries(Object.entries(found).sort((a, b) => a[0].localeCompare(b[0], 'uk')))
  const file: OaFile = { format: 1, generated, entries }
  writeJsonAtomic(resolve(pub, 'oa.json'), JSON.stringify(file))
  const v = Object.values(entries)
  return { lemmas: v.length, zhel: v.filter(e => e.zhel).length, kul: v.filter(e => e.kul).length, zhelFull, zhelChanged }
}

if (process.argv[1] && /build-orth-attested\.ts$/.test(process.argv[1].replace(/[\\]/g, '/'))) {
  const { vesumLemmaList } = await import('./vesum.ts')
  const root = resolve(process.argv[2] ?? '.'), pub = resolve(process.argv[3] ?? 'public/data')
  const r = writeOrthAttested(root, pub, new Date().toISOString(), (await vesumLemmaList()).keys())
  console.log(`oa.json (MM-45): ${r.lemmas} lemmas gain an attested initial-и spelling (Желехівський ${r.zhel}, of them from the full 1886 print ${r.zhelFull} (${r.zhelChanged} spelled differently from the modern lemma), Грінченко ${r.kul})`)
}
