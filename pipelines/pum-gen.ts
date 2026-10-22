/**
 * SPEC 63 RF-11: one-off generator of the tracked seeds of the later «Пам'ятки української мови» charter editions (the reading of the owner's scan, run on the PC; the seeds, not the scans, go to git, exactly as data/seed/pum14).
 *   npx tsx pipelines/pum-gen.ts xv <layout-text> [--out data/seed/pum15]     the text layer of «Українські грамоти XV ст.» (`pdftotext -layout -enc UTF-8`)
 *   npx tsx pipelines/pum-gen.ts vol16 <ocr-dir> [--out data/seed/vol16]      the Tesseract pages of «Волинські грамоти XVI ст.» (page_NNNN.txt)   [see pum-vol16.ts]
 * A charter becomes a seed only when its own text is Cyrillic (a charter printed in Polish script, or too short after the apparatus is removed, is listed as skipped, never guessed).
 * witnessType is `ocr`: the text is our machine reading of the PRINTED edition (the edition is an edited text, but what enters the corpus is OCR), so the build's OQ gate applies (core/ocr-quality.ts).
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { Q } from '../core/evidence.ts'
import type { WitnessOut } from '../core/types.ts'
import { writeAtomic } from '../harvest/lib.ts'
import { textTokens } from './ingest-harvest.ts'
import { charterText, digits, parseToc } from './pum-ed.ts'
import { parseVol16, parseVol16Toc, repairDates } from './pum-vol16.ts'
import type { Vol16TocEntry } from './pum-vol16.ts'
import type { TocEntry } from './pum-ed.ts'

export const XV_EDITION = 'Українські грамоти XV ст., підготовка тексту, вступна стаття і коментарі В. М. Русанівського, К.: Наукова думка, 1965 (Пам’ятки української мови. Серія юридичної літератури; АН УРСР, Інститут мовознавства ім. О. О. Потебні)'
export const XV_URL = 'owner-books:gramotyxv.pdf'
export const MIN_TOKENS = 20
export interface Skipped { n: number; why: string }

/** the region the edition's own section heading gives (the edition groups the charters by territory) */
export function regionXv(n: number): string {
  return n <= 5 ? 'Центральна Україна' : n <= 28 ? 'Західне Полісся (Волинь, Литва)' : n <= 31 ? 'Галичина' : n <= 64 ? 'Молдавія' : n === 65 ? 'Закарпаття' : 'Додатки (Валахія, Крим)'
}
const SECTION_END_XV = 5737   // the line of «ДОДАТКИ» in the layout text: charter 65 ends there
export function buildXv(lines: string[]): { witnesses: (WitnessOut & { pages: number })[]; skipped: Skipped[]; toc: TocEntry[] } {
  const tocAt = lines.findIndex((l, i) => /^\s*ЗМІСТ\s*$/.test(l) && i > 5000)
  // the contents' layout puts the page of № 41 («86») after the title of № 42 (the scan has the line «… Сучава). 86» between them): read off the printed contents, stated once here
  const toc = parseToc(lines.slice(tocAt, tocAt + 280), 1, 65).map(e => (e.page === 0 && e.n === 41 ? { ...e, page: 86 } : e))
  const head = (l: string) => l.match(/^\s*№\s?([0-9ЗОІlI]{1,3})\*?\s*$/)
  const pos: number[] = []; let cur = 0
  const first = lines.findIndex(l => /^\s*№ ?1\*?\s*$/.test(l))
  for (let i = first; i < tocAt; i++) { const m = head(lines[i]!); if (m && +digits(m[1]!) === cur + 1) { cur++; pos[cur] = i } }
  const dodat = lines.findIndex((l, i) => i > pos[65]! && /^\s*ДОДАТКИ\s*$/.test(l))
  const appI = lines.findIndex((l, i) => i > dodat && /^\s*[ІI]\s*$/.test(l)), appII = lines.findIndex((l, i) => i > appI && /^\s*[ІI]{2}\s*$/.test(l))
  const covEnd = lines.findIndex((l, i) => i > appII && /ПОКАЖЧИК ОСОБОВИХ ІМЕН/.test(l))
  const sections: { n: number; sec: string[]; label: string }[] = []
  for (let n = 1; n <= 65; n++) sections.push({ n, sec: lines.slice(pos[n]! + 1, n < 65 ? pos[n + 1] : dodat), label: `№ ${n}` })
  sections.push({ n: 66, sec: lines.slice(appI + 1, appII), label: 'Додаток І' }, { n: 67, sec: lines.slice(appII + 1, covEnd), label: 'Додаток ІІ' })
  const appToc: TocEntry[] = [
    { n: 66, title: 'Влад воєвода надає право українським, польським і молдавським купцям вільно купувати і продавати товари в угро-влахійській землі', dateText: '8 вересня 1440 року', place: 'Торговищі', page: 135, date: [1440, 1440] },
    { n: 67, title: 'Послання великому князеві Казимирові від царя Муртази, передане братом Муртази Ахматом', dateText: 'Серпень 1484 року', page: 137, date: [1484, 1484] },
  ]
  const all = [...toc, ...appToc]
  const witnesses: (WitnessOut & { pages: number })[] = [], skipped: Skipped[] = []
  for (const { n, sec, label } of sections) {
    const e = all.find(x => x.n === n); if (!e) { skipped.push({ n, why: 'no table-of-contents entry (date unknown)' }); continue }
    const r = charterText(sec)
    const loc = `${label}, с. ${e.page}`
    const t = textTokens(r.text, loc, true)
    if (t.tokens.length < MIN_TOKENS) { skipped.push({ n, why: `${t.tokens.length} Cyrillic tokens after the apparatus is removed (a text printed in Polish script)` }); continue }
    const id = `gr15_${n}`
    witnesses.push({
      id, unit: 'pum15', title: `Грамота XV ст. ${label}. ${e.title}`, author: 'pum15', url: XV_URL, date: e.date,
      dateCite: Q(`${XV_URL}, ЗМІСТ`, `${label}, с. ${e.page}`, `${e.dateText}${e.place ? `, ${e.place}` : ''}`, `дата — рядок видання (зміст і заголовок грамоти); ${e.note ?? 'рік або діапазон так, як їх подає видання'}`),
      lang: 'ruthenian', region: `${regionXv(n)}${e.place ? `; ${e.place}` : ''}`, witnessType: 'ocr', edition: `${XV_EDITION}, ${label}, с. ${e.page}`,
      license: 'текст грамоти — суспільне надбання; апарат видання 1965 р. (передмова, коментарі, покажчики, словник) не входить', dropped: { unmapped: t.unmapped, apparatus: r.apparatus + t.apparatus }, tokens: t.tokens, pages: e.page,
    })
  }
  return { witnesses, skipped, toc: all }
}

