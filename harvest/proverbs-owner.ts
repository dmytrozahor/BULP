/**
 * SPEC 63 GG-19b: the owner-supplied scan of Етнографічний збірник т. 23 (Франко, «Галицько-руські народні приповідки» т. II вип. 1, Діти–Кпити, Львів 1907; Франко † 1916),
 * a National Parliamentary Library of Ukraine (nplu.org) PDF with NO usable text layer (encrypted, image pages). Its OCR text (ops/worker/ocr-etnohr23.sh: qpdf --decrypt, pdftoppm, tesseract ukr, page markers
 * «=====PDF n=====») is filed next to the archive.org harvest as item `nplu-etnohr_23`, so that build:data reads it with the others (pipelines/build-proverbs.ts loadProverbInputs).
 * Usage: HARVEST_DIR=<raw>/harvest tsx harvest/proverbs-owner.ts <ocr.txt>      (idempotent: an item already in index.jsonl is skipped; atomic write; no network)
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { writeAtomic, ROOT_DIR } from './lib.ts'

export const OWNER_ITEM = 'nplu-etnohr_23'
export const ownerIndexLine = (bytes: number) => ({
  id: `proverbs:${OWNER_ITEM}`, url: 'https://nplu.org', date: '1907', licence: 'PD (автор † 1916; видання 1907; скан НПБУ, наданий власником проєкту; OCR tesseract ukr, не вичитано)', bytes, status: 200,
  title: 'Галицько-руські народні приповідки, т. II, вип. 1 (Діти–Кпити); Етнографічний збірник, т. 23', author: 'Іван Франко', region: 'Львів', source: 'franko', vol: '23', range: 'Діти–Кпити', ocr: true, iaItem: OWNER_ITEM, iaFile: 'Етнографічний_збірник_Т.23.pdf (owner-supplied NPLU scan)', file: OWNER_ITEM,
})
/** file the OCR text; returns false when the item is already there */
export function ingestOwner(ocrPath: string, dir = `${ROOT_DIR}/ia-proverbs`): boolean {
  const idx = `${dir}/index.jsonl`
  if (existsSync(idx) && readFileSync(idx, 'utf8').includes(`"proverbs:${OWNER_ITEM}"`)) return false
  const text = readFileSync(ocrPath)
  if (text.length < 100_000) throw new Error(`OCR text of ${ocrPath} is only ${text.length} bytes: refusing to file a partial OCR`)
  writeAtomic(`${dir}/items/${OWNER_ITEM}.gz`, gzipSync(text))
  appendFileSync(idx, JSON.stringify(ownerIndexLine(text.length)) + '\n')
  return true
}
if (process.argv[1]?.split(String.fromCharCode(92)).join('/').endsWith('harvest/proverbs-owner.ts')) {
  const f = process.argv[2]; if (!f) throw new Error('usage: tsx harvest/proverbs-owner.ts <ocr.txt>')
  console.log(ingestOwner(f) ? 'filed' : 'already filed')
}
