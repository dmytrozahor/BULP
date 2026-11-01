/**
 * SPEC 63 GG-19 (phraseology gap): archive.org OCR texts (djvu text layer) of two public-domain proverb collections.
 *  - М. Номис [Симонов], «Українські приказки, прислів'я і таке інше», С.-Петербург 1864 (archive.org/details/nomis1864; Номис † 1866).
 *  - І. Франко, «Галицько-руські народні приповідки», Етнографічний збірник 10 (1901), 16 (1905), 23–24 (1907–1908), 27–28 (1909–1910)
 *    (archive.org/details/etnohr_10, etnohr_16, etnohr_23, etnohr_24, etnohr_27, etnohr_28; Франко † 1916).
 * Only items that the archive.org search + /metadata actually returned are listed (no invented edition); etnohr_23 has no text layer in its /metadata (only a 124 MB .djvu image): recorded as status 404, not OCR'd here.
 * Neutral research User-Agent WITHOUT an e-mail address (harvest/ia-text.ts); archive.org robots.txt disallows only /control/ and /report/; pacing 3 s.
 * Usage: HARVEST_DIR=<raw>/harvest tsx harvest/proverbs.ts   (resumable: index.jsonl is the truth; each item one gz file written atomically before its index line)
 */
import { Harvest, type IndexItem } from './lib.ts'
import { IA_UA, curlGet, pickTextFile } from './ia-text.ts'

export interface ProvWork { ia: string; source: 'nomis' | 'franko'; author: string; death: number; title: string; year: number; place: string; vol: string; range: string }
export const PROVERB_WORKS: ProvWork[] = [
  { ia: 'nomis1864', source: 'nomis', author: 'Матвій Номис (М. Симонов)', death: 1866, title: 'Українські приказки, прислів\'я і таке інше', year: 1864, place: 'С.-Петербург', vol: '', range: '' },
  { ia: 'etnohr_10', source: 'franko', author: 'Іван Франко', death: 1916, title: 'Галицько-руські народні приповідки, т. I, вип. 1 (А–Відати); Етнографічний збірник, т. 10', year: 1901, place: 'Львів', vol: '10', range: 'А–Відати' },
  { ia: 'etnohr_16', source: 'franko', author: 'Іван Франко', death: 1916, title: 'Галицько-руські народні приповідки, т. I, вип. 2 (Відати–Діти); Етнографічний збірник, т. 16', year: 1905, place: 'Львів', vol: '16', range: 'Відати–Діти' },
  { ia: 'etnohr_23', source: 'franko', author: 'Іван Франко', death: 1916, title: 'Галицько-руські народні приповідки, т. II, вип. 1 (Діти–Кпити); Етнографічний збірник, т. 23', year: 1907, place: 'Львів', vol: '23', range: 'Діти–Кпити' },
  { ia: 'etnohr_24', source: 'franko', author: 'Іван Франко', death: 1916, title: 'Галицько-руські народні приповідки, т. II, вип. 2 (Кравець–Пять); Етнографічний збірник, т. 24', year: 1908, place: 'Львів', vol: '24', range: 'Кравець–Пять' },
  { ia: 'etnohr_27', source: 'franko', author: 'Іван Франко', death: 1916, title: 'Галицько-руські народні приповідки, т. III, вип. 1 (Рабунок–Час); Етнографічний збірник, т. 27', year: 1909, place: 'Львів', vol: '27', range: 'Рабунок–Час' },
  { ia: 'etnohr_28', source: 'franko', author: 'Іван Франко', death: 1916, title: 'Галицько-руські народні приповідки, т. III, вип. 2 (Рабунок–Ячмінь); Етнографічний збірник, т. 28', year: 1910, place: 'Львів', vol: '28', range: 'Рабунок–Ячмінь' },
]
export const proverbItem = (w: ProvWork, bytes: number, status: number, iaFile: string): IndexItem => ({
  id: `proverbs:${w.ia}`, url: `https://archive.org/details/${w.ia}`, date: String(w.year),
  licence: `PD (автор † ${w.death} ≤ 1955; видання ${w.year}; archive.org OCR, не вичитано)`, bytes, status, title: w.title, author: w.author, region: w.place,
  source: w.source, vol: w.vol, range: w.range, ocr: true, iaItem: w.ia, iaFile,
})

async function main() {
  const h = new Harvest('ia-proverbs', { delayMs: 3000, logEvery: 1 })
  const H = { 'user-agent': IA_UA }
  let fails = 0
  for (const w of PROVERB_WORKS) {
    const id = `proverbs:${w.ia}`
    if (h.has(id)) continue
    const meta = await h.get(`https://archive.org/metadata/${encodeURIComponent(w.ia)}`, { headers: H, soft5xx: true })
    if (meta.status !== 200) { h.put(`${w.ia}.none`, '', [proverbItem(w, 0, meta.status, '')]); continue }
    const file = pickTextFile(((await meta.res.json()) as { files?: { name: string; size?: string }[] }).files ?? [])
    if (!file) { h.put(`${w.ia}.none`, '', [proverbItem(w, 0, 404, '')]); continue }
    const r = await curlGet(h, `https://archive.org/download/${encodeURIComponent(w.ia)}/${encodeURIComponent(file)}`, 3000)
    if (r.status === 0) { if (++fails >= 3) h.stop('3 curl failures in a row'); continue }
    fails = 0
    if (r.status !== 200) { h.put(`${w.ia}.none`, '', [proverbItem(w, 0, r.status, file)]); continue }
    h.put(w.ia, r.buf, [proverbItem(w, r.buf.length, 200, file)])
  }
  h.finish()
}
if (process.argv[1]?.split(String.fromCharCode(92)).join("/").endsWith("harvest/proverbs.ts")) await main()
