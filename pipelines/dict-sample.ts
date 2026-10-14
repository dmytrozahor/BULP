/** BL-11 precision sample: `tsx pipelines/dict-sample.ts [seed]` prints 50 seeded-random headword entries (line, variants, decade) of the two dictionary volumes for hand-checking. */
import { readFileSync } from 'node:fs'
import { parseHeadwords, dictDate } from './ingest-dict.ts'

const all = ['dsu14_1', 'dsu14_2'].flatMap(id => parseHeadwords(readFileSync(`data/raw/dict/${id}/000.txt`, 'utf8')).map(h => ({ id, h })))
let seed = +(process.argv[2] ?? 7)
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
console.log(`entries ${all.length}, variants ${all.reduce((n, x) => n + x.h.variants.length, 0)}, dated ${all.filter(x => dictDate(x.h)).length}`)
for (let i = 0; i < 50; i++) {
  const { id, h } = all[Math.floor(rnd() * all.length)]!
  console.log(`${i + 1}. ${id}:${h.at} | ${h.line.slice(0, 40)} | ${h.variants.join(' ')} | ${dictDate(h)?.[0] ?? '-'}`)
}
