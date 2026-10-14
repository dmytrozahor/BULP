/**
 * BL-14: intermediate stages of the new ikavism (о, е, ѣ > і) as a staged chain, and the dialect reflexes research/27 cites.
 * Everything here is a RECONSTRUCTION (P-1.7) except the entries of DIALECT_REFLEXES, each of which is a spelling a source prints.
 * «Львув» is a derived intermediate stage only; research/27 §3.2: "no dated Middle Ukrainian attestation of «Львув» was found" — never listed as attested.
 * Date caps (SHEV-62): jer fall 1050–1150; the south Ukrainian reflexes settled in the 16th–17th c., so any ü-stage ORTHOGRAPHIC claim earlier is [U].
 */
import { Q, P, type Evidence } from './evidence.ts'
import { originsFor } from './origin.ts'
import type { TraceStep } from './types.ts'

const S43 = 'розд. 43, http://litopys.org.ua/shevelov/shev06.htm', S62 = 'розд. 62, http://litopys.org.ua/shevelov/shev08.htm'
const ENC_IK = 'http://litopys.org.ua/ukrmova/um183.htm'
const WPI = 'https://uk.wikipedia.org/wiki/Ікавізм', WPN = 'https://uk.wikipedia.org/wiki/Назви_Львова'
const wuk = (title: string) => `https://uk.wikipedia.org/wiki/${title}`

export interface IkavStage { form: string; sound: string; note: string; evidence: Evidence; /** false for every stage: a stage is a reconstruction, not a spelling */ attested: false }
export interface IkavChain {
  src: 'о' | 'е' | 'ѣ'
  branch: 'south' | 'north'
  /** index of the changed vowel in every stage form */
  pos: number
  stages: IkavStage[]
  status: 'reconstruction'
  /** the Shevelov quote that the whole chain rests on */
  quote: Evidence
  /** date caps (SHEV-62) */
  dates: Evidence
}

const DATES = Q('SHEV', S62, 'Ці південноукраїнські риси защепилися в XVI ст. (або — щонайпізніше — в XVII ст.)', 'до XVI ст. написання з ü/у· — [U]')
const SOUTH_O = Q('SHEV', S43, 'Звужені (реалізовані з вищим піднесенням) o· та e· в новозакритих складах за інерцією ще більше наблизилися до і … та до u· > ü > і (у випадку о : sto·l > stu·l > stül > stil).')
const NORTH_O = Q('ENC', ENC_IK, 'через стадію дифтонгізації (*о > ō > уо, уи, уі, уе ... > і; *е > ē > іе > і) чи звуження цих голосних у монофтонги і делабіалізацію (*о, *е > ō, е > у, ÿ > і)')
const NORTH_O_WP = Q('WPUK', WPI, '[стогъ] → [стōг] → [стуог] → [стуиг] → [стуіг]… → [стіг]', 'підручникова реконструкція, не прив’язана до датованої пам’ятки')
const E_SOUTH = Q('SHEV', S62, 'у послідовних переходах е > е· > і чи (цього разу йдеться про процес, початок якому дала не внутріскладова акомодація) о > о· > и > ü > і')
const YAT = Q('SHEV', S43, '(у випадку e· : šе·st’ > šist’ ; те саме стосується й e·, посталого з ѣ)', 'звужений е· з ѣ наближується до і')
const YAT_NORTH = Q('WUK', wuk('Західнополіський_говір'), '[іе] (хміел’)', 'діалектний рефлекс ѣ під наголосом')

interface Def { sym: string; sound: string; note: string; ev: Evidence }
const def = (sym: string, sound: string, note: string, ev: Evidence): Def => ({ sym, sound, note, ev })

