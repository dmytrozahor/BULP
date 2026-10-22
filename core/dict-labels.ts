/**
 * SPEC 63 LB-1/LB-2 — the dictionaries' OWN regional, dialectal and usage labels, parsed from the article text. Pure: no node or DOM imports.
 *
 * > owner 2026-10-22: «діалектну приналежність точно можна визначити для відсотків 80 слів» — the labels of Грінченко, Желехівський, Уманець–Спілка, Кримський carry thousands of areas.
 *
 * One table per dictionary; every row quotes the abbreviation exactly as THAT dictionary's own list of abbreviations prints it (r2u.org.ua pages, fetched 2026-10-22, the page is the locator).
 * How the label attaches differs by dictionary (`attach`):
 *   article    the label stands anywhere in the article of a Ukrainian headword (Грінченко, Желехівський, Голоскевич) → the headwords of the article
 *   after      ru→uk: «слово (Гал.)» — the label in the brackets after the Ukrainian equivalent (Уманець–Спілка) → that one equivalent
 *   before     ru→uk: «(гал.) слово» — the label in the brackets before the Ukrainian equivalent (Кримський) → that one equivalent
 * Nothing is classified by hand per word: a hit is an abbreviation of the table found in the text, with the verbatim slice around it.
 * A place named by the dictionary resolves to a historical area (AREAS) and, through the AC-2 gazetteer (uk.wikipedia, quoted), to a dialect group where the gazetteer names that area.
 * Ніковський and Голоскевич print no regional abbreviations that their own lists define; Ум./Ув. of Грінченко mark the DERIVED forms listed in the article (not the headword) and are not read as labels.
 */
import { COUNTIES } from './dict-counties.ts'
import { gazetteerRows, type GazRow } from './autolabel.ts'

/** historical / ethnographic areas the dictionaries name. `uk` is shown on the card; the dialect group, if any, comes from the AC-2 gazetteer by that name. */
export const AREAS: Record<string, string> = {
  halychyna: 'Галичина', hutsul: 'Гуцульщина', lemko: 'Лемківщина', zakarpattia: 'Закарпаття (Угорська Русь)', bukovyna: 'Буковина',
  volyn: 'Волинь', podillia: 'Поділля', kyivshchyna: 'Київщина', poltavshchyna: 'Полтавщина', slobozhanshchyna: 'Слобожанщина (Харківщина)',
  chernihivshchyna: 'Чернігівщина', sumshchyna: 'Сумщина', katerynoslavshchyna: 'Катеринославщина', khersonshchyna: 'Херсонщина',
  tavria: 'Таврія', bessarabia: 'Бессарабія', don: 'Донщина', kuban: 'Кубань і Чорноморія', terek: 'Терщина',
  livoberezhzhia: 'Лівобережна Україна', pravoberezhzhia: 'Правобережна Україна', west: 'захід України', east: 'схід України',
}
/** governorate (nominative, as uk.wikipedia names it) → area */
const GOV_AREA: Record<string, string> = {
  Київська: 'kyivshchyna', Подільська: 'podillia', Полтавська: 'poltavshchyna', Харківська: 'slobozhanshchyna', Чернігівська: 'chernihivshchyna',
  Волинська: 'volyn', Катеринославська: 'katerynoslavshchyna', Херсонська: 'khersonshchyna', Таврійська: 'tavria', Бессарабська: 'bessarabia',
}

export type DKind = 'area' | 'dialectal' | 'register' | 'type'
export interface DRow {
  abbr: string
  /** the dictionary's own explanation of the abbreviation, verbatim from its list */
  meaning: string
  kind: DKind
  /** AREAS id (kind area) */ area?: string
  /** register id (kind register / dialectal), see core/labels.ts REGISTER */ reg?: string
  /** word-type id (kind type): see core/labels.ts WORD_TYPES */ typ?: string
  /** 'place': the label says WHERE a word or example was recorded (a county, a governorate), not that the word is dialectal; default = the label marks the word or sense itself */ scope?: 'place'
  /** a place the dictionary names whose governorate the project has no quoted source for: shown as the place only */ place?: string
  /** a county abbreviation: the adjective of the county in COUNTIES (resolves the governorate) */ county?: string
  /** a regex source when the printed abbreviation needs more than the literal (spacing in «Н. Вол. у.») */ re?: string
}
export type Attach = 'article' | 'after' | 'before'
export interface DTable {
  id: string
  /** r2u dictionary ids (pipelines/r2u.ts R2U_DICTS) read with this table */ dicts: number[]
  short: string
  /** id in core/sources.ts that owns the evidence */ source: string
  /** where the dictionary prints its list of abbreviations */ list: string
  attach: Attach
  rows: DRow[]
}

