/**
 * uk.wikisource ingester (SPEC 10 M-2.2): rendered HTML (action=render) → primary text only, original orthography.
 *
 * > "Proofread from scans." / "Includes Krymsky's appendices: exclude those sections (different author)." /
 * > "Avoid the «Твори (Франко, 1956–1962)» pages." / "кулішівка, full stress marks (◌́). Strip U+0301 for matching." — research/06b §3
 * > "UTF-8, action=render." — research/06b §3 (kotliarevsky)
 *
 * Method: the work's subpages come from the MediaWiki API (list=allpages, apprefix "<Title>/"); each page is parsed into a
 * small DOM, rule-table DROP removes headers / notes / licence boxes, page markers (span.pagenum) become the locator "с. N",
 * and block/<br> boundaries become segment indices `s`. Stress marks are kept in `raw` (core/text.ts tokenize keeps \p{M}).
 * Eneida 1798: the main page transcludes only the title page (<pages … include=5/>); the text is on the subpages /I /II /III
 * (which transclude the "Сторінка:" pages), so subpage render URLs are listed, not the Page-namespace URLs.
 */
import { tokenize, stripStress } from '../core/text.ts'
import type { TokenRec, WitnessOut } from '../core/types.ts'
import type { Ingester, RawFile } from './ingest.ts'
import type { Unit } from './manifest.ts'

// ── tiny HTML DOM ───────────────────────────────────────────────────────────────────────────────
export interface El { t: string; a: Record<string, string>; c: (El | string)[] }
const VOID = new Set(['br', 'hr', 'img', 'meta', 'link', 'input', 'wbr'])
const ENT: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", shy: '', ensp: ' ', emsp: ' ', thinsp: ' ' }
const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m)