const CHAINS: Record<string, { branch: 'south' | 'north'; quote: Evidence; stages: Def[] }[]> = {
  о: [
    { branch: 'south', quote: SOUTH_O, stages: [
      def('о', 'o', 'давнє о', SOUTH_O), def('о·', 'oː', 'звужене, закрите о· (SHEV-62: «о· (а також о)»)', SOUTH_O),
      def('у', 'uː', 'u· — о· переходить в у· (stu·l); тут і виникає тип «Львув»: реконструйований проміжок, не пам’ятка', SOUTH_O),
      def('ü', 'y', 'ü — делабіалізація у· (stül); живе в говірках Закарпаття, Гуцульщини як ÿ', SOUTH_O), def('і', 'i', 'і (stil)', SOUTH_O)] },
    { branch: 'north', quote: NORTH_O, stages: [
      def('о', 'o', 'давнє о', NORTH_O), def('о·', 'oː', 'подовження ō після занепаду ъ/ь', NORTH_O),
      def('уо', 'u̯ɔ', 'дифтонг типу уо/ио (SHEV-62: «дифтонгів типу іе та ио»)', NORTH_O_WP), def('уі', 'u̯i', 'уі (стуіг)', NORTH_O_WP), def('і', 'i', 'і (стіг)', NORTH_O_WP)] },
  ],
  е: [
    { branch: 'south', quote: E_SOUTH, stages: [def('е', 'ɛ', 'давнє е', E_SOUTH), def('е·', 'eː', 'звужене е·', E_SOUTH), def('і', 'i', 'е· > і', E_SOUTH)] },
    { branch: 'north', quote: NORTH_O, stages: [def('е', 'ɛ', 'давнє е', NORTH_O), def('е·', 'eː', 'ē', NORTH_O), def('іе', 'i̯ɛ', 'дифтонг іе (піеч, діед)', NORTH_O), def('і', 'i', 'і', NORTH_O)] },
  ],
  ѣ: [
    { branch: 'south', quote: YAT, stages: [def('ѣ', 'ɛ̝ː', 'ѣ', YAT), def('е·', 'eː', 'ѣ > е· (звужений)', YAT), def('і', 'i', 'е· > і', YAT)] },
    { branch: 'north', quote: YAT_NORTH, stages: [def('ѣ', 'ɛ̝ː', 'ѣ', YAT_NORTH), def('іе', 'i̯ɛ', 'дифтонг іе (хміел’)', YAT_NORTH), def('і', 'i', 'і', YAT_NORTH)] },
  ],
}

/** The staged chains of one vowel change at index `pos` of `word` (the form with the OLD vowel in place: конь, львов, лѣс). */
export function ikavChains(word: string, pos: number, src: 'о' | 'е' | 'ѣ'): IkavChain[] {
  return (CHAINS[src] ?? []).map(c => ({
    src, branch: c.branch, pos, status: 'reconstruction' as const, quote: c.quote, dates: DATES,
    stages: c.stages.map((s): IkavStage => ({ form: word.slice(0, pos) + s.sym + word.slice(pos + 1), sound: s.sound, note: s.note, evidence: s.ev, attested: false })),
  }))
}

/** A trace step R10 / R09 → the chains for every vowel it changed (the step's from/to have the same length). */
export function chainsForStep(step: TraceStep): IkavChain[] {
  if (step.rule !== 'R10' && step.rule !== 'R09') return []
  const out: IkavChain[] = []
  for (let k = 0; k < Math.min(step.from.length, step.to.length); k++) {
    const a = step.from[k]!, b = step.to[k]!
    if (a === b) continue
    if ((b === 'і' || b === 'ї') && (a === 'о' || a === 'е' || a === 'ѣ')) out.push(...ikavChains(step.from, k, a))      // forward step
    else if ((a === 'і' || a === 'ї') && (b === 'о' || b === 'е' || b === 'ѣ')) out.push(...ikavChains(step.to, k, b))   // backward (reconstruction) step
  }
  return out
}

/** The chains for a modern word, from the origin of its і (core/origin.ts: attested old spelling's trace, else a paradigm alternation). */
export function chainsForWord(word: string, ctx: { paradigm?: string[]; oldForms?: string[] } = {}): IkavChain[] {
  const { origins } = originsFor(word, ctx), w = word.toLowerCase(), cap = word[0] !== w[0]
  const out: IkavChain[] = []
  origins.forEach((o, k) => {
    if (!o || (o.rule !== 'R10' && o.rule !== 'R09')) return
    const src = o.src as 'о' | 'е' | 'ѣ', old = w.slice(0, k) + src + w.slice(k + 1)
    const chains = ikavChains(cap ? old[0]!.toUpperCase() + old.slice(1) : old, k, src)
    out.push(...chains)
  })
  return out
}

