/**
 * Loanword source-language paths (SPEC 60 LW-1…LW-3; user U-27 «екстремі-ті (extremity), екстремі-тет (German Extremität) … derive other rules
 * to determine which forms are foreign»), research/26.
 *
 * > "There is no Правопис 2019 rule that says '-ітет = German' … The donor/intermediary language has to be inferred from (a) the suffix/ending,
 * >  (b) the spelling pattern, (c) phonetic residue of the donor — and then validated against etymology labels" — research/26 §0
 * > "На польське походження слова вказують такі ознаки: … Суфікс -унок: малюнок, подарунок, поцілунок, рисунок, стосунок" — uk.wikipedia «Полонізм»
 * > "Для запозичень з англійської мови характерні: … суфікс -инг (-інг): мітинг, пудинг, демпінг, тюбінг." — uk.wikipedia «Англіцизм»
 *
 * Rule table (data, P-4.2): each row has a pattern, a donor/intermediary hypothesis, en.wiktionary validation counts (`per`: lemmas matching the
 * pattern per donor category, 3 246 single-donor lemmas, R26 §3, §5) and a weight class. **Only class A rows (≥ 90 % one donor, n ≥ 10: -інг→en,
 * -унок→pl, -дло→pl, -аж→fr) may produce a Claim** (method `LOAN-<id>`, P-1.7: inferred, never a dictionary fact); B/C/N rows are hints. The
 * naive-Bayes classifier over the same counts is shown only as ranked hypotheses with its measured cross-validated accuracy (LOAN_CV: top-1 37 %,
 * top-2 53 %, 5-fold, n = 3 116, baseline 20 %), never as a statement. A donor label from Wiktionary (CC BY-SA, D-evidence) overrides the rules; a
 * disagreement between a rule and a label is reported (`conflict`), not resolved. Without a label the rules alone speak.
 * U-27: -ітет (Latin -itas via German/Polish/Russian, the form does not say which) and -іті (English -ity transliteration, inference from Правопис
 * § 129) are different outputs of one Latin suffix; an unattested form such as екстремітет gets a hypothesis only.
 */
import { claim, D, P, Q, type Claim, type Evidence } from './evidence.ts'

export type Donor = 'pl' | 'de' | 'en' | 'fr' | 'la' | 'ru' | 'tr' | 'it' | 'grc' | 'cu' | 'nl' | 'hu'
export const DONOR_UK: Record<Donor, string> = {
  pl: 'польська', de: 'німецька', en: 'англійська', fr: 'французька', la: 'латинська', ru: 'російська', tr: 'тюркські', it: 'італійська',
  grc: 'давньогрецька', cu: 'церковнослов’янська', nl: 'нідерландська', hu: 'угорська',
}
/** Size of each Wiktionary donor category among the 3 246 lemmas (R26 §1, §5): the Bayes denominators. */
export const DONOR_N: Record<Donor, number> = { pl: 609, de: 431, en: 506, fr: 690, la: 298, ru: 331, tr: 121, it: 77, grc: 163, cu: 121, nl: 22, hu: 17 }
/** Measured accuracy of the full 93-feature classifier (R26 §0, §4.3): 5-fold CV over 3 116 single-donor lemmas. */
export const LOAN_CV = { top1: 0.37, top2: 0.53, baseline: 0.20, n: 3116, folds: 5, features: 93,
  recall: { pl: 0.64, fr: 0.57, en: 0.38, la: 0.38, tr: 0.29, de: 0.19, it: 0.07, grc: 0.08, cu: 0.08, ru: 0.02 } as Partial<Record<Donor, number>> }
export const LOAN_CV_NOTE = `Класифікатор правил: точність за крос-валідацією ${Math.round(LOAN_CV.top1 * 100)} % (перший кандидат) і ${Math.round(LOAN_CV.top2 * 100)} % (два кандидати), ` +
  `${LOAN_CV.folds} частин, n = ${LOAN_CV.n} лем із міткою Вікісловника, базова лінія ${Math.round(LOAN_CV.baseline * 100)} %. Це гіпотеза, а не твердження.`

