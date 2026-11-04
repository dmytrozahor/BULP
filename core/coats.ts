/**
 * SPEC 63 DB-1 — the places a word is said to come from, as MARKS on the map, and the coats of arms that stand for them. Pure: no node or DOM imports.
 *
 * > owner 2026-11-04: «на мапі позначай це гербом області / міста / регіону з якого лема буцімто походить»
 *
 * Level = the smallest the evidence supports: a SETTLEMENT when a source names one and we have its arms, else the OBLAST, else the historical REGION. A region with no authentic arms
 * gets a plain labelled marker in the dialect's colour (never an invented or hand-drawn arms). A file is used only if data/coats/SOURCES.json has a row for it with `ok` and a free licence;
 * the map's «Джерела» prints that row. The anchors are drawing aids [P] (a point inside the area), not borders.
 */
export type ArmsLevel = 'settlement' | 'oblast' | 'region'
export interface MarkArea {
  key: string; name: string; level: ArmsLevel
  /** [lon, lat] of the marker */ anchor: [number, number]
  /** id of the coat (public/coats/<id>.svg, a row of data/coats/SOURCES.json) */ coat?: string
  /** dialect group code (core/rules.ts DIALECTS) the area belongs to, where the AC-2 gazetteer names it */ code?: string
  /** the arms are the oblast's, standing for a historical region of the same name: the tooltip says so */ viaOblast?: string
}
const A = (key: string, name: string, level: ArmsLevel, anchor: [number, number], x: Partial<MarkArea> = {}): MarkArea => ({ key, name, level, anchor, ...x })
const OB = (iso: string) => `oblast-${iso}`, CITY = (id: string) => `city-${id}`

