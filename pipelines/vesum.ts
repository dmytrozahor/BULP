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
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'
import type { VesumHit } from '../core/types.ts'
import { key } from '../core/text.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const VESUM_TXT = resolve(ROOT, 'data/raw/vesum/dict_corp_vis.txt')
const TWISTERS_URL = 'https://raw.githubusercontent.com/brown-uk/dict_uk/master/data/dict/twisters.lst'

export const FLAG_TAGS = ['bad', 'subst', 'slang', 'arch', 'short', 'vulg', 'obsc', 'alt'] as const
/** Lists whose every form is exported; the others (bad/arch/alt) export only headwords — browser size budget. */
const FULL = new Set(['subst', 'slang', 'short', 'vulg', 'obsc'])
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

/** Pure core of vesumIndex over any line source (tests feed fixtures). */
export async function indexLines(lines: Lines, forms: Set<string>, lemmas: Set<string>): Promise<VesumIndex> {
  const wantF = new Set([...forms].map(key)), wantL = new Set([...lemmas].map(key))
  const hits = new Map<string, VesumHit[]>(), paradigms = new Map<string, { form: string; tags: string }[]>(), lemmaTags = new Map<string, string>()
  let lk = '', lWanted = false
  await scanVesum(lines, e => {
    if (e.head) { lk = key(e.lemma); lWanted = wantL.has(lk); if (lWanted && !lemmaTags.has(lk)) lemmaTags.set(lk, e.lemmaTags) }
    const fk = key(e.form)
    if (wantF.has(fk)) {
      const a = hits.get(fk) ?? []
      if (!a.some(h => h.lemma === e.lemma && h.tags === e.tags)) { a.push({ lemma: e.lemma, tags: e.tags }); hits.set(fk, a) }
    }
    if (lWanted) { const a = paradigms.get(lk) ?? []; a.push({ form: e.form, tags: e.tags }); paradigms.set(lk, a) }
  })
  return { hits, paradigms, lemmaTags }
}

/** ONE streaming pass over the unpacked VESUM: analyses of `forms` (by key) and full paradigms of `lemmas` (by key). */
export const vesumIndex = (forms: Set<string>, lemmas: Set<string>) => indexLines(fileLines(), forms, lemmas)

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
    mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, await r.text())
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
    if (process.argv[3]) { mkdirSync(dirname(resolve(process.argv[3])), { recursive: true }); writeFileSync(process.argv[3], json) }
  } else console.log('usage: vesum.ts stats | lex [out.json]')
}
