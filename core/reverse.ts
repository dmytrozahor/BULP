/**
 * Backward derivation modern → old (SPEC 30 D-2/D-3): reconstruction hypotheses, never facts (P-1.7).
 *
 * > "D-2.1 Each forward sound rule that is invertible declares `invert` (a branching generator): R09 і → ѣ | і; R10 і → о | е (in a closed syllable,
 * >  i.e. when an oblique form of the paradigm shows о/е: кінь–коня, піч–печі — the paradigm (VESUM) is the evidence for the choice); R16 в → л …"
 * > "D-2.2 a backward candidate is kept only if `derive(candidate)` reproduces the modern form (P-1.5 consistency)."
 * > "D-2.3 Ranking: candidates attested in the corpus first, marked `confirmed-by-attestation`; then by fewest branches; cap 12."
 * > "D-3.1 … if no path exists, say so (unknown), never invent a rule."  — SPEC 30
 *
 * The inversion table below is keyed by forward rule id; every step's citation is the forward rule's own `cite` from RULES
 * (no new rules, P-1.3). Rows are applied in the reverse order of RULES. The round-trip through the forward `derive` is the oracle.
 */
import { D, type Evidence } from './evidence.ts'
import { derive, ruleById, type SoundRule } from './phonology.ts'
import { key } from './text.ts'
import type { Kwic, TraceStep } from './types.ts'

export type ReverseStatus = 'reconstruction' | 'confirmed-by-attestation'
export interface ReverseCandidate {
  form: string; trace: TraceStep[]; branches: number; status: ReverseStatus; evidence: Evidence[]
  method: 'reconstruction'; attestation?: Kwic
  /** step-specific data evidence (paradigm forms), parallel to `trace` */ stepEvidence: Evidence[][]
}
export interface ReverseOpts { paradigm?: string[]; attested?: (oldNorm: string) => Kwic | null; oldI?: boolean }

const CONS = 'бвгґджзйклмнпрстфхцчшщ'
const R = (s: string, f = 'g') => new RegExp(s.replaceAll('C', `[${CONS}]`), f)
const ID = (id: string) => ruleById[id]!

interface Alt { w: string; ev?: Evidence[]; cost?: number }
interface Ctx { par: string[] }
interface Row { id: string; /** the single correct way to read the form: the unchanged form is not offered */ forced?: boolean; gen: (w: string, c: Ctx) => Alt[] }

/** All ways of rewriting ≥1 of the first 5 matches of `re` (global) with the alternatives f(m); the unmatched/unchanged are kept. */
function expand(w: string, re: RegExp, f: (m: RegExpMatchArray) => (string | Alt)[]): Alt[] {
  const ms = [...w.matchAll(re)].slice(0, 5), out: Alt[] = []
  const go = (k: number, pos: number, acc: string, ev: Evidence[], ch: boolean): void => {
    if (k === ms.length) { if (ch) out.push({ w: acc + w.slice(pos), ev }); return }
    const m = ms[k]!, head = acc + w.slice(pos, m.index!), end = m.index! + m[0].length
    go(k + 1, end, head + m[0], ev, ch)
    for (const a of f(m)) { const x = typeof a === 'string' ? { w: a } : a; go(k + 1, end, head + x.w, [...ev, ...(x.ev ?? [])], true) }
  }
  go(0, 0, '', [], false)
  return out
}
const one = (w: string, re: RegExp, f: (m: RegExpMatchArray) => string) => expand(w, re, m => [f(m)])

/** Paradigm evidence for an alternation of the vowel at `i` in `w` (кінь–коня: і ~ о; сон–сну: о ~ ∅). */
const alt = (par: string[], w: string, prefix: string): Evidence[] => {
  const p = par.find(q => key(q).startsWith(prefix) && key(q) !== w)
  return p ? [D('VESUM', 'парадигма леми', `${w} / ${key(p)}`)] : []
}
const ikav = (w: string, i: number, c: Ctx) => (['о', 'е'] as const).flatMap(x => {
  const ev = alt(c.par, w, w.slice(0, i) + x + w.slice(i + 1, i + 2)); return ev.length ? [{ w: w.slice(0, i) + x + w.slice(i + 1), ev }] : []
})
const fleeting = (w: string, c: Ctx): Alt[] => [...w.matchAll(R('[ое](?=C+ь?$)'))].flatMap(m => {
  const i = m.index!, ev = alt(c.par, w, w.slice(0, i) + w.slice(i + 1).replace(/ь$/, ''))
  return ev.length ? [{ w: w.slice(0, i) + (m[0] === 'о' ? 'ъ' : 'ь') + w.slice(i + 1) + (w.endsWith('ь') ? '' : 'ъ'), ev, cost: 0 }] : []
})

