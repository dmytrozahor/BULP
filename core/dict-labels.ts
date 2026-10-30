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
  /** LB-8 Wiktionary: «Southwestern Ukrainian» = «Ukrainian as spoken in Western and Central Ukraine» (en.wiktionary category text) */ southwest: 'південно-західна Україна (захід і центр)',
  /** «Southeastern Ukrainian» = «Central, Southern (incl. Crimea), Eastern Ukraine» */ southeast: 'південно-східна Україна (центр, південь, схід)',
  /** LB-17 en.wiktionary «Central / Dnieper Ukraine» */ dnieper: 'центр України (Подніпров’я)', /** LB-17 en.wiktionary «Southern (incl. Crimea), Eastern Ukraine, and Russia» */ steppe: 'південь і схід (степ)',
  pokuttia: 'Покуття й Буковина', polissia: 'Полісся (західнополіський говір)',
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
/** sense = the label printed on a sense of a parsed dictionary row (СУМ); tag = an en.wiktionary sense tag; category = a uk.wiktionary category of the article */
export type Attach = 'article' | 'after' | 'before' | 'sense' | 'tag' | 'category'
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
    R('Н. Вол. у.', 'Н. Вол. у. — Новградъ-Волынскій у ѣ здъ.', 'area', { area: 'volyn', re: '[НH]\\.?\\s?-?\\s?Вол(?:ын)?(?:ск)?\\.\\s?у\\.' }),
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

// ── LB-8: label sources that are not read from r2u pages ──────────────────────────────────────────────────
const SUM_ARCH = 'https://archive.org/details/SUM-20'
/**
 * СУМ-20, том 1 (К.: Наукова думка, 2010), «СПИСОК ОСНОВНИХ УМОВНИХ СКОРОЧЕНЬ» (с. 61 ff.) and the «Ремарки» of the preface (§ 2.8); archive.org item SUM-20, file SUM-20_1_djvu.txt, read 2026-10-22.
 * The list prints exactly two labels that name a territory: «діал.» and «зах.»; «прост.» is "поширені на всій або значній території" (a register, not a region). Nothing else is regional.
 */
export const SUM20_LABELS: DTable = {
  id: 'sum20-labels', dicts: [], short: 'СУМ-20', source: 'SUM20', list: `${SUM_ARCH} (т. 1, «Список основних умовних скорочень», с. 61)`, attach: 'sense',
  rows: [
    R('діал.', 'діал. — діалектне слово (вислів). Ремарка діал. характеризує одиниці, які, зберігаючи свою територіально обмежену належність, уживаються в мові художньої літератури або в усно-розмовній мові осіб, що спілкуються літературною мовою', 'dialectal', { reg: 'dial' }),
    R('зах.', 'зах. — західноукраїнське слово (вислів). Ремарка зах. характеризує одиниці, що вживалися в західноукраїнській літературно-мовній практиці протягом 2 пол. ХІХ — 1-ї пол. ХХ ст. і які, не будучи вузькодіалектними, не ввійшли, однак, до загальноукраїнської літературної мови', 'area', { area: 'west' }),
  ],
}
/** СУМ-11, том 1 (К.: Наукова думка, 1970), «Основні умовні скорочення у словнику» and the preface § 28 («При діалектних словах подається позначка — діал.»); archive.org item bilodid_slovnyk_ukr_v11_tom_1, read 2026-10-22. */
export const SUM11_LABELS: DTable = {
  id: 'sum11-labels', dicts: [], short: 'СУМ-11', source: 'SUM11', list: 'https://archive.org/details/bilodid_slovnyk_ukr_v11_tom_1 (т. 1, «Список основних умовних скорочень у словнику»; передмова § 28)', attach: 'sense',
  rows: [
    R('діал.', 'діал. — діалектне слово. При діалектних словах подається позначка — діал.', 'dialectal', { reg: 'dial' }),
    R('зах.', 'зах. — західноукраїнське слово', 'area', { area: 'west' }),
  ],
}
/**
 * en.wiktionary context labels (kaikki data/raw/kaikki/uk.jsonl): the sense tags and categories that name a region, with the category page's own words (fetched 2026-10-22).
 * «regional» / «dialectal» name no region. Tag «Northern» (1 sense) and «Ukraine» (3) have no category text that says what they cover and are not read.
 */