const R = (abbr: string, meaning: string, kind: DKind, x: Partial<DRow> = {}): DRow => ({ abbr, meaning, kind, ...x })

/** Грінченко, «Словарь української мови» 1907–09 and the 3rd edition 1927–28: «Списокъ сокращеній» (https://r2u.org.ua/node/62, fetched 2026-10-22). */
export const HRINCH_LABELS: DTable = {
  id: 'hrinch-labels', dicts: [12, 18], short: 'Грінченко', source: 'HRINCH', list: 'https://r2u.org.ua/node/62 (Списокъ сокращеній)', attach: 'article',
  rows: [
    R('Галиц.', 'Галиц. — Галиція.', 'area', { area: 'halychyna' }),
    R('Гуцул.', 'Гуцул. — Гуцульщина.', 'area', { area: 'hutsul' }),
    R('Угор.', 'Угор. — Угорщина', 'area', { area: 'zakarpattia' }),
    R('Донск. об.', 'Донск. об. — Донская область.', 'area', { area: 'don' }),
    R('Міусск. окр.', 'Міусск. окр. — Міусскій округъ.', 'area', { area: 'don' }),
    R('Терск. обл.', 'Терск. обл. — Терская область.', 'area', { area: 'terek' }),
    R('Черном.', 'Черном. — Кубанская область.', 'area', { area: 'kuban' }),
    R('Подольск. г.', 'Подольск. г. — Подольская губернія.', 'area', { area: 'podillia' }),
    R('Полт. г.', 'Полт. г. — Полтавская губернія.', 'area', { area: 'poltavshchyna' }),
    R('Таврич. г.', 'Таврич. г. — Таврическая губернія.', 'area', { area: 'tavria' }),
    R('Харьк. г.', 'Харьк., Харьк. у., Харьк. г. — Харьковскій у ѣ здъ, Харьковская Херс. у., Херс. г. — Херсонскій у ѣ здъ, Херсонская губернія.', 'area', { area: 'slobozhanshchyna' }),
    R('Харьк. у.', 'Харьк., Харьк. у., Харьк. г. — Харьковскій у ѣ здъ, Харьковская Херс. у., Херс. г. — Херсонскій у ѣ здъ, Херсонская губернія.', 'area', { area: 'slobozhanshchyna' }),
    R('Харьк.', 'Харьк., Харьк. у., Харьк. г. — Харьковскій у ѣ здъ, Харьковская Херс. у., Херс. г. — Херсонскій у ѣ здъ, Херсонская губернія.', 'area', { area: 'slobozhanshchyna' }),
    R('Херс. у.', 'Харьк., Харьк. у., Харьк. г. — Харьковскій у ѣ здъ, Харьковская Херс. у., Херс. г. — Херсонскій у ѣ здъ, Херсонская губернія.', 'area', { area: 'khersonshchyna' }),
    R('Херс. г.', 'Харьк., Харьк. у., Харьк. г. — Харьковскій у ѣ здъ, Харьковская Херс. у., Херс. г. — Херсонскій у ѣ здъ, Херсонская губернія.', 'area', { area: 'khersonshchyna' }),
    R('Екат. у.', 'Екат., Екатер. у. или г. — Екатеринославскій у ѣ здъ или Екатеринославская губернія.', 'area', { area: 'katerynoslavshchyna' }),
    R('Екатер. у.', 'Екат., Екатер. у. или г. — Екатеринославскій у ѣ здъ или Екатеринославская губернія.', 'area', { area: 'katerynoslavshchyna' }),
    R('Екат. г.', 'Екат., Екатер. у. или г. — Екатеринославскій у ѣ здъ или Екатеринославская губернія.', 'area', { area: 'katerynoslavshchyna' }),
    R('Кіевск. у.', 'Кіевск. у., -г. — Кіевскій у ѣ здъ, — губернія.', 'area', { area: 'kyivshchyna' }),
    R('Кіевск. г.', 'Кіевск. у., -г. — Кіевскій у ѣ здъ, — губернія.', 'area', { area: 'kyivshchyna' }),
    R('Черниг. у.', 'Черниг. у., -г. — Черниговскій у ѣ здъ, — губернія.', 'area', { area: 'chernihivshchyna' }),
    R('Черниг. г.', 'Черниг. у., -г. — Черниговскій у ѣ здъ, — губернія.', 'area', { area: 'chernihivshchyna' }),
    R('Сум. у.', 'Сум. у., Сумск. у. — Сумской у ѣ здъ.', 'area', { county: 'Сумський' }),
    R('Сумск. у.', 'Сум. у., Сумск. у. — Сумской у ѣ здъ.', 'area', { county: 'Сумський' }),
    R('Бердич. у.', 'Бердич. у. — Бердичевскій у ѣ здъ.', 'area', { county: 'Бердичівський' }),
    R('Богод. у.', 'Богод. у. — Богодуховскій у ѣ здъ.', 'area', { county: 'Богодухівський' }),
    R('Борз. у.', 'Борз. у. — Борзенскій у ѣ здъ.', 'area', { county: 'Борзнянський' }),
    R('Брацл. у.', 'Брацл. у. — Брацлавскій у ѣ здъ.', 'area', { county: 'Брацлавський' }),
    R('Васильк. у.', 'Васильк. у. — Васильковскій у ѣ здъ.', 'area', { county: 'Васильківський' }),
    R('Зміев. у.', 'Зміев. у. — Зміевскій у ѣ здъ.', 'area', { county: 'Зміївський' }),
    R('Камен. у.', 'Камен. у. — Каменецкій у ѣ здъ.', 'area', { county: 'Кам\'янецький' }),
    R('Канев. у.', 'Канев. у. — Каневскій у ѣ здъ.', 'area', { county: 'Канівський' }),
    R('Конст. у.', 'Конст. у., Константиногр. у. — Константиноградскій у ѣ здъ.', 'area', { county: 'Костянтиноградський' }),
    R('Константиногр. у.', 'Конст. у., Константиногр. у. — Константиноградскій у ѣ здъ.', 'area', { county: 'Костянтиноградський' }),
    R('Кременч. у.', 'Кременч. у. — Кременчугскій у ѣ здъ.', 'area', { county: 'Кременчуцький' }),
    R('Кролев. у.', 'Кролев. у. — Кролевецкій у ѣ здъ.', 'area', { county: 'Кролевецький' }),
    R('Лебед. у.', 'Лебед. у — Лебединскій у ѣ здъ.', 'area', { county: 'Лебединський' }),
    R('Лохв. у.', 'Лохв. у. — Лохвицкій у ѣ здъ.', 'area', { county: 'Лохвицький' }),
    R('Лубен. у.', 'Лубен. у. — Лубенскій у ѣ здъ', 'area', { county: 'Лубенський' }),
    R('Мирг. у.', 'Мирг. у. — Миргородскій у ѣ здъ.', 'area', { county: 'Миргородський' }),
    R('Могил. у.', 'Могил. у. — Могилевскій у ѣ здъ Подольской губерніи.', 'area', { county: 'Могилівський' }),
    R('Н. Вол. у.', 'Н. Вол. у. — Новградъ-Волынскій у ѣ здъ.', 'area', { area: 'volyn', re: 'Н\\.\\s?Вол(?:ын)?\\.\\s?у\\.' }),
    R('Новомоск. у.', 'Новомоск. у. — Новомосковскій у ѣ здъ.', 'area', { county: 'Новомосковський' }),
    R('Ніжин у.', 'Н ѣ жин у. — Н ѣ жинскій у ѣ здъ.', 'area', { county: 'Ніжинський', re: 'Н[іѣ]жин\\.?\\s?у\\.' }),
    R('Одесс. у.', 'Одесс. у. — Одесскій у ѣ здъ.', 'area', { county: 'Одеський' }),
    R('Павлогр. у.', 'Павлогр. у. — Павлоградскій у ѣ здъ.', 'area', { county: 'Павлоградський' }),
    R('Переясл. у.', 'Переясл. у. — Переяславскій у ѣ здъ.', 'area', { place: 'Переяславський повіт' }),
    R('Пирят. у.', 'Пирят. у. — Пирятинскій у ѣ здъ.', 'area', { county: 'Пирятинський' }),
    R('Радом. у.', 'Радом. у. — Радомышльскій у ѣ здъ.', 'area', { county: 'Радомисльський' }),
    R('Славян. у.', 'Славян. у. — Славяносербскій у ѣ здъ.', 'area', { county: 'Слов\'яносербський' }),
    R('Хот. у.', 'Хот., Хотин. у. — Хотинскій у ѣ здъ.', 'area', { county: 'Хотинський' }),
    R('Хотин. у.', 'Хот., Хотин. у. — Хотинскій у ѣ здъ.', 'area', { county: 'Хотинський' }),
    R('Черк. у.', 'Черк. у. — Черкасскій у ѣ здъ.', 'area', { county: 'Черкаський' }),
    R('Житом. у.', 'Житом. у — Житомірскій у ѣ здъ.', 'area', { place: 'Житомирський повіт' }),
    R('Ласк.', 'Ласк. — выраженіе ласкательное.', 'register', { reg: 'lasky' }),
  ],
}

