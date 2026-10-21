/**
 * SPEC 63 HV-5 (owner 2026-10-21): public-domain Ruthenian / Middle-Ukrainian texts of litopys.org.ua = izbornyk.org.ua (the same site, windows-1251 pages).
 * robots.txt of both hosts: only /dos /mac /koi disallowed; pacing 3 s. One page = one item; the payload is the raw page (gz), ingest reads only the primary-text
 * paragraphs (`<p class=K1…>`, verse V1…; the editors' introduction/notes are `<p class=Prym>` and are never read: they are in copyright).
 *
 *  TIER 1  the works of research/44-bratstva-bibliography.md that have an online text and are neither in the corpus yet nor in hv4:
 *          every row is mapped below (HV5_BRATSTVA) with the verdict; the queued ones carry the row's school (research/44 «Школа (ймовірно)») as a sourced field.
 *  TIER 2  other pages of the anthologies «Українська література XIV–XVI ст.» (1988), «… XVII ст.» (1987) and «Українська поезія. Кінець XVI — поч. XVII ст.» (1978):
 *          pages that pipelines/manifest.ts already ingests are skipped at run time (MANIFEST urls), translations from Polish/Latin/Greek are skipped (list below).
 *  DATE    never guessed: (1) a curated `dateQuote` that must occur verbatim in the page text (else the item is undated and ingest skips it),
 *          (2) a research/44 row dating (`dateSource`), (3) tier 2: a sentence of the page that names a year together with a composition/printing verb (`autoDate`), else null.
 * Usage: tsx harvest/hv5.ts [1|2]   (no argument = both; resumable: index.jsonl is the truth, an index line is appended after the item file is written)
 */
import { Harvest, decisionNeeded, type IndexItem } from './lib.ts'

const BASE = 'http://litopys.org.ua/'
const EDN14 = 'Українська література XIV–XVI ст., К.: Наукова думка, 1988 (Ізборник; правопис нормалізовано редакторами)'
const EDN17 = 'Українська література XVII ст., К.: Наукова думка, 1987 (Ізборник; сучасний правопис)'
const EDNP = 'Українська поезія. Кінець XVI — початок XVII ст., К.: Наукова думка, 1978 (Ізборник)'
const LIC = (ed: string) => `PD (твір ≤ XVIII ст.); текст сканований і набраний litopys.org.ua / izbornyk.org.ua за вид.: ${ed}. Вступи, примітки й коментарі укладачів (Prym) не беруться`

export interface Hv5Unit {
  id: string; path: string; title: string; author?: string; region?: string
  /** «1591», «1603-1607»; null = undated (ingest skips it) */
  date?: string | null
  /** verbatim fragments of the page text (after `norm`) that state the date; ALL must occur, else the item is stored undated */
  dateQuote?: string[]
  /** a dating taken from a research file instead of the page: «research/44 r09: …» */
  dateSource?: string
  /** research/44 school id (lviv | ostroh | vilno | lutsk | kyiv-bohoiavl | lavra | berestia | unknown) + the row that gives it + its certainty */
  school?: string; schoolSource?: string; schoolConfidence?: string
  rows?: string[]; orth: string; edition: string; tier: 1 | 2 | 3; note?: string
  /** the dating is quoted from another page (e.g. the editors' notes of the academic edition); the quotes must occur there */
  datePage?: string
}

