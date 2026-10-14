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
import { GAZETTEER } from '../core/autolabel.ts'
import { parsePlastLines, type DialectRow, type PlastEntry, type LiteraryRow, type ProcessRow, type SociolectFile } from '../core/sociolect.ts'
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

export const KROKI_URL = 'https://100krokiv.info/2011/12/tretya-proba-hutirka-dlya-yunatstva-plastove-nazovnytstvo/'
const KROKI_RAW = resolve(ROOT, 'data/raw/plast/100krokiv-nazovnytstvo.html')
const KROKI_LOC = 'М. Дуда, «Гутірка для юнацтва "Пластове назовництво"», 100krokiv.info, 30.12.2011'

/** plain text lines of any page (no section cut) */
export const pageLines = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<(br|\/p|\/li|\/tr|\/h\d|\/div)[^>]*>/g, '\n').replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).split('\n').map(s => s.trim()).filter(Boolean)

/**
 * 100krokiv.info (robots.txt Disallow: / — fetched with the user's explicit permission, research/33 §2). Cite-only; everything is extracted by pattern from the page:
 *  - the numbered «Пластовий словник» list → entries (no gloss on the page: the quote is the listed term);
 *  - «слово/term» + «gloss» pairs in the article → entries with the matched fragment (≤ 160 chars) as the quote;
 *  - dialect statements: «типовим для жителів <Region>» (region → group through the AC gazetteer, core/autolabel.ts) and «від діалектного «X»» (label only, no region stated).
 */
export function parseKroki(lines: string[]): { entries: PlastEntry[]; dialect: DialectRow[] } {
  const entries: PlastEntry[] = [], dialect: DialectRow[] = []
  const list = lines.findIndex(l => l.startsWith('Нижче подаємо список'))
  const body = lines.slice(0, list < 0 ? undefined : list)
  body.forEach((p, i) => {
    const loc = `${KROKI_LOC}, абзац ${i + 1}`
    for (const m of p.matchAll(/«([а-яіїєґ’'-]{3,15})»\s*(?:[–—-]|має значення|означає|то це|є|як)\s*«([^»]{2,80})»/g)) if (m[0].length <= 160) entries.push({ w: m[1]!, g: m[0], k: 'term', loc, s: 'PL100' })
    const reg = /типов\S* для жителів (Над\S+?),/.exec(p), forms = reg ? /приставний \[в\] – ([а-яіїєґ’'-]+),.*?множина – ([а-яіїєґ’'-]+)/.exec(p.slice(reg.index)) : null, head = forms?.[1]
    if (reg && head && forms) {
      const region = reg[1]!, stem = region.toLowerCase().slice(0, 8), gz = GAZETTEER.find(g => decodeURIComponent(g.loc).toLowerCase().includes(stem))
      const quote = p.slice(p.lastIndexOf('Це слово', reg.index), reg.index + forms.index! + forms[0].length)
      const kin = new Set([head, forms[2]!, ...[...p.matchAll(/«([^»]+)»/g)].map(x => x[1]!.toLowerCase()).filter(x => x.startsWith(forms[2]!.slice(0, 4).toLowerCase()))])   // the same stem in the paragraph («вірли», «вірлиця»)
      for (const w of kin) dialect.push({ w, region, group: gz?.group, label: 'діалектне (за дослідженням)', source: 'PL100', loc, quote: quote.slice(0, 160), gaz: gz ? { loc: gz.loc, quote: gz.q } : undefined })
    }
    for (const m of p.matchAll(/«([а-яіїєґ’'-]+)»[^.]{0,40}?\(від діалектного «([а-яіїєґ’'-]+)»/g)) dialect.push({ w: m[1]!, label: 'діал. (корінь)', source: 'PL100', loc, quote: m[0].slice(0, 160) })
  })
  if (list >= 0) for (const l of lines.slice(list + 1)) { const m = /^(\d+)\.\s*(.+)$/.exec(l); if (m) { const w = m[2]!.replace(/[“”"]/g, '').trim(); entries.push({ w, g: w, k: 'term', loc: `Пластовий словник (список), № ${m[1]}`, s: 'PL100' }) } }
  return { entries, dialect }
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
  if (!existsSync(KROKI_RAW)) {   // user allowed despite robots.txt (2026-10-14: «I allow»); pacing ≥ 10 s before the single request
    await new Promise(r => setTimeout(r, 10_000))
    const r = await fetch(KROKI_URL, { headers: { 'User-Agent': 'BULP-ukr-lexicon/0.1 (https://github.com/dmytrozahor/BULP; dmytrozah.dev@gmail.com) plast glossary' } })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    writeFileSync(KROKI_RAW, await r.text())
  }
  const kroki = parseKroki(pageLines(readFileSync(KROKI_RAW, 'utf8')))
  const entries = [...parsePlastLines(htmlLines(readFileSync(RAW, 'utf8'))), ...kroki.entries]
  const literary = await vesumLookup([...new Set([...SL1_WORDS, ...entries.map(e => e.w)])])
  const f: SociolectFile = {
    format: 1, generated: new Date().toISOString().slice(0, 10),
    plast: { source: 'PLSEA', url: PLAST_URL, retrieved: new Date().toISOString().slice(0, 10), licence: '© Пласт Сієтл; лише цитати, без повного тексту', compiler: 'Ярко Запотоцький, 14.05.2021', entries },
    processes: PROCESSES, dialect: kroki.dialect, literary,
  }
  writeFileSync(resolve(ROOT, 'public/data/sociolect.json'), JSON.stringify(f))
  console.log(`plast entries ${entries.length} (abbr ${entries.filter(e => e.k === 'abbr').length}); VESUM present ${literary.filter(l => l.vesum).length}/${literary.length}`)
}
