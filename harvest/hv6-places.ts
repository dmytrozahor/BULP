/**
 * SPEC 63 HV-6: county / governorate / comitat → region and ISO 3166-2 code, for the place of recording that an НТШ record states about itself
 * («Зап. 1908 р. в Зеленици, Надвірн. пов., від …»). The mapping goes from the COUNTY the record names (not from the village, never from the dialect of the text) to the region string
 * of pipelines/regions.ts and the modern oblast (ISO 3166-2:UA) in which the county seat lies today; counties outside Ukraine map to the historical territory (core/territories.ts) or,
 * where the regions table has none, keep the historical name and the ISO code of the modern country subdivision (RS-VO, RO-AR …), which the regions panel leaves out rather than guesses.
 * Sources of the county → oblast reading: the county seats' present administrative position (Ukrainian Wikipedia, «Повіти Королівства Галичини та Володимирії»); every row is a table claim, a record whose county is not in the table is NOT placed.
 * `stems`: lower-case prefixes of the county name as the footers print it (full «надвірнянського», abbreviated «надвірн.», «богородч.»); OCR tolerates one wrong letter in a stem of ≥ 6 letters.
 */
export interface PlaceRow { stems: string[]; name: string; region: string; iso: string[]; kind: 'powiat' | 'komitat' | 'huberniya' | 'region' }
const P = (name: string, region: string, iso: string, ...stems: string[]): PlaceRow => ({ name, region, iso: [iso], stems, kind: 'powiat' })
const G = 'Галичина'
export const PLACES: PlaceRow[] = [
  // Eastern Galicia (Austria) → Lviv UA-46 / Ivano-Frankivsk UA-26 / Ternopil UA-61
  P('Львів', G, 'UA-46', 'львів', 'львовськ'), P('Броди', G, 'UA-46', 'брід', 'бродськ', 'броди'), P('Бібрка', G, 'UA-46', 'бібрськ', 'бібрсь'), P('Добромиль', G, 'UA-46', 'добромильськ', 'добромил'),
  P('Дрогобич', G, 'UA-46', 'дрогобицьк', 'дрогобич'), P('Жидачів', G, 'UA-46', 'жидачів', 'жидач'), P('Жовква', G, 'UA-46', 'жовківськ', 'жовкв', 'жовківс'), P('Золочів', G, 'UA-46', 'золочівськ', 'золоч'),
  P('Камінка Струмилова', G, 'UA-46', 'камінк', 'кам\'янк', 'струмил'), P('Мостиська', G, 'UA-46', 'мостиськ', 'мостис'), P('Перемишляни', G, 'UA-46', 'перемишлянськ', 'перемишлян'),
  P('Рава Руська', G, 'UA-46', 'равськ', 'рава-рус', 'рава'), P('Радехів', G, 'UA-46', 'радехівськ', 'радехів'), P('Рудки', G, 'UA-46', 'рудецьк', 'рудки'), P('Самбір', G, 'UA-46', 'самбірськ', 'самбір'),
  P('Старий Самбір', G, 'UA-46', 'старосамбірськ', 'старосамб', 'старом', 'старомісьськ', 'старомістськ'), P('Сколе', G, 'UA-46', 'сколівськ', 'сколів', 'сколе'), P('Сокаль', G, 'UA-46', 'сокальськ', 'сокаль'),
  P('Стрий', G, 'UA-46', 'стрийськ', 'стрийс', 'стрий'), P('Турка', G, 'UA-46', 'турківськ', 'турк'), P('Яворів', G, 'UA-46', 'яворівськ', 'яворів'), P('Городок', G, 'UA-46', 'городоцьк', 'городок'),
  P('Богородчани', G, 'UA-26', 'богородчанськ', 'богородч'), P('Городенка', G, 'UA-26', 'городенківськ', 'городенк'), P('Долина', G, 'UA-26', 'долинськ', 'долин'), P('Калуш', G, 'UA-26', 'калуськ', 'калуш'),
  P('Коломия', G, 'UA-26', 'коломийськ', 'колом'), P('Косів', G, 'UA-26', 'косівськ', 'косів'), P('Надвірна', G, 'UA-26', 'надвірнянськ', 'надвірн', 'надв.'), P('Рогатин', G, 'UA-26', 'рогатинськ', 'рогатин'),
  P('Снятин', G, 'UA-26', 'снятинськ', 'снятин'), P('Тлумач', G, 'UA-26', 'тлумацьк', 'товмацьк', 'товмач', 'тлумач'), P('Станиславів', G, 'UA-26', 'станиславівськ', 'станиславів', 'станислав'),
  P('Бережани', G, 'UA-61', 'бережанськ', 'бережан'), P('Борщів', G, 'UA-61', 'борщівськ', 'борщів'), P('Бучач', G, 'UA-61', 'бучацьк', 'бучач'), P('Гусятин', G, 'UA-61', 'гусятинськ', 'гусятин'),
  P('Заліщики', G, 'UA-61', 'заліщицьк', 'заліщик', 'заліщ'), P('Збараж', G, 'UA-61', 'збаразьк', 'збараж'), P('Скалат', G, 'UA-61', 'скалатськ', 'скалат'), P('Теребовля', G, 'UA-61', 'теребовельськ', 'теребовл', 'теребов'),
  P('Тернопіль', G, 'UA-61', 'тернопільськ', 'тернопіл'), P('Підгайці', G, 'UA-61', 'підгаєцьк', 'підгайц'), P('Чортків', G, 'UA-61', 'чортківськ', 'чортків'), P('Зборів', G, 'UA-61', 'зборівськ', 'зборів'),
  P('Борщів-Копичинці', G, 'UA-61', 'копичинецьк'), P('Підволочиськ', G, 'UA-61', 'підволочиськ'),
  // Bukovyna (Austria, now Chernivtsi UA-77)
  P('Чернівці', 'Буковина', 'UA-77', 'чернівецьк', 'чернівц'), P('Вижниця', 'Буковина', 'UA-77', 'вижницьк', 'вижниц'), P('Заставна', 'Буковина', 'UA-77', 'заставнянськ', 'заставн'),
  P('Кіцмань', 'Буковина', 'UA-77', 'кіцманськ', 'кіцман'), P('Сторожинець', 'Буковина', 'UA-77', 'сторожинецьк', 'сторожин'), P('Герца', 'Буковина', 'UA-77', 'герцаївськ', 'герц'),
  P('Серет', 'Південна Буковина', 'RO-SV', 'серетськ', 'серет'), P('Радівці', 'Південна Буковина', 'RO-SV', 'радівецьк', 'радівц'), P('Вашківці', 'Буковина', 'UA-77', 'вашківц'), P('Сучава', 'Південна Буковина', 'RO-SV', 'сучавськ', 'сучав'), P('Кимполунг', 'Південна Буковина', 'RO-SV', 'кимполунг'),
  // West Galicia (now Poland): Lemko and San regions
  P('Горлиці', 'Лемківщина', 'PL-12', 'горлицьк', 'горлиц'), P('Новий Санч', 'Лемківщина', 'PL-12', 'новосандецьк', 'новосанч', 'новий санч', 'нов. санч'), P('Грибів', 'Лемківщина', 'PL-12', 'грибівськ', 'грибів'),
  P('Ясло', 'Лемківщина', 'PL-18', 'ясельськ', 'ясло'), P('Кросно', 'Лемківщина', 'PL-18', 'кросненськ', 'кросн'),
  P('Сянік', 'Надсяння', 'PL-18', 'сяніцьк', 'сяник', 'сянік', 'сяніц'), P('Перемишль', 'Надсяння', 'PL-18', 'перемиськ', 'перемишльськ', 'перемишл'), P('Ярослав', 'Надсяння', 'PL-18', 'ярославськ', 'ярослав'),
  P('Любачів', 'Надсяння', 'PL-18', 'любачівськ', 'любачів'), P('Ряшів', 'Надсяння', 'PL-18', 'ряшівськ', 'ряшів'), P('Ланьцут', 'Надсяння', 'PL-18', 'ланьцутськ', 'ланьцут'),
  P('Холм', 'Холмщина', 'PL-06', 'холмськ', 'холм'), P('Грубешів', 'Холмщина', 'PL-06', 'грубешівськ', 'грубешів'), P('Томашів', 'Холмщина', 'PL-06', 'томашівськ', 'томашів'),
  // Hungary (Uhorska Rus): Zakarpattia UA-21, Prešov region, Maramureș; Bačka and Banat are named, but the regions table has no row for them (left out of the panel)
  { name: 'Берег', region: 'Закарпаття', iso: ['UA-21'], stems: ['берегівськ', 'берез', 'берег'], kind: 'komitat' }, { name: 'Угоча', region: 'Закарпаття', iso: ['UA-21'], stems: ['угочанськ', 'угоцьк', 'угоч'], kind: 'komitat' },
  { name: 'Унґ', region: 'Закарпаття', iso: ['UA-21'], stems: ['унґварськ', 'унгварськ', 'унґськ', 'унг', 'унґ', 'ужанськ'], kind: 'komitat' }, { name: 'Мармарош', region: 'Мармарощина', iso: ['RO-MM'], stems: ['мармарошськ', 'мармарош', 'мараморош'], kind: 'komitat' },
  { name: 'Земплин', region: 'Пряшівщина', iso: ['SK-KI'], stems: ['земплинськ', 'земплин'], kind: 'komitat' }, { name: 'Шариш', region: 'Пряшівщина', iso: ['SK-PV'], stems: ['шаришськ', 'шариш'], kind: 'komitat' },
  { name: 'Спіш', region: 'Пряшівщина', iso: ['SK-PV'], stems: ['спішськ', 'спіш'], kind: 'komitat' }, { name: 'Абауй', region: 'Пряшівщина', iso: ['SK-KI'], stems: ['абауйськ', 'абауй'], kind: 'komitat' },
  { name: 'Бач-Бодрог', region: 'Бачка', iso: ['RS-VO'], stems: ['бач-бодроґ', 'бач-бодрог', 'бач-вод'], kind: 'komitat' },
  { name: 'Арад', region: 'Банат', iso: ['RO-AR'], stems: ['арадськ', 'арад'], kind: 'komitat' },
  // Russian Empire governorates (Dnieper Ukraine) → region / modern oblast
  { name: 'Київська губ.', region: 'Київщина', iso: ['UA-32', 'UA-30'], stems: ['київськ'], kind: 'huberniya' }, { name: 'Чернігівська губ.', region: 'Чернігівщина', iso: ['UA-74'], stems: ['чернигівськ', 'чернігівськ', 'черниг'], kind: 'huberniya' },
  { name: 'Полтавська губ.', region: 'Полтавщина', iso: ['UA-53'], stems: ['полтавськ', 'полтав'], kind: 'huberniya' }, { name: 'Харківська губ.', region: 'Слобожанщина', iso: ['UA-63'], stems: ['харківськ', 'харківщ'], kind: 'huberniya' },
  { name: 'Катеринославська губ.', region: 'Катеринославщина', iso: ['UA-12'], stems: ['катеринославськ'], kind: 'huberniya' }, { name: 'Херсонська губ.', region: 'Херсонщина', iso: ['UA-65', 'UA-48'], stems: ['херсонськ'], kind: 'huberniya' },
  { name: 'Подільська губ.', region: 'Поділля', iso: ['UA-05', 'UA-68'], stems: ['подільськ', 'поділл'], kind: 'huberniya' }, { name: 'Волинська губ.', region: 'Волинь', iso: ['UA-07', 'UA-56'], stems: ['волинськ', 'волин'], kind: 'huberniya' },
]

