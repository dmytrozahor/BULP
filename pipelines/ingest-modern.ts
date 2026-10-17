/**
 * SPEC 63 MD-2: modern vocabulary → public/data/modern.json + analysis/modern-vocabulary.md (`tsx pipelines/ingest-modern.ts`).
 * Inputs (all fetched politely, research/38): data/work/modern-counts.json (pipelines/modern_count.py: HPLT shard sample + UberText social, vocabulary-only counters),
 * data/raw/wikt-modern/entries.json (pipelines/ingest-modern-wikt.ts). No running text is stored anywhere in the output.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildModern, modernReport, type ModernFile, type RawCounts, type WiktRow } from '../core/modern.ts'
import { writeAtomic } from '../harvest/lib.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const HPLT_SHARD = 'ukr_Cyrl_1/train-00000-of-00300.parquet'

export function renderReport(f: ModernFile): string {
  const years = Object.keys(f.report.perYear).sort(), srcs = ['HPLT', 'UBER', 'WIKT']
  const top = f.entries.filter(e => e.candidate).slice(0, 20)
  return `# Modern vocabulary (SPEC 63 MD-2/MD-3) — generated ${f.generated}

Words per source (distinct word × source): ${srcs.map(s => `${s} ${f.report.perSource[s] ?? 0}`).join(' · ')}. Candidates (absent from VESUM, f ≥ 3, ≥ 2 sources, top ${f.report.candidates}): ${f.report.candidates}; dictionary-labelled: ${f.report.labelled}.
Documents scanned: ${Object.entries(f.report.docs).map(([k, v]) => `${k} ${v}`).join(', ')}.

## Words per first-attestation year and source
Dates: HPLT = crawl month (not publication); WIKT = entry created (not first use); UBER = no date («невідомо»).

| year | ${srcs.join(' | ')} |
|---|${srcs.map(() => '---').join('|')}|
${years.map(y => `| ${y} | ${srcs.map(s => f.report.perYear[y]![s] ?? 0).join(' | ')} |`).join('\n')}

## Top 20 candidates by frequency
| word | f | first (crawl) | LA |
|---|---|---|---|
${top.map(e => `| ${e.w} | ${e.f} | ${e.first ?? '—'} | ${e.loan ? e.loan.ids.join('+') : ''} |`).join('\n')}
`
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const c = JSON.parse(readFileSync(resolve(ROOT, 'data/work/modern-counts.json'), 'utf8')) as { hpltDocs: number; uberLines: number; tokens: RawCounts }
  const wp = resolve(ROOT, 'data/raw/wikt-modern/entries.json')
  const wikt: WiktRow[] = existsSync(wp) ? JSON.parse(readFileSync(wp, 'utf8')) : []
  const today = new Date().toISOString().slice(0, 10)
  const entries = buildModern({ counts: c.tokens, wikt: wikt.map(r => ({ w: r.w, kind: r.kind, cat: r.cat, gloss: r.gloss, created: r.created, url: r.url })), shard: HPLT_SHARD })
  const f: ModernFile = {
    format: 1, generated: today,
    sources: [
      { id: 'HPLT', title: 'HPLT 2.0 cleaned, ukr_Cyrl, ' + HPLT_SHARD + ' (перші ' + c.hpltDocs + ' документів)', url: 'https://huggingface.co/datasets/HPLT/HPLT2.0_cleaned', licence: 'CC0-1.0 (картка набору)', retrieved: today, stored: 'лише слово, лічильник і місяць краулу; тексту й URL немає', sample: `${c.hpltDocs} документів` },
      { id: 'UBER', title: 'UberText 2.0, social (публічні Telegram-канали, TGSearch), перші ' + c.uberLines + ' рядків', url: 'https://lang.org.ua/en/ubertext/', licence: 'на сторінці не вказана; тексти належать авторам дописів', retrieved: today, stored: 'лише слово і лічильник; дат у dump-і немає', sample: `${c.uberLines} рядків` },
      { id: 'WIKT', title: 'Вікісловник (uk.wiktionary): категорії неологізмів, жаргонізмів, інтернет-жаргону, комп’ютерних термінів', url: 'https://uk.wiktionary.org', licence: 'CC BY-SA 4.0', retrieved: today, stored: 'заголовок, категорія, перше значення ≤ 160 знаків, дата створення статті', sample: `${wikt.length} статей` },
    ],
    entries, report: modernReport(entries, { HPLT: c.hpltDocs, UBER: c.uberLines, WIKT: wikt.length }),
  }
  writeAtomic(resolve(ROOT, 'public/data/modern.json'), JSON.stringify(f))
  writeAtomic(resolve(ROOT, 'analysis/modern-vocabulary.md'), renderReport(f))
  console.log(`entries ${entries.length}: candidates ${f.report.candidates}, labelled ${f.report.labelled}`, JSON.stringify(f.report.perSource))
}
