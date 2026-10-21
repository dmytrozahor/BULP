/**
 * SPEC 63 RU-4: owner-supplied OCR'd volumes of «Русская историческая библиотека» (СПб., Археографічна комісія) → one witness per Ukrainian/Ruthenian work, by PRINTED COLUMN range.
 * `npm run ingest:rib [-- --ocr <dir>] [-- --out <dir>]`
 *
 *  Input : the worker's OCR dir (ops: ~/work/ocr/b<sha1(name)[:10]>/{NAME,page_NNNN.txt}, worker-ocr.sh); `--ocr` or env OCR_DIR, default data/raw/ocr. Books are found by their NAME file.
 *  Pages : the running head of every scan page carries the printed column numbers («331 «ПАЛИНОДІЯ», СОЧ. ЗАХАРІИ КОПЫСТЕНСКАГО, 1621 ГОДА. 334»); a scan page holds four columns, [a, a+3].
 *          A page is taken when its columns overlap the work's column range, so the editor's preface, the table of contents of the work («Подробное оглавленіе», cols 1181–1200 of the
 *          Palinodia), notes and indexes lie outside the ranges and are never read. Inside a page, footnote / variant lines («*) У Толст.: …», «1) …») and lines with Russian function words
 *          are apparatus (RU-line filter of pipelines/ingest-harvest.ts `textTokens(…, oldOrth = true)`), the running head is dropped, and only Cyrillic tokens are kept (Polish / Latin → `unmapped`).
 *  Output: <out>/<id>.json (WitnessOut). `edition` names the Russian edition, so core/ru-source.ts flags it «рос. видання» (RU-2): the text is Ukrainian/Ruthenian, the EDITION is Russian.
 *  Without OCR text (the worker has not finished) nothing is written and the run says so; idempotent, atomic writes (RS-1).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { Q } from '../core/evidence.ts'
import type { Evidence } from '../core/evidence.ts'
import type { WitnessOut } from '../core/types.ts'
import { writeAtomic } from '../harvest/lib.ts'
import { authorFor, mergeHarvestAuthors, textTokens } from './ingest-harvest.ts'

export interface RibWork {
  id: string; book: RegExp; title: string; author: string; authorQuote: string; cols: [number, number]; date: [number, number]; dateCite: Evidence
  edition: string; lang: WitnessOut['lang']; school?: WitnessOut['school']; /** scan pages carry a Polish parallel column read as Cyrillic garbage: polishFilter drops its lines */ polish?: boolean
}
const R44 = 'research/44-bratstva-bibliography.md'
const T4 = 'РИБ т. 4, СПб. 1878 (ред. П. Гильтебрандт; Археографическая коммиссія)'
const T19 = 'РИБ т. 19, СПб. 1903 (ред. П. Гильтебрандт; Императорская Археографическая коммиссія)'
const toc19 = (quote: string): Evidence => Q('РИБ т. 19 (1903), «Оглавлен1е», с. XI–XIII (OCR)', 'оглавлення', quote, 'датування з оглавлення видання (OCR tesseract, шум можливий)')
export const RIB_WORKS: RibWork[] = [
  { id: 'rib4_palinodia', book: /Русская_историческая_библиотека_Том_04/, title: 'Захарія Копистенський, «Палінодія, или Книга обороны кафолическое святое апостольское восточное церкве» (РИБ т. 4, стб. 313–1180)',
    author: 'Захарія Копистенський', authorQuote: '«Палінодія» … Захарія Копистенський (research/44 r32)', cols: [313, 1180], date: [1621, 1622],
    dateCite: Q(`${R44}#r32`, 'r32', '1621–1622 (датовано 26.11.1621) | Захарія Копистенський | «Палінодія, или Книга обороны кафолическое святое апостольское восточное церкве»', 'research/45 №3 і РИБ т. 4 («Оглавленіе»: «Палинодія … 1621—1622 года», стб. 313–1200; «Подробное оглавленіе» стб. 1181–1200 виключено)'),
    edition: T4, lang: 'ruthenian', school: { id: 'sch-lavra', source: `${R44}#r32`, confidence: 'певно' } },
  { id: 'kopystensky_kniga_viry', book: /Копистенський_Книга_о_вірі/, title: 'Захарія Копистенський, «Книга о вірі єдиній, святій, соборній, апостольській церкві» (Київ, бл. 1620; титул: «ок. 1620»)',
    author: 'Захарія Копистенський', authorQuote: '«Книга о вірі єдиній» Захарія Копистенський (research/44 r29)', cols: [0, 0], date: [1619, 1621],
    dateCite: Q(`${R44}#r29`, 'r29', '1619–1621 | Захарія Копистенський | «Книга о вірі єдиній»', 'титул скану (бібліотечна примітка): «ок. 1620»; оригінальний друк (Державна історична бібліотека УРСР), не російське видання'),
    edition: 'Київ, бл. 1620 (оригінальний друк, скан бібліотеки; без видавничого апарату)', lang: 'ruthenian', school: { id: 'sch-lavra', source: `${R44}#r29`, confidence: 'ймовірно' } },
  { id: 'rib19_ekthesis', book: /РИБ_т19_1903/, title: 'Ектезис (православне полемічне сочиненіе 1597 р.), РИБ т. 19, стб. 329–376', author: 'Православні автори Берестейського собору (Ектезис)', authorQuote: 'Ектезис — сочинение, изданное православными (РИБ т. 19, передмова)',
    cols: [329, 376], date: [1597, 1597], dateCite: toc19('ПРАВОСЛАВНОЕ ПОЛЕМИЧЕСКОЕ СОЧИНЕНЕЕ 1597 года'), edition: T19, lang: 'ruthenian' },
  { id: 'rib19_otpis_klyryka', book: /РИБ_т19_1903/, title: 'Отвѣтъ (отписъ) клирика Острожскаго Ипатію Потѣю 1598 р., РИБ т. 19, стб. 377–432', author: 'Клірик Острозький', authorQuote: 'Отвѣтъ (отписъ) клирика Острожскаго Ипатію Потѣю 1598 года',
    cols: [377, 432], date: [1598, 1598], dateCite: toc19('Отвътъ (отписъ) клиРика Остро жЖскАго Ипат:ю Поткю 1598 года'), edition: T19, lang: 'ruthenian' },
  { id: 'rib19_istoria_florent', book: /РИБ_т19_1903/, title: 'Исторія о разбойничьемъ Флорентійскомъ соборѣ (клирик Острозький, 1598), РИБ т. 19, стб. 433–476', author: 'Клірик Острозький', authorQuote: 'Исторія о разбойничьемъ Флорентійскомъ соборѣ, изданная клирикомъ Острожскимъ въ 1598 году',
    cols: [433, 476], date: [1598, 1598], dateCite: toc19('Исторгя 0 РАЗБОЙНИЧЬЕМЪ ФлОРЕНТ!Й- СКОМЪ — СОБОРЪ, ИЗДАННАЯ | КЛИРИКОМЪ Острожскимъ въ 1598 году'), edition: T19, lang: 'ruthenian' },
  { id: 'rib19_antirrhisis', book: /РИБ_т19_1903/, title: 'Ипатій Потій, «Антирисисъ», західно-руський текст 1599 р., РИБ т. 19, стб. 477–982', author: 'Іпатій Потій', authorQuote: 'Антирисисъ … Ипатія Потѣя (РИБ т. 19)',
    cols: [477, 982], polish: true, date: [1599, 1599], dateCite: toc19('Антиризисъ или Апологтя пРотивЪ Хри- СТОФОРА ФиИлЛАЛЕТА. Въ ДВУХЪ ТЕКСТАХЪ: Западно-Русскомъ (1599) и Польскомъ'), edition: T19, lang: 'ruthenian' },
  { id: 'rib19_potij_lyst', book: /РИБ_т19_1903/, title: 'Листъ Ипатія Потѣя къ князю К. К. Острожскому, 3 червня 1598, РИБ т. 19, стб. 983–1040', author: 'Іпатій Потій', authorQuote: 'Листъ Ипатія Потѣя къ князю Константину Константиновичу Острожскому, 3 іюня 1598 года',
    cols: [983, 1040], date: [1598, 1598], dateCite: toc19('Листъ Ипатгл Потвя къ князю Констли- тиЦУ КонстАНТИПоОВИчЧУ ОстрРожскоху, 3 тюня 1598 года'), edition: T19, lang: 'ruthenian' },
  { id: 'rib19_potij_otpovid', book: /РИБ_т19_1903/, title: 'Отвѣтъ (отписъ) Ипатія Потѣя клирику Острожскому, 1598–1599, РИБ т. 19, стб. 1041–1122', author: 'Іпатій Потій', authorQuote: 'Отвѣтъ (отписъ) Ипатія Потѣя клирику Острожскому, 1598—1599 года',
    cols: [1041, 1122], date: [1598, 1599], dateCite: toc19('Отвътъ (отписъ) Инлат:я Поткя клирикуУ Острожскому, 1598—1599 года'), edition: T19, lang: 'ruthenian' },
  { id: 'rib19_poslanie_latyn', book: /РИБ_т19_1903/, title: 'Посланіе до Латинъ изъ ихъ же книгъ, 1582, РИБ т. 19, стб. 1123–1148', author: 'невизначений автор (Посланіе до Латинъ, 1582)', authorQuote: 'Посланіе до Латинъ изъ ихъ же книгъ, 1582 года — оригинальное произведение неизвестного автора',
    cols: [1123, 1148], date: [1582, 1582], dateCite: toc19('Послаите до ЛатинЪ изъ ихЪ Же книг. 1582 годА'), edition: T19, lang: 'ruthenian' },
]

