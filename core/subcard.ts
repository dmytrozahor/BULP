/**
 * SPEC 63 DB-3 — the dialect SUBCARD of a lemma page. Pure: no node or DOM imports.
 *
 * > owner 2026-11-04: «і одразу переключай на сторінці леми одразу на варіант леми за діалектом, і потім повернутися має бути стрілочка назад. тобто це така собі підкартка»
 *
 * When the «Говір» switch is set, a lemma page shows the dialect variant as a subcard. WHICH form is the variant, in order (an unsourced guess is never promoted over a printed form):
 *   member   the CR-1 group member of that dialect (a printed form with the evidence of its area); a `lexical` member that has a real card of its own (коби for щоб) is its own card
 *   own      the card's own dialect form: the printed spelling of the lemma in that dialect (OV-13, core/dialectAttested)
 *   rule     the rule respelling of core/respell.ts, marked «виведено за правилами» (a reconstruction, never an attestation)
 * Nothing found → no subcard (the normal card and a small note). State lives in the URL: `?sub=<form>` (the subcard), `?std=1` (the standard view for this visit), `?from=<lemma>` (a lexical card entered as a subcard).
 */
import type { Evidence } from './evidence.ts'
import { plain, type CorrGroup, type CorrMember } from './corr.ts'

export type SubKind = 'member' | 'own' | 'rule'
export interface SubPlan {
  /** the dialect form the header shows */ form: string
  kind: SubKind
  /** a lexical member with its own card: the page goes to that card */ lexical?: true
  /** 'attested' = a printed form (member / own); 'derived' = by rules */ grade: 'attested' | 'derived'
  /** the evidence behind a printed form */ ev: Evidence[]
  /** one line for the header: where the form comes from */ note: string
  /** the CR-1 member, when kind = member */ member?: CorrMember
}
export interface ShownLike { text: string; generated: boolean; attested?: { form: string; ev?: Evidence; src?: string }; respelled?: unknown }

export const NOTE_MEMBER = 'засвідчена форма з групи відповідників (Відповідники, CR-1)'
export const NOTE_OWN = 'засвідчене написання цієї леми в говорі'
export const NOTE_HYP = 'гіпотеза з групи відповідників (Відповідники, CR-1): джерело форми не підтверджене словником'
export const NOTE_RULE = 'виведено за правилами (реконструкція, не засвідчення)'
const REL_RANK: Record<string, number> = { phonetic: 0, morph: 1, lexical: 2, historical: 3, loan: 4 }

/** the subcard variant of `lemma` in the dialect `code`, or undefined when no source and no rule gives one */
export function resolveSub(lemma: string, code: string, groups: CorrGroup[] | undefined, shown: ShownLike | undefined, hasCard: (form: string) => boolean): SubPlan | undefined {
  if (!code) return undefined
  const me = plain(lemma)
  const cands = (groups ?? []).flatMap(g => g.members.filter(m => plain(m.form) !== me && m.areas.some(a => a.code === code && a.grade !== 'corpus')).map(m => ({ m, a: m.areas.find(a => a.code === code && a.grade !== 'corpus')! })))
    .sort((x, y) => (REL_RANK[x.m.relation] ?? 9) - (REL_RANK[y.m.relation] ?? 9))
  const c = cands[0]
  if (c) return { form: c.m.form, kind: 'member', grade: c.a.grade === 'hyp' ? 'derived' : 'attested', ev: [c.a.ev, ...c.m.evidence].slice(0, 3), note: c.a.grade === 'hyp' ? NOTE_HYP : NOTE_MEMBER, member: c.m, ...(c.m.relation === 'lexical' && hasCard(c.m.form) ? { lexical: true as const } : {}) }
  if (shown?.attested && plain(shown.attested.form) !== me) return { form: shown.attested.form, kind: 'own', grade: 'attested', ev: shown.attested.ev ? [shown.attested.ev] : [], note: NOTE_OWN }
  if (shown?.respelled && plain(shown.text) !== me) return { form: shown.text, kind: 'rule', grade: 'derived', ev: [], note: NOTE_RULE }
  return undefined
}

