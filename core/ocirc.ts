/**
 * SPEC 63 OR (research/36): the possible readings of the etymological letters ô / ê (Maksymovych-type orthography, пôшовъ 1884).
 * Every reading below is tied to a verbatim source; a reading with no source is NOT listed (NOT_EVIDENCED states what was searched and not found).
 * The letter ô is a SPELLING convention («ô = [і]», ЕУМ «Максимовичівка»); the other readings are what the same old о became in living dialects
 * and in the intermediate stages of the new ikavism — so for a given text they are POSSIBILITIES (which one the writer meant is unknown unless the author says).
 * IPA is derived (P-1.7): our reading of the cited letter, never a dictionary value.
 */
import { P, Q, type Evidence } from './evidence.ts'
import { fold } from './orthography.ts'
import { toIpa } from './ipa.ts'
import { ikavChains, type IkavChain } from './ikavism.ts'

const UM = (n: number) => `http://litopys.org.ua/ukrmova/um${n}.htm`
const S43 = 'розд. 43, http://litopys.org.ua/shevelov/shev06.htm', S62 = 'розд. 62, http://litopys.org.ua/shevelov/shev08.htm'
const wuk = (t: string) => `https://uk.wikipedia.org/wiki/${t}`

const MAX = Q('ENC', UM(43), 'запроваджувалися позначення голосного і етимол. літерами ô, ê, û, î з діакритичним знаком (вôнъ, мêдь, добрû, синîй)', 'ЕУМ, «Максимовичівка» (um43): літера ô = голосний [і]')
const GAL = Q('WPUK', wuk('Ікавізм'), '[i] від [o] та від [e] — як о і е з «дашком» (мôй, жалôбно, ôнъ, матêрью)', 'WP «Ікавізм», розділ «Графіка»: максимовичева/галицька етимологічна орфографія, XIX ст.')
const ZAK_O = Q('ENC', UM(162), 'Континуанти етимологічного [о] в новозакритих складах: [у] в сx. та зх. говорах [вус «віз»], [ÿ] в центральних [вÿс]. У крайніх пн. говорах, перехідних до бойківських, [о] в новозакритих складах перейшов в [і] [віс].', 'ЕУМ, «Закарпатський говір» (um162), фонет. особливості п.5')
const ZAK_Y = Q('ENC', UM(162), 'У деяких говірках в позиції перед у фонема [і] < [Ђ] переходить в [ÿ] (лабіалізований і)', 'ЕУМ, «Закарпатський говір» (um162), фонет. особливості п.3: значення літери ÿ')
const HUT = Q('WUK', wuk('Гуцульський_говір'), 'також и, ы, у, ÿ на місці етимологічного [о] в нових закритих складах: вин, вын, вун — ‘він’; виз, вуз — ‘віз’; мист, мÿист — ‘міст’', 'WP «Гуцульський говір»')
const WPL_MONO = Q('WUK', wuk('Західнополіський_говір'), 'здебільшого монофтонги [у], [и], [і], [іи] (кун’, вул, кин’, вил, кіин’, віил, кін’, віл та ін.)', 'WP «Західнополіський говір»')
const WPL_DIPH = Q('WUK', wuk('Західнополіський_говір'), 'зустрічаються ще й дифтонги [уо], [уе], [уі], (вуол, муой, вуел, муей, вуіл, куін’ та ін.)', 'WP «Західнополіський говір»')
const WPL_UE = Q('SHEV', S62, 'а звука о за тих самих умов — як ü, і, у або u залежно від місцевості', 'Шевельов, ІФУМ, розд. 62: західне Полісся, живий проміжний рефлекс ü')
const CHN = Q('WUK', wuk('Східнополіський_говір'), 'Дифтонги на місці старих «о», «е», «ě» (вуол, піеч, діед)', 'WP «Східнополіський говір», п.1')
const STAGE = Q('SHEV', S43, 'до u· > ü > і (у випадку о : sto·l > stu·l > stül > stil)', 'Шевельов, ІФУМ, розд. 43: ПРОМІЖНА СТАДІЯ (реконструкція), не запис')
const DATE = Q('SHEV', S62, 'Ці південноукраїнські риси защепилися в XVI ст. (або — щонайпізніше — в XVII ст.)', 'Шевельов, ІФУМ, розд. 62: датування')
const ZAK_E = Q('ENC', UM(162), 'у складах, після яких занепав давній [ъ], виступають ‘у, ‘ÿ [мн’ут «мед», т’ýтка, прин’ýс, привйýх «привів»; мн’ÿт, т’ÿтка, прин’ÿс, привÿх]', 'ЕУМ, «Закарпатський говір» (um162), п.4: рефлекс е, а не о')
const LEM_E = Q('WUK', wuk('Лемківський_говір'), 'Розвиток давнього [е] в [у], [ў], що відповідають літературному [і] (вечўр ‘вечір’, т\'утка ‘тітка’)', 'WP «Лемківський говір»')
const CHN_E = Q('WUK', wuk('Східнополіський_говір'), 'піеч, діед', 'WP «Східнополіський говір», п.1: дифтонг на місці е/ě')
const MPL = Q('WUK', wuk('Середньополіський_говір'), 'ê розвинулося на місці о в новозакритих складах після зміни першого компонента дифтонга: порвêг (поріг), стêл і ствêл (стіл), лопухвêв (лопухів), а також з е: с’êм (сім)', 'WP «Середньополіський говір»: ê/ô там — фонетична транскрипція')
const WPL_E = Q('WUK', wuk('Західнополіський_говір'), 'під наголосом зустрічається ще й дифтонг [іе] чи [ие] (с\'и́ено, л\'іес, т\'и́есто та ін.)', 'WP «Західнополіський говір»')