/** the printed column span of a scan page from its running head: the first and the last number of the first non-empty line (a page holds four columns) */
export function columnsOf(page: string): [number, number] | undefined {
  const head = page.split('\n').map(l => l.trim()).find(Boolean) ?? ''
  const nums = head.match(/\d{1,4}/g)?.map(Number) ?? []
  if (!nums.length) return undefined
  const a = nums[0]!, last = nums[nums.length - 1]!
  return [a, nums.length > 1 && last > a && last - a <= 6 ? last : a + 3]
}
/**
 * OQ line-level filter for a two-column scan page (Ruthenian text + Polish parallel text, «Антирисис»): tesseract read the Latin-script Polish column as Cyrillic look-alikes,
 * so its lines are garbage. A line is POLISH when it has a word with a glyph the Ruthenian text never uses (ѕ һ ү ќ ј ҹ ћ ђ), a capital inside a word (ВлушзКіеро), a digit inside a word, or ≥ 3 words
 * and not one Ruthenian mark; it is RUTHENIAN when it has a word ending in ъ, or a Ruthenian function word. A line with neither mark inherits the verdict of the previous line of its block (a blank line ends a block).
 * Returns the kept text and the number of dropped words.
 */
const END = String.raw`(?=[\s.,;:!?)\]»“]|$)`
const RUTH_MARK = new RegExp(String.raw`(?:^|[\s(\[«„])(?:ся|што|что|тый|тая|тое|тую|которы\p{L}*|есть|былъ|была|было|быти|зъ|съ|къ|безъ|надъ|подъ)${END}|\p{L}ъ${END}`, 'iu')
const POL_GLYPH = /[ѕһүќјҹћђҕӏ]/iu
const POL_WORD = /\p{Ll}\p{Lu}|\p{L}\d|\d\p{L}/u
export function polishFilter(text: string): { text: string; dropped: number } {
  const out: string[] = []; let dropped = 0, verdict: 'r' | 'p' | undefined
  for (const ln of text.split('\n')) {
    if (!ln.trim()) { verdict = undefined; out.push(ln); continue }
    if (/Руниверс|АНТ[ИЙ]*РИЗИС|ПРОТИВЪ ХРИСТОФОРА|^[\s\d]+$/.test(ln)) continue   // page furniture: the scanner's watermark, the running head, a bare column number
    const ws = ln.match(/[\p{L}\p{N}]+/gu) ?? []
    const polN = ws.filter(w => POL_GLYPH.test(w) || POL_WORD.test(w)).length, ruth = RUTH_MARK.test(ln)
    let v: 'r' | 'p'
    if (ruth && !polN) v = 'r'
    else if (polN && !ruth) v = 'p'
    else if (polN && ruth) v = polN >= 2 ? 'p' : 'r'
    else v = ws.length >= 3 && !verdict ? 'p' : (verdict ?? 'r')
    verdict = v
    if (v === 'p') dropped += ws.length
    else { const k = ln.replace(/[\p{L}\p{N}]+/gu, w => (POL_GLYPH.test(w) || POL_WORD.test(w)) ? (dropped++, ' ') : w); out.push(k) }   // a stray garbage word inside a Ruthenian line goes too
  }
  return { text: out.join('\n'), dropped }
}
const FOOT = /^\s*[\d¹²³*†‡]*\s*\)/
/** the first printed column of every scan page: OCR noise in a running head (`835` for `335`, a stray year) is rejected by the longest increasing chain of heads (a step of 1…8 columns per scan page) and the pages between chain members are interpolated at 4 columns per page; pages outside the chain's ends have no column */
export function pageColumns(pages: { n: number; text: string }[]): Map<number, number> {
  const h = pages.map(p => ({ n: p.n, a: columnsOf(p.text)?.[0] })).filter((x): x is { n: number; a: number } => x.a !== undefined).sort((x, y) => x.n - y.n)
  const best = h.map(() => 1), prev = h.map(() => -1)
  for (let i = 0; i < h.length; i++) for (let j = 0; j < i; j++) {
    const da = h[i]!.a - h[j]!.a, dn = h[i]!.n - h[j]!.n
    if (da > 0 && da <= 8 * dn && best[j]! + 1 > best[i]!) { best[i] = best[j]! + 1; prev[i] = j }
  }
  let k = best.reduce((m, v, i) => (v > best[m]! ? i : m), 0)
  const chain: { n: number; a: number }[] = []
  for (; k >= 0 && h.length; k = prev[k]!) chain.unshift(h[k]!)
  const out = new Map<number, number>()
  for (let i = 0; i < chain.length; i++) {
    const c = chain[i]!; out.set(c.n, c.a)
    const nx = chain[i + 1]; if (!nx) continue
    for (let n = c.n + 1; n < nx.n; n++) out.set(n, Math.min(nx.a - 1, c.a + 4 * (n - c.n)))
  }
  return out
}
export function workPages(pages: { n: number; text: string }[], cols: [number, number]): { n: number; a: number; text: string; foot: number }[] {
  const out: { n: number; a: number; text: string; foot: number }[] = []
  const colOf = pageColumns(pages)
  for (const p of pages) {
    const a0 = colOf.get(p.n); if (a0 === undefined) continue
    const c: [number, number] = [a0, a0 + 3]
    if (c[1] < cols[0] || c[0] > cols[1]) continue
    const lines = p.text.split('\n'), i = lines.findIndex(l => l.trim())
    const body = lines.slice(i + 1)
    out.push({ n: p.n, a: c[0], text: body.filter(l => !FOOT.test(l)).join('\n'), foot: body.filter(l => FOOT.test(l)).reduce((n, l) => n + (l.match(/\p{L}+/gu)?.length ?? 0), 0) })   // the running head and the footnote / variant lines are not text
  }
  return out
}

