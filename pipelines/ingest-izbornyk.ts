/**
 * izbornyk.org.ua ingester — units ilarion, monomakh, hypatian, vyshensky, samovydets, shevchenko (SPEC 10 M-2.1–2.3).
 *
 * > "The pages are cp1251, but early-Cyrillic letters are rendered either through a custom font (ѣ shows up as `Ђ` after
 * >  cp1251 decoding …) or as numeric entities (`&#1123;` = ѣ …). Chronicle pages also have inline collation numbers …
 * >  The ingest pipeline needs (a) a per-site char map, (b) footnote-number stripping, and (c) storage of both `raw` and
 * >  `normalised` strings." — research/06 §1.8
 * > "Each page also has editorial commentary («Джерела тексту», notes) after the poem, so cut at 'Джерела тексту'." — research/06b §3 (shevchenko)
 * > "`<i>і</i>` = ѣ (editorial). Remove `<sup>n</sup>` and «*» comment markers. Footnote apparatus is interleaved in the
 * >  text (e.g. «У сп. Судієнка…»), so it needs filtering." — research/06b §3 (samovydets)
 * > "Inline variant numbers and «Варіанты» blocks need stripping." — research/06b §3 (volyn_chron)
 *
 * Method. Every page of the site marks the primary text as `<p class=K1>` and all editorial matter (introduction, notes,
 * «Варіанты», «Примѣчанія», «Джерела тексту») as `<p class=Prym>` / `<p class=Vary>`; so only K1 paragraphs between a
 * per-unit start marker and end marker are read (CUTS below; each cut quotes the marker text). Inside a paragraph the
 * apparatus (`<sup>` numbers, `<a href="#…">` note refs, `[n]`, `(n)`, folio marks `/л.18об./`) is removed and counted in
 * `dropped.apparatus`; `<sup class="q">x</sup>` are supralinear letters of the word and are kept. Column (`Mber`), page
 * (`<strong id="pageN">`) and annal (`<a id="lNNNN">`) markers become the token locator. A token that still contains a
 * Latin letter is dropped and counted in `dropped.unmapped`.
 */
import type { Ingester, RawFile } from './ingest.ts'
import type { Unit } from './manifest.ts'
import type { TokenRec, WitnessOut } from '../core/types.ts'
import { Q, type Evidence } from '../core/evidence.ts'
import { decodeIzbornyk, hasUnmapped } from '../core/text.ts'
import { witnessOf } from './ingest-torot.ts'

// ── per-unit cut rules (marker text quoted) ──────────────────────────────────────────────────────
interface Cut { start?: RegExp; end?: RegExp; yat?: boolean }
export const CUTS: Record<string, Cut> = {
  // starts at «СЛОВО ПРО ЗАКОН І БЛАГОТАТЬ» (h1); ends before the editor's colophon «Текст підготовлено для сайту litopys.kiev.ua за публікацією рукопису Синодального зібрання…», then «ПРИМІТКИ» ([1]…[166])
  ilarion: { start: /<h1><b>СЛОВО ПРО ЗАКОН І БЛАГОТАТЬ<\/b><\/h1>/, end: /Текст підготовлено для сайту/ },
  // starts at «ПОУЧЕННЯ ВОЛОДИМИРА МОНОМАХА» (h1); ends at the editor's «<h2 id="poja">Пояснення:</h2>» (intro) followed by «Примітки:» [1]–[100]
  monomakh: { start: /<h1><b>ПОУЧЕННЯ ВОЛОДИМИРА МОНОМАХА<\/b><\/h1>/, end: /<h2 id="poja">/ },
  // starts at «<h1>КНИЖКА</h1>»; ends at the editor's biographical note «Іван ВИШЕНСЬКИЙ» («Іван Вишенський — найвизначніший український письменник-полеміст…») and its footnotes 1–62
  vyshensky: { start: /<h1>КНИЖКА<\/h1>/, end: /<p class=Prym><i>Іван ВИШЕНСЬКИЙ<\/i><\/p>/ },
  // all K1 paragraphs; the interleaved «У сп. Судієнка…», «Там же: …» apparatus is Prym; `<i>і</i>` is the editor's ѣ
  samovydets: { yat: true },
  // the whole K1 body of the page (after the navigation block); «Варіанты»/«Примѣчанія» blocks are Vary/Prym
  hypatian: { start: /<div class="dop3">/ },
  // from the text block to the first editorial paragraph (the commentary repeats the poem title, then «Джерела тексту:»)
  shevchenko: { start: /<div class="dop3">/, end: /<p class=Prym>(?!\s*(?:<br>)?\s*<\/p>)/ },
}

