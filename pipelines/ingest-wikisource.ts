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
  eneida1798: /\/Словник$/,     // glossary of the first edition ("Словник"): editorial apparatus, not verse
}
/**
 * Cut point inside a page: everything from the first line matching is dropped (counted as apparatus).
 * hrinchenko1908: Krymsky's appendices start with the centred line «Додаток до статі Б. Д. Грінченка» followed by
 * «Чи справді важко вивчити правопис з ї?» (research/06b §3: "Includes Krymsky's appendices: exclude those sections").
 */
const CUT: Record<string, RegExp> = {
  hrinchenko1908: /^Додаток до статі Б\. Д\. Грінченка/,
  // tables of contents / errata of the 1882, 1892, 1893 volumes duplicate the poem titles: «Реєстрик», «ЗМІСТ», «ПОМИЛКИ»
  eneida1798: /^КНИГИ(\s|$)/,   // title page of 1798 ends with the printer's book-sale advertisement «КНИГИ Продающїяся в Типографїи…»
  kulish1882: /^Рее?стрик[.:]?$/, lesya1892: /^(ЗМІСТ|ПОМИЛКИ)[.:]?$/, franko1893: /^ЗМІСТ[.:]?$/,
}
/** Header author must match, else the subpage is somebody else's text (e.g. a translation). Absent header → kept. */
const AUTHOR: Record<string, RegExp> = { franko: /Франко/, kulish: /Куліш/, lesya: /Леся|Українка|Косач/, kotliarevsky: /Котляревськ/, hrinchenko: /Грінченк/ }

// ── page → tokens ───────────────────────────────────────────────────────────────────────────────
const BLOCK = new Set(['p', 'div', 'li', 'tr', 'table', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'ol', 'ul', 'dd', 'dt', 'hr', 'br', 'center'])
const clean = (s: string) => s.replace(/[­​‌‍]/g, '').replace(/\s+/g, ' ').trim()

export interface PageOut { tokens: TokenRec[]; apparatus: number; skipped?: string }
/** Parse one rendered page. `s0` = first segment index; returns tokens with loc "<title>, с. N". */
export function parsePage(html: string, title: string, unitId = '', authorId = '', s0 = 0): PageOut {
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
      if (cut) apparatus += toks.length
      else { for (const t of toks) out.push({ raw: t.raw, loc: pg ? `${title}, с. ${pg}` : title, s }); if (toks.length) s++ }
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
  for (const f of files) {
    if (!f.url.includes('action=render')) continue      // fetch.ts also downloads u.urls (plain /wiki/ page): not used
    const title = decodeURIComponent(new URL(f.url).searchParams.get('title') ?? '').replace(/_/g, ' ')
    if (SKIP_PAGE[u.id]?.test(title)) continue
    const r = parsePage(f.body.toString('utf8'), title, u.id, u.author, s)
    if (r.skipped) { console.warn(`  skip ${title}: ${r.skipped}`); continue }
    tokens.push(...r.tokens); apparatus += r.apparatus; s = (r.tokens.at(-1)?.s ?? s - 1) + 1
  }
  return [{
    id: u.id, unit: u.id, title: u.title, author: u.author, url: u.urls[0]!, date: u.date, dateCite: u.dateCite, msDate: u.msDate,
    lang: u.lang, region: u.region, witnessType: u.witnessType, edition: u.edition, orth: u.orth, license: u.license,
    dropped: { unmapped: 0, apparatus }, tokens,
  }]
}

export default { discover, parse } satisfies Ingester