export const KAIKKI_REGION: DTable = {
  id: 'kaikki-region', dicts: [], short: 'en.Вікісловник (kaikki)', source: 'KAIKKI', list: 'https://en.wiktionary.org/wiki/Category:Southwestern_Ukrainian (категорії «<регіон> Ukrainian»)', attach: 'tag',
  rows: [
    R('dialectal', 'dialectal — Of or relating to a dialect (Appendix:Glossary)', 'dialectal', { reg: 'dial' }),
    R('regional', 'Category:Regional Ukrainian — Categories containing terms in regional varieties of Ukrainian. … terms should be recategorized by the particular regional variety they belong to, or categorized as dialectal.', 'dialectal', { reg: 'dial' }),
    R('Southwestern', 'Category:Southwestern Ukrainian — Terms or senses in Ukrainian as spoken in Western and Central Ukraine. (label Southwestern, aliases Western, Western Ukraine)', 'area', { area: 'southwest' }),
    R('Western', 'Category:Southwestern Ukrainian — Terms or senses in Ukrainian as spoken in Western and Central Ukraine. (label Southwestern, aliases Western, Western Ukraine)', 'area', { area: 'southwest' }),
    R('Southeastern', 'Category:Southeastern Ukrainian — Terms or senses in Ukrainian as spoken in Central, Southern (incl. Crimea), Eastern Ukraine, and Russia (Belgorod, Voronezh, Rostov Oblast, Krasnodar Krai). (label Southeastern, aliases Eastern, Eastern Ukraine)', 'area', { area: 'southeast' }),
    R('Transcarpathian', 'Category:Transcarpathian Ukrainian — Terms or senses in Ukrainian as spoken in Transcarpathia region (Zakarpattia Oblast in Ukraine), and eastern Slovakia. (label Transcarpathian, alias Transcarpathia)', 'area', { area: 'zakarpattia' }),
    R('Slobozhan', 'Category:Slobozhan Ukrainian — Terms or senses in Ukrainian as spoken in Sloboda Ukraine (Sumy, Kharkiv, Luhansk Oblast), and Russia (Belgorod, Voronezh, Rostov Oblast). (label Slobozhan, alias Sloboda)', 'area', { area: 'slobozhanshchyna' }),
    R('Pokuttia–Bukovina', 'Category:Pokuttia–Bukovina Ukrainian — Terms or senses in Ukrainian as spoken in Western Ukraine. (label Pokuttia–Bukovina, aliases Bukovina, Bukovinian, Pokuttia, Pokuttian, Upper Prutian)', 'area', { area: 'pokuttia' }),
    // LB-17: three region categories that are in the dump but were not read (category pages fetched 2026-10-30)
    R('Dniestrian', 'Category:Dniestrian Ukrainian — Terms or senses in Ukrainian as spoken in Western Ukraine. (label Dniestrian; aliases Galicia, Galician, Opillia, Opillian)', 'area', { area: 'west' }),
    R('Middle Dnieprian', 'Category:Middle Dnieprian Ukrainian — Terms or senses in Ukrainian as spoken in Central / Dnieper Ukraine. (label Middle Dnieprian)', 'area', { area: 'dnieper' }),
    R('Steppe', 'Category:Steppe Ukrainian — Terms or senses in Ukrainian as spoken in Southern (incl. Crimea), Eastern Ukraine, and Russia (Rostov Oblast, Krasnodar Krai). (label Steppe)', 'area', { area: 'steppe' }),
  ],
}
/** en.wiktionary categories of a sense that carry no tag (Transcarpathian, Slobozhan, Pokuttia–Bukovina senses have an empty tag list) → the label of KAIKKI_REGION that produces the category */
export const KAIKKI_CATEGORY_TAG: Record<string, string> = {
  'Southwestern Ukrainian': 'Southwestern', 'Southeastern Ukrainian': 'Southeastern', 'Transcarpathian Ukrainian': 'Transcarpathian', 'Slobozhan Ukrainian': 'Slobozhan',
  'Pokuttia–Bukovina Ukrainian': 'Pokuttia–Bukovina', 'Regional Ukrainian': 'regional', 'Dniestrian Ukrainian': 'Dniestrian', 'Middle Dnieprian Ukrainian': 'Middle Dnieprian', 'Steppe Ukrainian': 'Steppe',
}
/** uk.wiktionary categories of the article (harvest: pipelines/usage-wikt.ts, core/usage.ts WIKT_CATEGORIES). The category NAME is the quote; the area is the one the name states. */
export const WIKTUK_REGION: DTable = {
  id: 'wiktuk-region', dicts: [], short: 'uk.Вікісловник', source: 'WIKTUK', list: 'https://uk.wiktionary.org/wiki/Категорія:Західноукраїнський_діалект (категорії статей)', attach: 'category',
  rows: [
    R('Діалектні вирази', 'Категорія:Діалектні вирази — діалектне слово, регіон не названо', 'dialectal', { reg: 'dial' }),
    R('Діалектизми', 'Категорія:Діалектизми — діалектне слово, регіон не названо', 'dialectal', { reg: 'dial' }),
    R('Західноукраїнський діалект', 'Категорія:Західноукраїнський діалект', 'area', { area: 'west' }),
    R('Західноукраїнські слова', 'Категорія:Західноукраїнські слова', 'area', { area: 'west' }),
    R('Західноукраїнські слова, що потрапили до словників літературної мови', 'Категорія:Західноукраїнські слова, що потрапили до словників літературної мови', 'area', { area: 'west' }),
    R('Західнополіський говір', 'Категорія:Західнополіський говір', 'area', { area: 'polissia' }),
    R('Закарпатський говір', 'Категорія:Закарпатський говір', 'area', { area: 'zakarpattia' }),
    R('Лемківські вирази', 'Категорія:Лемківські вирази', 'area', { area: 'lemko' }),
  ],
}
/** LB-11: Аркушин Г., «Словник західнополіських говірок» (Луцьк: Вежа, 2000), preface «Структура словникової статті» / «Реєстр словника»: a differential dialect dictionary, every article is a dialect word recorded in the villages of its list. */
export const ARKUSHYN_LABELS: DTable = {
  id: 'arkushyn-labels', dicts: [], short: 'Аркушин (2000)', source: 'ARKUSHYN', list: 'https://archive.org/details/slzhdplhv (т. 1, «Реєстр словника», «Структура словникової статті», «Список населених пунктів»)', attach: 'sense',
  rows: [
    R('зпол.', 'Словник західнополіських говірок — «диференційного типу: у ньому вміщені слова, відсутні в сучасній українській літературній мові»; записи зроблені у понад півтисячі населених пунктів (Волинь, Рівненщина, Берестейщина, Піншина, південне Підляшшя, Холмщина)', 'area', { area: 'polissia' }),
  ],
}