/** oblast ISO 3166-2:UA → the English name Commons titles the oblast's coat of arms with, the Ukrainian name, a point inside */
export const OBLASTS: Record<string, { uk: string; en: string; anchor: [number, number] }> = {
  'UA-05': { uk: 'Вінницька область', en: 'Vinnytsia', anchor: [28.5, 49.2] }, 'UA-07': { uk: 'Волинська область', en: 'Volyn', anchor: [25.3, 51.1] },
  'UA-12': { uk: 'Дніпропетровська область', en: 'Dnipropetrovsk', anchor: [35, 48.5] }, 'UA-14': { uk: 'Донецька область', en: 'Donetsk', anchor: [37.8, 48.1] },
  'UA-18': { uk: 'Житомирська область', en: 'Zhytomyr', anchor: [28.4, 50.7] }, 'UA-21': { uk: 'Закарпатська область', en: 'Zakarpattia', anchor: [23.2, 48.6] },
  'UA-23': { uk: 'Запорізька область', en: 'Zaporizhzhia', anchor: [35.4, 47.3] }, 'UA-26': { uk: 'Івано-Франківська область', en: 'Ivano-Frankivsk', anchor: [24.7, 48.9] },
  'UA-32': { uk: 'Київська область', en: 'Kyiv', anchor: [30.6, 50.2] }, 'UA-35': { uk: 'Кіровоградська область', en: 'Kirovohrad', anchor: [32.3, 48.6] },
  'UA-44': { uk: 'Луганська область', en: 'Luhansk', anchor: [39.1, 48.9] }, 'UA-46': { uk: 'Львівська область', en: 'Lviv', anchor: [23.9, 49.7] },
  'UA-48': { uk: 'Миколаївська область', en: 'Mykolaiv', anchor: [31.8, 47.4] }, 'UA-51': { uk: 'Одеська область', en: 'Odesa', anchor: [30.3, 46.6] },
  'UA-53': { uk: 'Полтавська область', en: 'Poltava', anchor: [34.3, 49.7] }, 'UA-56': { uk: 'Рівненська область', en: 'Rivne', anchor: [26.3, 50.8] },
  'UA-59': { uk: 'Сумська область', en: 'Sumy', anchor: [34.3, 50.9] }, 'UA-61': { uk: 'Тернопільська область', en: 'Ternopil', anchor: [25.6, 49.4] },
  'UA-63': { uk: 'Харківська область', en: 'Kharkiv', anchor: [36.4, 49.6] }, 'UA-65': { uk: 'Херсонська область', en: 'Kherson', anchor: [33.2, 46.7] },
  'UA-68': { uk: 'Хмельницька область', en: 'Khmelnytskyi', anchor: [26.9, 49.4] }, 'UA-71': { uk: 'Черкаська область', en: 'Cherkasy', anchor: [31.9, 49.2] },
  'UA-73': { uk: 'Чернівецька область', en: 'Chernivtsi', anchor: [25.9, 48.3] }, 'UA-74': { uk: 'Чернігівська область', en: 'Chernihiv', anchor: [31.6, 51.4] },
  'UA-43': { uk: 'Автономна Республіка Крим', en: 'Crimea', anchor: [34.1, 45.1] },
}
/** settlements of the witness-place register (core/witness-place.ts) whose arms are fetched: id → names and a point */
export const CITIES: Record<string, { uk: string; en: string; anchor: [number, number] }> = {
  kyiv: { uk: 'Київ', en: 'Kyiv', anchor: [30.52, 50.45] }, lviv: { uk: 'Львів', en: 'Lviv', anchor: [24.03, 49.84] }, kharkiv: { uk: 'Харків', en: 'Kharkiv', anchor: [36.23, 49.99] },
  odesa: { uk: 'Одеса', en: 'Odesa', anchor: [30.73, 46.48] }, chernihiv: { uk: 'Чернігів', en: 'Chernihiv', anchor: [31.29, 51.5] }, poltava: { uk: 'Полтава', en: 'Poltava', anchor: [34.55, 49.59] },
  'ivano-frankivsk': { uk: 'Івано-Франківськ', en: 'Ivano-Frankivsk', anchor: [24.71, 48.92] }, ternopil: { uk: 'Тернопіль', en: 'Ternopil', anchor: [25.59, 49.55] },
  lutsk: { uk: 'Луцьк', en: 'Lutsk', anchor: [25.34, 50.75] }, chernivtsi: { uk: 'Чернівці', en: 'Chernivtsi', anchor: [25.94, 48.29] }, uzhhorod: { uk: 'Ужгород', en: 'Uzhhorod', anchor: [22.29, 48.62] },
  kolomyia: { uk: 'Коломия', en: 'Kolomyia', anchor: [25.04, 48.53] },
}
const ob = (key: string, iso: string, name?: string, x: Partial<MarkArea> = {}): MarkArea => A(key, name ?? OBLASTS[iso]!.uk, 'oblast', OBLASTS[iso]!.anchor, { coat: OB(iso), ...x })
const reg = (key: string, iso: string, name: string, x: Partial<MarkArea> = {}): MarkArea => ob(key, iso, name, { level: 'region', viaOblast: OBLASTS[iso]!.uk.replace(/а область$/, 'ої області').replace(/ий край$/, 'ого краю'), ...x })
export const MARKS: MarkArea[] = [
  // historical regions with no authentic arms of their own: a plain labelled marker (never an invented coat)
  A('halychyna', 'Галичина', 'region', [24.5, 49.4], { code: 'NDN' }), A('hutsul', 'Гуцульщина', 'region', [24.8, 48.4], { code: 'HUT' }), A('boiko', 'Бойківщина', 'region', [23.4, 49.1], { code: 'BOY' }),
  A('lemko', 'Лемківщина', 'region', [21.9, 49.4], { code: 'LEM' }), A('podillia', 'Поділля', 'region', [28.0, 49.0], { code: 'POD' }), A('polissia', 'Полісся (західне)', 'region', [26.0, 51.3], { code: 'WPL' }),
  A('pokuttia', 'Покуття', 'region', [25.2, 48.6], { code: 'PKB' }), A('nadsiannia', 'Надсяння', 'region', [22.6, 49.7], { code: 'SYAN' }), A('slobozhanshchyna', 'Слобожанщина', 'region', [36.6, 49.8], { code: 'SLB' }),
  A('steppe', 'Степ (Нижня Наддніпрянщина)', 'region', [34.5, 47.3], { code: 'STP' }), A('livoberezhzhia', 'Лівобережжя', 'region', [32.6, 50.4]), A('tavria', 'Таврія', 'region', [34.4, 46.3]),
  A('don', 'Донщина', 'region', [39.5, 48.2]), A('kuban', 'Кубань', 'region', [38.8, 45.2]), A('bessarabia', 'Бессарабія', 'region', [29.6, 46.0]), A('kholm', 'Холмщина', 'region', [23.4, 51.1]),
  // regions that coincide with one oblast: the oblast's arms, and the tooltip says so
  reg('volyn', 'UA-07', 'Волинь', { code: 'VOL' }), reg('zakarpattia', 'UA-21', 'Закарпаття', { code: 'ZAK' }), reg('bukovyna', 'UA-73', 'Буковина', { code: 'PKB' }),
  reg('kyivshchyna', 'UA-32', 'Київщина'), reg('poltavshchyna', 'UA-53', 'Полтавщина', { code: 'MDN' }), reg('chernihivshchyna', 'UA-74', 'Чернігівщина', { code: 'CHN' }), reg('sumshchyna', 'UA-59', 'Сумщина'),
  reg('khersonshchyna', 'UA-65', 'Херсонщина'), reg('katerynoslavshchyna', 'UA-12', 'Катеринославщина'), reg('zaporizhzhia', 'UA-23', 'Запоріжжя'), reg('odeshchyna', 'UA-51', 'Одещина'),
  reg('cherkashchyna', 'UA-71', 'Черкащина'), reg('donechchyna', 'UA-14', 'Донеччина'), reg('luhanshchyna', 'UA-44', 'Луганщина'), reg('kirovohradshchyna', 'UA-35', 'Кіровоградщина'),
  ...['UA-46', 'UA-26', 'UA-61', 'UA-63', 'UA-68', 'UA-05', 'UA-56', 'UA-18', 'UA-48', 'UA-43'].map(iso => ob(OB(iso), iso)),
  ...Object.entries(CITIES).map(([id, c]) => A(CITY(id), c.uk, 'settlement', c.anchor, { coat: CITY(id) })),
]
export const markByKey: Record<string, MarkArea> = Object.fromEntries(MARKS.map(m => [m.key, m]))