/** Уманець–Спілка, «Словарь росийсько-український» 1893–1906: «Зведений список скорочень» (https://r2u.org.ua/html/umanets_pered.html, fetched 2026-10-22). */
export const UMANETS_LABELS: DTable = {
  id: 'umanets-labels', dicts: [9], short: 'Уманець–Спілка', source: 'R2U', list: 'https://r2u.org.ua/html/umanets_pered.html (Зведений список скорочень)', attach: 'after',
  rows: [
    R('Гал.', 'Гал. — Галицьке слово.', 'area', { area: 'halychyna' }),
    R('Вол.', 'Вол. — Волинь.', 'area', { area: 'volyn' }),
    R('Под.', 'Под. — Подольске.', 'area', { area: 'podillia' }),
    R('Полт.', 'Полт. – Полтавщина.', 'area', { area: 'poltavshchyna' }),
    R('Хар.', 'Хар. — Харківщина.', 'area', { area: 'slobozhanshchyna' }),
    R('Хер.', 'Хер. — Херсонщина.', 'area', { area: 'khersonshchyna' }),
    R('Черн.', 'Черн. — Чернїговщина.', 'area', { area: 'chernihivshchyna' }),
    R('Сум. Ох.', 'Сум. Ох. — Сумщина. — Охорович К. — Слова й приміри, записані К. Ухач-Охоровичом в Сумсь', 'area', { area: 'sumshchyna' }),
    R('Лїв.', 'Лїв. — Лївобережна Україна.', 'area', { area: 'livoberezhzhia' }),
    R('Прав.', 'Прав. – Правобережна Україна.', 'area', { area: 'pravoberezhzhia' }),
    R('Ласк.', 'Ласк. — ласкаюче слово.', 'register', { reg: 'lasky' }),
    R('Ст.', 'Ст. — Стародавнє слово.', 'register', { reg: 'zast' }),
    R('Цер.', 'Цер. — Церковно-словянське слово.', 'type', { typ: 'cs' }),
    R('Поб.', 'Поб. — Побільшене слово.', 'type', { typ: 'aug' }),
    R('здр.', 'здр. — Здрібнїле слово.', 'type', { typ: 'dim' }),
  ],
}