/**
 * LB-16: Грінченко's own «Список источников» (т. 1, 1907; archive.org item slovarukrainskog01hrin, file slovarukrainskog01hrin_djvu.txt, read 2026-10-30; the OCR spellings «Галищи» → «Галичи» are corrected, nothing else).
 * A citation «Вх. Лем. 425» in an article names a source whose OWN list entry states the locality of its words. Only sources whose entry names ONE region are read (Гол., Гол. Од., Грин., ЕЗ., Мнж. name two or more
 * and are not read; authors' literary works are not read). «Вх. Лем.» and «Вх. Уг.» are word-lists («Словарець») of a named dialect: they mark the word dialectal; the others are a regional collection and record only
 * WHERE the word was noted (scope place). The citation must carry a page or a volume + page, so a bare «Вас.» (a person's name) is not read.
 */
export const HRINCH_SOURCES: DTable = {
  id: 'hrinch-sources', dicts: [12, 18], short: 'Грінченко (список джерел)', source: 'HRINCH', list: 'https://archive.org/details/slovarukrainskog01hrin (т. 1, «Список источников»)', attach: 'article',
  rows: [
    R('Вх. Лем.', 'Вх. Лем. = «Словарець», приложенный къ книгѣ И. Верхратскаго: «Про говор галицких лемків». Л. 1902.', 'area', { area: 'lemko', re: 'Вх\\.\\s?Лем\\.\\s?\\d' }),
    R('Вх. Уг.', 'Вх. Уг. = „Словарець“, приложенный къ статьѣ И. Верхратскаго: „Знадоби для знання угорскоруских говорів“. (Записки Наукового Товариства імені Шевченка, т. XLV, 1902).', 'area', { area: 'zakarpattia', re: 'Вх\\.\\s?Уг\\.\\s?\\d' }),
    R('Вх. Зн.', 'Вх. Зн. = Знадоби до словаря южноруского. Написав Иван Верхратский. Л. 1877. Былъ только первый выпускъ. Слова преимущественно изъ Галичи и немного изъ Буковины и Угор. Руси.', 'area', { area: 'halychyna', scope: 'place', re: 'Вх\\.\\s?Зн\\.\\s?\\d' }),
    R('Шух.', 'Шух. = Гуцульщина. Написав Проф. Володимир Шухевич. 2 части. Л. 1899,', 'area', { area: 'hutsul', scope: 'place', re: 'Шух\\.\\s?(?:[IІV]+\\.\\s?)?\\d' }),
    R('Фр. Пр.', 'Фр. Пр. = Галицько-руські народні приповідки. Зібрав, упорядкував і пояснив Д-р Іван Франко. Вип. 1. (А—Вишкріб) [т. X-й „Етнографічного збірника“ Наук. т-ва ім. Шевченка]. Л. 1901.', 'area', { area: 'halychyna', scope: 'place', re: 'Фр\\.\\s?Пр\\.\\s?\\d' }),
    R('Гн.', 'Гн. = Галицько-руські народні легенди. Зібрав Володимир Гнатюк. Тт. I и II. Л. 1902.', 'area', { area: 'halychyna', scope: 'place', re: 'Гн\\.\\s?(?:[IІV]+\\.\\s?)?\\d' }),
    R('Вас.', 'Вас. = В. И. Василенко. Этнографическіе матеріалы, собранные по Полтавской губ. Опытъ толковаго словаря народной технической терминологіи по Полтавской губ.', 'area', { area: 'poltavshchyna', scope: 'place', re: '(?:В\\.\\s?)?Вас\\.\\s?\\d' }),
    R('Мил.', 'Мил. = В. П. Милорадовичъ. Народные обряды и пѣсни Лубенскаго уѣзда, Полтавской губ., записанные въ 1888—1895 г.', 'area', { county: 'Лубенський', scope: 'place', re: 'Мил\\.(?:\\s?(?:М|Св)\\.)?\\s?\\d' }),
  ],
}
export const EXTRA_LABEL_TABLES: DTable[] = [SUM11_LABELS, SUM20_LABELS, KAIKKI_REGION, WIKTUK_REGION, ARKUSHYN_LABELS, HRINCH_SOURCES]
/** the row of a table for a label as the source prints it (a trailing «/uk» of a uk.wiktionary category is ignored) */
export const extraRow = (t: DTable, label: string): DRow | undefined => t.rows.find(r => r.abbr === label.replace(/\/uk$/, ''))
export const tableOfDict = (dict: number): DTable | undefined => DICT_LABEL_TABLES.find(t => t.dicts.includes(dict))
/** LB-16: every table read from the articles of one r2u dictionary (its list of abbreviations + the tables of other lists of the same dictionary, e.g. Грінченко's list of sources) */
export const tablesOfDict = (dict: number): DTable[] => [...DICT_LABEL_TABLES, ...EXTRA_LABEL_TABLES].filter(t => t.dicts.includes(dict))

