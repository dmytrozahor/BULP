/**
 * Saint Sophia of Kyiv graffiti — catalogue (metadata + IIIF links) AND running-text witnesses (SPEC 60 NW-6 + Amendment 2026-10-12; W11; research/16 §R2.1).
 *
 * > "Public JSON REST API (Django REST Framework), base https://saintsophia.dh.gu.se/api/ ; no key needed … Bulk export is a portal feature:
 * >  its JS pages through inscription/?depth=2 following `next`." — research/16 R2.1
 * > "Licence of TEXT/transcription data and a \"cite as\" statement: not found in API or bundle [U]" — research/16 R2.1
 * > Amendment 2026-10-12 (user: "I need also in scripts of Sophia for text analysis no matter the license"): transcriptions ARE ingested as running text,
 * > each witness carries `licenceNote` and the attribution «Saint Sophia, University of Gothenburg» + the inscription URL.
 *
 * TEXT FIELD CHOSEN (BL-10 follow-up; counts by pipelines/sophia-measure.ts): the ANALYSIS text is the portal's `interpretative_edition` (word-spaced, `(x)` = expanded
 * abbreviation, `[x]` = restored letters) whenever it is present and really is an edition: the editor's prose note «З розбивкою на слова … виглядає таким чином:» yields its first line
 * after the colon, and a modern-Ukrainian rendering (’ or ґ in a pre-1700 inscription) is not an edition. Otherwise the diplomatic `transcription` (HTML; `<br>` = line break, `[x]` = restored
 * letters, `(x)` = expanded abbreviation, `--`/`...` = lacuna) is analysed. The diplomatic text is always kept in the witness (`diplomatic`) for display.
 * PRIVATE-USE GLYPHS: the diplomatic `transcription` encodes abbreviation / supralinear signs in the private-use block U+E000–U+E04C (20 code points; none is documented by the portal —
 * its pages and CSS ship no font mapping, the API has no glyph table — and the romanisation aligned char-by-char gives no single value: U+E01F ↔ n ( ) i space, U+E01E ↔ U+0304). They are
 * therefore NOT mapped; a token containing one is dropped and counted (`dropped.unmapped`, `Ingest.pua`). Continuous (unspaced) diplomatic text: see pipelines/sophia-segment.ts.
 * `epidoc_text` repeats `transcription` in TEI and is not read;
 * `translation_*`, `comments_*` are never read as text. Tokenisation: whitespace words made of letters of ONE script (Cyrillic); tokens touching a lacuna
 * are dropped as incomplete (`dropped.apparatus`); numerals (҂-sign, letters+digits), mixed-script and one-letter non-words are dropped (`dropped.unmapped`).
 * Glagolitic inscriptions: the Cyrillic `interpretative_edition` (else the Latin `romanisation`) is used when the portal gives one and the witness `edition`
 * says so; with no transliteration the Glagolitic letters are kept as tokens and the edition says «глаголиця без транслітерації».
 *
 * LANGUAGE GATE (P-2): `language.text` «Church Slavonic» → chu-rus; «Ukrainian» → ruthenian (date ≤ 1798) or uk; every other stated language (Greek, Latin, Polish,
 * Armenian, Russian, Mixed, …) is excluded with the reason `language:<name>`; an unstated language is excluded (`language-unstated`) unless the script is
 * Glagolitic (Slavic by script). Undated / implausibly dated (outside 1000–1950 or from > to) inscriptions are excluded (WitnessOut.date is mandatory and a
 * fabricated date would corrupt every dating statistic) and counted; an inscription with no usable word is excluded as `no-text`.
 *
 * Usage: `npx tsx pipelines/ingest-sophia.ts` → data/raw/sophia/NNN.json (cache, 300 per page, ≥ 1.1 s apart) → public/data/sophia.json + data/work/sophia-<id>.json.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { D } from '../core/evidence.ts'
import type { TokenRec, WitnessOut } from '../core/types.ts'
import { ATTRIBUTION, LICENCE_NOTE, SOPHIA_API } from './nw-sophia.ts'

export const API = SOPHIA_API
export const PORTAL = 'https://saintsophia.dh.gu.se/'
const UA = { 'user-agent': 'ukr-lexicon-research/0.1 (non-commercial; dmytrozah.dev)' }

export interface SophiaItem {
  id: number; title: string; panel: string; room?: string
  type?: string; lang?: string; script?: string; from?: number; to?: number
  iiif?: string; viewer: string; author?: string
}
export interface SophiaCatalogue {
  generated: string; source: string; api: string; count: number
  licence: { images: string; text: string }
  attribution: string
  items: SophiaItem[]
  /** NW-6 amendment: outcome of the text ingestion (witnesses written / excluded by reason) */
  text?: { field: string; witnesses: number; tokens: number; excluded: Record<string, number> }
}