/** Кримський–Єфремов, «Російсько-український академічний словник» 1924–33: «Пояснення скорочень — Терміни і вислови» (https://r2u.org.ua/html/krym_termin.html, fetched 2026-10-22). */
export const KRYM_LABELS: DTable = {
  id: 'krym-labels', dicts: [1], short: 'Кримський–Єфремов', source: 'R2U', list: 'https://r2u.org.ua/html/krym_termin.html (Пояснення скорочень — Терміни і вислови)', attach: 'before',
  rows: [
    R('гал.', 'гал ., галицк. – галицкое слово', 'area', { area: 'halychyna' }),
    R('галицк.', 'гал ., галицк. – галицкое слово', 'area', { area: 'halychyna' }),
    R('гуц.', 'гуц. – гуцульское слово', 'area', { area: 'hutsul' }),
    R('зап.', 'зап. – западное украинское слово', 'area', { area: 'west' }),
    R('зах.', 'зах. – західне, см. зап .', 'area', { area: 'west' }),
    R('вост.', 'вост. – восточное слово', 'area', { area: 'east' }),
    R('диал.', 'диал. , диалект. – диалектизм, диалектическое слово', 'dialectal', { reg: 'dial' }),
    R('диалект.', 'диал. , диалект. – диалектизм, диалектическое слово', 'dialectal', { reg: 'dial' }),
    R('арх.', 'арх. , архаич. – архаическое слово', 'register', { reg: 'arkh' }),
    R('архаич.', 'арх. , архаич. – архаическое слово', 'register', { reg: 'arkh' }),
    R('устар.', 'устар. – устарелое слово', 'register', { reg: 'zast' }),
    R('стар.', 'стар. – старое слово', 'register', { reg: 'zast' }),
    R('старинн.', 'старинн. – старинное слово', 'register', { reg: 'zast' }),
    R('книжн.', 'книжн. – книжное слово', 'register', { reg: 'knyzh' }),
    R('вульг.', 'вульг. – вульгарно', 'register', { reg: 'vulg' }),
    R('жарг.', 'жарг. – жаргонное слово, -ное выражение', 'register', { reg: 'zharh' }),
    R('ласк.', 'ласк. , ласкат. – ласкательно, -ная форма, слово', 'register', { reg: 'lasky' }),
    R('ирон.', 'ирон. , иронич. – иронически', 'register', { reg: 'iron' }),
    R('презр.', 'презр. , презрит. – презрительно, -ная форма', 'register', { reg: 'znevazh' }),
    R('поэтич.', 'поэтич. – поэтически', 'register', { reg: 'poet' }),
    R('церк.', 'церк. – церковное слово', 'type', { typ: 'cs' }),
    R('церковн.', 'церковн. – церковное слово, -ное выражение', 'type', { typ: 'cs' }),
    R('слав.', 'слав. , славян. – славянизм', 'type', { typ: 'cs' }),
    R('рус.', 'рус. – руссизм', 'type', { typ: 'rusism' }),
  ],
}

