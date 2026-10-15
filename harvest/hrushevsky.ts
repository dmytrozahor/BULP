/**
 * SPEC 63 HV-2 (owner 2026-10-15: «о іще роботи грушевського»): Михайло Грушевський († 1934, public domain) — «Історія української літератури» (6 vols) on izbornyk.org.ua/hrushukr/
 * (robots.txt: only /dos /mac /koi disallowed; windows-1251 pages; pacing 3 s). Volume = first digit of hrushNNN.htm. The other Hrushevsky works come from the generic harvesters:
 * uk.wikisource (wikisource-uk; PD, dated by category) and archive.org (preset archive-hrushevsky: creator Грушевський, publication year ≤ 1934).
 * Dates: first edition of each volume as given by the reference list below (the izbornyk pages themselves state no edition year — flagged `dateBasis: 'reference'`, to be verified);
 * place of edition «Київ» likewise. P-2: the author's own statement is the «Передне слово» of vol. 1 (hrush101.htm) — locator recorded, the quote is taken at ingest/review.
 */
import { Harvest, type IndexItem } from './lib.ts'

const BASE = 'http://izbornyk.org.ua/hrushukr/'
/** volume → first edition year (Грушевський, Історія української літератури, Київ 1923–1927) */
export const FIRST_EDITION: Record<number, string> = { 1: '1923', 2: '1923', 3: '1923', 4: '1925', 5: '1926', 6: '1927' }
export const pageLinks = (html: string) => [...new Set([...html.matchAll(/href="(hrush\d+\.htm)"/g)].map(m => m[1]!))]
export const volumeOf = (file: string) => +(file.match(/^hrush(\d)/)?.[1] ?? 0)
const dec = (b: Buffer) => new TextDecoder('windows-1251').decode(b)
export const pageTitle = (html: string) => (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim()

async function main() {
  const h = new Harvest('hrushevsky', { delayMs: 3000, logEvery: 25 })
  const getPage = async (f: string) => { const { status, res } = await h.get(BASE + f); return { status, buf: status === 200 ? Buffer.from(await res.arrayBuffer()) : Buffer.alloc(0) } }
  const queue: string[] = ['hrushe.htm', ...[1, 2, 3, 4, 5, 6].map(v => `hrush${v}.htm`)]
  const seen = new Set<string>()
  while (queue.length) {
    const f = queue.shift()!
    if (seen.has(f)) continue
    seen.add(f)
    const { status, buf } = await getPage(f)
    const html = dec(buf)
    for (const l of pageLinks(html)) if (!seen.has(l)) queue.push(l)
    if (h.has(`hrushevsky:${f}`) || f === 'hrushe.htm') continue
    const v = volumeOf(f)
    const item: IndexItem = {
      id: `hrushevsky:${f}`, url: BASE + f, date: FIRST_EDITION[v] ?? null, licence: 'PD (М. Грушевський † 1934); сканування й обробка litopys.org.ua / izbornyk.org.ua', bytes: buf.length, status,
      title: `Грушевський, Історія української літератури, т. ${v}: ${pageTitle(html)}`, author: 'Михайло Грушевський', region: 'Київ', volume: v, dateBasis: 'reference', edition: `${FIRST_EDITION[v]}, т. ${v}`,
      p2: 'Передне слово до т. 1 (hrush101.htm): власне свідчення автора, цитату додати',
    }
    h.put(`hrush_${f.replace('.htm', '')}`, buf, [item])
  }
  h.finish()
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/hrushevsky.ts')) await main()