/** an abbreviation of a table, with the area it names resolved */
export interface Resolved { area?: string; places: string[]; gov?: { name: string; title: string; quote: string }; group: GazRow[] }

const NORM = (s: string) => s.normalize('NFC').toLowerCase().replace(/[ьъ'’ʼ`́-]/g, '').replace(/ё/g, 'е').replace(/[иіїѣеє]/g, 'і').replace(/ґ/g, 'г')
const countyBase = (adj: string) => NORM(adj.replace(/(ський|цький|зький)$/, ''))

/** the county row for an adjective (exact) */
export const countyOf = (adj: string) => COUNTIES.find(c => c[0] === adj)
/** the county that an unlisted stem («Звен.») names: the unique county whose normalised base starts with the stem (≥ 3 letters), else undefined */
export function countyByStem(stem: string): (typeof COUNTIES)[number] | undefined {
  const s = NORM(stem.replace(/\.$/, '')); if (s.length < 3) return undefined
  // LB-17: the stem may keep the county's own «ц»/«з» («Козелец. у.» for Козелецький), which countyBase strips with the ending
  const hit = COUNTIES.filter(c => countyBase(c[0]).startsWith(s) || NORM(c[0].replace(/(ський|ький)$/, '')).startsWith(s))
  const gov = new Set(hit.map(h => h[1]))
  return hit.length === 1 || (hit.length > 1 && gov.size === 1 && hit.every(h => h[0] === hit[0]![0])) ? hit[0] : undefined
}
/**
 * LB-17: the Russian adjectives that Грінченко's own list of abbreviations prints for a county / governorate («Камен. у. — Каменецкій у ѣ здъ»). The articles cut the same name differently («Каменец. у.»,
 * «Екатериносл. у.», «Кіев. г.», «Міус. окр.»). Such a stem is read as the listed row ONLY when it is a prefix (≥ 4 letters) of the adjective the list prints for exactly one target and the abbreviation starts like it.
 */
const RU_ADJ = /[А-ЯІ][а-яіѣ]{3,}(?:скій|цкій|ской|ская|ній)/g
const KIND_END: Record<string, string> = { у: ' у.', г: ' г.', окр: ' окр.', обл: ' обл.', об: ' об.' }
export function listStemRow(stem: string, kind: string): DRow | undefined {
  const s = NORM(stem); if (s.length < 4 || !KIND_END[kind]) return undefined
  const hit = new Map<string, DRow>()
  for (const r of HRINCH_LABELS.rows) {
    if (!r.abbr.endsWith(KIND_END[kind]!) || !(r.county || r.area || r.place)) continue
    const head = NORM(r.abbr).slice(0, 3)
    for (const adj of r.meaning.match(RU_ADJ) ?? []) {
      const a = NORM(adj)
      if (a.startsWith(s) && a.slice(0, 3) === head) { hit.set(r.county ?? r.area ?? r.place ?? r.abbr, r); break }
    }
  }
  return hit.size === 1 ? [...hit.values()][0] : undefined
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
    for (const m of text.matchAll(/(?<![\p{L}])([А-ЯІЇЄҐ][\p{L}']{2,13})\.\s?(у|г|окр|обл|об)\./gu)) {
      if (!free(m.index!, m[0].length)) continue
      const kind = m[2]!
      const printed = rows.some(r => r.county && r.abbr.toLowerCase().startsWith(m[1]!.toLowerCase().slice(0, 4)) && rowRe(r).test(m[0]))
      if (printed) continue
      // LB-17: a longer or differently cut stem of an abbreviation the list PRINTS («Каменец. у.» for «Камен. у. — Каменецкій у ѣ здъ») is read as that list row
      const lr = listStemRow(m[1]!, kind)
      if (lr) {
        const key = `variant|list|${lr.county ?? lr.area ?? lr.place}|${kind}`; if (seen.has(key)) continue
        seen.add(key); taken.push([m.index!, m.index! + m[0].length])
        const row: DRow = { ...lr, abbr: m[0], meaning: `${m[0]} — as «${lr.abbr}» of the list: ${lr.meaning}`, scope: 'place' }
        out.push({ row, quote: slice(text, m.index!, m[0].length), resolved: resolveRow(row), variant: true })
        continue
      }
      if (kind !== 'у') continue
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
export const tableById = (id: string): DTable | undefined => [...DICT_LABEL_TABLES, ...EXTRA_LABEL_TABLES].find(t => t.id === id)