/** Желехівський–Недільський, «Малорусько-німецький словар» 1886: «Обясненє скорочень і знаків» (https://r2u.org.ua/html/zheleh_details.html, fetched 2026-10-22). */
export const ZHELEH_LABELS: DTable = {
  id: 'zheleh-labels', dicts: [21], short: 'Желехівський', source: 'R2U', list: 'https://r2u.org.ua/html/zheleh_details.html (А. Обясненє скорочень і знаків)', attach: 'article',
  rows: [
    R('hucul.', 'hucul. = huculisch (Mundart der Huzulen)', 'area', { area: 'hutsul' }),
    R('łemk.', '(łemk.) = łemkisch (Mundart der Лемки)', 'area', { area: 'lemko' }),
    R('ungr.', 'ungr. = ungarisch, ungarisch-ruthenisch', 'area', { area: 'zakarpattia' }),
    R('iron.', '(iron.) = ironisch', 'register', { reg: 'iron' }),
    R('poët.', 'poët. = poëtisch', 'register', { reg: 'poet' }),
    R('euphem.', 'euphem. = euphemistisch.', 'register', { reg: 'euphem' }),
    R('scherzh.', 'scherzh. = scherzhaft; Scherzw. = Scherzwort.', 'register', { reg: 'zhart' }),
    R('†', '† = слово застаріле,', 'register', { reg: 'zast', re: '†' }),
    R('§', '§ = вираженє тривіяльне,', 'register', { reg: 'trivial', re: '§' }),
    R('gr.', 'gr. = grossrussisch', 'type', { typ: 'rusism' }),
    R('pol.', 'pol. = polnisch', 'type', { typ: 'loan-pl' }),
    R('rum.', 'rum. = rumänisch', 'type', { typ: 'loan-ro' }),
    R('serb.', 'serb. = serbisch', 'type', { typ: 'loan-sr' }),
    R('tatar.', 'tatar. = tatarisch', 'type', { typ: 'loan-tt' }),
    R('dim.', 'd.; dim. = diminutivum', 'type', { typ: 'dim' }),
    R('aug.', 'aug. = augmentativum', 'type', { typ: 'aug', re: 'aug(?:m)?\\.' }),
  ],
}

for (const r of HRINCH_LABELS.rows) if (r.kind === 'area' && !['Галиц.', 'Гуцул.', 'Угор.'].includes(r.abbr)) r.scope = 'place'
export const DICT_LABEL_TABLES: DTable[] = [HRINCH_LABELS, UMANETS_LABELS, KRYM_LABELS, ZHELEH_LABELS]
export const tableOfDict = (dict: number): DTable | undefined => DICT_LABEL_TABLES.find(t => t.dicts.includes(dict))

/** an abbreviation of a table, with the area it names resolved */
export interface Resolved { area?: string; places: string[]; gov?: { name: string; title: string; quote: string }; group: GazRow[] }

