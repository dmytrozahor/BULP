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
import { VESUM_TXT, vesumIndex } from './vesum.ts'
import { writeJsonAtomic } from './robust.ts'
import { foldsToKnown, promotionVerdict, type PromoteVerdict, type PromoteWitness } from '../core/uv-promote.ts'

const pub = resolve('public/data')
const cards = unpackCore(JSON.parse(readFileSync(resolve(pub, 'lexicon.json'), 'utf8')))
const known = new Set<string>()
for (const c of cards) { known.add(key(c.lemma)); for (const f of c.forms) known.add(key(f.raw)) }
type CorpusWitness = PromoteWitness & { date: [number, number]; region?: string }
const wmeta = new Map<string, CorpusWitness>(((JSON.parse(readFileSync(resolve(pub, 'corpus.json'), 'utf8')) as { witnesses: CorpusWitness[] }).witnesses).map(w => [w.id, w]))
const ocrWitness = new Set<string>([...wmeta.values()].filter(w => w.witnessType === 'ocr').map(w => w.id))
const acc = newAccumulator(), uv = new UvScan()
let toks = 0
for (const f of readdirSync(resolve(pub, 'texts')).filter(f => f.endsWith('.json')).sort()) {
  const j = JSON.parse(readFileSync(resolve(pub, 'texts', f), 'utf8')) as { id: string; tokens: [string, string, number, string?][] }
  j.tokens.forEach((t, i) => {
    toks++
    if (!isWordToken(t[0]) || known.has(key(t[0]))) return
    acc.add(t[0], j.id, i)
    // CV-4: a line-break split (перед- + ставляти) joins with a neighbour into a known word: a fragment, not a word
    const nb = (o: number) => j.tokens[i + o]?.[0] ?? '', joins = (o: number) => isWordToken(nb(o)) && known.has(key(o > 0 ? t[0] + nb(o) : nb(o) + t[0]))
    if (!t[3] || t[3].startsWith('o:')) uv.add(t[0], j.id, i, ocrWitness.has(j.id), joins(1) || joins(-1))   // a token with a name / light / archaic / CV / word ref already has a card; an ORV-only ref (o:) is a TOROT/Stanza lemma, not a Ukrainian card, so the spelling still counts
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
// CV-4: promotion to «засвідчене слово, немає в словниках» (core/uv-promote.ts). Two passes: the first finds the candidates, one VESUM stream then says which of their spellings are VESUM FORMS
// (a card must not say «у словниках немає» of якими / пісням, which the linker merely missed), the second applies that. Without the VESUM file nothing is promoted. The folds the linker already tried are tried once more.
let rejected: Record<string, number> = {}
let vesumForms: Set<string> | undefined
const haveVesum = existsSync(VESUM_TXT)
const cand = new Set<string>()
const verdictOf = (i: { spellings: { raw: string; count: number; lower: number; joins: number }[]; witnesses: string[][] }): PromoteVerdict => {
  let v = promotionVerdict({ spellings: i.spellings, witnesses: i.witnesses.map(ids => ids.map(id => wmeta.get(id) ?? { id, witnessType: 'ocr', oq: true })) })
  if (v.ok) {
    if (!haveVesum) v = { ok: false, why: 'no-vesum-file' }
    else if (!vesumForms) for (const sp of i.spellings) cand.add(key(sp.raw))
    else if (i.spellings.some(sp => vesumForms!.has(key(sp.raw)))) v = { ok: false, why: 'vesum-form' }
    else if (i.spellings.some(sp => foldsToKnown(sp.raw, k => known.has(key(k))))) v = { ok: false, why: 'fold-known' }
  }
  if (!v.ok) rejected[v.why ?? '?'] = (rejected[v.why ?? '?'] ?? 0) + 1
  return v
}
const owner = (k: string) => owned.has(k), orvOf = (sks: string[], f: string) => [f, ...sks].map(k => orvByKey.get(k)).find(Boolean) ?? ''
uv.groups(k => foldSpelling(k), owner, orvOf, verdictOf)   // pass 1: collects the candidates
if (cand.size) { const ix = await vesumIndex(cand, new Set()); vesumForms = new Set([...ix.hits.keys()]); console.log(`CV-4: ${cand.size} candidate spellings, ${vesumForms.size} are VESUM forms`) } else vesumForms = new Set()
rejected = {}
const groups = uv.groups(k => foldSpelling(k), owner, orvOf, verdictOf)
const uvDir = resolve(pub, 'uv'); rmSync(uvDir, { recursive: true, force: true }); mkdirSync(resolve(uvDir, 'g'), { recursive: true }); mkdirSync(resolve(uvDir, 'p'), { recursive: true })
const gs: Record<string, UvGroup>[] = Array.from({ length: UV_SHARDS }, () => ({})), pe = new Map<string, [string, string, 1?]>()
const att = { cards: 0, bytes: 0, maxBytes: 0, byCentury: {} as Record<string, number>, byRegion: {} as Record<string, number> }
for (const [gk, { g, spellingKeys, verdict }] of groups) {
  gs[uvShard(gk)]![gk] = g
  if (verdict?.ok) {
    const ws = (verdict.vetted ?? []).map(id => wmeta.get(id)!), b = Buffer.byteLength(JSON.stringify([gk, g]))
    att.cards++; att.bytes += b; att.maxBytes = Math.max(att.maxBytes, b)
    const first = Math.min(...ws.map(w => w.date[0])), c = String(Math.ceil(first / 100)); att.byCentury[c] = (att.byCentury[c] ?? 0) + 1
    for (const r of new Set(ws.map(w => w.region || '—'))) att.byRegion[r] = (att.byRegion[r] ?? 0) + 1
  }
  for (const sk of spellingKeys) pe.set(sk, verdict?.ok ? [gk, g[0], 1] : [gk, g[0]])
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
writeJsonAtomic(resolve(uvDir, 'meta.json'), JSON.stringify({ format: 1, attested: att.cards, unverified: groups.size - att.cards, byCentury: att.byCentury, byRegion: att.byRegion, rejected }))
console.log(`uv attested-only (CV-4): ${att.cards} «засвідчене слово, немає в словниках» cards (${(att.bytes / Math.max(1, att.cards)).toFixed(0)} B avg, max ${att.maxBytes} B); per century ${JSON.stringify(att.byCentury)}; per region ${JSON.stringify(att.byRegion)}; rejected ${JSON.stringify(rejected)}`)
console.log(`uv: ${groups.size} «неперевірена лема» cards from ${spellings} clean spellings (of ${uv.keys().length} unlinked clean-script spellings), ${ps.size} prefix shards + ${UV_SHARDS} card shards, ${(uvBytes / 1048576).toFixed(2)} MB (max file ${(uvMax / 1024).toFixed(0)} KB)`)
