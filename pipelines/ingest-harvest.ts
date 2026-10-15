/**
 * SPEC 63 HV-3: harvested dumps (data/raw/harvest/<source>/ index.jsonl + items/*.gz, written by harvest/*.ts without agents) → witness work files, automatically.
 * `npm run harvest:ingest [-- --only <source>] [-- --limit N] [-- --out <dir>]`   (default out = data/work; a test/sample run passes --out <tmp dir>)
 *
 *  FULL TEXT (public domain by date; one WitnessOut per work, date/licence/author/region from the index, OCR rules of ingest-iaocr.ts, language gate):
 *    wikisource-uk (date = header «рік» or the category «Роботи NNNN»; only pages categorised «Роботи українською мовою»), archive-* (archive.org OCR: Cyrillic-only tokens,
 *    lines with Russian letters/function words dropped as apparatus), hrushevsky (izbornyk, one witness per volume).
 *    Undated works are NOT ingested (counted in the summary) — a made-up date would corrupt first attestations.
 *  VOCABULARY ONLY (copyright / share-alike / not Ukrainian): wikipedia-uk, wikipedia-rue, wiktionary-uk, hplt, poets, faust-lukash, gramoty →
 *    <out>/harvest-vocab/<source>.json {source, licence, family, docs, entries:{word:{f,docs,first?,last?}}, items:[{title,author,date,region,tokens,quote}]}. No running text.
 *    gramoty is tagged family «east-slavic-comparative» (not Ukrainian, never counted in N).
 *  r2u pages are read by pipelines/ingest-r2u.ts from data/raw/r2u (the harvester writes there).
 *  Authors: <out>/harvest-authors.json (provisional records whose evidence is the source's own header line); pipelines/authors.ts merges the file when it exists.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { Q } from '../core/evidence.ts'
import type { Evidence } from '../core/evidence.ts'
import type { TokenRec, WitnessOut } from '../core/types.ts'

export const HARVEST = process.env.HARVEST_DIR ?? 'data/raw/harvest'
export interface Idx { id: string; url: string; date: string | null; licence: string; bytes: number; status: number; title: string; author?: string; region?: string; file?: string; [k: string]: unknown }

// ── OCR / language-gate rules (same as pipelines/ingest-iaocr.ts) ─────────────────────────────────────
const RU = /[ъѣэЪѢ]|(^|\s)(что|это|или|который|которы\S*|быть|были|также|только|если|когда)(\s|$)/i
const OK = /^[\p{Script=Cyrillic}\p{M}'’ʼ]+$/u
export function textTokens(text: string, loc: string): { tokens: TokenRec[]; unmapped: number; apparatus: number } {
  const tokens: TokenRec[] = []; let unmapped = 0, apparatus = 0, s = 0
  const joined: string[] = []
  for (const ln of text.split('\n')) { const prev = joined[joined.length - 1]; if (prev !== undefined && /[\p{L}]-$/u.test(prev)) joined[joined.length - 1] = prev.slice(0, -1) + ln.trim(); else joined.push(ln.trim()) }
  for (const ln of joined) {
    const ws = ln.match(/[\p{L}\p{M}\p{N}'’ʼ]+/gu) ?? []
    if (RU.test(ln)) { apparatus += ws.length; continue }
    let n = 0
    for (const w of ws) { if (OK.test(w)) { tokens.push({ raw: w, loc, s }); n++ } else unmapped++ }
    if (n) s++
  }
  return { tokens, unmapped, apparatus }
}

/** «1380-1400» → [1380,1400]; «1893», «1893-05-01», «1899-01-01T00:00:00Z» → [1893,1893]; null when the index gives no year */
export function yearRange(d: string | null | undefined): [number, number] | null {
  if (!d) return null
  const r = d.match(/^(\d{4})\s*[-–‒]\s*(\d{4})$/)
  if (r) return [+r[1]!, +r[2]!]
  const y = d.match(/^(\d{4})/)
  return y ? [+y[1]!, +y[1]!] : null
}
const slug = (s: string) => s.normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '').toLowerCase().slice(0, 48) || 'x'

// ── reading a harvest dir ────────────────────────────────────────────────────────────────────────────
export function readIndex(source: string): Idx[] {
  const p = `${HARVEST}/${source}/index.jsonl`
  if (!existsSync(p)) return []
  const out: Idx[] = []
  for (const l of readFileSync(p, 'utf8').split('\n')) { if (!l) continue; try { out.push(JSON.parse(l)) } catch { /* torn line */ } }
  return out
}
export function readItem(source: string, file: string): Buffer | null {
  const p = `${HARVEST}/${source}/items/${file}.gz`
  return existsSync(p) ? gunzipSync(readFileSync(p)) : null
}

