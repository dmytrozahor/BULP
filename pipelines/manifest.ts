/**
 * Corpus manifest (SPEC 10 M-1). One entry per *source unit*; ingest may split a unit into several witnesses
 * (Hypatian codex → Kyiv Chronicle + Galician-Volhynian Chronicle, SPEC 10 M-2.3) or date sub-units from the page
 * itself (Shevchenko: «Датується …» line of the 2003 scholarly edition).
 *
 * > "Use the composition date. Store the manuscript/copy date separately as copy_date, because epoch reflects
 * >  the language of the text." — research/09 §4
 */
import { Q, P, type Evidence } from '../core/evidence.ts'
import { UNITS_14A } from './nw-izb14a.ts'
import { UNITS_14B } from './nw-izb14b.ts'
import { UNITS_18A } from './nw-izb18a.ts'
import { UNITS_18B } from './nw-izb18b.ts'
import { UNITS_SONGS } from './nw-songs.ts'
import { UNITS_DICT } from './nw-dict.ts'
import { UNITS_R2U } from './nw-r2u.ts'
import { UNITS_17 } from './nw-izb17.ts'
import type { WitnessMedia } from '../core/types.ts'

export type Kind = 'torot' | 'izbornyk' | 'izbornyk-page' | 'wikisource' | 'vira' | 'dict' | 'r2u'
export type Lang = 'orv' | 'chu-rus' | 'chu' | 'ruthenian' | 'uk' | 'undetermined'
export type WitnessType = 'autograph' | 'ms_copy' | 'first_ed' | 'later_ed' | 'scholarly_ed' | 'dictionary'

export interface Unit {
  id: string; title: string; author: string; kind: Kind
  urls: string[]                         // fixed URLs; discovery units list their TOC/prefix here
  discover?: 'shevchenko-toc' | 'wikisource-prefix' | 'vira-chapters'
  split?: 'hypatian'
  date: [number, number]; dateCite: Evidence; datePerPage?: boolean
  msDate?: number; lang: Lang; region?: string; witnessType: WitnessType; edition: string; orth?: string; license?: string
  oldI?: boolean                         // N06: Old Rus' і = и (pre-1400 texts)
  media?: WitnessMedia                   // NW-7: a song's video (YouTube id), carried to WitnessOut.media
}

const IZ = (p: string) => `http://izbornyk.org.ua/${p}`
const WS = (t: string) => `https://uk.wikisource.org/wiki/${t}`
const SHEV04 = 'http://izbornyk.org.ua/shevelov/shev04.htm, розд. 14'
const range = (pfx: string, a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => `${pfx}${String(a + i).padStart(2, '0')}.htm`)
const HYP_DATE = Q('SHEV', SHEV04, 'Іп. літоп. — зроблена бл. 1425 р. російська копія давньоукраїнського ориґіналу …, що містить Найдавніший (Початковий) Київський літопис, Київський літопис (1117-1200) і пізніші Галицький та Волинський літописи (1200 -1292)')

