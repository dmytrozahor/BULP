/**
 * BUILD stage SPEC 63 GG-19 (phraseology gap): the proverb collections of Номис (1864) and Франко (Етнографічний збірник 10, 16, 24, 27, 28) → PhrRow lists filed under the lemmas of their content words.
 * Input: data/raw/harvest/ia-proverbs/ (harvest/proverbs.ts; items/<ia>.gz = the archive.org djvu text layer; index.jsonl; NOT copied into the repo, `raw` is the root that holds data/raw).
 * The OCR is not proof-read, so a row must pass two gates, and the rejected share is counted, never repaired:
 *   1. charGate (core/proverbs.ts): only Cyrillic letters and punctuation, 8–300 chars, ≥ 2 words, no mid-word capitals;
 *   2. vocabulary gate: ≥ 60 % of the words (≥ 2 letters) are VESUM forms after the spelling folds of core/proverbs.ts (ї→і, -цця→-ться, «ть ся», gal-folds), and ≥ 1 content lemma is found.
 * The lemma links come from VESUM (the lemmatiser of the build) in one streaming pass; a word with more than 3 lemmas, a proper name, a pronoun/numeral and the auxiliaries бути/мати/могти/стати/хотіти link nothing.
 * Every row passes core/evidence.ts claim() (source, non-empty locator, non-empty quote) through phrClaim(); a row that cannot is a build error.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { resolve } from 'node:path'
import { lk } from '../core/cv.ts'
import { key } from '../core/text.ts'
import { charGate, foldCandidates, locatorOf, parseFranko, parseNomis, parseRegistry, placeNote, proverbWords, type ProvCand, type RegEntry } from '../core/proverbs.ts'
import { phrClaim, type PhrRow } from '../core/synphr.ts'
import { fileLines, indexLines } from './vesum.ts'

export interface ProvStats {
  candidates: Record<string, number>; charRejected: Record<string, number>; vocabRejected: Record<string, number>; kept: Record<string, number>
  /** share of candidates rejected by the two gates, per source */ rejectedShare: Record<string, number>
  /** gate-passing candidates dropped as repeats of the same text and place */ duplicates?: number
  registryPlaces: number; placeResolved: number; placeUnresolved: number; withPage: number
  rows: number; heads: number; volumes: Record<string, { candidates: number; kept: number }>
}
export type ProvRows = Record<string, PhrRow[]>
export const PROV_VERSION = 4
const STOP = new Set(['бути', 'мати', 'могти', 'стати', 'хотіти', 'той', 'цей', 'увесь', 'весь', 'свій'])
const CONTENT = /^(?:noun|verb|adj|adv)/
const ratio = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 1000 : 0)

export interface ProvInput { ia: string; src: 'nomis' | 'franko'; text: string }
/** the OCR texts of the harvest, in file order; items with a status other than 200 (no text layer) are skipped */
export function loadProverbInputs(harvestDir: string): { inputs: ProvInput[]; bytes: number } {
  const dir = resolve(harvestDir, 'ia-proverbs'), inputs: ProvInput[] = []; let bytes = 0
  if (!existsSync(resolve(dir, 'index.jsonl'))) return { inputs, bytes }
  for (const l of readFileSync(resolve(dir, 'index.jsonl'), 'utf8').split('\n')) {
    if (!l) continue
    let it: { status: number; iaItem: string; source: 'nomis' | 'franko' }
    try { it = JSON.parse(l) } catch { continue }
    const f = resolve(dir, 'items', `${it.iaItem}.gz`)
    if (it.status !== 200 || !existsSync(f)) continue
    bytes += statSync(f).size
    inputs.push({ ia: it.iaItem, src: it.source, text: gunzipSync(readFileSync(f)).toString('utf8') })
  }
  return { inputs, bytes }
}

