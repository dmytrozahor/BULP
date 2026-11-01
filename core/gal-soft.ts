/**
 * SPEC 63 MM-48 … MM-51: reverse link folds for Galician / Podillian / Volhynian spellings that a printed text writes as it is pronounced. Like every fold of core/gal-folds.ts they are
 * BRANCHING extra candidates (era [], branch: true): the plain candidate always comes first and VESUM decides, so a word that VESUM already lists as a form (a genuine standard word with є / е /
 * -т / і) is linked to itself and the fold never reaches it (the reverse guard is the candidate order itself; `tests/mm48-51.test.ts` pins it).
 *
 *  ORTH-GAL-A-SOFT   тєжко, дєкувати, пєть, мнєсо → тяжко, дякувати, п’ять, м’ясо     (я > є / е after a soft consonant: ЕУМ um173 NDN, um175 PKB, um168 WPL, um174 SYAN)
 *  ORTH-GAL-3T       ходит, робит, носят, мают → ходить, робить, носять, мають           (hard -т of the 3rd person present: ЕУМ POD / NDN, core/rules.ts 3SG-HARD-T)
 *  ORTH-GAL-3T-E     мусєт, видєт → мусить, видить                                       (the same -т on the є-stem of the і-class)
 *  ORTH-GAL-E-I / -Y  мусєти, видєти, сидєти, терпєти, видєв, видєш → мусіти / мусити, видіти, сидіти, терпіти, видів, видиш   (є-stem of the і-class verbs; no source statement: uncited)
 *  ORTH-GAL-REM      кобзарєм, писарєм → кобзарем, писарем                                (soft р + -єм; uncited)
 *  ORTH-GAL-I-E / -O папірєм, папіром, вілом → папером, папором, волом                    (і of the nominative kept in the oblique cases; uncited)
 * "Uncited" = the repo holds no source sentence for the feature: the candidate is a link only, no feature chip, the evidence kind is P with «джерела не знайдено» (like ORTH-TSYA-PHON).
 */
import { P, Q } from './evidence.ts'
import type { Fold } from './orthography.ts'

const UM = (n: number) => `http://litopys.org.ua/ukrmova/um${n}.htm`
const SOFT_C = 'бвгґджзклмнпрстфхцчшщ'
const NONE = 'джерела не знайдено у репозиторії; кандидат лише для зв’язування, VESUM вирішує; ознаки (чіпа) немає'

// ── MM-48 я > є / е after a soft consonant ─────────────────────────────────────────────────────────
const A_SOFT = new RegExp(`([${SOFT_C}])є(?=[${SOFT_C}'’])(?!м$)`, 'g')   // not the instrumental ending -єм (кобзарєм is ORTH-GAL-REM, not кобзарям)
const LAB = 'бпвмф'
export const toASoft = (w: string): string => {
  if (!/є/.test(w)) return w
  let s = w.replace(new RegExp(`мнє(?=[${SOFT_C}])`, 'g'), 'м’я')   // мнєсо → м’ясо
  s = s.replace(A_SOFT, (_m, c: string) => (LAB.includes(c) ? c + '’я' : c + 'я'))                 // пєть → п’ять, тєжко → тяжко
  return s
}
export const A_SOFT_FOLD: Fold = {
  id: 'ORTH-GAL-A-SOFT', era: [], branch: true,
  cite: Q('ENC', UM(173), 'перехід а (з *а, *ę) після м’яких (чи колишніх м’яких) приголосних в е, і, и (гар’и́чий, д’éкувати, сáж’і)',
    'NDN; the same statement for PKB (um175 «[а] після м’яких приголосних переходить в [е], [и], [і]»), WPL (um168 «т’éжко, д’éкувати»), SYAN (um174). Written with є the sound is [’е]; the fold goes є → я, a general rule for every word, VESUM confirms the target'),
  apply: toASoft,
}