// ── author records ───────────────────────────────────────────────────────────────────────────────────
export interface HAuthor { id: string; name: string; life: string; label: 'ukrainian' | 'institutional'; status: 'provisional'; confidence: 'implicit'; region?: string; evidence: Evidence[]; note: string }
const authors = new Map<string, HAuthor>()
export function authorFor(name: string | undefined, source: string, url: string, quote: string, region?: string): string {
  const nm = (name ?? '').trim()
  const id = nm ? `hv_${slug(nm)}` : `hv_${source}`
  if (!authors.has(id)) authors.set(id, {
    id, name: nm || `невизначений автор (${source})`, life: 'невідомо', label: nm ? 'ukrainian' : 'institutional', status: 'provisional', confidence: 'implicit', ...(region ? { region } : {}),
    evidence: [Q(url, 'заголовок сторінки джерела', quote.slice(0, 300))], note: 'HV-3: автор взято з заголовка джерела (index.jsonl харвестера); P-2 самоідентифікація — на перевірку',
  })
  return id
}

// ── builders ─────────────────────────────────────────────────────────────────────────────────────────
export function witnessFrom(src: string, it: Idx, id: string, text: string, opts: { lang: WitnessOut['lang']; witnessType: string; edition: string; authorId: string; loc: string; dateQuote: string }): WitnessOut | { skip: string } {
  const date = yearRange(it.date)
  if (!date) return { skip: 'undated' }
  const t = textTokens(text, opts.loc)
  if (t.tokens.length < 20) return { skip: 'too-short' }
  return {
    id, unit: id, title: it.title, author: opts.authorId, url: it.url, date, dateCite: Q(it.url, `harvest/${src}/index.jsonl`, opts.dateQuote.slice(0, 300), 'дата з index.jsonl харвестера (джерело вказує її саме так)'),
    lang: opts.lang, ...(it.region ? { region: it.region } : {}), witnessType: opts.witnessType, edition: opts.edition, license: it.licence,
    dropped: { unmapped: t.unmapped, apparatus: t.apparatus }, tokens: t.tokens,
  }
}

export interface VocabEntry { f: number; docs: number; first?: string; last?: string }
export function addForms(entries: Record<string, VocabEntry>, forms: Record<string, number>, ym?: string | null) {
  for (const [w, n] of Object.entries(forms)) {
    const e = entries[w] ?? (entries[w] = { f: 0, docs: 0 })
    e.f += n; e.docs++
    if (ym) { if (!e.first || ym < e.first) e.first = ym; if (!e.last || ym > e.last) e.last = ym }
  }
}
export function countText(text: string): Record<string, number> {
  const forms: Record<string, number> = {}
  for (const m of text.matchAll(/[\p{Script=Cyrillic}\p{M}'’ʼ-]+/gu)) {
    const w = m[0].replace(/^[-'’ʼ]+|[-'’ʼ]+$/g, '').toLowerCase().normalize('NFC').replace(/[’ʼ]/g, "'")
    if (w.length >= 2 && !/[ыэъё]/.test(w)) forms[w] = (forms[w] ?? 0) + 1
  }
  return forms
}
const htmlText = (h: string) => h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<\/(p|div|li|h\d|tr)>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(+n)).replace(/[ \t]+/g, ' ')

// ── per-source runs ──────────────────────────────────────────────────────────────────────────────────
export interface Ctx { out: string; limit: number; manifestIa: Set<string>; manifestWs: Set<string> }
interface Sum { source: string; items: number; witnesses: number; tokens: number; skipped: Record<string, number> }
const bump = (s: Sum, k: string) => { s.skipped[k] = (s.skipped[k] ?? 0) + 1 }
const save = (ctx: Ctx, w: WitnessOut) => writeFileSync(`${ctx.out}/${w.id}.json`, JSON.stringify(w))

function runWikisource(ctx: Ctx): Sum {
  const src = 'wikisource-uk', s: Sum = { source: src, items: 0, witnesses: 0, tokens: 0, skipped: {} }
  const idx = readIndex(src).filter(i => i.status === 200)
  const parentYear = new Map<string, string>()   // «Title/sub» inherits the date of «Title» when the subpage has none
  const byFile = new Map<string, Idx[]>()
  for (const it of idx) { (byFile.get(it.file!) ?? byFile.set(it.file!, []).get(it.file!)!).push(it); if (it.date && !it.title.includes('/')) parentYear.set(it.title, it.date) }
  for (const [file, its] of byFile) {
    const buf = readItem(src, file); if (!buf) continue
    const rows = new Map(buf.toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as { pageid: number; title: string; text: string; cats: string[] }).map(r => [`${src}:${r.pageid}`, r]))
    for (const it of its) {
      if (ctx.limit && s.items >= ctx.limit) return s
      const r = rows.get(it.id); if (!r) continue
      s.items++
      if (r.cats.length && !r.cats.some(c => /українською/.test(c))) { bump(s, 'not-ukrainian-category'); continue }
      if (ctx.manifestWs.has(r.title.split('/')[0]!)) { bump(s, 'already-in-manifest'); continue }
      const date = it.date ?? parentYear.get(r.title.split('/')[0]!) ?? null
      const authorId = authorFor(it.author, src, it.url, it.author ? `автор = ${it.author}` : r.title, it.region)
      const w = witnessFrom(src, { ...it, date }, `hv_ws_${it.id.split(':')[1]}`, r.text, { lang: 'uk', witnessType: 'later_ed', edition: 'uk.wikisource (транскрипція за скан-виданням)', authorId, loc: r.title, dateQuote: `рік = ${date}` })
      if ('skip' in w) { bump(s, w.skip); continue }
      save(ctx, w); s.witnesses++; s.tokens += w.tokens.length
    }
  }
  return s
}

