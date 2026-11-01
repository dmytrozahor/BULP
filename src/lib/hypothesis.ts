/**
 * SPEC 63 CP-11 — the browser side of core/hypothesis.ts. Nothing is shipped per hypothetical word: the page of /w/<word> that has no entry is generated at route time from the indexes
 * the card routes already read (ix/, dx/, cd/, cv/, lm/par/), each lazy and sharded. `buildHypothesis(word, deps)` is pure over `deps`, so tests inject a fake lexicon.
 */
import { settled, ixRow, ixCards, loadCore, lmLoad } from './parts.ts'
import { ruKey } from '../../core/ru-contact.ts'
import { ruHitsOf, type RuHeadFile } from '../../core/ru-head.ts'
import { loadCv } from './cardIndex.ts'
import { parOf } from './thinPar.ts'
import { cardRoute, lk } from '../../core/cv.ts'
import { key } from '../../core/text.ts'
import {
  baseCandidates, derivedCandidates, formNotes, hypClaim, RU_COINCIDE_NOTE, type FormNotes, isPluralOnly, pluralCandidates, singularOf, type HypRule,
} from '../../core/hypothesis.ts'
import { D, type Claim, type Evidence } from '../../core/evidence.ts'
import { swapCandidates, swapRule } from '../../core/iswap.ts'
import { orthAttestedOf } from './orthAttestedData.ts'

/** a word that has a real page */
export interface Found { word: string; to: string; tags: string }
export interface Deps {
  /** the real page of a word (lexicon card, light / dictionary / archaic card), or undefined */
  resolve(w: string): Promise<Found | undefined>
  /** the genitive plural of a plural-only lemma when its paradigm is available */
  genPl?(w: string): Promise<string | undefined>
  /** CP-11c: how many Russian headwords (ru→uk dictionaries, lm/ru, lazy) are spelled like the form */
  ruHeads?(w: string): Promise<number>
  /** CP-11f: old-dictionary spellings of the lemma (lm/oa: Грінченко, Желехівський) with their cites */
  oaOf?(w: string): Promise<{ form: string; ev: Evidence }[]>
}
export type RelRole = 'plural' | 'singular' | 'variant' | 'derived' | 'base' | 'swap' | 'attested'
/** a relation of a (hypothetical or real) word to another page; `hyp` = the other end is itself a hypothesis (no page of evidence) */
export interface Relation { role: RelRole; form: string; to: string; hyp: boolean; rule: HypRule; tags?: string; notes?: Notes; /** CP-11f: the cites of an attested и/і variant */ evidence?: Evidence[] }
/** CP-11c: labels of a reconstructed form: the old-declension note (known to the rule) and the Russian coincidence (the repo Russian headword index) */
export interface Notes extends FormNotes { ru?: string }
export interface Hypothesis { word: string; notes?: Notes; rules: HypRule[]; claim: Claim<string>; relations: Relation[] }

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
  async oaOf(w) {
    const e = await orthAttestedOf(w).catch(() => undefined)
    return Object.values(e ?? {}).map(c => ({ form: c.form, ev: c.ev }))
  },
  async ruHeads(w) {
    const k = ruKey(w), f = await lmLoad<RuHeadFile>('ru', k).catch(() => undefined)
    return ruHitsOf(f?.entries, k).length
  },
  async genPl(w) {
    await settled(() => parOf(w))
    const l = parOf(w)?.find(x => key(x.lemma) === key(w))
    return l?.paradigm.find(f => /(^|:)v_rod(:|$)/.test(f.tags))?.form
  },
}

/** CP-11c: the labels of a hypothetical form */
export async function notesOf(form: string, rule: HypRule, d: Deps): Promise<Notes | undefined> {
  const n: Notes = formNotes(form, rule)
  if (await d.ruHeads?.(form)) n.ru = RU_COINCIDE_NOTE
  return n.archaic || n.hardened || n.ru ? n : undefined
}