// ── MM-49 hard -т of the 3rd person; the є-stem of the і-class ───────────────────────────────────────
const T3 = /^(.{2,}(?:и|а|у|ю|я|і))т$/
export const toSoft3 = (w: string): string => { const m = T3.exec(w); return m ? m[1]! + 'ть' : w }
export const HARD_T_FOLD: Fold = {
  id: 'ORTH-GAL-3T', era: [], branch: true,
  cite: Q('ENC', UM(180), 'Твердість приголосного т у дієсловах 3-ї особи однини і множини теперішнього часу … рóбит, нóсит, рóбл’ат, нóс’ат',
    'POD (um180); NDN (хóдит). Every verb of the 3sg / 3pl present: -ит/-ат/-ут/-ют/-ят → -ить/-ать/-уть/-ють/-ять'),
  apply: toSoft3,
}
const T3E = /^(.{2,}[бвгґджзклмнпрстфхцчшщ])єт$/
export const toSoft3E = (w: string): string => { const m = T3E.exec(w); return m ? m[1]! + 'ить' : w }
export const HARD_T_E_FOLD: Fold = {
  id: 'ORTH-GAL-3T-E', era: [], branch: true,
  cite: Q('ENC', UM(180), 'Твердість приголосного т у дієсловах 3-ї особи однини і множини теперішнього часу … рóбит, нóсит, рóбл’ат, нóс’ат',
    'the hard -т (POD / NDN) on the і-class stem written with є (мусєт, видєт): -єт → -ить. The є-stem itself has no source sentence in the repo (see ORTH-GAL-E-I)'),
  apply: toSoft3E,
}
const E_STEM = new RegExp('^(.{2,}[' + SOFT_C + '])є(ти|в|ла|ло|ли|вши)$')   // the є is the stem of the infinitive / past of the і-class; the present is -иш, -ить (3T-E handles мусєт)
/** і-class verbs written with the є-stem: інфінітив / past → -іти, -ів … (видєти → видіти), present → -иш, -ить … (видєш → видиш) */
export const toEI = (w: string): string => { const m = E_STEM.exec(w); return m ? m[1]! + 'і' + m[2]! : w }
/** the same stem read as the 2nd conjugation -ити (мусєти → мусити); the infinitive only */
export const toEY = (w: string): string => { const m = E_STEM.exec(w); return m && m[2] === 'ти' ? m[1]! + 'ити' : w }
const E_NOTE = 'Є-основа дієслів на -іти (видєти, сидєти, летєти, терпєти, мусєти): жодне джерело репозиторію не формулює цю ознаку; ' + NONE
export const E_I_FOLD: Fold = { id: 'ORTH-GAL-E-I', era: [], branch: true, cite: P('OWNER', 'повідомлення власника, 2026-11-01 (мусєт, мусєти)', 'мусєти, видєти, сидєти → мусіти, видіти, сидіти', E_NOTE), apply: toEI }
export const E_Y_FOLD: Fold = { id: 'ORTH-GAL-E-Y', era: [], branch: true, cite: P('OWNER', 'повідомлення власника, 2026-11-01 (мусєт, мусєти)', 'мусєти → мусити (-ити замість -іти)', E_NOTE), apply: toEY }

