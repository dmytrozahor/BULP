/**
 * SPEC 63 HV-2: MediaWiki harvester (uk.wikisource full texts; uk/rue Wikipedia and Wiktionary for vocabulary only).
 * Usage: tsx harvest/wiki.ts <preset>   presets: wikisource-uk | wikipedia-uk | wikipedia-rue | wiktionary-uk   (rue.wiktionary.org does not exist: Wikimedia Incubator only)
 * Method: list=allpages (ns 0, no redirects) in pages of 500 titles; titles in chunks of 20 → prop=extracts|categories|info (plain text, rendered, so <pages/>
 * transclusions are resolved). One batch file per chunk (JSONL), one index line per page. Pacing 2 s (robots.txt of *.wikimedia.org allows the API; User-Agent identifies us).
 * Date: wikisource = year of the category «Роботи NNNN-ого» (ingest inherits the parent page's for «Title/sub» pages); others = `touched` (a terminus ante quem, dateKind «touched»).
 */
import { Harvest, type IndexItem } from './lib.ts'

export interface Preset { host: string; licence: string; region?: string; vocabOnly: boolean; lang: string; delayMs: number }
export const PRESETS: Record<string, Preset> = {
  'wikisource-uk': { host: 'uk.wikisource.org', licence: 'PD (text by date of the author) / CC BY-SA 4.0 (Wikisource transcription)', vocabOnly: false, lang: 'uk', delayMs: 2000 },
  'wikipedia-uk': { host: 'uk.wikipedia.org', licence: 'CC BY-SA 4.0', vocabOnly: true, lang: 'uk', delayMs: 2000 },
  'wikipedia-rue': { host: 'rue.wikipedia.org', licence: 'CC BY-SA 4.0', region: 'русинська (Закарпаття, Пряшівщина, Лемківщина)', vocabOnly: true, lang: 'rue', delayMs: 2000 },
  'wiktionary-uk': { host: 'uk.wiktionary.org', licence: 'CC BY-SA 4.0', vocabOnly: true, lang: 'uk', delayMs: 2000 },
}

/** year of a Wikisource work from its categories («Категорія:Роботи 1911-ого», «Роботи 1893 року») */
export function yearFromCats(cats: string[]): string | null {
  for (const c of cats) { const m = c.match(/Роботи (\d{4})/); if (m) return m[1]! }
  return null
}
/** «Автор: Леся Українка» in the first lines of an extract, when the page has the header template */
export function authorFromExtract(text: string): string | undefined {
  const m = text.slice(0, 600).match(/(?:^|\n)\s*(?:Автор|Автори)[:\s]+([^\n]{3,80})/)
  return m ? m[1]!.trim() : undefined
}

