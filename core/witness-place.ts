/**
 * SPEC 63 LB-10 — the place of publication of a witness (a newspaper, a journal, a book) as its «регіон пам'ятки» (FD-2). Pure: no node or DOM imports.
 *
 * > "Witness geography as separate evidence: regions of the witnesses in which this spelling occurs (from witness metadata), shown as «засвідчено в: …», never merged into the dialect label unless a rule/claim supports it." — SPEC 63 FD-2
 *
 * A place is read ONLY from a metadata field the source itself prints (archive.org `publisher`, the Wikisource header field «місто», the harvest index `region`);
 * the field and its verbatim value are kept next to the result. A string that names two or more different places («Київ; Відень», «Прага; Берлін») is a
 * composite locus and is left out (P-3.1: unknown stays unknown). The spelling variants (Latin transliterations of archive.org, Cyrillic pre-reform and
 * émigré spellings) are matched on a folded key (`placeKey`): lower case, no combining marks, no modifier letters / apostrophes.
 * Each place carries its modern country and, inside Ukraine, the ISO 3166-2:UA oblast, both quoted from Wikidata (core/place-gazetteer.ts, fetched by
 * pipelines/place-gazetteer.ts). A place outside Ukraine becomes the region «еміграція / поза Україною (<місто>)»: it is not a Ukrainian region
 * (no oblast on the map) but it is a region of its own for dispersion.
 */

