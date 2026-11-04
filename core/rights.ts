/**
 * SPEC 63 RG-1: the ONE rights registry. A rights holder's permission becomes one line here and a rebuild.
 *
 * Pure (no node / DOM imports, no import of sources.ts or se.ts: both import this file; tests/rights.test.ts checks that every SOURCES key and every DICT_COVER id has an entry).
 *
 * LICENCES
 *  pd      public domain; `note` states why, by the repo's PD rule: the author's death year (life + 70) or the publication year (archive.org harvest: ≤ 1925, harvest/archive.ts).
 *          A pd source is still clipped to SIZE_BUDGET: that is a shard-size budget (card sizes unchanged), NOT a right.
 *  open    an open licence (CC BY-SA, CC0, ODbL …) or project-internal data; `terms` names it. Size budget only. (Added to the four licences of the design: a CC BY-SA source is neither PD nor cite-only.)
 *  quote   in copyright (or status not established: `uncertain` says why): only the listed `fields`, glosses/excerpts up to `maxChars`.
 *  links   Караванський: word-to-word links only, no text, at most `maxLinks` per headword.
 *  granted written permission: `evidence` = the document, `date`, `scope` = what it covers. LIFTS the clip limit (`maxChars` or none).
 *
 * WHAT ONE LINE ACHIEVES (honest)
 *  Changing a source to `granted` (no `maxChars`) makes maxChars(id) = Infinity and clip(id, t) = t. Automatically, with no other edit:
 *   - the gloss clippers of core/arkushyn-parse.ts, nan-parse.ts, se15-parse.ts (all five dialect dictionaries), slavynetsky-parse.ts, sum-article.ts (СУМ text layers), sum-import.ts, se-parse.ts (glosses, quotations of keepQuotes dicts);
 *   - the quotation of a dictionary witness row (core/se.ts rowOfLine, `q`);
 *   - the ЕСУМ excerpt cap (core/esum-parse.ts ESUM_MAX; core/etymology.ts quote);
 *   - sum-import's `full` path (fullSensesOn): the full definition and the quotation are kept, nothing else needed;
 *   - core/evidence.ts: the quote backstop of 300 is lifted for that source.
 *  WHAT IT DOES NOT DO (needs code, listed per parser; none is switched on now)
 *   - Parsers that keep an EXCERPT BY DESIGN, not by length: they cut before the clip is reached, so a lifted limit does not give the whole gloss:
 *       · ЕСУМ (core/esum-parse.ts): ONE excerpt of the etymological statement (statementOf cuts at the first literature line, tidyExcerpt at a clause); pointer rows («Див. X») carry no text. Full text needs a `fullArticle` field (the article up to the literature block), a parser path that does not call tidyExcerpt/statementOf, and a new row kind.
 *       · Onyshkevych, Sabadosh, Bukovyna, Hutsul, Lysenko (core/se15-parse.ts): the gloss is the FIRST sentence of each of at most 8 numbered senses (firstSentence, GLOSS_CUT, split at «;» / «//» / illustration); illustrations, phraseology and cross-references are dropped by the splitters. Full text needs `fullArticle` handling in glossOfSegment / parseCaps / parseHutsul.
 *       · Чабаненко (core/nan-parse.ts, at most 10 senses, firstSentence + the OQ gates) and Аркушин (core/arkushyn-parse.ts): same, first sentence per sense.
 *       · СУМ text layer (core/sum-article.ts senseOf): the definition up to the first «//», example or «. Великі» boundary; examples are dropped.
 *       · Словник мови Шевченка (core/se-parse.ts, kind shevchenko): a gloss exists only where the dictionary prints its own count; the quotations are not read (`keepQuotes: false`). sum16 / materials: same, quotations dropped. Full text needs keepQuotes + a quote slot.
 *   - Shards: SE rows live in public/data/lm/se/<bucket>.json (pipelines/build-parts.ts). Longer glosses and quotations grow every card that carries the source; MAX_ROWS (30) per entry stays. A `granted` source of full text must be measured against the shard budget (gz size per bucket) before the build, and a cap such as `maxChars: 600` is the cheap middle way.
 *   - Download/Export of «this card» (src/): not touched here; displays whatever the row holds.
 *   - Display wording («цитата», «©») in the UI and the licence line of SOURCES stay hand-written; update them with the grant.
 *  NOT covered by RG-1: the per-witness licence of the corpus manifest (data/work/corpus), the songs registry and harvest/*.ts licences (each carries its own licence field).
 */

