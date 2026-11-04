/**
 * SPEC 63 HV-2: archive.org OCR texts (public domain by publication date) — advancedsearch + `<id>_djvu.txt`.
 * The text file name is resolved from `https://archive.org/metadata/<id>` (ia-text.ts; `<id>_djvu.txt` is often wrong: 8 672 of 10 000 archive-ukr items were 404), recorded as `iaFile`.
 * SPEC 63 CQ-1 (audit analysis/archive-funnel.md): `--retry-5xx` re-visits ids whose latest line is a 5xx (not the Sejm Kadencja series); `--retry-404 --all` also re-visits 404s that were already retried once;
 *   `--scrape` lists the preset query through the archive.org Scraping API (cursor; https://archive.org/help/aboutsearch.htm) instead of advancedsearch, which cannot go past the first 10,000 hits; state.scrapeCursor makes it resumable, ids already in index.jsonl are skipped.
 * Usage: tsx harvest/archive.ts <preset> [--retry-404]   --retry-404 re-visits only items whose latest index line is status 404 (append-only, a second 404 is marked `retried404`, so a re-run skips it).
 * Neutral User-Agent without an e-mail address, `curl -4`, >= 1.5 s between requests, 403/429 stop, 503 backs off.
 *   (old usage:) tsx harvest/archive.ts <preset>   presets: archive-ukr | archive-rusyn | archive-kuban | archive-novhorod-siversk
 * archive.org robots.txt: only /control/ and /report/ are disallowed; pacing 2 s. PD rule (heuristic, the owner may tighten): publication year ≤ 1925.
 * Index `date` = the item's own year/date; `ocr: true` tells ingest to apply the ia-ocr rules (Cyrillic-only tokens, Russian-letter lines dropped).
 */
import { readFileSync, existsSync } from 'node:fs'
import { Harvest, type IndexItem } from './lib.ts'
import { IA_UA, curlGet, resolveTextFile, retryCandidates, retry5xxCandidates } from './ia-text.ts'

const PD = 'date:[1000-01-01 TO 1925-12-31]'
/** CQ-1 fix 5: the Galician Sejm series (Kadencja ..., Alegata do Sprawozdań Stenograficznych; 6,839 ids of the first 10,000) is Latin-script Polish: not fetched */
export const NOT_SEJM = 'NOT title:(Kadencja OR Alegata OR Sprawozdanie OR Sprawozdania OR Sprawozdań OR Stenograficzne OR Stenograficznych)'
export const ARCHIVE_PRESETS: Record<string, { q: string; region?: string; licence: string }> = {
  'archive-ukr': { q: `mediatype:texts AND language:(ukr OR Ukrainian) AND ${PD} AND ${NOT_SEJM}`, licence: 'PD (publication year ≤ 1925, archive.org OCR, не вичитано)' },
  'archive-rusyn': { q: `mediatype:texts AND (language:(rue OR Rusyn) OR subject:(Rusyn OR русин* OR лемк* OR Lemko OR "Carpatho-Rusyn" OR "Ruthenian")) AND ${PD}`, region: 'русинська (Закарпаття, Пряшівщина, Лемківщина)', licence: 'PD (publication year ≤ 1925, archive.org OCR, не вичитано)' },
  'archive-kuban': { q: `mediatype:texts AND language:(ukr OR Ukrainian) AND (title:(Кубань OR кубан* OR черноморск* OR Kuban) OR subject:(Кубань OR кубан* OR Kuban OR черноморск*)) AND ${PD}`, region: 'Кубань', licence: 'PD (publication year ≤ 1925, archive.org OCR, не вичитано)' },
  'archive-novhorod-siversk': { q: `mediatype:texts AND (title:("Новгород-Сіверськ*" OR "Новгородсіверськ*" OR "Новгородсеверск*" OR "Новгород-Северск*") OR subject:("Новгород-Сіверськ*" OR "Новгород-Северск*")) AND ${PD}`, region: 'Новгород-Сіверщина', licence: 'PD (publication year ≤ 1925, archive.org OCR, не вичитано)' },
}

// owner 2026-10-15 «роботи грушевського»: Грушевський † 1934 → PD; only prints up to 1934 (later editions carry editorial apparatus)
ARCHIVE_PRESETS['archive-hrushevsky'] = { q: 'mediatype:texts AND (creator:(Грушевський OR Грушевскій OR Hrushevsky OR Hrushevsʹkyĭ OR Hruševs*) OR title:(Грушевськ*)) AND date:[1000-01-01 TO 1934-12-31]', region: 'Київ / Львів', licence: 'PD (М. Грушевський † 1934; видання ≤ 1934, archive.org OCR, не вичитано)' }