/** the folded key of a place string: NFD, lower case, no combining marks / modifier letters / apostrophes / quotes; ё→е, ѣ→е, і ї ы→и, ґ→г, ъ ь dropped, non-letters → one space */
export const placeKey = (s: string): string =>
  s.normalize('NFD').toLowerCase().replace(/[\u0300-\u036f\u02b0-\u02ff\u0361'’ʼ`"«»]/g, '').replace(/[её]/g, 'е').replace(/ѣ/g, 'е').replace(/[ъь]/g, '').replace(/[іыї]/g, 'и').replace(/ґ/g, 'г').replace(/э/g, 'е').replace(/ı/g, 'i').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

export interface PlaceRule {
  /** stable id (also the gazetteer key) */ id: string
  /** modern Ukrainian name used in the region name and on the card */ uk: string
  /** word-start stems of the folded key (Latin transliterations and Cyrillic spellings); a stem ending in «$» must be a whole word */ stems: string[]
  re: RegExp
}

const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const R = (id: string, uk: string, stems: string): PlaceRule => {
  const fold = (x: string) => (x.endsWith('$') ? placeKey(x.slice(0, -1)) + '$' : placeKey(x))
  const st = [...new Set([...stems.split(/\s+/).filter(Boolean).map(x => x.replace(/_/g, ' ')), uk + '$'].map(fold))]   // the modern name itself always matches (as a whole word)
  const alt = st.map(x => (x.endsWith('$') ? esc(x.slice(0, -1)) + '(?![\\p{L}\\p{N}])' : esc(x)))
  return { id, uk, stems: st, re: new RegExp('(?<![\\p{L}\\p{N}])(?:' + alt.join('|') + ')', 'u') }
}

/** The places that occur in the metadata of the corpus witnesses (every row is exercised by tests/region.test.ts on a real metadata string). */
export const PLACE_RULES: PlaceRule[] = [
  // ── inside Ukraine ──
  R('lviv', 'Львів', 'lviv lvov lvow lwow lemberg lvovi lvovie ulvovi лвів лвов лвови'),
  R('kharkiv', 'Харків', 'kharkiv kharkov harkov харків харков харьк харкі'),
  R('kyiv', 'Київ', 'kyiv kiev kijev kyv$ kyi$ киів киев кіев кив$ київ'),
  R('kolomyia', 'Коломия', 'kolom колом'),
  R('odesa', 'Одеса', 'odes odess одес'),
  R('dnipro', 'Дніпро', 'katerynoslav ekaterinoslav katerinoslav dnipropetrovsk dnipro$ катеринослав екатеринослав дніпропетровськ дніпро$'),
  R('ternopil', 'Тернопіль', 'ternop тернопіл тернопол'),
  R('kherson', 'Херсон', 'kherson херсон$'),
  R('vinnytsia', 'Вінниця', 'vinnyts вінниц'),
  R('kropyvnytskyi', 'Кропивницький', 'кропивниц'),
  R('cherkasy', 'Черкаси', 'cherkas черкас'),
  R('chernivtsi', 'Чернівці', 'chernivt chernovt czernowitz чернівц чернивц черновц'),
  R('chernihiv', 'Чернігів', 'chernih чернігів чернигов'),
  R('zhovkva', 'Жовква', 'zhovk zholk жовкв жовка'),
  R('ivano-frankivsk', 'Івано-Франківськ', 'stanislav станиславів станиславов'),
  R('prylyky', 'Прилуки', 'pryluk прилук'),
  R('zvenyhorodka', 'Звенигородка', 'zvenyhorodk звенигородк'),
  R('drohobych', 'Дрогобич', 'drohobych дрогобич'),
  R('kamianets-podilskyi', 'Кам’янець-Подільський', 'kamianets kamyanets kamenets камянець камінець'),
  R('zmiiv', 'Зміїв', 'zmiiv зміїв'),
  R('rivne', 'Рівне', 'rivne$ рівне$'),
  R('balta', 'Балта', 'balta$ балта$'),
  R('lutsk', 'Луцьк', 'lutsk лучск луцьк луцк'),
  R('ostroh', 'Острог', 'ostroh острог'),
  R('sumy', 'Суми', 'sumy$ суми$'),
  R('bakhmut', 'Бахмут', 'artemivsk bakhmut артемівськ бахмут'),
  R('mariupol', 'Маріуполь', 'mariupol маріуполь'),
  R('lysychansk', 'Лисичанськ', 'lysychansk лисичанськ'),
  R('kobeliaky', 'Кобеляки', 'kobeliak кобеляки'),
  R('melitopol', 'Мелітополь', 'melitopol мелітополь'),
  R('simferopol', 'Сімферополь', 'simferopol сімферополь'),
  R('hlukhiv', 'Глухів', 'hlukhiv глухів'),
  R('pochaiv', 'Почаїв', 'pochai почаїв'),
  R('peremyshliany', 'Перемишляни', 'peremyshlian перемишляни'),
  R('uzhhorod', 'Ужгород', 'uzhhorod uzhorod uzshorod uzzhhorod ужгород'),
  R('poltava', 'Полтава', 'poltav полтав'),
  // ── outside Ukraine (emigration, the empire's capitals, the neighbours) ──
  R('vienna', 'Відень', 'viden wien vienn відень вѣдень видень вiдень ведень'),
  R('prague', 'Прага', 'praha praga$ prag$ прага'),
  R('berlin', 'Берлін', 'berlin берлін'),
  R('new-york', 'Нью-Йорк', 'new_york niu_ork niu_iork nu_ork niu$ nyu_york нью_йорк ню_йорк niuork'),
  R('krakow', 'Краків', 'krakiv krakow krakov cracow krakau краків краков'),
  R('winnipeg', 'Вінніпег', 'winnipeg vinnipeg vinnipeh vinipeg vinnip винипег вінніпег віннипег віннїпег винніпег'),
  R('scranton', 'Скрентон', 'scranton skrenton скрентон'),
  R('philadelphia', 'Філадельфія', 'philadelphia filiadelfiia філядельфія філадельфія'),
  R('saint-petersburg', 'Санкт-Петербург', 'peterburg peterburh petersburg петербург петербурх санктпетербург санктпетербурх санкт_петербург'),
  R('leipzig', 'Лейпциг', 'liaptsig liaiptsig laiptsig leipzig liptsig ляйпц лейпциг'),
  R('toronto', 'Торонто', 'toronto торонто'),
  R('jena', 'Єна', 'jena$ єна$'),
  R('jersey-city', 'Джерсі-Сіті', 'jersey_city джерсі джерзі'),
  R('moscow', 'Москва', 'moskva moscow москва москов'),
  R('warsaw', 'Варшава', 'warszawa warsaw varshav варшав'),
  R('ufa', 'Уфа', 'ufa$ уфа$'),
  R('cleveland', 'Клівленд', 'cleveland клівленд'),
  R('podebrady', 'Подєбради', 'podebrad podiebrad подєбрад подебрад'),
  R('wetzlar', 'Ветцлар', 'vetsliar vetsli vetzlar wetzlar вецляр ветцляр'),
  R('chicago', 'Чикаго', 'chicago шікаго шикаго чикаго шікаґо шикаґо'),
  R('strasbourg', 'Страсбург', 'strasb страсбург'),
  R('budapest', 'Будапешт', 'budapest будапешт'),
  R('tallinn', 'Таллінн', 'tallin таллін'),
  R('riga', 'Рига', 'riga$ рига$ риґа$'),
  R('kalisz', 'Каліш', 'kalisz kalish каліш'),
  R('feldkirch', 'Фельдкірх', 'feldkirch фельдкірх'),
  R('brest', 'Берестя', 'berestie берестє'),
  R('vilnius', 'Вільнюс', 'vilno$ vilnius vilna$ вільно$ вільнюс вильно$ євє'),
  R('montreal', 'Монреаль', 'montreal монреаль'),
  R('tarnow', 'Тарнів', 'tarnow tarniv тарнів'),
  R('minsk', 'Мінськ', 'minsk мінськ'),
  R('geneva', 'Женева', 'geneva geneve женева'),
  R('paris', 'Париж', 'paris$ париж'),
  R('washington', 'Вашингтон', 'washington вашингтон'),
  R('edmonton', 'Едмонтон', 'edmonton едмонтон'),
  R('munich', 'Мюнхен', 'munich munchen мюнхен'),
  R('boston', 'Бостон', 'boston бостон'),
  R('augsburg', 'Авгсбург', 'augsburg авґсбурґ авгсбург'),
  R('freistadt', 'Фрайштадт', 'frashtadt freistadt фрайштадт'),
  R('rastatt', 'Раштатт', 'rashtat rastatt раштат'),
  R('olyphant', 'Олифант', 'olyphant олифант'),
  R('vancouver', 'Ванкувер', 'vancouver ванкувер'),
  R('london', 'Лондон', 'london$ лондон'),
  R('istanbul', 'Стамбул', 'tsarhorod t_s_arhorod царград царьград'),
  R('voronezh', 'Воронеж', 'voronezh воронеж'),
  R('mogilev', 'Могильов', 'mogilev могилев могильов'),
  R('przemysl', 'Перемишль', 'przemysl перемишль$'),
  R('salzwedel', 'Зальцведель', 'zal_t_svedel zaltsvedel salzwedel зальцведель'),
  R('hamburg', 'Гамбург', 'hamburg гамбург'),
  R('detroit', 'Детройт', 'detroit детройт'),
  R('germany', 'Німеччина', 'німеччина'),
  R('bad-woerishofen', 'Бад-Верісгофен', 'бад_вьорльзгофен'),
  R('graefenhainichen', 'Грефенгайніхен', 'грефенгайніхен'),
  R('novorossiysk', 'Новоросійськ', 'новоросійськ novorossiysk'),
  R('brooklyn', 'Бруклін', 'brooklyn бруклін'),
]

/** the distinct places a string names (rule ids), in order of appearance */
export function placesIn(s: string): string[] {
  const key = placeKey(s)
  const hits: { id: string; at: number }[] = []
  for (const r of PLACE_RULES) { const m = r.re.exec(key); if (m) hits.push({ id: r.id, at: m.index }) }
  return hits.sort((a, b) => a.at - b.at).map(h => h.id)
}

/** a string that also names an area (not a place) is a composite locus: «Київ / Лівобережжя», «Галичина; Львів» */
const AREA = /(?<![\p{L}\p{N}])(?:лівобереж|галичин|волин|полісс|україн|молдав|валах|центральн)/u
/** The ONE place of a string, or undefined when it names none or several (composite locus, left out). */
export function placeOf(s: string | undefined): PlaceRule | undefined {
  if (!s) return undefined
  if (AREA.test(placeKey(s))) return undefined
  const ids = placesIn(s)
  return ids.length === 1 ? PLACE_RULES.find(r => r.id === ids[0]) : undefined
}

export const placeById = Object.fromEntries(PLACE_RULES.map(r => [r.id, r])) as Record<string, PlaceRule>

/**
 * archive.org `publisher` field → the place of publication. The field is an imprint («Lviv : Prosvita», «Vinnipeg [Winnipeg] : Nakladom …», «U Lʹvovi : Z druk. …»):
 * the place is the part before « : » when there is one (a bracketed modern name «[Winnipeg]» is read with it), else the whole string.
 */
export function placeOfImprint(publisher: string | undefined): PlaceRule | undefined {
  if (!publisher) return undefined
  const head = publisher.split(/\s:\s|:\s/)[0]!
  return placeOf(head) ?? (publisher.includes(':') ? undefined : placeOf(publisher))
}

// ── archive.org item metadata → place (LB-10) ─────────────────────────────────────────────────────────
/** the fields of an archive.org item that can name the place (advancedsearch `fl[]` / the item's metadata API) */
export interface IaMeta { identifier: string; publisher?: string | string[]; creator?: string | string[]; contributor?: string | string[]; description?: string | string[] }
/** where the place was read: the item's `publisher`, the `creator`/`contributor` corporate body with its location in brackets, the imprint line of the `description`, or the series table */
export type IaPlaceField = 'publisher' | 'creator' | 'description' | 'series'
export interface IaPlace { place: string; field: IaPlaceField; /** verbatim value of the field (or the quote of the series source) */ value: string; /** series only: the page that states it */ url?: string }

const arr = (v: string | string[] | undefined): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v])
const plain = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