export type Rights =
  | { license: 'pd'; note: string }
  | { license: 'open'; terms: string }
  | { license: 'quote'; maxChars: number; fields: string[]; uncertain?: string }
  | { license: 'links'; maxLinks: number }
  | { license: 'granted'; evidence: string; date: string; scope: string; maxChars?: number }

/** a source id: a key of core/sources.ts SOURCES, or a dictionary id of core/se.ts DICT_COVER */
export type SourceId = string

/** shard-size budget of a gloss/quotation of a pd/open source (was GLOSS_MAX, MAX_QUOTE): a budget, not a right */
export const SIZE_BUDGET = 200
/** the backstop of core/evidence.ts for the quote of any evidence record */
export const EVIDENCE_CAP = 300

const GLOSS_FIELDS = ['head', 'gram', 'labels', 'places', 'gloss', 'volume/page']

// ── dictionaries (core/se.ts DICT_COVER ids) ─────────────────────────────────────────────────────
const DICTS: Record<string, Rights> = {
  zhelekhivsky: { license: 'pd', note: 'Желехівський † 1885, Недільський † 1899; друк 1886 (SPEC 63 SE-13)' },
  dsu14: { license: 'quote', maxChars: SIZE_BUDGET, fields: ['head', 'pos', 'gloss'] },
  'wikt.uk': { license: 'open', terms: 'CC BY-SA 4.0' },
  'wikt.en': { license: 'open', terms: 'CC BY-SA 4.0 (Wiktextract/kaikki.org)' },
  'zyzanii-lexis': { license: 'quote', maxChars: SIZE_BUDGET, fields: ['head', 'gloss'], uncertain: 'текст 1596 р. у суспільному надбанні, але рядки взято з транскрипції В. Німчука (1964; litopys.org.ua): ліцензію транскрипції не встановлено (spec 63 SE-12: «read, not redistributed»)' },
  berynda: { license: 'quote', maxChars: SIZE_BUDGET, fields: ['head', 'gloss'], uncertain: 'текст 1627 р. у суспільному надбанні; джерело рядків — OCR друку з редакційним апаратом, ліцензію видання не встановлено' },
  glossary1282: { license: 'quote', maxChars: SIZE_BUDGET, fields: ['head', 'gloss'], uncertain: 'текст 1282 р. у суспільному надбанні; транскрипція Німчука 1964 — ліцензію не встановлено' },
  glossary1431: { license: 'quote', maxChars: SIZE_BUDGET, fields: ['head', 'gloss'], uncertain: 'текст 1431 р. у суспільному надбанні; транскрипція Німчука 1964 — ліцензію не встановлено' },
  'lexis-prosto': { license: 'quote', maxChars: SIZE_BUDGET, fields: ['head', 'gloss'], uncertain: 'текст XVI ст. (вид. Амфілохій 1884) у суспільному надбанні; транскрипція Німчука 1964 — ліцензію не встановлено' },
  synonima: { license: 'quote', maxChars: SIZE_BUDGET, fields: ['head', 'gloss'], uncertain: 'текст XVII ст. (вид. Житецький 1889) у суспільному надбанні; транскрипція Німчука 1964 — ліцензію не встановлено' },
  kotliarevsky1798: { license: 'pd', note: 'друк 1798 р. (Котляревський † 1838); Вікіджерела CC BY-SA' },
  pavlovsky1818: { license: 'pd', note: 'друк 1818 р. (Павловський † 1824); Вікіджерела CC BY-SA' },
  timchenko: { license: 'pd', note: 'Тимченко † 1948 (spec 63 SE-10 (a)); друк 1930/32' },
  sum16: { license: 'quote', maxChars: SIZE_BUDGET, fields: GLOSS_FIELDS.filter(f => f !== 'places').concat('sigla', 'quotation dates') },
  'timchenko-materials': { license: 'quote', maxChars: SIZE_BUDGET, fields: GLOSS_FIELDS.filter(f => f !== 'places').concat('sigla', 'quotation dates') },
  'biletsky-nosenko': { license: 'pd', note: 'Білецький-Носенко † 1856 (spec 63 SE-10 (a)); апарат видання Німчука 1966 не береться' },
  zakrevsky: { license: 'pd', note: 'Закревський † 1871; друк 1861 (spec 63 SE-10 (a))' },
  shevchenko: { license: 'quote', maxChars: SIZE_BUDGET, fields: ['head', 'sense number', 'gloss', 'sigla', 'quotation dates'] },
  arkushyn: { license: 'quote', maxChars: SIZE_BUDGET, fields: GLOSS_FIELDS },
  chabanenko: { license: 'quote', maxChars: SIZE_BUDGET, fields: GLOSS_FIELDS },
  onyshkevych: { license: 'quote', maxChars: SIZE_BUDGET, fields: GLOSS_FIELDS },
  sabadosh: { license: 'quote', maxChars: SIZE_BUDGET, fields: GLOSS_FIELDS },
  bukovyna: { license: 'quote', maxChars: SIZE_BUDGET, fields: GLOSS_FIELDS },
  hutsul: { license: 'quote', maxChars: SIZE_BUDGET, fields: GLOSS_FIELDS },
  slavynetsky: { license: 'pd', note: 'текст XVII ст. (1642, 1650); вступ і примітки видання Німчука 1973 не зберігаються' },
  lysenko: { license: 'quote', maxChars: SIZE_BUDGET, fields: GLOSS_FIELDS },
  sum11: { license: 'quote', maxChars: SIZE_BUDGET, fields: ['head', 'stress', 'pos', 'sense numbers', 'labels', 'gloss', 'volume/page', 'link'] },
  sum20: { license: 'quote', maxChars: SIZE_BUDGET, fields: ['head', 'stress', 'pos', 'sense numbers', 'labels', 'gloss', 'volume/page', 'link'] },
  // SE-17 (BULP-wt-se17, in flight): registered here so that its rows are born under a licence
  verkhratsky: { license: 'pd', note: 'Верхратський † 1908; друк до 1925 (SE-17)' },
  karavansky: { license: 'links', maxLinks: 5 },
  poltavshchyna: { license: 'quote', maxChars: SIZE_BUDGET, fields: GLOSS_FIELDS },
}

