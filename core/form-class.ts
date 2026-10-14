/**
 * SPEC 63 FD — dialect attribution for a spelling and for its whole form class (user 2026-10-14: «For a form page it should be also specified to which
 * dialect it possible leads» · «To the whole class of the forms»). Pure, computed on every build / page view; no per-form labels are stored here.
 *
 * FD-1 `firedRules`: every dialect rule (DIALECT_RULES, DIALECT_BOOK_RULES, DIALECT_LEX_RULES) that fired on the spelling, found by the rule ids
 *      the build wrote into the claim's `method` — with group, the rule's own Q citation and the dated first attestation of the feature.
 * FD-2 witness regions are NOT part of this module's labels (the UI shows them separately).
 * FD-3 `rulesChecked`: the rules a spelling was tested against (shown when nothing fires).
 * FD-4 `formClass`: the paradigm cell (lemma + grammemes) groups all attested and derived variants; DP variants are merged in as derived rows.
 * FD-5 `ruleForms`: the lexicon forms on which the same rule fired.
 * DX-3 `dxClass` / `dxLiterary`: the same table for deictic compounds (base + affixes), and their literary counterpart.
 */
import { Q, type Claim, type Evidence } from './evidence.ts'
import { DIALECTS, DIALECT_BOOK_RULES, DIALECT_LEX_RULES, DIALECT_RULES } from './rules.ts'
import type { Rule } from './detect.ts'
import { variantClaims, variantById, type StdEntry, type VariantForm } from './pronoun-variants.ts'
import { DX_ATTESTED, DX_PARTS, bestSegmentation, segment, type DxSegmentation } from './deictics.ts'
import { key } from './text.ts'

// ── FD-1 / FD-3 ──────────────────────────────────────────────────────────────────────────────────────
export const ALL_DIALECT_RULES: Rule[] = [...DIALECT_RULES, ...DIALECT_BOOK_RULES, ...DIALECT_LEX_RULES]
const RULE_BY_ID = new Map(ALL_DIALECT_RULES.map(r => [r.id, r]))
export const dialectRule = (id: string) => RULE_BY_ID.get(id)
/** rule id → the feature id shared by its per-group rows (`SW-LABIAL-J:BOY` → `SW-LABIAL-J`) */
export const featureOf = (ruleId: string) => ruleId.replace(/:[A-Z]{2,5}$/, '')

export interface FiredRule { id: string; feature: string; code: string; group: string; earliest?: number; cite: Evidence; earliestCite?: Evidence; note?: string }
/** the dialect rules that fired on a spelling: read off the claim methods the build wrote (`method` = fired rule ids joined by '+') */
export function firedRules(claims: Record<string, Claim<any> | undefined>): FiredRule[] {
  const out: FiredRule[] = []
  for (const [code, c] of Object.entries(claims)) {
    if (!c || !(code in DIALECTS) || c.value === 'unknown' || !c.method) continue
    for (const id of c.method.split('+')) {
      const r = RULE_BY_ID.get(id)
      if (r) out.push({ id, feature: featureOf(id), code, group: DIALECTS[code]!, earliest: r.earliest, cite: r.cite, earliestCite: r.earliestCite, note: r.note })
    }
  }
  return out
}
/** FD-3: unique features the dialect detector tests every spelling against */
export const rulesChecked = () => [...new Set(ALL_DIALECT_RULES.map(r => featureOf(r.id)))]

// ── FD-4: form class = paradigm cell ─────────────────────────────────────────────────────────────────
/** tags that mark a variant of a cell rather than a different cell */
const CELL_FLAGS = new Set(['arch', 'long', 'bad', 'subst', 'alt', 'up92', 'short', 'rare', 'slang', 'vulg', 'err', 'v-u', 'abbr'])
export const cellKey = (tags: string) => tags.split(':').filter(t => !CELL_FLAGS.has(t)).join(':')

export interface DialectChip { code: string; via: string; evidence: Evidence[] }
export interface ClassMember {
  form: string
  kind: 'corpus' | 'paradigm' | 'dp' | 'dx'
  attested: boolean
  lemma?: string
  f?: number
  date?: [number, number]
  chips: DialectChip[]
  /** DP variant id / DX segmentation, when the member is a derived variant */
  variant?: string
  rule?: string
  reading?: string
}
export interface FormLike { raw: string; modern: string; claims: Record<string, Claim<any> | undefined>; f?: number; date?: [number, number] }
export interface CardLike { lemma: string; paradigm: StdEntry[]; forms: FormLike[] }

/** dialect chips of a spelling: one per (group, rule) read from its claims (FD-1) */
export function chipsOf(claims: Record<string, Claim<any> | undefined>): DialectChip[] {
  return firedRules(claims).map(r => ({ code: r.code, via: r.id, evidence: [r.cite, ...(r.earliestCite ? [r.earliestCite] : [])] }))
}
const norm = (s: string) => key(s)
/** the cells (ignoring variant flags) a spelling belongs to within a card: the paradigm lines of its raw or modern form */
export function cellsOfSpelling(card: CardLike, f: Pick<FormLike, 'raw' | 'modern'>): string[] {
  const hit = (x: string) => card.paradigm.filter(p => norm(p.form) === norm(x))
  const lines = hit(f.modern).length ? hit(f.modern) : hit(f.raw)
  return [...new Set(lines.map(l => cellKey(l.tags)))]
}

/**
 * All spellings, paradigm forms and derived variant forms of one cell. `cards` = the standard lemma's card first, then the cards of its DP variant lemmas
 * (their corpus spellings are attested rows; the DP rule adds the variant's dialect claims). `derived` = rule-generated variant forms.
 */
