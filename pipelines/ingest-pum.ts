/**
 * SPEC 63 RF-8: put the 82 charters of «Грамоти XIV ст.» (Пещак 1974; transcription of izbornyk.org.ua/gramxiv) into data/work as Ukrainian/Ruthenian witnesses (author `pum14`, pipelines/nw-pum.ts).
 * The files are tracked in data/seed/pum14/ (they were only ever on one machine in %TEMP%\pum_hold, so no rebuild could include them: the build dropped them as «автор pum14 не має запису верифікації»).
 * `npm run ingest:pum [-- --out <dir>]`. Idempotent (a file is rewritten only when it differs), atomic writes (RS-1); a malformed seed file fails the run.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import type { WitnessOut } from '../core/types.ts'
import { writeAtomic } from '../harvest/lib.ts'

export const PUM_SEED = 'data/seed/pum14'
export function checkCharter(w: WitnessOut, file: string): string[] {
  const bad: string[] = []
  if (!/^gr14_\d+$/.test(w.id) || file !== `${w.id}.json`) bad.push('id')
  if (w.author !== 'pum14' || w.unit !== 'pum14') bad.push('author')
  if (w.lang !== 'ruthenian') bad.push('lang')
  if (!Array.isArray(w.date) || w.date.length !== 2 || !(w.date[0] <= w.date[1]) || w.date[0] < 1250 || w.date[1] > 1450) bad.push('date')
  if (w.dateCite?.kind !== 'Q' || !w.dateCite.quote) bad.push('dateCite')
  if (!Array.isArray(w.tokens) || w.tokens.length < 10) bad.push('tokens')
  return bad
}
export function main(argv: string[]) {
  const i = argv.indexOf('--out'), out = (i >= 0 ? argv[i + 1] : undefined) ?? 'data/work'
  const seed = process.env.PUM_SEED ?? PUM_SEED
  if (!existsSync(seed)) throw new Error(`${seed} is missing`)
  mkdirSync(out, { recursive: true })
  let n = 0, tok = 0, written = 0
  for (const f of readdirSync(seed).filter(f => /^gr14_\d+\.json$/.test(f)).sort()) {
    const raw = readFileSync(`${seed}/${f}`, 'utf8'), w = JSON.parse(raw) as WitnessOut
    const bad = checkCharter(w, f); if (bad.length) throw new Error(`${seed}/${f}: ${bad.join(', ')}`)
    const dst = `${out}/${f}`
    if (!existsSync(dst) || readFileSync(dst, 'utf8') !== raw) { writeAtomic(dst, raw); written++ }
    n++; tok += w.tokens.length
  }
  console.log(`pum14: ${n} charters, ${tok} tokens (${written} written)`)
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('pipelines/ingest-pum.ts')) main(process.argv.slice(2))
