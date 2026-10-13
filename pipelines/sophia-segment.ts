/**
 * Dictionary segmentation of CONTINUOUS (scriptio continua) Sophia transcriptions — SPEC 00 P-1.7 (anything inferred is labelled with `method`).
 *
 * Many graffiti have no word spacing in the portal's diplomatic `transcription` (e.g. «пꙍмоꙁрабꙋсвꙍѥмꙋ»); with no `interpretative_edition` the only way to get words is to cut
 * the run. A cut is accepted ONLY when EVERY segment links, i.e. build-link.ts `linkOptions` finds a modern VESUM lemma for it by the same routes the build uses:
 *   - derive/fold candidates of the spelling that are VESUM forms (the `token` / `direct` route), or
 *   - the lemma that a scholarly witness (TOROT) gave the SAME spelling (attested corpus spelling → `torot-lemma` route).
 * Among the admissible cuts the one with the fewest segments wins, then the fewest segments shorter than MIN_FREE letters, then the highest attested corpus frequency of the segments.
 * Segments shorter than MIN_FREE letters are allowed only from the closed list of real short words below, and a cut with more than one such segment per four is refused. A run containing supralinear Cyrillic letters (U+2DE0–U+2DFF, abbreviations),
 * a run no cut of which links, or a cut with < ⅔ of its letters in attested corpus spellings (the dictionary alone is too lenient), is NOT segmented (the caller then keeps the inscription display-only). Tokens so produced carry `method: 'segmentation'`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { derive as deriveRaw } from '../core/phonology.ts'
import { fold as foldRaw } from '../core/orthography.ts'
import type { WitnessOut } from '../core/types.ts'
import { linkOptions, wantedKeys, type Env, type TypeCtx } from './build-link.ts'
import { vesumIndex } from './vesum.ts'
import type { Segmenter } from './ingest-sophia.ts'

/** Real one- and two-letter words (conjunctions, prepositions, particles, short pronouns) that may stand as a segment of their own. */
export const SHORT_WORDS = new Set(['и', 'а', 'в', 'с', 'к', 'о', 'у', 'я', 'ѹ', 'ї', 'на', 'не', 'ни', 'по', 'за', 'до', 'во', 'от', 'ис', 'из', 'же', 'ли', 'бо', 'мя', 'ти', 'ся', 'си', 'мѣ', 'мы', 'ты', 'вы', 'мъ', 'въ', 'съ', 'къ', 'оу', 'ѿ', 'та', 'то', 'ту', 'тоѣ', 'ѥ', 'ѥго', 'аз', 'ѧ', 'ѩ'])
/** Segments shorter than this must be a real short word or a well-attested corpus spelling (`shortOk`): short strings link to VESUM by accident (по|мозир|абу|сво|ему). */
export const MIN_FREE = 4
const SUPRALINEAR = /[ⷠ-ⷿ]/u
const norm = (s: string) => s.normalize('NFC').toLowerCase()

/** Letter + its combining marks (titlo, accents) per unit, so segments rejoin exactly as written; `plain` is the lower-case base letter. */
export function units(chunk: string): { raw: string[]; plain: string[] } | undefined {
  if (SUPRALINEAR.test(chunk)) return undefined
  const raw: string[] = []
  for (const c of chunk.normalize('NFC')) { if (/\p{M}/u.test(c) && raw.length) raw[raw.length - 1] += c; else raw.push(c) }
  return { raw, plain: raw.map(u => norm(u.replace(/\p{M}/gu, ''))) }
}

/** Pure DP segmentation (see the header for the order of preference). `links(s)` says whether a plain lower-case segment links; `prior(s)` is its attested weight. */
export function segment(chunk: string, links: (s: string) => boolean, prior: (s: string) => number = () => 0, shortOk: (s: string) => boolean = s => SHORT_WORDS.has(s), maxLen = 16): string[] | undefined {
  const u = units(chunk); if (!u || !u.plain.length) return undefined
  const n = u.plain.length
  type Cell = { cost: [number, number, number]; prev: number }
  const best: (Cell | undefined)[] = new Array(n + 1).fill(undefined); best[0] = { cost: [0, 0, 0], prev: -1 }
  const lt = (a: number[], b: number[]) => { for (let i = 0; i < 3; i++) if (a[i]! !== b[i]!) return a[i]! < b[i]!; return false }
  for (let i = 1; i <= n; i++) {
    for (let j = Math.max(0, i - maxLen); j < i; j++) {
      const from = best[j]; if (!from) continue
      const s = u.plain.slice(j, i).join(''), len = i - j
      if (len < MIN_FREE && !shortOk(s)) continue
      if (!/^\p{L}+$/u.test(s) || !links(s)) continue
      const cost: [number, number, number] = [from.cost[0] + 1, from.cost[1] + (len < MIN_FREE ? 1 : 0), from.cost[2] - prior(s)]
      if (!best[i] || lt(cost, best[i]!.cost)) best[i] = { cost, prev: j }
    }
  }
  if (!best[n]) return undefined
  const out: string[] = []
  for (let i = n; i > 0; i = best[i]!.prev) out.unshift(u.raw.slice(best[i]!.prev, i).join(''))
  // a cut made mostly of tiny words is a coincidence of the dictionary, not a reading: at most one segment shorter than MIN_FREE letters per four segments
  const tiny = out.filter(s => [...s.replace(/\p{M}/gu, '')].length < MIN_FREE).length
  if (out.length === 1) return out                 // the whole run is one linking word: nothing was inferred
  if (tiny * 4 > out.length) return undefined
  // and the dictionary alone is too lenient (derive candidates make «ѣсте», «азам» link): at least two thirds of the letters must sit in spellings the scholarly witnesses attest
  const len = (s: string) => [...s.replace(/\p{M}/gu, '')].length
  const known = out.filter(s => prior(norm(s.replace(/\p{M}/gu, ''))) > 0 || shortOk(norm(s))).reduce((a, s) => a + len(s), 0)
  return known * 3 < n * 2 ? undefined : out
}