export interface DialectReflex {
  /** the standard lemma it corresponds to */ std: string
  form: string
  regions: string[]
  /** dialect = living pronunciation recorded in a description; orthography = a written convention (Maksymovych/Galician); chancery = a dated MS spelling */
  kind: 'dialect' | 'orthography' | 'chancery'
  evidence: Evidence
}
const r = (std: string, form: string, regions: string[], kind: DialectReflex['kind'], evidence: Evidence): DialectReflex => ({ std, form, regions, kind, evidence })
const WPL_MONO = Q('WUK', wuk('Західнополіський_говір'), 'здебільшого монофтонги [у], [и], [і], [іи] (кун’, вул, кин’, вил, кіин’, віил, кін’, віл та ін.)')
const WPL_DIPH = Q('WUK', wuk('Західнополіський_говір'), 'зустрічаються ще й дифтонги [уо], [уе], [уі], (вуол, муой, вуел, муей, вуіл, куін’ та ін.)')
const WPL_IE = Q('WUK', wuk('Західнополіський_говір'), 'під наголосом зустрічається ще й дифтонг [іе] чи [ие] (с\'и́ено, л\'іес, т\'и́есто та ін.)')
const ZAK_O = Q('WUK', wuk('Закарпатський_говір'), 'Континуанти етимологічного «о» в новозакритих складах: «у» в східних та західних говорах «вус „віз“», «ÿ» в центральних «вÿс»')
const ZAK_E = Q('WUK', wuk('Закарпатський_говір'), 'у складах, після яких занепав давній «ъ», виступають ‘у, ‘ÿ «мн\'ут „мед“, т’ýтка, прин’ýс, привйýх „привів“; мн’ÿт, т’ÿтка, прин’ÿс, привÿх»')
const HUT = Q('WUK', wuk('Гуцульський_говір'), 'також и, ы, у, ÿ на місці етимологічного [о] в нових закритих складах: вин, вын, вун — ‘він’; виз, вуз — ‘віз’; мист, мÿист — ‘міст’')
const CHN = Q('WUK', wuk('Східнополіський_говір'), 'Дифтонги на місці старих «о», «е», «ě» (вуол, піеч, діед)')
const MPL = Q('WUK', wuk('Середньополіський_говір'), 'ê розвинулося на місці о в новозакритих складах після зміни першого компонента дифтонга: порвêг (поріг), стêл і ствêл (стіл), лопухвêв (лопухів), а також з е: с’êм (сім)')
const LEM = Q('WUK', wuk('Лемківський_говір'), 'Розвиток давнього [е] в [у], [ў], що відповідають літературному [і] (вечўр ‘вечір’, т\'утка ‘тітка’)')
const ORTH = Q('WPUK', WPI, '[i] від [o] та від [e] — як о і е з «дашком» (мôй, жалôбно, ôнъ, матêрью)', 'Графіка: Максимовичева/галицька етимологічна орфографія, XIX ст.')
const LVIV_O = Q('WPUK', WPN, 'Фонетично старішою є «неікана» форма Львовъ; етимологічним правописом давня форма і новітнє звучання поєднувались у написанні Львôвъ.')
const ILVOV = Q('WPUK', WPN, 'воєводі Илвовскомъ (1371); мѣстьчяны Илвовского мѣста, до Илвова (1407)… Ця форма збереглася до сьогодні в західноукраїнських говорах, що зафіксовано у словнику Желехівського (стор. 322).')

