/** SL-5 one-off/incremental: replace the LCH entries of public/data/sociolect.json from data/raw/plast/lch-ocr.txt WITHOUT refetching the web Plast sources (`node pipelines/merge-lch.ts`). */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lchEntries, LCH_ID } from './plast-lch.ts'
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'), OUT = resolve(ROOT, 'public/data/sociolect.json')
const f = JSON.parse(readFileSync(OUT, 'utf8'))
f.plast.entries = [...f.plast.entries.filter((e: { s?: string }) => e.s !== LCH_ID), ...lchEntries(readFileSync(resolve(ROOT, 'data/raw/plast/lch-ocr.txt'), 'utf8'))]
writeFileSync(OUT + '.tmp', JSON.stringify(f)); writeFileSync(OUT, readFileSync(OUT + '.tmp')); 
console.log('plast entries', f.plast.entries.length, 'LCH', f.plast.entries.filter((e: { s?: string }) => e.s === LCH_ID).length)