/** dictionary area id (core/dict-labels.ts AREAS) and corpus region code (pipelines/regions.ts) → mark key; an id not listed has no point on the map (west, east, southwest …) */
const ALIAS: Record<string, string> = {
  halychyna: 'halychyna', hutsul: 'hutsul', lemko: 'lemko', zakarpattia: 'zakarpattia', bukovyna: 'bukovyna', volyn: 'volyn', podillia: 'podillia', kyivshchyna: 'kyivshchyna', kyiv: 'kyivshchyna',
  poltavshchyna: 'poltavshchyna', slobozhanshchyna: 'slobozhanshchyna', chernihivshchyna: 'chernihivshchyna', sumshchyna: 'sumshchyna', katerynoslavshchyna: 'katerynoslavshchyna',
  khersonshchyna: 'khersonshchyna', tavria: 'tavria', tavriia: 'tavria', bessarabia: 'bessarabia', don: 'don', kuban: 'kuban', livoberezhzhia: 'livoberezhzhia', lower_dnipro: 'steppe', steppe: 'steppe',
  pokuttia: 'pokuttia', polissia: 'polissia', zaporizhzhia: 'zaporizhzhia', odeshchyna: 'odeshchyna', cherkashchyna: 'cherkashchyna', donechchyna: 'donechchyna', luhanshchyna: 'luhanshchyna',
  kirovohradshchyna: 'kirovohradshchyna', kholm: 'kholm', nadsiannia: 'nadsiannia',
}
export const markKeyOf = (areaId: string): string | undefined => ALIAS[areaId]
/** the mark of a dialect GROUP, when only the group is known (BOY → Бойківщина …); the macro-dialects (NORTH, SE, SW) have no point */
export const GROUP_MARK: Record<string, string> = { BOY: 'boiko', HUT: 'hutsul', LEM: 'lemko', NDN: 'halychyna', ZAK: 'zakarpattia', POD: 'podillia', VOL: 'volyn', WPL: 'polissia', CHN: 'chernihivshchyna', MDN: 'poltavshchyna', SLB: 'slobozhanshchyna', STP: 'steppe', PKB: 'pokuttia', SYAN: 'nadsiannia' }
/** the mark of a settlement of the witness-place register (core/witness-place.ts id) */
export const settlementMark = (placeId: string): MarkArea | undefined => markByKey[CITY(placeId)]