export interface Attested { lemma?: string; n: number }
/** Spellings of every non-Sophia witness in data/work (TOROT etc.) with their commonest scholarly lemma. */
export function loadAttested(dir = resolve('data/work')): Map<string, Attested> {
  const acc = new Map<string, { n: number; lem: Map<string, number> }>()
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith('.json') || /\.nlp\.json$|^stress|^ru|request|^sophia-/.test(f)) continue
    const w = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as Partial<WitnessOut>
    if (!Array.isArray(w.tokens) || !w.id || w.lang === 'uk') continue
    for (const t of w.tokens) {
      const k = norm(t.raw.replace(/\p{M}/gu, '')); if (!k) continue
      const a = acc.get(k) ?? acc.set(k, { n: 0, lem: new Map() }).get(k)!
      a.n++; if (t.lemma) a.lem.set(t.lemma, (a.lem.get(t.lemma) ?? 0) + 1)
    }
  }
  return new Map([...acc].map(([k, a]) => [k, { n: a.n, ...(a.lem.size ? { lemma: [...a.lem].sort((x, y) => y[1] - x[1])[0]![0] } : {}) }]))
}

/** The `links` oracle of the build, restricted to the substrings of `chunks` (one VESUM pass for all of them). */
export async function buildSegmenter(chunks: { chunk: string; lang: WitnessOut['lang']; oldI: boolean }[], attested: Map<string, Attested>,
  index: (forms: Set<string>) => Promise<{ hits: Env['hits'] }> = f => vesumIndex(f, new Set())): Promise<Segmenter> {
  const dmemo = new Map<string, ReturnType<typeof deriveRaw>>(), fmemo = new Map<string, ReturnType<typeof foldRaw>>()
  const derive: Env['derive'] = (s, oldI) => { const k = (oldI ? '1' : '0') + s; let d = dmemo.get(k); if (!d) dmemo.set(k, d = deriveRaw(s, { oldI })); return d }
  const fold: Env['fold'] = (s, orth) => { const k = (orth ?? '') + '|' + s; let d = fmemo.get(k); if (!d) fmemo.set(k, d = foldRaw(s, orth)); return d }
  const ctxOf = (lang: WitnessOut['lang'], oldI: boolean, raw: string): TypeCtx => ({ lang, oldI, raw, ...(attested.get(raw)?.lemma ? { lemma: attested.get(raw)!.lemma } : {}) })
  const shortOk = (s: string) => SHORT_WORDS.has(s)
  const wanted = new Map<string, TypeCtx>()
  for (const { chunk, lang, oldI } of chunks) {
    const u = units(chunk); if (!u) continue
    for (let i = 0; i < u.plain.length; i++) for (let j = i + 1; j <= Math.min(u.plain.length, i + 16); j++) {
      const s = u.plain.slice(i, j).join('')
      if ((j - i < MIN_FREE && !shortOk(s)) || !/^\p{L}+$/u.test(s)) continue
      wanted.set(`${lang}|${oldI ? 1 : 0}|${s}`, ctxOf(lang, oldI, s))
    }
  }
  const forms = new Set<string>()
  for (const t of wanted.values()) for (const k of wantedKeys(t, { derive, fold })) forms.add(k)
  const env: Env = { hits: (await index(forms)).hits, derive, fold }
  const memo = new Map<string, boolean>()
  const links = (lang: WitnessOut['lang'], oldI: boolean, s: string) => {
    const k = `${lang}|${oldI ? 1 : 0}|${s}`; let v = memo.get(k)
    if (v === undefined) memo.set(k, v = !!linkOptions(wanted.get(k) ?? ctxOf(lang, oldI, s), env))
    return v
  }
  return (chunk, { lang, oldI }) => segment(chunk, s => links(lang, oldI, s), s => Math.log(1 + (attested.get(s)?.n ?? 0)), shortOk)
}
