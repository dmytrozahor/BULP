/**
 * SPEC 63 MM-18..MM-21: four labelled, cited, BRANCHING extra candidates for Galician-grammar spellings that the Желехівка statement table (core/zhel-folds.ts) does not cover.
 * Like core/adj-soft.ts they have era [] (fold() never applies them by orth): the build adds them as one-more-branch candidates for EVERY token (OCR witnesses carry no orth),
 * VESUM decides, and the plain candidate wins every tie. Every rule quotes the owner's own OCR of a printed grammar (the quote is the OCR text, the noise is kept; scan = file page_NNNN.txt).
 *
 *  ORTH-ADJ-IISH    скорійше, новійший, найсьвятійшою → скоріше, новіший, найсвятішою
 *  ORTH-VERB-OVATI  шановати, купова́ти, малёвати → шанувати, купувати   (-ова- ~ -ува-; two hypotheses about WHY are recorded in specs/63, only the cited one is stated here)
 *  ORTH-PART-HYPH   прийми-ж, було-б, ходи-но → the host word + a particle (the hyphen is the older / Galician way to attach it); MM-42: also «видів-го» (го = його, the particle is the pronoun clitic)
 *  ORTH-ZAK-*, ORTH-RDC  MM-40 / MM-41 (core/zak-folds.ts): ÿ ü ӱ ô in a Cyrillic word, сердце → серце
 *  ORTH-DAT-OVI     міст-ові, містові → міст (MM-29): the dative in -ові/-еві/-єві joined to the unchanged stem, with or without a hyphen
 */
import { P, Q } from './evidence.ts'
import type { Fold } from './orthography.ts'
import type { Candidate } from './phonology.ts'
import { familyMember } from './variant-families.ts'
import { ALL_ZAK_FOLDS, RDC_FOLD, ZAK_FOLDS, isZakMarked } from './zak-folds.ts'

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
export const HYPH_PARTICLES = ['ж', 'же', 'жь', 'б', 'би', 'бо', 'но', 'то', 'таки', 'го'] as const
const HYPH = new RegExp(`^(.{2,}?)-(${HYPH_PARTICLES.join('|')})$`)
/** MM-33: after a member of a family with `tails` (тілько-що) the particle «що» is a tail as well */
const HYPH_SCHO = /^(.{2,}?)-(що)$/
/** host + particle of «прийми-ж»; undefined when the token has no such tail (будь-хто, де-не-де are not split: VESUM decides first, the build only splits what it cannot link whole) */
export const splitHyphenParticle = (w: string): { host: string; particle: string } | undefined => {
  const l = w.toLowerCase(), m = HYPH.exec(l)
  // MM-42: «видів-го», «дай-го» — the enclitic го = його (core/short-forms.ts); interjections (го-го, ого-го, гей-го) are no host + clitic
  if (m && m[2] === 'го' && /^(го|ого|ге|гей|ой|ех|ах|ха|ну|тю)$/.test(m[1]!)) return undefined
  if (m) return { host: m[1]!, particle: m[2]! }
  const s = HYPH_SCHO.exec(l), f = s && familyMember(s[1]!)
  return s && f && f.family.tails && !f.member.peer ? { host: s[1]!, particle: s[2]! } : undefined
}
/** MM-44: an attached OBJECT clitic (pronoun «-го» = його) takes a verb (or a particle) as its host; a noun reading of the host (видів = gen. pl. of вид) must not win. «-ж, -би, -то …» are particles of any host and are unconstrained */
export const OBJECT_CLITICS: ReadonlySet<string> = new Set(['го'])
export const hostTagOk = (particle: string, tags: string): boolean => !OBJECT_CLITICS.has(particle) || /^(verb|part|advp)/.test(tags)
export const PART_HYPH_FOLD: Fold = {
  id: 'ORTH-PART-HYPH', era: [], branch: true,
  cite: Q('SMALST', SS92, 'Пишемо завсїди окремо: би, же, но, ся, то, пр.: я робив би; брат же відповів; ходи но сюда; … Противно пишемо разом слова зложені з: -б, -будь, -небудь, -де, -ж, -крат, -сь, пр. ділалаб, хвалилиб, колиб; хтож, щож',
    'OCR. Both Смаль-Стоцький (1892: би, же, но, то apart; -б, -ж fused) and Огоновський 1889 («навпаки-жь», «Постійно-жь», p. 39: hyphen) show that the particle is a separate clitic; the hyphen is the older print habit, the particle is not part of the word. Only the host word is linked'),
  apply: w => splitHyphenParticle(w)?.host ?? w,
}

