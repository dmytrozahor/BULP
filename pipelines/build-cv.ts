/**
 * BUILD stage, SPEC 63 CV: a card for every attested word. Pure scan (core/cv.ts) + writers.
 * public/data/cv/<bucket>.json (gitignored like lex/, shipped on the data branch) (CV_BUCKETS shards of { key: CvEntry }) and public/data/cardindex.json (every non-lexicon card: light, archaic, CV).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CvScan, buildCardIndex, isCvWord, shardsOfCv, type CardIndexFile, type CvEntry } from '../core/cv.ts'
import { archId } from '../core/archaic.ts'
import { key } from '../core/text.ts'
import { lk } from '../core/cv.ts'
import type { WitnessOut } from '../core/types.ts'

export interface CvWitness { w: Pick<WitnessOut, 'id' | 'tokens' | 'witnessType'> }
/** what the linker says about token `ti` of witness `wi`: its VESUM lemma and whether that lemma has a full lexicon card */
export type CvLookup = (wi: number, ti: number) => { lemma: string; tags: string; full: boolean } | undefined

export interface CvResult { entries: [string, CvEntry][]; forms: [string, string][]; refs: Map<string, string[]>; stats: { vesum: number; asIs: number; tokens: number; skippedArchaic: number; skippedFull: number; refTokens: number; plastBare: number } }

export function buildCv(ins: CvWitness[], lookup: CvLookup, archKeys: ReadonlySet<string>, hasRef: (wid: string, ti: number) => boolean, extra?: { words: string[]; owned: ReadonlySet<string> }): CvResult {
  const scan = new CvScan(), own = new Map<string, string[]>()
  const st = { vesum: 0, asIs: 0, tokens: 0, skippedArchaic: 0, skippedFull: 0, refTokens: 0, plastBare: 0 }
  ins.forEach(({ w }, wi) => {
    if (w.witnessType !== 'dictionary') return
    const r: string[] = new Array(w.tokens.length).fill('')
    w.tokens.forEach((t, ti) => {
      st.tokens++
      const L = lookup(wi, ti)
      if (L?.full) { st.skippedFull++; return }
      if (L) { if (!isCvWord(L.lemma)) return; scan.add(L.lemma, L.tags, w.id, t.loc, t.raw); r[ti] = 'l:' + L.lemma; st.vesum++; return }
      const raw = t.raw.normalize('NFC').toLowerCase()
      if (!isCvWord(raw)) return
      if (archKeys.has(archId(raw))) { st.skippedArchaic++; return }   // an /ar card already owns this spelling
      scan.add(raw, '', w.id, t.loc, t.raw); r[ti] = 'l:' + raw; st.asIs++
    })
    if (r.some(Boolean)) own.set(w.id, r)
  })
  // SL / CV: every Plast headword gets a card unless a card of another kind already owns it (that card shows the Plast sense, joined at runtime)
  let plastBare = 0
  for (const w of extra?.words ?? []) if (!extra!.owned.has(lk(w)) && scan.addBare(w)) plastBare++
  const entries = scan.entries()
  // text links: an unresolved token of any other witness whose spelling is a CV word links to its card ('l:<word>')
  const byKey = new Map<string, string>()
  for (const [k, e] of entries) { byKey.set(k, e[0]); for (const a of e[3]) byKey.set(key(a[2]), e[0]) }
  const refs = new Map(own)
  ins.forEach(({ w }, wi) => {
    if (w.witnessType === 'dictionary') return
    const r = refs.get(w.id) ?? new Array<string>(w.tokens.length).fill(''); let any = false
    w.tokens.forEach((t, ti) => {
      if (r[ti] || hasRef(w.id, ti) || lookup(wi, ti) || t.raw.length < 3) return
      const word = byKey.get(key(t.raw)); if (word) { r[ti] = 'l:' + word; any = true; st.refTokens++ }
    })
    if (any) refs.set(w.id, r)
  })
  st.plastBare = plastBare
  return { entries, forms: scan.forms(), refs, stats: st }
}

export function writeCv(pub: string, entries: [string, CvEntry][], light: string[], arch: { id: string; variants: string[] }[], generated: string, forms: [string, string][] = []): { shards: number; bytes: number; maxShard: number; index: CardIndexFile; indexBytes: number } {
  const dir = resolve(pub, 'cv'); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true })
  let bytes = 0, maxShard = 0
  const sh = shardsOfCv(entries)
  sh.forEach((s, n) => { const t = JSON.stringify(s); const b = Buffer.byteLength(t); bytes += b; maxShard = Math.max(maxShard, b); writeFileSync(resolve(dir, `${n}.json`), t) })
  const index = buildCardIndex(generated, light, entries.map(e => e[1][0]), arch, forms)
  const t = JSON.stringify(index); writeFileSync(resolve(pub, 'cardindex.json'), t)
  return { shards: sh.length, bytes, maxShard, index, indexBytes: Buffer.byteLength(t) }
}
