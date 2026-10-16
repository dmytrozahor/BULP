/**
 * SPEC 63 CV-4 (a): hypotheses that the USER stated for a spelling, stored with their author and date. They are NOT rules: no cited source in the project licenses «-ѣ > -и» in adverbs
 * (research/*, core/phonology.ts R09 gives only ѣ > і, so нѣгдѣ → нігдѣ), so the form is shown as «гіпотеза користувача», never as a derivation.
 * Search for a cited rule (2026-10-16): research/03, 11, 23, 24, core/phonology.ts, core/deictics.ts — none states final -ѣ > -и. A rule may replace this entry once a source is cited.
 */
import { key } from './text.ts'
import { foldSpelling } from './phrasemes.ts'

export interface UserHypothesis { spelling: string; form: string; author: 'user'; date: string; quote: string; note: string }
export const USER_HYPOTHESES: UserHypothesis[] = [
  { spelling: 'нѣгдѣ', form: 'нігди', author: 'user', date: '2026-10-16', quote: 'і то мало би мати вивідну форму «нігди»',
    note: 'ѣ > і (правило R09 дає лише нігдѣ); кінцеве -ѣ > -и в прислівнику — припущення користувача (галицький відбиток?), цитованого правила в проєкті немає' },
]
const fk = (s: string) => foldSpelling(key(s))
/** hypotheses stated for any of the given spellings (matched by the spelling-fold key, so нѣгдѣ ~ негде) */
export const userHypothesesOf = (spellings: string[]): UserHypothesis[] => USER_HYPOTHESES.filter(h => spellings.some(s => fk(s) === fk(h.spelling)))