export function ribWitness(w: RibWork, pages: { n: number; text: string }[], source = 'owner-books'): (WitnessOut & { pages: [number, number] }) | { skip: string } {
  const plain = w.cols[1] === 0   // the Kyiv print has no printed columns: every scan page after the title leaves
  const sel = plain ? pages.filter(p => p.n >= 8).map(p => ({ n: p.n, a: p.n, text: p.text, foot: 0 })) : workPages(pages, w.cols)
  if (!sel.length) return { skip: 'no-pages' }
  const tokens: WitnessOut['tokens'] = []; let unmapped = 0, apparatus = 0
  for (const p of sel) {
    const pf = w.polish ? polishFilter(p.text) : undefined
    const t = textTokens(pf ? pf.text : p.text, plain ? `арк. ${p.n}` : `стб. ${p.a}`, true)
    const base = tokens.length ? tokens[tokens.length - 1]!.s + 1 : 0
    tokens.push(...t.tokens.map(x => ({ ...x, s: x.s + base }))); unmapped += t.unmapped; apparatus += t.apparatus + p.foot + (pf?.dropped ?? 0)
  }
  if (tokens.length < 20) return { skip: 'too-short' }
  const url = `owner-books:${w.book.source}`
  return { id: w.id, unit: w.id, title: w.title, author: authorFor(w.author, source, url, w.authorQuote), url, date: w.date, dateCite: w.dateCite, lang: w.lang, witnessType: 'ocr', edition: w.edition,
    ...(w.school ? { school: w.school } : {}), license: 'public domain (автор † до 1900; скан власника, OCR не вичитано)', dropped: { unmapped, apparatus }, tokens, pages: [sel[0]!.n, sel[sel.length - 1]!.n] }
}