export type Weight = 'A' | 'B' | 'C' | 'N'
export interface LoanRule {
  id: string
  pattern: RegExp
  label: string
  /** ultimate source, when the rule says so (la for -itas) */
  ultimate?: Donor
  /** donor(s) / intermediaries the pattern points to (the form often cannot choose between them) */
  via: Donor[]
  path: string
  weight: Weight
  /** lemmas matching the pattern per Wiktionary donor category, and the total (R26 §3.1/3.2) */
  per: Partial<Record<Donor, number>>
  total: number
  /** native words that match the pattern but are not loans (R26 §3: the `*` rows) */
  except?: string[]
  /** the pattern fires on many native words: it never counts toward the foreign gate on its own */
  nativeProne?: boolean
  examples: string[]
  cite: Evidence
  note?: string
}
const WP = (page: string, quote: string) => Q('WPUK', `https://uk.wikipedia.org/wiki/${page}`, quote)
const PR = (par: number, quote: string) => Q('PRAV', `https://slovnyk.ua/pravopys.php?prav_par=${par} (§ ${par})`, quote)
const WK = (entry: string, quote: string) => Q('WKEN', `https://en.wiktionary.org/wiki/${encodeURIComponent(entry)}`, quote)
const CATS = (what: string) => P('WKEN', 'en.wiktionary Category:Ukrainian terms borrowed from {Polish, German, English, French, Latin, Russian, Turkish, …} (research/26 §5)', what, 'шаблон ознаки виведено з міток Вікісловника')

