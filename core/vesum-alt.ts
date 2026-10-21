/**
 * SPEC 63 MM-10: every VESUM `:alt` lemma («альтернативне написання (не за чинним правописом)», doc/tags.txt) is linked to its standard lemma.
 * VERIFIED: VESUM does NOT store the pointer (an alt lemma is a stand-alone lemma block, e.g. `термінольоґія noun:inanim:f:v_naz:alt`; the comment column holds only
 * generation codes such as `# xv3`; twisters.lst lists `bad` lemmas only). So the standard lemma is found by the cited 1928 folds (core/orth1928.ts): a fold chain
 * that turns the alt lemma into a NON-alt VESUM lemma of the same part of speech. No chain, no link (no cite, no rule).
 * Pure over the headword table of pipelines/vesum.ts lemmaLines(): key → [lemma as written, tags (homonyms joined with « | »)].
 */
import { fold } from './orthography.ts'
import { key } from './text.ts'

export interface AltLink { alt: string; std: string; trace: string[] }
const pieces = (tags: string) => tags.split(' | ')
const isAlt = (t: string) => t.split(':').includes('alt')
const isProp = (t: string) => t.split(':').includes('prop')
const posOf = (t: string) => t.split(':')[0] ?? ''

export function altStandardMap(heads: ReadonlyMap<string, readonly [string, string]>): Map<string, AltLink> {
  const out = new Map<string, AltLink>()
  for (const [k, [word, tags]] of heads) {
    const ps = pieces(tags)
    if (!ps.some(isAlt) || ps.some(t => !isAlt(t))) continue   // a pure alt lemma only: a homonym that is also standard keeps its own block
    const pos = new Set(ps.map(posOf)), prop = ps.some(isProp)
    for (const c of fold(k, '1928')) {
      if (c.form === k) continue
      const h = heads.get(key(c.form)); if (!h) continue
      const hp = pieces(h[1]).filter(t => !isAlt(t) && pos.has(posOf(t)) && isProp(t) === prop)   // a name stays a name (аванґард ≠ Авангард)
      if (hp.length) { out.set(k, { alt: word, std: prop ? h[0] : h[0].toLowerCase() === h[0] ? h[0] : key(h[0]), trace: c.trace }); break }
    }
  }
  return out
}

/** public/data/alt.json: the links a card can show (alt spelling, standard lemma, fold ids with their quotes in core/orth1928.ts) */
export interface AltFile { format: 1; links: [alt: string, std: string, folds: string[]][] }
export const altFile = (m: ReadonlyMap<string, AltLink>): AltFile => ({ format: 1, links: [...m.values()].map(l => [l.alt, l.std, l.trace] as [string, string, string[]]).sort((a, b) => a[0].localeCompare(b[0])) })
/** standard lemma of an alt spelling (key-insensitive), or undefined */
export const stdOfAlt = (f: AltFile | undefined, word: string): { std: string; folds: string[] } | undefined => {
  const k = key(word), l = f?.links.find(x => key(x[0]) === k)
  return l ? { std: l[1], folds: l[2] } : undefined
}
