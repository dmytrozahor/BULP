/**
 * MM-53: data/raw/vesum/dict_corp_vis.txt → public/data/vesum.bloom (core/bloom.ts). Idempotent, atomic write (tmp + rename). Run: node --experimental-strip-types pipelines/build-vesum-bloom.ts
 * Keys are core/text.ts key() of the form (lower case, no stress). The file is read on /analyze only (src/lib/vesumBloom.ts).
 */
import { readFileSync } from 'node:fs'
import { writeAtomic } from '../harvest/lib.ts'
import { Bloom } from '../core/bloom.ts'
import { key } from '../core/text.ts'

const SRC = process.argv[2] ?? 'data/raw/vesum/dict_corp_vis.txt', OUT = process.argv[3] ?? 'public/data/vesum.bloom'
const keys = new Set<string>()
for (const l of readFileSync(SRC, 'utf8').split('\n')) { const f = l.trim().split(/\s/, 1)[0]; if (f) keys.add(key(f)) }
const b = Bloom.create(keys.size)
for (const k of keys) b.add(k)
writeAtomic(OUT, Buffer.from(b.toBytes()))
let fp = 0; for (let i = 0; i < 20000; i++) if (b.has('щщ' + i.toString(36) + 'ъъ')) fp++
console.log(`vesum.bloom: ${keys.size} keys, ${(b.toBytes().length / 1048576).toFixed(2)} MiB, measured false-positive rate ${(fp / 200).toFixed(2)} %`)