/** Inversion table, in the order of application (= reverse of RULES). */
const ROWS: Row[] = [
  { id: 'R21', gen: w => one(w, R('^в(?=у|оC)'), () => '') },                                              // drop prothetic в
  { id: 'R19', gen: w => one(w, /р$/g, () => 'рь') },
  { id: 'R18', gen: w => [...one(w, /([жчшщ])$/g, m => m[1] + 'ь'), ...one(w, /([жчшщ])у/g, m => m[1] + 'ю'), ...one(w, /([жчш])а/g, m => m[1] + 'я')] },
  { id: 'R17', gen: w => one(w, /([жчшй])о/g, m => m[1] + 'е') },
  { id: 'R16p', gen: w => one(w, /([аиуяы])в$/g, m => m[1] + 'л') },                                       // -в past → -лъ
  { id: 'R16', gen: w => one(w, R('([ое])в(?=$|C)'), m => m[1] + 'л') },
  { id: 'R15', gen: w => one(w, /([бпвмф])$/g, m => m[1] + 'ь') },
  { id: 'R11', gen: w => [...one(w, /(?<=[бвдзлмнпрстфцґ])и/g, () => 'ы'), ...one(w, /^і/g, () => 'и')] },
  { id: 'R12', gen: w => one(w, /ї/g, () => 'ѥ') },
  { id: 'R09', gen: (w, c) => expand(w, /[ії]/g, m => ikav(w, m.index!, c).length ? [] : ['ѣ']) },        // not where the paradigm proves о/е
  { id: 'R07', gen: w => [...one(w, R('([бвгдзкпстх])ер(ь?)$'), m => m[1] + 'р' + m[2]), ...one(w, /гонь$/g, () => 'гнь')] },
  { id: 'R10', forced: true, gen: (w, c) => expand(w, /і/g, m => ikav(w, m.index!, c).map(a => ({ ...a, w: a.w[m.index!]! }))) },   // only with paradigm evidence
  { id: 'R04', forced: true, gen: (w, c) => { const f = fleeting(w, c); return f.length ? f : /[бвгґджзклмнпрстфхцчшщ]$/.test(w) ? [{ w: w + 'ъ', cost: 0 }] : [] } },
  { id: 'R06', gen: w => [...expand(w, R('(C)(ол|ор)(?=C)'), m => [m[1]! + 'ъ' + m[2]!.slice(1), ...(m[2] === 'ол' ? [m[1]! + 'ьл'] : [])]), ...one(w, R('(C)ер(?=C)'), m => m[1] + 'ьр')] },
  { id: 'R13', gen: w => [...one(w, /([тдсзлнцчжш])\1я$/g, m => m[1] + 'ьѥ'), ...one(w, /([рбпвмф])'я$/g, m => m[1] + 'ьѥ')] },
  { id: 'R05', gen: w => [...one(w, /ий$/g, () => 'ыи'), ...one(w, /ій$/g, () => 'ии')] },
  { id: 'R03', gen: w => one(w, /([кгх])и/g, m => m[1] + 'ы') },
  { id: 'R14', gen: w => one(w, /^(по|за|при|до|від)?бу/g, m => (m[1] ?? '') + 'бы') },
  { id: 'R02', gen: w => [...one(w, /я/g, () => 'ѧ'), ...one(w, /у/g, () => 'ѫ'), ...one(w, /([жчшщц])а/g, m => m[1] + 'ѧ')] },
]
// sanity: the table must invert existing rules only
for (const r of ROWS) if (!ruleById[r.id]) throw new Error(`reverse: unknown rule ${r.id}`)

interface State { w: string; steps: TraceStep[]; sev: Evidence[][]; ev: Evidence[]; cost: number }
const LIMIT = 150

/** D-2: modern → ranked reconstructed old spellings (round-trip filtered, attested first, cap 12). */
export function reverse(modern: string, opts: ReverseOpts = {}): { candidates: ReverseCandidate[] } {
  const m = key(modern), ctx: Ctx = { par: (opts.paradigm ?? []).map(key) }
  let states: State[] = [{ w: m, steps: [], sev: [], ev: [], cost: 0 }]
  for (const row of ROWS) {
    const next: State[] = [], sc = ID(row.id).scope === 'L' ? 1 : 0
    for (const s of states) {
      const alts = row.gen(s.w, ctx)
      if (!(row.forced && alts.length)) next.push(s)
      for (const a of alts) next.push({ w: a.w, steps: [...s.steps, { rule: row.id, from: s.w, to: a.w }], sev: [...s.sev, a.ev ?? []], ev: [...s.ev, ...(a.ev ?? [])], cost: s.cost + (a.cost ?? 1 + sc) })
    }
    states = next.sort((a, b) => a.cost - b.cost).slice(0, LIMIT)
  }
  const best = new Map<string, State>()
  for (const s of states) if (s.w !== m && !best.has(s.w)) best.set(s.w, s)
  const cands: ReverseCandidate[] = []
  for (const s of best.values()) {
    if (!derive(s.w, { oldI: opts.oldI }).candidates.some(c => key(c.form) === m)) continue   // D-2.2 round-trip
    const attestation = opts.attested?.(s.w) ?? undefined
    const cites = [...new Set(s.steps.map(t => t.rule))].map(id => ID(id).cite)
    const att = attestation ? [D(attestation.w || 'corpus', attestation.loc || 'корпус', `${attestation.left} ${attestation.node} ${attestation.right}`.trim() || attestation.node)] : []
    cands.push({ form: s.w, trace: s.steps, branches: s.cost, status: attestation ? 'confirmed-by-attestation' : 'reconstruction',
      evidence: [...cites, ...s.ev, ...att], method: 'reconstruction', attestation, stepEvidence: s.sev })
  }
  cands.sort((a, b) => +(b.status === 'confirmed-by-attestation') - +(a.status === 'confirmed-by-attestation') || a.branches - b.branches
    || a.trace.length - b.trace.length || a.form.localeCompare(b.form))
  return { candidates: cands.slice(0, 12) }
}

// ── D-3 explainer ─────────────────────────────────────────────────────────────────────────────────

const pretty = (s: string) => s.replace(//g, 'о').replace(//g, 'е').replace(/·/g, '')
export interface ExplainStep extends TraceStep { name: string; date: string; scope: SoundRule['scope']; cite: Evidence }
/** D-3.1: shortest forward rule path old → modern (fewest steps, then fewest branches), each step with the rule's citation; null = unknown. */
export function explain(old: string, modern: string, opts: { oldI?: boolean } = {}): { steps: ExplainStep[]; branches: number } | null {
  const d = derive(old, opts), m = key(modern)
  const hit = d.candidates.filter(c => key(c.form) === m).sort((a, b) => a.trace.length - b.trace.length || a.branches - b.branches)[0]
  if (!hit) return null
  let cur = d.norm
  const steps = hit.trace.map((id): ExplainStep => {
    const r = ID(id), next = r.apply(cur), s = { rule: id, from: pretty(cur), to: pretty(next), name: r.name, date: r.date, scope: r.scope, cite: r.cite }
    cur = next; return s
  })
  return { steps, branches: hit.branches }
}

export interface Principle { rule: string; name: string; date: string; evidence: Evidence[]; /** true = the paradigm itself supports it */ supported: boolean; example: string }
/** D-3.2: which historical-phonology principles could apply to a modern form; paradigm forms are the evidence where an alternation exists. */
export function principles(modern: string, paradigm: string[] = []): Principle[] {
  const m = key(modern), c: Ctx = { par: paradigm.map(key) }
  return ROWS.flatMap(row => {
    const alts = row.gen(m, c)
    if (!alts.length) return []
    const r = ID(row.id), ev = [...new Map(alts.flatMap(a => a.ev ?? []).map(e => [e.quote, e])).values()]
    return [{ rule: row.id, name: r.name, date: r.date, evidence: [r.cite, ...ev], supported: ev.length > 0, example: alts[0]!.w }]
  })
}