const NORM = (s: string) => s.normalize('NFC').toLowerCase().replace(/[ьъ'’ʼ`́-]/g, '').replace(/ё/g, 'е').replace(/[иіїѣеє]/g, 'і').replace(/ґ/g, 'г')
const countyBase = (adj: string) => NORM(adj.replace(/(ський|цький|зький)$/, ''))

/** the county row for an adjective (exact) */
export const countyOf = (adj: string) => COUNTIES.find(c => c[0] === adj)
/** the county that an unlisted stem («Звен.») names: the unique county whose normalised base starts with the stem (≥ 3 letters), else undefined */
export function countyByStem(stem: string): (typeof COUNTIES)[number] | undefined {
  const s = NORM(stem.replace(/\.$/, '')); if (s.length < 3) return undefined
  const hit = COUNTIES.filter(c => countyBase(c[0]).startsWith(s))
  const gov = new Set(hit.map(h => h[1]))
  return hit.length === 1 || (hit.length > 1 && gov.size === 1 && hit.every(h => h[0] === hit[0]![0])) ? hit[0] : undefined
}
/** the AC-2 gazetteer groups whose area name matches (empty = the gazetteer does not know the area → no dialect group) */
export const groupsOfArea = (area: string): GazRow[] => (AREAS[area] ? gazetteerRows(AREAS[area]!) : [])

export function resolveRow(row: DRow): Resolved {
  if (row.county) {
    const c = countyOf(row.county)
    const a = c ? GOV_AREA[c[1]] : undefined
    return { area: a, places: [row.county + ' повіт'], ...(c ? { gov: { name: c[1] + ' губернія', title: c[2], quote: c[3] } } : {}), group: a ? groupsOfArea(a) : [] }
  }
  if (row.place) return { places: [row.place], group: [] }
  if (row.area) return { area: row.area, places: [AREAS[row.area]!], group: groupsOfArea(row.area) }
  return { places: [], group: [] }
}

/** wire form of one hit in a lemma's label entry */
export interface DictHit {
  /** table id */ t: string
  /** abbreviation as printed (the table's) */ a: string
  kind: DKind
  /** area id | register id | word-type id */ v: string
  /** verbatim slice of the article around the label */ q: string
  /** article link */ u: string
  /** governorate area when the hit named a county (area `v` is then the governorate's area) */ place?: string
  /** the governorate article quote for a county */ gq?: string
  /** an abbreviation resolved by the list's generic rule «X. у. = X-ський повіт», not printed in the list itself */ variant?: true
  /** a dialect group code (core/rules.ts DIALECTS) the source names directly (hand-cited dictionary claims of the card) */ g?: string
  /** the label records a PLACE of recording (county, governorate), not a dialect marker of the word */ p?: true
  /** the labelled word when it is not the headword of the article (ru→uk dictionaries) */ w?: string
}
export interface ArticleHit { row: DRow; quote: string; resolved: Resolved; variant?: boolean; word?: string; place?: string }

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const rowRe = (r: DRow) => new RegExp(`(?<![\\p{L}])(?:${r.re ?? esc(r.abbr)})(?![\\p{L}])`, 'u')
const slice = (t: string, i: number, len: number) => t.slice(Math.max(0, i - 40), Math.min(t.length, i + len + 70)).replace(/\s+/g, ' ').trim()

/**
 * LB-2 attach=article: the table's abbreviations anywhere in the text (Грінченко's counties also through the list's generic rule «X. у.»).
 * Rows of the same area are reported once, the longest abbreviation first (so «Харьк. у.» does not also fire as «Харьк.»).
 */
export function scanArticle(table: DTable, text: string, maxStart?: number): ArticleHit[] {
  const out: ArticleHit[] = [], seen = new Set<string>()
  const rows = [...table.rows].sort((a, b) => b.abbr.length - a.abbr.length)
  const taken: [number, number][] = []
  const free = (i: number, n: number) => !taken.some(([s, e]) => i < e && i + n > s)
  for (const row of rows) {
    const re = new RegExp(rowRe(row).source, 'gu')
    for (const m of text.matchAll(re)) {
      if (maxStart !== undefined && m.index! > maxStart) continue
      if (row.kind === 'type' && (row.typ === 'dim' || row.typ === 'aug') && m.index! > 60) continue   // Желехівський: «dim.»/«aug.» say what the HEADWORD is only at the start of the article
      if (!free(m.index!, m[0].length)) continue
      taken.push([m.index!, m.index! + m[0].length])
      const key = `${row.kind}|${row.area ?? row.county ?? row.reg ?? row.typ}|${row.abbr}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ row, quote: slice(text, m.index!, m[0].length), resolved: resolveRow(row) })
    }
  }
  if (table.id === HRINCH_LABELS.id) {   // the list's generic rule: «<Stem>. у.» = <Stem>-ський повіт, for the counties the list does not print
    for (const m of text.matchAll(/(?<![\p{L}])([А-ЯІЇЄҐ][\p{L}']{2,11})\.\s?у\./gu)) {
      if (!free(m.index!, m[0].length)) continue
      const printed = rows.some(r => r.county && r.abbr.toLowerCase().startsWith(m[1]!.toLowerCase().slice(0, 4)) && rowRe(r).test(m[0]))
      if (printed) continue
      const c = countyByStem(m[1]!); if (!c) continue
      const key = `variant|${c[0]}`; if (seen.has(key)) continue
      seen.add(key)
      const row: DRow = R(m[0], 'Лубен. у. — Лубенскій у ѣ здъ', 'area', { county: c[0], scope: 'place' })
      out.push({ row, quote: slice(text, m.index!, m[0].length), resolved: resolveRow(row), variant: true })
    }
  }
  return out
}

const WORDRE = /[\p{L}́'’ʼ-]+/u
/** the word that ends right before index i (skipping spaces), stress marks kept */
const wordBefore = (t: string, i: number): string | undefined => {
  const m = /([\p{L}́'’ʼ-]{2,})\s*$/u.exec(t.slice(Math.max(0, i - 40), i)); return m?.[1]?.replace(/^-+|-+$/g, '')
}
/** the word that starts right after index i */
const wordAfter = (t: string, i: number): string | undefined => {
  const m = new RegExp(`^\\s*(${WORDRE.source})`, 'u').exec(t.slice(i, i + 40)); return m?.[1]?.replace(/^-+|-+$/g, '')
}

/**
 * LB-2 attach=after / before (ru→uk dictionaries): a label inside the brackets next to ONE Ukrainian equivalent.
 *  after   «нече́мний (Гал.)»  /  «ли́жва (Гал. С. Пар.)»  — the word before the opening bracket
 *  before  «(гал.) зафу́кати»  /  «(диал.) ту́рба (Шевч.)» — the word after the closing bracket
 * Labels outside brackets (running text, examples) are not read: they label an example sentence, not a word.
 */
export function scanBracketed(table: DTable, text: string): ArticleHit[] {
  const out: ArticleHit[] = [], seen = new Set<string>()
  for (const g of text.matchAll(/\(([^()]{1,40})\)/g)) {
    const inner = g[1]!
    for (const row of table.rows) {
      if (!new RegExp(`(?<![\\p{L}])${esc(row.abbr)}(?![\\p{L}])`, 'u').test(inner)) continue
      const w = table.attach === 'after' ? wordBefore(text, g.index!) : wordAfter(text, g.index! + g[0].length)
      if (!w || w.length < 2 || /^[0-9]/.test(w)) continue
      if (table.attach === 'before' && inner.trim() !== row.abbr && !inner.trim().startsWith(row.abbr)) continue
      const key = `${row.abbr}|${w}`; if (seen.has(key)) continue
      seen.add(key)
      out.push({ row, quote: slice(text, g.index!, g[0].length), resolved: resolveRow(row), word: w })
    }
  }
  return out
}

/** one wire hit from an article hit */
export function wireHit(table: DTable, h: ArticleHit, url: string): DictHit {
  const r = h.row, rs = h.resolved
  const v = r.kind === 'area' ? (rs.area ?? '') : r.kind === 'type' ? r.typ! : r.reg ?? ''
  return {
    t: table.id, a: h.variant ? h.row.abbr : r.abbr, kind: r.kind, v, q: h.quote.slice(0, 200), u: url,
    ...(r.kind === 'area' && rs.places[0] && (r.county || r.place) ? { place: rs.places[0] } : {}),
    ...(rs.gov ? { gq: rs.gov.quote } : {}),
    ...(r.scope === 'place' ? { p: true as const } : {}),
    ...(h.variant ? { variant: true as const } : {}),
    ...(h.word ? { w: h.word } : {}),
  }
}
export const tableById = (id: string): DTable | undefined => DICT_LABEL_TABLES.find(t => t.id === id)