export function main(argv: string[]) {
  const kind = argv[0], src = argv[1]
  const arg = (k: string) => { const j = argv.indexOf(k); return j >= 0 ? argv[j + 1] : undefined }
  if (!src || !existsSync(src) || (kind !== 'xv' && kind !== 'vol16')) throw new Error('usage: pum-gen.ts xv <layout-text> [--out dir] | vol16 <ocr-dir> --toc-file <psm6 OCR of the contents, scan pages 242-246> [--first 18 --last 224 --out dir]')
  if (kind === 'xv') {
    const out = arg('--out') ?? 'data/seed/pum15'
    mkdirSync(out, { recursive: true })
    const { witnesses, skipped } = buildXv(readFileSync(src, 'utf8').split('\n'))
    for (const { pages: _p, ...w } of witnesses) writeAtomic(`${out}/${w.id}.json`, JSON.stringify(w))
    console.log(`pum15: ${witnesses.length} charters, ${witnesses.reduce((n, w) => n + w.tokens.length, 0)} tokens; skipped: ${skipped.map(s => `№ ${s.n} (${s.why})`).join('; ') || 'none'}`)
    return
  }
  const out = arg('--out') ?? 'data/seed/vol16', first = Number(arg('--first') ?? 18), last = Number(arg('--last') ?? 224)
  const page = (n: number) => readFileSync(`${src}/page_${String(n).padStart(4, '0')}.txt`, 'utf8')
  const pages = Array.from({ length: last - first + 1 }, (_, k) => ({ n: first + k, text: page(first + k) }))
  const tocFile = arg('--toc-file')
  if (!tocFile || !existsSync(tocFile)) throw new Error('vol16 needs --toc-file (tesseract --psm 6 at 400 dpi over scan pages 242-246: the default layout analysis loses the dates)')
  const toc = readFileSync(tocFile, 'utf8')
  mkdirSync(out, { recursive: true })
  const { witnesses, skipped } = buildVol16(pages, toc)
  for (const w of witnesses) writeAtomic(`${out}/${w.id}.json`, JSON.stringify(w))
  console.log(`vol16: ${witnesses.length} charters, ${witnesses.reduce((n, w) => n + w.tokens.length, 0)} tokens; skipped: ${skipped.map(s => `№ ${s.n} (${s.why})`).join('; ') || 'none'}`)
}

