/**
 * Sophia text-field audit (BL-10 follow-up, SPEC 62): which text field the ingested inscriptions can be analysed from, and which private-use / unassigned
 * code points the portal's `transcription` contains. Read-only over the cached API pages (data/raw/sophia); run `npx tsx pipelines/sophia-measure.ts`.
 * "Ingested" = the witness set produced by the ingestion at the time the script is run, so the counts follow the gates of ingest-sophia.ts.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { htmlText, ingestRows } from './ingest-sophia.ts'

const DIR = 'data/raw/sophia'
export const PUA_OR_UNASSIGNED = /[\p{Co}\p{Cn}�]/u
const words = (s: string) => s.split(/\s+/).filter(x => /\p{L}/u.test(x)).length

export interface Measure {
  rows: number; ingested: number
  /** an interpretative_edition exists: with word spacing (≥ 2 words) / a single word */
  edition: { spaced: number; oneWord: number }
  /** no edition: the diplomatic transcription is all there is — spaced (≥ 2 words) / continuous (one run per line) */
  transcriptionOnly: { spaced: number; continuous: number }
  /** inscriptions whose transcription holds ≥ 1 private-use / unassigned code point */
  withPuaOrUnassigned: number
  codePoints: { cp: string; n: number; inscriptions: number; example: string }[]
}

export function measure(rows: any[]): Measure {
  const ing = new Set(ingestRows(rows).witnesses.map(w => Number(w.id.slice(7))))
  const m: Measure = { rows: rows.length, ingested: ing.size, edition: { spaced: 0, oneWord: 0 }, transcriptionOnly: { spaced: 0, continuous: 0 }, withPuaOrUnassigned: 0, codePoints: [] }
  const cp = new Map<string, { n: number; ids: Set<number>; example: string }>()
  for (const r of rows) {
    if (!ing.has(r.id)) continue
    const tr = htmlText(r.transcription).trim(), ie = htmlText(r.interpretative_edition).trim()
    if (ie) words(ie) > 1 ? m.edition.spaced++ : m.edition.oneWord++
    else if (tr) {
      const lines = tr.split(/\n|\s\|\s/).filter(l => /\p{L}/u.test(l))
      lines.every(l => words(l) <= 1) ? m.transcriptionOnly.continuous++ : m.transcriptionOnly.spaced++
    }
    let any = false
    for (const c of tr) if (PUA_OR_UNASSIGNED.test(c)) {
      any = true
      const k = 'U+' + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')
      const o = cp.get(k) ?? cp.set(k, { n: 0, ids: new Set(), example: tr.replace(/\n+/g, ' ⏎ ').slice(0, 40) }).get(k)!
      o.n++; o.ids.add(r.id)
    }
    if (any) m.withPuaOrUnassigned++
  }
  m.codePoints = [...cp].map(([k, v]) => ({ cp: k, n: v.n, inscriptions: v.ids.size, example: v.example })).sort((a, b) => b.n - a.n)
  return m
}

if (process.argv[1]?.endsWith('sophia-measure.ts')) {
  const rows = readdirSync(DIR).filter(n => /^\d{3}\.json$/.test(n)).sort().flatMap(n => JSON.parse(readFileSync(`${DIR}/${n}`, 'utf8')).results as any[])
  const m = measure(rows)
  console.log(JSON.stringify({ ...m, codePoints: undefined }, null, 1))
  console.log(m.codePoints.map(c => `${c.cp}  ${String(c.n).padStart(5)} chars in ${String(c.inscriptions).padStart(4)} inscriptions`).join('\n'))
}