/** Only spellings a fetched source prints (research/27 §3.2). Order = display order. */
export const DIALECT_REFLEXES: DialectReflex[] = [
  r('кінь', 'кун’', ['WPL'], 'dialect', WPL_MONO), r('кінь', 'кин’', ['WPL'], 'dialect', WPL_MONO), r('кінь', 'кіин’', ['WPL'], 'dialect', WPL_MONO), r('кінь', 'куін’', ['WPL'], 'dialect', WPL_DIPH),
  r('віл', 'вул', ['WPL'], 'dialect', WPL_MONO), r('віл', 'вил', ['WPL'], 'dialect', WPL_MONO), r('віл', 'віил', ['WPL'], 'dialect', WPL_MONO),
  r('віл', 'вуол', ['WPL', 'CHN'], 'dialect', WPL_DIPH), r('віл', 'вуіл', ['WPL'], 'dialect', WPL_DIPH),
  r('віз', 'вус', ['ZAK'], 'dialect', ZAK_O), r('віз', 'вÿс', ['ZAK'], 'dialect', ZAK_O), r('віз', 'виз', ['HUT'], 'dialect', HUT), r('віз', 'вуз', ['HUT'], 'dialect', HUT),
  r('він', 'вин', ['HUT'], 'dialect', HUT), r('він', 'вын', ['HUT'], 'dialect', HUT), r('він', 'вун', ['HUT'], 'dialect', HUT),
  r('міст', 'мист', ['HUT'], 'dialect', HUT), r('міст', 'мÿист', ['HUT'], 'dialect', HUT),
  r('поріг', 'порвêг', ['MPL'], 'dialect', MPL), r('стіл', 'стêл', ['MPL'], 'dialect', MPL), r('стіл', 'ствêл', ['MPL'], 'dialect', MPL), r('сім', 'с’êм', ['MPL'], 'dialect', MPL),
  r('ніс', 'n’us', ['SIAN'], 'dialect', Q('SHEV', S62, 'уживанням ’u як рефлекса е, якщо далі первісно йшов склад зі слабким ъ (n’us ’ніс’ чол. рід мин. часу — при тому, що альтернатом о виступає i!)', 'ніс (мин. час ч. р.) < несъ; запис Шевельова латинкою')),
  r('приніс', 'прин’ýс', ['ZAK'], 'dialect', ZAK_E), r('приніс', 'прин’ÿс', ['ZAK'], 'dialect', ZAK_E), r('тітка', 'т’ýтка', ['ZAK'], 'dialect', ZAK_E), r('тітка', 'т’ÿтка', ['ZAK'], 'dialect', ZAK_E),
  r('тітка', 'т\'утка', ['LEM'], 'dialect', LEM), r('вечір', 'вечўр', ['LEM'], 'dialect', LEM),
  r('піч', 'піеч', ['CHN'], 'dialect', CHN), r('дід', 'діед', ['CHN'], 'dialect', CHN),
  r('ліс', 'л\'іес', ['WPL'], 'dialect', WPL_IE), r('сіно', 'с\'и́ено', ['WPL'], 'dialect', WPL_IE), r('тісто', 'т\'и́есто', ['WPL'], 'dialect', WPL_IE),
  r('Львів', 'Львôвъ', ['GAL'], 'orthography', LVIV_O), r('Львів', 'Илвов', ['WPL', 'GAL'], 'chancery', ILVOV),
]
// not an array entry on purpose: research/27 §3.2 — no dated attestation of «Львув» was found; it exists only as a stage of ikavChains().
export const NOT_ATTESTED: Record<string, Evidence> = {
  'Львув': P('WPUK', WPN, 'Фонетично старішою є «неікана» форма Львовъ; етимологічним правописом давня форма і новітнє звучання поєднувались у написанні Львôвъ.', 'research/27 §3.2: у джерелах SHEV-29/43/57/62 та «Назви Львова» форми «Львув» немає; лише реконструйований проміжок о > у· > ü > і'),
}

export const dialectReflexes = (lemma: string): DialectReflex[] => DIALECT_REFLEXES.filter(x => x.std.toLowerCase() === lemma.toLowerCase())
export const isAttestedSpelling = (form: string) => !(form in NOT_ATTESTED) && DIALECT_REFLEXES.some(x => x.form === form)
