/**
 * SPEC 63 MP-1/MP-2: historical / ethnographic Ukrainian territories outside today's state borders, drawn on the region map (src/components/RegionMap.vue).
 * Pure: no node or DOM imports. Geometry lives in public/geo/historical.json (built by public/geo/build-historical.mjs from Natural Earth, public domain).
 *
 * The EXTENT of every territory is what the cited ethnographic source says in words (`src`, verbatim quote + locator, IEU = Internet Encyclopedia of Ukraine,
 * i.e. Енциклопедія українознавства / Encyclopedia of Ukraine). The drawn polygon is an admin-1 unit (optionally clipped to a lat/lon box) that APPROXIMATES
 * that description — a project choice [P], stated per row in `unit`; it is a drawing aid, not a border claim. Quotes keep the entry's wording; only the
 * spaces the page's markup put before punctuation were removed.
 * A territory is a WITNESS region (a place of writing/printing, SPEC 20 B-3.6), never a dialect claim. Its dialect group comes ONLY from the AC gazetteer
 * (core/autolabel.ts) through `gazName`, which is set only where a source states that the territory belongs to that area (AC-2); otherwise the group is unknown.
 */
import { Q, type Evidence } from './evidence.ts'
import { gazEvidence, gazetteerRows, type GazRow } from './autolabel.ts'

export interface TerritoryUnit { adm0: string; name: string; /** [lon0, lat0, lon1, lat1] — keep only the part of the unit the source calls Ukrainian */ clip?: [number, number, number, number] }
export interface Territory {
  /** witness-region code in the corpus (pipelines/regions.ts) */
  id: string
  /** polygon code in public/geo/historical.json */
  code: string
  name: string
  /** the name looked up in the AC gazetteer; set only where a source states the area (else the dialect group stays unknown) */
  gazName?: string
  /** region strings of a witness that count here */
  match: RegExp
  ne: TerritoryUnit[]
  /** which admin-1 unit(s) approximate the extent, and why [P] */
  unit: string
  src: Evidence[]
}

const ieu = (page: string, part: string) => `https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5C${page.split('/').join('%5C')}.htm, ${part}`
const IEU = (page: string, part: string, quote: string) => Q('IEU', ieu(page, part), quote)

