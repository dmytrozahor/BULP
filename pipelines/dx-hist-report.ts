/**
 * SPEC 63 GG-6: projects the new dictionary-only cards of the historical dictionaries WITHOUT a build, from the local data:
 *   npx tsx pipelines/dx-hist-report.ts [--data <dir with data/raw/vesum and data/work>] [--se <se-parsed dir>] [--public <public/data of a build>] [--r2u-heads <{heads:{unitId:[word]}} file, e.g. made on the harvester box>] [--every k: use every k-th local witness file, to fit how corroboration grows with corpus size] [--out analysis/dx-hist.md]
 * It runs the real selection (core/dx-hist.ts) against: every VESUM lemma as an existing dictionary-only card, the r2u words the dictionary witnesses already make cards of (pipelines/build-cv.ts),
 * the cards of an earlier build (cardindex.json, light.json, archaic.json) as «owned», and the spellings of the local witness files as the corpus gate. The corpus here is only the local slice
 * (the live build has 47.6 M full-text tokens), so corroborated cards are a LOWER bound and the figure «without the corpus gate» is the upper bound of what OCR headwords could add.
 * Nothing is written except the report.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { writeJsonAtomic } from './robust.ts'
import { resolve } from 'node:path'
import { groupHist, selectHist, emptyStats, type HistHead, type HistStats } from '../core/dx-hist.ts'
import { HIST_SRC } from '../core/dx-src.ts'
import { lk } from '../core/cv.ts'
import { seHeads, r2uHeads } from './dx-hist-load.ts'
import { vesumIndex, vesumLemmaList } from './vesum.ts'

const arg = (n: string, d: string) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1]! : d }
const DATA = resolve(arg('data', '.')), PUB = resolve(arg('public', resolve(DATA, 'public/data'))), OUT = arg('out', 'analysis/dx-hist.md')
const SE = resolve(arg('se', resolve(DATA, 'data/work/se-parsed')))
const rd = <T>(p: string): T | undefined => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) as T : undefined)

async function main() {
  const t0 = Date.now()
  const vesum = await vesumLemmaList(); console.log(`VESUM lemmas ${vesum.size}`)
  const owned = new Set<string>()
  const ci = rd<{ lw: string[]; ar: string[][]; ld?: string[] }>(resolve(PUB, 'cardindex.json')); for (const w of [...(ci?.lw ?? []), ...(ci?.ld ?? []), ...(ci?.ar.flat() ?? [])]) owned.add(lk(w))
  for (const l of rd<{ lemmas: string[][] }>(resolve(PUB, 'light.json'))?.lemmas ?? []) owned.add(lk(l[0]!))
  for (const e of rd<{ entries: { id: string; variants: string[] }[] }>(resolve(PUB, 'archaic.json'))?.entries ?? []) for (const v of [e.id, ...e.variants]) owned.add(lk(v))
  console.log(`owned (earlier build) ${owned.size}`)
  const r2uFile = arg('r2u-heads', ''), r2uAll: HistHead[] = r2uFile ? Object.entries(rd<{ heads: Record<string, string[]> }>(r2uFile)!.heads).flatMap(([src, ws]) => ws.map(word => ({ word, src }))) : r2uHeads(DATA)
  const heads = [...r2uAll, ...seHeads(DATA, SE)]
  const stats: Record<string, HistStats> = {}, groups = groupHist(heads, stats), ck = new Set<string>(); for (const g of groups.values()) for (const k of g.cands) ck.add(k)
  console.log(`${heads.length} headwords → ${groups.size} groups, ${ck.size} candidate spellings`)
  const lemmaOf = new Map<string, string[]>(); for (const [k, hs] of (await vesumIndex(ck, new Set())).hits) lemmaOf.set(k, [...new Set(hs.map(h => lk(h.lemma)))])
  // the corpus gate: spellings of the local witness files (full-text witnesses only)
  const corpus = new Map<string, number>(); let nTok = 0
  const W = resolve(DATA, 'data/work')
  const every = Number(arg('every', '1')); let fi = 0
  for (const f of readdirSync(W)) {
    if (!f.endsWith('.json') || f.endsWith('.nlp.json') || f.startsWith('r2u') || f.startsWith('dsu') || f.startsWith('se-')) continue
    let j: { witnessType?: string; tokens?: { raw: string }[] }; try { j = JSON.parse(readFileSync(resolve(W, f), 'utf8')) } catch { continue }
    if (!Array.isArray(j.tokens) || j.witnessType === 'dictionary' || fi++ % every !== 0) continue
    for (const t of j.tokens) { nTok++; const k = lk(t.raw); if (ck.has(k)) corpus.set(k, (corpus.get(k) ?? 0) + 1) }
  }
  console.log(`local corpus slice ${nTok} tokens`)
  // existing cards: VESUM lemmas not owned (dictionary-only), plus the as-is spellings of the r2u witnesses (the pre-GG path already makes a card of them)
  const entries = new Map<string, 'do' | 'card'>()
  for (const k of vesum.keys()) entries.set(k, owned.has(k) ? 'card' : 'do')
  const r2u = r2uAll; let r2uAsIs = 0
  for (const h of r2u) { const k = lk(h.word); if (entries.has(k) || owned.has(k) || (lemmaOf.get(k)?.length ?? 0) > 0) continue; entries.set(k, 'do'); r2uAsIs++ }
  const pre = [...entries.values()].filter(v => v === 'do').length
  const own = (k: string): [string, 'do' | 'card'] | undefined => { const e = entries.get(k); return e ? [k, e] : owned.has(k) ? [k, 'card'] : undefined }
  const resolveFn = (cands: string[]): [string, 'do' | 'card'] | undefined => { for (const k of cands) { const o = own(k); if (o) return o } for (const k of cands) for (const l of lemmaOf.get(k) ?? []) return own(l) ?? [l, 'card']; return undefined }
  const gated = selectHist(groups, resolveFn, k => corpus.get(k) ?? 0, structuredClone(stats))
  const ungated = selectHist(groups, resolveFn, () => 1, structuredClone(stats))   // upper bound: every OCR headword counted as corroborated
  const bySrc = (r: typeof gated) => HIST_SRC.map(s => ({ s, st: r.stats[s.name] ?? emptyStats() }))
  const lines = ['# Dictionary-only cards from the historical dictionaries (SPEC 63 GG-6)', '',
    `Generated by \`pipelines/dx-hist-report.ts\` (${new Date().toISOString().slice(0, 10)}); do not edit. Inputs: ${heads.length} headwords (r2u ${r2u.length}, SE-11 ${heads.length - r2u.length}); ${vesum.size} VESUM lemmas; ${owned.size} cards of an earlier build as «owned»; the corpus gate is a local slice of ${nTok} tokens (lower bound).`, '',
    `Dictionary-only cards before GG in this simulation: ${pre} (VESUM-only lemmas + ${r2uAsIs} as-is r2u spellings). New cards: **${gated.news.length}** with the local corpus gate (${gated.news.filter(n => n.c).length} corroborated by corpus tokens), **${ungated.news.length}** if every single-OCR headword were corroborated (upper bound). Existing dictionary-only cards that gain a dictionary name: ${gated.merges.length}.`, '',
    '| dictionary | period | headwords | rejected (headwordOk) | groups | merged into existing DO | already a card | dropped (uncorroborated OCR) | new (gated) | of them sole source | new (upper bound) |', '|---|---|---|---|---|---|---|---|---|---|---|',
    ...bySrc(gated).map(({ s, st }, i) => `| ${s.name} | ${s.period} | ${st.heads} | ${st.rejected} | ${st.groups} | ${st.merged} | ${st.inCards} | ${st.dropped} | ${st.added} | ${st.sole} | ${bySrc(ungated)[i]!.st.added} |`), '']
  writeJsonAtomic(OUT, lines.join('\n')); console.log(lines.join('\n')); console.log(`${((Date.now() - t0) / 1000).toFixed(0)} s`)
}
await main()
