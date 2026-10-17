/**
 * SPEC 63 AT-1/AT-2 (RS-1: resumable, atomic, idempotent): OCR pages of the owner's АУМ volume → data/atlas/aum<vol>-maps.json.
 * Usage: tsx pipelines/atlas-extract.ts <ocr-dir> [volume=2] [firstPage=9] [lastPage=103]
 * Reads page_NNNN.txt only; never runs OCR. Output is rewritten only if its content changed (idempotent), via tmp+rename.
 */
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs'
import { splitCommentary, parseMap } from '../core/atlas.ts'

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
const maps = splitCommentary(text).map(c => parseMap(+vol, c, pageAt(c.offset)))
const out = { volume: +vol, source: 'owner scan, OCR', maps, missingPages: missing }
const json = JSON.stringify(out, null, 1) + '\n'
mkdirSync('data/atlas', { recursive: true })
const dst = `data/atlas/aum${vol}-maps.json`
if (existsSync(dst) && readFileSync(dst, 'utf8') === json) console.log('unchanged', dst)
else { writeFileSync(dst + '.tmp', json); renameSync(dst + '.tmp', dst); console.log('wrote', dst) }
console.log(`maps ${maps.length}, with variants ${maps.filter(m => m.variants.length).length}, variants ${maps.reduce((s, m) => s + m.variants.length, 0)}, seq-numbered ${maps.filter(m => m.nFromSequence).length}, missing pages ${missing.length}`)