export const TERRITORIES: Territory[] = [
  { id: 'kuban', code: 'HT-kuban', name: 'Кубань', match: /^Кубань$/, ne: [{ adm0: 'RUS', name: 'Krasnodar' }, { adm0: 'RUS', name: 'Adygey' }],
    unit: 'Краснодарський край + Адигея (≈ Кубань між Азовським і Чорним морями до Кавказького хребта) [P]',
    src: [IEU('K/U/Kuban', 'entry «Kuban», opening paragraph', 'Kuban is the southernmost Ukrainian ethnographic territory, separated from the rest of Ukraine by the Sea of Azov and the Russian Don region.'),
      IEU('K/U/Kuban', 'entry «Kuban», opening paragraph', 'Historically, in the west, Kuban was bordered by the Black Sea, the Sea of Azov and the Kerch Strait; in the north, by the Don region at the Yeia River')] },
  { id: 'berestia', code: 'HT-berestia', name: 'Берестейщина', match: /^Берестейщина$/, ne: [{ adm0: 'BLR', name: 'Brest', clip: [22, 50, 29, 52.7] }],
    unit: 'південь Берестейської області Білорусі до 52,7° пн. ш. (за ІЕУ 10 з 16 районів — українські, 4 північні — білоруські) [P]',
    src: [IEU('B/E/BerestiaLand', 'entry «Berestia land», opening paragraph', 'The northwestern part of Ukrainian ethnic territory, bounded by the Buh River, Prypiat River, Yaselda River, and Narva (Narew) River.'),
      IEU('B/R/BrestOblast', 'entry «Brest oblast», opening paragraph', 'Although Brest oblast lies within Belarus, most of its territory is a part of Ukrainian ethnic territory.')] },
  { id: 'pidliashshia', code: 'HT-pidliashshia', name: 'Підляшшя', match: /^Підляшшя$/, ne: [{ adm0: 'POL', name: 'Podlachian', clip: [21, 52, 25, 53.1] }],
    unit: 'Підляське воєводство, лише південь до 53,1° пн. ш. (Більськ-Підляський) [P]',
    src: [IEU('P/O/Podlachia', 'entry «Podlachia», opening paragraph', 'A historical-geographical region along the middle stretch of the Buh River between the Kholm region in the south and the Narva River (the Belarus border) in the north'),
      IEU('P/O/Podlachia', 'entry «Podlachia», 2nd paragraph', 'The northern part of Podlachia, approx 2,700 sq km, constituted Bielsk Podlaski county in Hrodna gubernia.')] },
  { id: 'kholm', code: 'HT-kholm', name: 'Холмщина', match: /^Холмщина$/, ne: [{ adm0: 'POL', name: 'Lublin' }],
    unit: 'Люблінське воєводство (Холмщина — його східна частина за Бугом; західна — польська) [P]',
    src: [IEU('K/H/Kholmregion', 'entry «Kholm region», opening paragraph', 'A historical-geographic region west of the Buh River, bordering on the Polish Lublin region in the west, Volhynia in the east, Podlachia in the north, and Galicia in the south.')] },
  { id: 'nadsiannia', code: 'HT-nadsiannia', name: 'Надсяння', match: /^Надсяння$/, ne: [{ adm0: 'POL', name: 'Subcarpathian' }],
    unit: 'Підкарпатське воєводство (долина Сяну) [P]',
    src: [IEU('S/I/SianRegion', 'entry «Sian region», opening paragraph', 'A name occasionally used to designate the area situated approximately along both sides of the Sian River north of the Lemko region and the city of Sianik along the border between Ukrainian and Polish ethnic territory.')] },
  { id: 'lemkivshchyna', code: 'HT-lemkivshchyna', name: 'Лемківщина', match: /^Лемківщина$/, ne: [{ adm0: 'POL', name: 'Lesser Poland', clip: [20.2, 49.2, 21.6, 49.85] }],
    unit: 'південний схід Малопольського воєводства (Горлиці — Ново-Сончеське пасмо) [P]; решта Лемківщини — у Підкарпатському воєводстві та на Пряшівщині',
    src: [IEU('L/E/LemkoRegion', 'entry «Lemko region», opening paragraph', 'The territory traditionally inhabited by the Lemkos forms an ethnographic peninsula 140 km long and 25–50 km wide within Polish and Slovak territory.')] },
  { id: 'pryashivshchyna', code: 'HT-pryashivshchyna', name: 'Пряшівщина', match: /^Пряшівщина$/, ne: [{ adm0: 'SVK', name: 'Prešov' }],
    unit: 'Пряшівський край Словаччини [P]',
    src: [IEU('L/E/LemkoRegion', 'entry «Lemko region», opening paragraph', 'only the southern part, southwest of the Carpathian Mountains, known as the Prešov region in Slovakia, has remained inhabited by Lemkos.'),
      IEU('L/E/LemkoRegion', 'entry «Lemko region», section on Transcarpathian Lemkos', 'The Transcarpathian Lemko region occupies most of the Prešov region—about 3,000 sq km with a population of 110,000 and a series of ethnic islands.')] },
  { id: 'marmarosh', code: 'HT-marmarosh', name: 'Мармарощина', match: /^Мармарощина$/, ne: [{ adm0: 'ROU', name: 'Maramureș' }],
    unit: 'повіт Марамуреш (Румунія) [P]',
    src: [IEU('R/O/Romania', 'entry «Romania», section on Ukrainians', 'These include southern Bukovyna (50,000 Ukrainians in 32 locales), Dobrudja (40,000 Ukrainians in 23 locales), and the Maramureş region (about 45,000 Ukrainians in 15 locales).'),
      IEU('R/O/Romania', 'entry «Romania», section on Ukrainians', 'After the First World War Ukrainian ethnographic lands in Bukovyna, Bessarabia, and the Maramureş region (a small section of Transcarpathia) were ceded to Romania')] },
  { id: 'pivdenna-bukovyna', code: 'HT-pivdenna-bukovyna', name: 'Південна Буковина', match: /^Південна Буковина$/, ne: [{ adm0: 'ROU', name: 'Suceava' }],
    unit: 'повіт Сучава (Румунія) [P]',
    src: [IEU('B/U/Bukovyna', 'entry «Bukovyna», opening paragraph', 'Today Bukovyna is divided between Ukraine (incorporating Chernivtsi oblast or most of northern Bukovyna) and Romania (containing most of the Suceava region or southern Bukovyna).'),
      IEU('R/O/Romania', 'entry «Romania», section on Ukrainians', 'These include southern Bukovyna (50,000 Ukrainians in 32 locales)')] },
  { id: 'starodubshchyna', code: 'HT-starodubshchyna', name: 'Стародубщина', match: /^Стародубщина$/, ne: [{ adm0: 'RUS', name: 'Bryansk', clip: [31.5, 52, 34, 53.1] }],
    unit: 'південно-західна частина Брянської області навколо Стародуба (52,6° пн. ш., 32,8° сх. д.) [P]',
    src: [IEU('S/T/Starodub', 'entry «Starodub», opening paragraph', 'A town (2018 pop 18,615) in the northern Chernihiv region and a raion center in Briansk oblast, Russian Federation.'),
      IEU('S/T/Starodub', 'entry «Starodub», history', 'During the revolutionary period (1917–18) Starodub was included in the territory of independent Ukraine, but after it came under Soviet control, the town and its region was incorporated into the Russian Soviet Federated Socialist Republic.')] },
  { id: 'bilhorodshchyna', code: 'HT-bilhorodshchyna', name: 'Білгородщина', gazName: 'Слобожанщина', match: /^Білгородщина$/, ne: [{ adm0: 'RUS', name: 'Belgorod' }],
    unit: 'Бєлгородська область (вся) [P]',
    src: [IEU('B/E/Belgorodoblast', 'entry «Belgorod oblast», opening paragraph', 'In the past most of the oblast was a part of Slobidska Ukraine.'),
      IEU('B/E/Belgorodoblast', 'entry «Belgorod oblast», opening paragraph', 'According to the generally reliable census of 1926, the territory of present-day Belgorod oblast was then inhabited by 642,000 Ukrainians (40.2 percent)')] },
  { id: 'voronizhchyna', code: 'HT-voronizhchyna', name: 'Воронежчина', gazName: 'Слобожанщина', match: /^Воронежчина$/, ne: [{ adm0: 'RUS', name: 'Voronezh', clip: [38, 49.5, 41.5, 51] }],
    unit: 'південь Воронезької області до 51° пн. ш. (Валуйки — Острогозьк — Россош — Богучар) [P]',
    src: [IEU('V/O/VoronezhRegion', 'entry «Voronezh region», opening paragraph', 'The northeastern region of Slobidska Ukraine, which in the 19th and early 20th centuries constituted Voronezh gubernia'),
      IEU('V/O/VoronezhRegion', 'entry «Voronezh region», opening paragraph', 'The southern part of the oblast, including the cities of Valuiky, Ostrohozke, Rozsosh, and Bohuchar, was in Ukrainian ethnographic territory (31,300 sq km).')] },
  { id: 'kurshchyna', code: 'HT-kurshchyna', name: 'Курщина', match: /^Курщина$/, ne: [{ adm0: 'RUS', name: 'Kursk', clip: [34.5, 50, 38.6, 51.6] }],
    unit: 'південь Курської області до 51,6° пн. ш. [P]',
    src: [IEU('K/U/Kurskregion', 'entry «Kursk region», opening paragraph', 'A mixed Russian-Ukrainian region within the Russian Federation, northeast of Slobidska Ukraine.'),
      IEU('K/U/Kurskregion', 'entry «Kursk region», opening paragraph', 'The region’s southern part (11,100 sq km) lies on Ukrainian ethnic territory')] },
]
export const territoryById = Object.fromEntries(TERRITORIES.map(t => [t.id, t])) as Record<string, Territory>

