/**
 * SPEC 63 CX-1 — izbornyk XVII (old17, «Українська література XVII ст.», упоряд. В. І. Крекотень, К.: Наукова думка, 1987) and the Ruthenian redaction of Danylo's
 * «Перегринація» (old14_05). Catalogue: research/29. Data table: every dating quote and every vetting quote is a verbatim fragment of the cached page
 * (tests/nw-izbornyk.test.ts re-checks them). Admission rule as in nw-izb14b: (1) an author's own first-person/insider sentence naming Rus'/Ukraine, else the page is skipped.
 * > "Твори, писані староукраїнською мовою, транскрибуються за сучасним українським правописом з урахуванням орфоепічних, морфологічних та лексичних особливостей мови XVII ст.:
 * >  «Ђ» передається через «і», «ї», «и»; «ы» — через «и»" — old17.htm, editors' preface (so orth = modernised: lexical witness, like old18)
 * > "Твори, писані польською та латинською мовами, подаються в українському перекладі." — same (→ Baranovych, Bratkovsky, Buchynsky, Smotrytsky's Θρῆνος are NOT ingested)
 */
import { Q } from '../core/evidence.ts'
import type { Unit } from './manifest.ts'
import type { Author } from './authors.ts'
import { UNITS_CX, AUTHORS_CX } from './nw-cx.ts'

const IZ17 = (n: string) => `http://izbornyk.org.ua/old17/old17_${n}.htm`
const ED17 = 'Українська література XVII ст., К.: Наукова думка, 1987 (Ізборник; правопис модернізовано)'

export const UNITS_17: Unit[] = [
  { id: 'i14_05b', title: 'Данило Корсунський. Перегринація, ілі Путь до Ієрусалима (редакція XVI ст.)', author: 'danylo_korsunsky', kind: 'izbornyk-page', urls: ['http://izbornyk.org.ua/old14_16/old14_05.htm'],
    date: [1580, 1600], dateCite: Q('IZB', 'http://izbornyk.org.ua/old14_16/old14_05.htm', '«Перегринація, ілі Путь до Ієрусалима» Данила Корсунського (кінця XVI ст.)'),
    lang: 'ruthenian', witnessType: 'scholarly_ed', edition: 'Українська література XIV–XVI ст., К.: Наукова думка, 1988 (Ізборник; за вид. В. Щурата, Жовква 1906, улюцька рукопис XVI ст.; правопис нормалізовано редакторами)', orth: 'ізборник-нормалізований' },
  { id: 'i17_01', title: 'Пересторога', author: 'anon_i17_01', kind: 'izbornyk-page', urls: [IZ17('01')],
    date: [1603, 1607], dateCite: Q('IZB', IZ17('01'), 'написаний невідомим автором бл. 1605 р.'), lang: 'ruthenian', region: 'Львів (список львівського братства)', witnessType: 'scholarly_ed', edition: ED17, orth: 'modernised' },
  { id: 'i17_03', title: 'Захарія Копистенський. Палінодія (фрагменти, 1621)', author: 'kopystensky', kind: 'izbornyk-page', urls: [IZ17('03')],
    date: [1621, 1621], dateCite: Q('IZB', IZ17('03'), 'РОКУ РОЖДЕСТВА БОГА СЛОВА ІЇСУСА ХРИСТА 1621-ГО, МІСЯЦЯ НОЕМВРІЯ 26'), lang: 'ruthenian', region: 'Київ', witnessType: 'scholarly_ed', edition: ED17, orth: 'modernised' },
  { id: 'i17_06', title: 'Антоній Радивиловський. Слово 1-е часу войни', author: 'radyvylovsky', kind: 'izbornyk-page', urls: [IZ17('06')],
    date: [1676, 1683], dateCite: Q('IZB', IZ17('06'), 'Казання збереглося в рукописному «Вінці» 1676 — 1683 рр.'), lang: 'ruthenian', region: 'Київ', witnessType: 'scholarly_ed', edition: ED17, orth: 'modernised' },
  { id: 'i17_20', title: 'Іван Величковський. Епіграми; «Зегар з полузегарком»; «Млеко»', author: 'velychkovsky', kind: 'izbornyk-page', urls: [IZ17('20')],
    date: [1680, 1691], dateCite: Q('IZB', IZ17('20'), 'офірованная року 1690. А другая, названная Млеко, офірованная року 1691». Обидві дати — час дарування книжечок, написані ж вони, мабуть, дещо раніше'),
    lang: 'ruthenian', region: 'Чернігів / Полтава', witnessType: 'scholarly_ed', edition: ED17, orth: 'modernised' },
  { id: 'i17_24', title: 'Климентій Зіновіїв. Вірші (добірка)', author: 'zinoviiv', kind: 'izbornyk-page', urls: [IZ17('24')],
    date: [1700, 1709], dateCite: Q('IZB', IZ17('24'), 'Вважають, що книжка ця виникла між 1700 і 1709 рр.'), lang: 'ruthenian', region: 'Лівобережжя', witnessType: 'scholarly_ed', edition: ED17 + '; за вид. К. Зіновіїв, Вірші. Приповісті посполиті, К., 1971', orth: 'modernised' },
  { id: 'i17_28', title: 'Житіє княгині Ольги (рукопис XVII ст.)', author: 'anon_i17_28', kind: 'izbornyk-page', urls: [IZ17('28')],
    date: [1600, 1699], dateCite: Q('IZB', IZ17('28'), 'Подається за рукописом XVII ст.'), lang: 'ruthenian', witnessType: 'scholarly_ed', edition: ED17, orth: 'modernised' },
  { id: 'i17_29', title: 'Житіє князя Володимира (Києво-Печерський друк близько 1670)', author: 'anon_i17_29', kind: 'izbornyk-page', urls: [IZ17('29')],
    date: [1668, 1671], dateCite: Q('IZB', IZ17('29'), 'виданий друкарнею Києво-Печерської лаври близько 1670 р.'), lang: 'ruthenian', region: 'Київ', witnessType: 'scholarly_ed', edition: ED17, orth: 'modernised' },
  ...UNITS_CX,   // CX-2/CX-3: Wikisource first editions and further witnesses (nw-cx.ts)
]