type Txt = { text?: string } | null | undefined
export const viewerUrl = (panel: string, id: number) => `${PORTAL}viewer/?q=${encodeURIComponent(panel)}/${id}`
/** Pure: one API row (depth=2) → catalogue item. No transcription/translation/comment fields are read. */
export function toItem(r: any): SophiaItem | undefined {
  if (!r || r.published === false || typeof r.id !== 'number') return undefined
  const panel = r.panel?.title ? String(r.panel.title) : ''
  const t = (x: Txt) => x?.text || undefined
  const author = Array.isArray(r.author) ? r.author.map((a: any) => [a.firstname, a.lastname].filter(Boolean).join(' ')).filter(Boolean).join(', ') : ''
  return {
    id: r.id, title: String(r.title ?? ''), panel, ...(r.panel?.room ? { room: String(r.panel.room) } : {}),
    ...(t(r.type_of_inscription) ? { type: t(r.type_of_inscription) } : {}), ...(t(r.language) ? { lang: t(r.language) } : {}), ...(t(r.writing_system) ? { script: t(r.writing_system) } : {}),
    ...(typeof r.min_year === 'number' ? { from: r.min_year } : {}), ...(typeof r.max_year === 'number' ? { to: r.max_year } : {}),
    ...(r.inscription_iiif_url ? { iiif: String(r.inscription_iiif_url) } : {}),
    viewer: viewerUrl(panel, r.id), ...(author ? { author } : {}),
  }
}

export function catalogue(pages: any[][], generated = new Date().toISOString().slice(0, 10)): SophiaCatalogue {
  const seen = new Set<number>()
  const items = pages.flat().map(toItem).filter((x): x is SophiaItem => !!x && !seen.has(x.id) && !!seen.add(x.id)).sort((a, b) => a.id - b.id)
  return {
    generated, source: PORTAL, api: API, count: items.length,
    licence: { images: 'CC BY-NC (type_of_license of the portal image rows, research/16 R2.1)', text: 'не вказано порталом; транскрипції включено для некомерційного аналізу з атрибуцією — рішення власника проєкту 2026-10-12 (licenceNote кожної пам’ятки)' },
    attribution: 'Saint Sophia\'s Inscriptions, University of Gothenburg & НЗ «Софія Київська»; Корпус графіті — В. Корнієнко',
    items,
  }
}

