/**
 * SPEC 63 MM-18..MM-21: four labelled, cited, BRANCHING extra candidates for Galician-grammar spellings that the Желехівка statement table (core/zhel-folds.ts) does not cover.
 * Like core/adj-soft.ts they have era [] (fold() never applies them by orth): the build adds them as one-more-branch candidates for EVERY token (OCR witnesses carry no orth),
 * VESUM decides, and the plain candidate wins every tie. Every rule quotes the owner's own OCR of a printed grammar (the quote is the OCR text, the noise is kept; scan = file page_NNNN.txt).
 *
 *  ORTH-ADJ-IISH    скорійше, новійший, найсьвятійшою → скоріше, новіший, найсвятішою
 *  ORTH-VERB-OVATI  шановати, купова́ти, малёвати → шанувати, купувати   (-ова- ~ -ува-; two hypotheses about WHY are recorded in specs/63, only the cited one is stated here)
 *  ORTH-PART-HYPH   прийми-ж, було-б, ходи-но → the host word + a particle (the hyphen is the older / Galician way to attach it)
 */
import { Q } from './evidence.ts'
import type { Fold } from './orthography.ts'
import type { Candidate } from './phonology.ts'

const SS14 = 'Смаль-Стоцький, Граматика руської мови (1914), скан p. 44 (друк. с. 40), §§ 62–63 «Степенованє прикметників»'
const OG89 = 'Огоновський, Граматика руської мови (1889), скан p. 31–32 (§ 38), p. 39'
const SS92 = 'Смаль-Стоцький, Руска правопись зі словарцем (1892), скан p. 9 (с. 12) і p. 22 (с. 19–20)'

/** -ійш- / -їйш- → -іш- before the adjective / adverb endings */
const IISH = /^(.{2,}?)[ії]йш(ий|а|е|і|ого|ому|им|ими|их|ої|ою|у|ім|ій)$/
export const toIish = (w: string): string => { const m = IISH.exec(w); return m ? m[1]! + 'іш' + m[2]! : w }
export const ADJ_IISH_FOLD: Fold = {
  id: 'ORTH-ADJ-IISH', era: [], branch: true,
  cite: Q('SMALST', SS14, 'Для вираженя прикмети в більшій мірі (другий степень порівнаня) служить наросток: -ший, -ї(й)ший, -іщий : богатший (богатий), … веселїйший (веселий)',
    'OCR; the grammar lists -ї(й)ший (-їйший) beside -ший and -іщий as THE suffix of the comparative; the modern norm is -іший (веселіший). The stem is not restricted by the source, so VESUM decides'),
  apply: toIish,
}

/** -ова-ти family → -ува-ти family (the plain -ова- candidate stays first) */
const OVATI = /^(.{2,}?)ова(ти|в|ла|ло|ли|ний|ння|вши)$/
export const toUvati = (w: string): string => { const m = OVATI.exec(w); return m ? m[1]! + 'ува' + m[2]! : w }
export const VERB_OVATI_FOLD: Fold = {
  id: 'ORTH-VERB-OVATI', era: [], branch: true,
  cite: Q('OGON', OG89, 'въ способѣ неозначенім глаголовъ клясы VI. уживає ся по-найбільше наростокъ -ува-ти замість -ова-ти, де о замѣнює ся въ у не такъ вплывомъ слѣдуючого губного сповзвука, якъ радше зъ поглядомъ на у въ Формѣ часу теперѣшнього: купу-ю',
    'OCR. Огоновський records -ова-ти as the older infinitive suffix and -ува-ти as the common one (doublets «ночовати (або ночувати), войовати (або воювати)», p. 39); Смаль-Стоцький 1892 (p. 9) prescribes «-ува (-юва), пр. купувати (не: куповати)». The cause is stated by Огоновський himself (the vowel of the PRESENT stem купу-ю), not as окання / укання'),
  apply: toUvati,
}

/** closed list of particles that older Galician print joins to the host word with a hyphen */
export const HYPH_PARTICLES = ['ж', 'же', 'жь', 'б', 'би', 'бо', 'но', 'то', 'таки'] as const
const HYPH = new RegExp(`^(.{2,}?)-(${HYPH_PARTICLES.join('|')})$`)
/** host + particle of «прийми-ж»; undefined when the token has no such tail (будь-хто, де-не-де are not split: VESUM decides first, the build only splits what it cannot link whole) */
export const splitHyphenParticle = (w: string): { host: string; particle: string } | undefined => { const m = HYPH.exec(w.toLowerCase()); return m ? { host: m[1]!, particle: m[2]! } : undefined }
export const PART_HYPH_FOLD: Fold = {
  id: 'ORTH-PART-HYPH', era: [], branch: true,
  cite: Q('SMALST', SS92, 'Пишемо завсїди окремо: би, же, но, ся, то, пр.: я робив би; брат же відповів; ходи но сюда; … Противно пишемо разом слова зложені з: -б, -будь, -небудь, -де, -ж, -крат, -сь, пр. ділалаб, хвалилиб, колиб; хтож, щож',
    'OCR. Both Смаль-Стоцький (1892: би, же, но, то apart; -б, -ж fused) and Огоновський 1889 («навпаки-жь», «Постійно-жь», p. 39: hyphen) show that the particle is a separate clitic; the hyphen is the older print habit, the particle is not part of the word. Only the host word is linked'),
  apply: w => splitHyphenParticle(w)?.host ?? w,
}

export const GAL_FOLDS: Fold[] = [ADJ_IISH_FOLD, VERB_OVATI_FOLD, PART_HYPH_FOLD]
const EXTRA: Fold[] = [ADJ_IISH_FOLD, VERB_OVATI_FOLD]

/** one extra branch per applicable fold, after the plain candidates; `src` is the candidate list of derive() or fold() */
export function withGal<T extends Candidate[]>(cands: T): Candidate[] {
  const seen = new Set(cands.map(c => c.form)), extra: Candidate[] = []
  for (const c of cands) for (const f of EXTRA) {
    const s = f.apply(c.form)
    if (s !== c.form && !seen.has(s)) { seen.add(s); extra.push({ form: s, trace: [...c.trace, f.id], branches: c.branches + 1 }) }
  }
  return extra.length ? [...cands, ...extra] : cands
}