/** named regions that a footer may state instead of a county («на Поділлі», «у Полтавщині»); a stem is matched at a word start */
export const REGION_WORDS: PlaceRow[] = [
  { name: 'Полтавщина', region: 'Полтавщина', iso: ['UA-53'], stems: ['полтавщин'], kind: 'region' }, { name: 'Чернігівщина', region: 'Чернігівщина', iso: ['UA-74'], stems: ['чернігівщин'], kind: 'region' },
  { name: 'Київщина', region: 'Київщина', iso: ['UA-32', 'UA-30'], stems: ['київщин'], kind: 'region' }, { name: 'Поділля', region: 'Поділля', iso: ['UA-05', 'UA-68'], stems: ['поділл'], kind: 'region' },
  { name: 'Волинь', region: 'Волинь', iso: ['UA-07', 'UA-56'], stems: ['волин'], kind: 'region' }, { name: 'Слобожанщина', region: 'Слобожанщина', iso: ['UA-63'], stems: ['слобожанщин'], kind: 'region' },
  { name: 'Холмщина', region: 'Холмщина', iso: ['PL-06'], stems: ['холмщин'], kind: 'region' }, { name: 'Бачка', region: 'Бачка', iso: ['RS-VO'], stems: ['бачк'], kind: 'region' },
  { name: 'Банат', region: 'Банат', iso: ['RO-TM'], stems: ['банат'], kind: 'region' }, { name: 'Лемківщина', region: 'Лемківщина', iso: ['PL-12'], stems: ['лемківщин'], kind: 'region' },
]

