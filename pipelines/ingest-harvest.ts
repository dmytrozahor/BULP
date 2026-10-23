/**
 * SPEC 63 HV-3: harvested dumps (data/raw/harvest/<source>/ index.jsonl + items/*.gz, written by harvest/*.ts without agents) → witness work files, automatically.
 * `npm run harvest:ingest [-- --only <source>] [-- --limit N] [-- --out <dir>]`   (default out = data/work; a test/sample run passes --out <tmp dir>)
 *
 *  FULL TEXT (public domain by date; one WitnessOut per work, date/licence/author/region from the index, OCR rules of ingest-iaocr.ts, language gate):
 *    wikisource-uk (date = header «рік» or the category «Роботи NNNN»; only pages categorised «Роботи українською мовою»), archive-* (archive.org OCR: Cyrillic-only tokens,
 *    lines with Russian letters/function words dropped as apparatus), hrushevsky (izbornyk, one witness per volume).
 *    Undated works are NOT ingested (counted in the summary) — a made-up date would corrupt first attestations.
 *    hv6 (HV-6, НТШ «Етноґрафічний збірник» / «Матеріали до укр.-руської етнольоґії», archive.org OCR): one witness per record with the region of its own footer (county → region, ISO), recording year, collector;
 *    the whole-volume archive-* witnesses of the same archive.org ids are superseded.
 *    hv5 (HV-5, litopys.org.ua / izbornyk.org.ua pages: Ruthenian texts of the 14th–18th c.; one witness per page, primary-text paragraphs only, Russian-function-word lines dropped but ъ/ѣ kept;
 *    pages that pipelines/manifest.ts already ingests are skipped; the research/44 school travels as WitnessOut.school). archive-hv5-authors (Сумцов, Руданський, Черемшина): archive-* rules.
 *  VOCABULARY ONLY (copyright / share-alike / not Ukrainian): wikipedia-uk, wikipedia-rue, wiktionary-uk, hplt, poets, faust-lukash, gramoty →
 *    <out>/harvest-vocab/<source>.json {source, licence, family, docs, entries:{word:{f,docs,first?,last?}}, items:[{title,author,date,region,tokens,quote}]}. No running text.
 *    gramoty is tagged family «east-slavic-comparative» (not Ukrainian, never counted in N).
 *  r2u pages are read by pipelines/ingest-r2u.ts from data/raw/r2u (the harvester writes there).
 *  Authors: <out>/harvest-authors.json (provisional records whose evidence is the source's own header line); pipelines/authors.ts merges the file when it exists.
 */
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { Q } from '../core/evidence.ts'
import type { Evidence } from '../core/evidence.ts'
import type { TokenRec, WitnessOut } from '../core/types.ts'
import { writeAtomic } from '../harvest/lib.ts'
import { decodeIzbornyk } from '../core/text.ts'
import { pageParagraphs } from './ingest-izbornyk-pages.ts'
import { MARKER } from './ingest-izbornyk.ts'
import { Incr, itemSig, recordSource, sourceUnchanged, vocabSig } from './incr-manifest.ts'

export const HARVEST = process.env.HARVEST_DIR ?? 'data/raw/harvest'
export interface Idx { id: string; url: string; date: string | null; licence: string; bytes: number; status: number; title: string; author?: string; region?: string; file?: string; [k: string]: unknown }