/** the relations of a REAL word to the hypothetical pages: its singular (plurale tantum), its base chain, the derived forms that exist. Every end is a page; `hyp` marks the ones without evidence. */
export async function relationsOf(word: string, tags: string, d: Deps = browserDeps, forms: string[] = []): Promise<Relation[]> {
  const out: Relation[] = []
  const seen = new Set<string>([key(word)])
  // CP-11f: и/і variants ATTESTED for THIS lemma (a corpus spelling of its own card, an old dictionary row for it). A swap that is merely another real word (кит ~ кіт) is never listed.
  const ii = (x: string) => key(x).replaceAll('и', 'і')
  for (const f of forms) if (f !== word && ii(f) === ii(word) && !seen.has(key(f))) { seen.add(key(f)); out.push({ role: 'attested', form: f, to: `/f/${encodeURIComponent(f)}?lemma=${encodeURIComponent(word)}`, hyp: false, rule: swapRule(word, f), evidence: [D('CORPUS', f, `написання «${f}» засвідчено в корпусі як форму леми «${word}»`)] }) }
  for (const o of await d.oaOf?.(word) ?? []) if (ii(o.form) === ii(word) && key(o.form) !== key(word) && !seen.has(key(o.form))) { seen.add(key(o.form)); out.push({ role: 'attested', form: o.form, to: '', hyp: false, rule: swapRule(word, o.form), evidence: [o.ev] }) }
  if (isPluralOnly(tags)) {
    const all = singularOf(word, await d.genPl?.(word)), sg = all[0]
    // CP-11e: the hardened-р variant of an old i-stem singular (дверь → двер) is a second page beside it
    for (const [i, c] of [sg, ...all.filter(x => x.rule.id === 'SG-HARD-R' && sg?.rule.id === 'SG-F-SOFT')].entries()) {
      if (!c || seen.has(c.form)) continue
      const r = await d.resolve(c.form); seen.add(c.form)
      out.push({ role: i ? 'variant' : 'singular', form: r?.word ?? c.form, to: r?.to ?? hypTo(c.form), hyp: !r, rule: c.rule, tags: r?.tags, notes: r ? undefined : await notesOf(c.form, c.rule, d) })
    }
  }
  // base chain (байдикування → байдикувати → байдик): up to three steps, each end real or hypothetical
  let cur = word
  for (let i = 0; i < 3; i++) {
    const b = baseCandidates(cur)[0]; if (!b || seen.has(b.form)) break
    seen.add(b.form)
    const r = await d.resolve(b.form)
    out.push({ role: 'base', form: r?.word ?? b.form, to: r?.to ?? hypTo(b.form), hyp: !r, rule: b.rule, tags: r?.tags, notes: r ? undefined : await notesOf(b.form, b.rule, d) })
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
    const all = singularOf(p, await d.genPl?.(p)), sg = all.find(s => s.form === w)
    if (!sg) continue
    from ||= r.word; if (!rules.includes(sg.rule)) rules.push(sg.rule)
    rel.push({ role: 'plural', form: r.word, to: r.to, hyp: false, rule: sg.rule, tags: r.tags })
    // CP-11e: дверь and двер are variants of one another: each page cross-links to the other
    for (const v of all.filter(x => x.form !== w && (x.rule.id === 'SG-HARD-R' || x.rule.id === 'SG-F-SOFT') && (sg.rule.id === 'SG-HARD-R' || sg.rule.id === 'SG-F-SOFT'))) {
      const vr = await d.resolve(v.form)
      rel.push({ role: 'variant', form: vr?.word ?? v.form, to: vr?.to ?? hypTo(v.form), hyp: !vr, rule: v.rule, tags: vr?.tags, notes: vr ? undefined : await notesOf(v.form, v.rule, d) })
    }
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
  if (!rel.length) {   // CP-11f: a real word one (then two) и/і swaps away — only for a word that is itself not real (checked above)
    for (const n of [1, 2] as const) {
      for (const c of swapCandidates(w, n)) {
        if (n === 2 && swapCandidates(w, 1).includes(c)) continue
        const r = await d.resolve(c); if (!r) continue
        const rule = swapRule(w, c); from ||= r.word; if (!rules.includes(rule)) rules.push(rule)
        rel.push({ role: 'swap', form: r.word, to: r.to, hyp: false, rule, tags: r.tags })
      }
      if (rel.length) break
    }
  }
  if (!rel.length) return undefined
  return { word: w, rules, claim: hypClaim(w, rules[0]!, from), relations: rel, notes: await notesOf(w, rules[0]!, d) }
}
