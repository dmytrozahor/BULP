/**
 * SPEC 63 SE-7: a standalone measurement of the sense inventory from what is on disk, WITHOUT a full build (no VESUM link): the dictionary witnesses data/work/<id>.json (r2u dictionaries,
 * Словник староукраїнської мови XIV–XV ст. split by quotation decade), uk.wiktionary (data/raw/wikt) and en.wiktionary via kaikki (data/raw/kaikki/uk.jsonl). The key of a row is the
 * attested spelling (lk), so the numbers are an approximation of the build stage (which keys rows by the linked lemma); the build prints the exact SE line.
 *   npx tsx pipelines/se-report.ts [root]  → analysis/sense-evolution.md (atomic write)
 */
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { writeJsonAtomic } from './robust.ts'
import { resolve } from 'node:path'
import { dictOfWitness, DICT_COVER, type SeRow } from '../core/se.ts'
import { buildSenseEntries, dictRows, kaikkiRows } from './build-se.ts'
import { collectSenses } from './build-extras.ts'
import { lk } from '../core/cv.ts'

export async function seReport(root: string): Promise<string> {
  const work = resolve(root, 'data/work'), ins: { w: { id: string; tokens: { raw: string; loc: string }[]; witnessType?: string; date: [number, number] } }[] = []
  if (existsSync(work)) for (const f of readdirSync(work).filter(x => /^(r2u_|dsu14_).*\.json$/.test(x) && !x.endsWith('.nlp.json'))) {
    const w = JSON.parse(readFileSync(resolve(work, f), 'utf8')) as { id: string; tokens: { raw: string; loc: string }[]; witnessType?: string; date: [number, number] }
    if (dictOfWitness(w.id)) ins.push({ w })
  }
  const rows = dictRows(ins, (wi, ti) => ins[wi]!.w.tokens[ti]!.raw)
  const dictLemmas = rows.size
  const titles = new Set<string>()
  const wd = resolve(root, 'data/raw/wikt')
  if (existsSync(wd)) for (const f of readdirSync(wd).filter(x => /^senses-.*\.json$/.test(x))) for (const p of (JSON.parse(readFileSync(resolve(wd, f), 'utf8')) as { pages: { title: string }[] }).pages) titles.add(p.title)
  const ws = collectSenses(root, titles)
  const into = rows
  let nWikt = 0
  if (ws) for (const [l, ss] of Object.entries(ws.out)) { const list = into.get(lk(l)) ?? into.set(lk(l), []).get(lk(l))!; for (const s of ss.slice(0, 6)) { list.push({ d: 'wikt.uk', g: s.gloss.slice(0, 160), l: s.source } satisfies SeRow); nWikt++ } }
  const nKaikki = await kaikkiRows(root, () => true, into)   // every kaikki word: the build restricts it to the lemmas that have cards
  const { entries, stats } = buildSenseEntries(into)
  const perWitness = ins.map(i => `| ${i.w.id} | ${dictOfWitness(i.w.id)?.short ?? ''} | ${i.w.tokens.length} |`)
  const out = [
    '# Sense evolution inventory (SPEC 63 SE-7)', '',
    `Generated ${new Date().toISOString().slice(0, 10)} by \`npx tsx pipelines/se-report.ts\`; do not edit. Keys are attested spellings (no VESUM link), so counts are an approximation of the build stage.`, '',
    `- Dictionary witnesses read: ${ins.length}; lemmas with dictionary rows: ${dictLemmas}`,
    `- uk.wiktionary rows: ${nWikt} (${ws?.looked ?? 0} looked-up lemmas); en.wiktionary (kaikki) rows: ${nKaikki}`,
    `- Lemmas with any row: ${stats.lemmas}; rows ${stats.rows}; senses (groups) ${stats.groups}; aligned across dictionaries ${stats.aligned}; transitions ${stats.transitions} (typed by a source ${stats.typed}); lemmas with a historical-dictionary row ${stats.withHistory}`,
    `- Rows per dictionary: ${Object.entries(stats.byDict).map(([d, n]) => `${d} ${n}`).join(', ')}`,
    `- Declared dictionaries not harvested yet: ${DICT_COVER.filter(d => !d.harvested).map(d => d.short).join('; ')}`, '',
    '| witness | dictionary | tokens |', '|---|---|---|', ...perWitness, '',
  ].join('\n')
  void entries
  return out
}

if (process.argv[1] && /se-report\.ts$/.test(process.argv[1])) {
  const root = resolve(process.argv[2] ?? '.')
  seReport(root).then(md => {
    const p = resolve(root, 'analysis/sense-evolution.md'); mkdirSync(resolve(root, 'analysis'), { recursive: true })
    writeJsonAtomic(p, md); console.log(md)   // tmp + rename (RS-1)
  })
}