// ── the coats ────────────────────────────────────────────────────────────────────────────────────────
export interface CoatTarget { id: string; area: string; level: ArmsLevel; /** Commons search (File: namespace), used when no file is listed */ query: string; accept: RegExp; /** Commons file names to try in order (chosen by hand from the search results: the official arms of THIS oblast or city, smaller variants first) */ files?: string[] }
const accept = (en: string) => { const w = en.split('-')[0]!; return new RegExp(`${w}.*(arms|COA)|(arms|COA).*${w}`, 'i') }
/** reviewed against the Commons search lists of 2026-11-04: titles that name the oblast or the city itself, never a village, raion, Soviet or occupation-era arms */
export const COAT_FILES: Record<string, string[]> = {
  'oblast-UA-05': ['Coat of Arms of Vinnytsia Oblast.svg'],
  'oblast-UA-07': ['Coat of Arms of Volyn Oblast.svg'],
  'oblast-UA-12': ['Smaller Coat of arms of Dnipropetrovsk Oblast.svg', 'Middle Coat of Arms of Dnipropetrovsk Oblast.svg'],
  'oblast-UA-14': ['Lesser Coat of Arms of Donetsk Oblast.svg', 'Coat of Arms of Donetsk Oblast.svg'],
  'oblast-UA-18': ['Coat of Arms of Zhytomyr Oblast m.svg', 'Coat of Arms of Zhytomyr Oblast (lesser).svg', 'Coat of Arms of Zhytomyr Oblast.svg'],
  'oblast-UA-21': ['Coat of arms of Zakarpattia Oblast.svg'],
  'oblast-UA-23': ['Coat of arms of Zaporizhia Oblast m.svg', 'Coat of arms of Zaporizhia Oblast.svg'],
  'oblast-UA-26': ['Coat of Arms of Ivano-Frankivsk Oblast.svg'],
  'oblast-UA-32': ['Coat of Arms of Kiev Oblast.svg', 'COA of Kyiv Oblast m.svg'],
  'oblast-UA-35': ['Coat of Arms of Kirovohrad Oblast m.svg', 'Coat of Arms of Kirovohrad Oblast.svg'],
  'oblast-UA-44': ['Coat of Arms Luhansk Oblast m.svg', 'Coat of Arms Luhansk Oblast.svg'],
  'oblast-UA-46': ['Coat of Arms of Lviv Oblast.svg'],
  'oblast-UA-48': ['Coat of Arms of Mykolaiv Oblast m.svg', 'Coat of Arms of Mykolaiv Oblast.svg'],
  'oblast-UA-51': ['Coat of Arms of Odesa Oblast m.svg', 'Coat of Arms of Odesa Oblast.svg'],
  'oblast-UA-53': ['Coat of Arms of Poltava Oblast.svg'],
  'oblast-UA-56': ['Coat of Arms of Rivne Oblast m.svg', 'Coat of Arms of Rivne Oblast.svg'],
  'oblast-UA-59': ['Coat of Arms of Sumy Oblast.svg'],
  'oblast-UA-61': ['Coat of Arms of Ternopil Oblast m.svg', 'Coat of Arms of Ternopil Oblast.svg'],
  'oblast-UA-63': ['Coat of Arms of Kharkiv Oblast.svg', 'COA of Kharkiv Oblast.svg'],
  'oblast-UA-65': ['Coat of Arms of Kherson Oblast m.svg', 'Coat of Arms of Kherson Oblast.svg'],
  'oblast-UA-68': ['Coat of Arms of Khmelnytskyi Oblast m.svg', 'Coat of Arms of Khmelnytskyi Oblast.svg'],
  'oblast-UA-71': ['Coat of Arms of Cherkasy Oblast m.svg', 'Coat of Arms of Cherkasy Oblast.svg'],
  'oblast-UA-73': ['Coat of Arms of Chernivtsi Oblast m.svg', 'Coat of Arms of Chernivtsi Oblast.svg'],
  'oblast-UA-74': ['Coat of Arms of Chernihiv Oblast.svg'],
  'oblast-UA-43': ['Lesser CoA of Crimea.svg', 'Coat of arms of Crimea.svg'],
  'city-kyiv': ['Coat of Arms of Kyiv.svg', 'Coat of Arms of Kiev.svg', 'COA of Kyiv Kurovskyi.svg'],
  'city-lviv': ['Coat of arms of Lviv.svg'],
  'city-kharkiv': ['Coat of arms of Kharkiv.svg'],
  'city-odesa': ['Coat of Arms of Odesa.svg'],
  'city-chernihiv': ['Coat of Arms of Chernihiv.svg'],
  'city-poltava': ['Poltava coat.svg'],
  'city-ivano-frankivsk': ['Coat of Arms of Ivano-Frankivsk (lesser).svg', 'Coat of Arms of Ivano-Frankivsk (greater).svg'],
  'city-ternopil': ['Coat of arms of Ternopil.svg'],
  'city-lutsk': ['Herb Lutsk.svg'],
  'city-chernivtsi': ['Coat of arms of Chernivtsi.svg'],
  'city-uzhhorod': ['Coat of arms of Uzhhorod.svg'],
  'city-kolomyia': ['Coat of Arms of Kolomyia.svg'],
}
export const COAT_TARGETS: CoatTarget[] = [
  ...Object.entries(OBLASTS).map(([iso, o]): CoatTarget => ({ id: OB(iso), area: iso, level: 'oblast', query: `Coat of arms of ${o.en} Oblast`, accept: accept(o.en), files: COAT_FILES[OB(iso)] })),
  ...Object.entries(CITIES).map(([id, c]): CoatTarget => ({ id: CITY(id), area: id, level: 'settlement', query: `Coat of arms of ${c.en}`, accept: accept(c.en), files: COAT_FILES[CITY(id)] })),
]
/** a row of data/coats/SOURCES.json */
export interface CoatSource { id: string; area: string; level: ArmsLevel; ok: boolean; why?: string; file?: string; page?: string; author?: string; licence?: string; licenceUrl?: string; bytes?: number; checked: string }
export type CoatSources = Record<string, CoatSource>
/** a coat may be shown only with a usable row: fetched, with a licence and a description page (printed in «Джерела») */
export const coatUsable = (id: string | undefined, src: CoatSources | undefined): boolean => !!id && !!src?.[id]?.ok && !!src[id]!.licence && !!src[id]!.page
export const coatUrl = (id: string) => `./coats/${id}.svg`
