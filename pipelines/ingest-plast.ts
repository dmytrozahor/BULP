/**
 * SPEC 63 SL-2 ingest: Plast vocabulary → public/data/sociolect.json (`tsx pipelines/ingest-plast.ts`).
 * Source: «Пластові "Пластологізми" та абревіації», Пласт Сієтл, comp. Ярко Запотоцький, 14.05.2021 (robots.txt allows; © Пласт Сієтл → cite-only:
 * headword + ≤ 1-sentence gloss + locator; the page is cached under data/raw/plast/ and never published). research/33 §2 logs the rejected sources.
 * Also checks every ingested headword and the SL-1 words against VESUM (literary-language status, SL-4).
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'
import { parsePlastLines, type LiteraryRow, type ProcessRow, type SociolectFile } from '../core/sociolect.ts'
import { key } from '../core/text.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const PLAST_URL = 'https://plastseattle.org/plast-101/dictionary/'
const RAW = resolve(ROOT, 'data/raw/plast/plastseattle-dictionary.html'), VESUM = resolve(ROOT, 'data/raw/vesum/dict_corp_vis.txt')
/** SL-1 words (user list) — checked against VESUM whatever their process. */
export const SL1_WORDS = ['всм', 'екстремітет', 'екстреміті', 'аплікейбіліті', 'аплікабіліті']

/** documented processes (research/33 §1): only what a fetched source states; the other SL-1 words have no source found → no row (unknown). */
export const PROCESSES: ProcessRow[] = [
  { w: 'всмысле', kind: 'abbreviation', source: 'FBRU', loc: 'Крылова І., fb.ru, 16.10.2023, «Всмысле или в смысле»', quote: '"Всмысле" - это разговорная аббревиатура от полного выражения "в смысле".', note: 'про російське «всмысле»; для укр. «всм» джерела не знайдено' },
]

/** the page text, one entry per line (script/style removed, block tags → newline, entities decoded) */
export function htmlLines(html: string): string[] {
  const t = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<(br|\/p|\/li|\/tr|\/h\d|\/div)[^>]*>/g, '\n').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&rsquo;/g, '’')
  const lines = t.split('\n').map(s => s.trim()).filter(Boolean)
  const a = lines.findIndex(l => l.startsWith('Впорядкував:')), b = lines.findIndex((l, i) => i > a && l.startsWith('Контакти'))
  return a < 0 ? [] : lines.slice(a + 1, b < 0 ? undefined : b)
}

async function vesumLookup(words: string[]): Promise<LiteraryRow[]> {
  const want = new Map(words.map(w => [key(w), w])), hit = new Map<string, string>()
  if (existsSync(VESUM)) {
    const rl = createInterface({ input: createReadStream(VESUM, 'utf8'), crlfDelay: Infinity })
    for await (const line of rl) { const f = line.trimStart().split(' ')[0]!; const k = key(f); if (want.has(k) && !hit.has(k) && !line.startsWith(' ')) hit.set(k, line.trim()) }
  }
  return words.map(w => ({ w, vesum: hit.get(key(w)) ?? null }))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!existsSync(RAW)) {
    mkdirSync(dirname(RAW), { recursive: true })
    const r = await fetch(PLAST_URL, { headers: { 'User-Agent': 'BULP-ukr-lexicon/0.1 (https://github.com/dmytrozahor/BULP; dmytrozah.dev@gmail.com) plast glossary' } })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    writeFileSync(RAW, await r.text())
  }
  const entries = parsePlastLines(htmlLines(readFileSync(RAW, 'utf8')))
  const literary = await vesumLookup([...new Set([...SL1_WORDS, ...entries.map(e => e.w)])])
  const f: SociolectFile = {
    format: 1, generated: new Date().toISOString().slice(0, 10),
    plast: { source: 'PLSEA', url: PLAST_URL, retrieved: new Date().toISOString().slice(0, 10), licence: '© Пласт Сієтл; лише цитати, без повного тексту', compiler: 'Ярко Запотоцький, 14.05.2021', entries },
    processes: PROCESSES, literary,
  }
  writeFileSync(resolve(ROOT, 'public/data/sociolect.json'), JSON.stringify(f))
  console.log(`plast entries ${entries.length} (abbr ${entries.filter(e => e.k === 'abbr').length}); VESUM present ${literary.filter(l => l.vesum).length}/${literary.length}`)
}
