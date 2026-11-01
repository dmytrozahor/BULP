/**
 * SPEC 63 SE-13: Є. Желехівський, С. Недільський, «Малоруско-нїмецкий словар», Львів 1886 (т. 1 А–О, т. 2 П–Я), archive.org items zhelekhivsk1 / zhelekhivsk2 (djvu text layer).
 * Public domain (Желехівський † 1885, Недільський † 1899; the print of 1886). Neutral research User-Agent WITHOUT an e-mail address (harvest/ia-text.ts), pacing >= 1 s, curl -4.
 * Resumable: index.jsonl is the truth, one gz payload per volume written atomically before its index line (RS-1).
 * Page markers: the djvu text has no form feeds, but archive.org's `_hocr_searchtext.txt.gz` + `_hocr_pageindex.json.gz` (leaf offsets) carry the same characters per leaf, and `_page_numbers.json` the printed page of each leaf.
 * `pagesOf` derives from them, per volume, the non-space character offset where every leaf starts and its printed page; stored as the payload `<ia>.pages2` (index id `zhel:<ia>:pages2`).
 * Usage: tsx harvest/zhelekhivsky.ts   (HARVEST_DIR=<raw>/harvest)
 */
import { gunzipSync } from 'node:zlib'
import { Harvest, type IndexItem } from './lib.ts'
import { IA_UA, curlGet, pickTextFile } from './ia-text.ts'

export interface ZhelVol { ia: string; vol: 1 | 2; range: string }
export const ZHEL_VOLS: ZhelVol[] = [
  { ia: 'zhelekhivsk1', vol: 1, range: 'А–О' },
  { ia: 'zhelekhivsk2', vol: 2, range: 'П–Я' },
]
export const zhelItem = (w: ZhelVol, bytes: number, status: number, iaFile: string): IndexItem => ({
  id: `zhel:${w.ia}`, url: `https://archive.org/details/${w.ia}`, date: '1886',
  licence: 'PD (Є. Желехівський † 1885, С. Недільський † 1899; видання 1886; archive.org OCR, не вичитано)', bytes, status,
  title: `Малоруско-нїмецкий словар, т. ${w.vol} (${w.range})`, author: 'Євгеній Желехівський, Софрон Недільський', region: 'Львів', source: 'zhelekhivsky', vol: String(w.vol), range: w.range,
  ocr: true, iaItem: w.ia, iaFile,
})

export interface ZhelPages { /** cumulative non-space characters before each leaf */ leafNs: number[]; /** printed page number of each leaf ('' when unnumbered) */ page: string[]; totalNs: number }
const nsLen = (s: string) => s.replace(/\s+/g, '').length
/** pure: searchtext + page index + page numbers -> ZhelPages; leaf i starts at the non-space count of searchtext[0 .. pageindex[i][0]) */
export function pagesOf(searchText: string, pageIndex: number[][], pageNumbers: { pages: { leafNum: number; pageNumber: string }[] }): ZhelPages {
  const leafNs = pageIndex.map(r => nsLen(searchText.slice(0, r[0]!)))
  const byLeaf = new Map(pageNumbers.pages.map(p => [p.leafNum, p.pageNumber]))
  return { leafNs, page: pageIndex.map((_, i) => byLeaf.get(i + 1) ?? ''), totalNs: nsLen(searchText) }
}
async function fetchPages(h: Harvest, w: ZhelVol) {
  const id = `zhel:${w.ia}:pages2`; if (h.has(id)) return
  const get = async (suffix: string) => { const r = await curlGet(h, `https://archive.org/download/${w.ia}/${w.ia}${suffix}`, 2000); return r.status === 200 ? r.buf : null }
  const st = await get('_hocr_searchtext.txt.gz'), pi = await get('_hocr_pageindex.json.gz'), pn = await get('_page_numbers.json')
  if (!st || !pi || !pn) { h.log(`${w.ia}: page files unavailable, retried on the next run`); return }
  const pg = JSON.stringify(pagesOf(gunzipSync(st).toString('utf8'), JSON.parse(gunzipSync(pi).toString('utf8')), JSON.parse(pn.toString('utf8'))))
  h.put(`${w.ia}.pages2`, pg, [{ ...zhelItem(w, 0, 200, `${w.ia}_hocr_searchtext.txt.gz + _hocr_pageindex.json.gz + _page_numbers.json`), id, title: `${w.ia}: leaf offsets and printed page numbers`, bytes: pg.length }])
}

async function main() {
  const h = new Harvest('ia-zhelekhivsky', { delayMs: 2000, logEvery: 1 })
  const H = { 'user-agent': IA_UA }
  let fails = 0
  for (const w of ZHEL_VOLS) {
    if (h.has(`zhel:${w.ia}`)) continue
    const meta = await h.get(`https://archive.org/metadata/${encodeURIComponent(w.ia)}`, { headers: H, soft5xx: true })
    if (meta.status !== 200) { h.put(`${w.ia}.none`, '', [zhelItem(w, 0, meta.status, '')]); continue }
    const file = pickTextFile(((await meta.res.json()) as { files?: { name: string; size?: string }[] }).files ?? [])
    if (!file) { h.put(`${w.ia}.none`, '', [zhelItem(w, 0, 404, '')]); continue }
    const r = await curlGet(h, `https://archive.org/download/${encodeURIComponent(w.ia)}/${encodeURIComponent(file)}`, 2000)
    if (r.status === 0) { if (++fails >= 3) h.stop('3 curl failures in a row'); continue }
    fails = 0
    if (r.status !== 200) { h.put(`${w.ia}.none`, '', [zhelItem(w, 0, r.status, file)]); continue }
    h.put(w.ia, r.buf, [zhelItem(w, r.buf.length, 200, file)])
  }
  for (const w of ZHEL_VOLS) if (h.has(`zhel:${w.ia}`)) await fetchPages(h, w)
  h.finish()
}
if (process.argv[1]?.split(String.fromCharCode(92)).join('/').endsWith('harvest/zhelekhivsky.ts')) await main()