/** page text as the quotes are written: tags out, entities decoded, Ђ→ѣ, one space between words (same as decodeIzbornyk for the letters) */
export function norm(html: string): string {
  const a = html.indexOf('class="dop3"')
  return (a < 0 ? html : html.slice(a + 'class="dop3"'.length)).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<sup[\s\S]*?<\/sup>/gi, '').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&').replace(/[Ђђ]/g, 'ѣ').replace(/\s+/g, ' ').trim()
}
/** a sentence of the page that states a composition/printing year; null if none (the item stays undated) */
export function autoDate(text: string): { date: string; quote: string } | null {
  const VERB = /(написан|створен|складен|укладен|датуєт|датован|закінчен|завершен)/i
  const PLACE = /(?:Київ|Львів|Острог|Вільно|Євє|Єв'є|Дермань|Супрасль|Почаїв|Чернігів|Рахманів|Кутеїн)\S*,\s*(1[3-7]\d\d)\b/
  for (const s of text.split(/(?<=[.!?»])\s+/)) {
    if (s.length > 300) continue
    const v = s.match(/\b(1[3-7]\d\d)\s*(?:р\.|рр\.|року)/)
    if (v && VERB.test(s)) return { date: v[1]!, quote: s }
    const p = s.match(PLACE)
    if (p && /Вперше надруковано/.test(s)) return { date: p[1]!, quote: s }
  }
  return null
}

const B = (id: string, path: string, o: Partial<Hv5Unit> & { title: string }): Hv5Unit => ({ id: `hv5:${id}`, path, orth: 'ізборник-нормалізований', edition: EDN14, tier: 1, ...o })
/** research/44 rows with an online text → verdict. `queued` rows have a unit in HV5_UNITS; the rest are skipped with the reason (counted in the report). */
export const HV5_BRATSTVA: Record<string, { verdict: 'queued' | 'in-corpus' | 'hv4' | 'translation'; where: string }> = {
  r01: { verdict: 'in-corpus', where: 'old14_13 (manifest i14_13)' }, r02: { verdict: 'in-corpus', where: 'old14_14' }, r03: { verdict: 'in-corpus', where: 'old14_15' },
  r04: { verdict: 'in-corpus', where: 'old14_19 (vyshensky)' }, r05: { verdict: 'queued', where: 'old14_33' }, r06: { verdict: 'queued', where: 'old14_34 (epigram only)' },
  r07: { verdict: 'queued', where: 'old14_34' }, r08: { verdict: 'in-corpus', where: 'old14_16' }, r09: { verdict: 'queued', where: 'old14_35 (verses of the grammar)' },
  r10: { verdict: 'hv4', where: 'hv4:zyzanii-leksis-1596 (izbornyk zyzlex = Німчук 1964, rights unclear)' }, r13: { verdict: 'in-corpus', where: 'old14_18' },
  r14: { verdict: 'in-corpus', where: 'old14_19' }, r15: { verdict: 'in-corpus', where: 'old14_19' }, r16: { verdict: 'in-corpus', where: 'old17_01' },
  r18: { verdict: 'queued', where: 'old14_37 (= ukrpoetry anto17)' }, r20: { verdict: 'translation', where: 'old17_02: modern Ukrainian translation of the Polish original (old17 preface)' },
  r21: { verdict: 'queued', where: 'old17_11 (= anto21)' }, r22: { verdict: 'queued', where: 'old17_11: only the epigrams printed in the 1616 edition; the Gospel text is not online' },
  r26: { verdict: 'hv4', where: 'hv4:smotrytskyi-hramatyka-1619 (izbornyk smotrgram = facsimile images)' }, r32: { verdict: 'in-corpus', where: 'old17_03' },
  r33: { verdict: 'in-corpus', where: 'old17_12' }, r35: { verdict: 'hv4', where: 'hv4:berynda-leksikon-1627 / 1653' },
}

export const HV5_UNITS: Hv5Unit[] = [
  // ── tier 1: research/44 ───────────────────────────────────────────────────────────────────────────────
  B('old14_33', 'old14_16/old14_33.htm', { title: 'Просфонима (привіт митрополиту Михайлу Рогозі від учнів Львівської братської школи)', region: 'Львів', date: '1591', dateQuote: ['Львів, друкарня братства, 1.2 1591 р.'], school: 'lviv', schoolSource: 'research/44 r05 (у заголовку «братская школа львовская»)', schoolConfidence: 'певно', rows: ['r05'] }),
  B('old14_34', 'old14_16/old14_34.htm', { title: 'Леополіс (вірш з «Адельфотиса»)', region: 'Львів', date: '1591', dateQuote: ['В друкарни братской. Року 1591.'], school: 'lviv', schoolSource: 'research/44 r06, r07', schoolConfidence: 'певно', rows: ['r06', 'r07'] }),
  B('old14_35', 'old14_16/old14_35.htm', { title: 'Л. Зизаній. Епіграма на граматику; Стіхи к младенцєм; Типограф младенцєм (з «Грамматіки словенскої»)', author: 'Лаврентій Зизаній', region: 'Вільно', date: '1596', dateSource: 'research/44 r09 (друк «Вільно, братська друкарня, 1596»); сторінка року не називає', school: 'vilno', schoolSource: 'research/44 r09 (друк; місце написання — Берестя, припущення)', schoolConfidence: 'ймовірно (друк)', rows: ['r09'] }),
  B('old14_37', 'old14_16/old14_37.htm', { title: 'Д. Наливайко. Вірші та герби (Дермань 1603–1605, Острог 1607)', author: 'Даміан Наливайко', region: 'Острог', date: '1603-1607', dateQuote: ['Дерманському монастирі 1603 р.', 'Острог, 1607'], school: 'ostroh', schoolSource: 'research/44 r18 (викладав в Острозькій школі, W-ОА)', schoolConfidence: 'певно', rows: ['r18'] }),
  B('old17_11', 'old17/old17_11.htm', { title: 'М. Смотрицький. Епіграми на герби (Євє 1611 і 1616)', author: 'Мелетій Смотрицький', region: 'Євє (Вільно)', date: '1611-1616', dateQuote: ['Єв\'є, 1611, арк. 2', 'Єв\'є, 1616, тит. арк. зв.'], school: 'vilno', schoolSource: 'research/44 r21, r22 (друкарня Віленського братства в Євє)', schoolConfidence: 'певно', rows: ['r21', 'r22'], orth: 'сучасний правопис', edition: EDN17 }),
]

/** tier 2 pages of the anthologies; `author` is not set (ingest uses the page heading when the page gives a person). Pages in MANIFEST are skipped at run time. */
const T2_14 = ['11', '12', '25', '26', '28', '30', '31'] as const
const T2_17 = ['04', '05', '07', '13', '14', '15', '16', '17', '21', '22', '25', '27', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43'] as const
const T2_ANTO = [13, 14, 19, ...Array.from({ length: 21 }, (_, i) => 22 + i), ...Array.from({ length: 34 }, (_, i) => 48 + i)].filter(n => n <= 81 && ![33, 34, 35, 69].includes(n)).map(n => String(n).padStart(2, '0'))
for (const n of T2_14) HV5_UNITS.push(B(`old14_${n}`, `old14_16/old14_${n}.htm`, { title: `old14_16/old14_${n} (заголовок сторінки при харвесті)`, tier: 2 }))
for (const n of T2_17) HV5_UNITS.push(B(`old17_${n}`, `old17/old17_${n}.htm`, { title: `old17/old17_${n} (заголовок сторінки при харвесті)`, tier: 2, orth: 'сучасний правопис', edition: EDN17 }))
for (const n of T2_ANTO) HV5_UNITS.push(B(`anto${n}`, `ukrpoetry/anto${n}.htm`, { title: `ukrpoetry/anto${n} (заголовок сторінки при харвесті)`, tier: 2, orth: 'ізборник (Ђ збережено)', edition: EDNP }))
/** chronicles of the Hetmanate / Volhynia period in the original language (litopys); dated by the page only */
for (const [id, path, title, ed] of [
  ['gusm02', 'gustmon/gusm02.htm', 'Літопис Густинського монастиря (ЛЂтописецъ о первом зачатіи …)', 'ЧОИДР, 1848 (Ізборник)'],
  ['ostr01', 'ostrog/ostr01.htm', 'Львівський літопис і Острозький літописець: Львівський літопис', 'Львівський літопис і Острозький літописець, К.: Наукова думка, 1971 (Ізборник)'],
  ['ostr02', 'ostrog/ostr02.htm', 'Острозький літописець («С кройніки Бельського речі потребні вибрані»)', 'Львівський літопис і Острозький літописець, К.: Наукова думка, 1971 (Ізборник)'],
  ['sof10', 'sofon/sof10.htm', 'Ф. Софонович. Кройніка о Русі, кн. 1, гл. 1–14', 'Софонович Ф. Хроніка з літописців стародавніх, К., 1992 (Ізборник)'],
  ['sof11', 'sofon/sof11.htm', 'Ф. Софонович. Кройніка о Русі, кн. 1, гл. 15–28', 'Софонович Ф. Хроніка з літописців стародавніх, К., 1992 (Ізборник)'],
  ['sof12', 'sofon/sof12.htm', 'Ф. Софонович. Кройніка о Русі, кн. 2, гл. 1–14', 'Софонович Ф. Хроніка з літописців стародавніх, К., 1992 (Ізборник)'],
  ['sof13', 'sofon/sof13.htm', 'Ф. Софонович. Кройніка о Русі, кн. 2, гл. 15–31', 'Софонович Ф. Хроніка з літописців стародавніх, К., 1992 (Ізборник)'],
  ['sof14', 'sofon/sof14.htm', 'Ф. Софонович. Кройніка о Русі, кн. 3, гл. 1–14', 'Софонович Ф. Хроніка з літописців стародавніх, К., 1992 (Ізборник)'],
  ['sof15', 'sofon/sof15.htm', 'Ф. Софонович. Кройніка о Русі, кн. 3, гл. 15–28', 'Софонович Ф. Хроніка з літописців стародавніх, К., 1992 (Ізборник)'],
  ['chern02', 'chernlet/chern02.htm', 'Чернігівський літопис за виданням О. Лазаревського (1890)', 'Лазаревський О., 1890 (Ізборник)'],
  ['kyl', 'kyl/kyl.htm', 'Київський літопис першої чверті XVII ст.', 'Київський літопис (Ізборник)'],
] as const) HV5_UNITS.push(B(id, path, { title, tier: 2, orth: 'за виданням (оригінальна мова)', edition: ed, ...(id.startsWith('sof') ? { author: 'Феодосій Софонович' } : {}) }))

/** TIER 3 — Сковорода, own texts, Повне зібрання творів у 2 т., К.: Наукова думка, 1973 (litopys skovoroda/): the work pages (the editors' commentary is Prym/notes and is never read).
 *  Dating = the academic edition's own commentary (skov117 vol. 1, skov220 vol. 2), quoted per work; a range where the editors give one; no dating found → undated. */
const SKOV_ED = 'Сковорода Г. Повне зібрання творів у 2 т., К.: Наукова думка, 1973 (Ізборник; правопис оригіналу)'
const SKOV: [string, string, string?, string?, string[]?][] = [
  ['skov103', 'Сад божественных пѣсней', '1753-1785', 'skovoroda/skov117.htm', ['Найбільш рання з датованих пісень відноситься до 1753 р., а найбільш пізня — 1785 р.']],
  ['skov104', 'Пісні та фабули'],
  ['skov105', 'Басни Харьковскія', '1769-1774', 'skovoroda/skov117.htm', ['Можна припустити, що вони були написані приблизно в 1769 р.', 'Сковорода закінчував написання 15-ти останніх байок збірки']],
  ['skov106', 'Убуждшеся видѣша славу его'], ['skov107', 'Да лобжет мя от лобзаній уст своих!'],
  ['skov108', 'Начальная дверь ко христіанскому добронравію', '1768', 'skovoroda/skov117.htm', ['Дату написання трактату слід віднести до 1768 р.']],
  ['skov109', 'Наркісс. Разглагол о том: узнай себе', '1769-1771', 'skovoroda/skov117.htm', ['«Наркісс» (1769 — 1771 рр.)']],
  ['skov110', 'Симфоніа, нареченная Книга Асхань о познаніи самого себе'], ['skov111', 'Бесѣда, нареченная двое, о том, что блаженным быть легко'],
  ['skov112', 'Бесѣда 1-я, нареченная Observatorium (Сіон)'], ['skov113', 'Діалог, или разглагол о древнем мірѣ'], ['skov114', 'Разговор пяти путников о истинном щастіи в жизни'],
  ['skov115', 'Кольцо'],
  ['skov116', 'Разговор, называемый алфавит, или букварь мира', '1774', 'skovoroda/skov117.htm', ['«Алфавит, или букварь мира» створено в другій половині 1774 р.']],
  ['skov201', 'Книжечка, называемая Silenus Alcibiadis, сирѣчь Икона Алківіадская', '1775-1776', 'skovoroda/skov220.htm', ['Твір написано в 1775 — 1776 рр.']],
  ['skov202', 'Книжечка о чтеніи священного писанія, нареченна Жена Лотова'], ['skov203', 'Брань архистратига Михаила со Сатаною о сем: легко быть благим'],
  ['skov204', 'Пря бѣсу со Варсавою'], ['skov205', 'Благодарный Еродій'],
  ['skov206', 'Убогій Жайворонок', '1787', 'skovoroda/skov220.htm', ['Лист має дату: «1787-го']],
  ['skov207', 'Діалог. Имя ему — Потоп зміин'],
]
for (const [id, title, date, datePage, dateQuote] of SKOV) HV5_UNITS.push(B(id, `skovoroda/${id}.htm`, { title, author: 'Григорій Сковорода', tier: 3, orth: 'правопис оригіналу (Ђ збережено)', edition: SKOV_ED, ...(date ? { date, datePage, dateQuote, dateSource: 'академічне видання 1973, примітки' } : {}) }))

export const HV5_SKIPPED: string[] = [
  '- DECIDED (HV-5, owner 2026-10-21 «оригінали тільки»): Грабянка, Величко, Історія Русів — never the litopys modern translations / Russian renderings; the original 19th-c. editions are harvested from archive.org (harvest/hv5-orig.ts, records verified from the archive.org metadata), see specs/63 HV-5.',
  '- DECIDED (HV-5, owner 2026-10-21 «загальноприйняте датування»): Сковорода — own texts only (litopys skov103–116, 201–207, 1973 academic edition), each dated by the edition own commentary (quoted per work, ranges kept); works whose commentary gives no date stay undated; the translations of Hosius/Cicero/Plutarch (skov208–210), the letters and the apparatus are not harvested.',
  '- SKIPPED (HV-5) old14_16 01–03, 08, 22–24 and old17 02, 08, 09, 18, 19, 23, 26 (apocrypha/lives/Latin and Polish works given in Ukrainian translation, anthology prefaces; same rule as research/19, nw-izb17.ts).',
  '- SKIPPED (HV-5) ukrpoetry anto03–12, 15–18, 20, 21: the same texts as old14_16/old17 pages (parallel edition), harvested once.',
  '- SKIPPED (HV-5) resource.history.org.ua (АЮЗР scans): robots.txt disallows everything; the same volumes are fetched from archive.org (archive-ayuzr).',
]

const stub = (b: Buffer) => b.length < 2500 || !b.includes('dop3')
export function pageTitle(html: string): { h1: string; h2: string } {
  const a = html.indexOf('class="dop3"'), r = a < 0 ? html : html.slice(a)
  const g = (t: string) => norm(`class="dop3"${(r.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i'))?.[1] ?? '')}`)
  return { h1: g('h1'), h2: g('h2') }
}
export function item(u: Hv5Unit, html: string, bytes: number, status: number, dateText?: string): IndexItem {
  const t = norm(html)
  let date: string | null = null, dateQuote: string | null = null, dateBasis = 'undated'
  if (u.date && u.dateQuote?.length) {
    const src = u.datePage ? (dateText ? norm(dateText) : '') : t
    const miss = u.dateQuote.filter(q => !src.includes(q))
    if (!miss.length) { date = u.date; dateQuote = u.dateQuote.join(' ⁞ '); dateBasis = u.datePage ? `quote of ${u.datePage}` : 'page-quote' } else dateBasis = `quote-not-found: ${miss.join(' ⁞ ')}`
  } else if (u.date && u.dateSource) { date = u.date; dateQuote = u.dateSource; dateBasis = 'research' }
  else if (!u.date && u.tier === 2) { const a = autoDate(t); if (a) { date = a.date; dateQuote = a.quote; dateBasis = 'page-sentence' } }
  const { h1, h2 } = pageTitle(html)
  const person = h2 && !/^(анонім|вірші|із |скарга)/i.test(h2) ? h2.replace(/\s*\(про автора\)/, '') : undefined
  return {
    id: u.id, url: BASE + u.path, date, licence: LIC(u.edition), bytes, status, title: u.tier === 2 && h1 ? h1 : u.title,
    ...((u.author ?? person) ? { author: u.author ?? person, authorBasis: u.author ? 'research/44' : 'заголовок сторінки' } : {}), ...(u.region ? { region: u.region } : {}),
    ...(u.school ? { school: u.school, schoolSource: u.schoolSource, schoolConfidence: u.schoolConfidence } : {}),
    dateQuote, dateBasis, ...(u.dateSource ? { dateSource: u.dateSource } : {}), witnessType: 'scholarly_ed', lang: 'ruthenian', orth: u.orth, edition: u.edition,
    ...(u.rows ? { rows: u.rows } : {}), tier: u.tier, ...(u.note ? { note: u.note } : {}),
  }
}

async function manifestPaths(): Promise<Set<string>> {
  const s = new Set<string>()
  try {
    const { MANIFEST } = await import('../pipelines/manifest.ts')
    for (const m of MANIFEST) for (const x of (m as { urls?: string[] }).urls ?? []) { const p = String(x).replace(/^https?:\/\/[^/]+\//, ''); s.add(p) }
  } catch { /* no manifest: nothing deduped */ }
  return s
}

async function main() {
  const tier = process.argv[2] ? Number(process.argv[2]) : 0
  for (const l of HV5_SKIPPED) decisionNeeded(l)
  const have = await manifestPaths()
  const h = new Harvest('hv5', { delayMs: 3000, logEvery: 5 })
  let present = 0
  const notes = new Map<string, string>()
  for (const u of HV5_UNITS) {
    if (tier && u.tier !== tier) continue
    if (h.has(u.id)) continue
    if (have.has(u.path)) { present++; continue }
    let dateText: string | undefined
    if (u.datePage) { dateText = notes.get(u.datePage); if (dateText === undefined) { const r = await h.get(BASE + u.datePage); dateText = new TextDecoder('windows-1251').decode(Buffer.from(await r.res.arrayBuffer())); notes.set(u.datePage, dateText) } }
    const { status, res } = await h.get(BASE + u.path)
    const buf = Buffer.from(await res.arrayBuffer())
    if (status !== 200 || stub(buf)) { h.log(`${u.id}: HTTP ${status} / stub page (${buf.length} bytes), recorded as status ${status === 200 ? 404 : status}`); h.put(`${u.id.replace(':', '_')}.none`, '', [item(u, '', 0, status === 200 ? 404 : status)]); continue }
    h.put(u.id.replace(':', '_'), buf, [item(u, new TextDecoder('windows-1251').decode(buf), buf.length, 200, dateText)])
  }
  h.log(`${present} units already in pipelines/manifest.ts, skipped`)
  h.finish()
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/hv5.ts')) await main()