export function readOcrBooks(dir: string): { name: string; pages: { n: number; text: string }[] }[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap(b => {
    const d = `${dir}/${b}`; if (!existsSync(`${d}/NAME`)) return []
    const pages = readdirSync(d).filter(f => /^page_\d+\.txt$/.test(f)).sort().map(f => ({ n: Number(f.slice(5, 9)), text: readFileSync(`${d}/${f}`, 'utf8') }))
    return [{ name: readFileSync(`${d}/NAME`, 'utf8').trim(), pages }]
  })
}

export function main(argv: string[]) {
  const arg = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined }
  const ocr = arg('--ocr') ?? process.env.OCR_DIR ?? 'data/raw/ocr', out = arg('--out') ?? 'data/work'
  mkdirSync(out, { recursive: true })
  const books = readOcrBooks(ocr)
  for (const w of RIB_WORKS) {
    const b = books.find(x => w.book.test(x.name))
    if (!b || !b.pages.length) { console.log(`${w.id}: no OCR text yet (${b ? 'book found, 0 pages' : 'book not found'}) — skipped`); continue }
    const r = ribWitness(w, b.pages)
    if ('skip' in r) { console.log(`${w.id}: skipped (${r.skip})`); continue }
    const { pages, ...wit } = r
    writeAtomic(`${out}/${w.id}.json`, JSON.stringify(wit))
    console.log(`${w.id}: ${wit.tokens.length} tokens, scan pages ${pages[0]}–${pages[1]}, dropped ${JSON.stringify(wit.dropped)}`)
  }
  mergeHarvestAuthors(out)   // the authors made by authorFor() live in data/work/harvest-authors.json (pipelines/authors.ts reads it): without this the build dropped every РИБ witness for «автор без запису»
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('pipelines/ingest-rib.ts')) main(process.argv.slice(2))