export const MANIFEST: Unit[] = [
  { id: 'ostromir', title: 'Остромирове Євангеліє, колофон', author: 'ostromir_scribe', kind: 'torot',
    urls: ['https://raw.githubusercontent.com/torottreebank/treebank-releases/master/ostromir-col.xml'],
    date: [1056, 1057], dateCite: Q('SHEV', SHEV04, 'Євангелія, написана в 1056-1057 рр. для новгородського посадника Остромира'),
    lang: 'chu-rus', region: 'Київ або Новгород', witnessType: 'autograph', edition: 'TOROT ostromir-col (Sykes, Eckhoff)', license: 'CC BY-NC-SA 3.0', oldI: true },
  { id: 'ilarion', title: 'Іларіон. Слово о законі і благодаті', author: 'ilarion', kind: 'izbornyk', urls: [IZ('oldukr2/oldukr01.htm')],
    date: [1037, 1050], dateCite: Q('IZB', IZ('oldukr2/oldukr01.htm') + ', прим. 166', 'Слова Іларіона свідчать, що до 1050 року, коли ймовірно було написана пам’ятка, будівництво було завершене.'),
    lang: 'orv', region: 'Київ', witnessType: 'scholarly_ed', edition: 'Ізборник (за друк. вид.)', oldI: true },
  { id: 'arch', title: 'Архангельське Євангеліє', author: 'arch_scribes', kind: 'vira', urls: ['https://xn--80ad6b1e.xn--j1amh/b/arch-gospel'], discover: 'vira-chapters',
    date: [1092, 1092], dateCite: Q('SHEV', SHEV04, 'Арх. Єв. (щонайпізніше 1092 р.), ймовірно, київська'),
    lang: 'chu-rus', region: 'Київ (імовірно)', witnessType: 'autograph', edition: 'віра.укр онлайн-видання (шрифт UstavUCS3)', oldI: true },
  { id: 'pvl_lav', title: 'Повість временних літ (Лаврентіївський список)', author: 'kyiv_chron', kind: 'torot',
    urls: ['https://raw.githubusercontent.com/torottreebank/treebank-releases/master/lav.xml'],
    date: [1110, 1118], dateCite: P('SHEV', SHEV04, 'Найдавніший (Початковий) Київський літопис', 'редакція бл. 1113/1116 (research/06 §3.3); список 1377 р.'),
    msDate: 1377, lang: 'orv', region: 'Київ', witnessType: 'ms_copy', edition: 'TOROT lav', license: 'CC BY-NC-SA 3.0', oldI: true },
  { id: 'monomakh', title: 'Володимир Мономах. Повчання', author: 'monomakh', kind: 'izbornyk', urls: [IZ('oldukr/pouch.htm')],
    date: [1096, 1117], dateCite: Q('IZB', IZ('oldukr/pouch.htm'), 'Ймовірно, твори було створено наприкінці 90-х років XI ст. (Д.Лихачов датує 1117 роком)'),
    msDate: 1377, lang: 'orv', region: 'Київ / Переяслав', witnessType: 'ms_copy', edition: 'Ізборник (Лаврентіївський список)', oldI: true },
  { id: 'hypatian', title: 'Літопис руський за Іпатіївським списком', author: 'kyiv_chron_12', kind: 'izbornyk', urls: range(IZ('ipatlet/ipat'), 1, 41), split: 'hypatian',
    date: [1117, 1292], dateCite: HYP_DATE, msDate: 1425, lang: 'orv', witnessType: 'ms_copy', edition: 'ПСРЛ т. 2, СПб., 1908 (ред. О. Шахматов)', oldI: true },
  { id: 'spi', title: 'Слово о полку Ігоревім (TOROT spi, за виданням 1800 р.)', author: 'slovo_author', kind: 'torot',
    urls: ['https://raw.githubusercontent.com/torottreebank/treebank-releases/master/spi.xml'],
    date: [1185, 1200], dateCite: P('TOROT', 'https://raw.githubusercontent.com/torottreebank/treebank-releases/master/spi.xml', 'кінець XII ст. (Пріцак: після 1190–1192 рр.)',
      'research/16 §3: датування — [P] за gazeta.ua/articles/history/_comu-slovo-o-polku-igorevim-ne-falsifikat/676501 і library.bdpu.org.ua; автентичність оспорювана, рукопис втрачено — свідок = видання 1800 р. (electronic-text-version: «a slightly corrected version of the first edition from 1800»)'),
    msDate: 1800, lang: 'orv', witnessType: 'first_ed', edition: 'TOROT spi (Majer, Sykes); текст Б. Орехова за 1-м виданням 1800 р.', license: 'CC BY-NC-SA 3.0', oldI: true },
  { id: 'kiev-mis', title: 'Київські глаголичні листки (Kiev Missal, TOROT kiev-mis)', author: 'kiev_missal_scribes', kind: 'torot',
    urls: ['https://raw.githubusercontent.com/torottreebank/treebank-releases/master/kiev-mis.xml'],
    date: [950, 1100], dateCite: P('WPEN', 'https://en.wikipedia.org/wiki/Kiev_Missal', 'dated at no later than the latter half of the 10th century; first page of folio 1 written probably at the boundary of the 11th and 12th centuries',
      'переказ статті; джерело статті — Damjanović 2003, p. 15–16 (research/16 §2)'),
    lang: 'chu', witnessType: 'ms_copy', edition: 'TOROT kiev-mis (Sykes, Eckhoff); не київська редакція: походження дискусійне (disputed)', license: 'CC BY-NC-SA 3.0' },
  { id: 'pripovisti', title: 'Климентій Зіновіїв. Приповісті посполиті', author: 'zinoviiv', kind: 'izbornyk-page',
    urls: [IZ('klyment/kly08.htm'), IZ('klyment/kly01.htm')],   // kly01 = editors' introduction: dating + the author's self-naming (read for evidence only, not ingested)
    date: [1700, 1709], dateCite: Q('IZB', IZ('klyment/kly01.htm') + ', вступна стаття, с. 16–17', 'Уважне вивчення віршів Климентія дозволяє датувати рукопис періодом між 1700 і 1709 рр.'),
    lang: 'ruthenian', region: 'Лівобережжя', witnessType: 'autograph', edition: 'Зіновіїв К. Вірші. Приповісті посполиті, підг. І. П. Чепіга, К.: Наукова думка, 1971, с. 211–266 (автограф; правопис рукопису)', orth: 'рукопис (диякритики)' },
  { id: 'vyshensky', title: 'Іван Вишенський. Книжка', author: 'vyshensky', kind: 'izbornyk', urls: [IZ('old14_16/old14_19.htm')],
    date: [1588, 1600], dateCite: Q('IZB', IZ('old14_16/old14_19.htm'), 'Ще у 1599 — 1600 рр. Іван Вишенський частину своїх творів переписав у спеціальну «Книжку»'),
    lang: 'ruthenian', region: 'Галичина / Афон', witnessType: 'scholarly_ed', edition: 'Ізборник' },
  { id: 'samovydets', title: 'Літопис Самовидця', author: 'samovydets', kind: 'izbornyk', urls: [IZ('samovyd/sam02.htm'), IZ('samovyd/sam03.htm'), IZ('samovyd/sam04.htm')],
    date: [1672, 1702], dateCite: P('IZB', IZ('samovyd/sam.htm'), 'Літопис Самовидця (1672–1702)', 'дату цитувати з передмови вид. Дзири при ingest'),
    lang: 'ruthenian', region: 'Лівобережжя', witnessType: 'scholarly_ed', edition: 'вид. Я. І. Дзири, К., 1971' },
  { id: 'eneida1798', title: 'Котляревський. Енеида (1798)', author: 'kotliarevsky', kind: 'wikisource', urls: [WS('Енеїда_(1798)')], discover: 'wikisource-prefix',
    date: [1798, 1798], dateCite: Q('WS', WS('Енеїда_(1798)'), 'Малороссійская Енеида въ трехъ частяхъ… рік = 1798'),
    lang: 'uk', region: 'Полтавщина', witnessType: 'first_ed', edition: 'СПб. 1798 (вид. Парпури, без згоди автора)', orth: 'ярижка', license: 'PD' },
  { id: 'shevchenko', title: 'Шевченко. Поезії (Зібрання творів у 6 т., т. 1)', author: 'shevchenko', kind: 'izbornyk', urls: [IZ('shevchenko/shev1.htm')], discover: 'shevchenko-toc',
    date: [1837, 1861], datePerPage: true, dateCite: P('IZB', IZ('shevchenko/shev1.htm'), 'Зібрання творів у 6 т., т. 1', 'дата кожного вірша — з рядка «Датується …» на його сторінці'),
    lang: 'uk', region: 'Київщина', witnessType: 'scholarly_ed', edition: 'Зібрання творів у 6 т., К., 2003', orth: 'сучасна (наук. вид.)' },
  { id: 'kulish1882', title: 'Куліш. Хуторна поэзія', author: 'kulish', kind: 'wikisource', urls: [WS('Хуторна_поэзія')], discover: 'wikisource-prefix',
    date: [1882, 1882], dateCite: Q('WS', WS('Хуторна_поэзія'), 'Хуторна поэзія. Львів 1882'), lang: 'uk', region: 'Чернігівщина', witnessType: 'first_ed', edition: 'Львів 1882', orth: 'кулішівка', license: 'PD' },
  { id: 'lesya1892', title: 'Леся Українка. На крилах пісень', author: 'lesya', kind: 'wikisource', urls: [WS('На_крилах_пісень')], discover: 'wikisource-prefix',
    date: [1892, 1892], dateCite: Q('WS', WS('На_крилах_пісень'), 'ТВОРИ Лесі Українки … ЛЬВІВ 1892'), lang: 'uk', region: 'Волинь', witnessType: 'first_ed', edition: 'Львів 1892', orth: 'кулішівка', license: 'PD' },
  { id: 'franko1893', title: 'Франко. З вершин і низин (2-ге вид.)', author: 'franko', kind: 'wikisource', urls: [WS('З_вершин_і_низин_(1893)')], discover: 'wikisource-prefix',
    date: [1893, 1893], dateCite: Q('WS', WS('З_вершин_і_низин_(1893)'), 'Львів 1893, накладом Ольги Франко'), lang: 'uk', region: 'Галичина', witnessType: 'first_ed', edition: 'Львів 1893', orth: 'желехівка', license: 'PD' },
  { id: 'franko1905', title: 'Франко. Мойсей', author: 'franko', kind: 'wikisource', urls: [WS('Мойсей_(1905)')], discover: 'wikisource-prefix',
    date: [1905, 1905], dateCite: Q('WS', WS('Мойсей_(1905)'), 'Мойсей. Львів 1905'), lang: 'uk', region: 'Галичина', witnessType: 'first_ed', edition: 'Львів 1905', orth: 'желехівка', license: 'PD' },
  { id: 'hrinchenko1908', title: 'Грінченко. Три питання нашого правопису', author: 'hrinchenko', kind: 'wikisource', urls: [WS('Три_питання_нашого_правопису')], discover: 'wikisource-prefix',
    date: [1908, 1908], dateCite: Q('WS', WS('Три_питання_нашого_правопису'), 'Київ: Електр. друкарня К. Н. Милевського, 1908'), lang: 'uk', region: 'Київщина', witnessType: 'first_ed', edition: 'Київ 1908', license: 'PD' },
  ...UNITS_14A,
  ...UNITS_14B,
  ...UNITS_18A,
  ...UNITS_18B,
  ...UNITS_SONGS,
  ...UNITS_DICT,
  ...UNITS_R2U,
  ...UNITS_17,
]

/** Raw cache path: one directory per kind, never executed (P-4.5). */
export const rawPath = (u: Unit, i: number) => `data/raw/${u.kind}/${u.id}/${String(i).padStart(3, '0')}.${u.kind === 'torot' ? 'xml' : u.kind === 'dict' ? 'txt' : 'html'}`