/** -ува-ти family → -ова-ти family: the REVERSE direction of ORTH-VERB-OVATI (керувати → керовати), used by «Аналіз слова», the annotator and the search keys to show the older / Galician counterpart; never a build candidate */
const UVATI = /^(.{2,}?)ува(ти|в|ла|ло|ли|ний|ння|вши)$/
export const toOvati = (w: string): string => { const m = UVATI.exec(w); return m ? m[1]! + 'ова' + m[2]! : w }

/** MM-29: dative sg. in -ові / -еві / -єві attached to the unchanged stem (міст-ові, містові): the stem is the candidate. VESUM decides (мостові is the standard dative of міст and is a VESUM form, so it never reaches this branch) */
const DAT = /^(.{3,}?)-?(ові|еві|єві)$/
export const toDatStem = (w: string): string => { const m = DAT.exec(w); return m ? m[1]! : w }
const WPL_DAT = Q('WUK', 'uk.wikipedia «Західнополіський говір» (W-WPL), «Наддністрянський говір» (W-NDN); research/04 SW-DAT-OVY', 'Поширеність закінчення -ови, -еви в давальному відмінку однини іменників чоловічого роду (си́нови, брáтови, дýбови, конéви …)',
  'Вікіпедія називає західні говори (західнополіський, наддністрянський) носіями давального на -ови / -еви. Стандартне закінчення -ові, -еві, -єві (Правопис 2019 § 83, research/02). Закінчення -ові на незміненій основі (містові: без чергування о / і) окремою цитатою у сховищі не підтверджено; дефіс у «міст-ові» — друкарське з’єднання (джерела про дефіс у відмінковому закінченні не знайдено)')
export const DAT_OVI_FOLD: Fold = { id: 'ORTH-DAT-OVI', era: [], branch: true, cite: WPL_DAT, apply: toDatStem }

/**
 * MM-37: the 3rd-person reflexive ending written as it is PRONOUNCED, -тьця / -тця / -цця (сьпіваютьця, засьміетця): the link candidate -ться (сьпіваютьця -> співаються; засьміетця -> засміється, -ет- read as -єт- after a vowel).
 * The ь in -тьця is a softness mark like ORTH-ZHEL-SOFT, but the quote on that page names only labials, so this fold has NO source statement of its own: it is the owner's identification
 * (a link candidate only, VESUM decides; no feature chip, because a chip needs a cited rule, core/feature-chips.ts).
 */
const TSYA = /(?:ть|т|ц)ця$/
export const toTsya = (w: string): string => TSYA.test(w) ? w.replace(TSYA, 'ться').replace(/([аеиіоуяюєї])е(ться)$/, '$1є$2') : w
export const TSYA_PHON_FOLD: Fold = {
  id: 'ORTH-TSYA-PHON', era: [], branch: true,
  cite: P('OWNER', 'повідомлення власника, 2026-10-29 (сьпіваютьця, засьміетця у Грінченка 1893)', '-тьця / -цця = -ться (сьпіваютьця)', 'джерела (граматики, словника) з цим твердженням у сховищі не знайдено; кандидат для зв’язування, ознака не показується'),
  apply: toTsya,
}
export const GAL_FOLDS: Fold[] = [ADJ_IISH_FOLD, VERB_OVATI_FOLD, PART_HYPH_FOLD, DAT_OVI_FOLD, TSYA_PHON_FOLD, ...ALL_ZAK_FOLDS]
const EXTRA: Fold[] = [ADJ_IISH_FOLD, VERB_OVATI_FOLD, DAT_OVI_FOLD, TSYA_PHON_FOLD, RDC_FOLD]

/** one extra branch per applicable fold, after the plain candidates; `src` is the candidate list of derive() or fold() */
export function withGal<T extends Candidate[]>(cands: T, raw?: string): Candidate[] {
  const seen = new Set(cands.map(c => c.form)), extra: Candidate[] = []
  // MM-41: the Transcarpathian marker letters are folded from the RAW token (the derive step has already turned ô into і); a Latin word never qualifies (isZakMarked)
  const r = (raw ?? cands[0]?.form ?? '').toLowerCase()
  if (isZakMarked(r)) for (const f of ZAK_FOLDS) { const s = f.apply(r); if (s !== r && !seen.has(s)) { seen.add(s); extra.push({ form: s, trace: [f.id], branches: (cands[0]?.branches ?? 0) + 1 }) } }
  for (const c of cands) for (const f of EXTRA) {
    const s = f.apply(c.form)
    if (s !== c.form && !seen.has(s)) { seen.add(s); extra.push({ form: s, trace: [...c.trace, f.id], branches: c.branches + 1 }) }
  }
  return extra.length ? [...cands, ...extra] : cands
}