/** the query of a lemma page: `std` = the standard view was chosen for this visit, `from` = a lexical card entered from the lemma named */
export interface SubQuery { std?: string; from?: string }
export const NO_FORM_NOTE = (code: string, name: string) => `Для цього слова в говорі «${name}» (${code}) форми немає: показано звичайну картку.`
/** what a LEMMA page does with the switch: 'enter' = open the variant card of its own (history replace), 'lexical' = open the member's real card, 'std' = the reader chose the standard view, 'none' */
export function subAction(q: SubQuery, plan: SubPlan | undefined, ready: boolean): 'enter' | 'lexical' | 'std' | 'none' {
  if (q.from !== undefined && q.from !== '') return 'none'
  if (q.std !== undefined) return 'std'
  if (!ready || !plan) return 'none'
  return plan.lexical ? 'lexical' : 'enter'
}

// ── DB-3b: the variant is a card of its own: /v/<dialect>/<form>?of=<lemma> (the dialect is in the URL, so a shared link works under any switch setting) ──
export const variantPath = (dialect: string, form: string): string => `/v/${encodeURIComponent(dialect)}/${encodeURIComponent(form)}`
export const variantTo = (dialect: string, form: string, of: string) => ({ path: variantPath(dialect, form), query: { of } })
/** the plan of the variant card of `form` as a dialect form of `of`: the plan of the switch resolution if it names this very form; else the rule respelling if it gives it; else an attested spelling of the lemma that equals it (kind 'own'); else none */
export function variantPlan(of: string, code: string, form: string, groups: CorrGroup[] | undefined, shown: ShownLike | undefined, attestedSpelling: boolean, hasCard: (f: string) => boolean): SubPlan | undefined {
  const p = resolveSub(of, code, groups, shown, hasCard)
  if (p && plain(p.form) === plain(form)) return p
  const member = (groups ?? []).flatMap(g => g.members).find(m => plain(m.form) === plain(form) && plain(m.form) !== plain(of) && m.areas.some(a => a.code === code && a.grade !== 'corpus'))
  if (member) { const ar = member.areas.find(a => a.code === code && a.grade !== 'corpus')!; return { form: member.form, kind: 'member', grade: ar.grade === 'hyp' ? 'derived' : 'attested', ev: [ar.ev, ...member.evidence].slice(0, 3), note: ar.grade === 'hyp' ? NOTE_HYP : NOTE_MEMBER, member } }
  if (shown && plain(shown.text) === plain(form) && plain(form) !== plain(of) && shown.respelled) return { form: shown.text, kind: 'rule', grade: 'derived', ev: [], note: NOTE_RULE }
  if (attestedSpelling && plain(form) !== plain(of)) return { form, kind: 'own', grade: 'attested', ev: [], note: 'написання, засвідчене в корпусі серед написань леми' }
  return undefined
}

/** DB-3b: the variant cards a typed word offers: the word is a same-lexeme (phonetic / morphological) member of a CR-1 group with a printed dialect area (dict or owner grade; a corpus distribution is not a form); its lemma = the norm member of that group */
export function variantFormHits(word: string, groups: CorrGroup[]): { form: string; code: string; of: string; grade: 'dict' | 'owner' }[] {
  const w = plain(word), out: { form: string; code: string; of: string; grade: 'dict' | 'owner' }[] = []
  for (const g of groups) {
    const norm = g.members.find(m => m.norm) ?? g.members.find(m => plain(m.form) !== w)
    if (!norm || plain(norm.form) === w) continue
    for (const m of g.members) if (plain(m.form) === w && (m.relation === 'phonetic' || m.relation === 'morph')) for (const a of m.areas) if (a.code && a.grade !== 'corpus' && a.grade !== 'hyp' && !out.some(o => o.code === a.code && o.of === norm.form)) out.push({ form: m.form, code: a.code, of: norm.form, grade: a.grade })
  }
  return out
}
