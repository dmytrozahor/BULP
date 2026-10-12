/**
 * Heteronyms — words spelled alike whose stress distinguishes meaning (SPEC 60 HT-1…HT-3; user U-26), research/25.
 *
 * > "Омографи — слова, однакові за написанням, але різні за значенням і наголосом: за́мок / замо́к, а́тлас / атла́с …" — uk.wikipedia «Омографи»,
 * >   citing Літературознавча енциклопедія (Ковалів Ю., 2007, т. 2, с. 152)
 * > "ЗАМО́К мка́, ч. «Пристрій для замикання дверей у приміщеннях, дверцят шафи…» / ЗА́МОК мку, ч. «Укріплене житло феодала доби Середньовіччя…»" — СУМ-20
 *
 * A `Heteronym` is kept APART from the free `StressVariant`s of one lexeme (за́вжди́): variants are one word with two stresses, a heteronym is
 * ≥ 2 readings (different lexemes, aspect partners or inflected forms) that share an unstressed spelling. Readings confirmed in СУМ-20 carry a
 * verbatim quote (Q); pairs known only from the Wikipedia list «Омографи» are paraphrase (P) until checked in a dictionary (research/25 §2a).
 * `послуха́тися ≠ послу́хатися` (U-26) is NOT a heteronym: every dictionary read has only послу́хатися, so it stays [U] in HT_UNVERIFIED and a
 * reading is added only when the user supplies a source (HT-3, P-1.7).
 */
import { P, Q, type Evidence } from './evidence.ts'
import { renderStress } from './text.ts'

export type ReadingKind = 'lexeme' | 'aspect-partner' | 'inflected-form'
export const READING_KIND_UK: Record<ReadingKind, string> = { lexeme: 'різні слова', 'aspect-partner': 'видова пара (вид розрізняє наголос)', 'inflected-form': 'різні форми слова' }

export interface HeteronymReading {
  stressed: string                 // за́мок (U+0301 after the stressed vowel)
  positions: number[]              // vowel indices in the unstressed form
  lemma: string
  gloss?: string
  pos?: string
  aspect?: 'pf' | 'ipf'
  kind: ReadingKind
  /** homograph scope when the pair coincides only in some cases, e.g. о́бід / обі́д (Nom, Acc) */
  cases?: string[]
  evidence: Evidence[]
}
export interface Heteronym {
  form: string                     // unstressed, NFC, lowercase
  readings: HeteronymReading[]     // ≥ 2
  /** 'Q' = every reading has a СУМ-20 quote; 'P' = from the Wikipedia list, not yet checked in a dictionary */
  confidence: 'Q' | 'P'
}

