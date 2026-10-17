/**
 * SPEC 63 AT-1/AT-2 (RS-1: resumable, atomic, idempotent): OCR pages of the owner's АУМ volume →
 *   data/atlas/aum<vol>-maps.json   (AT-1: maps, question quote, variants with settlement numbers)
 *   data/atlas/aum<vol>-areal.json  (AT-2: areal extent per variant from the commentary; map-image readings are kept across re-runs)
 * Usage: tsx pipelines/atlas-extract.ts <ocr-dir> [volume=2] [firstPage=9] [lastPage=103]
 * Reads page_NNNN.txt only; never runs OCR. A file is rewritten only if its content changed, via tmp+rename.
 */
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs'
import { splitCommentary, parseMap, arealOf } from '../core/atlas.ts'

const [dir, vol = '2', a = '9', b = '103'] = process.argv.slice(2)
if (!dir) { console.error('usage: tsx pipelines/atlas-extract.ts <ocr-dir> [volume] [firstPage] [lastPage]'); process.exit(2) }
let text = ''; const starts: [number, number][] = []   // [offset, page]
const missing: number[] = []
for (let p = +a; p <= +b; p++) {
  const f = `${dir}/page_${String(p).padStart(4, '0')}.txt`
  if (!existsSync(f)) { missing.push(p); continue }
  starts.push([text.length, p]); text += readFileSync(f, 'utf8') + '\n'
}
const pageAt = (o: number) => { let p = starts[0]?.[1] ?? 0; for (const [s, q] of starts) { if (s <= o) p = q; else break } return p }
const comm = splitCommentary(text)
const maps = comm.map(c => parseMap(+vol, c, pageAt(c.offset)))

const write = (dst: string, o: unknown) => {
  const json = JSON.stringify(o, null, 1) + '\n'
  mkdirSync('data/atlas', { recursive: true })
  if (existsSync(dst) && readFileSync(dst, 'utf8').replace(/\r\n/g, '\n') === json) console.log('unchanged', dst)
  else { writeFileSync(dst + '.tmp', json); renameSync(dst + '.tmp', dst); console.log('wrote', dst) }
}
write(`data/atlas/aum${vol}-maps.json`, { volume: +vol, source: 'owner scan, OCR', maps, missingPages: missing })

// AT-2: keep earlier vision readings (mapReadings) when re-run
const arDst = `data/atlas/aum${vol}-areal.json`
const prev: Record<string, { mapReadings?: unknown[] }> = existsSync(arDst)
  ? Object.fromEntries((JSON.parse(readFileSync(arDst, 'utf8')).maps as { n: string; mapReadings: unknown[] }[]).map(m => [m.n, m])) : {}
const areal = maps.map((m, i) => { const r = arealOf(m, comm[i].body); return prev[m.n]?.mapReadings?.length ? { ...r, mapReadings: prev[m.n].mapReadings } : r })
write(arDst, { volume: +vol, note: 'points are atlas settlement numbers; dialect groups need the settlement list (not resolvable from the OCR)', maps: areal })
console.log(`maps ${maps.length}, with variants ${maps.filter(m => m.variants.length).length}, variants ${maps.reduce((s, m) => s + m.variants.length, 0)}, seq-numbered ${maps.filter(m => m.nFromSequence).length}, missing pages ${missing.length}, maps naming a region ${areal.filter(r => r.namedRegions.length).length}`)