// ── markers ──────────────────────────────────────────────────────────────────────────────────────
const M0 = '', M1 = ''
export const marker = (k: 'Y' | 'P' | 'C', v: string | number) => `${M0}${k}${v}${M1}`
export const MARKER = new RegExp(`${M0}([YPC])([^${M1}]*)${M1}`, 'g')

const NAMED: Record<string, string> = { nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', lt: '<', gt: '>', quot: '"', apos: "'", laquo: '«', raquo: '»', shy: '', amp: '&', oacute: 'ó', eacute: 'é' }
const entities = (s: string) => s.replace(/&(\w+);/g, (m, n) => NAMED[n] ?? m)

/** `[n]` footnote → removed; `[ЗАГОЛОВОК]` / `[note: …]` → editorial, removed; `[текст]` → the editor's restoration, kept unwrapped. */
function brackets(s: string, st: Count): string {
  return s
    .replace(/\[\s*\d+\s*\]|\(\s*\d+\s*\)/g, () => (st.app++, ' '))
    .replace(/\[([^\]]*)\]/g, (_, inner: string) =>
      /^[\p{Lu}\s\d.,«»'’()—-]+$/u.test(inner) || /:|^викреслено/.test(inner) ? (st.app++, ' ') : inner)
}

interface Count { app: number }

/** Inline apparatus out, markers in. Returns the paragraph text. */
export function cleanParagraph(h: string, cut: Cut, st: Count): string {
  let s = h
    .replace(/<sup class="q">([\s\S]*?)<\/sup>/g, '$1')                       // supralinear letters belong to the word
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/g, () => (st.app++, ''))             // variant / note numbers
    .replace(/<a href="#[^"]*"[^>]*>[\s\S]*?<\/a>/g, () => (st.app++, ''))   // note references
    .replace(/<small id="[^"]*">\/[^<]*\/<\/small>/g, () => (st.app++, ''))  // folio marks «/л.18об./»
    .replace(/<small>\[<a id="l(\d+)">[\s\S]*?<\/small>/g, (_, y) => marker('Y', y))  // annal anchor «[6453 (945)]»
    .replace(/<strong id="page(\d+)">[^<]*<\/strong>/g, (_, p) => marker('P', p))     // «/349/», «\83\»
  if (cut.yat) s = s.replace(/<i>і<\/i>/g, 'ѣ').replace(/<i>І<\/i>/g, 'Ѣ')
  s = s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '')
  return brackets(entities(s), st).replace(/\s+/g, ' ').trim()
}

const WORD = /[\p{L}\p{M}ⷠ-ⷿ'’ʼ]+(?:-[\p{L}\p{M}'’ʼ]+)*/gu
/** Words of a text; a word with a Latin letter is dropped and counted. */
export function words(text: string, dropped: { unmapped: number }): string[] {
  const out: string[] = []
  for (const m of text.matchAll(WORD)) {
    const w = m[0].replace(/^['’ʼ]+|['’ʼ]+$/g, '')
    if (!/\p{L}/u.test(w)) continue
    hasUnmapped(w) ? dropped.unmapped++ : out.push(w)
  }
  return out
}

// ── page → events ────────────────────────────────────────────────────────────────────────────────
const dec = (b: Buffer) => decodeIzbornyk(new TextDecoder('windows-1251').decode(b))

