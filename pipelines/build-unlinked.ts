/**
 * `npm run data:unlinked` — SPEC 63 NV-3: public/data/unlinked/{idx-<hex top>,<hex prefix>}.json (prefix-sharded, NV-5) from public/data/texts/*.json and the lexicon core (see core/unlinked.ts).
 * A token is unlinked when its normalised key is not the key of any card form (the same test /f/:form uses to find a page). Fails above the size budget.
 * SPEC 63 CV-4: the same scan also writes public/data/uv/ — «неперевірена лема» cards for the clean unlinked spellings, grouped by the spelling-fold key (core/uv.ts).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { unpackCore } from '../core/pack.ts'
import { key } from '../core/text.ts'
import { gzipSync } from 'node:zlib'
import { UNLINKED_BUDGET_BYTES, UNL_GZ_HARD, UNL_GZ_MAX, UNL_MANIFEST_GZ_MAX, isWordToken, leafShard, manifestsOf, unlinkedManifestName, newAccumulator, planUnlinked, unlinkedName } from '../core/unlinked.ts'
import { UV_P_MAX_BYTES, UV_SHARDS, UvScan, planUvPrefixes, uvLeafFile, uvShard, uvSplitOf, type UvGroup, type UvPrefixShard } from '../core/uv.ts'
import { cardMap, type CardIndexFile } from '../core/cv.ts'
import { foldSpelling } from '../core/phrasemes.ts'

const pub = resolve('public/data')
const cards = unpackCore(JSON.parse(readFileSync(resolve(pub, 'lexicon.json'), 'utf8')))
const known = new Set<string>()
for (const c of cards) { known.add(key(c.lemma)); for (const f of c.forms) known.add(key(f.raw)) }
const ocrWitness = new Set<string>(((JSON.parse(readFileSync(resolve(pub, 'corpus.json'), 'utf8')) as { witnesses: { id: string; witnessType: string }[] }).witnesses).filter(w => w.witnessType === 'ocr').map(w => w.id))
const acc = newAccumulator(), uv = new UvScan()
let toks = 0
for (const f of readdirSync(resolve(pub, 'texts')).filter(f => f.endsWith('.json')).sort()) {
  const j = JSON.parse(readFileSync(resolve(pub, 'texts', f), 'utf8')) as { id: string; tokens: [string, string, number, string?][] }
  j.tokens.forEach((t, i) => {
    toks++
    if (!isWordToken(t[0]) || known.has(key(t[0]))) return
    acc.add(t[0], j.id, i)
    if (!t[3] || t[3].startsWith('o:')) uv.add(t[0], j.id, i, ocrWitness.has(j.id))   // a token with a name / light / archaic / CV / word ref already has a card; an ORV-only ref (o:) is a TOROT/Stanza lemma, not a Ukrainian card, so the spelling still counts
  })
}
const dir = resolve(pub, 'unlinked'); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true })
// NV-5: prefix-sharded leaves (like ix/ and dx/), nothing dropped; budgets: total raw, worst leaf gz, manifest gz
let bytes = 0, worst = 0, gzTotal = 0
const gzLen = (t: string) => gzipSync(t, { level: 6 }).length
const leaves = planUnlinked(acc.m, gzLen)
for (const [p, ks] of leaves) {
  const t = JSON.stringify(leafShard(acc.m, ks)), g = gzLen(t); bytes += Buffer.byteLength(t); gzTotal += g; worst = Math.max(worst, g)
  writeFileSync(resolve(dir, `${unlinkedName(p)}.json`), t)
}
let manGz = 0, nMan = 0
for (const [top, m] of manifestsOf(leaves)) { const t = JSON.stringify(m); writeFileSync(resolve(dir, unlinkedManifestName(top) + '.json'), t); bytes += Buffer.byteLength(t); manGz = Math.max(manGz, gzLen(t)); nMan++ }
console.log(`unlinked: ${acc.m.size} spellings of ${toks} tokens → ${leaves.size} leaves, ${(bytes / 1048576).toFixed(2)} MB raw (budget ${(UNLINKED_BUDGET_BYTES / 1048576).toFixed(0)} MB), gz total ${(gzTotal / 1048576).toFixed(1)} MB, worst leaf ${(worst / 1024).toFixed(1)} KB gz (target ${UNL_GZ_MAX / 1024}, hard ${UNL_GZ_HARD / 1024}), ${nMan} manifests, worst ${(manGz / 1024).toFixed(1)} KB gz`)
if (bytes > UNLINKED_BUDGET_BYTES || worst > UNL_GZ_HARD || manGz > UNL_MANIFEST_GZ_MAX) { console.error('over budget'); process.exit(1) }

// ── CV-4 ────────────────────────────────────────────────────────────────────────────────────────
const owned = existsSync(resolve(pub, 'cardindex.json')) ? cardMap(JSON.parse(readFileSync(resolve(pub, 'cardindex.json'), 'utf8')) as CardIndexFile) : new Map()
const orvByKey = new Map<string, string>()
if (existsSync(resolve(pub, 'torot.json'))) {
  const t = JSON.parse(readFileSync(resolve(pub, 'torot.json'), 'utf8')) as { orv: { id: string; lemma: string; forms: { raw: string }[] }[] }
  for (const c of t.orv) { for (const k of [key(c.lemma), ...c.forms.map(f => key(f.raw))]) if (!orvByKey.has(k)) orvByKey.set(k, c.id) }
}
const groups = uv.groups(k => foldSpelling(k), k => owned.has(k), (sks, f) => [f, ...sks].map(k => orvByKey.get(k)).find(Boolean) ?? '')
const uvDir = resolve(pub, 'uv'); rmSync(uvDir, { recursive: true, force: true }); mkdirSync(resolve(uvDir, 'g'), { recursive: true }); mkdirSync(resolve(uvDir, 'p'), { recursive: true })
const gs: Record<string, UvGroup>[] = Array.from({ length: UV_SHARDS }, () => ({})), pe = new Map<string, [string, string]>()
for (const [gk, { g, spellingKeys }] of groups) {
  gs[uvShard(gk)]![gk] = g
  for (const sk of spellingKeys) pe.set(sk, [gk, g[0]])
}
const spellings = pe.size
// prefix shards: first two letters, split deeper while a file is above UV_P_MAX_BYTES (lossless); p/_split.json lists the deeper leaves
const pShard = (ks: string[]): UvPrefixShard => { const o: UvPrefixShard = {}; for (const k of ks.slice().sort()) o[k] = pe.get(k)!; return o }
const plan = planUvPrefixes(pe.keys(), ks => Buffer.byteLength(JSON.stringify(pShard(ks))), UV_P_MAX_BYTES)
const ps = new Map<string, UvPrefixShard>([...plan].map(([leaf, ks]) => [uvLeafFile(leaf), pShard(ks)]))
let uvBytes = 0, uvMax = 0
gs.forEach((s, n) => { const t = JSON.stringify(s), b = Buffer.byteLength(t); uvBytes += b; uvMax = Math.max(uvMax, b); writeFileSync(resolve(uvDir, 'g', `${n}.json`), t) })
for (const [p, s] of ps) { const t = JSON.stringify(s), b = Buffer.byteLength(t); uvBytes += b; uvMax = Math.max(uvMax, b); writeFileSync(resolve(uvDir, 'p', `${p}.json`), t) }
writeFileSync(resolve(uvDir, 'p', '_split.json'), JSON.stringify(uvSplitOf(plan.keys())))
console.log(`uv: ${groups.size} «неперевірена лема» cards from ${spellings} clean spellings (of ${uv.keys().length} unlinked clean-script spellings), ${ps.size} prefix shards + ${UV_SHARDS} card shards, ${(uvBytes / 1048576).toFixed(2)} MB (max file ${(uvMax / 1024).toFixed(0)} KB)`)
