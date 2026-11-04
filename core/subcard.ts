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
export const NOTE_RULE = 'виведено за правилами (реконструкція, не засвідчення)'
const REL_RANK: Record<string, number> = { phonetic: 0, morph: 1, lexical: 2, historical: 3, loan: 4 }

/** the subcard variant of `lemma` in the dialect `code`, or undefined when no source and no rule gives one */
export function resolveSub(lemma: string, code: string, groups: CorrGroup[] | undefined, shown: ShownLike | undefined, hasCard: (form: string) => boolean): SubPlan | undefined {
  if (!code) return undefined
  const me = plain(lemma)
  const cands = (groups ?? []).flatMap(g => g.members.filter(m => plain(m.form) !== me && m.areas.some(a => a.code === code && a.grade !== 'corpus')).map(m => ({ m, a: m.areas.find(a => a.code === code && a.grade !== 'corpus')! })))
    .sort((x, y) => (REL_RANK[x.m.relation] ?? 9) - (REL_RANK[y.m.relation] ?? 9))
  const c = cands[0]
  if (c) return { form: c.m.form, kind: 'member', grade: 'attested', ev: [c.a.ev, ...c.m.evidence].slice(0, 3), note: NOTE_MEMBER, member: c.m, ...(c.m.relation === 'lexical' && hasCard(c.m.form) ? { lexical: true as const } : {}) }
  if (shown?.attested && plain(shown.attested.form) !== me) return { form: shown.attested.form, kind: 'own', grade: 'attested', ev: shown.attested.ev ? [shown.attested.ev] : [], note: NOTE_OWN }
  if (shown?.respelled && plain(shown.text) !== me) return { form: shown.text, kind: 'rule', grade: 'derived', ev: [], note: NOTE_RULE }
  return undefined
}

/** the query of a subcard / standard / lexical-entry URL */
export interface SubQuery { sub?: string; std?: string; from?: string }
export const NO_FORM_NOTE = (code: string, name: string) => `Для цього слова в говорі «${name}» (${code}) форми немає: показано звичайну картку.`
/** what the URL asks for, given the plan: 'sub' = show the subcard, 'std' = the standard view was chosen, 'enter' = the page should switch to the subcard now, 'lexical' = go to the member's own card, 'fix' = the URL names another form (replace it), 'none' */
export function subAction(q: SubQuery, plan: SubPlan | undefined, ready: boolean): 'sub' | 'std' | 'enter' | 'lexical' | 'fix' | 'drop' | 'none' {
  if (q.from !== undefined && q.from !== '') return 'none'                 // a lexical card entered as a subcard: no further switching
  if (q.std !== undefined) return 'std'
  if (!ready) return 'none'
  if (q.sub) return !plan ? 'drop' : plan.lexical ? 'lexical' : q.sub === plan.form ? 'sub' : 'fix'
  return plan ? (plan.lexical ? 'lexical' : 'enter') : 'none'
}
