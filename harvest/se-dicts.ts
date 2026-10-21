/**
 * SPEC 63 SE-10: the historical dictionaries that give dated senses, from archive.org OCR (`<file>_djvu.txt`, resolved through the item's metadata). Resumable (one index line per file, appended only
 * after the file is written, RS-1), pacing 2 s, one harvester at a time (chain it after HV-5: `bash harvest/se-chain.sh`). Usage: tsx harvest/se-dicts.ts
 *
 * `licence` is recorded per item and decides what the build may keep (SE-9): `PD` = the text may be read in full; `©` = only the headword line and ≤ 200-character quotes of a sense with the source.
 * The identifiers were found by an archive.org advancedsearch on 2026-10-21; none of the items states a licence, so the status below is the project's reading of the author's death year.
 */
import { Harvest, type IndexItem } from './lib.ts'

export interface SeDict { id: string; dict: string; licence: string; coverage: string; edition: string; note: string }
const PD_TIM = 'PD: Є. Тимченко † 1948 (автор), видання 1930/1932; OCR archive.org, не вичитано'
export const SE_DICTS: SeDict[] = [
  { id: 'tymch1930', dict: 'timchenko', licence: PD_TIM, coverage: 'цитати XIV–XVIII ст. (цитати датовані)', edition: '1930', note: 'Історичний словник українського язика, т. 1, зошит 1: А—Глу' },
  { id: '1.2.1932', dict: 'timchenko', licence: PD_TIM, coverage: 'цитати XIV–XVIII ст. (цитати датовані)', edition: '1932', note: 'Історичний словник українського язика, т. 1, зошит 2: Глу—Жял (видано лише два зошити)' },
  { id: 'ISUJa', dict: 'timchenko', licence: PD_TIM, coverage: 'цитати XIV–XVIII ст. (цитати датовані)', edition: '1930–1932', note: 'Історичний словник українського язика, друге сканування (2 файли) — для звірки OCR' },
  { id: 'slovnyk33', dict: 'biletsky-nosenko', licence: 'PD: П. Білецький-Носенко † 1856 (текст 1840–1842); видання В. Німчука 1966 — апарат видавця не береться', coverage: 'мова 1840–1842 рр. (надруковано 1966)', edition: '1966 (Німчук)', note: 'Словник української мови, 1840–1842' },
  { id: 'bandurista3', dict: 'zakrevsky', licence: 'PD: М. Закревський † 1871, видання 1861', coverage: 'мова середини XIX ст. (1861)', edition: '1861', note: 'Словарь малороссийских идиомов (Старосветский бандуриста, кн. 3?)' },
  { id: 'SUM-28', dict: 'sum16', licence: '©: НАН України, Інститут українознавства (1994–); у проєкті — лише заголовне слово і цитата ≤ 200 знаків з посиланням', coverage: '1500–1650 (цитати датовані)', edition: '1994–2017 (вип. 1–17)', note: 'Словник української мови XVI – першої половини XVII ст., вип. 1–17' },
  { id: 'SUM-28_2', dict: 'sum16', licence: '©: НАН України, Інститут українознавства; лише заголовне слово і цитата ≤ 200 знаків', coverage: '1500–1650 (цитати датовані)', edition: '2022– (вип. 18–)', note: 'Словник української мови XVI – першої половини XVII ст., вип. 18–' },
  { id: 'kniga1', dict: 'timchenko-materials', licence: '©: видання 2002 (Німчук, Лиса); текст Є. Тимченка † 1948 — PD, апарат видавців ©; лише заголовне слово і цитата ≤ 200 знаків', coverage: 'XV–XVIII ст. (цитати датовані)', edition: '2002', note: 'Матеріали до словника писемної та книжної української мови XV–XVIII ст., кн. 1 А–Н' },
  { id: 'kniga2', dict: 'timchenko-materials', licence: '©: видання 2003 (Німчук, Лиса); лише заголовне слово і цитата ≤ 200 знаків', coverage: 'XV–XVIII ст. (цитати датовані)', edition: '2003', note: 'Матеріали до словника писемної та книжної української мови XV–XVIII ст., кн. 2 О–Я' },
  { id: '1_20230624_20230624', dict: 'shevchenko', licence: '©: Інститут мовознавства ім. О. О. Потебні НАН України 1964; лише заголовне слово і цитата ≤ 200 знаків (цитати з Шевченка датовані за твором)', coverage: 'мова Т. Шевченка, 1837–1861', edition: '1964', note: 'Словник мови Шевченка, т. 1 А–Н' },
  { id: '2_20230624_202306', dict: 'shevchenko', licence: '©: Інститут мовознавства ім. О. О. Потебні НАН України 1964; лише заголовне слово і цитата ≤ 200 знаків', coverage: 'мова Т. Шевченка, 1837–1861', edition: '1964', note: 'Словник мови Шевченка, т. 2 О–Я' },
]

async function main() {
  const h = new Harvest('se-dicts', { delayMs: 2000, logEvery: 1, capBytes: 600_000_000 })
  for (const d of SE_DICTS) {
    if (h.has(d.id)) continue
    const meta = await h.getJson<{ files?: { name: string; format: string; size?: string }[] }>(`https://archive.org/metadata/${d.id}`)
    const txt = (meta.files ?? []).filter(f => f.format === 'DjVuTXT' || /_djvu\.txt$/.test(f.name))
    if (!txt.length) { h.put(`${d.id}.none`, '', [item(d, d.id, 0, 404)]); continue }   // no OCR text: recorded, not refetched
    const parts: IndexItem[] = []
    let all = ''
    for (const f of txt) {
      const { status, res } = await h.get(`https://archive.org/download/${d.id}/${encodeURIComponent(f.name)}`, { soft5xx: true })
      if (status !== 200) { h.log(`${d.id}/${f.name}: HTTP ${status}, retried on the next run`); all = ''; parts.length = 0; break }
      all += `\n\f=== ${f.name} ===\n` + Buffer.from(await res.arrayBuffer()).toString('utf8')
      parts.push(item(d, d.id, 0, 200))
    }
    if (!parts.length) continue
    h.put(d.id, Buffer.from(all, 'utf8'), [item(d, d.id, Buffer.byteLength(all), 200)])
  }
  h.finish()
}
const item = (d: SeDict, id: string, bytes: number, status: number): IndexItem => ({
  id, url: `https://archive.org/details/${d.id}`, date: d.edition.slice(0, 9), licence: d.licence, bytes, status, title: d.note, dict: d.dict, coverage: d.coverage, ocr: true,
})
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/se-dicts.ts')) await main()