/**
 * A newspaper whose archive.org items carry no place at all (the University of Alberta scans of «Канадійський фармер» / «Ранок»): the place is stated
 * by a published reference work, quoted verbatim with its page. A row applies to the items whose identifier matches `id`.
 */
export const IA_SERIES: { id: RegExp; place: string; url: string; quote: string }[] = [
  { id: /^canadianfarmer_/, place: 'winnipeg', url: 'https://uk.wikipedia.org/wiki/Україномовна_преса_Канади',
    quote: 'Першим виданням українською мовою стала в 1903 році газета «Канадійський Фармер» (виходила у Вінніпегу до 1981).' },
  { id: /^canadianmorning_/, place: 'winnipeg', url: 'https://uk.wikipedia.org/wiki/Ранок_(газета)',
    quote: 'Виходила 1905—1920 у Вінніпезі як місячник, тижневик (1907) і двотижневик. … З 1920 виходить під назвою «Канадійський Ранок».' },
]

/**
 * The place of publication of an archive.org item, from ITS OWN metadata, in this order (the first field that names exactly one place wins):
 *  1. `publisher`   «Lviv : Prosvita» → Львів
 *  2. `creator` / `contributor`, a corporate body with its location in brackets: «Naukove tovarystvo im. SHevchenka (Lʹviv, Ukraine)» → Львів
 *  3. `description`, an imprint line «… Краків: Накладом Ольги Аркасової, 1912» → Краків
 *  4. IA_SERIES (a reference work quoted for the newspaper)
 * A composite (two places) or an unknown place gives nothing: the witness keeps no region.
 */
export function placeFromIaMeta(m: IaMeta): IaPlace | undefined {
  for (const p of arr(m.publisher)) { const r = placeOfImprint(p); if (r) return { place: r.id, field: 'publisher', value: p } }
  const corp = [...arr(m.creator), ...arr(m.contributor)].map(x => ({ x, loc: /\(([^()]*)\)\s*$/.exec(x)?.[1] })).filter((c): c is { x: string; loc: string } => !!c.loc).map(c => ({ x: c.x, r: placeOf(c.loc) })).filter(c => c.r)
  if (corp.length && new Set(corp.map(c => c.r!.id)).size === 1) return { place: corp[0]!.r!.id, field: 'creator', value: corp[0]!.x }
  const desc = plain(arr(m.description).join(' '))
  const im = /(?:^|[.–—-]\s)([^.:–—]{2,28}):\s[^,;]{2,90},\s*(1[5-9]\d\d)/.exec(desc)
  if (im) { const r = placeOf(im[1]); if (r) return { place: r.id, field: 'description', value: im[0]!.replace(/^[.–—-]\s/, '') } }
  const s = IA_SERIES.find(x => x.id.test(m.identifier))
  if (s) return { place: s.place, field: 'series', value: s.quote, url: s.url }
  return undefined
}