// ── bibliographic sources (core/sources.ts SOURCES keys) ─────────────────────────────────────────
const CITE = (uncertain?: string): Rights => ({ license: 'quote', maxChars: EVIDENCE_CAP, fields: ['quote', 'locator'], ...(uncertain ? { uncertain } : {}) })
const PUB_RULE = 'видання ≤ 1925 (правило PD репозиторію, harvest/archive.ts: евристика)'
const OPEN = (terms: string): Rights => ({ license: 'open', terms })
const SOURCE_RIGHTS: Record<string, Rights> = {
  SHEV: CITE('друковане видання (1979/2002); правовий статус не встановлено, береться лише цитата'),
  ENC: CITE('друковане видання (2000); правовий статус не встановлено'),
  PRAV: CITE('нормативний акт (2019); статус не встановлено'),
  VESUM: OPEN('CC BY-NC-SA 4.0'),
  LT: OPEN('LGPL-2.1+'),
  PAVL: CITE('навчальний посібник 2010 (ВНУ ім. Лесі Українки); статус не встановлено'),
  TOROT: OPEN('CC BY-NC-SA 3.0'),
  IZB: CITE('сайт izbornyk.org.ua; статус не встановлено'),
  EOU: CITE('Encyclopedia of Ukraine (CIUS); статус не встановлено'),
  WPEN: OPEN('CC BY-SA 4.0'),
  VIRA: CITE('онлайн-видання тексту 1092 р.; ліцензію видання не встановлено'),
  IA: { license: 'pd', note: PUB_RULE + '; OCR archive.org, не вичитано' },
  OHL: CITE('Оглоблин 1960/2001; статус не встановлено'),
  WS: OPEN('PD / CC BY-SA 4.0 (Вікіджерела)'),
  PLSEA: CITE('© Пласт Сієтл (cite-only): правовласник названий'),
  PL100: CITE('без ліцензії (cite-only): статус не встановлено'),
  LCH: CITE('© Велике Плем’я Лісових Чортів, 1983 (cite-only), скан власника'),
  FBRU: CITE('стаття fb.ru 2023; статус не встановлено'),
  EWIKT: OPEN('CC BY-SA 4.0'),
  WIKT: OPEN('CC BY-SA 4.0'),
  SUM20: { license: 'quote', maxChars: SIZE_BUDGET, fields: ['head', 'gloss', 'volume/page'], uncertain: 'див. sum20 (GG-7: дозвіл не отримано)' },
  R2U: CITE('без ліцензії (© r2u.org.ua), репозиторій brown-uk/r2u.org.ua порожній (research/30): лише цитування ≤ 300'),
  SUSM14: { license: 'quote', maxChars: SIZE_BUDGET, fields: ['head', 'pos'], uncertain: 'друк 1977–78 (©); беруться лише заголовні слова' },
  WUK: OPEN('CC BY-SA 4.0'),
  DWDS: CITE('довідка до сайту DWDS; статус не встановлено'),
  RYCHLY: CITE('стаття RASLAN 2008; статус не встановлено'),
  UCREL: CITE('сторінка калькулятора; статус не встановлено'),
  GRIES: CITE('стаття IJCL 2008; статус не встановлено'),
  WLIST: OPEN('CC BY-SA 4.0 (en.wikipedia)'),
  UPRS: CITE('стандарт ОРР 2025; статус не встановлено'),
  RUEWIKI: OPEN('CC BY-SA 4.0'),
  LONKIN: CITE('Ломоносов-2025, тези; статус не встановлено'),
  ISO: CITE('SIL ISO 639-3; статус не встановлено'),
  BILANIUK: CITE('Cornell UP 2005 (через en.wikipedia); статус не встановлено'),
  INPUT: OPEN('дані проєкту (вхід правила), без стороннього тексту'),
  CORPUS: OPEN('корпус проєкту: ліцензія кожної пам’ятки — у її записі маніфесту'),
  HOLOSK: CITE('друк 1929 (> 1925 за правилом репозиторію; Голоскевич † 1938): статус не встановлено'),
  HRINCH: { license: 'pd', note: 'Грінченко † 1910; друк 1907–09; ' + PUB_RULE },
  ESUM: { license: 'quote', maxChars: SIZE_BUDGET, fields: ['head', 'etymological statement (one excerpt)', 'volume/page'], uncertain: 'друк 1982–2012 (©): правовласник дозволу не давав; береться ОДИН уривок твердження' },
  'ESUM-GOROH': { license: 'quote', maxChars: EVIDENCE_CAP, fields: ['quote'], uncertain: 'дзеркало goroh.pp.ua: у коді цитата ≤ 300, у картках скану ≤ 200 (ESUM); ліцензію дзеркала не встановлено' },
  HROMYK: CITE('стаття у науковому віснику; статус не встановлено'),
  WKEN: OPEN('CC BY-SA 4.0'),
  WPUK: OPEN('CC BY-SA 4.0'),
  MASENKO: CITE('книга 2011 (через рецензію); статус не встановлено'),
  WIKIDATA: OPEN('CC0'),
  OSM: OPEN('ODbL'),
  KAIKKI: OPEN('CC BY-SA 4.0'),
  OPENCORPORA: OPEN('CC BY-SA 3.0'),
  WIKTUK: OPEN('CC BY-SA 4.0'),
  YT: CITE('відео лише як вбудований програвач; текст не зберігається'),
  WIKISPIV: CITE('пісенний вікі: ліцензію не встановлено'),
  MAKSYM1834: { license: 'pd', note: 'друк 1834 р.; Вікіджерела' },
  SOPHIA: CITE('зображення CC BY-NC; ліцензія тексту транскрипцій порталом не вказана'),
  ESUS: CITE('ЕСУ т. 3 (2004), стаття; статус не встановлено'),
  LEMKO: CITE('lemko.org: укладачів не названо; статус не встановлено'),
  IEU: CITE('Internet Encyclopedia of Ukraine; статус не встановлено'),
  NATEARTH: OPEN('public domain (Natural Earth)'),
  SMALST: { license: 'pd', note: 'друк 1892–1919; ' + PUB_RULE + '; скани власника, OCR' },
  OGON: { license: 'pd', note: 'Огоновський † 1894; друк 1889; ' + PUB_RULE },
  SYNYAV: CITE('Синявський 1941 (> 1925 за правилом репозиторію): статус не встановлено'),
  GU: CITE('новина gu.se; статус не встановлено'),
  AUM: { license: 'quote', maxChars: SIZE_BUDGET, fields: ['extracted features', 'short quotes ≤ 2 lines'], uncertain: 'Атлас 1988 (©): карти не републікуються' },
  AVDEEVA: { license: 'quote', maxChars: SIZE_BUDGET, fields: ['quote'], uncertain: 'словник 2008/2012 (©); цитати лише через статтю CC BY-ND 4.0' },
  KOLYBA: { license: 'quote', maxChars: SIZE_BUDGET, fields: ['quote'] },   // CC BY-NC-ND 3.0: cite with an active link only
  NOMIS1864: { license: 'pd', note: 'Номис † 1866; друк 1864 (SPEC 63 GG-19)' },
  ZHEL1886: { license: 'pd', note: 'Желехівський † 1885, Недільський † 1899; друк 1886 (SE-13)' },
  'FRANKO-PRYP': { license: 'pd', note: 'Франко † 1916; друк 1901–1910 (GG-19)' },
}

