/**
 * SPEC 63 KV-1: Г. Ф. Квітка-Основ’яненко, «Малоросійські повісті, розказані Грицьком Основ’яненком», т. 1 (Сочиненія Г. Ф. Квитки, Харків 1887, ред. О. О. Потебня; owner scan, worker OCR)
 * → one witness per повість (Слобожанщина, Харківщина). `npm run ingest:kvitka [-- --ocr <dir>] [-- --out <dir>]`
 *
 *  Pages : the scan page ranges below (title page, Potebnja's preface and the table of contents lie outside them). Inside a page the running head (the повість title, the page number) is dropped,
 *          and from the first footnote line («*) …», «1) …») to the end of the page everything is Potebnja's apparatus (Russian notes: first editions, censor marks, variants): never text.
 *  Dates : each повість has the first-publication year the 1887 edition itself states in its note (quoted below, OCR line breaks joined). A повість whose note names no year at all is NOT ingested
 *          (`date: null`, listed as skipped in the run output). Wikipedia dates the same stories by composition (Маруся 1832 / 1834, Добре роби 1836: inconsistent), so it is not used.
 *  Edition: stated plainly («Харків 1887, ред. А. А. Потебня»), WITHOUT «передмова й примітки російською»: the Russian apparatus is excluded from the text, so the witness carries no `ru` flag (core/ru-source.ts APPARATUS_RULES).
 *  OQ    : witnessType 'ocr' — the build gates it (core/ocr-quality.ts, S < 0.30 for a witness dated ≥ 1800) like every unproofread scan.
 */
import { mkdirSync } from 'node:fs'
import { Q } from '../core/evidence.ts'
import type { Evidence } from '../core/evidence.ts'
import type { WitnessOut } from '../core/types.ts'
import { writeAtomic } from '../harvest/lib.ts'
import { authorFor, mergeHarvestAuthors, textTokens } from './ingest-harvest.ts'
import { readOcrBooks } from './ingest-rib.ts'

export interface KvitkaWork { id: string; title: string; scan: [number, number]; head: RegExp; date: [number, number] | null; dateCite?: Evidence }
const P = (scan: number, quote: string, note: string): Evidence => Q(`Сочиненія Г. Ф. Квитки, т. 1, Харьковъ 1887, ред. А. А. Потебня, примітка на скан. с. ${scan} (OCR)`, `скан. с. ${scan}`, quote, note)
export const KVITKA_WORKS: KvitkaWork[] = [
  { id: 'kvitka_suplika', title: 'Квітка, «Суплика до пана издателя» (передмова до «Салдацького патрета»)', scan: [13, 16], head: /СУПЛИКА/i, date: [1833, 1833],
    dateCite: P(13, 'Напечатана въ альманахѣ „Утренняя Звѣзда", Харьковъ, 1833, кн. 2, какъ предисловіе къ повѣсти „ Салдацькій патреть".', 'рік друку — з примітки видання 1887 (Потебня)') },
  { id: 'kvitka_saldatsky_patret', title: 'Квітка, «Салдацькый патретъ» (Малоросійські повісті, т. 1)', scan: [17, 38], head: /САЛДАЦЬК|ПАТРЕТ/i, date: [1833, 1834],
    dateCite: P(17, 'Первое изданіе въ альманахѣ „ Утренняя звѣзда“ на 1833 годъ (Харьковъ, въ Университетской типографіи 1834 г.; помѣтка цензора: Декабря 1-го дня 1833 г.)', 'альманах «на 1833 год», друк 1834 р., цензурна помітка 1.12.1833: [1833, 1834]') },
  { id: 'kvitka_marusia', title: 'Квітка, «Маруся» (Малоросійські повісті, т. 1)', scan: [39, 124], head: /МАРУСЯ/i, date: [1834, 1834],
    dateCite: P(39, 'Первое изданіе въ „ Малороссійскія повѣсти, разсказываемыя Грыцькомъ Основьяненкомъ“ , кн. 1, Москва, 1834 г.; помѣтка цензора: Октября 4-го дня 1833 г.', 'перше видання — Москва 1834 (кн. 1)') },
  { id: 'kvitka_mertvetsky_velykden', title: 'Квітка, «Мертвецькый велык-день» (Малоросійські повісті, т. 1)', scan: [125, 150], head: /МЕРТВЕЦЬК|ВЕЛЫК/i, date: [1834, 1834],
    dateCite: P(127, 'Въ изданіи 1834 г. помѣтка цензора: Октября 4, 1833 г.', 'видання 1834 р. з цензурною приміткою 4.10.1833 (примітка видання 1887)') },
  { id: 'kvitka_dobre_roby', title: 'Квітка, «Добре робы, добре и буде» (Малоросійські повісті, т. 1)', scan: [151, 186], head: /ДОБРЕ РОБ|ДОБРЕ И БУДЕ/i, date: [1833, 1834],
    dateCite: P(151, 'На первомъ изданіи помѣтка цензора: Москва, Октября 4, 1833 г.', 'примітка 1887 називає лише цензурну помітку першого видання (Москва, 4.10.1833) — ту саму, що в «Малороссійскихъ повѣстяхъ» кн. 1, Москва 1834: [1833, 1834]; рік друку прямо не названо') },
  { id: 'kvitka_konotopska_vidma', title: 'Квітка, «Конотопська видьма» (Малоросійські повісті, т. 1)', scan: [187, 265], head: /КОНОТОП|ВИДЬМА/i, date: [1833, 1834],
    dateCite: P(187, 'На первомъ изданіи помѣтка цензора: Москва, Октября 4, 1833 г.', 'примітка 1887: лише цензурна помітка першого видання (Москва, 4.10.1833); рік друку прямо не названо: [1833, 1834]') },
]
const EDITION = 'Сочиненія Г. Ф. Квитки (Основьяненка), т. 1, Харків 1887, ред. А. А. Потебня (Харківське земство; скан власника, OCR не вичитано)'
const FOOT = /^\s*[\d¹²³*†‡]*\s*\)/
const RUSSIAN = /(^|\s)(что|это|или|который|которы\S*|быть|также|только|если|когда|изданіе|изданіи|примѣчаніе|помѣтка|помѣтку)(\s|$)/i
const bare = (l: string) => !/\p{Ll}/u.test(l) || /^[\s\d.,]*$/.test(l)