/** crude wikitext → plain text (vocabulary needs words, not markup): templates, tables, refs, tags, links, bold/italic, headings */
export function wikitextToPlain(w: string): string {
  let t = w.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<(gallery|math|syntaxhighlight|source|nowiki|pre)[^>]*>[\s\S]*?<\/\1>/g, ' ')
  for (let i = 0; i < 6; i++) t = t.replace(/\{\{[^{}]*\}\}/g, ' ')
  t = t.replace(/\{\|[\s\S]*?\|\}/g, ' ').replace(/\[\[(?:Файл|File|Image|Категорія|Category|Зображення):[^\]]*\]\]/gi, ' ')
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[([^\]]*)\]\]/g, '$1').replace(/\[https?:[^\s\]]+\s*([^\]]*)\]/g, '$1')
    .replace(/<\/?(poem|small|big|center|div|span|sup|sub|br|p|u|s|i|b)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/'{2,5}/g, '').replace(/^[=*#:;]+|=+\s*$/gm, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  return t.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
}
/** `<pages index=… />` transclusion pages (Wikisource scans) have no text of their own in the wikitext → the renderer must be asked */
export const needsRender = (w: string) => /<pages\s/.test(w)
/** the {{заголовок | автор = … | рік = … | місто = …}} header template of a Wikisource work page: author, year, place of the edition */
export function headerFields(w: string): { author?: string; year?: string; place?: string } {
  const f = (k: string) => { const m = w.match(new RegExp('\\|\\s*' + k + '\\s*=\\s*([^\\n|}]*)')); return m ? m[1]!.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').trim() || undefined : undefined }
  const y = f('рік')?.match(/\d{4}/)?.[0]
  return { author: f('автор'), year: y, place: f('місто') }
}
/** rendered HTML (action=parse) → plain text: header table, page-number marks and scripts dropped */
export function htmlToPlain(h: string): string {
  return h.replace(/<table class="headertemplate"[\s\S]*?<\/table>/g, ' ').replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<span class="pagenum[^>]*>[\s\S]*?<\/span>/g, ' ')
    .replace(/<\/(p|div|li|dd|dt|h\d)>|<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/&#160;|&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(+n)).replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
}
export interface WikiPage { pageid: number; title: string; extract?: string; revisions?: { slots?: { main?: { '*'?: string; content?: string } } }[]; categories?: { title: string }[]; touched?: string; missing?: string }
export function pageItem(p: WikiPage, preset: Preset, wiki: string): { item: IndexItem; row: object } | null {
  const raw = p.revisions?.[0]?.slots?.main?.['*'] ?? p.revisions?.[0]?.slots?.main?.content
  const text = p.extract ?? (raw ? wikitextToPlain(raw) : '')
  if (!text.trim()) return null
  const cats = (p.categories ?? []).map(c => c.title.replace(/^Категорія:/, 'Категорія:'))
  const ws = !preset.vocabOnly
  const hf = ws && raw ? headerFields(raw) : {}
  const date = ws ? (hf.year ?? yearFromCats(cats)) : (p.touched ?? '').slice(0, 10) || null
  const place = hf.place ?? preset.region
  const item: IndexItem = {
    id: `${wiki}:${p.pageid}`, url: `https://${preset.host}/?curid=${p.pageid}`, date, licence: preset.licence, bytes: Buffer.byteLength(text), status: 200,
    title: p.title, ...(ws ? { author: hf.author ?? authorFromExtract(text) } : {}), ...(place ? { region: place } : {}),
    dateKind: ws ? (hf.year ? 'header' : 'category') : 'touched', vocabOnly: preset.vocabOnly, lang: preset.lang,
  }
  return { item, row: { pageid: p.pageid, title: p.title, text, cats } }
}

async function main() {
  const name = process.argv[2] ?? ''
  const preset = PRESETS[name]
  if (!preset) { console.error(`preset? ${Object.keys(PRESETS).join(' | ')}`); process.exit(1) }
  const h = new Harvest(name, { delayMs: preset.delayMs, logEvery: 100 })
  const api = `https://${preset.host}/w/api.php`
  let st = h.state<{ apcontinue?: string; finished?: boolean }>({})
  if (st.finished) h.finish()
  for (;;) {
    const list = await h.getJson<any>(`${api}?action=query&format=json&list=allpages&apnamespace=0&apfilterredir=nonredirects&aplimit=500${st.apcontinue ? `&apfrom=${encodeURIComponent(st.apcontinue)}` : ''}`)
    const titles: { pageid: number; title: string }[] = list.query?.allpages ?? []
    const fresh = titles.filter(t => !h.has(`${name}:${t.pageid}`))
    for (let i = 0; i < fresh.length; i += 50) {
      const chunk = fresh.slice(i, i + 50)
      const q = await h.getJson<any>(`${api}?action=query&format=json&prop=revisions|categories|info&rvprop=content&rvslots=main&cllimit=max&pageids=${chunk.map(c => c.pageid).join('|')}`)
      const rows: object[] = [], items: IndexItem[] = []
      for (const c of chunk) {
        const p: WikiPage | undefined = q.query?.pages?.[c.pageid]
        const w0 = p?.revisions?.[0]?.slots?.main?.['*'] ?? p?.revisions?.[0]?.slots?.main?.content
        if (p && w0 && needsRender(w0)) {   // Wikisource transclusion page: ask the renderer for this one page (TextExtracts: one full extract per request)
          const e = await h.getJson<any>(`${api}?action=parse&format=json&prop=text&disableeditsection=1&disablelimitreport=1&pageid=${c.pageid}`)
          p.extract = htmlToPlain(e.parse?.text?.['*'] ?? '')
        }
        const r = p ? pageItem(p, preset, name) : null
        if (r) { items.push(r.item); rows.push(r.row) }
        else items.push({ id: `${name}:${c.pageid}`, url: `https://${preset.host}/?curid=${c.pageid}`, date: null, licence: preset.licence, bytes: 0, status: 204, title: c.title })   // empty extract: recorded, not refetched
      }
      h.put(`b${chunk[0]!.pageid}`, rows.map(r => JSON.stringify(r)).join('\n'), items)
    }
    const next = list.continue?.apcontinue as string | undefined
    if (!next) { h.saveState({ finished: true }); h.finish() }
    st = { apcontinue: next }; h.saveState(st)
  }
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/wiki.ts')) await main()