/** the r2u.org.ua dictionary witnesses of core/se.ts (digitised prints 1886–1933): one portal, one status (cite-only, no licence stated) */
const R2U_DICTS = ['r2u_zheleh', 'r2u_umanets', 'r2u_hrinch09', 'r2u_nikovsky', 'r2u_hrinch27', 'r2u_krymsky', 'r2u_izyumov', 'r2u_doroshenko', 'r2u_yakubski']

export const RIGHTS: Record<SourceId, Rights> = {
  ...DICTS,
  ...SOURCE_RIGHTS,
  ...Object.fromEntries(R2U_DICTS.map(id => [id, SOURCE_RIGHTS.R2U!])),
  // SOURCES keys that name the same book as a dictionary id share its entry
  CHABANENKO: DICTS.chabanenko!, ONYSHKEVYCH: DICTS.onyshkevych!, ONYSH: DICTS.onyshkevych!, SABADOSH: DICTS.sabadosh!, BUKOVYNA: DICTS.bukovyna!,
  HUTSUL: DICTS.hutsul!, ZAKREV: DICTS.hutsul!, SLAVYNETSKY: DICTS.slavynetsky!, ARKUSHYN: DICTS.arkushyn!, LYSENKO: DICTS.lysenko!, PYRTEY: { license: 'quote', maxChars: SIZE_BUDGET, fields: GLOSS_FIELDS, uncertain: 'Пиртей 2001: статус не встановлено' },
}