/** `text` with every word replaced by the spelling VESUM knows (initial capital kept); «кінчить ся» → «кінчиться». Words VESUM does not know stay as printed. */
export function modernise(text: string, pick: (w: string) => string | undefined): string {
  const glued = text.replace(/(\p{L}{2,})\s+(ся|сї|сь|си)(?![\p{L}])/giu, (all, w: string) => (pick(w + 'ся') ? w + 'ся' : all))
  return glued.replace(/\p{L}[\p{L}'’ʼ`-]*/gu, w => {
    const c = pick(w)
    if (!c || c === w.toLowerCase().replace(/['`ʼ]/g, '’')) return w
    return /^\p{Lu}/u.test(w) ? c[0]!.toUpperCase() + c.slice(1) : c
  })
}

/** the whole stage on texts already in memory (tests feed fixtures); `vesumFile` is the unpacked VESUM */
export async function stageProverbs(inputs: ProvInput[], vesumFile: string): Promise<{ phr: ProvRows; stats: ProvStats }> {
  const stats: ProvStats = { candidates: {}, charRejected: {}, vocabRejected: {}, kept: {}, rejectedShare: {}, registryPlaces: 0, placeResolved: 0, placeUnresolved: 0, withPage: 0, rows: 0, heads: 0, volumes: {} }
  const reg = new Map<string, RegEntry>()
  for (const i of inputs) if (i.src === 'franko') for (const [k, e] of parseRegistry(i.text)) if (!reg.has(k)) reg.set(k, e)
  stats.registryPlaces = reg.size
  const cands: ProvCand[] = [], seen = new Set<string>()
  for (const i of inputs) {
    const all = i.src === 'franko' ? parseFranko(i.text, i.ia) : parseNomis(i.text, i.ia)
    stats.candidates[i.src] = (stats.candidates[i.src] ?? 0) + all.length
    stats.volumes[i.ia] = { candidates: all.length, kept: 0 }
    for (const c of all) {
      if (!charGate(c.text)) { stats.charRejected[i.src] = (stats.charRejected[i.src] ?? 0) + 1; continue }
      const dk = `${c.src}|${key(c.text).replace(/[^а-яіїєґ]/g, '')}|${c.note[0] ?? ''}`   // the same text with the same place in two volumes / twice in one (a volume's supplement repeats entries)
      if (seen.has(dk)) { stats.duplicates = (stats.duplicates ?? 0) + 1; continue }
      seen.add(dk); cands.push(c)
    }
  }
  const forms = new Set<string>()
  for (const c of cands) {
    for (const w of proverbWords(c.text)) for (const f of foldCandidates(w)) forms.add(key(f))
    if (c.hw && !c.hw.includes(' ')) for (const f of foldCandidates(c.hw)) forms.add(key(f))   // the headword of a Франко entry decides which lemma is «own» (no x)
  }
  const hits = (await indexLines(fileLines(vesumFile), forms, new Set())).hits
  const pickCache = new Map<string, string | undefined>()
  const pick = (w: string): string | undefined => {
    if (pickCache.has(w)) return pickCache.get(w)
    const r = foldCandidates(w).find(f => hits.has(key(f)))
    pickCache.set(w, r); return r
  }
  const lemmasOf = (w: string): string[] => {
    const f = pick(w); if (!f) return []
    const ls = new Set<string>()
    for (const h of hits.get(key(f)) ?? []) {
      if (!CONTENT.test(h.tags) || /&pron|&numr|:prop|:geo|:fname|:lname|:patr/.test(h.tags) || /^\p{Lu}/u.test(h.lemma)) continue
      const l = key(h.lemma); if (l.length >= 3 && !STOP.has(l)) ls.add(lk(h.lemma))
    }
    return ls.size <= 3 ? [...ls] : []
  }
  const phr: ProvRows = {}
  for (const c of cands) {
    const words = proverbWords(c.text).filter(w => [...w].length >= 2)
    const known = words.filter(w => pick(w)).length
    const lemmas = [...new Set(words.flatMap(lemmasOf))]
    if (!words.length || known / words.length < 0.6 || !lemmas.length) { stats.vocabRejected[c.src] = (stats.vocabRejected[c.src] ?? 0) + 1; continue }
    const m = modernise(c.text, pick)
    const pl = c.src === 'franko' ? c.note.map(a => placeNote(a, reg)).map(({ ar: _ar, ...p }) => p) : undefined
    const row: PhrRow = {
      p: c.text, k: 'p', d: c.src === 'nomis' ? 'n' : 'f', ...(m !== c.text ? { m } : {}), l: locatorOf(c), s: c.ia, ...(c.quote !== c.text ? { q: c.quote } : {}),
      ...(c.variants?.length ? { v: c.variants } : {}), ...(pl?.length ? { pl } : {}),
    }
    phrClaim(lemmas[0]!, row)   // GG-19: the evidence validator (source, non-empty locator, non-empty quote); throws EvidenceError
    stats.kept[c.src] = (stats.kept[c.src] ?? 0) + 1; stats.volumes[c.ia]!.kept++
    if (c.page) stats.withPage++
    if (pl) for (const x of pl) x.gr === 'p' ? stats.placeResolved++ : stats.placeUnresolved++
    const own = new Set(c.hw && !c.hw.includes(' ') ? lemmasOf(c.hw) : [])
    for (const l of lemmas) { const r2: PhrRow = own.has(l) ? row : { ...row, x: 1 }; (phr[l] ??= []).push(r2) }
  }
  for (const s of Object.keys(stats.candidates)) stats.rejectedShare[s] = ratio((stats.candidates[s] ?? 0) - (stats.kept[s] ?? 0), stats.candidates[s] ?? 0)
  stats.rows = Object.values(phr).reduce((n, l) => n + l.length, 0); stats.heads = Object.keys(phr).length
  return { phr, stats }
}
