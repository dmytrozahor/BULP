/**
 * VESUM (dict_uk v6.8.6, `dict_corp_vis.txt`) streaming indexer. SPEC 10 M-3, research/02 §2, research/05 §2, research/08 B1.
 *
 * Visual format (doc/example_indented.txt): a lemma line `lemma TAGS  # comment` at column 0, then its forms indented by two
 * spaces `  form TAGS`. Tags are `:`-separated (`noun:inanim:f:v_rod:alt`); tags are kept VERBATIM — they are the evidence.
 * Non-normative flags (doc/tags.txt, glosses quoted in research/02 §2):
 *   bad «покруч» · subst «нестандартні форма» · slang «сленг та (проф)жаргонізми» · arch «застаріле/архаїчне/(інколи) діалектне»
 *   alt «альтернативне написання (не за чинним правописом)» · short «короткі форми дієслів 3-ї особи, інфінітиви на -ть»
 *   vulg «вульгарне» · obsc «обсценне».
 * Expected lemma counts (research/02): bad 13,898 · slang 4,070 · arch 9,528 · alt 1,465 · vulg 358 · subst 15 (lemma-level).
 * `twisters.lst` (`lemma /flags [:tags]  #> repl1|repl2`) gives the normative replacements for `bad` lemmas.
 * Lookup is by key() (lower case, no stress, one apostrophe); VESUM is lower case except proper names, so that is case-insensitive.
 * Homonymous lemma lines (e.g. two `бар`) are merged under key(lemma); each paradigm form keeps its own tags, so nothing is lost.
 */