// SPEC 63 HV-5 (coordinator 2026-10-21, research/45 H1–H5): gaps named by research/45 — Запоріжжя, Волинь, hetman chancery; the АЮЗР volumes; Сумцов, Руданський, Черемшина.
// resource.history.org.ua (АЮЗР scans) disallows all robots, so the volumes come from archive.org. PD = edition year ≤ 1925 (Черемшина † 1927: ≤ 1939, prints of the author's own books).
const HV5_LIC = 'PD (видання ≤ 1925; archive.org OCR, не вичитано)'
ARCHIVE_PRESETS['archive-hv5-gaps'] = { q: 'mediatype:texts AND (title:("Акты, относящиеся к истории Южной и Западной России" OR "Источники для истории запорожских казаков" OR "Документы Богдана Хмельницкого" OR "Письма Мазепы" OR "Универсалы" OR "Архив Коша" OR "История Новой-Сечи" OR "Запорожские песни" OR "Листи Мазепи" OR "Гетманские универсалы") OR creator:(Яворницк* OR Яворницьк* OR Эварницкий OR Evarnitskii)) AND date:[1000-01-01 TO 1925-12-31]', region: 'Запоріжжя / Волинь / гетьманська канцелярія (мішана мова, словник)', licence: HV5_LIC }
ARCHIVE_PRESETS['archive-ayuzr'] = { q: 'mediatype:texts AND (title:("Архив Юго-Западной России" OR "Архив Юго-Западной Россіи" OR "Archiv Jugo-Zapadnoj Rossii" OR "Архів Південно-Західної Росії") OR creator:("Архив Юго-Западной России")) AND date:[1000-01-01 TO 1925-12-31]', region: 'Київ / Волинь / Поділля (мішана мова: АЮЗР)', licence: HV5_LIC }
ARCHIVE_PRESETS['archive-hv5-authors'] = { q: 'mediatype:texts AND (creator:(Сумцов OR Сумцовъ OR Sumtsov OR Руданський OR Руданскій OR Рудаңський OR Rudansky* OR Черемшина OR Cheremshyna) OR title:(Слобожане OR Співомовки OR Руданського OR Черемшини)) AND language:(ukr OR Ukrainian OR "Ukrainian Old") AND date:[1000-01-01 TO 1939-12-31]', licence: 'PD (автор † ≤ 1927; видання за датою на титулі, ≤ 1939; archive.org OCR, не вичитано)' }

export interface SearchDoc { identifier: string; title?: string | string[]; creator?: string | string[]; date?: string; year?: string | number; language?: string | string[] }
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
export function docItem(d: SearchDoc, cfg: { region?: string; licence: string }, bytes: number, status: number): IndexItem {
  const date = (d.date ?? String(d.year ?? '')).slice(0, 10) || null
  return {
    id: d.identifier, url: `https://archive.org/details/${d.identifier}`, date, licence: cfg.licence, bytes, status, title: one(d.title) || d.identifier,
    ...(one(d.creator) ? { author: one(d.creator) } : {}), ...(cfg.region ? { region: cfg.region } : {}), ocr: true, language: one(d.language),
  }
}

const H = { 'user-agent': IA_UA }
const textUrl = (id: string, file: string) => `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(file)}`

/** fetch one item's text via /metadata: payload stored + index line with iaFile; no text file at all stays 404 (index-only line, no refetch) */
async function fetchItem(h: Harvest, d: SearchDoc, cfg: { region?: string; licence: string }, retry: boolean | 'retried5xx'): Promise<void> {
  const { status: ms, file } = await resolveTextFile(h, d.identifier)
  const mark = retry === 'retried5xx' ? { retried5xx: true } : retry ? { retried404: true } : {}
  if (ms !== 200 || !file) { h.put(`${d.identifier}.none`, '', [{ ...docItem(d, cfg, 0, ms === 200 ? 404 : ms), iaFile: '', ...mark }]); return }
  const r = await curlGet(h, textUrl(d.identifier, file))
  if (r.status === 0) return   // transient: no index line, retried on the next run
  if (r.status !== 200) { h.put(`${d.identifier}.none`, '', [{ ...docItem(d, cfg, 0, r.status), iaFile: file, ...mark }]); return }
  h.put(d.identifier, r.buf, [{ ...docItem(d, cfg, r.buf.length, 200), iaFile: file }])
}

/** «retry 404s»: only ids whose latest stored status is 404; the old index line supplies title/author/date/language */
async function retry404(h: Harvest, cfg: { region?: string; licence: string }, mode: { all404?: boolean; fivexx?: boolean } = {}) {
  const lines = existsSync(h.indexPath) ? readFileSync(h.indexPath, 'utf8').split('\n') : []
  const todo = mode.fivexx ? retry5xxCandidates(lines) : retryCandidates(lines, mode.all404)
  h.log(`${mode.fivexx ? 'retry-5xx' : 'retry-404'}: ${todo.length} items`)
  const limit = Number(process.env.RETRY_LIMIT ?? 0)
  let n = 0
  for (const { id, line } of todo) {
    if (limit && n++ >= limit) break
    const d: SearchDoc = { identifier: id, title: line.title as string, creator: line.author as string | undefined, date: (line.date as string | null) ?? undefined, language: line.language as string }
    await fetchItem(h, d, cfg, mode.fivexx ? 'retried5xx' : true)
  }
  h.finish()
}