const COMBINING = /[́]/g
export const heteronymKey = (s: string) => s.normalize('NFC').toLowerCase().replace(COMBINING, '').replace(/[’ʼ`]/g, "'")

/** "за^мок" → { form: 'замок', stressed: 'за́мок', positions: [1] }: `^` follows the stressed vowel (ASCII marker keeps this file editable). */
export function st(marked: string): { form: string; positions: number[]; stressed: string } {
  const positions: number[] = []; let form = ''
  for (const c of marked) c === '^' ? positions.push(form.length - 1) : (form += c)
  return { form, positions, stressed: renderStress(form, positions) }
}

const SUM = (word: string, quote: string) => Q('SUM20', `https://goroh.pp.ua/Тлумачення/${encodeURIComponent(word)} (СУМ-20 через goroh)`, quote)
const WIKI = (quote: string) => P('WPUK', 'https://uk.wikipedia.org/wiki/Омографи (pageid 293659)', quote, 'пара не підтверджена словником: P')

type R = Omit<HeteronymReading, 'stressed' | 'positions' | 'evidence'> & { m: string; ev: Evidence }
const reading = (r: R): HeteronymReading => {
  const { m, ev, ...rest } = r; const s = st(m)
  return { ...rest, stressed: s.stressed, positions: s.positions, evidence: [ev] }
}
const het = (marked: string, confidence: 'Q' | 'P', rs: R[]): Heteronym => ({ form: heteronymKey(st(marked).form), confidence, readings: rs.map(reading) })

/** SUM-20-verified pairs (research/25 §3, all glosses verbatim [Q]). */
const VERIFIED: Heteronym[] = [
  het('замок', 'Q', [
    { m: 'замо^к', lemma: 'замок', pos: 'іменник', kind: 'lexeme', gloss: 'Пристрій для замикання дверей у приміщеннях, дверцят шафи…', ev: SUM('замок', 'ЗАМО́К мка́, ч. «Пристрій для замикання дверей у приміщеннях, дверцят шафи…»') },
    { m: 'за^мок', lemma: 'замок', pos: 'іменник', kind: 'lexeme', gloss: 'Укріплене житло феодала доби Середньовіччя.', ev: SUM('замок', 'ЗА́МОК мку, ч. «Укріплене житло феодала доби Середньовіччя…»') },
  ]),
  het('обід', 'Q', [
    { m: 'обі^д', lemma: 'обід', pos: 'іменник', kind: 'lexeme', cases: ['nom', 'acc'], gloss: 'Споживання їжі серед дня…', ev: SUM('обід', 'ОБІ́Д у, ч. «Споживання їжі серед дня…»') },
    { m: 'о^бід', lemma: 'обід', pos: 'іменник', kind: 'lexeme', cases: ['nom', 'acc'], gloss: 'Зовнішня частина колеса…', ev: SUM('обід', 'О́БІД о́бода, ч. «Зовнішня частина колеса…»') },
  ]),
  het('приклад', 'Q', [
    { m: 'прикла^д', lemma: 'приклад', pos: 'іменник', kind: 'lexeme', gloss: 'Розширена частина ложа гвинтівки…', ev: SUM('приклад', 'ПРИКЛА́Д а, ч. «Розширена частина ложа гвинтівки…»') },
    { m: 'при^клад', lemma: 'приклад', pos: 'іменник', kind: 'lexeme', gloss: 'Те, що варто наслідувати; зразок', ev: SUM('приклад', 'ПРИ́КЛАД у, ч. «Те, що варто наслідувати; зразок»') },
  ]),
  het('мука', 'Q', [
    { m: 'мука^', lemma: 'мука', pos: 'іменник', kind: 'lexeme', gloss: 'Те саме, що борошно.', ev: SUM('мука', 'МУКА́ и́, ж., розм. «Те саме, що бо́рошно 1.»') },
    { m: 'му^ка', lemma: 'мука', pos: 'іменник', kind: 'lexeme', gloss: 'Страждання, зумовлене фізичним болем…', ev: SUM('мука', 'МУ́КА и, ж. «Страждання, зумовлене фізичним болем…»') },
  ]),
  het('броня', 'Q', [
    { m: 'броня^', lemma: 'броня', pos: 'іменник', kind: 'lexeme', gloss: 'Металевий одяг для захисту тіла воїна (заст.)', ev: SUM('броня', 'БРОНЯ́ і́, ж. заст. «Металевий одяг для захисту тіла воїна»') },
    { m: 'бро^ня', lemma: 'броня', pos: 'іменник', kind: 'lexeme', gloss: 'Офіційне закріплення за ким-, чим-небудь пільгових прав…', ev: SUM('броня', 'БРО́НЯ і, ж. «Офіційне закріплення за ким-, чим-небудь пільгових прав…»') },
  ]),
  het('атлас', 'Q', [
    { m: 'атла^с', lemma: 'атлас', pos: 'іменник', kind: 'lexeme', gloss: 'Шовкова або напівшовкова тканина…', ev: SUM('атлас', 'АТЛА́С у, ч., текст. «Шовкова або напівшовкова тканина…»') },
    { m: 'а^тлас', lemma: 'атлас', pos: 'іменник', kind: 'lexeme', gloss: 'Збірник географічних… карт', ev: SUM('атлас', 'А́ТЛАС у, ч. «…збірник географічних… карт»') },
  ]),
  het('виходити', 'Q', [
    { m: 'вихо^дити', lemma: 'виходити', pos: 'дієслово', aspect: 'ipf', kind: 'aspect-partner', gloss: 'Іти звідки-небудь назовні… (недок. до вийти)', ev: SUM('виходити', 'ВИХО́ДИТИ «джу, диш, недок., ВИ́ЙТИ …; док.» «Іти звідки-небудь назовні…»') },
    { m: 'ви^ходити', lemma: 'виходити', pos: 'дієслово', aspect: 'pf', kind: 'aspect-partner', gloss: 'Див. вихо́джувати (виходжу́вати)', ev: SUM('виходити', 'ВИ́ХОДИТИ «Див. вихо́джувати 1.» and «Див. вихо́джувати 2.»') },
  ]),
  het('насипати', 'Q', [
    { m: 'насипа^ти', lemma: 'насипати', pos: 'дієслово', aspect: 'ipf', kind: 'aspect-partner', ev: SUM('насипати', 'НАСИПА́ТИ а́ю, а́єш, недок., НАСИ́ПАТИ, плю…; док.') },
    { m: 'наси^пати', lemma: 'насипати', pos: 'дієслово', aspect: 'pf', kind: 'aspect-partner', ev: SUM('насипати', 'НАСИ́ПАТИ «Див. насипа́ти 1.»') },
  ]),
  het('перевозити', 'Q', [
    { m: 'перевози^ти', lemma: 'перевозити', pos: 'дієслово', aspect: 'pf', kind: 'aspect-partner', gloss: 'Везучи, по черзі перемістити… усіх, багатьох…', ev: SUM('перевозити', 'ПЕРЕВОЗИ́ТИ ожу́, о́зиш, док. «Везучи, по черзі перемістити… усіх, багатьох…»') },
    { m: 'перево^зити', lemma: 'перевозити', pos: 'дієслово', aspect: 'ipf', kind: 'aspect-partner', gloss: 'Везучи, переправляти через що-небудь…', ev: SUM('перевозити', 'ПЕРЕВО́ЗИТИ о́жу, о́зиш, недок., ПЕРЕВЕЗТИ́ … «Везучи, переправляти через що-небудь…»') },
  ]),
]

/** uk.wikipedia «Омографи» pairs [P]: [stress A, gloss A, stress B, gloss B] in the order and wording of the list (research/25 §2a). */
const WP_PAIRS: [string, string | undefined, string, string | undefined][] = [
  ['а^бака', 'архітектурна деталь', 'абака^', 'рослина, волокно'], ['гла^дкий', 'рівний', 'гладки^й', 'повний, угодований'], ['го^род', 'місто', 'горо^д', 'сад'],
  ['гребі^нник', 'рослина', 'гребінни^к', 'майстер…'], ['гря^да', 'грядка', 'гряда^', 'пасмо'], ['де^рен', undefined, 'дере^н', undefined],
  ['за^пал', undefined, 'запа^л', undefined], ['зо^льник', undefined, 'зольни^к', undefined], ['ко^лос', 'суцвіття', 'коло^с', 'велет'],
  ['лу^па', undefined, 'лупа^', undefined], ['лю^фа', undefined, 'люфа^', undefined], ['наві^сний', undefined, 'навісни^й', undefined],
  ['наре^чений', 'названий', 'нарече^ний', 'жених'], ['ні^коли', 'наразі нема часу…', 'ніко^ли', 'за жодних обставин'], ['о^бруч', undefined, 'обру^ч', undefined],
  ['о^писка', undefined, 'опи^ска', undefined], ['о^чник', undefined, 'очни^к', undefined], ['па^хол', undefined, 'пахо^л', undefined],
  ['по^діл', undefined, 'поді^л', undefined], ['пра^вило', undefined, 'прави^ло', undefined], ['си^тник', undefined, 'ситни^к', undefined],
  ['сі^м\'я', 'насіння', 'сім\'я^', 'родина'], ['сі^яти', undefined, 'сія^ти', undefined], ['те^рен', undefined, 'тере^н', undefined],
  ['ті^пати', undefined, 'тіпа^ти', undefined], ['ко^пати', undefined, 'копа^ти', undefined], ['фа^нза', undefined, 'фанза^', undefined], ['ці^лик', undefined, 'ціли^к', undefined],
]
const wpReading = (m: string, gloss: string | undefined): R => {
  const s = st(m)
  return { m, lemma: s.form, gloss, kind: 'lexeme', ev: WIKI(gloss ? `${s.stressed} (${gloss})` : s.stressed) }
}
const FROM_WIKI: Heteronym[] = WP_PAIRS.map(([a, ga, b, gb]) => het(a, 'P', [wpReading(a, ga), wpReading(b, gb)]))
  .concat([het('руки', 'P', [
    { m: 'ру^ки', lemma: 'рука', kind: 'inflected-form', gloss: 'Н. мн.', ev: WIKI('ру́ки (Н. мн.) / руки́ (Р. одн.)') },
    { m: 'руки^', lemma: 'рука', kind: 'inflected-form', gloss: 'Р. одн.', ev: WIKI('ру́ки (Н. мн.) / руки́ (Р. одн.)') },
  ])])

export const HETERONYMS: Heteronym[] = [...VERIFIED, ...FROM_WIKI]
const BY_FORM = new Map(HETERONYMS.map(h => [h.form, h]))
/** HT-1/HT-2: the heteronym record for a spelling (stress and case ignored), or undefined. */
export const heteronymOf = (form: string): Heteronym | undefined => BY_FORM.get(heteronymKey(form))

/** HT-3: user-asserted contrasts without a dictionary source — shown as [U], never as a reading. */
export interface UnverifiedStress { form: string; asserted: string; status: 'U'; note: string; known: Evidence[] }
export const HT_UNVERIFIED: UnverifiedStress[] = [{
  form: 'послухатися', asserted: 'послуха́тися', status: 'U',
  note: 'Твердження користувача (U-26): «послухАтися (послушатися, послушання) ≠ послУхатися». У СУМ-20, СУМ-11 і Грінченка є лише послу́хатися (док. до слу́хатися); різницю «слухатися / слухати» несуть вид і префікс, а не наголос. Друге прочитання додається лише за джерелом від користувача.',
  known: [SUM('послухатися', 'ПОСЛУ́ХАТИСЯ «аюся, аєшся, кого, чого і без прям. дод.» / «Док. до слу́хатися 1, 2.»')],
}]
export const unverifiedOf = (form: string) => HT_UNVERIFIED.find(u => u.form === heteronymKey(form))

/** HT-2 annotator flag text. */
export const HETERONYM_FLAG = 'наголос розрізняє значення'
/** The stressed spellings of a heteronym, e.g. «за́мок / замо́к». */
export const stressedList = (h: Heteronym) => h.readings.map(r => r.stressed).join(' / ')
