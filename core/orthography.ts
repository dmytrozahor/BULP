/**
 * Folding of pre-1919 Ukrainian spelling systems to modern orthography (SPEC 20 B-2 step 4).
 * Folds BRANCH like lexical sound rules: ambiguous letters produce candidates and VESUM decides.
 *
 * > "Store orthography as a separate attribute of the printed edition (orthography), not as an epoch." — research/09 §3
 * > "винъ | він (ikavism і written as и) … Троянцивъ | троянців (gen.pl. -ів written as -ив)" — research/01, Енеида 1798, scan p. 11
 * > "У травні 1919 Укр. АН схвалила «Найголовніші правила українського правопису» (вид. 1921), які стали основою
 * >  всіх наступних правописів." — Енц. «Українська мова», um77
 */
import { P, Q, type Evidence } from './evidence.ts'
import type { Candidate } from './phonology.ts'

export interface Fold { id: string; era: string[]; branch: boolean; cite: Evidence; apply: (w: string) => string }

const R = (re: RegExp, to: string) => (w: string) => w.replace(re, to)
const KUL = Q('ENC', 'http://litopys.org.ua/ukrmova/um35.htm', 'КУЛІШІВКА — укр. фонет. правопис, застосований П. Кулішем у «Записках о Южной Руси» (т. 1, 1856) та в «Граматці» (1857)')
const ZHEL = Q('ENC', 'http://litopys.org.ua/ukrmova/um17.htm', 'ЖЕЛЕХІВКА — укр. фонет. правопис у Зх. Україні в ост. чв. 19 ст., який створив … Є. Желехівський для власного «Малоруськонімецького словаря» (1886).')
const YAR = P('WUK', 'https://uk.wikipedia.org/wiki/Ярижка', 'ярижка — запис української мови російською абеткою; і з о, е, ѣ передавано через и або ѣ', 'приклади: Енеида 1798 «винъ» = він, «Троянцивъ» = троянців (research/01)')

export const FOLDS: Fold[] = [
  { id: 'ORTH-YAR-JER', era: ['ярижка'], branch: false, cite: YAR, apply: R(/ъ$/, '') },
  { id: 'ORTH-YAR-YAT', era: ['ярижка'], branch: false, cite: YAR, apply: R(/ѣ/g, 'і') },
  { id: 'ORTH-YAR-Y', era: ['ярижка'], branch: false, cite: YAR, apply: R(/ы/g, 'и') },
  { id: 'ORTH-YAR-I', era: ['ярижка'], branch: true, cite: YAR, apply: R(/(?<=[бвгджзклмнпрстфхцчшщ])и(?=[бвгджзклмнпрстфхцчшщ]ъ?$|[вй]ъ?$)/g, 'і') },
  // the conjunction і is the bare letter и (Енеида 1798: «И хлопець хоть куды»); the context-bound ORTH-YAR-I cannot see a one-letter word
  { id: 'ORTH-YAR-CONJ', era: ['ярижка'], branch: false, cite: YAR, apply: R(/^и$/, 'і') },
  { id: 'ORTH-YAR-E', era: ['ярижка'], branch: true, cite: YAR, apply: R(/^е|(?<=[аеиіоуюя])е/g, 'є') },
  { id: 'ORTH-YAR-EH', era: ['ярижка'], branch: false, cite: YAR, apply: R(/э/g, 'е') },
  { id: 'ORTH-YAR-JO', era: ['ярижка'], branch: false, cite: YAR, apply: R(/ё/g, 'ьо') },
  { id: 'ORTH-KUL-I', era: ['кулішівка'], branch: true, cite: KUL, apply: R(/(?<=^|[аеиіоуюяї'])і/g, 'ї') },
  { id: 'ORTH-KUL-E', era: ['кулішівка'], branch: true, cite: KUL, apply: R(/(?<=^|[аеиіоуюяї'])е/g, 'є') },
  { id: 'ORTH-KUL-JER', era: ['кулішівка', 'желехівка'], branch: false, cite: KUL, apply: R(/ъ/g, "'") },
  { id: 'ORTH-ZHEL-TY', era: ['желехівка'], branch: true, cite: ZHEL, apply: R(/(?<=[дтзсцлн])ї/g, 'і') },
  { id: 'ORTH-ZHEL-TE', era: ['желехівка'], branch: true, cite: ZHEL, apply: R(/(?<=[дтзсцлн])є/g, 'е') },
]

/** Candidates of a pre-1919 spelling in modern orthography, with fold trace (ids). */
export function fold(raw: string, orth?: string): Candidate[] {
  let cands: Candidate[] = [{ form: raw, trace: [], branches: 0 }]
  for (const f of FOLDS.filter(f => orth && f.era.includes(orth))) {
    cands = cands.flatMap(c => {
      const out = f.apply(c.form)
      if (out === c.form) return [c]
      const applied = { form: out, trace: [...c.trace, f.id], branches: c.branches }
      return f.branch ? [applied, { ...c, branches: c.branches + 1 }] : [applied]
    }).slice(0, 32)
  }
  return cands
}
export const foldById = Object.fromEntries(FOLDS.map(f => [f.id, f])) as Record<string, Fold>