import { createReadStream, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'
import type { VesumHit } from '../core/types.ts'
import { key } from '../core/text.ts'
import { lk } from '../core/cv.ts'
import { vesumClass } from '../core/pos-gate.ts'
import { writeAtomic } from '../harvest/lib.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const VESUM_TXT = resolve(ROOT, 'data/raw/vesum/dict_corp_vis.txt')
const TWISTERS_URL = 'https://raw.githubusercontent.com/brown-uk/dict_uk/master/data/dict/twisters.lst'

export const FLAG_TAGS = ['bad', 'subst', 'slang', 'arch', 'short', 'vulg', 'obsc', 'alt'] as const
/** Lists whose every form is exported. Empty: SPEC 20 B-5 exports headword lines only (all forms of subst/slang/short/vulg/obsc measured 17.5 MB vs the 4 MB budget);
 *  corpus-attested forms are added by build.ts. */
const FULL = new Set<string>()
const FLAGS = new Set<string>(FLAG_TAGS)

export interface VesumEntry { lemma: string; lemmaTags: string; form: string; tags: string; head: boolean }
type Lines = AsyncIterable<string> | Iterable<string>

/** Walk a VESUM visual-format stream; calls `cb` for every lemma line (head=true) and every indented form line. */
export async function scanVesum(lines: Lines, cb: (e: VesumEntry) => void): Promise<void> {
  let lemma = '', lemmaTags = ''
  for await (const raw of lines) {
    if (!raw || raw.charCodeAt(0) === 35 /* # */) continue
    const head = raw.charCodeAt(0) !== 32
    const s = head ? raw : raw.trimStart()
    const sp = s.indexOf(' ')
    if (sp <= 0) { if (head) { lemma = s; lemmaTags = ''; cb({ lemma, lemmaTags, form: s, tags: '', head }) } continue }
    const form = s.slice(0, sp)
    let end = s.indexOf(' ', sp + 1); if (end < 0) end = s.length
    const tags = s.slice(sp + 1, end)
    if (head) { lemma = form; lemmaTags = tags }
    cb({ lemma, lemmaTags, form, tags, head })
  }
}

const fileLines = (p = VESUM_TXT): Lines => createInterface({ input: createReadStream(p, { encoding: 'utf8', highWaterMark: 1 << 20 }), crlfDelay: Infinity })
const segs = (tags: string) => tags.split(':')

export interface VesumIndex {
  hits: Map<string, VesumHit[]>
  paradigms: Map<string, { form: string; tags: string }[]>
  lemmaTags: Map<string, string>
}

/** MM-11: of two forms of one cell that differ in exactly one letter, е against і, the one with е (null when they are not such a pair). */
export function ikDoublet(a: string, b: string): string | null {
  if (a.length !== b.length || a === b) return null
  let at = -1
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { if (at >= 0) return null; at = i }
  const x = a[at]!, y = b[at]!
  return x === 'е' && y === 'і' ? a : x === 'і' && y === 'е' ? b : null
}

/** Pure core of vesumIndex over any line source (tests feed fixtures). */
export async function indexLines(lines: Lines, forms: Set<string>, lemmas: Set<string> | Map<string, string>): Promise<VesumIndex> {
  const wantF = new Set([...forms].map(key))
  // FX-3: a Map id → VClass restricts the paradigm/lemmaTags of an id to the lemma line of that POS class (VESUM «да» particle vs «ДА» noun are different lemmas under one key)
  const wantL = new Map<string, string | undefined>((lemmas instanceof Map ? [...lemmas] : [...lemmas].map(l => [l, undefined] as [string, undefined])).map(([l, c]) => [key(l), c]))
  const hits = new Map<string, VesumHit[]>(), paradigms = new Map<string, { form: string; tags: string }[]>(), lemmaTags = new Map<string, string>()
  // a common noun and a proper name share one key (даль / Даль): the capitalised blocks are kept apart and used only when the lemma has no lower-case block (MM-2 preferCommon: proper-name forms never land in a common lemma's cells)
  const capP = new Map<string, { form: string; tags: string }[]>(), capTags = new Map<string, string>(), lowSeen = new Set<string>()
  let lk = '', lWanted = false, cap = false
  // MM-11: forms of the current block by tags, to find the е / і doublet of one cell (the е-form is marked `ik` on its hit, even when it came first)
  let cells = new Map<string, { form: string; hit?: VesumHit }[]>()
  await scanVesum(lines, e => {
    if (e.head) cells = new Map()
    if (e.head) { lk = key(e.lemma); lWanted = wantL.has(lk) && (wantL.get(lk) === undefined || wantL.get(lk) === vesumClass(e.lemmaTags)); cap = /^[A-ZА-ЯІЇЄҐ]/.test(e.lemma); if (lWanted && !cap) lowSeen.add(lk); if (lWanted) { const m = cap ? capTags : lemmaTags; if (!m.has(lk)) m.set(lk, e.lemmaTags) } }
    const fk = key(e.form)
    let mine: VesumHit | undefined
    if (wantF.has(fk)) {
      const a = hits.get(fk) ?? []
      mine = a.find(h => h.lemma === e.lemma && h.tags === e.tags)
      if (!mine) { mine = { lemma: e.lemma, tags: e.tags }; a.push(mine); hits.set(fk, a) }
    }
    if (e.tags) {
      const cell = cells.get(e.tags) ?? []
      cells.set(e.tags, cell)
      for (const o of cell) { const v = ikDoublet(fk, o.form); if (v === fk) { if (mine) mine.ik = 1 } else if (v === o.form && o.hit) o.hit.ik = 1 }
      cell.push({ form: fk, hit: mine })
    }
    if (lWanted) { const m = cap ? capP : paradigms; const a = m.get(lk) ?? []; a.push({ form: e.form, tags: e.tags }); m.set(lk, a) }
  })
  for (const [k, p] of capP) if (!lowSeen.has(k)) { paradigms.set(k, p); lemmaTags.set(k, capTags.get(k)!) }
  return { hits, paradigms, lemmaTags }
}

/** ONE streaming pass over the unpacked VESUM: analyses of `forms` (by key) and full paradigms of `lemmas` (by key). */
export const vesumIndex = (forms: Set<string>, lemmas: Set<string> | Map<string, string>) => indexLines(fileLines(), forms, lemmas)

/** Pure core of lexIndexVesum. Keeps headwords carrying any flag tag, plus all forms carrying a FULL-list tag. */
export async function lexLines(lines: Lines): Promise<Record<string, VesumHit[]>> {
  const out: Record<string, VesumHit[]> = {}
  await scanVesum(lines, e => {
    if (!e.tags) return
    const t = segs(e.tags)
    if (!t.some(x => FLAGS.has(x) && (e.head || FULL.has(x)))) return
    const k = key(e.form), a = out[k] ?? (out[k] = [])
    if (!a.some(h => h.lemma === e.lemma && h.tags === e.tags)) a.push({ lemma: e.lemma, tags: e.tags })
  })
  return out
}
export const lexIndexVesum = () => lexLines(fileLines())

/**
 * SPEC 63 DO-1: every VESUM headword (lemma line) once, keyed by lk(lemma) → [lemma as written, its tags]. Homonyms of one spelling (мати n / v) keep up to three distinct tag
 * strings joined with « | » (the card is one /lw card per word). Pure core over any line source; ~400k entries.
 */
export async function lemmaLines(lines: Lines): Promise<Map<string, [word: string, tags: string]>> {
  const out = new Map<string, [string, string]>()
  await scanVesum(lines, e => {
    if (!e.head || !e.lemma) return
    const k = lk(e.lemma), cur = out.get(k)
    if (!cur) out.set(k, [e.lemma, e.lemmaTags])
    else if (cur[0] === e.lemma || key(cur[0]) === key(e.lemma)) { const t = cur[1].split(' | '); if (e.lemmaTags && !t.includes(e.lemmaTags) && t.length < 3) cur[1] = cur[1] ? cur[1] + ' | ' + e.lemmaTags : e.lemmaTags }
  })
  return out
}
export const vesumLemmaList = () => lemmaLines(fileLines())

/** Count lemma lines / form lines per flag tag (sanity check vs research/02). */
export async function tagStats(lines: Lines = fileLines()) {
  const lem: Record<string, number> = {}, frm: Record<string, number> = {}
  let lemmaLines = 0, formLines = 0
  await scanVesum(lines, e => {
    e.head ? lemmaLines++ : formLines++
    for (const x of new Set(segs(e.tags))) if (FLAGS.has(x) || x === 'err' || x === 'rare' || x === 'coll') { const m = e.head ? lem : frm; m[x] = (m[x] ?? 0) + 1 }
  })
  return { lemmaLines, formLines, lem, frm }
}

// ── twisters.lst ────────────────────────────────────────────────────────────────────────────────
export interface TwisterEntry { repl: string[]; raw: string[] }

/** Parse `lemma /flags [:tags]  #> a|b`; commented-out lines (`# lemma … #> …`) are skipped. */
export function parseTwisters(text: string): Map<string, TwisterEntry> {
  const m = new Map<string, TwisterEntry>()
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const i = line.indexOf('#>')
    if (i < 0) continue
    const lemma = line.trim().split(/\s+/)[0] ?? ''
    const repl = line.slice(i + 2).split('|').map(s => s.trim()).filter(Boolean)
    const e = m.get(lemma) ?? { repl: [], raw: [] }
    for (const r of repl) if (!e.repl.includes(r)) e.repl.push(r)
    e.raw.push(line.trim()); m.set(lemma, e)
  }
  return m
}
async function twistersText(): Promise<string> {
  const p = resolve(ROOT, 'data/raw/vesum/twisters.lst')
  if (!existsSync(p)) {
    const r = await fetch(TWISTERS_URL)
    if (!r.ok) throw new Error(`twisters.lst fetch: ${r.status}`)
    mkdirSync(dirname(p), { recursive: true }); writeAtomic(p, await r.text())
  }
  return readFileSync(p, 'utf8')
}
/** bad lemma → normative replacements (`#>` part). */
export async function twisters(): Promise<Map<string, string[]>> {
  return new Map([...parseTwisters(await twistersText())].map(([k, v]) => [k, v.repl]))
}
/** Same, with the verbatim source line(s) kept as evidence. */
export async function twistersRaw(): Promise<Map<string, TwisterEntry>> { return parseTwisters(await twistersText()) }