/** Scraping API page URL: fields comma-separated, count 100-10000, cursor from the previous page */
export function scrapeUrl(q: string, cursor: string | null, count = 1000): string {
  return `https://archive.org/services/search/v1/scrape?q=${encodeURIComponent(q)}&fields=${['identifier', 'title', 'creator', 'date', 'year', 'language'].join(',')}&count=${count}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
}
/** {docs, cursor, total} of a scrape answer; cursor is null on the last page; null when the answer is not a scrape answer */
export function parseScrape(text: string): { docs: SearchDoc[]; cursor: string | null; total: number } | null {
  try { const j = JSON.parse(text) as { items?: SearchDoc[]; cursor?: string; total?: number }; if (!Array.isArray(j.items)) return null; return { docs: j.items, cursor: j.cursor ?? null, total: Number(j.total ?? 0) } } catch { return null }
}

/** CQ-1 fix 4: list the whole query through the Scraping API (no 10,000 limit) and fetch what index.jsonl does not hold yet; resumable through state.scrapeCursor (an expired cursor restarts the listing, finished ids are skipped) */
async function scrape(h: Harvest, cfg: { q: string; region?: string; licence: string }) {
  let st = h.state<{ scrapeCursor: string | null; scrapeDone?: boolean; scraped?: number }>({ scrapeCursor: null })
  if (st.scrapeDone) h.finish()
  for (;;) {
    const { status, text } = await h.getText(scrapeUrl(cfg.q, st.scrapeCursor), { headers: H })
    const r = parseScrape(text)
    if (!r) {
      if (st.scrapeCursor) { h.log(`scrape: no list for the cursor (HTTP ${status}), restarting the listing; done ids are skipped`); st = { scrapeCursor: null }; h.saveState(st); continue }
      return h.stop(`non-JSON scrape answer (HTTP ${status})`)
    }
    if (!st.scraped) h.log(`scrape total ${r.total}, already in the index ${h.count}`)
    let n = 0
    for (const d of r.docs) { if (!h.has(d.identifier)) { await fetchItem(h, d, cfg, false); n++ } }
    st = { scrapeCursor: r.cursor, scraped: (st.scraped ?? 0) + r.docs.length }; h.saveState(st)
    h.log(`scrape page: ${r.docs.length} listed, ${n} fetched, ${st.scraped} listed in all`)
    if (!r.cursor || !r.docs.length) { h.saveState({ ...st, scrapeDone: true }); h.finish() }
  }
}

async function main() {
  const name = process.argv[2] ?? ''
  const cfg = ARCHIVE_PRESETS[name]
  if (!cfg) { console.error(`preset? ${Object.keys(ARCHIVE_PRESETS).join(' | ')}`); process.exit(1) }
  const fast = ['--scrape', '--retry-5xx', '--retry-404'].some(f => process.argv.includes(f))
  const h = new Harvest(name, { delayMs: fast ? 1000 : 2000, logEvery: 25, capBytes: Number(process.env.HARVEST_CAP ?? 8e9) })   // >= 1 s between requests
  if (process.argv.includes('--retry-5xx')) await retry404(h, cfg, { fivexx: true })
  if (process.argv.includes('--retry-404')) await retry404(h, cfg, { all404: process.argv.includes('--all') })
  if (process.argv.includes('--scrape')) await scrape(h, cfg)
  let st = h.state<{ page: number; finished?: boolean }>({ page: 1 })
  if (st.finished) h.finish()
  for (;;) {
    const u = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(cfg.q)}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=date&fl[]=year&fl[]=language&sort[]=identifier+asc&rows=100&page=${st.page}&output=json`
    const { status, text } = await h.getText(u, { headers: H })
    let r: { response?: { docs: SearchDoc[]; numFound: number } }
    try { r = JSON.parse(text) } catch { return h.stop(`non-JSON answer (HTTP ${status}) for ${u}`) }
    const docs = r.response?.docs ?? []
    if (st.page === 1) h.log(`numFound ${r.response?.numFound}`)
    if (!docs.length) { h.saveState({ page: st.page, finished: true }); h.finish() }
    for (const d of docs) { if (!h.has(d.identifier)) await fetchItem(h, d, cfg, false) }
    st = { page: st.page + 1 }; h.saveState(st)
  }
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/archive.ts')) await main()