// ── OCR / language-gate rules (same as pipelines/ingest-iaocr.ts) ─────────────────────────────────────
const RU_WORDS = /(^|\s)(что|это|или|который|которы\S*|быть|были|также|только|если|когда)(\s|$)/i
const RU = new RegExp(`[ъѣэЪѢ]|${RU_WORDS.source}`, 'i')
const OK = /^[\p{Script=Cyrillic}\p{M}'’ʼ]+$/u
/** `oldOrth`: the text is Ruthenian/Middle Ukrainian, where ъ ѣ are normal letters — only the Russian function words mark a line as apparatus (HV-5) */
export function textTokens(text: string, loc: string, oldOrth = false): { tokens: TokenRec[]; unmapped: number; apparatus: number } {
  const tokens: TokenRec[] = []; let unmapped = 0, apparatus = 0, s = 0
  const joined: string[] = []
  for (const ln of text.split('\n')) { const prev = joined[joined.length - 1]; if (prev !== undefined && /[\p{L}]-$/u.test(prev)) joined[joined.length - 1] = prev.slice(0, -1) + ln.trim(); else joined.push(ln.trim()) }
  for (const ln of joined) {
    const ws = ln.match(/[\p{L}\p{M}\p{N}'’ʼ]+/gu) ?? []
    if ((oldOrth ? RU_WORDS : RU).test(ln)) { apparatus += ws.length; continue }
    let n = 0
    for (const w of ws) { if (OK.test(w)) { tokens.push({ raw: w, loc, s }); n++ } else unmapped++ }
    if (n) s++
  }
  return { tokens, unmapped, apparatus }
}

/** «1380-1400» → [1380,1400]; «1893», «1893-05-01», «1899-01-01T00:00:00Z» → [1893,1893]; null when the index gives no year */
export function yearRange(d0: unknown): [number, number] | null {
  // archive.org metadata may give a number or a list of dates: take the first plain value (the index states it; nothing is invented)
  const d = Array.isArray(d0) ? String(d0.find(x => x !== null && x !== '') ?? '') : d0 === null || d0 === undefined ? '' : String(d0)
  if (!d) return null
  const r = d.match(/^(\d{4})\s*[-–‒]\s*(\d{4})$/)
  if (r) return [+r[1]!, +r[2]!]
  const y = d.match(/^(\d{4})/)
  return y ? [+y[1]!, +y[1]!] : null
}
const relPath = (u: string) => u.replace(/^https?:\/\/[^/]+\//, '')
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
  for (const ext of ['', '.gz', '.txt.gz']) { if (!ext && !file.endsWith('.gz')) continue; const p = `${HARVEST}/${source}/items/${file}${ext}`; if (existsSync(p)) return gunzipSync(readFileSync(p)) }
  return null
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

/** merge the authors made by authorFor() in this process into <out>/harvest-authors.json (a run with --only, or another ingester such as ingest-rib / ingest-kvitka, must not drop the authors of the others) */
export function mergeHarvestAuthors(out: string) {
  const ap = `${out}/harvest-authors.json`
  const prev: HAuthor[] = existsSync(ap) ? JSON.parse(readFileSync(ap, 'utf8')) : []
  writeAtomic(ap, JSON.stringify([...new Map([...prev, ...authors.values()].map(a => [a.id, a])).values()]))
}

// ── builders ─────────────────────────────────────────────────────────────────────────────────────────
export function witnessFrom(src: string, it: Idx, id: string, text: string, opts: { lang: WitnessOut['lang']; witnessType: string; edition: string; authorId: string; loc: string; dateQuote: string; oldOrth?: boolean; orth?: string; school?: WitnessOut['school'] }): WitnessOut | { skip: string } {
  const date = yearRange(it.date)
  if (!date) return { skip: 'undated' }
  const t = textTokens(text, opts.loc, opts.oldOrth)
  if (t.tokens.length < 20) return { skip: 'too-short' }
  return {
    id, unit: id, title: it.title, author: opts.authorId, url: it.url, date, dateCite: Q(it.url, `harvest/${src}/index.jsonl`, opts.dateQuote.slice(0, 300), 'дата з index.jsonl харвестера (джерело вказує її саме так)'),
    lang: opts.lang, ...(it.region ? { region: it.region } : {}), witnessType: opts.witnessType, edition: opts.edition, ...(opts.orth ? { orth: opts.orth } : {}), ...(opts.school ? { school: opts.school } : {}), license: it.licence,
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
export interface Ctx { /** IN-1: per-source content manifests + cross-source dedupe */ inc: Incr; out: string; limit: number; stride: number; manifestIa: Set<string>; manifestWs: Set<string>; manifestUrls: Set<string>; /** HV-6: archive.org ids whose whole-volume OCR is replaced by per-record witnesses with regions */ hv6Ia?: Set<string> }
interface Sum { source: string; items: number; witnesses: number; tokens: number; skipped: Record<string, number> }
const bump = (s: Sum, k: string) => { s.skipped[k] = (s.skipped[k] ?? 0) + 1 }
const save = (ctx: Ctx, w: WitnessOut) => writeAtomic(`${ctx.out}/${w.id}.json`, JSON.stringify(w))
/** IN-1: write the witness unless another source already holds the same one (id, url or content hash) at an equal or better edition */
function commit(ctx: Ctx, s: Sum, src: string, itemId: string, sig: string, w: WitnessOut) {
  if (ctx.inc.claim(src, itemId, sig, w) === 'skip') { bump(s, 'duplicate'); return }
  save(ctx, w); s.witnesses++; s.tokens += w.tokens.length
}

function runWikisource(ctx: Ctx): Sum {
  const src = 'wikisource-uk', s: Sum = { source: src, items: 0, witnesses: 0, tokens: 0, skipped: {} }
  const idx = readIndex(src).filter(i => i.status === 200)
  const parentYear = new Map<string, string>()   // «Title/sub» inherits the date of «Title» when the subpage has none
  const byFile = new Map<string, Idx[]>()
  for (const it of idx) { (byFile.get(it.file!) ?? byFile.set(it.file!, []).get(it.file!)!).push(it); if (it.date && !it.title.includes('/')) parentYear.set(it.title, it.date) }
  for (const [file, its0] of byFile) {
    const its = its0.filter(it => !ctx.inc.unchanged(src, it.id, itemSig(it)))   // IN-1: a bundle whose items are all unchanged is not opened
    s.skipped['unchanged'] = (s.skipped['unchanged'] ?? 0) + its0.length - its.length
    if (!its.length) continue
    const buf = readItem(src, file); if (!buf) continue
    const rows = new Map(buf.toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as { pageid: number; title: string; text: string; cats: string[] }).map(r => [`${src}:${r.pageid}`, r]))
    for (const it of its) {
      if (ctx.limit && s.items >= ctx.limit) return s
      const r = rows.get(it.id); if (!r) continue
      s.items++
      if (r.cats.length && !r.cats.some(c => /українською/.test(c))) { bump(s, 'not-ukrainian-category'); ctx.inc.skip(src, it.id, itemSig(it), 'not-ukrainian-category'); continue }
      if (ctx.manifestWs.has(r.title.split('/')[0]!)) { bump(s, 'already-in-manifest'); ctx.inc.skip(src, it.id, itemSig(it), 'already-in-manifest'); continue }
      const date = it.date ?? parentYear.get(r.title.split('/')[0]!) ?? null
      const authorId = authorFor(it.author, src, it.url, it.author ? `автор = ${it.author}` : r.title, it.region)
      const w = witnessFrom(src, { ...it, date }, `hv_ws_${it.id.split(':')[1]}`, r.text, { lang: 'uk', witnessType: 'later_ed', edition: 'uk.wikisource (транскрипція за скан-виданням)', authorId, loc: r.title, dateQuote: `рік = ${date}` })
      if ('skip' in w) { bump(s, w.skip); ctx.inc.skip(src, it.id, itemSig(it), w.skip); continue }
      commit(ctx, s, src, it.id, itemSig(it), w)
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
    if (ctx.inc.unchanged(src, it.id, itemSig(it))) { bump(s, 'unchanged'); continue }
    const buf = readItem(src, it.file); if (!buf) continue
    const authorId = authorFor(it.author, src, it.url, it.author ? `creator: ${it.author}` : it.title, it.region)
    const rusyn = src === 'archive-rusyn'
    const w = witnessFrom(src, it, `hv_ia_${slug(it.id)}`, buf.toString('utf8'), { lang: rusyn ? 'undetermined' : 'uk', witnessType: 'ocr', edition: 'OCR archive.org, не вичитано', authorId, loc: `${it.title} (OCR)`, dateQuote: `date: ${it.date}` })
    if ('skip' in w) { bump(s, w.skip); ctx.inc.skip(src, it.id, itemSig(it), w.skip); continue }
    commit(ctx, s, src, it.id, itemSig(it), w)
  }
  return s
}

/** HV-5: litopys.org.ua / izbornyk.org.ua pages (raw windows-1251 html). Only the primary text paragraphs (K1, K2, K4, V1…, Dia) are read — the editors' Prym matter never is. */
function runLitopys(ctx: Ctx, src = 'hv5'): Sum {
  const s: Sum = { source: src, items: 0, witnesses: 0, tokens: 0, skipped: {} }
  for (const it of readIndex(src)) {
    if (ctx.limit && s.items >= ctx.limit) break
    if (it.status !== 200 || !it.file) continue
    s.items++
    const path = relPath(it.url)
    if (ctx.manifestUrls.has(path)) { bump(s, 'already-in-manifest'); continue }
    if (ctx.inc.unchanged(src, it.id, itemSig(it))) { bump(s, 'unchanged'); continue }
    const buf = readItem(src, it.file); if (!buf) continue
    const { paras } = pageParagraphs(decodeIzbornyk(new TextDecoder('windows-1251').decode(buf)))
    const text = paras.map(p => p.replace(MARKER, '')).join('\n')
    const authorId = authorFor(it.author, src, it.url, it.author ? `${it.authorBasis ?? 'заголовок'}: ${it.author}` : it.title, it.region)
    const school = it.school ? { id: String(it.school), source: String(it.schoolSource ?? ''), ...(it.schoolConfidence ? { confidence: String(it.schoolConfidence) } : {}) } : undefined
    const w = witnessFrom(src, it, `hv_lit_${slug(path.replace(/\.htm$/, ''))}`, text, { lang: 'ruthenian', witnessType: String(it.witnessType ?? 'scholarly_ed'), edition: String(it.edition ?? 'litopys.org.ua'), authorId, loc: it.title, dateQuote: String(it.dateQuote ?? it.date), oldOrth: true, orth: String(it.orth ?? ''), school })
    if ('skip' in w) { bump(s, w.skip); ctx.inc.skip(src, it.id, itemSig(it), w.skip); continue }
    commit(ctx, s, src, it.id, itemSig(it), w)
  }
  return s
}

/** HV-6 (harvest/hv6.ts): НТШ «Етноґрафічний збірник» / «Матеріали до українсько-руської етнольоґії», one witness per RECORD. The region, county, recording year and collector are the record's own footer (index line);
 *  the text is the batch file's JSON array entry. Language 'uk' (dialect text), witnessType 'ocr'. The record's tokens go through the OCR / Russian-apparatus gate of textTokens like every archive text. */
function runHv6(ctx: Ctx, src = 'hv6'): Sum {
  const s: Sum = { source: src, items: 0, witnesses: 0, tokens: 0, skipped: {} }
  const byId = new Map<string, Idx>(); for (const it of readIndex(src)) byId.set(it.id, it)   // a re-written volume may repeat lines: the last wins
  const cache = new Map<string, string[]>()
  for (const it of byId.values()) {
    if (ctx.limit && s.items >= ctx.limit) break
    if (it.type === 'volume' || it.status !== 200 || !it.file) continue
    s.items++
    if (ctx.inc.unchanged(src, it.id, itemSig(it))) { bump(s, 'unchanged'); continue }
    let texts = cache.get(it.file); if (!texts) { const b = readItem(src, it.file); if (!b) continue; texts = JSON.parse(b.toString('utf8')) as string[]; cache.set(it.file, texts) }
    const text = texts[Number(it.idx)]; if (typeof text !== 'string') continue
    const authorId = authorFor(it.author, src, it.url, it.author ? `${it.collectorBasis === 'footer' ? 'зап.' : 'укладач тому'}: ${it.author}` : it.title, it.region)
    const w = witnessFrom(src, it, `hv_ez_${slug(String(it.id).replace(/^hv6:/, ''))}`, text, { lang: 'uk', witnessType: 'ocr', edition: `${it.volume}, НТШ Львів (OCR archive.org, не вичитано; місце запису — з примітки запису: ${it.county}, ${it.region})`, authorId, loc: `${it.title} (OCR)`, dateQuote: `${it.dateBasis}; ${it.regionCite}` })
    if ('skip' in w) { bump(s, w.skip); ctx.inc.skip(src, it.id, itemSig(it), w.skip); continue }
    commit(ctx, s, src, it.id, itemSig(it), w)
  }
  return s
}

/** HV-5 originals (harvest/hv5-orig.ts): archive.org OCR of the 19th-c. editions of Величко, Грабянка, Історія Русів; date = accepted composition date (index), the edition year stays in the edition string; editors' Russian apparatus = function-word lines dropped, ъ/ѣ kept. */
function runOrig(ctx: Ctx, src = 'hv5-orig'): Sum {
  const s: Sum = { source: src, items: 0, witnesses: 0, tokens: 0, skipped: {} }
  for (const it of readIndex(src)) {
    if (ctx.limit && s.items >= ctx.limit) break
    if (it.status !== 200 || !it.file) continue
    s.items++
    if (ctx.inc.unchanged(src, it.id, itemSig(it))) { bump(s, 'unchanged'); continue }
    const buf = readItem(src, it.file); if (!buf) continue
    const authorId = authorFor(it.author, src, it.url, it.author ? `заголовок видання: ${it.author}` : it.title, it.region)
    const w = witnessFrom(src, it, `hv_orig_${slug(it.id.split(':')[1] ?? it.id)}`, buf.toString('utf8'), { lang: it.lang === 'undetermined' ? 'undetermined' : 'ruthenian', witnessType: 'later_ed', edition: `${it.edition} (OCR archive.org, не вичитано; дата — загальноприйняте датування твору)`, authorId, loc: `${it.title} (OCR)`, dateQuote: String(it.dateQuote ?? it.date), oldOrth: true })
    if ('skip' in w) { bump(s, w.skip); ctx.inc.skip(src, it.id, itemSig(it), w.skip); continue }
    commit(ctx, s, src, it.id, itemSig(it), w)
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

/** the vocabulary file {...header, entries, items}, written in chunks (tmp + fsync + rename like writeAtomic) so no single string nears V8's limit; the bytes equal JSON.stringify of the same object */
export function writeVocabFile(path: string, header: object, entries: Record<string, VocabEntry>, items: object[]) {
  const tmp = `${path}.${process.pid}.tmp`, fd = openSync(tmp, 'w')
  try {
    const head = JSON.stringify(header); writeSync(fd, head.slice(0, -1) + ',"entries":{')
    let buf: string[] = [], n = 0, first = true
    for (const [w, e] of Object.entries(entries)) {
      buf.push((first ? '' : ',') + JSON.stringify(w) + ':' + JSON.stringify(e)); first = false
      if (++n % 50000 === 0) { writeSync(fd, buf.join('')); buf = [] }
    }
    writeSync(fd, buf.join('') + '},"items":' + JSON.stringify(items) + '}'); fsyncSync(fd)
  } finally { closeSync(fd) }
  renameSync(tmp, path)
}

function runVocab(ctx: Ctx, src: string, family: string): Sum {
  const s: Sum = { source: src, items: 0, witnesses: 0, tokens: 0, skipped: {} }
  const entries: Record<string, VocabEntry> = {}, items: object[] = []
  let licence = ''
  // SPEC 63 GG-4: the wiki dumps are BUNDLES (one items/ file holds ~46 articles and has ~46 index lines). Each bundle is read ONCE (before GG every index line re-read and re-counted its whole bundle:
  // stride 100 read ~37 % of the bundles, some twice, instead of the 1 % it said), and the stride picks every `stride`-th BUNDLE, a true 1/stride sample.
  const wikiLike = src.startsWith('wiki'), bundleNo = new Map<string, number>(), readBundles = new Set<string>()
  let articles = 0
  for (const it of readIndex(src)) {
    if (ctx.limit && s.items >= ctx.limit) break
    if (!it.file || it.status === 204) continue
    if (wikiLike) {
      if (!bundleNo.has(it.file)) bundleNo.set(it.file, bundleNo.size)
      if (readBundles.has(it.file)) continue
      if (src === 'wikipedia-uk' && ctx.stride > 1 && bundleNo.get(it.file)! % ctx.stride !== 0) continue
      readBundles.add(it.file)
    }
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
    if (src === 'user-books' || src === 'hv4') {   // owner-supplied Lukash translations: raw text per part, vocabulary + ≤ 2-line quote only
      const text = buf.toString('utf8'), f = countText(text); addForms(entries, f, null)
      const n = Object.values(f).reduce((a, b) => a + b, 0); s.tokens += n
      const q = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+/).slice(0, 2).join(' ').slice(0, 240)
      items.push({ id: it.id, title: it.title, author: it.author, date: yearRange(it.date), dateBasis: 'source', region: it.region, tokens: n, quote: [q], url: it.url, p2: it.p2, witnessType: it.witnessType })
      continue
    }
    if (src === 'archive-ayuzr' || src === 'archive-hv5-gaps') {   // HV-5: mixed-language volumes (Ukrainian/Ruthenian, Polish, Latin, Russian apparatus), not segmented by document → vocabulary only; Russian function-word lines are dropped
      const kept = buf.toString('utf8').split('\n').filter(l => !RU_WORDS.test(l.trim())).join('\n'), f = countText(kept); addForms(entries, f, null)
      const n = Object.values(f).reduce((a, b) => a + b, 0); s.tokens += n
      items.push({ id: it.id, title: it.title, author: it.author, date: yearRange(it.date), dateBasis: 'volume year of the edition (the documents inside carry their own dates; not segmented yet)', region: it.region, tokens: n, url: it.url })
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
      const f = countText(r.text); addForms(entries, f, ym); s.tokens += Object.values(f).reduce((a, b) => a + b, 0); articles++
    }
  }
  const keep = src.startsWith('wikipedia') ? Object.fromEntries(Object.entries(entries).filter(([, e]) => e.f >= 2)) : entries
  mkdirSync(`${ctx.out}/harvest-vocab`, { recursive: true })
  // GG-4: streamed, never one string: the whole Wikipedia has ~3 M kept types (≈ 350 MB of JSON), close to V8's ~512 MB string limit. The header (docs, tokens) comes first, so nVocab is read without parsing the entries.
  writeVocabFile(`${ctx.out}/harvest-vocab/${src}.json`, { source: src, licence, family, vocabOnly: true, docs: wikiLike ? articles : s.items, tokens: s.tokens }, keep, items)
  s.witnesses = 0
  return s
}

const VOCAB: Record<string, string> = { 'wikipedia-uk': 'uk', 'wikipedia-rue': 'rue', 'wiktionary-uk': 'uk', hplt: 'uk', 'user-books': 'uk', poets: 'uk', 'faust-lukash': 'uk', gramoty: 'east-slavic-comparative', hv4: 'middle-ukrainian-church-slavonic', 'archive-ayuzr': 'middle-ukrainian-mixed', 'archive-hv5-gaps': 'middle-ukrainian-mixed' }
const ARCHIVE = ['archive-ukr', 'archive-rusyn', 'archive-kuban', 'archive-novhorod-siversk', 'archive-hrushevsky', 'archive-hv5-authors']

/** bump when the OCR / language-gate rules above change: every item-level source is then read again */
const ITEM_PARAMS = 'gate1'
export async function main(argv: string[]) {
  const arg = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined }
  const full = argv.includes('--full')
  const ctx: Ctx = { inc: new Incr(arg('--out') ?? 'data/work', full), out: arg('--out') ?? 'data/work', limit: Number(arg('--limit') ?? 0), stride: Number(arg('--wiki-stride') ?? 1), manifestIa: new Set(), manifestWs: new Set(), manifestUrls: new Set() }
  mkdirSync(ctx.out, { recursive: true })
  try {
    const { MANIFEST } = await import('./manifest.ts')
    for (const u of MANIFEST) {
      if (u.kind === 'ia-ocr') for (const url of u.urls) { const m = url.match(/archive\.org\/(?:download|details)\/([^/]+)/); if (m) ctx.manifestIa.add(m[1]!) }
      for (const x of (u as { urls?: string[] }).urls ?? []) ctx.manifestUrls.add(relPath(String(x)))
      if (u.kind === 'wikisource') ctx.manifestWs.add(u.title)
    }
  } catch { /* no manifest in a bare sample run */ }
  // HV-6: archive.org ids with per-record witnesses supersede their whole-volume archive-* witnesses (only volumes that really yielded records)
  ctx.hv6Ia = new Set(readIndex('hv6').filter(i => i.type === 'volume' && i.status === 200 && Number(i.records) > 0).map(i => String(i.id).replace(/^hv6v:/, '')))
  const only = arg('--only')
  const sums: Sum[] = []
  const want = (n: string) => !only || only === n
  // IN-1: item-level sources run through the content manifest (only new/changed items are read; vanished items are removed; overlaps with other sources are skipped)
  const inc = (name: string, fn: () => Sum) => { ctx.inc.begin(name, ITEM_PARAMS); const r = fn(); ctx.inc.finish(name, ctx.limit > 0); return r }
  if (want('wikisource-uk')) sums.push(inc('wikisource-uk', () => runWikisource(ctx)))
  for (const a of ARCHIVE) if (want(a)) sums.push(inc(a, () => runArchive(ctx, a)))
  if (want('hrushevsky')) sums.push(runHrushevsky(ctx))
  if (want('hv5')) sums.push(inc('hv5', () => runLitopys(ctx)))
  if (want('hv5-orig')) sums.push(inc('hv5-orig', () => runOrig(ctx)))
  if (want('hv6')) sums.push(inc('hv6', () => runHv6(ctx)))
  // vocabulary sources are one aggregate each: unchanged index + parameters + existing output = not read at all
  for (const [v, fam] of Object.entries(VOCAB)) if (want(v)) {
    const idxPath = `${HARVEST}/${v}/index.jsonl`, sig = vocabSig(existsSync(idxPath) ? readFileSync(idxPath, 'utf8').split('\n') : [], `${ITEM_PARAMS}|limit=${ctx.limit}|stride=${ctx.stride}`), outFile = `${ctx.out}/harvest-vocab/${v}.json`
    if (sourceUnchanged(ctx.out, v, sig, outFile, full)) { console.log(`[ingest] ${v}: index and parameters unchanged, output kept (not read)`); continue }
    sums.push(runVocab(ctx, v, fam)); recordSource(ctx.out, v, sig)
  }
  mergeHarvestAuthors(ctx.out)
  for (const s of sums) console.log(`${s.source}: ${s.items} items → ${s.witnesses} witnesses, ${s.tokens} tokens${Object.keys(s.skipped).length ? ', skipped ' + JSON.stringify(s.skipped) : ''}`)
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('pipelines/ingest-harvest.ts')) await main(process.argv.slice(2))
