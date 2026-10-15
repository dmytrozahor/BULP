/**
 * SPEC 63 HV-2: Old Novgorod (and other) birchbark letters, gramoty.ru/birchbark — COMPARATIVE EAST SLAVIC, NOT Ukrainian (tag `family: 'east-slavic-comparative'`).
 * Terms: robots.txt is absent (404), no scraping prohibition found; the transcriptions are © НИУ ВШЭ / ИСл РАН (footer «© 2023»), so ingest keeps VOCABULARY ONLY.
 * Pacing 3 s. List pages ?page=N give the document links; each document page has the date («Условная дата») and the word-split transcription.
 */
import { Harvest, type IndexItem } from './lib.ts'

const BASE = 'https://gramoty.ru'
export const docLinks = (html: string) => [...new Set([...html.matchAll(/\/birchbark\/document\/show\/([a-z-]+)\/(\d+)\//g)].map(m => `${m[1]}/${m[2]}`))]
const strip = (s: string) => s.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
export function parseDoc(html: string): { city?: string; date?: string; text: string } {
  const field = (label: string) => { const m = html.match(new RegExp(`${label}[\\s\\S]{0,200}?<(?:td|dd|div)[^>]*>\\s*([^<]{2,80})`)); return m ? strip(m[1]!).trim() : undefined }
  const t = html.match(/original-text-wrapper with-spaces">\s*<div class="text-area original-text">([\s\S]*?)<\/div>/)
  return { city: field('Город'), date: field('Условная дата'), text: t ? strip(t[1]!).replace(/[ \t]+/g, ' ').trim() : '' }
}
/** «1380‒1400» → «1380-1400» */
export const normDate = (d?: string) => (d ? d.replace(/[‒–—]/g, '-').trim() : null)

async function main() {
  const h = new Harvest('gramoty', { delayMs: 3000, logEvery: 50 })
  let st = h.state<{ page: number; finished?: boolean }>({ page: 1 })
  if (st.finished) h.finish()
  for (;;) {
    const { text: list } = await h.getText(`${BASE}/birchbark/document/list/?page=${st.page}`)
    const links = docLinks(list)
    if (!links.length) { h.saveState({ page: st.page, finished: true }); h.finish() }
    let fresh = 0
    for (const l of links) {
      const id = `gramoty:${l.replace('/', '-')}`
      if (h.has(id)) continue
      fresh++
      const { status, text } = await h.getText(`${BASE}/birchbark/document/show/${l}/`)
      const d = status === 200 ? parseDoc(text) : { text: '' }
      const item: IndexItem = {
        id, url: `${BASE}/birchbark/document/show/${l}/`, date: normDate((d as any).date), licence: '© НИУ ВШЭ / ИСл РАН (транскрипции); только словарь (vocab-only)', bytes: Buffer.byteLength(d.text), status,
        title: `Берестяна грамота ${l}`, region: ((d as any).city as string | undefined) ?? l.split('/')[0], family: 'east-slavic-comparative', vocabOnly: true, lang: 'orv',
      }
      h.put(`${id.replace(':', '_')}`, JSON.stringify({ id, text: d.text }), [item])
    }
    if (!fresh && st.page > 1 && links.every(l => h.has(`gramoty:${l.replace('/', '-')}`)) && st.page > 400) { h.saveState({ page: st.page, finished: true }); h.finish() }
    st = { page: st.page + 1 }; h.saveState(st)
  }
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/gramoty.ts')) await main()