function runArchive(ctx: Ctx, src: string): Sum {
  const s: Sum = { source: src, items: 0, witnesses: 0, tokens: 0, skipped: {} }
  for (const it of readIndex(src)) {
    if (ctx.limit && s.items >= ctx.limit) break
    if (it.status !== 200 || !it.file) continue
    s.items++
    if (ctx.manifestIa.has(it.id)) { bump(s, 'already-in-manifest'); continue }
    const buf = readItem(src, it.file); if (!buf) continue
    const authorId = authorFor(it.author, src, it.url, it.author ? `creator: ${it.author}` : it.title, it.region)
    const rusyn = src === 'archive-rusyn'
    const w = witnessFrom(src, it, `hv_ia_${slug(it.id)}`, buf.toString('utf8'), { lang: rusyn ? 'undetermined' : 'uk', witnessType: 'ocr', edition: 'OCR archive.org, не вичитано', authorId, loc: `${it.title} (OCR)`, dateQuote: `date: ${it.date}` })
    if ('skip' in w) { bump(s, w.skip); continue }
    save(ctx, w); s.witnesses++; s.tokens += w.tokens.length
  }
  return s
}

function runHrushevsky(ctx: Ctx): Sum {
  const src = 'hrushevsky', s: Sum = { source: src, items: 0, witnesses: 0, tokens: 0, skipped: {} }
  const vols = new Map<number, { it: Idx; text: string }[]>()
  for (const it of readIndex(src)) {
    if (ctx.limit && s.items >= ctx.limit) break
    if (it.status !== 200 || !it.file) continue
    const buf = readItem(src, it.file); if (!buf) continue
    s.items++
    const v = Number(it.volume ?? 0)
    ;(vols.get(v) ?? vols.set(v, []).get(v)!).push({ it, text: htmlText(new TextDecoder('windows-1251').decode(buf)) })
  }
  for (const [v, pages] of vols) {
    const first = pages[0]!.it, authorId = authorFor('Михайло Грушевський', src, first.url, 'Михайло ГРУШЕВСЬКИЙ. ІСТОРІЯ УКРАЇНСЬКОЇ ЛІТЕРАТУРИ', 'Київ')
    const toks: TokenRec[] = []; let unmapped = 0, apparatus = 0, seg = 0
    for (const p of pages) { const t = textTokens(p.text, `т. ${v}, ${p.it.url.split('/').pop()}`); for (const k of t.tokens) toks.push({ ...k, s: k.s + seg }); seg += (t.tokens.at(-1)?.s ?? 0) + 1; unmapped += t.unmapped; apparatus += t.apparatus }
    const date = yearRange(first.date); if (!date) { bump(s, 'undated'); continue }
    const w: WitnessOut = { id: `hv_hrushevsky_t${v}`, unit: `hv_hrushevsky_t${v}`, title: `Грушевський, Історія української літератури, т. ${v}`, author: authorId, url: first.url, date, dateCite: Q(first.url, 'harvest/hrushevsky/index.jsonl', `перше видання т. ${v}: ${first.date} (довідкове, на перевірку)`, 'dateBasis: reference'), lang: 'uk', region: 'Київ', witnessType: 'first_ed', edition: `${first.edition}; текст izbornyk.org.ua`, license: first.licence, dropped: { unmapped, apparatus }, tokens: toks }
    save(ctx, w); s.witnesses++; s.tokens += toks.length
  }
  return s
}

