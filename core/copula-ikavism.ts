/**
 * SPEC 63 MM-38 (owner remark 2026-10-29, no file): «Передбач галицький ікавізм у формах єсть їсть наприклад і передбач що тоді їсти може вести на єсть що було би неправильно».
 *
 * In Galician print the copula єсть (3sg of бути) can be written їсть (є → ї). So the token «їсть» may be бути, not only їсти «to eat». It is a BRANCHING, DISAMBIGUATED reading, not a fold:
 *  - the VESUM reading (їсти) is the default and is never replaced silently; the second reading (бути via єсть) is offered only in a Galician witness (orth желехівка or a Galician region)
 *    or for an isolated word (Аналіз слова, search), and only «то їсть» (= тобто) chooses бути;
 *  - nothing here is a fold, a build candidate or a variant family: the build never links a form of їсти to єсть / бути (the reverse guard, tests/mm38.test.ts);
 *  - the chip «ікавізм (галицьке)» has NO source line: the grammars of the repo (Огоновський 1889, Смаль-Стоцький 1892 / 1914) exist only as OCR on the worker, which is not available to this commit,
 *    and no other repo text states є → ї. So the chip says «джерела не знайдено» and claims no dialect group (MM-16).
 */
import { P, type Evidence } from './evidence.ts'
import { isGalician, type FeatureChip } from './feature-chips.ts'

export const COPULA_FORMS: Readonly<Record<string, string>> = { їсть: 'єсть' }
export const COPULA_RULE = 'IKAV-JE-YI'
const GAL_ORTH = ['желехівка']

export interface CopulaCtx {
  orth?: string; witnessRegion?: string; authorRegion?: string
  /** a single word with no witness (Аналіз слова, search): both readings are named, nothing is decided */ isolated?: boolean
  prev?: string; next?: string
  /** the token starts a sentence */ sentStart?: boolean
  /** VESUM tags of a (key()ed) spelling */ tagsOf?: (k: string) => string[]
}
export type CopulaVerdict = 'eat' | 'copula' | 'ambiguous'
export interface CopulaReading {
  /** 'ambiguous' = both readings are shown, «неоднозначно»; the default reading stays їсти */ verdict: CopulaVerdict
  form: string; copulaForm: string
  readings: { lemma: string; via?: string; default?: boolean }[]
  /** the cues that decided or failed to decide (Ukrainian) */ cues: string[]
  chip: FeatureChip; evidence: Evidence
}

/** copula-like left context: «то їсть» = тобто */
const COPULA_PREV = new Set(['то', 'се', 'тото'])
/** objects of eating (a closed list of common foods: a heuristic cue, not a source claim) */
const FOOD = new Set(['хліб', "м'ясо", 'кашу', 'борщ', 'суп', 'яблуко', 'яблука', 'рибу', 'сир', 'масло', 'яйця', 'мед', 'сало', 'траву', 'зерно', 'корм', 'їжу', 'обід', 'вечерю'])
const PREP = new Set(['у', 'в', 'на', 'при', 'з', 'до', 'за', 'для'])
const hasTag = (t: string[], re: RegExp) => t.some(x => re.test(x))

export const EVIDENCE: Evidence = P('OWNER', 'повідомлення власника, 2026-10-29 (єсть / їсть, галицький ікавізм)',
  'Передбач галицький ікавізм у формах єсть їсть наприклад і передбач що тоді їсти може вести на єсть що було би неправильно',
  'джерела не знайдено: граматики сховища (Огоновський 1889, Смаль-Стоцький 1892 / 1914) доступні лише як OCR на worker і не перевірені для є → ї; діалектну групу не заявлено. Читання бути — гіпотеза; читання їсти (ВЕСУМ) не скасовується')

export function copulaGate(c: CopulaCtx): 'galician' | 'isolated' | 'none' {
  if ((c.orth && GAL_ORTH.includes(c.orth)) || isGalician(c.authorRegion ?? c.witnessRegion)) return 'galician'
  return c.isolated ? 'isolated' : 'none'
}

/** the shared rule: undefined = the token has only its ordinary reading (їсти) */
export function copulaReading(k: string, c: CopulaCtx = {}): CopulaReading | undefined {
  const cf = COPULA_FORMS[k]; if (!cf) return undefined
  const gate = copulaGate(c), tags = c.tagsOf ?? (() => [] as string[]), cues: string[] = []
  let strong = false, weak = false, eat = false
  if (c.prev && COPULA_PREV.has(c.prev)) { strong = true; cues.push(`«${c.prev} їсть» — сполучення «то єсть» (= тобто)`) }
  if (c.next) {
    const nt = tags(c.next)
    if (FOOD.has(c.next)) { eat = true; cues.push(`наступне слово «${c.next}» — об’єкт споживання`) }
    else if (hasTag(nt, /v_zna/) && !hasTag(nt, /v_naz/)) { eat = true; cues.push(`наступне слово «${c.next}» — знахідний відмінок (додаток)`) }
    else if (hasTag(nt, /adj/) && hasTag(nt, /v_naz/) && !hasTag(nt, /v_zna/)) { weak = true; cues.push(`наступне слово «${c.next}» — називний (іменна частина присудка)`) }
    if (c.sentStart && PREP.has(c.next)) { weak = true; cues.push('початок речення + прийменник — «Єсть у мене …» (буттєве)') }
  }
  let verdict: CopulaVerdict = strong && !eat ? 'copula' : eat && !strong && !weak ? 'eat' : 'ambiguous'
  if (gate === 'none') {
    if (!strong && !weak) return undefined            // modern / unknown orthography without a copula cue: їсти only
    if (verdict !== 'copula') verdict = 'ambiguous'
  } else if (gate === 'isolated') verdict = 'ambiguous'
  if (verdict === 'eat') return undefined             // an eating cue: the ordinary reading, no second one
  const chip: FeatureChip = { rule: COPULA_RULE, feature: 'ікавізм (галицьке)', label: 'їсть замість єсть (є → ї)', cite: EVIDENCE,
    qualifier: isGalician(c.authorRegion ?? c.witnessRegion) ? 'galician' : 'edition',
    text: `можливе галицьке написання з ї замість є (ікавізм): «їсть» = «єсть», форма дієслова «бути»; джерела не знайдено, діалектну групу не заявлено${verdict === 'ambiguous' ? '; неоднозначно: читання «їсти» (ВЕСУМ) лишається' : ''}` }
  return { verdict, form: k, copulaForm: cf, cues, chip, evidence: EVIDENCE,
    readings: verdict === 'copula' ? [{ lemma: 'бути', via: cf, default: true }, { lemma: 'їсти' }] : [{ lemma: 'їсти', default: true }, { lemma: 'бути', via: cf }] }
}

/** extra search key: «їсть» also finds the copula; ordered AFTER the typed key, the їсти result is not displaced */
export const copulaKeys = (k: string): string[] => (COPULA_FORMS[k] ? [COPULA_FORMS[k]!] : [])
