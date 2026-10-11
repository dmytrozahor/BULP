/** Small display helpers (dates, centuries, labels). Pure; unit-tested in tests/ui.test.ts. */
import { epochById } from '../../core/epochs.ts'
import type { Author } from '../../core/types.ts'
type AuthorLabel = Author['label']

export const fmtDate = (d: [number, number]) => (d[0] === d[1] ? `${d[0]}` : `${d[0]}–${d[1]}`)

const ROMAN: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
export const roman = (n: number) => ROMAN.reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v } return s }, '')
/** Century slice id: a century number (11 = XI ст.). */
export const centuryOf = (c: number) => c
export const centuryLabel = (c: number) => `${roman(centuryOf(c))} ст.`
export const centuryOfYear = (y: number) => Math.ceil(y / 100)

export const epochName = (id: string) => epochById[id]?.uk ?? id
export const epochShort = (id: string) => epochName(id).replace(/ доба$/, '').replace(/ \(.*$/, '')

/** P-2.4: period-appropriate author labels. "ruthenian-rus" is never shown as "Ukrainian author". */
export const AUTHOR_LABEL_UK: Record<AuthorLabel, string> = {
  'ruthenian-rus': 'автор Київської Русі',
  ruthenian: 'руський (рутенський) автор',
  malorossian: 'малоросійський автор',
  ukrainian: 'український автор',
  institutional: 'інституційний автор',
}
export const STATUS_UK: Record<string, string> = { vetted: 'перевірений', provisional: 'попередній', unverified: 'неперевірений', excluded: 'виключений' }
export const WTYPE_UK: Record<string, string> = {
  autograph: 'автограф', ms_copy: 'рукописна копія', first_ed: 'перше видання', later_ed: 'пізніше видання', scholarly_ed: 'наукове видання', edition: 'видання',
}
export const LANG_UK: Record<string, string> = { orv: 'давньоруська', 'chu-rus': 'церк.-слов. руської редакції', ruthenian: 'староукраїнська (руська)', uk: 'українська' }
export const KIND_UK: Record<string, string> = { Q: 'цитата', P: 'переказ', D: 'дані' }
export const KIND_LONG: Record<string, string> = {
  Q: 'дослівна цитата джерела', P: 'переказ (не дослівно)', D: 'запис даних (рядок словника, вживання в контексті)',
}
export const STRESS_STATUS_UK: Record<string, string> = {
  normative: 'нормативний', admissible: 'допустимий', dialectal: 'діалектний', historical: 'історичний', poetic: 'поетичний', unknown: 'невідомий',
}
export const METHOD_UK: Record<string, string> = { dictionary: 'словник', 'metrical-inference': 'виведено з метра', corpus: 'корпус' }
export const ROUTE_UK: Record<string, string> = { 'torot-lemma': 'лема TOROT → ВЕСУМ', token: 'токен → правила → ВЕСУМ', direct: 'пряме збігання' }

/** Claim label → Ukrainian (detector labels, register, origin). */
export const LABEL_UK: Record<string, string> = {
  colloquial: 'розмовне', church_slavonic: 'церковнослов’янізм', native: 'питоме', borrowing: 'запозичення',
  nonnormative: 'ненормативне (LT)', not_recommended: 'не рекомендоване', russianism_or_hybrid: 'русизм / покруч', nonstandard: 'нестандартне',
  russianism_orth: 'русизм (правопис)', russianism_phon: 'русизм (фонетика)', russianism_morph: 'русизм (морфологія)', calque_participle: 'калька-дієприкметник',
  archaic_orthography: 'архаїчний правопис (норма свого часу)',
  rusyn: 'русинське (варіант не визначено)', 'rusyn:lemko': 'русинське · лемківське', 'rusyn:presov': 'русинське · пряшівське',
  'rusyn:pannonian': 'русинське · паннонське', 'rusyn:subcarpathian': 'русинське · підкарпатське',
}
export const labelUk = (l: string) => LABEL_UK[l] ?? l
export const AXIS_UK: Record<string, string> = { cs: 'церковнослов’янське', contact: 'контактний шар / суржик', dialect: 'діалектне', rusyn: 'русинські стандарти (паралельне прочитання)', register: 'регістр' }

export const stars = (p: number) => (p <= 0.0001 ? '★★★★' : p <= 0.001 ? '★★★' : p <= 0.01 ? '★★' : p <= 0.05 ? '★' : '')
export const fmtNum = (n: number, d = 0) => n.toLocaleString('uk-UA', { maximumFractionDigits: d, minimumFractionDigits: d })
export const isUrl = (s: string) => /^https?:\/\//.test(s)
export const locatorUrl = (s: string) => (isUrl(s) ? s.split(/[\s,]/)[0] : undefined)