function runVocab(ctx: Ctx, src: string, family: string): Sum {
  const s: Sum = { source: src, items: 0, witnesses: 0, tokens: 0, skipped: {} }
  const entries: Record<string, VocabEntry> = {}, items: object[] = []
  let licence = ''
  for (const it of readIndex(src)) {
    if (ctx.limit && s.items >= ctx.limit) break
    if (!it.file || it.status === 204) continue
    const buf = readItem(src, it.file); if (!buf) continue
    s.items++; licence = it.licence
    const ym = (it.date ?? '').slice(0, 7) || null
    if (src === 'hplt') {
      const j = JSON.parse(buf.toString('utf8')) as { docs: number; tokens: Record<string, [number, string | null, string | null]> }
      for (const [w, [f, a, b]] of Object.entries(j.tokens)) { const e = entries[w] ?? (entries[w] = { f: 0, docs: 0 }); e.f += f; e.docs++; if (a && (!e.first || a < e.first)) e.first = a; if (b && (!e.last || b > e.last)) e.last = b; s.tokens += f }
      items.push({ id: it.id, docs: j.docs, title: it.title }); continue
    }
    if (src === 'poets' || src === 'faust-lukash') {
      const j = JSON.parse(buf.toString('utf8')) as { forms: Record<string, number>; n: number; quote: string[] }
      addForms(entries, j.forms, null); s.tokens += j.n
      const range = yearRange(it.date) ?? (it.debut ? [Number(it.debut), 2026] : null)
      items.push({ id: it.id, title: it.title, author: it.author, date: range, dateBasis: it.date ? 'source' : 'debut-year (poem date not stated)', region: it.region, tokens: j.n, quote: j.quote, url: it.url, p2: it.p2, witnessType: it.witnessType })
      continue
    }
    if (src === 'gramoty') {
      const j = JSON.parse(buf.toString('utf8')) as { text: string }
      const f = countText(j.text); addForms(entries, f, null); s.tokens += Object.values(f).reduce((a, b) => a + b, 0)
      items.push({ id: it.id, title: it.title, date: it.date, region: it.region }); continue
    }
    // wikipedia / wiktionary: JSONL rows
    for (const l of buf.toString('utf8').split('\n')) {
      if (!l) continue
      const r = JSON.parse(l) as { text: string }
      const f = countText(r.text); addForms(entries, f, ym); s.tokens += Object.values(f).reduce((a, b) => a + b, 0)
    }
  }
  const keep = src.startsWith('wikipedia') ? Object.fromEntries(Object.entries(entries).filter(([, e]) => e.f >= 2)) : entries
  mkdirSync(`${ctx.out}/harvest-vocab`, { recursive: true })
  writeFileSync(`${ctx.out}/harvest-vocab/${src}.json`, JSON.stringify({ source: src, licence, family, vocabOnly: true, docs: s.items, tokens: s.tokens, entries: keep, items }))
  s.witnesses = 0
  return s
}

const VOCAB: Record<string, string> = { 'wikipedia-uk': 'uk', 'wikipedia-rue': 'rue', 'wiktionary-uk': 'uk', hplt: 'uk', poets: 'uk', 'faust-lukash': 'uk', gramoty: 'east-slavic-comparative' }
const ARCHIVE = ['archive-ukr', 'archive-rusyn', 'archive-kuban', 'archive-novhorod-siversk', 'archive-hrushevsky']

export async function main(argv: string[]) {
  const arg = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined }
  const ctx: Ctx = { out: arg('--out') ?? 'data/work', limit: Number(arg('--limit') ?? 0), manifestIa: new Set(), manifestWs: new Set() }
  mkdirSync(ctx.out, { recursive: true })
  try {
    const { MANIFEST } = await import('./manifest.ts')
    for (const u of MANIFEST) {
      if (u.kind === 'ia-ocr') for (const url of u.urls) { const m = url.match(/archive\.org\/(?:download|details)\/([^/]+)/); if (m) ctx.manifestIa.add(m[1]!) }
      if (u.kind === 'wikisource') ctx.manifestWs.add(u.title)
    }
  } catch { /* no manifest in a bare sample run */ }
  const only = arg('--only')
  const sums: Sum[] = []
  const want = (n: string) => !only || only === n
  if (want('wikisource-uk')) sums.push(runWikisource(ctx))
  for (const a of ARCHIVE) if (want(a)) sums.push(runArchive(ctx, a))
  if (want('hrushevsky')) sums.push(runHrushevsky(ctx))
  for (const [v, fam] of Object.entries(VOCAB)) if (want(v)) sums.push(runVocab(ctx, v, fam))
  const ap = `${ctx.out}/harvest-authors.json`   // merge: a run with --only must not drop the authors of the other sources
  const prev: HAuthor[] = existsSync(ap) ? JSON.parse(readFileSync(ap, 'utf8')) : []
  writeFileSync(ap, JSON.stringify([...new Map([...prev, ...authors.values()].map(a => [a.id, a])).values()]))
  for (const s of sums) console.log(`${s.source}: ${s.items} items → ${s.witnesses} witnesses, ${s.tokens} tokens${Object.keys(s.skipped).length ? ', skipped ' + JSON.stringify(s.skipped) : ''}`)
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('pipelines/ingest-harvest.ts')) await main(process.argv.slice(2))
