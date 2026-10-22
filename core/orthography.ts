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
import { MU_FOLDS } from './mu-fold.ts'
import { ZHEL_FOLDS } from './zhel-folds.ts'
import { ORTH1928_FOLDS } from './orth1928.ts'
import { ADJ_SOFT_FOLD } from './adj-soft.ts'
import { GAL_FOLDS } from './gal-folds.ts'

export interface Fold { id: string; era: string[]; branch: boolean; cite: Evidence; apply: (w: string) => string }

const R = (re: RegExp, to: string) => (w: string) => w.replace(re, to)
const KUL = Q('ENC', 'http://litopys.org.ua/ukrmova/um35.htm', 'КУЛІШІВКА — укр. фонет. правопис, застосований П. Кулішем у «Записках о Южной Руси» (т. 1, 1856) та в «Граматці» (1857)')
const ZHEL = Q('ENC', 'http://litopys.org.ua/ukrmova/um17.htm', 'ЖЕЛЕХІВКА — укр. фонет. правопис у Зх. Україні в ост. чв. 19 ст., який створив … Є. Желехівський для власного «Малоруськонімецького словаря» (1886).')
const YAR = P('WUK', 'https://uk.wikipedia.org/wiki/Ярижка', 'ярижка — запис української мови російською абеткою; і з о, е, ѣ передавано через и або ѣ', 'приклади: Енеида 1798 «винъ» = він, «Троянцивъ» = троянців (research/01)')
const UM43 = 'http://litopys.org.ua/ukrmova/um43.htm'
const MAX_I = Q('ENC', UM43, 'запроваджувалися позначення голосного і етимол. літерами ô, ê, û, î з діакритичним знаком')
const MAX_T = Q('ENC', UM43, 'Крім етимол. написань з використанням традиц. літер рос. алфавіту ы, и, Ђ , ъ')
const MAX_E = Q('ENC', UM43, 'ё для сполучень йо, ьо (ёго, сёго), е для літер е, є та ъ на місці апострофа')
const MAX_U = Q('ENC', UM43, 'літера ў для нескладового голосного, середнього між в і у')

// R2U-1 (research/30 §4): the pre-1933 dictionaries print the reflexive particle as a separate word («видава́ти ся, здава́ти ся»); the ingester joins it with a hyphen («видава́ти-ся»,
// the raw form kept) and this fold writes it as the modern postfix. Cited from the same dictionary page, quote verbatim.
const SYA = Q('R2U', 'https://r2u.org.ua/html/umanets_pered.html, стаття «Выглядѣть» (цитата зі скріншота користувача, 2026-10-14)', 'видава́ти ся, здава́ти ся', 'Уманець–Спілка 1893–98 пише ся окремо; сучасний правопис: -ся — постфікс, пишеться разом з дієсловом')

export const FOLDS: Fold[] = [
  { id: 'ORTH-SYA', era: ['желехівка', 'r2u'], branch: false, cite: SYA, apply: R(/-ся$/, 'ся') },
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
  // BL-18: максимовичівка (Максимович 1827/1841; ENC um43): ô ê û î = [і]; ѣ ы ъ traditional; ъ = apostrophe inside a word; ё = йо/ьо; ў = non-syllabic в/у
  { id: 'ORTH-MAX-I', era: ['максимовичівка'], branch: false, cite: MAX_I, apply: R(/[оеуи]̂|[ôêûî]/g, 'і') },
  { id: 'ORTH-MAX-YAT-J', era: ['максимовичівка'], branch: true, cite: MAX_T, apply: R(/(?<=^|[аеиіоуюяїє'])ѣ/g, 'ї') },   // ѣхати = їхати (ѣ → і, after a vowel / word-initially also ї)
  { id: 'ORTH-MAX-YAT', era: ['максимовичівка'], branch: false, cite: MAX_T, apply: R(/ѣ/g, 'і') },
  { id: 'ORTH-MAX-Y', era: ['максимовичівка'], branch: false, cite: MAX_T, apply: R(/ы/g, 'и') },
  { id: 'ORTH-MAX-JER-END', era: ['максимовичівка'], branch: false, cite: MAX_T, apply: R(/ъ$/, '') },
  { id: 'ORTH-MAX-JER', era: ['максимовичівка'], branch: false, cite: MAX_E, apply: R(/ъ/g, "'") },
  { id: 'ORTH-MAX-JO', era: ['максимовичівка'], branch: false, cite: MAX_E, apply: w => w.replace(/(?<=^|[аеиіоуюяїє'])ё/g, 'йо').replace(/ё/g, 'ьо') },
  { id: 'ORTH-MAX-E', era: ['максимовичівка'], branch: true, cite: MAX_E, apply: R(/^е|(?<=[аеиіоуюяїє'])е/g, 'є') },
  { id: 'ORTH-MAX-U', era: ['максимовичівка'], branch: false, cite: MAX_U, apply: R(/ў/g, 'в') },
  ...ZHEL_FOLDS,   // SPEC 63 GZ-2 (core/zhel-folds.ts)
  ...GAL_FOLDS,   // SPEC 63 MM-18..MM-21 (core/gal-folds.ts): era [] — extra link candidates, never applied by orth
  ADJ_SOFT_FOLD,   // SPEC 63 MM-6 (core/adj-soft.ts): era [] — an extra link candidate, never an orthography fold
  ...ORTH1928_FOLDS,   // SPEC 63 MM-10 (core/orth1928.ts)
  ...MU_FOLDS,   // SPEC 63 MU: era 'mu' is never an orth, so fold() skips them; they are applied by muCandidates (build-link.ts) and resolved by foldById for the trace
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