export const LOAN_RULES: LoanRule[] = [
  // ── A: near-deterministic (claims) ──────────────────────────────────────────────────────────────
  { id: 'L-S07', pattern: /[а-яіїєґ]{2,}[іи]нг$/, label: '-інг/-инг', via: ['en'], path: 'англ. -ing (пряме, нове запозичення)', weight: 'A', per: { en: 26 }, total: 26,
    examples: ['маркетинг', 'мітинг', 'брифінг', 'кейтеринг', 'аутсорсинг'], cite: WP('Англіцизм', 'суфікс -инг (-інг): мітинг, пудинг, демпінг, тюбінг') },
  { id: 'L-S06', pattern: /[а-яіїєґ]{2}унок$/, label: '-унок', ultimate: 'de', via: ['pl'], path: 'пол. -unek ← нім. -ung (через польське посередництво)', weight: 'A', per: { pl: 11 }, total: 11,
    examples: ['подарунок', 'рахунок', 'ґатунок', 'пакунок', 'поцілунок', 'стосунок'], cite: WP('Полонізм', 'Суфікс -унок: малюнок, подарунок, поцілунок, рисунок, стосунок'),
    note: 'суфікс поширився й на відіменні утворення від рідних дієслів (грабунок, застосунок — Вікісловник)' },
  { id: 'L-S24', pattern: /дло$/, label: '-дло', via: ['pl'], path: 'пол.: збережений праслов’янський суфікс *dl (рідна форма: -сло)', weight: 'A', per: { pl: 5 }, total: 5,
    examples: ['бидло', 'ковадло', 'повидло', 'простирадло'], cite: WP('Полонізм', 'Збереження праслов\'янського суфікса *dl: бидло, вагадло, верцадло, виделка, їдло, ковадло, кодло, падло, повидло, простирадло, ставидло, чуперадло, шмаровидло'),
    note: 'Сідло/бидло/кодло з корпусу: слова «Полонізм» і спільнослов’янські форми не розрізнити за -дло без ЕСУМ' },
  { id: 'L-S09', pattern: /[^а]аж$/, label: '-аж', via: ['fr'], path: 'фр. -age', weight: 'A', per: { fr: 25, de: 1, cu: 1 }, total: 27, except: ['страж', 'збараж', 'таж', 'продаж', 'уваж', 'наваж', 'важ'],
    examples: ['гараж', 'багаж', 'масаж', 'монтаж', 'макіяж'], cite: PR(125, 'Французькі буквосполучення ll та ill … передаємо через й : макіяж, Війон, Шантійї'),
    note: 'потрібна перевірка основи: страж, збараж, таж, продаж — рідні' },
  // ── B: strong hints ──────────────────────────────────────────────────────────────────────────────
  { id: 'L-S01', pattern: /[іи]тет$/, label: '-ітет', ultimate: 'la', via: ['de', 'pl', 'ru'], path: 'лат. -itas → (нім. -ität | пол. -ytet | рос. -итет) → укр. -ітет; проміжну мову за формою не визначити', weight: 'B',
    per: { de: 7, la: 2, pl: 1 }, total: 9, examples: ['університет', 'менталітет', 'імунітет', 'нейтралітет', 'муніципалітет'],
    cite: WK('університет', 'Borrowed from German Universität, from Latin ūniversitās'), note: 'польська й російська форми тотожні (imunitet, иммунитет); комітет — лат. comitātus, авторитет — пол.' },
  { id: 'L-S03', pattern: /[іи]зм$/, label: '-ізм', via: ['fr'], path: 'фр. -isme (часто через російську: комунізм)', weight: 'B', per: { de: 5, en: 5, fr: 31, ru: 3, it: 2, grc: 2 }, total: 46,
    examples: ['пацифізм', 'лібералізм', 'імпресіонізм', 'комунізм'], cite: WK('-ізм', '{{ety|uk|:bor|fr:-isme}}'), except: ['ізм'] },
  { id: 'L-P03', pattern: /ґ/, label: 'ґ', via: ['pl'], path: 'ґ у загальній назві: давнє польське посередництво (або нове пряме англ./угор.)', weight: 'B', per: { pl: 16, en: 12, de: 4, hu: 3 }, total: 35,
    examples: ['ґанок', 'ґвалт', 'ґрунт', 'ґудзик'], cite: PR(122, 'Буквою ґ передаємо звук [ g ] у давнозапозичених загальних назвах, таких як ґанок, ґатунок, ґвалт, ґрати, ґрунт і под.'),
    note: 'в іменах людей ґ — сучасне наслідування донора, а не ознака давнини (§ 122.3)' },
  { id: 'L-P04', pattern: /^ш[тпрлвн]/, label: 'шт-/шп-/шр-/шл-', via: ['de', 'pl'], path: 'нім. (шт-, шп-, шр-, шв-, шн-) або пол. (шл-)', weight: 'B', per: { pl: 14, de: 30, en: 1, ru: 3, tr: 1, nl: 3 }, total: 49,
    except: ['што', 'шість', 'шпак', 'шви', 'штани', 'шлях'],
    examples: ['штурм', 'шпиталь', 'штрейкбрехер', 'шлях', 'шляхта'], cite: WP('Германізм', 'Такі германізми зберігають типові фонетичні (штуцер, шпиталь, лейтмотив, зумпф, купферштейн) і словотвірні (ландшафт, мітельшпіль, плексиглас, штрейкбрехер) риси німецької мови.'),
    note: 'шл- частіше польське (5 з 9), шт- німецьке (де 61 %)' },
  { id: 'L-P02', pattern: /^дж/, label: 'дж-', via: ['en'], path: 'англ. j-/dg- (джаз, джинси); дж у середині — окремо', weight: 'B', per: { en: 7, ru: 1, it: 1 }, total: 9, except: ['джміль', 'джгут', 'джура', 'джерело', 'джбан'],
    examples: ['джаз', 'джем', 'джентльмен', 'джемпер'], cite: WP('Англіцизм', 'Для запозичень з англійської мови характерні: звукосполучення -дж-: бюджет, джаз, джентльмен, джемпер') },
  // ── C: weak hints (family only) ──────────────────────────────────────────────────────────────────
  { id: 'L-S01b', pattern: /[а-яіїєґ]{3,}[іи]-?ті$/, label: '-іті', ultimate: 'la', via: ['en'], path: 'англ. -ity, транслітероване як -іті (за зразком Канзас-Сіті); у Вікісловнику атестованих іменників на -іті немає', weight: 'C', per: {}, total: 0,
    examples: ['екстремі-ті'], cite: P('PRAV', 'https://slovnyk.ua/pravopys.php?prav_par=129 (§ 129 I.4)', 'У географічних назвах … в кінці слова: Канзас-Сіті, Лісабон, Міссісіпі, Монтевідео, Ніл, Севілья, Сідней, Замбезі, Капрі, Сомалі', 'правило виведене за аналогією (U-27), не цитата'),
    note: 'гіпотеза [U]: жодного засвідченого іменника на -іті' },
  { id: 'L-S15', pattern: /ейш[еи]?н$/, label: '-ейшн', via: ['en'], path: 'англ. -ation, пряме', weight: 'C', per: {}, total: 0, examples: [],
    cite: P('PRAV', 'https://slovnyk.ua/pravopys.php?prav_par=133 (§ 133)', 'Англійські дифтонги [au], [ei], [ou] звичайно передаємо, імітуючи їхнє звучання в мові оригіналу, через ау, ей, оу', 'правило -ейшн виведене; атестованих лем немає'), note: 'гіпотеза [U]' },
  { id: 'L-S02', pattern: /[ая]ція$/, label: '-ація', ultimate: 'la', via: ['la', 'fr', 'pl', 'de', 'en'], path: 'лат. -atio; донор не визначається (пол. -acja, рос. -ация однакові)', weight: 'C', per: { pl: 7, de: 7, en: 7, fr: 19, la: 30, ru: 1 }, total: 69,
    examples: ['нація', 'агітація', 'глобалізація', 'експлуатація'], cite: WK('-ація', 'From la -ātiō … Parsable as -а + -ція.') },
  { id: 'L-S02d', pattern: /[^ая]ція$/, label: '-кція/-нція', ultimate: 'la', via: ['la', 'pl'], path: 'лат. через пол./школи XV–XVIII ст.', weight: 'C', per: { pl: 8, de: 1, fr: 2, la: 18, ru: 6, it: 1 }, total: 35,
    examples: ['протекція', 'елекція', 'кореспонденція'], cite: WP('Латинізм', 'запозичені у XV-XVIII століттях внаслідок вивчення латинської мови в українських школах … Частина з них увійшла в українську мову через польське посередництво') },
  { id: 'L-S04', pattern: /[іи]ст$/, label: '-ист/-іст', via: ['fr'], path: '-ist: усі донори (фр. 61 %)', weight: 'C', per: { de: 3, en: 3, fr: 17, ru: 3, it: 1, grc: 1 }, total: 28, nativeProne: true, except: ['лист', 'піст', 'міст', 'хвіст', 'тріст', 'гніст'],
    examples: ['таксист', 'пацифіст'], cite: WP('Полонізм', 'Суфікс -іст(а), -ист(а): баліста, басиста, органіста, цимбалиста') },
  { id: 'L-S05', pattern: /[оу]ва(ти|тися)$/, label: '-ува́ти', via: ['pl'], path: 'пол. -ować (замінює лат./нім. дієслівний суфікс)', weight: 'C', per: { pl: 39, de: 7, fr: 6, la: 3, ru: 3, tr: 1, cu: 1 }, total: 60, nativeProne: true,
    examples: ['будувати', 'друкувати', 'касувати'], cite: WK('-ація', 'Frequently added to Latinate verbs ending in -ува́ти or -овати, where it replaces the entire suffix.'), note: 'більшість -ува́ти — рідні (бувати, годувати): без чужої основи не ознака' },
  { id: 'L-S05c', pattern: /[іи]рува(ти|тися)$/, label: '-ірувати', via: ['de', 'ru'], path: 'нім. -ieren або рос. -ировать: не розрізняє', weight: 'C', per: { de: 2, ru: 1 }, total: 3,
    examples: ['гравірувати', 'полірувати'], cite: CATS('-ірувати: 3 леми (нім. 2, рос. 1) — «-ирувати = нім. -ieren» даними не підтверджено') },
  { id: 'L-S10', pattern: /атор$/, label: '-атор', ultimate: 'la', via: ['la'], path: 'лат. -ator', weight: 'C', per: { pl: 2, de: 2, en: 2, la: 10 }, total: 16,
    examples: ['сенатор', 'губернатор', 'фундатор'], cite: CATS('-атор: 16 лем, лат. 63 %') },
  { id: 'L-S10c', pattern: /[^а]ер$/, label: '-ер', via: ['en', 'de', 'fr'], path: 'англ. -er (58 %), нім. -er, фр. -ier', weight: 'C', per: { pl: 5, de: 24, en: 72, fr: 22, ru: 4, grc: 1, nl: 1 }, total: 124, nativeProne: true,
    except: ['тер', 'бер', 'вер', 'пер', 'цер', 'мер'],
    examples: ['менеджер', 'спікер', 'пейджер'], cite: PR(135, 'Англійський звук [ə:] … відтворюється здебільшого українським буквосполученням ер : серфінг, Берд … Деякі слова, засвоєні українською мовою в транслітерованому вигляді, передають графічну форму відповідних англійських буквосполучень: гамбургер, курсор, Вордсворт, Ірвінг') },
  { id: 'L-S10b', pattern: /[^аот]ор$/, label: '-ор', via: ['la', 'en', 'fr'], path: 'лат./англ. -or: агентивний суфікс (неологізм)', weight: 'N', per: { pl: 1, de: 2, en: 5, fr: 5, la: 2, ru: 2, it: 1, grc: 2, cu: 3, hu: 1 }, total: 23, nativeProne: true,
    examples: ['автор', 'ректор', 'курсор'], cite: WK('-ор', 'neologism: -or, masculine agent suffix mimicking similar in numerous languages') },
  { id: 'L-S11', pattern: /ура$/, label: '-ура', ultimate: 'la', via: ['la', 'pl'], path: 'лат. -ura', weight: 'C', per: { pl: 5, de: 3, fr: 1, la: 6, tr: 1, it: 3, grc: 1 }, total: 20, nativeProne: true,
    examples: ['література', 'цензура', 'структура'], cite: CATS('-ура: 20 лем, лат. 30 %, пол. 25 %') },
  { id: 'L-S12', pattern: /[^аеєиіїоуюя]ія$/, label: '-ія', ultimate: 'la', via: ['la', 'fr', 'pl'], path: '-ia: лат./гр.; донор не визначається', weight: 'N', per: { pl: 33, de: 25, en: 19, fr: 46, la: 79, ru: 15, it: 8, grc: 21, cu: 1 }, total: 239, nativeProne: true,
    examples: ['артерія', 'індустрія'], cite: PR(129, 'У кінці слова іншомовне -іa передаємо звичайно через -ія : артерія, матерія, індустрія, Італія') },
  { id: 'L-S13', pattern: /[еа]нт$/, label: '-ент/-ант', ultimate: 'la', via: ['la'], path: 'лат. -ens/-ans; донор не визначається', weight: 'N', per: { pl: 5, de: 5, en: 5, fr: 7, la: 5, ru: 6 }, total: 33, nativeProne: true,
    examples: ['студент', 'талант'], cite: CATS('-ент: 33 леми, жоден донор не переважає') },
  { id: 'L-S19b', pattern: /(ето|ино|елло|ссімо)$/, label: '-ето/-ино', via: ['it'], path: 'італ. -etto/-ino', weight: 'C', per: { it: 3 }, total: 3, nativeProne: true, except: ['вино', 'решето', 'сито', 'лихо'],
    examples: ['піаніно', 'лібрето', 'скерцо'], cite: CATS('-ето/-ино: 3 леми, усі італійські') },
  { id: 'L-S20', pattern: /ет$/, label: '-ет', via: ['fr'], path: 'фр. -et(te) (41–46 %)', weight: 'C', per: { pl: 8, de: 11, en: 8, fr: 26, la: 5, ru: 4, it: 1, grc: 1 }, total: 63, nativeProne: true,
    except: ['намет', 'привіт', 'обіт', 'рет'], examples: ['кабінет', 'сюжет', 'банкет'], cite: CATS('-ет: 63 леми, фр. 41 %') },
  { id: 'L-S27', pattern: /(логія|графія|граф|метр|скоп|кратія|фон|фобія|філія)$/, label: 'грец. складники', ultimate: 'grc', via: ['de', 'fr', 'en'], path: 'грец. складові частини; безпосередня мова — західноєвропейська', weight: 'C',
    per: { de: 8, fr: 14, en: 6, la: 2, grc: 6, ru: 2 }, total: 40, examples: ['аналогія', 'орфографія', 'аристократія'],
    cite: PR(127, 'Кінцеве -tr передаємо через -тр , -dr — через -др : барометр, діаметр, семестр, театр, термометр, центр, цилiндр') },
  { id: 'L-S28', pattern: /(ус|ум)$/, label: '-ус/-ум', ultimate: 'la', via: ['la'], path: 'лат. 2-ї відміни (учена позичка)', weight: 'C', per: { pl: 1, de: 5, en: 8, fr: 4, la: 25, ru: 2, grc: 1 }, total: 44, nativeProne: true,
    except: ['ум', 'розум', 'шум', 'глум', 'дум', 'сум', 'кум', 'гурт', 'гусь'], examples: ['екстремум', 'ультиматум', 'консенсус'], cite: CATS('-ус/-ум: 44 леми, лат. 55–57 %') },
  { id: 'L-S31', pattern: /(ак|ан|ун)$/, label: '-ак/-ан/-ун', via: ['tr'], path: 'тюркські: кінцевий наголос, гармонія голосних (слабка ознака)', weight: 'C', per: { pl: 21, de: 17, en: 15, fr: 19, la: 5, ru: 21, tr: 32, it: 1, grc: 5, cu: 2, nl: 2 }, total: 133, nativeProne: true,
    examples: ['чабан', 'табун', 'кавун'], cite: WP('Тюркізм', 'Тюркізми звичайно характеризуються гармонією голосних (самі передні або самі задні голосні в слові), браком групи приголосних на початку слова і, здебільша, кінцевим наголосом.') },
  { id: 'L-P01', pattern: /^ф/, label: 'ф-', via: ['fr', 'en', 'de'], path: 'ф- нерідна: ф ← θ означає грецьке через церк.-слов./рос., т — пряме грецьке', weight: 'C', per: { pl: 20, de: 25, en: 26, fr: 40, la: 19, ru: 8, it: 8, grc: 7, cu: 1, nl: 2 }, total: 150, nativeProne: true,
    examples: ['фонетика', 'форма', 'факт'], cite: PR(123, 'У словах, узвичаєних в українській мові з ф , допускається орфографічна варіантність на зразок: … ефір і етер, … міф, міфологія і міт, мітологія, … Афіни і Атени, Борисфен і Бористен') },
  { id: 'L-P07', pattern: /^екс/, label: 'екс-/екстр-', ultimate: 'la', via: ['fr', 'la'], path: 'лат. ex-/extr- (екстремум ← extrēmus)', weight: 'C', per: { de: 1, en: 3, fr: 8, la: 7, ru: 2 }, total: 21,
    examples: ['екстремізм', 'екстремум'], cite: WK('екстремізм', 'Derived via Western European languages from extrēmus + -ізм.') },
  { id: 'L-P12', pattern: /^(анти|архі|гіпер|гіпо|мета|пара|епі|ана|діа|еко|гео|тео|нео|аеро|авто)/, label: 'грец. префікси', ultimate: 'grc', via: ['fr', 'grc'], path: 'грец. префікси; безпосередньо західноєвропейські', weight: 'C',
    per: { pl: 4, de: 3, en: 5, fr: 17, la: 5, ru: 6, it: 1, grc: 13 }, total: 52, nativeProne: true, examples: ['антитеза', 'гіпотеза'], cite: CATS('грец. префікси: 52 леми, фр. 33 %, грец. 25 %') },
  { id: 'L-P11', pattern: /^(транс|інтер|контр|супер|суб)/, label: 'лат. префікси', ultimate: 'la', via: ['en', 'fr'], path: 'лат. префікси через англ. (53 %)', weight: 'C', per: { de: 2, en: 9, fr: 3, la: 1, ru: 1, it: 1 }, total: 17, nativeProne: true,
    examples: ['трансформація', 'інтернет'], cite: CATS('транс-/інтер-/контр-/супер-/суб-: 17 лем, англ. 53 %') },
  { id: 'L-F01', pattern: /(ай|ей)[^аеєиіїоуюя]/, label: '-ай-/-ей-', via: ['en', 'de'], path: 'англ. -ay-/-ey- (54 %) або нім. ei (20 %)', weight: 'C', per: { pl: 7, de: 21, en: 56, fr: 4, ru: 9, tr: 6, it: 1, nl: 1, hu: 1 }, total: 104, nativeProne: true,
    except: ['найти', 'кайдани', 'гайдамака', 'сейм', 'вейник'], examples: ['гайморит', 'тролейбус', 'хокей'], cite: WP('Англіцизм', 'звукосполучення -ай-, -ей-: гайморит, інсайт, тролейбус, хокей') },
  { id: 'L-S16', pattern: /(ьє|ьйон)/, label: '-ьє/-ьйон', via: ['fr'], path: 'фр. -ier/-ion', weight: 'C', per: { fr: 3, en: 1 }, total: 4, examples: ['кар’єра'],
    cite: PR(138, 'Апостроф у словах іншомовного походження … перед я, ю, є, ї … після приголосних б, п, в, м, ф, г, к, х, ж, ч, ш, р: б’єф, комп’ютер, інтерв’ю, прем’єр, кар’єра …') },
]
const RULE_BY_ID = Object.fromEntries(LOAN_RULES.map(r => [r.id, r])) as Record<string, LoanRule>