export function formClass(cell: string, cards: CardLike[], derived: VariantForm[] = []): ClassMember[] {
  const out = new Map<string, ClassMember>()
  const add = (m: ClassMember) => {
    const k = norm(m.form), cur = out.get(k)
    if (!cur) { out.set(k, m); return }
    cur.chips.push(...m.chips.filter(c => !cur.chips.some(x => x.via === c.via && x.code === c.code)))
    if (m.attested && !cur.attested) Object.assign(cur, { attested: true, kind: m.kind, f: m.f, date: m.date, lemma: m.lemma })
    cur.variant ??= m.variant; cur.rule ??= m.rule
  }
  const dpChips = (variant: string): DialectChip[] => {
    const v = variantById(variant)
    return v ? variantClaims(v).flatMap(c => (c.code ? [{ code: c.code, via: `DP:${variant}`, evidence: c.evidence }] : [])) : []
  }
  for (const card of cards) {
    const isVariant = !!variantById(card.lemma)
    for (const f of card.forms) {
      if (!cellsOfSpelling(card, f).includes(cell)) continue
      add({ form: f.raw, kind: 'corpus', attested: true, lemma: card.lemma, f: f.f, date: f.date, chips: [...chipsOf(f.claims), ...(isVariant ? dpChips(card.lemma) : [])], variant: isVariant ? card.lemma : undefined })
    }
    for (const p of card.paradigm) if (cellKey(p.tags) === cell) add({ form: p.form, kind: 'paradigm', attested: false, lemma: card.lemma, chips: [], variant: isVariant ? card.lemma : undefined })
  }
  for (const d of derived) if (cellKey(d.tags) === cell) add({ form: d.form, kind: 'dp', attested: false, chips: dpChips(d.variant), variant: d.variant, rule: d.rule })
  return [...out.values()].sort((a, b) => (b.f ?? 0) - (a.f ?? 0) || a.form.localeCompare(b.form, 'uk'))
}

// ── FD-5: feature class ───────────────────────────────────────────────────────────────────────────
export interface RuleForm { form: string; lemma: string; f: number }
/** the lexicon forms on which a rule (or every row of a feature id) fired — read from the claim methods of the cores; f = the owning lemma's f (spelling counts live in shards) */
export function ruleForms(idOrFeature: string, cards: { lemma: string; stats: { f: number }; forms: { raw: string; claims: Record<string, Claim<any> | undefined> }[] }[]): RuleForm[] {
  const out: RuleForm[] = []
  for (const c of cards) for (const f of c.forms) {
    for (const [code, cl] of Object.entries(f.claims)) {
      if (!(code in DIALECTS) || !cl?.method) continue
      if (cl.method.split('+').some(id => id === idOrFeature || featureOf(id) === idOrFeature)) { out.push({ form: f.raw, lemma: c.lemma, f: c.stats.f }); break }
    }
  }
  return out.sort((a, b) => b.f - a.f || a.form.localeCompare(b.form, 'uk'))
}

// ── DX: deictic compounds ─────────────────────────────────────────────────────────────────────────
/** DX-2: the dialect feature of a segmentation: one chip per affix row that names regions (research/24), evidence = the affix's own citation */
export function dxChips(seg: DxSegmentation): DialectChip[] {
  const out: DialectChip[] = []
  for (const code of seg.regions) {
    const parts = seg.parts.filter(p => p.regions.includes(code))
    const ev = parts.length ? parts.map(p => p.cite) : seg.claim.evidence
    out.push({ code, via: `DX:${(parts.length ? parts : seg.parts).map(p => p.id).join('+')}`, evidence: ev })
  }
  return out
}
export interface DxLiterary {
  /** literary form (first of the `standard` chain that the literary lexicon has) */
  form?: string; chain: string[]; evidence: Evidence[]
  /** where the unlisted form is recorded (sources of its attestation) when no literary form was found */
  recordedIn: string[]
}
/** DX-3: follow `standard` until a form the literary lexicon (ВЕСУМ via `lookup`: form → tag line) has; none → «у літературній мові не зафіксовано» + where recorded. */
export function dxLiterary(form: string, lookup: (form: string) => string | undefined): DxLiterary {
  const chain: string[] = []
  let cur: string | undefined = form
  const first = bestSegmentation(form)
  for (let i = 0; cur && i < 5 && !chain.includes(cur); i++) {
    chain.push(cur)
    const tags = lookup(cur)
    if (tags !== undefined) return { form: cur, chain, evidence: [Q('VESUM', `слово «${cur}» у словнику`, `${cur}\t${tags}`)], recordedIn: [] }
    cur = bestSegmentation(cur)?.standard
  }
  return { chain, evidence: [], recordedIn: [...new Set((first?.claim.evidence ?? []).map(e => e.source))] }
}
/** DX-3/FD-4: deictic forms sharing a base — the class of «forms that lead to the same effect» (там → тамки, тамека, оттам, …) */
export function dxClass(baseId: string, corpus: (form: string) => { f?: number; date?: [number, number] } | undefined = () => undefined): ClassMember[] {
  return DX_ATTESTED.filter(a => a.parts.some(([id]) => id === baseId)).map(a => {
    const seg = segment(a.form)[0]!, c = corpus(a.form)
    return { form: a.form, kind: 'dx' as const, attested: !!c, f: c?.f, date: c?.date, chips: dxChips(seg), variant: a.parts.map(([, t]) => t).join('+'), reading: a.reading }
  })
}
/** FD-5 for an affix: attested deictic forms containing the part */
export const dxAffixForms = (partId: string) => DX_ATTESTED.filter(a => a.parts.some(([id]) => id === partId)).map(a => a.form)
export const dxPartRow = (id: string) => DX_PARTS.find(p => p.id === id)
