/**
 * Origin of each і / и in a modern form (research/27 §1: "a dialect IPA for a written standard form can only be produced from the
 * derivation trace, never from the spelling alone"). Two routes, both evidence-based, neither guesses:
 *  - forward: replay the trace of an attested old spelling (core/phonology.ts derive) and tag the letter each R09/R10/R11/R12 step created;
 *  - paradigm: a VESUM alternation (кінь ~ коня, піч ~ печі) proves R10 о/е (the same test as core/reverse.ts `ikav`); nothing else is claimed.
 * Origins are aligned to the characters of the modern form (lower-case, apostrophe unified).
 */
import { derive, finish, ruleById } from './phonology.ts'
import { stripStress, unifyApostrophe, key } from './text.ts'

export interface Origin {
  rule: 'R09' | 'R10' | 'R11' | 'R12'
  /** the letter the rule replaced: о | е | ѣ | ы | ѥ */
  src: string
  /** R10: the jer that fell after the syllable (ъ hard, ь soft) — research/27 §3.4 class 7 (мед : меду vs ніс : несла) */
  jer?: 'ъ' | 'ь'
  /** R09: new ѣ (< е in a newly closed syllable, WP «Новий ять») or old ѣ (research/27 §3.4 class 9: ѣ₂ vs ѣ) */
  kind?: 'new'
  /** paradigm form that proves an R10 alternation (route 'paradigm') */
  proof?: string
}
export type Origins = (Origin | null)[]
export interface OriginResult { origins: Origins; via: 'trace' | 'paradigm' | 'none'; old?: string; trace?: string[] }

const CONS = 'бвгґджзйклмнпрстфхцчшщ'
const norm = (form: string) => unifyApostrophe(stripStress(form)).toLowerCase()

/** a[i] → b index (or -1): minimum-edit alignment, substitutions preferred to indel pairs. */
export function align(a: string, b: string): number[] {
  const n = a.length, m = b.length
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
    d[i]![j] = Math.min(d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1), d[i - 1]![j]! + 1, d[i]![j - 1]! + 1)
  const map = new Array<number>(n).fill(-1)
  let i = n, j = m
  while (i > 0 && j > 0) {
    if (d[i]![j] === d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)) { map[i - 1] = j - 1; i--; j-- }
    else if (d[i]![j] === d[i - 1]![j]! + 1) i--
    else j--
  }
  return map
}

const JER_AFTER = new RegExp(`^[${CONS}]{1,2}(ь)?·`)
/** WP «Новий ять» (research/27 §3.4 class 9): «На письмі позначався літерою ѣ: наприклад, камѣнь, матѣрь» + шѣсть, пѣчь (research/27 §3.2). A bare ѣ in a closed syllable cannot be told apart from an etymological one (лѣсъ), so only the listed lexemes are 'new'. */
const NEW_YAT_WORDS = /^(камѣн|матѣр|шѣст|пѣч)/u

function tagStep(rule: string, a: string, b: string, tags: Origins): Origins {
  const map = align(a, b), out: Origins = new Array(b.length).fill(null)
  a.split('').forEach((ch, k) => {
    const j = map[k]!; if (j < 0) return
    const to = b[j]!
    if (ch === to) { out[j] = tags[k] ?? null; return }
    if (rule === 'R10' && 'ое'.includes(ch) && to === 'і') out[j] = { rule: 'R10', src: ch, jer: JER_AFTER.exec(a.slice(k + 1))?.[1] ? 'ь' : 'ъ' }
    else if (rule === 'R09' && ch === 'ѣ' && 'іїi'.includes(to)) out[j] = { rule: 'R09', src: 'ѣ', ...(NEW_YAT_WORDS.test(a) ? { kind: 'new' as const } : {}) }
    else if (rule === 'R11' && ch === 'ы' && to === 'и') out[j] = { rule: 'R11', src: 'ы' }
    else if (rule === 'R12' && ch === 'ѥ' && to === 'ї') out[j] = { rule: 'R12', src: 'ѥ' }
  })
  return out
}

/** Every modern candidate of `old` with the origin of each of its letters. */
export function originsForward(old: string, opts: { oldI?: boolean } = {}): { form: string; trace: string[]; origins: Origins }[] {
  const d = derive(old, opts)
  return d.candidates.map(c => {
    let cur = d.norm, tags: Origins = new Array(cur.length).fill(null)
    for (const id of c.trace) { const next = ruleById[id]!.apply(cur); tags = tagStep(id, cur, next, tags); cur = next }
    const fin = finish(cur)
    const map = align(cur, fin), out: Origins = new Array(fin.length).fill(null)
    cur.split('').forEach((ch, k) => { const j = map[k]!; if (j >= 0 && ch === fin[j]) out[j] = tags[k] ?? null })
    return { form: c.form, trace: c.trace, origins: out }
  })
}

/** R10 о/е proved by the paradigm: a form that has о/е where `w` has і (same test as reverse.ts `ikav`). */
export function originsFromParadigm(w: string, paradigm: string[]): Origins {
  const par = paradigm.map(key)
  return w.split('').map((ch, i): Origin | null => {
    if (ch !== 'і') return null
    for (const x of ['о', 'е']) {
      const prefix = w.slice(0, i) + x + w.slice(i + 1, i + 2), p = par.find(q => q.startsWith(prefix) && q !== w)
      if (p) return { rule: 'R10', src: x, proof: p }
    }
    return null
  })
}

/** Best available origin evidence for a modern form: an attested old spelling that derives to it, else the paradigm alternation. */
export function originsFor(form: string, ctx: { paradigm?: string[]; oldForms?: string[] } = {}): OriginResult {
  const s = norm(form), none: Origins = new Array(s.length).fill(null)
  for (const old of [...new Set(ctx.oldForms ?? [])].slice(0, 40)) {
    let cs: ReturnType<typeof originsForward> = []
    try { cs = originsForward(old) } catch { continue }
    const hit = cs.filter(c => c.form.toLowerCase() === s && c.origins.length === s.length).sort((a, b) => a.trace.length - b.trace.length)[0]
    if (hit && hit.origins.some(Boolean)) return { origins: hit.origins, via: 'trace', old, trace: hit.trace }
  }
  const p = originsFromParadigm(s, ctx.paradigm ?? [])
  return p.some(Boolean) ? { origins: p, via: 'paradigm' } : { origins: none, via: 'none' }
}