export function parseHtml(html: string): El {
  const root: El = { t: '#root', a: {}, c: [] }; const stack = [root]
  for (const m of html.matchAll(/<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>|[^<]+|</g)) {
    const top = stack[stack.length - 1]!
    if (m[0].startsWith('<!--')) continue
    if (!m[2]) { top.c.push(decode(m[0])); continue }
    const tag = m[2].toLowerCase()
    if (m[1]) { const i = stack.map(e => e.t).lastIndexOf(tag); if (i > 0) stack.length = i; continue }
    const a: Record<string, string> = {}
    for (const x of m[3]!.matchAll(/([\w:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) a[x[1]!.toLowerCase()] = decode(x[2] ?? x[3] ?? x[4] ?? '')
    const el: El = { t: tag, a, c: [] }; top.c.push(el)
    if (!VOID.has(tag) && !m[3]!.endsWith('/')) stack.push(el)
  }
  return root
}
const hasClass = (e: El, ...cs: string[]) => { const k = (e.a.class ?? '').split(/\s+/); return cs.some(c => k.includes(c)) }
const textOf = (e: El | string): string => typeof e === 'string' ? e : e.c.map(textOf).join('')

// ── cleaning rules as data ───────────────────────────────────────────────────────────────────────
/** `note` removals count into dropped.apparatus; `furniture` (headers, licence, navigation) does not. */
interface Drop { id: string; kind: 'note' | 'furniture'; test: (e: El) => boolean }
export const DROP: Drop[] = [
  { id: 'header template / navigation', kind: 'furniture', test: e => e.a.id === 'headertemplate' || hasClass(e, 'headertemplate', 'headerRaw', 'header_notes', 'ws-header', 'navbox', 'nowraplinks') },
  { id: 'noexport boxes (sister-project infobox, licence)', kind: 'furniture', test: e => hasClass(e, 'ws-noexport', 'infobox', 'licenseinfo', 'license', 'metadata', 'mbox', 'sisitem') },
  { id: 'licence box PD', kind: 'furniture', test: e => /licFrame/.test(e.a.class ?? '') || /licFrame/.test(e.a.id ?? '') || (e.t === 'table' && textOf(e).length < 900 && /перебуває (у|в) суспільному надбанні/.test(textOf(e))) },
  { id: 'footnote markers', kind: 'note', test: e => (e.t === 'sup' && hasClass(e, 'reference')) || hasClass(e, 'mw-ref', 'reference', 'mw-cite-backlink', 'cite-bracket') },
  { id: 'footnote lists', kind: 'note', test: e => (e.t === 'ol' && hasClass(e, 'references')) || hasClass(e, 'references', 'mw-references') },
  { id: 'script/style/edit links', kind: 'furniture', test: e => e.t === 'style' || e.t === 'script' || hasClass(e, 'mw-editsection', 'noprint', 'mw-empty-elt') },
]
/** Whole subpages/headings that are not the author's primary text. */
const SKIP_PAGE: Record<string, RegExp> = {
  // CX-2: the 1876 Prague Kobzar appends Russian memoirs by other authors and Shevchenko's Russian-language autobiography / preface: not the poet's Ukrainian text
  kobzar1876: /\/(Споминки про Шевченка|Автобіографія Шевченка|Передмова Шевченка|Варъянти)/,
  // CX-5: index / contents pages and document-heavy chapters (quoted chancery documents) are not the author's own running text
  pyven1906: /^Веселымъ людямъ на втиху!$|\/(Весели писни|Писни Чорноморськихъ козакивъ)$/, komarova1905: /^Почынокъ\. Писни, думы та мріи$/,
  bahaliy1918: /\/(Автономія|Вибори до|Библіографичні|Карти слободської|Пояснення до малюнків|Земельна власність|Соціальний устрій)/,
  eneida1798: /\/Словник$/,     // glossary of the first edition ("Словник"): editorial apparatus, not verse
  // CX-9: the main page of these books transcludes the title page / the whole book (+ the 1940 editor's preface): the stories come from their own subpages
  stefanyk1917: /^Новина та инші оповідання$/, cheremshyna1940: /^Верховина і інші оповідання$/,
  rusalka1837: /^Русалка Днѣстровая$/,   // main page = cover + contents; the almanac's items are the subpages
}
/**
 * Cut point inside a page: everything from the first line matching is dropped (counted as apparatus).
 * hrinchenko1908: Krymsky's appendices start with the centred line «Додаток до статі Б. Д. Грінченка» followed by
 * «Чи справді важко вивчити правопис з ї?» (research/06b §3: "Includes Krymsky's appendices: exclude those sections").
 */
/** Single lines that are not the primary text: a work's heading and the 19th-c. editor's own (Russian) footnote above a song (NW-7). */
const DROP_LINE: Record<string, RegExp> = {
  // CX-5: missing-image placeholder of the proofreading layer
  sumtsov1918: /^На місці цього тексту/, bahaliy1918: /^На місці цього тексту/,
  song_duma_mazepy: /^(33-е\.?$|ДУМА ПАНА ГЕТМАНА|Сюю пѣсню читаючи)/,   // SG-3: the document number + Russian heading of the 1859 editor; Kochubei's own closing note
  song_zhentsi: /^(О ГРИЦЬКѢ САГАЙДАЧНОМЪ|Гетьманъ Петръ Дорошенко)/,
  // CX-2: Russian censor's / printer's / dedication lines on the title pages are not the poet's text
  kobzar1840: /^(ПЕЧАТАТЬ ПОЗВОЛЯЕТСЯ|съ тѣмъ чтобы|Цензоръ|САНКТПЕТЕРБУРГЪ|ВЪ ТИПОГРАФІИ)/,
  eneida1808: /^(Изданіе второе|Въ Санктпетербургѣ|печатано въ|года$|Любителямъ|Малороссійскаго слова|усерднѣйше)/,
  song_zazhuryla: /^Пѣсня сія сложена/, song_baida: /^(О КОЗАКѢ БАЙДѢ|Полубаснословная пѣсня)/, song_yikhav: /^Пѣсня сія и еще/,   // Maksymovych's Russian headings / footnotes (BL-18)
}
const CUT: Record<string, RegExp> = {
  hrinchenko1908: /^Додаток до статі Б\. Д\. Грінченка/,
  // tables of contents / errata of the 1882, 1892, 1893 volumes duplicate the poem titles: «Реєстрик», «ЗМІСТ», «ПОМИЛКИ»
  eneida1798: /^КНИГИ(\s|$)/,   // title page of 1798 ends with the printer's book-sale advertisement «КНИГИ Продающїяся в Типографїи…»
  kulish1882: /^Рее?стрик[.:]?$/, lesya1892: /^(ЗМІСТ|ПОМИЛКИ)[.:]?$/, franko1893: /^ЗМІСТ[.:]?$/,
  // CX-2: contents / errata / publisher's lists of the later editions
  franko1902: /^(ЗМІС\s?Т|Того самого автора)/, franko1903: /^(ЗМІС\s?Т|Того самого автора)/, franko1906: /^(ЗМІС\s?Т|Того самого автора)/,
  lesya1899: /^(ЗМІС\s?Т|ПОМИЛКИ)[.:]?$/, chaichenko1893: /^(ЗМІС\s?Т|ПОМИЛКИ)[.:]?$/, boa1884: /^(ЗМІС\s?Т|СОДЕРЖАНІЕ|ПОПРАВКИ)/,
}
/** Header author must match, else the subpage is somebody else's text (e.g. a translation). Absent header → kept. */
const AUTHOR: Record<string, RegExp> = { franko: /Франко/, kulish: /Куліш|Кулїш/, lesya: /Леся|Лесї|Українка|Косач/, kotliarevsky: /Котляревськ/, hrinchenko: /Грінченк|Чайченк/,
  shevchenko: /Шевченк/, nechuy: /Левіцьк|Левицьк|Нечуй/,
  yavornytsky: /Яворницьк/, sumtsov: /Сумцов/, bahaliy: /Багалі/, pyven: /Півень|Пивень/, komarova: /Комарова/, chuzhbynsky: /Чужбинськ|Афанасьєв/, mohyla: /Могила|Метлинськ/,
  stefanyk: /Стефаник/, cheremshyna: /Черемшин|Семанюк/ }

// ── CX-9: direct speech vs narration ─────────────────────────────────────────────────────────────
/**
 * Splits one paragraph into direct speech and author's narration (heuristic, documented in research/40):
 *  - a paragraph that starts with a dash is speech up to the next « — » (the author's remark), then speech again, alternately («— Тату, — сказала, — ми хочемо істи.»);
 *  - a dash inside narration opens speech only after a colon («Він сказав: — Не піду.»); otherwise it is narrative punctuation;
 *  - quoted spans „…“ «…» "…" inside narration are speech (quote-introduced direct speech).
 */
export function splitSpeech(text: string): { speech: string[]; narr: string[] } {
  const speech: string[] = [], narr: string[] = []
  const t = text.trim()
  const parts = t.split(/(?:^|\s)[—–―](?:\s+|$)/)
  const led = /^[—–―]/.test(t)
  let engaged = led, mode: 's' | 'n' = led ? 's' : 'n'
  const addNarr = (p: string) => {
    let rest = p
    for (const m of p.matchAll(/[„«"“]([^„«"“”»]{2,}?)[”»"“]/g)) { speech.push(m[1]!); rest = rest.replace(m[0], ' ') }
    if (rest.trim()) narr.push(rest)
  }
  parts.forEach((p, i) => {
    if (i === 0 && led) return                      // empty piece before a leading dash
    if (!p.trim()) return
    if (mode === 's') { speech.push(p); mode = 'n' }
    else { addNarr(p); mode = engaged ? 's' : /:\s*$/.test(p) ? ((engaged = true), 's') : 'n' }
  })
  return { speech, narr }
}

// ── page → tokens ───────────────────────────────────────────────────────────────────────────────
const BLOCK = new Set(['p', 'div', 'li', 'tr', 'table', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'ol', 'ul', 'dd', 'dt', 'hr', 'br', 'center'])
const clean = (s: string) => s.replace(/[­​‌‍]/g, '').replace(/\s+/g, ' ').trim()

export interface PageOut { tokens: TokenRec[]; apparatus: number; skipped?: string }
/** Parse one rendered page. `s0` = first segment index; returns tokens with loc "<title>, с. N". */
export function parsePage(html: string, title: string, unitId = '', authorId = '', s0 = 0, dlg?: { tokens: TokenRec[]; s: number }): PageOut {
  const root = parseHtml(html)
  const authorEl = (function find(e: El): El | undefined { if (e.a.id === 'header_author_text') return e; for (const k of e.c) if (typeof k !== 'string') { const r = find(k); if (r) return r } })(root)
  const want = AUTHOR[authorId]
  if (authorEl && want && !want.test(textOf(authorEl))) return { tokens: [], apparatus: 0, skipped: `author «${clean(textOf(authorEl))}»` }
  const out: TokenRec[] = []; let apparatus = 0, s = s0, page = '', cut = false
  const cutRe = CUT[unitId]
  let line = ""
  const flush = () => {
    const text = clean(line)
    if (text) {
      const pg = page
      if (cutRe?.test(stripStress(text))) cut = true
      const toks = tokenize(text)
      const loc = pg ? `${title}, с. ${pg}` : title
      if (cut || DROP_LINE[unitId]?.test(stripStress(text))) apparatus += toks.length
      else if (dlg) {   // CX-9: speech and narration are separate witnesses with their own segment counters
        const sp = splitSpeech(text)
        const nt = sp.narr.flatMap(p => tokenize(p)), st = sp.speech.flatMap(p => tokenize(p))
        for (const t of nt) out.push({ raw: t.raw, loc, s }); if (nt.length) s++
        for (const t of st) dlg.tokens.push({ raw: t.raw, loc, s: dlg.s }); if (st.length) dlg.s++
      }
      else { for (const t of toks) out.push({ raw: t.raw, loc, s }); if (toks.length) s++ }
    }
    line = ''
  }
  const walk = (n: El | string) => {
    if (typeof n === 'string') { line += n; return }
    const d = DROP.find(r => r.test(n))
    if (d) { if (d.kind === 'note') apparatus += tokenize(textOf(n)).length; return }
    if (hasClass(n, 'pagenum', 'ws-pagenum')) {
      const v = n.a['data-page-number'] ?? ''
      if (/^\d+$/.test(v)) { flush(); page = v }       // page change: flush so locators stay exact
      return
    }
    const blk = BLOCK.has(n.t)
    if (blk) flush()
    n.c.forEach(walk)
    if (blk) flush()
  }
  walk(root); flush()
  return { tokens: out, apparatus }
}

// ── discovery ───────────────────────────────────────────────────────────────────────────────────
const API = 'https://uk.wikisource.org/w/api.php'
const wikiTitle = (u: string) => decodeURIComponent(u.replace(/^.*\/wiki\//, ''))
export const renderUrl = (title: string) => `https://uk.wikisource.org/w/index.php?title=${encodeURIComponent(title.replace(/ /g, '_'))}&action=render`
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function discover(u: Unit, fetchText: (url: string) => Promise<string>): Promise<string[]> {
  if (!u.discover) return []     // single-page units (songs) list their render URL in `urls`
  const main = wikiTitle(u.urls[0]!).replace(/_/g, ' ')
  const titles: string[] = []; let cont = ''
  do {
    const q = new URLSearchParams({ action: 'query', list: 'allpages', apprefix: main + '/', apnamespace: '0', aplimit: '500', format: 'json' })
    if (cont) q.set('apcontinue', cont)
    const j = JSON.parse(await fetchText(`${API}?${q}`)) as { query: { allpages: { title: string }[] }; continue?: { apcontinue: string } }
    titles.push(...j.query.allpages.map(p => p.title)); cont = j.continue?.apcontinue ?? ''
    await sleep(400)
  } while (cont)
  const skip = SKIP_PAGE[u.id]
  return [main, ...titles.filter(t => !skip?.test(t))].map(renderUrl)
}

// ── parse ───────────────────────────────────────────────────────────────────────────────────────
function parse(u: Unit, files: RawFile[]): WitnessOut[] {
  const tokens: TokenRec[] = []; let apparatus = 0, s = 0
  const dlg = u.split === 'dialogue' ? { tokens: [] as TokenRec[], s: 0 } : undefined
  for (const f of files) {
    if (!f.url.includes('action=render')) continue      // fetch.ts also downloads u.urls (plain /wiki/ page): not used
    const title = decodeURIComponent(new URL(f.url).searchParams.get('title') ?? '').replace(/_/g, ' ')
    if (SKIP_PAGE[u.id]?.test(title)) continue
    const r = parsePage(f.body.toString('utf8'), title, u.id, u.author, s, dlg)
    if (r.skipped) { console.warn(`  skip ${title}: ${r.skipped}`); continue }
    for (const t of r.tokens) tokens.push(t); apparatus += r.apparatus; s = (r.tokens.at(-1)?.s ?? s - 1) + 1
  }
  const base = {
    unit: u.id, author: u.author, url: u.urls[0]!.replace('&action=render', ''), date: u.date, dateCite: u.dateCite, msDate: u.msDate,
    lang: u.lang, region: u.region, witnessType: u.witnessType, edition: u.edition, orth: u.orth, license: u.license,
    ...(u.media ? { media: u.media } : {}),
  }
  if (dlg) {   // CX-9: the dialect statements concern the speech of the characters; the narration is a separate (standard-language) witness
    return [
      { ...base, id: `${u.id}_dlg`, title: `${u.title} — пряма мова`, ...(u.dialect ? { dialect: u.dialect } : {}), dropped: { unmapped: 0, apparatus }, tokens: dlg.tokens },
      { ...base, id: `${u.id}_nar`, title: `${u.title} — авторське мовлення`, dropped: { unmapped: 0, apparatus: 0 }, tokens },
    ]
  }
  return [{ ...base, id: u.id, title: u.title, ...(u.dialect ? { dialect: u.dialect } : {}), dropped: { unmapped: 0, apparatus }, tokens }]
}

export default { discover, parse } satisfies Ingester
