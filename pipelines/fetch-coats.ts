/**
 * SPEC 63 DB-1 (coats of arms on the map): fetch the official coats of arms of Ukrainian oblasts / cities / historical regions from Wikimedia Commons,
 * ONLY under a licence the Commons description page itself states (core/persons.ts licenceOk: public domain, CC0, CC BY, CC BY-SA). Unclear licence => skipped, the map shows a plain marker.
 * Resumable and idempotent: data/coats/SOURCES.json is written atomically after every file and records negatives too (`ok: false, why`); `--redo` asks again.
 * Wikimedia policy: the repo's named User-Agent, NO personal address, one request at a time, >= 1.1 s apart, the MediaWiki API (no scraping).
 * Output: public/coats/<id>.svg (comments, metadata and editor attributes stripped), data/coats/SOURCES.json (file name, page URL, author, licence, size).
 */
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { licenceOk } from '../core/persons.ts'
import { COAT_TARGETS } from '../core/coats.ts'
import { readJson, writeJsonAtomic } from './robust.ts'

const UA = 'BULP-region/1.0 (https://github.com/dmytrozahor/BULP; research, polite)'
const SRC = resolve('data/coats/SOURCES.json'), OUT = resolve('public/coats')
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
async function get(u: string, json = true): Promise<any> {
  for (let a = 0; a < 4; a++) {
    await sleep(1100)
    const r = await fetch(u, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })
    if (r.ok) return json ? r.json() : r.text()
    if (r.status === 429 || r.status >= 500) { await sleep(5000 * (a + 1)); continue }
    throw new Error(`HTTP ${r.status} ${u}`)
  }
  throw new Error('gave up ' + u)
}
const api = (p: Record<string, string>) => get(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ format: 'json', origin: '*', ...p })}`)
const strip = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim()

/** drop what a browser does not need: prolog, comments, metadata, editor namespaces; keep geometry, defs, styles */
export function minifySvg(s: string): string {
  return s.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[\s\S]*?>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '').replace(/<(sodipodi:namedview|inkscape:[a-z-]+|rdf:RDF|cc:Work)\b[\s\S]*?(<\/\1>|\/>)/gi, '')
    .replace(/\s(sodipodi|inkscape|rdf|cc|dc):[a-zA-Z-]+="[^"]*"/g, '').replace(/\sxmlns:(sodipodi|inkscape|rdf|cc|dc)="[^"]*"/g, '')
    .replace(/\sid="(path|rect|g|use|text|defs|svg|linearGradient|radialGradient|stop|clipPath|mask)\d+"(?![^<]*<[^>]*\burl\(#)/g, m => m)   // ids kept: they may be referenced
    .replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim()
}
interface Row { id: string; area: string; level: string; ok: boolean; why?: string; file?: string; page?: string; author?: string; licence?: string; licenceUrl?: string; bytes?: number; rawBytes?: number; checked: string }

/** public/coats/index.json: the usable rows only (the client reads this, ~3 KB; the full record with the negatives stays in data/coats/SOURCES.json) */
export function writeIndex(rows: Record<string, Row>) {
  const ix: Record<string, Row> = {}; for (const [k, r] of Object.entries(rows)) if (r.ok && existsSync(resolve(OUT, k + '.svg'))) ix[k] = r
  writeJsonAtomic(resolve(OUT, 'index.json'), JSON.stringify(ix))
}

const MAX_BYTES = 200_000
async function tryFile(t: { id: string; area: string; level: string }, title: string, discover: boolean, today: string): Promise<Row> {
  const base = { id: t.id, area: t.area, level: t.level, checked: today }
  const r = await api({ action: 'query', titles: title.startsWith('File:') ? title : `File:${title}`, prop: 'imageinfo', iiprop: 'extmetadata|url|size|mime' })
  const ii = Object.values(r.query?.pages ?? {}).map((p: any) => p.imageinfo?.[0]).find(Boolean) as any
  if (!ii) return { ...base, ok: false, why: 'сторінки опису немає: ' + title }
  const m = ii.extmetadata ?? {}, licence = String(m.LicenseShortName?.value ?? ''), author = strip(String(m.Artist?.value ?? '')) || 'автор не вказаний на Commons'
  const common = { ...base, file: title.replace(/^File:/, ''), page: ii.descriptionurl, author: author.slice(0, 200), licence, licenceUrl: String(m.LicenseUrl?.value ?? '') }
  if (discover) return { ...common, ok: false, why: 'лише пошук' }
  if (!licenceOk(licence)) return { ...common, ok: false, why: `ліцензію не підтверджено вільною: «${licence || 'не вказана'}»` }
  if (ii.mime !== 'image/svg+xml') return { ...common, ok: false, why: 'не SVG' }
  const raw: string = await get(ii.url, false), min = minifySvg(raw)
  if (!/<svg[\s>]/.test(min) || /<script|onload=|<foreignObject/i.test(min)) return { ...common, ok: false, why: 'SVG має скрипт або не є SVG' }
  if (/(?:xlink:)?href="https?:/i.test(min)) return { ...common, ok: false, why: 'SVG має зовнішнє посилання' }
  if (min.length > MAX_BYTES) return { ...common, ok: false, why: `завеликий SVG (${Math.round(min.length / 1024)} КБ після стиснення; ліміт ${MAX_BYTES / 1000} КБ)`, rawBytes: raw.length }
  writeJsonAtomic(resolve(OUT, `${t.id}.svg`), min)
  return { ...common, ok: true, bytes: min.length, rawBytes: raw.length }
}

async function main() {
  const rows: Record<string, Row> = existsSync(SRC) ? readJson(SRC) : {}
  const redo = process.argv.includes('--redo'), discover = process.argv.includes('--discover')
  mkdirSync(OUT, { recursive: true })
  const today = new Date().toISOString().slice(0, 10)
  for (const t of COAT_TARGETS) {
    if (!redo && rows[t.id]) continue
    let row: Row = { id: t.id, area: t.area, level: t.level, ok: false, why: 'файл не знайдено на Commons', checked: today }
    try {
      const titles = t.files ?? await (async () => {
        const r = await api({ action: 'query', list: 'search', srsearch: t.query, srnamespace: '6', srlimit: '8' })
        const hits: string[] = (r.query?.search ?? []).map((x: any) => x.title as string)
        if (discover) console.log(t.id, '=>', hits.join(' | '))
        return hits.filter(h => /\.svg$/i.test(h) && t.accept.test(h))
      })()
      for (const title of titles) { row = await tryFile(t, title, discover, today); if (row.ok || discover) break }
    } catch (e) { row = { ...row, ok: false, why: 'збій запиту: ' + String((e as Error).message).slice(0, 80) } }
    if (!discover) { rows[t.id] = row; writeJsonAtomic(SRC, JSON.stringify(rows, null, 1)) }
    console.log(row.ok ? 'OK  ' : 'SKIP', t.id, row.file ?? '', row.licence ?? '', row.why ?? '', row.bytes ?? '')
  }
  if (!discover) {
    for (const f of readdirSync(OUT)) if (f.endsWith('.svg') && !rows[f.slice(0, -4)]?.ok) unlinkSync(resolve(OUT, f))   // a file with no usable row is not served
    writeIndex(rows)
  }
}
if (process.argv[1]?.endsWith('fetch-coats.ts')) main()