// ── MM-51 soft р + -єм; і kept in the oblique cases ───────────────────────────────────────────────────
const REM = /^(.{2,}[аеиіоуяюєї]р)єм$/
export const toRem = (w: string): string => { const m = REM.exec(w); return m ? m[1]! + 'ем' : w }
export const REM_FOLD: Fold = { id: 'ORTH-GAL-REM', era: [], branch: true, cite: P('OWNER', 'повідомлення власника, 2026-11-01 (папірєм)', 'кобзарєм, писарєм → кобзарем, писарем', 'Інструментальний на -рєм: ' + NONE), apply: toRem }
const IK = new RegExp(`^(.{1,}?)і([${SOFT_C}])(ом|ем|єм|у|ю|ові|еві|єві|ами|ях|ах|ів|ою|ею)$`)
const IK_NOTE = 'Збереження і називного в непрямих відмінках (папіру, папіром, вілом замість паперу, папером, волом): ' + NONE
/** і of the nominative kept in an oblique case → е (папіром → папером) / о (вілом → волом); -єм after the soft р is the -ем / -ом of the standard form */
const unI = (v: 'е' | 'о') => (w: string): string => {
  const m = IK.exec(w); if (!m) return w
  const end = m[3] === 'єм' || m[3] === 'ем' ? (m[2] === 'р' ? 'ом' : m[3]) : m[3]!
  return m[1]! + v + m[2]! + (end === 'єм' ? 'ом' : end)
}
export const toIKeptE = unI('е'), toIKeptO = unI('о')
export const I_KEPT_E_FOLD: Fold = { id: 'ORTH-GAL-I-E', era: [], branch: true, cite: P('OWNER', 'повідомлення власника, 2026-11-01 (папірєм)', 'папіром, папірєм → папером', IK_NOTE), apply: toIKeptE }
export const I_KEPT_O_FOLD: Fold = { id: 'ORTH-GAL-I-O', era: [], branch: true, cite: P('OWNER', 'повідомлення власника, 2026-11-01 (папірєм)', 'вілом → волом', IK_NOTE), apply: toIKeptO }

/** ORTH-GAL-I-O (і > о: вілом → волом) is measured but NOT shipped: 3 of 9 links were wrong (звірем > звором) - above the 5 % limit; the fold stays exported for a later tightening */
export const GAL_SOFT_FOLDS: Fold[] = [A_SOFT_FOLD, HARD_T_FOLD, HARD_T_E_FOLD, E_I_FOLD, E_Y_FOLD, REM_FOLD, I_KEPT_E_FOLD]
export const GAL_SOFT_MEASURED: Fold[] = [...GAL_SOFT_FOLDS, I_KEPT_O_FOLD]

/**
 * Tag / context gate of the MM-48…51 branches (the fold only proposes a spelling; the TARGET must be the analysis the rule is about). `raw` = the lower-case token, `tags` = the VESUM tags of the
 * target form, `isForm(k)` = VESUM lists k as a form. Measured on the corpus vocabulary (analysis/gal-soft-measure.md): without it the nouns/numerals (совіт > совіть, десят > десять), the
 * proper names (Лебедєв), and the old є = е spellings (тєж = теж, будєть) produced the false positives.
 */
export function galSoftGate(id: string, raw: string, tags: string, isForm: (k: string) => boolean, lemma = ''): boolean {
  switch (id) {
    case 'ORTH-GAL-3T': case 'ORTH-GAL-3T-E': return /^verb/.test(tags) && /:(pres|futr)(:|$)/.test(tags) && /:3(:|$)/.test(tags)
    case 'ORTH-GAL-E-I': return /^(verb|advp)/.test(tags) && /іти$/.test(lemma)   // видєло > виділо (lemma виділити) is refused: the lemma must be an -іти verb
    case 'ORTH-GAL-E-Y': return /^(verb|advp)/.test(tags) && /ити$/.test(lemma)
    // «тєж» = теж: the е-reading is itself a form (the old є = е spelling); «будєть» = будеть, not будять
    case 'ORTH-GAL-A-SOFT': return !isForm(raw.replace(/є/g, 'е')) && !/:prop\b/.test(tags) && !(/єть$/.test(raw) && /^verb/.test(tags)) && !/єти$/.test(raw)   // the infinitive -єти is the і-class stem (E-I / E-Y), замирєти is not замиряти
    case 'ORTH-GAL-REM': return /^noun/.test(tags) && /:v_oru\b/.test(tags)
    case 'ORTH-GAL-I-E': case 'ORTH-GAL-I-O': {   // the lemma keeps the nominative і: папер ← папір (дітєм > дотом is refused: lemma дот)
      const i = raw.search(/і[бвгґджзклмнпрстфхцчшщ]/)
      return /^noun/.test(tags) && !/:prop\b/.test(tags) && !isForm(raw.replace(/і/g, 'и')) && i >= 0 && (!lemma || lemma.startsWith(raw.slice(0, i + 2)))
    }
    default: return true
  }
}
