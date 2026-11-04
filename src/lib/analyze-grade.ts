/**
 * SPEC 63 MM-53 / MM-54: the grade and the one-line reason shown next to a «Кандидат сучасної форми» that came through R25 (ис-/из- > с-/з-), R26 (3sg -еть/-єть > -е/-є)
 * or R27 (слуш- ~ слух-). Pure; `known` = the form is in VESUM / the lexicon (lexHasBool). A grade is never «підтверджено» here: that word belongs to a witness.
 */
export interface CandGrade { label?: string; note: string }
const SLUSH = 'слушати: ДСУ XIV–XV ст., т. 1 («слушаєть» = належить; «прислушаєть»), Желехівський 1886: «Слуша́ти, v. n. … s. Слу́хати» (перехресне посилання словника)'
export function candidateGrade(trace: string[], form: string, known: boolean): CandGrade | undefined {
  const t = new Set(trace)
  if (t.has('R27')) return { label: known ? undefined : 'зіставлено', note: `зіставлено: слуш- ~ слух- (*slušati < *sluxěti, Вікісловник); ${SLUSH}. Значення в грамотах («належить») не збігається із сучасним «слухає», тому це зіставлення форми, а не тотожність слова.` }
  if (t.has('R26') && /слуш/.test(form) && !known) return { label: 'історична форма', note: `історична / говіркова форма: ${SLUSH}; у ВЕСУМ слушати немає.` }
  if (t.has('R25') && known) return { label: undefined, note: 'ис-/из- > с-/з- (праслов’янське *jьz-; ДСУ XIV–XV ст.: «ИСПОЛНА див. СПОЛНА»); сучасна форма є у ВЕСУМ.' }
  return undefined
}
