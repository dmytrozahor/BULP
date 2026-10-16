/**
 * SPEC 63 CV-4 (a) / CV-5 (a): forms offered for an unverified spelling that are NOT standard derivations.
 *
 * > "і то мало би мати вивідну форму «нігди»" — user, 2026-10-16 (нѣгдѣ)
 *
 * 1. Cited dialect continuants of ѣ (core/yat.ts, SPEC 63 YT-2): нѣгдѣ → нігди by YT-FIN-I (final unstressed -ѣ > -и, зап. діал.; Кримський–Єфремов s.v. «Никогда», ЕУМ «Ять»). Each carries its
 *    rule id, dialect group and verbatim cites and is labelled «гіпотеза» — a rule with a source, never a fact about this spelling.
 * 2. User hypotheses (USER_HYPOTHESES): a form the user stated that no cited rule produces. Shown «гіпотеза користувача» with author and date; never added as a rule. Empty now: the user's
 *    нігди is covered by (1) since YT-2 landed (2026-10-16); the entry list stays so the next user form has a place.
 */
import { key } from './text.ts'
import { foldSpelling } from './phrasemes.ts'
import { yatContinuants, yatRuleById } from './yat.ts'
import type { Evidence } from './evidence.ts'

export interface UserHypothesis { spelling: string; form: string; author: 'user'; date: string; quote: string; note: string }
export const USER_HYPOTHESES: UserHypothesis[] = []
const fk = (s: string) => foldSpelling(key(s))
/** hypotheses stated for any of the given spellings (matched by the spelling-fold key, so нѣгдѣ ~ негде) */
export const userHypothesesOf = (spellings: string[]): UserHypothesis[] => USER_HYPOTHESES.filter(h => spellings.some(s => fk(s) === fk(h.spelling)))

export interface CitedForm { spelling: string; form: string; rule: string; name: string; group: string; cite: Evidence[] }
/** dialect continuants of ѣ with their cited rule (YT-2) for each spelling that contains ѣ */
export function citedFormsOf(spellings: string[], limit = 8): CitedForm[] {
  const out: CitedForm[] = [], seen = new Set<string>()
  for (const s of spellings) for (const c of yatContinuants(s)) {
    const k = c.form + '|' + c.rule; if (seen.has(k)) continue
    seen.add(k); const r = yatRuleById[c.rule]
    out.push({ spelling: s, form: c.form, rule: c.rule, name: r?.name ?? c.rule, group: c.group, cite: r?.cite ?? [] })
  }
  return out.slice(0, limit)
}