export const AUTHORS_17: Author[] = [
  ...AUTHORS_CX,
  { id: 'danylo_korsunsky', name: 'Данило Корсунський (укладач ruthenian-редакції «Перегринації»)', life: 'кін. XVI ст.', label: 'ruthenian', status: 'vetted', confidence: 'explicit', region: 'Корсунь / Сяноччина',
    evidence: [Q('IZB', 'http://izbornyk.org.ua/old14_16/old14_05.htm', 'От нашої Русі, міста Корсуня до Каменця-Подольського — 20 миль')],
    note: 'редакція XVI ст. давнішого «Хожденія» ігумена Данила (1106–1108); «Поклоненіє св. града» тієї ж сторінки (переклад з грецької) не ingestується' },
  { id: 'anon_i17_01', name: 'Анонім: Пересторога (бл. 1605)', life: '—', label: 'institutional', status: 'vetted', confidence: 'implicit', region: 'Львів',
    evidence: [Q('IZB', IZ17('01'), 'склеп великий книг наших словенських учительських, докупи знесених по збуренню й осягненню панства руського')] },
  { id: 'kopystensky', name: 'Захарія Копистенський', life: 'fl. 1621', label: 'ruthenian', status: 'vetted', confidence: 'implicit', region: 'Київ',
    evidence: [Q('IZB', IZ17('03'), 'Било теж і в Росії нашей дидаскалов много')] },
  { id: 'radyvylovsky', name: 'Антоній Радивиловський', life: '? – 1688', label: 'ruthenian', status: 'vetted', confidence: 'implicit', region: 'Київ',
    evidence: [Q('IZB', IZ17('06'), 'коли так много християн в землі нашей Російстєй вигубив')] },
  { id: 'velychkovsky', name: 'Іван Величковський', life: '? – 1701', label: 'malorossian', status: 'vetted', confidence: 'explicit', region: 'Чернігів / Полтава',
    evidence: [Q('IZB', IZ17('20'), 'я, яко істинний син Малоросійської отчизни нашої')] },
  { id: 'anon_i17_28', name: 'Анонім: Житіє княгині Ольги (XVII ст.)', life: '—', label: 'institutional', status: 'vetted', confidence: 'implicit',
    evidence: [Q('IZB', IZ17('28'), 'в которих наш народ руський, непрестанними войнами забавляючися межи собою')] },
  { id: 'anon_i17_29', name: 'Анонім: Житіє князя Володимира (Київ, бл. 1670)', life: '—', label: 'institutional', status: 'vetted', confidence: 'implicit', region: 'Київ',
    evidence: [Q('IZB', IZ17('29'), 'не допустив до конця Руськой нашей землі в темності невірія')] },
  // skipped (P-2.1: no self-identification of the author in the page text, or modern translation) — listed for the record, not ingested
  { id: 'anon_i17_12', name: 'Касіян Сакович (вірші на погреб Сагайдачного, 1622)', life: '? – 1647', label: 'ruthenian', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'на сторінці лише «віру нашу святую» (конфесія, без Русі/України в голосі автора) (P-2.1)' },
  { id: 'anon_i17_17', name: 'Анонім: вірші другої половини XVII ст. (Глаголет Польща …)', life: '—', label: 'institutional', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'московська орієнтація текстів, автор не говорить як «ми, Русь/Україна»; русь/Росія лише в 3-й особі (P-2.1)' },
  { id: 'anon_i17_16', name: 'Анонім: вірші про визвольну війну 1648–1654', life: '—', label: 'institutional', status: 'excluded', confidence: 'implicit', evidence: [],
    note: '«від народу малоросійського» — лише редакторська/збірникова рубрика над збірним віршем; самоназви в голосі автора немає (P-2.1)' },
  { id: 'baranovych', name: 'Лазар Баранович (Lutnia Apollinowa)', life: '1620–1693', label: 'ruthenian', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'польськомовний оригінал; сторінка — сучасний переклад В. Крекотня (old17.htm, передмова упорядника) — не період мови (language gate)' },
]