/** the entries whose status is NOT established and which therefore sit in the restrictive default `quote` */
export const UNCERTAIN: string[] = Object.entries(RIGHTS).filter(([, r]) => r.license === 'quote' && r.uncertain).map(([id]) => id)

/**
 * The clip limit of a source, in characters. `budget` is the shard-size budget of the call site (default SIZE_BUDGET).
 *  quote: the stricter of the registry limit and the budget · pd/open/unregistered: the budget · links: 0 · granted: its own maxChars, else Infinity (the budget is lifted).
 */
export function maxChars(id: SourceId, budget: number = SIZE_BUDGET): number {
  const r = RIGHTS[id]
  if (!r) return budget
  switch (r.license) {
    case 'quote': return Math.min(r.maxChars, budget)
    case 'links': return 0
    case 'granted': return r.maxChars ?? Infinity
    default: return budget
  }
}
/** true = the whole text may be kept (granted without a cap) */
export const isFullText = (id: SourceId): boolean => { const r = RIGHTS[id]; return r?.license === 'granted' && r.maxChars === undefined }

/** at most `max` characters, cut at a word boundary and marked with «…» (the one clipper; was sum-import.clip) */
export function clipTo(s: string, max: number): string {
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1), sp = cut.lastIndexOf(' ')
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:–-]+$/, '') + '…'
}
export const clip = (id: SourceId, text: string, budget: number = SIZE_BUDGET): string => clipTo(text, maxChars(id, budget))