/** the text of one scan page: running head and page number dropped, everything from the first footnote line on is apparatus; returns the kept text and the number of apparatus words */
export function kvitkaPage(text: string, head: RegExp): { text: string; apparatus: number } {
  const keep: string[] = []; let app = 0, inFoot = false
  for (const ln of text.split('\n')) {
    const words = ln.match(/\p{L}+/gu)?.length ?? 0
    if (!ln.trim()) { keep.push(ln); continue }
    if (inFoot || FOOT.test(ln)) { inFoot = true; app += words; continue }
    const star = ln.indexOf('*)')   // the footnote may start in the middle of the last text line («… що ёму на*) Въ изданіи 1834 г. …»)
    if (star > 0 && (ln.slice(0, star).match(/\p{L}+/gu)?.length ?? 0) >= 3 && /\p{Ll}/u.test(ln.slice(0, star)) && !head.test(ln)) {
      app += words - (ln.slice(0, star).match(/\p{L}+/gu)?.length ?? 0); inFoot = true; keep.push(ln.slice(0, star)); continue
    }
    if (bare(ln) || (head.test(ln) && words <= 4)) continue
    if (RUSSIAN.test(ln)) { app += words; continue }
    keep.push(ln)
  }
  return { text: keep.join('\n'), apparatus: app }
}

export function kvitkaWitness(w: KvitkaWork, pages: { n: number; text: string }[], source = 'owner-books', bookName = 'Квітка_Малоросійські_повісті_1887.pdf'): (WitnessOut & { pages: [number, number] }) | { skip: string } {
  if (!w.date || !w.dateCite) return { skip: 'undated' }
  const sel = pages.filter(p => p.n >= w.scan[0] && p.n <= w.scan[1])
  if (!sel.length) return { skip: 'no-pages' }
  const tokens: WitnessOut['tokens'] = []; let unmapped = 0, apparatus = 0
  for (const p of sel) {
    const k = kvitkaPage(p.text, w.head)
    const t = textTokens(k.text, `скан. с. ${p.n}`, true)
    const base = tokens.length ? tokens[tokens.length - 1]!.s + 1 : 0
    tokens.push(...t.tokens.map(x => ({ ...x, s: x.s + base }))); unmapped += t.unmapped; apparatus += t.apparatus + k.apparatus
  }
  if (tokens.length < 20) return { skip: 'too-short' }
  const url = `owner-books:${bookName}`
  return { id: w.id, unit: w.id, title: w.title, author: authorFor('Григорій Квітка-Основ’яненко', source, url, 'Сочиненія Григорія Ѳедоровича Квитки (р. 1778, † 1843), Малороссійскія повѣсти, разсказанныя Грыцькомъ Основъяненкомъ', 'Слобожанщина'),
    url, date: w.date, dateCite: w.dateCite, lang: 'uk', region: 'Слобожанщина', witnessType: 'ocr', edition: EDITION, license: 'public domain (автор † 1843; скан власника, OCR не вичитано)',
    dropped: { unmapped, apparatus }, tokens, pages: [sel[0]!.n, sel[sel.length - 1]!.n] }
}

export function main(argv: string[]) {
  const arg = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined }
  const ocr = arg('--ocr') ?? process.env.OCR_DIR ?? 'data/raw/ocr', out = arg('--out') ?? 'data/work'
  mkdirSync(out, { recursive: true })
  const b = readOcrBooks(ocr).find(x => /Квітка_Малоросійські_повісті/.test(x.name))
  if (!b || !b.pages.length) { console.log(`kvitka: no OCR text yet (${b ? 'book found, 0 pages' : 'book not found'}) — skipped`); return }
  for (const w of KVITKA_WORKS) {
    const r = kvitkaWitness(w, b.pages, 'owner-books', b.name)
    if ('skip' in r) { console.log(`${w.id}: skipped (${r.skip})`); continue }
    const { pages, ...wit } = r
    writeAtomic(`${out}/${w.id}.json`, JSON.stringify(wit))
    console.log(`${w.id}: ${wit.tokens.length} tokens, scan pages ${pages[0]}–${pages[1]}, dropped ${JSON.stringify(wit.dropped)}`)
  }
  mergeHarvestAuthors(out)
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('pipelines/ingest-kvitka.ts')) main(process.argv.slice(2))
