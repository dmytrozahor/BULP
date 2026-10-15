/**
 * `npm run data:unlinked` — SPEC 63 NV-3: public/data/unlinked/<n>.json from public/data/texts/*.json and the lexicon core (see core/unlinked.ts).
 * A token is unlinked when its normalised key is not the key of any card form (the same test /f/:form uses to find a page). Fails above the size budget.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { unpackCore } from '../core/pack.ts'
import { key } from '../core/text.ts'
import { UNLINKED_BUDGET_BYTES, isWordToken, newAccumulator, shardsOf } from '../core/unlinked.ts'

const pub = resolve('public/data')
const cards = unpackCore(JSON.parse(readFileSync(resolve(pub, 'lexicon.json'), 'utf8')))
const known = new Set<string>()
for (const c of cards) { known.add(key(c.lemma)); for (const f of c.forms) known.add(key(f.raw)) }
const acc = newAccumulator()
let toks = 0
for (const f of readdirSync(resolve(pub, 'texts')).filter(f => f.endsWith('.json')).sort()) {
  const j = JSON.parse(readFileSync(resolve(pub, 'texts', f), 'utf8')) as { id: string; tokens: [string, string, number, string?][] }
  j.tokens.forEach((t, i) => { toks++; if (isWordToken(t[0]) && !known.has(key(t[0]))) acc.add(t[0], j.id, i) })
}
const dir = resolve(pub, 'unlinked'); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true })
let bytes = 0
shardsOf(acc.m).forEach((s, n) => { const t = JSON.stringify(s); bytes += Buffer.byteLength(t); writeFileSync(resolve(dir, `${n}.json`), t) })
console.log(`unlinked: ${acc.m.size} spellings of ${toks} tokens, ${(bytes / 1048576).toFixed(2)} MB (budget ${(UNLINKED_BUDGET_BYTES / 1048576).toFixed(0)} MB)`)
if (bytes > UNLINKED_BUDGET_BYTES) { console.error('over budget'); process.exit(1) }
