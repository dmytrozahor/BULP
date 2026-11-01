/**
 * SPEC 63 CP-11 — the browser side of core/hypothesis.ts. Nothing is shipped per hypothetical word: the page of /w/<word> that has no entry is generated at route time from the indexes
 * the card routes already read (ix/, dx/, cd/, cv/, lm/par/), each lazy and sharded. `buildHypothesis(word, deps)` is pure over `deps`, so tests inject a fake lexicon.
 */
import { settled, ixRow, ixCards, loadCore } from './parts.ts'
import { loadCv } from './cardIndex.ts'
import { parOf } from './thinPar.ts'
import { cardRoute, lk } from '../../core/cv.ts'
import { key } from '../../core/text.ts'
import {
  baseCandidates, derivedCandidates, hypClaim, isPluralOnly, pluralCandidates, singularOf, type HypRule,
} from '../../core/hypothesis.ts'
import type { Claim } from '../../core/evidence.ts'

/** a word that has a real page */
export interface Found { word: string; to: string; tags: string }
export interface Deps {
  /** the real page of a word (lexicon card, light / dictionary / archaic card), or undefined */
  resolve(w: string): Promise<Found | undefined>
  /** the genitive plural of a plural-only lemma when its paradigm is available */
  genPl?(w: string): Promise<string | undefined>
}
export type RelRole = 'plural' | 'singular' | 'derived' | 'base'
/** a relation of a (hypothetical or real) word to another page; `hyp` = the other end is itself a hypothesis (no page of evidence) */
export interface Relation { role: RelRole; form: string; to: string; hyp: boolean; rule: HypRule; tags?: string }
export interface Hypothesis { word: string; rules: HypRule[]; claim: Claim<string>; relations: Relation[] }

export const hypTo = (w: string) => `/w/${encodeURIComponent(w)}`

/** the browser's resolver over the shard stores (lazy: a lookup reads the leaf shard of the key, the tags one cd / cv shard) */
export const browserDeps: Deps = {
  async resolve(w) {
    const k = key(w)
    const [row, cards] = await settled(() => [ixRow(k), ixCards.get(lk(w))] as const)
    const lem = row?.h?.find(h => h[1] === 0 && key(h[0]) === k)
    if (lem) return { word: lem[0], to: hypTo(lem[0]), tags: (await loadCore(lem[0]))?.paradigm[0]?.tags ?? '' }
    const c = cards?.find(x => key(x.id) === k) ?? cards?.[0]
    if (c && key(c.id) === k) return { word: c.id, to: cardRoute(c), tags: (await loadCv(c.id).catch(() => undefined))?.[1] ?? '' }
    return undefined
  },
  async genPl(w) {
    await settled(() => parOf(w))
    const l = parOf(w)?.find(x => key(x.lemma) === key(w))
    return l?.paradigm.find(f => /(^|:)v_rod(:|$)/.test(f.tags))?.form
  },
}

/** the relations of a REAL word to the hypothetical pages: its singular (plurale tantum), its base chain, the derived forms that exist. Every end is a page; `hyp` marks the ones without evidence. */
export async function relationsOf(word: string, tags: string, d: Deps = browserDeps): Promise<Relation[]> {
  const out: Relation[] = []
  const seen = new Set<string>([key(word)])
  if (isPluralOnly(tags)) {
    const sg = singularOf(word, await d.genPl?.(word))[0]
    if (sg && !seen.has(sg.form)) { const r = await d.resolve(sg.form); seen.add(sg.form); out.push({ role: 'singular', form: r?.word ?? sg.form, to: r?.to ?? hypTo(sg.form), hyp: !r, rule: sg.rule, tags: r?.tags }) }
  }
  // base chain (байдикування → байдикувати → байдик): up to three steps, each end real or hypothetical
  let cur = word
  for (let i = 0; i < 3; i++) {
    const b = baseCandidates(cur)[0]; if (!b || seen.has(b.form)) break
    seen.add(b.form)
    const r = await d.resolve(b.form)
    out.push({ role: 'base', form: r?.word ?? b.form, to: r?.to ?? hypTo(b.form), hyp: !r, rule: b.rule, tags: r?.tags })
    cur = b.form
  }
  for (const c of derivedCandidates(word)) {
    if (seen.has(c.form)) continue
    const r = await d.resolve(c.form); if (r) { seen.add(c.form); out.push({ role: 'derived', form: r.word, to: r.to, hyp: false, rule: c.rule, tags: r.tags }) }
  }
  return out
}

/**
 * The hypothesis page of a word that has no entry: undefined when the word has a real page (never presented as hypothetical) or when no rule derives it from anything real.
 * Sources: (1) a real plural-only noun whose regular singular it is; (2) real words derived from it by a suffix rule; (3) a real word whose base chain passes through it.
 */
export async function buildHypothesis(word: string, d: Deps = browserDeps): Promise<Hypothesis | undefined> {
  const w = key(word)
  if ([...w].length < 3 || !/^\p{L}[\p{L}'’ʼ-]*$/u.test(w) || await d.resolve(w)) return undefined
  const rel: Relation[] = [], rules: HypRule[] = []
  let from = ''
  for (const p of pluralCandidates(w)) {
    const r = await d.resolve(p); if (!r || !isPluralOnly(r.tags)) continue
    const sg = singularOf(p, await d.genPl?.(p)).find(s => s.form === w)
    if (!sg) continue
    from ||= r.word; if (!rules.includes(sg.rule)) rules.push(sg.rule)
    rel.push({ role: 'plural', form: r.word, to: r.to, hyp: false, rule: sg.rule, tags: r.tags })
  }
  for (const c of derivedCandidates(w)) {
    const r = await d.resolve(c.form); if (!r) continue
    from ||= r.word; if (!rules.includes(c.rule)) rules.push(c.rule)
    rel.push({ role: 'derived', form: r.word, to: r.to, hyp: false, rule: c.rule, tags: r.tags })
  }
  for (const b of baseCandidates(w)) {   // a derived form whose real base exists
    const r = await d.resolve(b.form); if (!r) continue
    from ||= r.word; if (!rules.includes(b.rule)) rules.push(b.rule)
    rel.push({ role: 'base', form: r.word, to: r.to, hyp: false, rule: b.rule, tags: r.tags })
  }
  if (!rel.length) return undefined
  return { word: w, rules, claim: hypClaim(w, rules[0]!, from), relations: rel }
}
