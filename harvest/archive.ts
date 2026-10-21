/**
 * SPEC 63 HV-2: archive.org OCR texts (public domain by publication date) — advancedsearch + `<id>_djvu.txt`.
 * Usage: tsx harvest/archive.ts <preset>   presets: archive-ukr | archive-rusyn | archive-kuban | archive-novhorod-siversk
 * archive.org robots.txt: only /control/ and /report/ are disallowed; pacing 2 s. PD rule (heuristic, the owner may tighten): publication year ≤ 1925.
 * Index `date` = the item's own year/date; `ocr: true` tells ingest to apply the ia-ocr rules (Cyrillic-only tokens, Russian-letter lines dropped).
 */
import { Harvest, type IndexItem } from './lib.ts'

const PD = 'date:[1000-01-01 TO 1925-12-31]'
export const ARCHIVE_PRESETS: Record<string, { q: string; region?: string; licence: string }> = {
  'archive-ukr': { q: `mediatype:texts AND language:(ukr OR Ukrainian) AND ${PD}`, licence: 'PD (publication year ≤ 1925, archive.org OCR, не вичитано)' },
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

async function main() {
  const name = process.argv[2] ?? ''
  const cfg = ARCHIVE_PRESETS[name]
  if (!cfg) { console.error(`preset? ${Object.keys(ARCHIVE_PRESETS).join(' | ')}`); process.exit(1) }
  const h = new Harvest(name, { delayMs: 2000, logEvery: 25 })
  let st = h.state<{ page: number; finished?: boolean }>({ page: 1 })
  if (st.finished) h.finish()
  for (;;) {
    const u = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(cfg.q)}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=date&fl[]=year&fl[]=language&sort[]=identifier+asc&rows=100&page=${st.page}&output=json`
    const r = await h.getJson<{ response?: { docs: SearchDoc[]; numFound: number } }>(u)
    const docs = r.response?.docs ?? []
    if (st.page === 1) h.log(`numFound ${r.response?.numFound}`)
    if (!docs.length) { h.saveState({ page: st.page, finished: true }); h.finish() }
    for (const d of docs) {
      if (h.has(d.identifier)) continue
      const { status, res } = await h.get(`https://archive.org/download/${d.identifier}/${d.identifier}_djvu.txt`, { soft5xx: true })
      if (status !== 200) { h.put(`${d.identifier}.none`, '', [docItem(d, cfg, 0, status)]); continue }   // no OCR text: recorded, not refetched
      const buf = Buffer.from(await res.arrayBuffer())
      h.put(d.identifier, buf, [docItem(d, cfg, buf.length, 200)])
    }
    st = { page: st.page + 1 }; h.saveState(st)
  }
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/archive.ts')) await main()
