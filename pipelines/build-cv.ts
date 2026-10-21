/**
 * BUILD stage, SPEC 63 CV: a card for every attested word. Pure scan (core/cv.ts) + writers.
 * public/data/cv/<bucket>.json (gitignored like lex/, shipped on the data branch) (CV_BUCKETS shards of { key: CvEntry }) and public/data/cardindex.json (every non-lexicon card: light, archaic, CV).
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { parseUserWords } from '../core/sn.ts'
import { resolve } from 'node:path'
import { CvScan, pickByContext, buildCardIndex, isCvWord, isDictOnly, shardsOfCv, type CardIndexFile, type CvAtt, type CvEntry } from '../core/cv.ts'
import { archId } from '../core/archaic.ts'
import { key } from '../core/text.ts'
import { lk } from '../core/cv.ts'
import type { WitnessOut } from '../core/types.ts'
import { selectHist, type HistGroup, type HistStats } from '../core/dx-hist.ts'

export interface CvWitness { w: Pick<WitnessOut, 'id' | 'tokens' | 'witnessType'> }
/** what the linker says about token `ti` of witness `wi`: its VESUM lemma and whether that lemma has a full lexicon card */
export type CvLookup = (wi: number, ti: number) => { lemma: string; tags: string; full: boolean } | undefined

/** CV-5: all VESUM analyses of a spelling key, and the light-card examples (a corpus token whose lemma KEEP_MIN_F dropped) with the word before them */
export interface CvCtx { analyses: (spellingKey: string) => [string, string][]; light: { lemma: string; tags: string; w: string; loc: string; raw: string; form?: string; prev?: string }[] }
export interface CvResult { entries: [string, CvEntry][]; forms: [string, string][]; refs: Map<string, string[]>; stats: { histNew: number; histMerged: number; hist: Record<string, HistStats>; vesum: number; asIs: number; tokens: number; skippedArchaic: number; skippedFull: number; refTokens: number; plastBare: number; dictOnly: number; dictVesum: number } }
/** SPEC 63 DO-1: every VESUM headword (lk → [word, tags], pipelines/vesum.ts vesumLemmaList) and the keys that already have a card of another kind (full lexicon, light, archaic, Plast) */
export interface DictCtx { vesum: ReadonlyMap<string, [word: string, tags: string]>; owned: ReadonlySet<string>; /** lk() of every word a corpus text attests through a light card (KEEP_MIN_F-dropped and GZ-1 lemmas) */ attested: ReadonlySet<string>;
  /** SPEC 63 GG: grouped headwords of the historical dictionaries (core/dx-hist.ts groupHist over pipelines/dx-hist-load.ts), the VESUM analysis of every candidate spelling and the full-text count of each (token TYPES of the build) */
  hist?: { groups: Map<string, HistGroup>; /** lk() of a candidate spelling that VESUM knows as a FORM → the lk() of its lemmas (a form is never a new card) */ lemmaOf: ReadonlyMap<string, string[]>; corpus: ReadonlyMap<string, number>; /** per-dictionary counts, started by groupHist */ stats: Record<string, HistStats> } }
const NO_ATT: CvAtt[] = [], DICT_VESUM = { d: 1 }   // shared by the ~400k dictionary-only entries (never mutated; every byte and every allocation counts at that size)

