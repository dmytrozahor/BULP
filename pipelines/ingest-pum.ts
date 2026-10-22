/**
 * SPEC 63 RF-8 / RF-11: put the charters of the «Пам'ятки української мови» editions into data/work as Ukrainian/Ruthenian witnesses, one witness per charter, each with its own date from the edition:
 *   pum14 — «Грамоти XIV ст.» (Пещак 1974; 82 charters, transcription of izbornyk.org.ua/gramxiv), data/seed/pum14/gr14_<№>.json, witnessType `scholarly_ed`;
 *   pum15 — «Українські грамоти XV ст.» (Русанівський 1965; read from the owner's scan by pipelines/pum-gen.ts), data/seed/pum15/gr15_<№>.json, witnessType `ocr` (OQ-gated);
 *   vol16 — «Волинські грамоти XVI ст.» (Задорожний, Матвієнко 1995; OCR of the owner's scan, pipelines/pum-vol16.ts), data/seed/vol16/gv16_<№>.json, witnessType `ocr` (OQ-gated).
 * The files are tracked (they were once only on one machine in %TEMP%\pum_hold, so no rebuild could include them: the build dropped them as «автор pum14 не має запису верифікації»).
 * `npm run ingest:pum [-- --out <dir>]`. Idempotent (a file is rewritten only when it differs), atomic writes (RS-1); a malformed seed file fails the run.
 * RF-11 dedupe: a charter is counted once. The vetted edition wins — pum14 (transcription) over pum15 over vol16 — and a charter whose text duplicates an earlier one (core 4-gram containment, pipelines/pum-ed.ts) is NOT
 * written (and a stale work file of it is removed); the same check runs against the izbornyk `hv_lit_*` witnesses already in the work dir. The run lists every duplicate.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'node:fs'
import type { WitnessOut } from '../core/types.ts'
import { writeAtomic } from '../harvest/lib.ts'
import { dedupe } from './pum-ed.ts'

export const PUM_SEED = 'data/seed/pum14'
export interface PumSet { dir: string; file: RegExp; author: string; range: [number, number]; witnessType: string; vetted: string }
export const PUM_SETS: PumSet[] = [
  { dir: PUM_SEED, file: /^gr14_\d+\.json$/, author: 'pum14', range: [1250, 1450], witnessType: 'scholarly_ed', vetted: 'transcription' },
  { dir: 'data/seed/pum15', file: /^gr15_\d+\.json$/, author: 'pum15', range: [1400, 1500], witnessType: 'ocr', vetted: 'print' },
  { dir: 'data/seed/vol16', file: /^gv16_\d+\.json$/, author: 'vol16', range: [1500, 1600], witnessType: 'ocr', vetted: 'print' },
]
export function checkCharter(w: WitnessOut, file: string, set: PumSet = PUM_SETS[0]!): string[] {
  const bad: string[] = []
  const pre = file.replace(/_\d+\.json$/, '')
  if (!w.id.startsWith(`${pre}_`) || file !== `${w.id}.json` || !set.file.test(file)) bad.push('id')
  if (w.author !== set.author || w.unit !== set.author) bad.push('author')
  if (w.lang !== 'ruthenian') bad.push('lang')
  if (w.witnessType !== set.witnessType) bad.push('witnessType')
  if (!Array.isArray(w.date) || w.date.length !== 2 || !(w.date[0] <= w.date[1]) || w.date[0] < set.range[0] || w.date[1] > set.range[1]) bad.push('date')
  if (w.dateCite?.kind !== 'Q' || !w.dateCite.quote) bad.push('dateCite')
  if (!Array.isArray(w.tokens) || w.tokens.length < 10) bad.push('tokens')
  return bad
}
/** the izbornyk witnesses already in the work dir (litopys/izbornyk pages: hv_lit_*): another transcription of the same charter must not be counted again */
export function workCharters(out: string): WitnessOut[] {
  if (!existsSync(out)) return []
  return readdirSync(out).filter(f => /^hv_lit_.*\.json$/.test(f)).map(f => JSON.parse(readFileSync(`${out}/${f}`, 'utf8')) as WitnessOut).filter(w => w.date && w.date[0] >= 1250 && w.date[1] <= 1600 && Array.isArray(w.tokens))
}
export function main(argv: string[]) {
  const i = argv.indexOf('--out'), out = (i >= 0 ? argv[i + 1] : undefined) ?? 'data/work'
  mkdirSync(out, { recursive: true })
  const admitted: WitnessOut[] = [...workCharters(out)]
  let written = 0
  for (const set of PUM_SETS) {
    const seed = set.author === 'pum14' ? (process.env.PUM_SEED ?? set.dir) : set.dir
    if (!existsSync(seed)) { if (set.author === 'pum14') throw new Error(`${seed} is missing`); console.log(`${set.author}: no seed dir yet — skipped`); continue }
    const cands: { w: WitnessOut; raw: string; f: string }[] = []
    for (const f of readdirSync(seed).filter(f => set.file.test(f)).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))) {
      const raw = readFileSync(`${seed}/${f}`, 'utf8'), w = JSON.parse(raw) as WitnessOut
      const bad = checkCharter(w, f, set); if (bad.length) throw new Error(`${seed}/${f}: ${bad.join(', ')}`)
      cands.push({ w, raw, f })
    }
    // the transcription of the 1974 edition is the vetted text of record: always kept (RF-8: 82 charters, unchanged); the print readings are checked against everything admitted before them
    const all = cands.map(c => c.w), { kept, duplicates } = set.vetted === 'transcription' ? { kept: all, duplicates: [] } : dedupe(admitted, all)
    const keepIds = new Set(kept.map(k => k.id)); let n = 0, tok = 0, rm = 0
    for (const c of cands) {
      const dst = `${out}/${c.f}`
      if (!keepIds.has(c.w.id)) { if (existsSync(dst)) { unlinkSync(dst); rm++ } continue }
      if (!existsSync(dst) || readFileSync(dst, 'utf8') !== c.raw) { writeAtomic(dst, c.raw); written++ }
      n++; tok += c.w.tokens.length; admitted.push(c.w)
    }
    console.log(`${set.author}: ${n} charters, ${tok} tokens${duplicates.length ? `; ${duplicates.length} duplicate(s) of an earlier edition not counted: ${duplicates.map(d => `${d.id} = ${d.of} (${d.share})`).join(', ')}` : ''}${rm ? `; ${rm} stale file(s) removed` : ''}`)
  }
  console.log(`pum: ${written} file(s) written`)
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('pipelines/ingest-pum.ts')) main(process.argv.slice(2))