/** K1 paragraphs (+ Mber column markers as `C` markers) of the cut region, navigation paragraphs dropped. */
export function pageParas(html: string, cut: Cut): { paras: string[]; apps: number[] } {
  const a = cut.start ? html.search(cut.start) : 0
  let region = a < 0 ? '' : html.slice(a)
  if (cut.end) { const b = region.search(cut.end); if (b > 0) region = region.slice(0, b) }
  const paras: string[] = [], apps: number[] = []
  for (const m of region.matchAll(/<p class=(K1|Mber)\b[^>]*>([\s\S]*?)<\/p>/g)) {
    if (m[1] === 'Mber') { const c = /\d+/.exec(m[2]!); if (c) { paras.push(marker('C', c[0])); apps.push(0) } continue }
    if (/<a\s+href="(?!#)/.test(m[2]!)) continue                          // navigation («Попередня / Головна / Наступна»)
    const st: Count = { app: 0 }, t = cleanParagraph(m[2]!, cut, st)
    if (t.replace(MARKER, '').trim()) { paras.push(t); apps.push(st.app) }
  }
  return { paras, apps }
}

// ── generic stream: paragraphs → tokens with locators ────────────────────────────────────────────
interface Loc { year?: number; col?: string; page?: string }
export interface Item { rec: TokenRec; year?: number }

/** Tokens of paragraphs; `locOf` builds the locator from the running state. Mutates `state` (kept across pages). */
export function streamTokens(paras: string[], apps: number[], state: Loc, s0: number, tally: (st: Loc) => WitnessOut['dropped'], locOf: (st: Loc, para: number) => string): { items: Item[]; s: number; flat: string; snaps: Snap[] } {
  const items: Item[] = [], snaps: Snap[] = []
  let s = s0, flat = ''
  for (const [i, p] of paras.entries()) {
    let pos = 0
    const flush = (chunk: string) => {
      flat += chunk
      for (const w of words(chunk, tally(state))) items.push({ rec: { raw: w, loc: locOf(state, s), s }, year: state.year })
    }
    tally(state).apparatus += apps[i]!
    if (/\p{L}/u.test(p.replace(MARKER, ''))) s++
    for (const m of p.matchAll(MARKER)) {
      let chunk = p.slice(pos, m.index), head = ''
      if (m[1] === 'Y') {                                   // «В лѣто . ҂ѕ҃ . у҃ . н҃г . [6453 (945)]»: the header words open the new annal, its Cyrillic numerals are dropped
        const h = ANNAL_HEADER.exec(chunk)
        if (h) { head = h[1]!; chunk = chunk.slice(0, h.index) }
      }
      flush(chunk)
      if (m[1] === 'Y') state.year = +m[2]!; else if (m[1] === 'C') state.col = m[2]; else state.page = m[2]
      flush(head)
      snaps.push({ pos: flat.length, ...state })
      pos = m.index! + m[0].length
    }
    flush(p.slice(pos)); flat += ' '
  }
  return { items, s, flat, snaps }
}
interface Snap extends Loc { pos: number }
const ANNAL_HEADER = /(В[ъь]?\s+л[ѣе]т\p{M}*о?\p{M}*)[^\p{L}]*(?:[\p{L}\p{M}҂]{1,4}[\s.·,]*){0,4}$/u

const baseWitness = (u: Unit, id: string, items: Item[], extra: Partial<WitnessOut>, dropped: WitnessOut['dropped']): WitnessOut =>
  witnessOf(u, items.map(i => i.rec), { id, url: u.urls[0]!, dropped, ...extra })

// ── hypatian: split by annal (SPEC 10 M-2.3) ─────────────────────────────────────────────────────
/** AM year → AD (year = NNNN − 5508). */
export const adYear = (am: number) => am - 5508
export type Part = 'pvl' | 'kievchr' | 'gvl'
/** «В лѣто 6625» is the last annal of the PVL; 6626–6708 = Kyiv Chronicle (1118–1200); ≥ 6709 = Galician-Volhynian (≥ 1201). */
export const partOf = (am: number | undefined): Part => am === undefined || am <= 6625 ? 'pvl' : am <= 6708 ? 'kievchr' : 'gvl'

const HYP: Record<Exclude<Part, 'pvl'>, Partial<WitnessOut> & { id: string }> = {
  kievchr: { id: 'kievchr', title: 'Київський літопис (Іпатіївський список, s.a. 6626–6708)', author: 'kyiv_chron_12', date: [1117, 1200], region: 'Київ' },
  gvl: { id: 'gvl', title: 'Галицько-Волинський літопис (Іпатіївський список, s.a. 6709–6800)', author: 'volyn_chron', date: [1200, 1292], region: 'Галич / Волинь' },
}

/** First-person / insider mentions of «Руская земля» (research/06b §3; authors.ts kyiv_chron_12 «evidence extracted from the witness itself»). */
export const INSIDER = [
  /за\s+Р(?:у|оу)\S*\s+земл\S*/,                                  // «за Рускую землю»
  /Р(?:у|оу)\S*\s+земл\S*(?:\s+\S+){0,9}?\s+наш\S*/,              // «по всеи Руськои земли . створи же та Мати Бж҃иӕ чюдо . паче нашеӕ надежа» (narrator's «our»)
]

/** All matches of INSIDER[k] in a text as quotes of ≤ 30 words (8 before, the match, the rest after; whitespace normalised) with their offsets. */
export function findInsider(text: string, k: number): { quote: string; pos: number }[] {
  return [...text.matchAll(new RegExp(INSIDER[k]!.source, 'g'))].map(m => {
    const before = text.slice(0, m.index).split(/\s+/).slice(-8), match = m[0].split(/\s+/)
    const after = text.slice(m.index! + m[0].length).split(/\s+/).slice(0, Math.max(0, 30 - 8 - match.length))
    return { quote: [...before, ...match, ...after].filter(Boolean).slice(0, 30).join(' '), pos: m.index! }
  })
}

function parseHypatian(u: Unit, files: RawFile[]): WitnessOut[] {
  const cut = CUTS.hypatian!
  const state: Loc = {}
  const items: Record<Part, Item[]> = { pvl: [], kievchr: [], gvl: [] }
  const dropped: Record<Part, WitnessOut['dropped']> = { pvl: { unmapped: 0, apparatus: 0 }, kievchr: { unmapped: 0, apparatus: 0 }, gvl: { unmapped: 0, apparatus: 0 } }
  const evid: (Evidence | undefined)[] = INSIDER.map(() => undefined)
  let s = 0
  for (const f of files) {
    const { paras, apps } = pageParas(dec(f.body), cut)
    const at0: Loc = { ...state }
    const page = streamTokens(paras, apps, state, s, st => dropped[partOf(st.year)], st => `s.a. ${st.year ?? '?'}, стб. ${st.col ?? '?'}`)
    s = page.s
    for (const it of page.items) items[partOf(it.year)].push(it)
    // self-reference of the Kyiv chronicler: the first insider mention inside s.a. 6626–6708, with its annal and column
    const stateAt = (pos: number): Loc => page.snaps.filter(x => x.pos <= pos).at(-1) ?? at0
    INSIDER.forEach((_, k) => {
      for (const h of evid[k] ? [] : findInsider(page.flat, k)) {
        const st = stateAt(h.pos)
        if (partOf(st.year) === 'kievchr') { evid[k] = Q('IZB', `${f.url}, s.a. ${st.year}, стб. ${st.col}`, h.quote); break }
      }
    })
  }
  console.log(`hypatian: ${items.pvl.length} tokens before/at s.a. 6625 (PVL, covered by TOROT Laurentian) not emitted`)
  return (['kievchr', 'gvl'] as const).map(part => {
    const meta = HYP[part]
    const loc = items[part]
    return baseWitness(u, meta.id, loc, {
      title: meta.title!, author: meta.author!, date: meta.date!, region: meta.region,
      ...(part === 'kievchr' && evid.some(Boolean) ? { authorEvidence: evid.filter((e): e is Evidence => !!e) } : {}),
    }, dropped[part])
  })
}

// ── shevchenko: one witness per poem page ────────────────────────────────────────────────────────
/** Sections of vol. 1 that are not Shevchenko's own finished text: creative drafts (a Bible excerpt), his edit of Pysarevsky's fable, works of doubtful attribution. */
const NONCANON = /^(ТВОРЧІ ЗАГОТОВКИ|РЕДАГОВАНЕ|DUBIA)(?!\p{L})/u
const norm = (s: string) => entities(s.replace(/<[^>]*>/g, '')).replace(/\/\d+\//g, '').replace(/\s+/g, ' ').trim()

/** The «Датується …» statement → [minYear, maxYear]: years after the first colon that introduces a date, else before the first colon, else anywhere. */
export function dateRange(line: string): [number, number] | undefined {
  const years = (t: string) => [...t.matchAll(/\b(1[89]\d\d)\b/g)].map(m => +m[1]!)
  const sentence = (t: string) => t.slice(0, (t.search(/\.\s+(?=[А-ЯІЇЄҐ«„])/) + 1) || t.length)
  let ys: number[] = []
  for (let i = line.indexOf(':'); i >= 0 && !ys.length; i = line.indexOf(':', i + 1)) {
    const tail = line.slice(i + 1)
    if (/^\s*[^«»(:]{0,60}?\b1[89]\d\d\b/.test(tail)) ys = years(sentence(tail))
  }
  if (!ys.length) ys = years(line.slice(0, line.includes(':') ? line.indexOf(':') : line.length))
  if (!ys.length) ys = years(line)
  return ys.length ? [Math.min(...ys), Math.max(...ys)] : undefined
}

function parseShevchenko(u: Unit, files: RawFile[]): WitnessOut[] {
  const cut = CUTS.shevchenko!, out: WitnessOut[] = []
  const skipped = { noDate: 0, nonCanon: 0, noText: 0 }
  let nonCanon = false
  for (const f of files) {
    const num = /shev(\d+)\.htm/.exec(f.url)?.[1]
    const html = dec(f.body)
    const a = html.search(cut.start!)
    const region = a < 0 ? '' : html.slice(a)
    const heads = [...region.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/g)].map(m => norm(m[1]!))
    if (heads.some(h => NONCANON.test(h))) nonCanon = true
    const prym = [...region.matchAll(/<p class=Prym[^>]*>([\s\S]*?)<\/p>/g)].map(m => norm(m[1]!)).filter(Boolean)
    const dateLine = prym.find(p => /^Датується/.test(p))
    if (!num || num === '1' || !dateLine) { if (num && num !== '1') skipped.noDate++; continue }
    if (nonCanon) { skipped.nonCanon++; continue }
    const range = dateRange(dateLine)
    const { paras, apps } = pageParas(html, cut)
    const dropped = { unmapped: 0, apparatus: 0 }
    const first = /С\.\s*(\d+)/.exec(norm(region.slice(0, 1500)))?.[1]            // «— С. 348-354; С. 737-740.»
    const { items } = streamTokens(paras, apps, { page: first }, 0, () => dropped, st => st.page ? `с. ${st.page}` : prym[0]!)
    if (!range || !items.length) { skipped.noText++; continue }
    out.push(baseWitness(u, `shevchenko_${num}`, items, {
      title: prym[0]!, date: range,
      dateCite: Q('IZB', f.url, dateLine.slice(0, 300)),
    }, dropped))
  }
  console.log(`shevchenko: ${out.length} poems; skipped ${skipped.noDate} pages without «Датується» line, ${skipped.nonCanon} in ТВОРЧІ ЗАГОТОВКИ/РЕДАГОВАНЕ/DUBIA, ${skipped.noText} empty`)
  return out
}

// ── samovydets: dating sentence from the editor's introduction ───────────────────────────────────
const SAM_CITE = Q('IZB', 'http://izbornyk.org.ua/samovyd/sam01.htm',
  'На думку О. Левицького, літописець з самого початку війни Хмельницького вів короткі записи про події, які відбувались, і на основі цих записів згодом, тобто не раніше як 1672 р., упорядкував свою працю.',
  'Вступ вид. Я. І. Дзири; текст літопису кінчається 1702 р.')

// ── single-text units ────────────────────────────────────────────────────────────────────────────
function parseSingle(u: Unit, files: RawFile[]): WitnessOut[] {
  const cut = CUTS[u.id]!, state: Loc = {}, dropped = { unmapped: 0, apparatus: 0 }
  const items: Item[] = []
  let s = 0
  for (const f of files) {
    const p = pageParas(dec(f.body), cut)
    const r = streamTokens(p.paras, p.apps, state, s, () => dropped, (st, para) => st.page ? `с. ${st.page}` : `абз. ${para}`)
    s = r.s; items.push(...r.items)
  }
  return [baseWitness(u, u.id, items, u.id === 'samovydets' ? { dateCite: SAM_CITE } : {}, dropped)]
}

export default {
  async discover(u, fetchText) {
    if (u.discover !== 'shevchenko-toc') return []
    const base = u.urls[0]!.replace(/[^/]*$/, '')
    const html = await fetchText(u.urls[0]!)
    return [...new Set([...html.matchAll(/href="(shev1\d\d\.htm)"/g)].map(m => base + m[1]))].sort()
  },
  parse(u, files) {
    return u.split === 'hypatian' ? parseHypatian(u, files) : u.id === 'shevchenko' ? parseShevchenko(u, files) : parseSingle(u, files)
  },
} satisfies Ingester
