/**
 * SPEC 63 OV-14 — Volhynian (VOL), Podolian (POD) and Mid-Dnieper (MDN) vowel features that come from the ORIGIN of і (core/origin.ts), with their verbatim ЕУМ cites
 * (http://litopys.org.ua/ukrmova/um166|178|180.htm, edition «Українська мова. Енциклопедія»). Nothing here is invented: where the source says the dialect keeps the standard
 * sound, the rule is a CITED «no respelling» (`STANDARD_RULES`: the card says «у волинських говорах — і (як у літ. мові)» with the source instead of staying silent); where it
 * says a vowel differs, the respelling fires only on a letter whose origin comes from data and only for the words the source names.
 */
import { Q, type Evidence } from './evidence.ts'
import type { Origin } from './origin.ts'
import type { Edit, SpellRule } from './respell.ts'

const E = (n: number, quote: string, note?: string): Evidence => Q('ENC', `http://litopys.org.ua/ukrmova/um${n}.htm`, quote, note)
const MDN_O = E(166, 'переважно у пн. говірках давня фонема [о] в новоутв. закритих складах змінилася на [і] непослідовно, тому тут відзначено форми воз, кóстка. порóг, рáдост’',
  'непослідовно, переважно у північних говірках: лише названі слова')
const VOL_O = E(178, 'у західноволин. говірках відповідно до етимологічного [о] в новозакритому складі поряд з переважаючим [і] виступає також монофтонг [у], [и] (стіл, віл, столíў, столýў, стил, ни́чка, ти́л’кі та ін.)',
  '[і] переважає; [у], [и] — лише поряд, у західноволинських')
const POD_O = E(180, 'твердість передньоязикових приголосних т, д, н, с, з, л перед і, що походить з давнього о (ніс, сік, стіл, лій)')
const POD_A = E(180, 'відсутність переходу а в е, і після м’яких приголосних (з’ат’, вз’аў, йагн’á), лише в західноподіл. говірках спостерігається перезвук а>е (з’ет’, вз’еў, йагн’é)')

const fromO = (o: Origin | null) => !!o && o.rule === 'R10' && o.src === 'о'
/** MDN keeps о in exactly the words the source names (воз, кóстка, порóг, рáдост’): the lemma pattern */
export const MDN_WORDS = /^(віз|поріг)$|^кіст|^радіст/

export const SW_RULES: SpellRule[] = [
  { id: 'MDN-O-KEPT', codes: { MDN: 'MDN-O-KEPT' }, needs: 'origin-word', when: MDN_WORDS, example: ['віз', 'воз'], own: { MDN: MDN_O },
    edits: (w, _st, org) => [...w].flatMap((c, i) => (c === 'і' && fromO(org(i)) ? [[i, i + 1, 'о'] as Edit] : [])) },
]

export interface StandardRule { id: string; code: string; text: string; cite: Evidence; applies: (w: string, org: (i: number) => Origin | null) => boolean }
/** a dialect that has the standard sound where one might expect a reflex: cited «no respelling» (shown on the card, never silent) */
export const STANDARD_RULES: StandardRule[] = [
  { id: 'VOL-O-I', code: 'VOL', cite: VOL_O, text: 'у волинських говорах на місці давнього о в новозакритому складі переважає і (як у літ. мові); у, и — лише поряд, у західних говірках',
    applies: (w, org) => [...w].some((c, i) => c === 'і' && fromO(org(i))) },
  { id: 'POD-O-I', code: 'POD', cite: POD_O, text: 'у подільських говорах — і (як у літ. мові), але попередній т, д, н, с, з, л твердий',
    applies: (w, org) => [...w].some((c, i) => c === 'і' && i > 0 && 'тднсзл'.includes(w[i - 1]!) && fromO(org(i))) },
  { id: 'POD-A-KEPT', code: 'POD', cite: POD_A, text: 'у подільських говорах а (я) після м’якого приголосного не переходить в е (лише в західних говірках — е)',
    applies: w => /[бвгґдзклмнпрстфхцчшщ]я/.test(w) },
]