// ── Wiktionary donor labels (LW-2) ──────────────────────────────────────────────────────────────────
export interface DonorLabel { donor: Donor; path: string; via?: Donor }
/** `lemma → label` lookup; the build may inject the full table (3 246 lemmas / 538 core lemmas, research/26 §6). */
export type LabelLookup = (lemma: string) => Claim<DonorLabel> | undefined
const wk = (lemma: string, label: DonorLabel, quote: string, kind: 'Q' | 'D' = 'Q'): [string, Claim<DonorLabel>] =>
  [lemma, claim(label, kind === 'Q' ? Q('WKEN', `https://en.wiktionary.org/wiki/${encodeURIComponent(lemma)}`, quote, 'CC BY-SA 4.0') : D('WKEN', `https://en.wiktionary.org/wiki/${encodeURIComponent(lemma)}`, quote, 'CC BY-SA 4.0'), { method: 'wiktionary-label' })]
/** Seed of the labels read in research/26 §2.3 (verbatim etymology lines / templates). Larger data is a build-stream export (see report). */
export const WK_LABELS: Map<string, Claim<DonorLabel>> = new Map([
  wk('університет', { donor: 'de', path: 'нім. Universität ← лат. ūniversitās' }, 'Borrowed from German Universität, from Latin ūniversitās'),
  wk('менталітет', { donor: 'de', path: 'нім. Mentalität' }, '{{ety|uk|:bor|de:Mentalität}} Compare ru менталите́т', 'D'),
  wk('імунітет', { donor: 'de', path: 'нім. Immunität ← лат. immūnitās' }, 'Probably borrowed from German Immunität, ultimately from Latin immūnitās. Compare ru иммуните́т, be імунітэ́т, pl immunitet'),
  wk('комітет', { donor: 'la', path: 'лат. comitātus (книжна позичка)' }, '{{ety|uk|:lbor|la:comitātus}}', 'D'),
  wk('рахунок', { donor: 'pl', path: 'пол. rachunek' }, '{{ety|uk|:bor|pl:rachunek}}', 'D'),
  wk('пакунок', { donor: 'pl', path: 'пол. pakunek ← нім. Packung' }, 'Probably borrowed from Polish pakunek (like пака from paka), [ESUM пака 257] from German Packung. Surface analysis пакува́ти + -у́нок.'),
  wk('маркетинг', { donor: 'en', path: 'англ. marketing' }, '{{ety|uk|:bor|en:marketing}}', 'D'),
  wk('аутсорсинг', { donor: 'en', path: 'англ. outsourcing' }, '{{ety|uk|:bor|en:outsourcing}}', 'D'),
  wk('гараж', { donor: 'fr', path: 'фр. garage' }, '{{ety|uk|:bor|fr:garage}}', 'D'),
  wk('комунізм', { donor: 'ru', via: 'fr', path: 'рос. коммуни́зм ← фр. communisme' }, 'Borrowed from Russian коммуни́зм, from French communisme.[ESUM vol. 2 p. 545] With -і́зм suffix.'),
  wk('нація', { donor: 'pl', path: 'пол. nacja' }, '{{ety|uk|:bor|pl:nacja}}', 'D'),
  wk('проєкт', { donor: 'de', path: 'нім. Projekt ← лат. proiectus' }, 'Borrowed from German Projekt, from Latin proiectus. This spelling (with -єкт-) is officially stipulated in preference to проект'),
  wk('ефір', { donor: 'grc', path: 'грец. αἰθήρ' }, '{{ety|uk|:bor|grc:αἰθήρ}}', 'D'),
]) as Map<string, Claim<DonorLabel>>
const seedLabels: LabelLookup = l => WK_LABELS.get(l)

