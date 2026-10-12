/**
 * Author vetting records (SPEC 00 P-2; research/06 §2, research/06b). Only quotes that were fetched are stored.
 * > "An author counts as vetted only with one fetched self-identification quote or self-chosen act" — research/06 §2.2
 * > "Never fabricate or reconstruct quotes from memory" — brief to the vetting agents
 */
import { Q, P, type Evidence } from '../core/evidence.ts'
import { AUTHORS_14A } from './nw-izb14a.ts'
import { AUTHORS_14B } from './nw-izb14b.ts'
import { AUTHORS_18A } from './nw-izb18a.ts'
import { AUTHORS_18B } from './nw-izb18b.ts'

export type AuthorLabel = 'ruthenian-rus' | 'ruthenian' | 'malorossian' | 'ukrainian' | 'institutional'
export type AuthorStatus = 'vetted' | 'provisional' | 'unverified' | 'excluded'
export interface Author {
  id: string; name: string; life: string; label: AuthorLabel; status: AuthorStatus
  confidence: 'explicit' | 'implicit' | 'disputed'; region?: string; evidence: Evidence[]; note?: string
}

const IZ = (path: string) => `http://izbornyk.org.ua/${path}`
const WS = (t: string) => `https://uk.wikisource.org/wiki/${t}`

