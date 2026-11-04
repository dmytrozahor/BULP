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
import { SE_OWNER, toSya } from './respell-refl.ts'

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
// ── MM-56 locative plural -ох / -ех (людох, конох, людех → людях, конях); MM-57 hard -ск- / -цк- / -зк- of the adjective and adverb suffixes (галицкий, низко) ───────────
export const toLocA = (w: string): string => (/^.{2,}ох$/.test(w) ? w.slice(0, -2) + 'ах' : w)
export const toLocJa = (w: string): string => { const m = /^(.{2,}[бвгґджзклмнпрстфхцчшщ])(?:ох|ех)$/.exec(w); return m ? m[1]! + 'ях' : w }
const LOC_NDN = Q('ENC', UM(173), 'у місц. в. мн. -ох (на з’ат’ох; так само і множинні іменники — на грудьох, на дворох)', 'NDN, ЕУМ «Наддністрянський говір»; the page prints the accented vowels as images, the stress letters are lost in the extract: the quote keeps the ending -ох and the rule text')
export const LOC_OH_A_FOLD: Fold = { id: 'ORTH-GAL-LOC-OH-A', era: [], branch: true, cite: LOC_NDN, apply: toLocA }
export const LOC_OH_JA_FOLD: Fold = { id: 'ORTH-GAL-LOC-OH-JA', era: [], branch: true, cite: Q('ENC', UM(174), 'у місц. в. мн. іменників ж. р. збереглося закінчення -ох (ф кунупл’ох, на меж’ох), зрідка — -ex (у груд’ех)', 'SYAN (um174); the same -ох for NDN (um173), POD (um180: сіни, груди), ZAK (um162: кон’ох, люд’ох); soft stem -ях'), apply: toLocJa }
const SK = /([сцз])к(?=(?:ий|их|им|ім|ого|ому|ої|ою|ими|а|е|у|і|о)$)/
export const toSkSoft = (w: string): string => w.replace(SK, '$1ьк')
export const SK_FOLD: Fold = { id: 'ORTH-GAL-SK', era: [], branch: true,
  cite: Q('ENC', UM(175), 'депалаталізація [с], [ц] … у прикметниках і прислівниках на -ск, -зк, -цк, (ни́ско, пóл.ский, вітц’ўский, н’імéцкий)', 'PKB (um175); the same for SYAN (um174: [с’], [ц’] у прикм. суфіксах пóнскій, л’éцкій). Reverse: -ск-/-цк-/-зк- → -ськ-/-цьк-/-зьк-; the Желехівка fold ORTH-ZHEL-SKY covers [сц] with the Wikipedia quote'), apply: toSkSoft }
// ── MM-57 (the other hardenings the ЕУМ pages state): final ц / с, ц before -а -у, hard р before я ю ────────────────────────────────────────────────
export const toCFinal = (w: string): string => w.replace(/([аеиіоуяю])ц$/, '$1ць')
export const toSFinal = (w: string): string => (w.length > 3 ? w.replace(/([аеиіоуєя])с$/, '$1сь') : w)
export const toCDepal = (w: string): string => w.replace(/ц([ау])$/, (_m, v: string) => 'ц' + (v === 'а' ? 'я' : 'ю'))
export const toRHard = (w: string): string => w.replace(/р([ау])/g, (_m, v: string) => 'р' + (v === 'а' ? 'я' : 'ю'))
const PKB_DEPAL = Q('ENC', UM(175), 'депалаталізація [с], [ц] у кінці слів (дес, хтос, хл пец, от ц), перед флексійними -а, -у (в лица, т рница, на в лицу, копи́цу)', 'PKB (um175); the extract has gaps where the page prints accented vowels')
const POD_C = Q('ENC', UM(180), 'твердість (у південноподіл. говірках) кінцевого ц (хл пеиц, м’ с’ац)', 'ЕУМ «Подільський говір», south Podolian говірки')
const POD_R = Q('ENC', UM(180), 'твердість p перед голосними (бур к, рад к, расни́й, зор , гов ру)', 'ЕУМ «Подільський говір»; the extract has gaps where the page prints accented vowels (бурáк, рáдий, зóра, говóру)')
export const C_FINAL_FOLD: Fold = { id: 'ORTH-GAL-C-FINAL', era: [], branch: true, cite: POD_C, apply: toCFinal }
export const S_FINAL_FOLD: Fold = { id: 'ORTH-GAL-S-FINAL', era: [], branch: true, cite: PKB_DEPAL, apply: toSFinal }
export const C_DEPAL_FOLD: Fold = { id: 'ORTH-GAL-C-DEPAL', era: [], branch: true, cite: PKB_DEPAL, apply: toCDepal }
export const R_HARD_FOLD: Fold = { id: 'ORTH-GAL-R-HARD', era: [], branch: true, cite: POD_R, apply: toRHard }
/** MM-58: «сє» is the Galician counterpart of the reflexive particle ся (owner: «сє до речі теж галицкий відповідник … вроді тернопільський»): kind P, no ЕУМ page has it */
export const SE_FOLD: Fold = { id: 'ORTH-GAL-SE', era: [], branch: true, cite: SE_OWNER, apply: toSya }
export const GAL_SOFT_FOLDS: Fold[] = [SE_FOLD, C_FINAL_FOLD, S_FINAL_FOLD, C_DEPAL_FOLD, LOC_OH_A_FOLD, LOC_OH_JA_FOLD, SK_FOLD, A_SOFT_FOLD, HARD_T_FOLD, HARD_T_E_FOLD, E_I_FOLD, E_Y_FOLD, REM_FOLD, I_KEPT_E_FOLD]
/** ORTH-GAL-R-HARD (ра → ря, ру → рю) is measured but NOT shipped as a reverse fold: 191 types / 483 tokens, but about a quarter of a 30-form sample was wrong (умірати > уміряти, добраго > добряго, надзору > надзорю, манастиру > манастирю): far above 5 %. The FORWARD row GAL-R-HARD (POD um180) is shipped. */
export const GAL_SOFT_MEASURED: Fold[] = [...GAL_SOFT_FOLDS, I_KEPT_O_FOLD, R_HARD_FOLD]

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
    case 'ORTH-GAL-LOC-OH-A': case 'ORTH-GAL-LOC-OH-JA': return /^noun/.test(tags) && /:v_mis/.test(tags) && /:p(:|$)/.test(tags)
    case 'ORTH-GAL-C-FINAL': case 'ORTH-GAL-C-DEPAL': return /^noun/.test(tags) && !/:prop/.test(tags)
    case 'ORTH-GAL-S-FINAL': return /^(adv|part|conj|noun)/.test(tags) && !/:prop/.test(tags)
    case 'ORTH-GAL-R-HARD': return !/:prop/.test(tags)
    case 'ORTH-GAL-SK': return /^(adj|adv|noun)/.test(tags) && !/:prop/.test(tags)
    case 'ORTH-GAL-REM': return /^noun/.test(tags) && /:v_oru\b/.test(tags)
    case 'ORTH-GAL-I-E': case 'ORTH-GAL-I-O': {   // the lemma keeps the nominative і: папер ← папір (дітєм > дотом is refused: lemma дот)
      const i = raw.search(/і[бвгґджзклмнпрстфхцчшщ]/)
      return /^noun/.test(tags) && !/:prop\b/.test(tags) && !isForm(raw.replace(/і/g, 'и')) && i >= 0 && (!lemma || lemma.startsWith(raw.slice(0, i + 2)))
    }
    default: return true
  }
}