// ── text witnesses ────────────────────────────────────────────────────────────────────────────────
const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', hellip: '…', ndash: '–', mdash: '—' }
/** Pure: portal HTML field → plain text; `<br>` and `</p>` become newlines. */
export function htmlText(h: unknown): string {
  if (typeof h !== 'string') return ''
  return h.replace(/<\s*br\s*\/?>|<\/p\s*>|<\/li\s*>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&(?:#(\d+)|#x([0-9a-f]+)|(\w+));/gi, (m, d, x, n) => d ? String.fromCodePoint(+d) : x ? String.fromCodePoint(parseInt(x, 16)) : ENT[n] ?? m)
    .replace(/\r/g, '')
}

export type Script = 'Cyrillic' | 'Latin' | 'Glagolitic'
const SCRIPT_RE: Record<Script, RegExp> = { Cyrillic: /^\p{Script=Cyrillic}$/u, Latin: /^\p{Script=Latin}$/u, Glagolitic: /^\p{Script=Glagolitic}$/u }
const ONE_LETTER_WORDS = new Set([...'аиядуовзскійо'])   // а и я у в з с о к і й — real one-letter words
const LACUNA = /\[?\(?(?:\.{2,}|…|-{2,}|—{2,})\)?\]?/gu
const LEAD = '\u0001'

/** Private-use / unassigned / replacement code points: glyphs the portal's font encodes and Unicode does not (see the header). */
export const UNMAPPED_GLYPH = /[\p{Co}\p{Cn}�]/u
/** A chunk with at least this many letters between spaces is a candidate for dictionary segmentation (sophia-segment.ts). */
export const SEG_MIN = 12
/** Splits one unspaced chunk into words, or returns undefined when it cannot (every segment must link). */
export type Segmenter = (chunk: string, ctx: { lang: WitnessOut['lang']; oldI: boolean }) => string[] | undefined

export interface Toks { tokens: TokenRec[]; unmapped: number; apparatus: number; pua: number; chunks: number; long: number; failed: number }
/**
 * Pure: plain transcription → word tokens of one script. Lines split at newline and « | »; `s` = line index.
 * `seg` (continuous diplomatic text only): chunks of ≥ SEG_MIN letters are split into words by it; a chunk it cannot split is dropped and counted in `failed`.
 */
export function tokenize(text: string, loc: string, script: Script = 'Cyrillic', seg?: (chunk: string) => string[] | undefined): Toks {
  const out: Toks = { tokens: [], unmapped: 0, apparatus: 0, pua: 0, chunks: 0, long: 0, failed: 0 }
  const ok = SCRIPT_RE[script]
  let s = 0
  for (const line of text.normalize('NFC').split(/\n|\s\|\s/)) {
    let any = false
    for (const chunk of line.replace(LACUNA, LEAD).split(/\s+/)) {
      if (!chunk) continue
      if (chunk.includes(LEAD)) { if (/\p{L}/u.test(chunk)) out.apparatus++; continue }          // word touching a lacuna → incomplete
      if (chunk.includes('҂') || (/\p{N}/u.test(chunk) && /\p{L}/u.test(chunk))) { out.unmapped++; continue }   // ҂-numerals, letters mixed with digits
      const glyph = UNMAPPED_GLYPH.test(chunk)
      const t = chunk.replace(/[\p{P}\p{S}]/gu, '').replace(/[\p{Co}\p{Cn}�]/gu, '')
      const letters = [...t].filter(c => /\p{L}/u.test(c))
      if (!letters.length) continue
      out.chunks++
      const long = letters.length >= SEG_MIN; if (long) out.long++
      if (glyph) { out.unmapped++; out.pua++; if (long && seg) out.failed++; continue }          // unmapped glyph inside the word → the word is dropped, never guessed
      if (!letters.every(c => ok.test(c))) { out.unmapped++; continue }                            // other script / mixed-script word
      if (letters.length === 1 && !ONE_LETTER_WORDS.has(letters[0]!.toLowerCase())) { out.unmapped++; continue }
      if (long && seg) {
        const parts = seg(t)
        if (!parts) { out.failed++; continue }
        for (const p of parts) out.tokens.push({ raw: p, loc, s, method: 'segmentation' })
        any = true; continue
      }
      out.tokens.push({ raw: t, loc, s }); any = true
    }
    if (any) s++
  }
  return out
}

export interface Ingest { witnesses: WitnessOut[]; excluded: Record<string, number>; excludedIds: Record<string, number[]> }

/** Pure: which field/script to read. Glagolitic prefers a Cyrillic, then a Latin transliteration the portal itself gives. */
export function pickText(r: any): { field: 'transcription' | 'interpretative_edition' | 'romanisation'; text: string; script: Script; note?: string } | undefined {
  const tr = htmlText(r.transcription).trim(), ie = htmlText(r.interpretative_edition).trim(), ro = htmlText(r.romanisation).trim()
  const glag = r.writing_system?.text === 'Glagolitic' || /\p{Script=Glagolitic}/u.test(tr)
  if (glag) {
    if (/\p{Script=Cyrillic}/u.test(ie)) return { field: 'interpretative_edition', text: ie, script: 'Cyrillic', note: 'глаголиця, кирилична транслітерація порталу' }
    if (/\p{Script=Latin}/u.test(ro)) return { field: 'romanisation', text: ro, script: 'Latin', note: 'глаголиця, латинська транслітерація порталу' }
    return tr ? { field: 'transcription', text: tr, script: 'Glagolitic', note: 'глаголиця без транслітерації' } : undefined
  }
  const ed = usableEdition(ie, r.max_year)
  if (ed) return { field: 'interpretative_edition', text: ed, script: 'Cyrillic', note: tr ? 'прочитання порталу зі словорозділом; діпломатична транскрипція збережена для показу' : 'нормалізоване прочитання (транскрипція порожня)' }
  return tr ? { field: 'transcription', text: tr, script: 'Cyrillic' } : undefined
}

/** Pure: the `interpretative_edition` text that can be analysed, or '' (empty, no Cyrillic, or not an edition: a modern-Ukrainian rendering with ’/ґ in a pre-1700 inscription). */
export function usableEdition(ie: string, to?: number): string {
  let e = ie
  if (/розбивк|відновленн/.test(e)) {               // the editor's note «З розбивкою на слова … текст виглядає таким чином:» + the edition on its first line
    const after = e.split('виглядає таким чином:')[1]
    e = after ? after.split('\n').map(x => x.trim()).find(Boolean) ?? '' : ''
  }
  if (!/\p{Script=Cyrillic}/u.test(e)) return ''
  if (/[’ʼґ]/.test(e) && (to ?? 3000) <= 1700) return ''
  return e
}

/** Pure: API rows → witnesses + exclusion counts (see the header for the gates). */
export function ingestRows(rows: any[], opts: { segmenter?: Segmenter } = {}): Ingest {
  const witnesses: WitnessOut[] = [], excluded: Record<string, number> = {}, excludedIds: Record<string, number[]> = {}
  const skip = (why: string, id: number) => { excluded[why] = (excluded[why] ?? 0) + 1; (excludedIds[why] ??= []).push(id) }
  const seen = new Set<number>()
  for (const r of rows) {
    if (!r || r.published === false || typeof r.id !== 'number' || seen.has(r.id)) continue
    seen.add(r.id)
    const langName: string | undefined = r.language?.text || undefined
    const glagolitic = r.writing_system?.text === 'Glagolitic'
    const unstated = !langName || langName === 'N/A'
    if (!unstated && langName !== 'Church Slavonic' && langName !== 'Ukrainian') { skip(`language:${langName}`, r.id); continue }
    const from = r.min_year, to = r.max_year
    if (typeof from !== 'number' || typeof to !== 'number') { skip('undated', r.id); continue }
    if (from > to || from < 1000 || to > 1950) { skip('bad-date', r.id); continue }
    const pick = pickText(r)
    if (unstated && !glagolitic && pick?.script !== 'Cyrillic') { skip('language-unstated', r.id); continue }   // BL-10: unstated language kept only for Cyrillic text
    const panel = r.panel?.title ? String(r.panel.title) : ''
    const loc = `${panel}/${r.id}`
    const lang: WitnessOut['lang'] = unstated && !glagolitic ? 'undetermined' : langName === 'Ukrainian' ? (to <= 1798 ? 'ruthenian' : 'uk') : 'chu-rus'
    let tk = pick ? tokenize(pick.text, loc, pick.script) : undefined
    let segmented = false
    // Continuous diplomatic text (no word spacing: most letters sit in chunks of ≥ SEG_MIN letters): analysed only after dictionary segmentation where EVERY segment links
    // (sophia-segment.ts, P-1.7: such tokens carry method 'segmentation'); otherwise the inscription is display-only (portal image/IIIF in the catalogue, no statistics).
    if (pick && tk && pick.field === 'transcription' && pick.script === 'Cyrillic' && tk.long > 0 && tk.long * 2 >= tk.chunks) {
      const sg = opts.segmenter, oldI = to <= 1400
      const t2 = tokenize(pick.text, loc, pick.script, c => sg?.(c, { lang, oldI }))
      if (t2.failed) { skip('display-only', r.id); continue }
      tk = t2; segmented = true
    }
    if (!pick || !tk || !tk.tokens.length) { skip('no-text', r.id); continue }
    const dipl = htmlText(r.transcription).replace(/\n{2,}/g, '\n').trim()
    const url = viewerUrl(panel, r.id)
    const crit = Array.isArray(r.dating_criteria) ? r.dating_criteria.map((c: any) => c?.text).filter(Boolean).join(', ') : ''
    const iiif = r.inscription_iiif_url ? String(r.inscription_iiif_url) : ''
    const title = `Графіті Софії Київської ${loc}`
    witnesses.push({
      id: `sophia-${r.id}`, unit: 'sophia', title, author: 'sophia_graffiti', url,
      date: [from, to], dateCite: D('SOPHIA', url, `min_year ${from}, max_year ${to}`, `датування порталу${crit ? ' (критерії: ' + crit + ')' : ''}`),
      lang, region: 'Київ',
      witnessType: 'autograph', edition: `${ATTRIBUTION}; поле «${pick.field}»${pick.note ? '; ' + pick.note : ''}${segmented ? '; безпробільна діпломатична транскрипція, слова виділено словниковою сегментацією (method: segmentation)' : ''}`,
      ...(dipl ? { diplomatic: dipl } : {}),
      ...(to <= 1400 ? { oldI: true } : {}), license: 'не вказано порталом', licenceNote: LICENCE_NOTE,
      ...(iiif ? { media: { kind: 'iiif' as const, url: iiif, attribution: ATTRIBUTION, licence: 'зображення CC BY-NC', title } } : {}),
      dropped: { unmapped: tk.unmapped, apparatus: tk.apparatus }, tokens: tk.tokens,
    })
  }
  witnesses.sort((a, b) => Number(a.id.slice(7)) - Number(b.id.slice(7)))
  return { witnesses, excluded, excludedIds }
}

async function main() {
  const dir = 'data/raw/sophia'
  mkdirSync(dir, { recursive: true })
  const LIMIT = 300
  for (let off = 0, n = 0, total = Infinity; off < total; off += LIMIT, n++) {
    const f = `${dir}/${String(n).padStart(3, '0')}.json`
    if (!existsSync(f)) {
      const res = await fetch(`${API}?depth=2&limit=${LIMIT}&offset=${off}`, { headers: UA })
      if (!res.ok) throw new Error(`sophia ${res.status} at offset ${off}`)
      writeFileSync(f, Buffer.from(await res.arrayBuffer()))
      console.log(`✓ offset ${off}`)
      await new Promise(r => setTimeout(r, 1100))
    }
    total = JSON.parse(readFileSync(f, 'utf8')).count
  }
  const pages = readdirSync(dir).filter(n => /^\d{3}\.json$/.test(n)).sort().map(n => JSON.parse(readFileSync(`${dir}/${n}`, 'utf8')).results as any[])
  const cat = catalogue(pages)
  const ing = ingestRows(pages.flat())
  cat.text = { field: 'transcription (fallback interpretative_edition; Glagolitic → portal transliteration)', witnesses: ing.witnesses.length, tokens: ing.witnesses.reduce((s, w) => s + w.tokens.length, 0), excluded: ing.excluded }
  mkdirSync('public/data', { recursive: true })
  writeFileSync('public/data/sophia.json', JSON.stringify(cat))
  mkdirSync('data/work', { recursive: true })
  for (const f of readdirSync('data/work')) if (/^sophia-\d+(\.nlp)?\.json$/.test(f)) rmSync(`data/work/${f}`)
  for (const w of ing.witnesses) writeFileSync(`data/work/${w.id}.json`, JSON.stringify(w))
  console.log(`sophia: ${cat.count} inscriptions → public/data/sophia.json; ${cat.text.witnesses} witnesses, ${cat.text.tokens} tokens → data/work/sophia-*.json; excluded ${JSON.stringify(ing.excluded)}`)
}
if (process.argv[1]?.endsWith('ingest-sophia.ts')) await main()
