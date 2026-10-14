/**
 * SPEC 63 LA — adaptation of foreign (mostly English/Latin) words in Ukrainian. Pure: no node or DOM imports.
 * A token is peeled suffix by suffix with the cited rules below; each rule = Ukrainian ending → source-language ending → adaptation route.
 * No rule without a source, a verbatim quote and a locator (SPEC 00); nothing here is a hand list of words (research/34).
 * The stem is NOT reverse-transliterated (no cited table for that): the source word is given as «stem… + source suffixes».
 */
import { claim, P, Q, type Claim, type Evidence } from './evidence.ts'
import { key } from './text.ts'

/** latin = Latin/German route (-ітет), direct-en = English suffix taken over (-іті), graphic = spelling-based (-абіл-), phonetic = pronunciation-based (-ейбіл-) */
export type LoanRoute = 'phonetic' | 'graphic' | 'latin' | 'direct-en'
export const ROUTE_UK: Record<LoanRoute, string> = { phonetic: 'фонетичне (за вимовою)', graphic: 'графічне (за написанням)', latin: 'латинський (німецький) шлях', 'direct-en': 'пряме з англійської' }
const ROUTE_RANK: LoanRoute[] = ['phonetic', 'graphic', 'latin', 'direct-en']

export interface LoanRule { id: string; re: RegExp; uk: string; src: string; route: LoanRoute; ev: Evidence[] }

const PR = (n: number) => `https://slovnyk.ua/pravopys.php?prav_ver=2019&prav_par=${n}`
const W = (t: string) => `https://en.wiktionary.org/wiki/${t}`
const NOUN = '(?:а|у|ові|ом|і|ів|ам|ами|ах|е)?'
const ADJ = '(?:ий|а|е|і|ого|ому|им|ої|ою|их|ими)?'

export const LOAN_RULES: LoanRule[] = [
  { id: 'LA-itet', re: new RegExp(`^(.{2,})[іи]тет${NOUN}$`), uk: '-ітет/-итет', src: '-ity (лат. -itas, нім. -ität)', route: 'latin', ev: [
    Q('EWIKT', W('університет'), 'Borrowed from German Universität, from Latin ūniversitās, ūniversitātis.', 'приклад: -ітет ← нім. -ität ← лат. -itās'),
    Q('EWIKT', W('-ity'), 'from Old French -ite, -ete, -eteit (“-ity”), from Latin -itātem, from -itās', 'англ. -ity — того самого латинського походження') ] },
  { id: 'LA-iti', re: /^(.{3,})іті$/, uk: '-іті', src: '-ity', route: 'direct-en', ev: [
    Q('EWIKT', W('-ity'), '(Received Pronunciation) IPA(key): /əti/, /ɪti/', 'вимова англ. -ity: кінцевий [i]'),
    Q('PRAV', PR(129), 'Після приголосних у кінці слова: візаві, віскі, журі, колібрі, мерсі, парі, попурі, суші, таксі, харакірі, шасі', '§ 129, I.5 (наголосові позначки прибрано): кінцевий [i] після приголосного пишемо і') ] },
  { id: 'LA-acija', re: new RegExp(`^(.{2,})ац(?:ія|ії|ію|ією|іям|іями|іях|ій)$`), uk: '-ація', src: '-ation / -atio', route: 'latin', ev: [
    Q('EWIKT', W('-ація'), 'From Latin -ātiō, an alternative form of -tiō.') ] },
  { id: 'LA-izm', re: new RegExp(`^(.{2,})[іи]зм${NOUN}$`), uk: '-ізм', src: '-ism (фр. -isme)', route: 'latin', ev: [
    Q('EWIKT', W('-ізм'), 'Borrowed from French -isme.') ] },
  { id: 'LA-ichn', re: new RegExp(`^(.{2,})[иії]чн${ADJ}$`), uk: '-ичн-/-ічн-/-їчн-', src: '-ic', route: 'graphic', ev: [
    Q('PRAV', PR(33), 'Після букв д, т, з, с, ц, ж, ч, ш, р у прикметниках, утворених від основ іншомовного походження, пишемо похідний суфікс -ичн- (ий)', '§ 33, п. 2'),
    Q('EWIKT', W('-ичний'), 'The vast majority of adjectives ending in -ичний (-yčnyj) are based on foreign roots, and are often parallel to foreign terms ending in English -ic') ] },
  { id: 'LA-abelnist', re: /^(.{2,})абельн(?:ість|ості|істю|істі)$/, uk: '-абельність', src: '-ability', route: 'graphic', ev: [
    Q('EWIKT', W('-ability'), 'From Middle English -ablete, -iblete, -abilite, -ibilite, from Middle French -ableté, -ibleté, -abilité, -ibilité, from Latin -abilitas, -ibilitas', 'графічне: латинське -abil- зберігає букви') ] },
  { id: 'LA-abeln', re: new RegExp(`^(.{2,})абельн${ADJ}$`), uk: '-абельн-', src: '-able (лат. -ābilis)', route: 'graphic', ev: [
    Q('EWIKT', W('-able'), 'Inherited from Middle English -able, borrowed from Old French -able, from Latin -ābilis') ] },
  { id: 'LA-ejbil', re: /^(.{2,})ейбіл$/, uk: '-ейбіл-', src: '-abil- (-able, прочитане як слово able)', route: 'phonetic', ev: [
    Q('PRAV', PR(133), 'Англійські дифтонги [au], [ei], [ou] звичайно передаємо, імітуючи їхнє звучання в мові оригіналу, через ау, ей, оу', '§ 133: [eɪ] → ей'),
    P('EWIKT', W('-able'), 'Finally, due to probable confusion with the word able, it was used to form adjectives from all sorts of verbs', '-able зближується зі словом able [eɪbl]; цитата — лише про це зближення') ] },
  { id: 'LA-abil', re: /^(.{2,})абіл$/, uk: '-абіл-', src: '-abil- (лат. -abilis)', route: 'graphic', ev: [
    Q('EWIKT', W('-ity'), 'Final -ble changes to -bil before this suffix due to its Latin origin; compare, for example, noble and nobility.'),
    Q('PRAV', PR(134), 'Англійський звук [æ], якому на письмі відповідає англійська буква а, звичайно передаємо українською буквою а', '§ 134: за буквою, а не за вимовою [ə]') ] },
]
export const LOAN_RULE_IDS = LOAN_RULES.map(r => r.id)
export const ruleById = (id: string) => LOAN_RULES.find(r => r.id === id)