// ── analysis ────────────────────────────────────────────────────────────────────────────────────────
export interface LoanPath { donor: Donor; path: string }
export interface LoanHint { rule: string; label: string; weight: Weight; ultimate?: Donor; via: Donor[]; path: string; counts: string; cite: Evidence; note?: string }
export interface Hypothesis { donor: Donor; p: number }
export interface LoanAnalysis {
  word: string
  /** any A/B rule fired, or ≥ 2 non-native-prone C rules (research/26 §4 step 2), or a Wiktionary label exists */
  foreign: boolean
  /** claims from class A rules only (LW-1) */
  claims: Claim<LoanPath>[]
  hints: LoanHint[]
  label?: Claim<DonorLabel>
  /** rule claim/top hypothesis disagrees with the label: both are shown, neither is dropped (LW-2) */
  conflict?: { rule: string; ruleDonors: Donor[]; labelDonor: Donor }
  /** ranked classifier output; empty unless `foreign` */
  hypotheses: Hypothesis[]
  cv: typeof LOAN_CV
  status: 'label' | 'claim' | 'hypothesis' | 'none'
  /** form is not attested in the lexicon/VESUM/Wiktionary: «гіпотетична форма» (U-27) */
  hypotheticalForm: boolean
}
const clean = (s: string) => s.normalize('NFC').toLowerCase().replace(/́/g, '').replace(/[’ʼ`]/g, "'").trim()
const counts = (r: LoanRule) => r.total ? `Вікісловник: ${r.total} лем — ${Object.entries(r.per).sort((a, b) => b[1]! - a[1]!).map(([d, n]) => `${d} ${n}`).join(', ')}` : 'у Вікісловнику атестованих лем немає [U]'
const matches = (r: LoanRule, w: string) => r.pattern.test(w) && !(r.except ?? []).includes(w)

/** Naive-Bayes log-odds per donor over the fired rules (R26 §4.3, α = 0.5), softmax-normalised. */
export function rank(rules: LoanRule[]): Hypothesis[] {
  const withData = rules.filter(r => r.total > 0)
  if (!withData.length) return []
  const sumN = Object.values(DONOR_N).reduce((a, b) => a + b, 0), α = 0.5
  const donors = Object.keys(DONOR_N) as Donor[]
  const score = new Map<Donor, number>(donors.map(d => [d, 0]))
  for (const r of withData) for (const d of donors) {
    const c = r.per[d] ?? 0, nd = DONOR_N[d]
    const w = Math.log((c + α) / (nd + 2 * α)) - Math.log((r.total - c + α) / (sumN - nd + 2 * α))
    score.set(d, score.get(d)! + w)
  }
  const max = Math.max(...score.values()), exp = donors.map(d => [d, Math.exp(score.get(d)! - max)] as const), z = exp.reduce((a, [, e]) => a + e, 0)
  return exp.map(([donor, e]) => ({ donor, p: e / z })).sort((a, b) => b.p - a.p)
}

/**
 * LW-1…LW-3: donor/path analysis of one word. `labels` (default: the seed of research/26 §2.3) supplies Wiktionary labels; `attested` = the word is
 * known to the lexicon/VESUM (default true); an unattested word with only rule hits is a «гіпотетична форма» (екстремітет).
 */
export function analyzeLoan(input: string, opts: { labels?: LabelLookup; attested?: boolean } = {}): LoanAnalysis {
  const w = clean(input).replace(/-/g, '')
  const fired = LOAN_RULES.filter(r => matches(r, w))
  const claimsOut: Claim<LoanPath>[] = []
  for (const r of fired.filter(r => r.weight === 'A')) {
    const top = (Object.entries(r.per) as [Donor, number][]).sort((a, b) => b[1] - a[1])[0]!
    claimsOut.push(claim<LoanPath>({ donor: top[0], path: r.path }, [r.cite, D('WKEN', 'en.wiktionary donor categories (research/26 §3.1)', `${r.label}: ${top[1]} з ${r.total} лем із міткою — ${DONOR_UK[top[0]]}`),
      D('INPUT', w, `«${w}» відповідає шаблону ${r.id} (${r.label})`)], { method: `LOAN-${r.id}`, score: top[1] / r.total }))
  }
  const hints: LoanHint[] = fired.filter(r => r.weight !== 'A').map(r => ({ rule: r.id, label: r.label, weight: r.weight, ultimate: r.ultimate, via: r.via, path: r.path, counts: counts(r), cite: r.cite, note: r.note }))
  const label = (opts.labels ?? seedLabels)(w)
  const gateCount = fired.filter(r => r.weight === 'A' || r.weight === 'B').length + (fired.filter(r => r.weight === 'C' && !r.nativeProne).length >= 2 ? 1 : 0)
  const foreign = gateCount > 0 || !!label
  const hypotheses = foreign ? rank(fired).slice(0, 3) : []
  let conflict: LoanAnalysis['conflict']
  if (label && label.value !== 'unknown') {
    const lab = label.value, labelDonors = [lab.donor, lab.via].filter((x): x is Donor => !!x)
    // a class A/B rule disagrees with the label when none of the donors it points to (incl. the ultimate source) is the label's donor or intermediary
    for (const r of fired.filter(r => r.weight === 'A' || r.weight === 'B')) {
      const pointed = [...r.via, ...(r.ultimate ? [r.ultimate] : [])]
      if (!pointed.some(d => labelDonors.includes(d))) { conflict = { rule: r.id, ruleDonors: r.via, labelDonor: lab.donor }; break }
    }
  }
  const status = label ? 'label' : claimsOut.length ? 'claim' : hypotheses.length ? 'hypothesis' : 'none'
  return { word: w, foreign, claims: claimsOut, hints, label, conflict, hypotheses, cv: LOAN_CV, status, hypotheticalForm: (opts.attested === false) && !label }
}

export const loanRule = (id: string) => RULE_BY_ID[id]