export type CircLetter = 'ô' | 'ê'
export interface CircReading {
  id: string
  letter: CircLetter
  /** the letters that stand for the reading in a modern-letter spelling (ü = rounded [y], ŭ = diphthong [u̯ɔ] are reading-only symbols of core/ipa.ts) */
  sub: string
  /** how the reading is written in the sources */
  sound: string
  label: string
  /** dialect codes (core/ipa.ts IPA_DIALECTS) or GAL = Galician/Maksymovych orthography */
  regions: string[]
  period: string
  /** orthography = what the letter MEANS in a printing tradition; dialect = recorded living pronunciation; stage = reconstructed intermediate (never an attestation) */
  kind: 'orthography' | 'dialect' | 'stage'
  evidence: Evidence[]
}
const R = (id: string, letter: CircLetter, sub: string, sound: string, label: string, regions: string[], period: string, kind: CircReading['kind'], evidence: Evidence[]): CircReading =>
  ({ id, letter, sub, sound, label, regions, period, kind, evidence })

export const CIRC_READINGS: CircReading[] = [
  R('O-I', 'ô', 'і', '[і]', 'орфографічне значення літери: ô = і', ['GAL'], 'правопис XIX ст. (Максимович 1827/1841)', 'orthography', [MAX, GAL]),
  R('O-I-ZAK', 'ô', 'і', '[і]', 'говірка: о > і (віс)', ['ZAK'], 'описи говорів (ЕУМ 2000)', 'dialect', [ZAK_O]),
  R('O-U', 'ô', 'у', '[у]', 'монофтонг у (вус, вуз, кун’, вул)', ['ZAK', 'HUT', 'WPL'], 'описи говорів (ЕУМ 2000; WP)', 'dialect', [ZAK_O, HUT, WPL_MONO]),
  R('O-Y', 'ô', 'ü', '[ÿ] = ü', 'огублений передній (лабіалізований і): вÿс, мÿист', ['ZAK', 'HUT', 'WPL'], 'описи говорів; проміжна стадія XVI–XVII ст. (SHEV-43, SHEV-62)', 'dialect', [ZAK_O, ZAK_Y, HUT, WPL_UE]),
  R('O-UO', 'ô', 'ŭ', '[уо]', 'дифтонг уо/уі: вуол, куін’', ['WPL', 'CHN', 'WPL-N'], 'описи говорів (WP)', 'dialect', [WPL_DIPH, CHN]),
  R('O-IH', 'ô', 'и', '[и]', 'и: вин, виз, кин’', ['HUT', 'WPL'], 'описи говорів (WP)', 'dialect', [HUT, WPL_MONO]),
  R('O-YH', 'ô', 'ы', '[ы]', 'ы: вын', ['HUT'], 'описи говорів (WP)', 'dialect', [HUT]),
  R('E-I', 'ê', 'і', '[і]', 'орфографічне значення літери: ê = і', ['GAL'], 'правопис XIX ст. (Максимович 1827/1841)', 'orthography', [MAX, GAL]),
  R('E-IE', 'ê', 'іе', '[іе]', 'дифтонг іе: піеч, л’іес', ['CHN', 'MPL', 'WPL-N'], 'описи говорів (WP)', 'dialect', [CHN_E, WPL_E]),
  // an e-reflex ‘у after a soft consonant is the one place where a «ю»-type sound is evidenced; the source says it only for е, not for о
  R('E-JU', 'ê', 'ю', '[ʲу] (після м’якого: т’ут-)', 'е > ‘у / ‘ÿ після м’якого, тільки перед складом із занепалим ъ (т’ýтка, прин’ýс)', ['ZAK', 'SIAN', 'LEM'], 'описи говорів (ЕУМ 2000; WP)', 'dialect', [ZAK_E, LEM_E]),
]