export interface LoanStepOut { id: string; matched: string; uk: string; src: string; route: LoanRoute; claim: Claim<string> }
/** vesum lookup: string = tag line (present), null = checked and absent, undefined = not checked */
export type VesumLookup = (w: string) => string | null | undefined
/** a dictionary row giving a standard equivalent: only these produce an «equivalent» */
export interface LoanEquiv { w: string; eq: string; source: string; loc: string; quote: string }
export interface LoanStatus { vesum: 'present' | 'absent' | 'unchecked'; tags?: string; pravopys: { rule: string; loc: string }[] }
export interface LoanAnalysis {
  word: string; stem: string
  /** «stem… + source suffixes»: the stem is left in Ukrainian script (no cited reverse table) */
  source: string
  route: LoanRoute; routes: LoanRoute[]
  steps: LoanStepOut[]
  status: LoanStatus
  equivalent?: Claim<string>
}

/** Peel the word with the rules (outermost suffix first); null = no rule fires (then nothing is shown). */
export function analyzeLoan(word: string, opts: { vesum?: VesumLookup; equivalents?: LoanEquiv[] } = {}): LoanAnalysis | null {
  const w = key(word)
  let rest = w
  const steps: LoanStepOut[] = []
  for (let guard = 0; guard < 3; guard++) {
    const rule = LOAN_RULES.find(r => r.re.test(rest))
    if (!rule) break
    const m = rule.re.exec(rest)!
    steps.push({ id: rule.id, matched: rest.slice(m[1]!.length), uk: rule.uk, src: rule.src, route: rule.route, claim: claim(rule.id, rule.ev, { method: 'core/loan-adapt: суфікс за цитованим правилом' }) })
    rest = m[1]!
  }
  if (!steps.length) return null
  const routes = ROUTE_RANK.filter(r => steps.some(s => s.route === r))
  const v = opts.vesum?.(w)
  const pravopys = steps.flatMap(s => ruleById(s.id)!.ev.filter(e => e.source === 'PRAV').map(e => ({ rule: s.id, loc: e.locator })))
  const eq = opts.equivalents?.find(e => key(e.w) === w)
  return {
    word: w, stem: rest, source: `${rest}… + -${[...steps].reverse().map(s => s.src.replace(/ \(.*$/, '').replace(/^-|-$/g, '')).join('-')}`,
    route: routes[0]!, routes, steps,
    status: { vesum: v === undefined ? 'unchecked' : v === null ? 'absent' : 'present', ...(v ? { tags: v } : {}), pravopys },
    equivalent: eq ? claim(eq.eq, Q(eq.source, eq.loc, eq.quote)) : undefined,
  }
}