export const AUTHORS: Author[] = [
  { id: 'ilarion', name: 'Іларіон Київський', life: 'fl. 1037–1055', label: 'ruthenian-rus', status: 'vetted', confidence: 'explicit', region: 'Київ',
    evidence: [Q(IZ('oldukr2/oldukr01.htm'), 'Слово о законі і благодаті', 'Не въ худѣ бо и невѣдомѣ земли владычьствоваша, нъ въ Руськѣ, яже вѣдома и слышима есть всѣми четырьми конци земли')] },
  { id: 'kyiv_chron', name: 'Київський літописець (ПВЛ, ред. 1113/1116)', life: 'текст бл. 1113', label: 'institutional', status: 'vetted', confidence: 'explicit', region: 'Київ',
    evidence: [Q(IZ('ipatlet/ipat01.htm'), 'Іпатіївський список, стб. 1', '…откуду єсть пошла Рускаӕ земля…')], note: 'авторство Нестора дискусійне — інституційний автор (research/06 §3.3)' },
  { id: 'monomakh', name: 'Володимир Мономах', life: '1053–1125', label: 'ruthenian-rus', status: 'vetted', confidence: 'explicit', region: 'Київ / Переяслав',
    evidence: [Q(IZ('oldukr/pouch.htm'), 'Повчання', 'Азъ худый, дѣдомъ своимъ Ярославомъ, благословленымъ, славнымъ, нареченѣмь въ крещеніи Василий, русьскымь именемь Володимиръ')] },
  { id: 'kyiv_chron_12', name: 'Київський літописець XII ст. (Київський літопис)', life: 'текст бл. 1200', label: 'institutional', status: 'vetted', confidence: 'implicit', region: 'Київ',
    evidence: [], note: 'evidence extracted from the witness itself at ingest time (pipelines/ingest.ts, selfReference)' },
  { id: 'volyn_chron', name: 'Галицько-Волинський літописець', life: 'текст бл. 1290', label: 'institutional', status: 'vetted', confidence: 'implicit', region: 'Галич / Волинь',
    evidence: [Q(IZ('ipatlet/ipat32.htm'), 'ПСРЛ т. 2, s.a. 6732 [1224]', 'сразившимсѧ с ними грѣхъ ради нашихъ . Роускимъ полкомъ побѣженъıмъ бъıвшıмъ')] },
  { id: 'arch_scribes', name: 'Писарі Архангельського Євангелія', life: '1092', label: 'institutional', status: 'provisional', confidence: 'disputed', region: 'Київ (імовірно)',
    evidence: [Q('VIRA', 'https://віра.укр/b/arch-gospel (meta description)', 'Архангельське Євангеліє, 1092р., написане ймовірно в Києві, пам\'ятка Київської Руси та української писемності')],
    note: 'церковнослов\'янська руської редакції (lang=chu-rus); ідентичність — через київське походження рукопису, не через самоназву' },
  { id: 'ostromir_scribe', name: 'Григорій диякон (Остромирове Євангеліє, колофон)', life: '1056–1057', label: 'institutional', status: 'provisional', confidence: 'disputed', region: 'Київ або Новгород (дискусійно)',
    evidence: [Q('TOROT', 'ostromir-col.xml (metadata)', 'Digitised from manuscript facsimile of the Ostromir Gospel available at http://www.nlr.ru/exib/Gospel/ostr/ill.html')],
    note: 'повний текст Євангелія відкрито не оцифровано (research/01 §1); використано лише колофон' },
  { id: 'slovo_author', name: 'Автор «Слова о полку Ігоревім» (анонім)', life: 'текст бл. 1185–1200', label: 'institutional', status: 'vetted', confidence: 'implicit', region: 'Русь',
    evidence: [Q('TOROT', 'spi.xml, citation-part 32 (sentence 211031)', 'О Руская земле! Уже за шеломянемъ еси!')],
    note: 'анонім; говорить зсередини («О Руская земле!») — інституційний автор; автентичність і датування дискусійні (research/16 §3), свідок = видання 1800 р., рукопис втрачено' },
  // W5 NW-3: not admitted — see note (P-2.1: no self-identification quote ⇒ no witness; the Бантыш-Каменский text is NOT ingested)
  { id: 'kochubei', name: 'Василь Кочубей (Рѣчь і Доношеніе 1708)', life: '1640–1708', label: 'malorossian', status: 'excluded', confidence: 'implicit', region: 'Полтавщина',
    evidence: [],
    note: 'Рѣчь + Доношеніе (Бантыш-Каменский, Источники малороссийской истории, ч. 2, М., 1859, с. 97–99; archive.org/details/bantueshkam2) прочитано (djvu-текст, сторінки 97–99): підписано «Василій Кочюбей, Судіа, Иванъ Искра, Полковникъ», але самоідентифікації як русин/малорос/українець там немає — «Малороссійскій край» названо краєм Царя, «мы, подліи» — підданими; отже Q-цитати самоназви немає (P-2.1). Мова — руська канцелярська з полонізмами; OCR потребує ручної вичитки. Виключено, текст не внесено (research/18 R2-2).' },
  // W5 NW-2 (last): provenance DISPUTED — both positions cited; the depository (Kyiv) is not the place of writing
  { id: 'kiev_missal_scribes', name: 'Писарі Київських глаголичних листків (Kiev Missal)', life: 'X ст. (1-ша сторінка: межа XI–XII ст.)', label: 'institutional', status: 'provisional', confidence: 'disputed',
    evidence: [
      Q('EOU', 'https://www.encyclopediaofukraine.com/pages%5CK%5CY%5CKyivMissal.htm', 'consisting of seven parchment sheets of undetermined origin. In 1872 it was deposited in the library of the Kyiv Theological Academy (hence its name).'),
      P('WPEN', 'https://en.wikipedia.org/wiki/Kiev_Missal', 'Linguistic, paleographic and graphic features indicate South Croatia as its place of origin.', 'позиція 1: південнохорватське походження (Damjanović 2003, p. 16)'),
      P('WPEN', 'https://en.wikipedia.org/wiki/Kiev_Missal#Czech_forgery_hypothesis', 'the Kiev Folios are a 19th-century fake by Czech patriots in order to prove the antiquity of Czech literary culture.', 'позиція 2: гіпотеза чеської підробки (Hamm 1979); Енциклопедія України такої позиції не підтримує'),
    ],
    note: 'походження невизначене: Київ — лише місце зберігання з 1872 р. (Київська духовна академія), не місце написання; мова — церковнослов’янська (lang=chu), не руська редакція. Provenance «disputed»: обидві позиції показуються; статус provisional (лише вторинні свідчення, P-2.1). Східнообродритська теза Пуканця не перевірена (research/16 §2 [U])' },
  { id: 'zinoviiv', name: 'Климентій Зіновіїв (єромонах)', life: 'кін. 1640-х/поч. 1650-х – після 1712', label: 'ruthenian', status: 'vetted', confidence: 'explicit', region: 'Лівобережжя',
    evidence: [Q(IZ('klyment/kly01.htm'), 'вступна стаття вид. 1971, про мезовірш рукопису-автографа', 'Иεромонах Климεнтіи Зѣновіεв син')],
    note: 'самоназва з мезовірша автографа (у передруку редакторів); народжений, ймовірно, на Правобережжі, жив на Лівобережжі (research/20 §1)' },
  { id: 'vyshensky', name: 'Іван Вишенський', life: 'бл. 1550 – бл. 1621', label: 'ruthenian', status: 'vetted', confidence: 'explicit', region: 'Галичина / Афон',
    evidence: [Q(IZ('old14_16/old14_19.htm'), 'Книжка', '…болгаре, словяне, арабанаши, мултяне, богданци, москва и наша русь…'), Q(IZ('old14_16/old14_19.htm'), 'Книжка', 'простою же нашею пѣснию рускою поюще')] },
  { id: 'samovydets', name: 'Самовидець (Літопис Самовидця)', life: 'текст 1672–1702', label: 'institutional', status: 'vetted', confidence: 'implicit', region: 'Лівобережжя',
    evidence: [Q(IZ('samovyd/sam02.htm'), 'Літопис Самовидця, ч. I (вид. Дзири, 1971)', 'А найгоршое насмівіско и утиски терпіл народ рускій от тих, которії з руской віри приняли римскую віру')] },
  { id: 'kotliarevsky', name: 'Іван Котляревський', life: '1769–1838', label: 'malorossian', status: 'vetted', confidence: 'implicit', region: 'Полтава',
    evidence: [Q('https://commons.wikimedia.org/wiki/File:Виргилиева_Энеида_СПб_1809_by_Russianname.jpg', 'титул вид. 1809 (скан)', 'ВИРГИЛІЕВА ЭНЕИДА на МАЛОРОССІЙСКІЙ ЯЗЫКЪ ПРЕЛОЖЕННАЯ И. КОТЛЯРЕВСКИМЪ')],
    note: 'видання 1798 р. (Парпура) — без згоди автора: witnessType=first_ed, flag 1798-parpura' },
  { id: 'shevchenko', name: 'Тарас Шевченко', life: '1814–1861', label: 'ukrainian', status: 'vetted', confidence: 'explicit', region: 'Київщина',
    evidence: [Q(IZ('shevchenko/shev140.htm'), 'Зібрання творів у 6 т., 2003, т. 1, с. 348', 'І МЕРТВИМ, І ЖИВИМ, І НЕНАРОЖДЕННИМ ЗЕМЛЯКАМ МОЇМ В УКРАЙНІ І НЕ В УКРАЙНІ МОЄ ДРУЖНЄЄ ПОСЛАНІЄ')] },
  { id: 'kulish', name: 'Пантелеймон Куліш', life: '1819–1897', label: 'ukrainian', status: 'vetted', confidence: 'explicit', region: 'Чернігівщина',
    evidence: [Q(WS('Хуторна_поэзія/Зазивний_Лист_до_Украінськоі_Интеллікгенціі'), 'Хуторна поэзія, Львів 1882', 'кладемо́ іі́ в осно́вину на́шого пропові́дання украі́нськоі націона́льности и духо́вноі свобо́ди')] },
  { id: 'franko', name: 'Іван Франко', life: '1856–1916', label: 'ruthenian', status: 'vetted', confidence: 'implicit', region: 'Галичина',
    evidence: [Q(WS('З_вершин_і_низин_(1893)'), 'передмова, Львів 1893', 'На мні в мінятурі повторилось те, що в великім розмірі бачимо на всій галицько-руській літературі'), Q(WS('Мойсей_(1905)'), 'Пролог, Львів 1905', 'Народе мій, замучений, розбитий')],
    note: 'видання 1956–62 (Нью-Йорк) систематично замінювало «Русин/руський» на «Українець/український» — не використовується (research/06b §2)' },
  { id: 'lesya', name: 'Леся Українка', life: '1871–1913', label: 'ukrainian', status: 'vetted', confidence: 'explicit', region: 'Волинь',
    evidence: [Q(WS('На_крилах_пісень/Сім_струн/Do._Гімн'), 'На крилах пісень, Львів 1892', 'До те́бе, Укра́їно, наша бездольная мати, / Струна́ моя перша озветься')] },
  { id: 'hrinchenko', name: 'Борис Грінченко', life: '1863–1910', label: 'ukrainian', status: 'vetted', confidence: 'implicit', region: 'Слобожанщина',
    evidence: [Q(WS('Три_питання_нашого_правопису'), 'Київ 1908, розд. I', 'на всьому просторі української землі … сама вже показує, що він дуже придатний до того, щоб добре виявляти згуки нашої мови')] },
  // identity vetted, but only modernised reprints online → not used as form witnesses (research/06b §3)
  { id: 'nechuy', name: 'Іван Нечуй-Левицький', life: '1838–1918', label: 'ukrainian', status: 'vetted', confidence: 'explicit',
    evidence: [Q(WS('Непотрібність_великоруської_літератури_для_України_і_для_слов\'янщини/Частина_1'), '1878 (передрук 1998)', 'Великоруська журналістика знущалась над нашим язиком та літературою. Трудно й до сього часу розвиватись українській літературі')] },
  { id: 'drahomanov', name: 'Михайло Драгоманов', life: '1841–1895', label: 'ukrainian', status: 'vetted', confidence: 'explicit',
    evidence: [Q(IZ('drag/drag19.htm'), 'Чудацькі думки… (1891), вид. 1991', 'та увага … зовсім не шкідлива для нас, українців, а навіть могла б бути дуже корисною')] },
  ...AUTHORS_14A,
  ...AUTHORS_14B,
  ...AUTHORS_18A,
  ...AUTHORS_18B,
]

export const authorById = Object.fromEntries(AUTHORS.map(a => [a.id, a])) as Record<string, Author>
export const admissible = (a?: Author) => !!a && (a.status === 'vetted' || a.status === 'provisional')