/** an OCR-tolerant stem test: the token starts with the stem, or differs from it in at most one letter (stems of ≥ 6 letters only) */
export function stemMatch(token: string, stem: string): boolean {
  const t = token.toLowerCase().replace(/[.’ʼ`]/g, c => (c === '.' ? '' : "'")), s = stem.replace(/\.$/, '')
  if (t.startsWith(s)) return true
  if (s.length < 6 || t.length < s.length) return false
  let d = 0
  for (let i = 0; i < s.length && d < 2; i++) if (t[i] !== s[i]) d++
  return d <= 1
}
/** the unique row whose stem matches the token; an ambiguous token (two different rows) is not placed */
export function lookupCounty(token: string, rows: PlaceRow[] = PLACES): PlaceRow | null {
  const exact = new Set<PlaceRow>(), fuzzy = new Set<PlaceRow>()
  const t = token.toLowerCase()
  for (const r of rows) for (const s of r.stems) { if (t.startsWith(s.replace(/\.$/, ''))) exact.add(r); else if (stemMatch(token, s)) fuzzy.add(r) }
  if (exact.size === 1) return [...exact][0]!
  if (exact.size > 1) { const longest = [...exact].filter(r => r.stems.some(s => t.startsWith(s) && s.length >= 6)); return longest.length === 1 ? longest[0]! : null }
  return fuzzy.size === 1 ? [...fuzzy][0]! : null
}
// Russian Empire counties on Ukrainian ethnic land east of the state border: the Slobozhanshchyna territories of core/territories.ts
PLACES.push(
  { name: 'Білгородський пов.', region: 'Білгородщина', iso: ['RU-BEL'], stems: ['білгородськ', 'бєлгородськ', 'корочанськ', 'корочан', 'валуйськ', 'валуйк'], kind: 'powiat' },
  P('Лісько', 'Надсяння', 'PL-18', 'ліськ', 'лісько'),
)