/** Not drawn (MP-1) because no source was retrieved for its extent, or because it lies inside today's Ukraine (already on the oblast layer). */
export const TERRITORIES_NOT_DRAWN: { name: string; why: string }[] = [
  { name: 'Придністров’я', why: 'у ІЕУ статті «Transnistria» — лише румунська окупаційна адміністрація 1941–44, не етнографічна територія; джерела про етнографічний обсяг не знайдено (невідомо)' },
  { name: 'Крим', why: 'у межах сучасної України; уже на шарі областей (UA-43, UA-40)' },
  { name: 'Зелений Клин', why: 'не знайдено джерела, що виділяє його окремим регіоном (MP-1: лише за наявності такого джерела)' },
]

/** Dialect-group gazetteer rows of a territory, only where a source states the area (gazName or the territory's own name is in the AC gazetteer); [] = unknown. */
export const territoryGaz = (t: Territory): GazRow[] => gazetteerRows(t.gazName ?? t.name)
/** Evidence for «territory → dialect group»: the territory's own source quote + the gazetteer quote (AC-2). */
export const territoryGroupEvidence = (t: Territory, g: GazRow): Evidence[] => [...(t.gazName ? t.src.filter(e => /Slobidska Ukraine/.test(e.quote)).slice(0, 1) : []), gazEvidence(g)]