/** Readings searched for and NOT found for ô (SPEC 00: no source = unknown). */
export const NOT_EVIDENCED: { sound: string; letter: CircLetter; why: Evidence }[] = [
  { sound: 'ю', letter: 'ô', why: P('SHEV', S62, 'Для о в новозакритому складі джерела (ЕУМ um162, Шевельов розд. 43 і 62, WP) називають лише і, у, ÿ/ü, и, ы, уо/уі; [ʲу] («ю») названо тільки як рефлекс е після м’якого (т’ýтка)', 'research/36 §3: читання ô як [ю] не засвідчено; написання «грошювь» у давньоруських пам’ятках — це запис о, а не читання літери ô') },
]

const PH = '\u0001'
/** ô/ê as precomposed letters or o/e + U+0302 (Latin or Cyrillic base) */
const MARK = /[oeоеOEОЕ]̂/g
export const hasCirc = (s: string): boolean => /[oeоеOEОЕ]̂/.test(s.normalize('NFD'))
export const circLetters = (s: string): CircLetter[] => [...s.normalize('NFD').matchAll(MARK)].map(m => /[oOоО]/.test(m[0]) ? 'ô' : 'ê')
/** normalise every spelling of the letters to the precomposed Latin ô / ê (NFD of ô is o + U+0302, so the result is kept decomposed-free by explicit replace) */
const mask = (s: string): string => s.normalize('NFD').replace(/[oOоО]̂/g, 'ô').replace(/[eEеЕ]̂/g, 'ê')

/** the spelling in modern letters with every ô/ê replaced by `sub` (the other Maksymovych folds applied: ѣ, ъ, ы, ё …) */
export function renderReading(spelling: string, letter: CircLetter, sub: string): string {
  const w = mask(spelling).replace(letter === 'ô' ? /ô/g : /ê/g, PH)
  const f = fold(w.toLowerCase(), 'максимовичівка')[0]!.form
  return f.split(PH).join(sub)
}

export interface CircReadingView extends CircReading { form: string; ipa: string | null }
/** «можливі читання»: the readings of every ô/ê letter the spelling has, each with the spelling it implies and its derived IPA */
export function readingsOf(spelling: string): CircReadingView[] {
  const have = new Set(circLetters(spelling))
  return CIRC_READINGS.filter(r => have.has(r.letter)).map(r => {
    const form = renderReading(spelling, r.letter, r.sub)
    let ipa: string | null = null
    try { ipa = toIpa(form).ipa } catch { ipa = null }
    return { ...r, form, ipa }
  })
}

/** OR-3: the ô as a marked etymological о and the chains (BL-14) to the attested reflexes; ê likewise from е. First marked letter only. */
export function circBranches(spelling: string): { letter: CircLetter; word: string; chains: IkavChain[] } | undefined {
  const m = mask(spelling), i = m.search(/[ôê]/)
  if (i < 0) return undefined
  const letter = m[i]! as CircLetter
  const f = fold(m.replace(/[ôê]/g, c => c === letter ? PH : c).toLowerCase(), 'максимовичівка')[0]!.form
  const pos = f.indexOf(PH)
  if (pos < 0) return undefined
  const src = letter === 'ô' ? 'о' : 'е'
  const word = f.split(PH).join(src)
  return { letter, word, chains: ikavChains(word, pos, src) }
}
export { DATE as CIRC_DATES, STAGE as CIRC_STAGE, MPL as CIRC_MPL_TRANSCRIPTION }
