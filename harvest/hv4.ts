/**
 * SPEC 63 HV-4 (owner 2026-10-16): Зизаній «Граматіка словенска» + «Лексис» (Вільно 1596), Смотрицький «Грамматіки славенския правилноє синтаґма» (Єв'є 1619),
 * Беринда «Лексікон славенорωсскїй» (Київ 1627; 2nd ed. Кутеїн 1653). Source = archive.org OCR text (`<id>_djvu.txt`) of the scans of the ORIGINAL prints (public domain by age).
 * archive.org robots.txt: only /control/ and /report/ disallowed; pacing 2 s. Nothing else is fetched: the izbornyk.org.ua scans are PNG facsimiles without a text layer
 * and its typed «Синоніма» (zyz70–73) is Німчук's 1964 transcription (rights unclear) → listed in DECISIONS-NEEDED, not fetched. The 1961/1964 Німчук editions (archive.org leksykon1961,
 * zyzanii2, hramslavenski 1979) carry copyrighted apparatus → not fetched either. See research/45-hv4-old-grammars.md.
 * Usage: tsx harvest/hv4.ts      (resumable: index.jsonl is the truth; each item is one gz file, its index line is appended after the write)
 */
import { Harvest, decisionNeeded, type IndexItem } from './lib.ts'

export interface Hv4Work { id: string; ia: string; file: string; title: string; author: string; date: string; region: string; kind: 'grammar' | 'lexicon'; edition: string; licence: string }
const PD = 'PD (друк ≤ 1653; скан archive.org, OCR не вичитано)'
export const HV4_WORKS: Hv4Work[] = [
  { id: 'hv4:zyzanii-gramatika-1596', ia: 'gramat0slovenska', file: 'gramat0slovenska_djvu.txt', title: 'Граматіка словєнска (Л. Зизаній)', author: 'Лаврентій Зизаній', date: '1596', region: 'Вільно', kind: 'grammar', edition: 'Вільно, друкарня Братська, 1596', licence: PD },
  { id: 'hv4:zyzanii-leksis-1596', ia: 'zyzanii', file: 'zyzanii_djvu.txt', title: 'Лексис, сирѣчь реченїя … истолкованы (Л. Зизаній) + Наука ку читаню', author: 'Лаврентій Зизаній', date: '1596', region: 'Вільно', kind: 'lexicon', edition: 'Вільно, друкарня Братська, 1596', licence: PD },
  { id: 'hv4:smotrytskyi-hramatyka-1619', ia: 'g1619s', file: 'g1619s_djvu.txt', title: 'Грамматіки славенския правилноє синтаґма (М. Смотрицький)', author: 'Мелетій Смотрицький', date: '1619', region: "Єв'є", kind: 'grammar', edition: "Єв'є (Вевіс), друкарня Братська, 1619", licence: PD },
  { id: 'hv4:berynda-leksikon-1627', ia: 'slovnyk-Pamva-Beryndy', file: '52857744008540_djvu.txt', title: 'Лексіконъ славенорωсскїй и имєнъ тлъкованїє (П. Беринда)', author: 'Памво Беринда', date: '1627', region: 'Київ', kind: 'lexicon', edition: 'Київ, Печерська друкарня, 1627 (archive.org: Public Domain Mark 1.0)', licence: PD },
  { id: 'hv4:berynda-leksikon-1653', ia: 'Pamva_Berynda_1653', file: 'PamvaBerynda1653_djvu.txt', title: 'Лексікон славеноруський (П. Беринда), 2-ге вид. з передмовою Іоїля Труцевича', author: 'Памво Беринда', date: '1653', region: 'Кутеїн (Орша)', kind: 'lexicon', edition: 'Кутеїн, 1653', licence: PD },
]

export const HV4_SKIPPED: string[] = [
  '- SKIPPED (HV-4) izbornyk.org.ua zyzlex/zyz70–73 «Синоніма славеноросская» typed text: it is the 1964 transcription by В. Німчук (Пам\'ятки української мови, Київ); rights of the modern transcription are not stated. The izbornyk facsimile pages (zyzlex, zyzgram, smotrgram, berlex) are PNG images without text. robots.txt is open (only /dos /mac /koi disallowed). NEEDS DECISION: fetch the typed Синоніма (4 pages) as vocabulary-only?',
  '- SKIPPED (HV-4) Німчук editions on archive.org: leksykon1961 (Лексикон Беринди, 1961), zyzanii2 / leksys 03 (Лексис Зизанія, 1964), hramslavenski (Смотрицький, 1979): in-copyright scholarly editions (apparatus); the 1596/1619/1627/1653 scans are harvested instead.',
  '- NOTE (HV-4) OCR of 16th–17th c. Cyrillic print by archive.org is noisy (ѧ ѻ ꙋ ѿ, titlos); the harvester stores it as is. Tesseract/Kraken re-OCR of the PDFs (archive.org/download/<id>/<id>.pdf) is a follow-up if the OCR is too poor for the Lexis/Lexikon entry parsing.',
]

async function main() {
  for (const l of HV4_SKIPPED) decisionNeeded(l)
  const h = new Harvest('hv4', { delayMs: 2000, logEvery: 1 })
  for (const w of HV4_WORKS) {
    if (h.has(w.id)) continue
    const url = `https://archive.org/download/${w.ia}/${encodeURIComponent(w.file)}`
    const { status, res } = await h.get(url, { soft5xx: true })
    if (status !== 200) { h.log(`${w.id}: HTTP ${status}, recorded with status ${status} (delete its index line to retry)`); h.put(`${w.id.replace(':', '_')}.none`, '', [item(w, url, 0, status)]); continue }
    const buf = Buffer.from(await res.arrayBuffer())
    h.put(w.id.replace(':', '_'), buf, [item(w, `https://archive.org/details/${w.ia}`, buf.length, 200)])
  }
  h.finish()
}
export function item(w: Hv4Work, url: string, bytes: number, status: number): IndexItem {
  return { id: w.id, url, date: w.date, licence: w.licence, bytes, status, title: w.title, author: w.author, region: w.region, kind: w.kind, edition: w.edition, ocr: true, iaItem: w.ia, iaFile: w.file }
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/hv4.ts')) await main()