// ── CLI ─────────────────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] ?? 'stats'
  const t0 = Date.now()
  if (cmd === 'stats') {
    const s = await tagStats()
    console.log(`lemma lines ${s.lemmaLines}, form lines ${s.formLines}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`)
    console.log('tag      lemma-lines  form-lines   (research/02: bad 13,898 · slang 4,070 · arch 9,528 · alt 1,465 · vulg 358)')
    for (const t of [...FLAG_TAGS, 'err', 'rare', 'coll']) console.log(`${t.padEnd(8)} ${String(s.lem[t] ?? 0).padStart(11)} ${String(s.frm[t] ?? 0).padStart(11)}`)
    const tw = await twisters()
    console.log(`twisters.lst: ${tw.size} lemmas with #> replacements`)
  } else if (cmd === 'lex') {
    const lex = await lexIndexVesum(), json = JSON.stringify(lex)
    const hits = Object.values(lex).reduce((n, a) => n + a.length, 0)
    const perTag: Record<string, number> = {}
    for (const a of Object.values(lex)) for (const h of a) for (const x of new Set(segs(h.tags))) if (FLAGS.has(x)) perTag[x] = (perTag[x] ?? 0) + 1
    console.log(`keys ${Object.keys(lex).length}, hits ${hits}, JSON ${json.length} chars / ${Buffer.byteLength(json)} bytes, ${((Date.now() - t0) / 1000).toFixed(1)} s`)
    console.log(perTag)
    if (process.argv[3]) { mkdirSync(dirname(resolve(process.argv[3])), { recursive: true }); writeAtomic(process.argv[3], json) }
  } else console.log('usage: vesum.ts stats | lex [out.json]')
}