// ── «Волинські грамоти XVI ст.» (1995) ────────────────────────────────────────────────────────────────
export const VOL16_EDITION = 'Волинські грамоти XVI ст., упорядники В. Б. Задорожний, А. М. Матвієнко, К.: Наукова думка, 1995 (Пам’ятки української мови; НАН України, Інститут української мови, Інститут української археографії)'
export const VOL16_URL = 'owner-books:e_dzherela_gramoti_1995.pdf'
/**
 * pages: the OCR pages of the charter part (first charter page … last charter page); tocText: the contents read with a page-layout OCR (Tesseract --psm 6; the default layout analysis loses the dates).
 * The 128 charters of the body are found by the titles of the contents (in order); the contents give the date of the document itself; a charter whose year the OCR spoiled is dated between its trusted neighbours
 * (the list is chronological, repairDates), one with no year in print (№ 126–128) is skipped and listed.
 */
export function buildVol16(pages: { n: number; text: string }[], tocText: string): { witnesses: WitnessOut[]; skipped: Skipped[]; toc: Vol16TocEntry[] } {
  const toc = parseVol16Toc(tocText), rep = repairDates(toc), cs = parseVol16(pages, 1, toc.map(e => e.title))
  if (cs.length !== toc.length) throw new Error(`vol16: ${cs.length} charters found in the body for ${toc.length} entries of the contents`)
  const witnesses: WitnessOut[] = [], skipped: Skipped[] = []
  for (const c of cs) {
    const e = toc[c.n - 1]!, r = rep[c.n - 1]!, loc = `№ ${c.n}, с. ${c.page}`
    if (!r.date) { skipped.push({ n: c.n, why: 'no year in the edition (undated)' }); continue }
    const t = textTokens(c.text, loc, true)
    if (t.tokens.length < MIN_TOKENS) { skipped.push({ n: c.n, why: `${t.tokens.length} Cyrillic tokens` }); continue }
    const stated = c.dates.map(x => `${x.kind === 'act' ? 'Акт' : 'Випис'} від ${x.text}`).join('; ')
    const between = r.basis === 'between'
    witnesses.push({
      id: `gv16_${c.n}`, unit: 'vol16', title: `Волинська грамота XVI ст. № ${c.n}. ${e.title}`, author: 'vol16', url: VOL16_URL, date: r.date,
      dateCite: Q(`${VOL16_URL}, ЗМІСТ`, `${loc} (скан. с. ${c.scan})`, between ? `${e.title}`.slice(0, 280) : (e.dateText ?? String(r.date[0])),
        between ? `рік у змісті не прочитано надійно (OCR); перелік видання хронологічний, тому дату взято між роками сусідніх грамот: ${r.date[0]}–${r.date[1]}; у заголовку акта: ${stated || 'немає'}`
          : `дата грамоти — рядок змісту видання (хронологічний перелік); у заголовку акта: ${stated || 'немає'}`),
      lang: 'ruthenian', region: 'Волинь (книги Володимирського земського суду)', witnessType: 'ocr', edition: `${VOL16_EDITION}, ${loc}`,
      license: 'текст грамоти — суспільне надбання; апарат видання 1995 р. (передмова, опис книг, покажчики, словник, зміст) не входить', dropped: { unmapped: t.unmapped, apparatus: t.apparatus }, tokens: t.tokens,
    })
  }
  return { witnesses, skipped, toc }
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('pipelines/pum-gen.ts')) main(process.argv.slice(2))