export function buildCv(ins: CvWitness[], lookup: CvLookup, archKeys: ReadonlySet<string>, hasRef: (wid: string, ti: number) => boolean, extra?: { words: string[]; owned: ReadonlySet<string> }, ctx?: CvCtx, dict?: DictCtx): CvResult {
  const scan = new CvScan(), own = new Map<string, string[]>()
  const corpus = new Set<string>()   // DO-1: lk() of every word that a corpus text (not a dictionary witness) attests
  const st = { histNew: 0, histMerged: 0, hist: {} as Record<string, HistStats>, vesum: 0, asIs: 0, tokens: 0, skippedArchaic: 0, skippedFull: 0, refTokens: 0, plastBare: 0, dictOnly: 0, dictVesum: 0 }
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
  if (ctx) {
    for (const x of ctx.light) {
      const an = ctx.analyses(key(x.form ?? x.raw)), pick = pickByContext(x.prev, an)
      scan.ensure(x.lemma, x.tags, { ...(an.length > 1 ? { an } : {}), ...(x.prev ? { prev: x.prev } : {}), ...(pick ? { pick } : {}) })
      corpus.add(lk(x.lemma)); for (const [l] of an) corpus.add(lk(l))
      for (const [l, t] of an) if (key(l) !== key(x.lemma) && isCvWord(l)) { scan.add(l, t, x.w, x.loc, x.raw); scan.setExtra(lk(l), { an, ...(x.prev ? { prev: x.prev } : {}), ...(pick ? { pick } : {}) }) }   // every analysis of an attested spelling is a card
    }
    for (const [k, e] of scan.m) if (!e.extra?.an && e.atts[0]) { const an = ctx.analyses(key(e.atts[0][2])); if (an.length > 1) scan.setExtra(k, { an }) }
  }
  // SL / CV: every Plast headword gets a card unless a card of another kind already owns it (that card shows the Plast sense, joined at runtime)
  let plastBare = 0
  for (const w of extra?.words ?? []) if (!extra!.owned.has(lk(w)) && scan.addBare(w)) plastBare++
  let entries = scan.entries()
  // text links: an unresolved token of any other witness whose spelling is a CV word links to its card ('l:<word>')
  const byKey = new Map<string, string>()
  for (const [k, e] of entries) { byKey.set(k, e[0]); for (const a of e[3]) byKey.set(key(a[2]), e[0]) }
  const refs = new Map(own)
  ins.forEach(({ w }, wi) => {
    if (w.witnessType === 'dictionary') return
    const r = refs.get(w.id) ?? new Array<string>(w.tokens.length).fill(''); let any = false
    w.tokens.forEach((t, ti) => {
      if (r[ti] || hasRef(w.id, ti) || lookup(wi, ti) || t.raw.length < 3) return
      const word = byKey.get(key(t.raw)); if (word) { r[ti] = 'l:' + word; any = true; st.refTokens++; corpus.add(lk(word)) }
    })
    if (any) refs.set(w.id, r)
  })
  st.plastBare = plastBare
  // SPEC 63 DO-1/DO-2: a word that no corpus text attests is a dictionary-only card; the bitmask names the dictionaries (VESUM knows the word / r2u lines / Plast headword / other dictionary witness).
  // A corpus-attested entry is never touched (DO-7).
  if (dict) {
    const have = new Set<string>(); for (const k of dict.attested) corpus.add(k)
    entries = entries.map(([k, e]) => {
      have.add(k)
      if (corpus.has(k)) return [k, e] as [string, CvEntry]
      const r2u = e[3].some(a => a[0].startsWith('r2u')), other = e[3].some(a => !a[0].startsWith('r2u'))
      const d = (dict.vesum.has(k) ? 1 : 0) | (r2u ? 2 : 0) | (other ? 8 : 0) | (!e[3].length ? 4 : 0)
      if (!d) return [k, e] as [string, CvEntry]
      st.dictOnly++; if (d & 1) st.dictVesum++
      return [k, [e[0], e[1] || dict.vesum.get(k)?.[1] || '', e[2], e[3], { ...e[4], d }]] as [string, CvEntry]
    })
    for (const [k, [word, tags]] of dict.vesum) {
      if (have.has(k) || corpus.has(k) || dict.owned.has(k) || !isCvWord(word)) continue
      entries.push([k, [word, tags, 0, NO_ATT, DICT_VESUM]]); st.dictOnly++; st.dictVesum++
    }
  }
  if (dict?.hist) {   // SPEC 63 GG: headwords of the historical dictionaries that no card owns (core/dx-hist.ts has the rules)
    const at = new Map<string, number>(); entries.forEach((e, i) => at.set(e[0], i))
    const own = (k: string): [string, 'do' | 'card'] | undefined => { const i = at.get(k); if (i !== undefined) return [k, isDictOnly(entries[i]![1]) ? 'do' : 'card']; if (dict.owned.has(k) || corpus.has(k) || dict.attested.has(k)) return [k, 'card'] }
    const r = selectHist(dict.hist.groups, cands => {
      for (const k of cands) { const o = own(k); if (o) return o }
      for (const k of cands) for (const l of dict.hist!.lemmaOf.get(k) ?? []) return own(l) ?? [l, 'card']   // VESUM knows the spelling as a form: its lemma's card (or none: still no new card for a form)
      return undefined
    }, k => dict.hist!.corpus.get(k) ?? 0, dict.hist.stats); st.hist = dict.hist.stats
    for (const [k, bits] of r.merges) { const i = at.get(k)!, e = entries[i]![1]; if ((e[4]!.d! & bits) === bits) continue; entries[i] = [k, [e[0], e[1], e[2], e[3], { ...e[4], d: e[4]!.d! | bits }]]; st.histMerged++ }
    for (const n of r.news) { if (at.has(n.key)) continue; entries.push([n.key, [n.word, '', 0, NO_ATT, { d: n.mask, ...(n.c ? { c: n.c } : {}) }]]); at.set(n.key, entries.length - 1); st.dictOnly++; st.histNew++ }
  }
  return { entries, forms: scan.forms(), refs, stats: st }
}

export function writeCv(pub: string, entries: [string, CvEntry][], light: string[], arch: { id: string; variants: string[] }[], generated: string, forms: [string, string][] = []): { shards: number; bytes: number; maxShard: number; index: CardIndexFile; indexBytes: number } {
  const dir = resolve(pub, 'cv'); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true })
  let bytes = 0, maxShard = 0
  const sh = shardsOfCv(entries)
  sh.forEach((s, n) => { const t = JSON.stringify(s); const b = Buffer.byteLength(t); bytes += b; maxShard = Math.max(maxShard, b); writeFileSync(resolve(dir, `${n}.json`), t) })
  const index = buildCardIndex(generated, light, entries.map(e => e[1][0]), arch, forms, entries.filter(e => isDictOnly(e[1])).map(e => e[1][0]))
  const t = JSON.stringify(index); writeFileSync(resolve(pub, 'cardindex.json'), t)
  return { shards: sh.length, bytes, maxShard, index, indexBytes: Buffer.byteLength(t) }
}

/** SPEC 63 CV-6: the owner's words (specs/user-words.txt) — each gets a card in every build (a bare card at worst; the r2u attestations join through the dictionary witnesses). */
export function userWords(root: string): string[] {
  const p = resolve(root, 'specs/user-words.txt')
  return existsSync(p) ? parseUserWords(readFileSync(p, 'utf8')).map(w => w.word) : []
}
