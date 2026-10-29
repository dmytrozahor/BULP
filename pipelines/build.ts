/**
 * BUILD stage (SPEC 20): data/work/*.json (+ .nlp.json, stress.json, ru.json) → public/data/{corpus,lexicon,lexindex}.json + analysis/REPORT.md.
 * `npm run build:data` · flags: --no-py (reuse existing stress.json/ru.json instead of running the Python scripts).
 *
 * > P-1.1 "Every label the system emits is a Claim = { value, evidence } with evidence.length ≥ 1." — every label below comes from claim()
 * > M-3.3 "Unlinked tokens are kept as unresolved and counted; nothing is guessed."
 * > B-5  "lexicon.json: lemmas with f ≥ 2 or with ≥1 pre-1400 attestation; ≤ 6 KWIC per FormCard, ≤ 12 FormCards per lemma." + amendment 2026-10-11: core lexicon.json ≤ 15 MiB holds ALL of them, per-lemma detail in lex/<bucket>.json shards.
 *
 * Passes over VESUM (7M lines, ~15 s each): (1) every candidate form/lemma of every token type; (2) paradigms of the kept lemmas plus every key
 * detect() asks for (found by a dry run) — so rule evaluation never needs a third lookup. (3) lexIndexVesum for lexindex.json.
 */
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { claim, D, isKnown, unknown, type Claim, type Evidence } from '../core/evidence.ts'
import { derive as deriveRaw, ruleById, type Derivation } from '../core/phonology.ts'
import { fold as foldRaw } from '../core/orthography.ts'
import { assignEpoch, epochById } from '../core/epochs.ts'
import { key } from '../core/text.ts'
import { RUSYN_STATUS } from '../core/rules.ts'
import { REGIONS, regionOf } from './regions.ts'
import { fillWitnessRegions } from './witness-region.ts'
import { ruOfWitness } from '../core/ru-source.ts'
import type { Author, CorpusMeta, FormCard, Kwic, LemmaCard, LemmaDetail, LexIndex, VesumHit, WitnessMeta, WitnessOut } from '../core/types.ts'
import { packCore } from '../core/pack.ts'
import { bucketOf, packShard, splitCard, splitDetail } from '../core/shard.ts'
import { AUTHORS, authorById } from './authors.ts'
import { ocrQuality, oqFlag, spellingDateStep, type OqResult } from '../core/ocr-quality.ts'
import { writeDim } from './build-dim.ts'
import { attachDictModern } from './build-orvdict.ts'
import { withSoftAdj } from '../core/adj-soft.ts'
import { withGal } from '../core/gal-folds.ts'
import type { Candidate } from '../core/phonology.ts'
const withGalD = <T extends { candidates: Candidate[] }>(d: T): T => { const c = withGal(d.candidates); return c === d.candidates ? d : { ...d, candidates: c } }
import { altFile, altStandardMap } from '../core/vesum-alt.ts'
import { FLAG_TAGS, lexIndexVesum, vesumIndex, vesumLemmaList } from './vesum.ts'
import { ltIndex } from './lt.ts'
import { palatalClaim, R24_CITE } from '../core/palatalization.ts'
import { chooseLemma, linkOptions, posLabel, traceSteps, wantedKeys, ROUTE_RANK, type Chosen, type Env, type Route, type TypeCtx } from './build-link.ts'
import {
  admit, detectCard, firstClaim, lemmaContact, lemmaRusyn, lookupKeys, mergeClaims, originClaim, primaryEpoch, rankFirst, registerClaim, RULE_AXIS, selectForms, stressVariants, surzhykClaim, VESUM_LOC,
  type AnnEnv, type FirstCand, type FormAcc, type Ref, type StressJson,
} from './build-annotate.ts'
import { foldSpelling, mine, type PhraseDoc, type Phraseme } from '../core/phrasemes.ts'
import { writePhrases } from './build-phrases.ts'
import { collectEvidence } from '../core/phraseme-pages.ts'
import { collocations, lemmaStats, type Counts, type Sizes } from './build-stats.ts'
import { renderReport, type ReportData } from './build-report.ts'
import { buildEpochs, shrinkEpochs } from './build-epochs.ts'
import { writeTexts } from './build-texts.ts'
import { oesVariants } from '../core/oes-folds.ts'
import { scanTorot, torotReport, lightIndex } from './build-torot.ts'
import { gateSourceUk } from '../core/torot.ts'
import { vesumFormLight } from '../core/gz-light.ts'
import { capNames, muReport, type MuWitness } from './build-mu.ts'
import { archReport, buildArchaic } from './build-archaic.ts'
import { buildCv, writeCv, userWords } from './build-cv.ts'
import { histHeads } from './dx-hist-load.ts'
import { groupHist, type HistStats } from '../core/dx-hist.ts'
import { attachCvStress, lk } from '../core/cv.ts'
import { MU_ORTH } from '../core/mu-fold.ts'
import { gateKey, paradigmKindOf } from '../core/pos-gate.ts'
import { acceptParticiples, participleCandidates, participleSurfaces } from '../core/verbs.ts'
import { corrEvidence } from '../core/correspondences.ts'
import { PlaceScan, properClaim, type NameEvidence, type PlacesFile } from '../core/places.ts'
import { writeEtymology } from './build-etymology.ts'
import { writeCognates } from './build-cognates.ts'
import { writeR2u } from './build-r2u.ts'
import { buildSenseEntries, dictRows, kaikkiRows, parsedRows, wiktRows } from './build-se.ts'
import { writeUsage } from './build-usage.ts'
import { buildAutoLabels, writeAutoReport } from './build-autolabel.ts'
import { autoContactClaim, withAutoContact } from '../core/autolabel.ts'
import { writeHeteronymCandidates, writeLoanLabels, writeSenses, writeSongs } from './build-extras.ts'
import { LYRICS_SOURCES, loadLyrics, vocabOf, type SongVocab } from './song-vocab.ts'
import { isFresh, readJson, runLogged, swapDir, writeJsonAtomic } from './robust.ts'
import { BUILD_ENV_KEYS, StageCache, sha } from './stage-cache.ts'
import { SourceIndex } from './stage-code.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = resolve(ROOT, 'data/work'), PUB = resolve(ROOT, 'public/data'), ANALYSIS = resolve(ROOT, 'analysis')
// SPEC 20 B-5a amendment 2026-10-17: lexicon.json is a build intermediate (the site loads boot.json + ix/ + cd/ parts, SPEC 63 PF), so its 15 MiB download limit is replaced by a sanity cap
// that fails loudly (JSON.stringify of the whole file must stay far below V8's ~512 MiB string limit); the transfer budgets live in pipelines/budget.ts and the per-shard limits below.
const CORE_LIMIT = 256 * 1024 * 1024, SHARD_LIMIT = 256 * 1024   // SPEC 20 B-5a (sanity cap) / B-5b (raised 192 → 256 KiB for SPEC 50 epoch paradigms, see B-5b)
const execP = promisify(execFile)

interface NlpOut { model: string; outOfDomain?: boolean; tokens: ({ lemma?: string; upos?: string; feats?: string | null } | null)[] }
interface Loaded { w: WitnessOut; nlp?: NlpOut; src?: { file: string; nlp?: string } }   // src: the work files this witness was read from (RS-2 per-witness cache key)
type LinkVal = Exclude<FormCard['link']['value'], 'unknown'>

const rd = readJson
const rawKey = (s: string) => s.normalize('NFC').toLowerCase()
const bump = <K>(m: Map<K, number>, k: K, n = 1) => m.set(k, (m.get(k) ?? 0) + n)

/** the data/work files that may be witnesses (RS-2: the only names of that directory the build's read set depends on) */
export const isWitnessFile = (f: string) => f.endsWith('.json') && !/\.nlp\.json$|^stress|^ru\.json$|request/.test(f)

/** B-1: every data/work/<id>.json that is a WitnessOut (has tokens), with its Stanza output when the lengths agree. */
export function loadWitnesses(dir = WORK): Loaded[] {
  const out: Loaded[] = []
  for (const f of readdirSync(dir).sort()) {
    if (!isWitnessFile(f)) continue
    let w: WitnessOut
    try { w = rd<WitnessOut>(resolve(dir, f)) } catch (e) {
      // RS-1: a truncated work file silently shrinks the corpus; fatal unless the owner allows skipping (BULP_ALLOW_UNREADABLE=1)
      if (!process.env['BULP_ALLOW_UNREADABLE']) throw new Error(`${f}: unreadable (${(e as Error).message}); re-run its ingest, or set BULP_ALLOW_UNREADABLE=1 to skip it`)
      console.warn(`  ! ${f}: unreadable (${(e as Error).message}), skipped`); continue
    }
    if (!Array.isArray(w.tokens) || !w.id || !w.author) continue
    const np = resolve(dir, f.replace(/\.json$/, '.nlp.json'))
    let nlp = existsSync(np) ? rd<NlpOut>(np) : undefined
    if (nlp && nlp.tokens.length !== w.tokens.length) { console.warn(`  ! ${f}: nlp length ${nlp.tokens.length} ≠ ${w.tokens.length}, ignored`); nlp = undefined }
    out.push({ w, nlp, src: { file: resolve(dir, f), ...(existsSync(np) ? { nlp: np } : {}) } })
  }
  return out
}

const century = (d: [number, number]) => Math.floor((Math.round((d[0] + d[1]) / 2) - 1) / 100) + 1

interface LemmaAcc {
  id: string; display: string; tags: string; cls: string; idx: number; f: number
  perW: Map<string, number>; perEpoch: Map<string, number>; perCentury: Map<number, number>
  forms: Map<string, FormAcc>
  firstByW: Map<string, { wid: string; ref: Ref; raw: string; route: Route; loc: string; n: number }>   // FX-3: key = witness id + spelling
  pre1400: boolean
  dict: boolean                  // BL-11: attested as a headword of a historical dictionary (witnessType dictionary) — kept even at f = 1
  nm: { torot?: NameEvidence['torot']; stanza?: NameEvidence['stanza']; nMorph: number; nNlp: number }   // NP-1 counters
}

async function runPy(script: string): Promise<void> {
  const uv = process.env['UV_BIN'] || 'uv'   // UV_BIN override, else uv on PATH (plan 40 B4)
  mkdirSync(WORK, { recursive: true })   // RS-1: output streams to a log file (no maxBuffer to overflow), a non-zero exit rejects with the log tail
  await runLogged(uv, ['run', '--project', 'nlp', 'python', `nlp/${script}`], { cwd: ROOT, log: resolve(WORK, `${script}.log`), env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
}

/** RS-2 stage cache controls: `--no-cache` (enabled: false), `--from <stage>`, BUILD_CACHE_DIR, BUILD_CACHE_VERIFY=1 */
export interface BuildOpts { noPy?: boolean; allowStalePy?: boolean; cache?: { enabled?: boolean; from?: string; dir?: string; verify?: boolean } }

export async function build(opts: BuildOpts = {}) {
  const c = opts.cache ?? {}, enabled = c.enabled ?? true
  const sc = new StageCache({
    enabled, dir: resolve(c.dir ?? process.env['BUILD_CACHE_DIR'] ?? resolve(WORK, 'cache')), ...(c.from ? { from: c.from } : {}), verify: c.verify ?? process.env['BUILD_CACHE_VERIFY'] === '1',
    code: enabled ? new SourceIndex(fileURLToPath(import.meta.url)).warm() : { fingerprint: () => '' },
    env: Object.fromEntries(BUILD_ENV_KEYS.map(k => [k, process.env[k]])), flags: { noPy: !!opts.noPy, allowStalePy: !!opts.allowStalePy },
  })
  sc.start()
  try { return await buildImpl(opts, sc) } finally { sc.finish() }
}

async function buildImpl(opts: BuildOpts, sc: StageCache) {
  const t0 = Date.now(), lap = (m: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`)
  sc.setLog(lap); sc.tracker.filterDir(WORK, isWitnessFile)

  // ── 1. admission (B-1.1) ───────────────────────────────────────────────────────────────────────
  const loaded = loadWitnesses()
  { const fr = fillWitnessRegions(loaded.map(l => l.w)); if (fr.filled) console.log(`regions (LB-10): ${fr.filled} archive.org witnesses got their place of publication from the item metadata (${fr.tokens} tokens; ${JSON.stringify(fr.byField)})`) }   // LB-10: region = place of publication, read from the source's own metadata
  const adm: Loaded[] = [], excluded: ReportData['excluded'] = []
  for (const l of loaded) {
    const a = admit(l.w, authorById[l.w.author])
    a.ok ? adm.push(l) : excluded.push({ id: l.w.id, author: l.w.author, why: a.why, n: l.w.tokens.length })
  }
  adm.sort((a, b) => a.w.date[1] - b.w.date[1] || a.w.id.localeCompare(b.w.id))
  lap(`witnesses: ${loaded.length} found, ${adm.length} admitted, ${excluded.length} excluded`)

  const meta = adm.map(({ w }) => {
    const sh = assignEpoch(w.date, 'shev'), wl = assignEpoch(w.date, 'wl')
    const pe = primaryEpoch(w.date, 'shev'), pw = primaryEpoch(w.date, 'wl')
    const ids = [pe, pw, ...(sh.value === 'unknown' ? [] : sh.value.overlays), ...(wl.value === 'unknown' ? [] : wl.value.overlays)].filter((x): x is string => !!x)
    return { sh, wl, pe, ids: [...new Set(ids)], cent: century(w.date) }
  })
  const sizes: Sizes = { N: 0, epoch: {}, century: {}, witnesses: adm.filter(({ w }) => !w.noFreq).map(({ w }) => ({ id: w.id, n: w.tokens.length })) }
  adm.forEach(({ w }, i) => {
    if (w.noFreq) return   // R2U-1: attestation-only witnesses are no running text (core/types.ts WitnessOut.noFreq)
    const n = w.tokens.length; sizes.N += n
    for (const id of meta[i]!.ids) sizes.epoch[id] = (sizes.epoch[id] ?? 0) + n
    const c = String(meta[i]!.cent); sizes.century[c] = (sizes.century[c] ?? 0) + n
  })

  // ── 2. token types, candidates, ONE VESUM pass ─────────────────────────────────────────────────
  const dmemo = new Map<string, Derivation>(), fmemo = new Map<string, ReturnType<typeof foldRaw>>()
  // SPEC 63 PV-8: cited OES inflection spellings (core/oes-folds.ts) are extra candidates of every Old-Cyrillic token; VESUM still decides
  const deriveOes = (s: string, oldI: boolean): Derivation => {
    const d = deriveRaw(s, { oldI }); if (!/[ъьѣ]/.test(d.norm)) return d
    const seen = new Set(d.candidates.map(c => c.form)), extra = oesVariants(d.norm).flatMap(v => deriveRaw(v.form, { oldI }).candidates.map(c => ({ ...c, trace: [...v.trace, ...c.trace], branches: c.branches + v.trace.length }))).filter(c => !seen.has(c.form) && seen.add(c.form))
    return extra.length ? { ...d, candidates: [...d.candidates, ...extra] } : d
  }
  const derive: Env['derive'] = (s, oldI) => { const k = (oldI ? '1' : '0') + s; let d = dmemo.get(k); if (!d) dmemo.set(k, d = withGalD(withSoftAdj(deriveOes(s, oldI)))); return d }
  const fold: Env['fold'] = (s, orth) => { const k = (orth ?? '') + '|' + s; let d = fmemo.get(k); if (!d) fmemo.set(k, d = withGal(foldRaw(s, orth))); return d }

  // #stage tokens
  // RS-2: tokenisation is cached per witness file (types local to the witness); the global type table is merged in witness order, so the ids are the one-pass numbering
  const tokeniseWitness = (w: WitnessOut, nlp: NlpOut | undefined) => {
    const idx = new Int32Array(w.tokens.length), local = new Map<string, number>(), keys: string[] = [], ts: TypeCtx[] = [], counts: number[] = []
    w.tokens.forEach((t, i) => {
      const raw = rawKey(t.raw), lemma = t.lemma || undefined, stanza = !lemma ? nlp?.tokens[i]?.lemma || undefined : undefined
      const gate = w.lang === 'uk' ? undefined : gateKey(t.morph, nlp?.tokens[i]?.upos)   // FX-1: the token's own POS (TOROT manual, else Stanza)
      const past = !!stanza && /(^|\|)Tense=Past\b/.test(nlp?.tokens[i]?.feats ?? '') && /VerbForm=Fin/.test(nlp?.tokens[i]?.feats ?? '')   // PV-8b: finite past verb (Stanza ORV feats, model output)
      const k = `${w.lang}|${w.oldI ? 1 : 0}|${w.orth ?? ''}|${lemma ?? ''}|${stanza ?? ''}|${gate ?? ''}|${past ? 'P' : ''}|${raw}`
      let x = local.get(k)
      if (x === undefined) { x = ts.length; local.set(k, x); keys.push(k); ts.push({ lang: w.lang, oldI: !!w.oldI, orth: w.orth, raw, lemma, stanza, gate, ...(past ? { past } : {}) }); counts.push(0) }
      counts[x]!++
      idx[i] = x
    })
    return { keys, ts, counts, idx }
  }
  const types: TypeCtx[] = [], typeIdx = new Map<string, number>(), typeCount: number[] = []
  const tix = adm.map(({ w, nlp, src }) => {
    const tk = src ? sc.item('tokens', w.id, () => sha(sc.tracker.fileFp(src.file), src.nlp ? sc.tracker.fileFp(src.nlp) : '-'), () => tokeniseWitness(w, nlp)) : tokeniseWitness(w, nlp)
    const map = new Int32Array(tk.keys.length)
    tk.keys.forEach((k, j) => {
      let x = typeIdx.get(k)
      if (x === undefined) { x = types.length; typeIdx.set(k, x); types.push(tk.ts[j]!); typeCount.push(0) }
      map[j] = x
      if (!w.noFreq) typeCount[x]! += tk.counts[j]!
    })
    const a = new Int32Array(w.tokens.length)
    for (let i = 0; i < a.length; i++) a[i] = map[tk.idx[i]!]!
    return a
  })
  sc.itemSummary('tokens')
  // #end
  // BL-18: words of authored-song lyrics (analysis only) join the type table with count 0 — they are linked by the same stage but belong to no witness and add to no frequency
  const lyrics = loadLyrics(ROOT), lyricTypes = new Map<string, Map<string, { x: number; n: number }>>()
  for (const [sid, words] of lyrics) {
    const m = new Map<string, { x: number; n: number }>()
    for (const wd of words) {
      const raw = rawKey(wd), k = `uk|0|||||${raw}`      // the key shape of the witnesses' tokens: lang|oldI|orth|lemma|stanza|gate|raw
      let x = typeIdx.get(k)
      if (x === undefined) { x = types.length; typeIdx.set(k, x); types.push({ lang: 'uk', oldI: false, orth: undefined, raw, lemma: undefined, stanza: undefined, gate: undefined }); typeCount.push(0) }
      const e = m.get(raw); if (e) e.n++; else m.set(raw, { x, n: 1 })
    }
    lyricTypes.set(sid, m)
  }
  lap(`${types.length} token types (${lyrics.size} analysis-only lyric files)`)
  // #stage link
  // RS-2: VESUM pass 1, the MU pass, link options, lemma choice and the POS agreement are one cached stage; its outputs are the hits, the linked types and which types had options
  const L1 = await sc.run('link', { chunked: ['hits1', 'linked'] }, async () => {
    const forms = new Set<string>()
    for (const t of types) for (const k of wantedKeys(t, { derive, fold })) forms.add(k)
    for (const t of types) if (t.lang === 'uk') forms.add(key(t.raw))   // SPEC 63 GZ-1: the spelling itself, for the light-card reference of unresolved VESUM-form tokens
    lap(`${forms.size} candidate keys; VESUM pass 1`)
    const hits1 = (await vesumIndex(forms, new Set())).hits
    lap(`VESUM pass 1 done: ${hits1.size} keys with analyses`)

    // ── 3. link (B-2) ──────────────────────────────────────────────────────────────────────────────
    const altStd = altStandardMap(await vesumLemmaList())   // SPEC 63 MM-10: VESUM :alt lemma → standard lemma (cited 1928 folds)
    lap(`MM-10: ${altStd.size} VESUM :alt lemmas linked to their standard lemma`)
    const env: Env = { hits: hits1, derive, fold, altStd }
    const opts1 = types.map(t => linkOptions(t, env))
    {   // SPEC 63 MU-2: the phonetic MU folds (е/о → і, -ніє → -ння) multiply candidates, so they run in a second VESUM pass over the Middle Ukrainian token types still unresolved
      const pend = types.flatMap((t, x) => (!opts1[x] && t.orth && MU_ORTH.has(t.orth) ? [x] : []))
      const ks = new Set<string>(); for (const x of pend) for (const k of wantedKeys(types[x]!, { derive, fold, phon: true })) if (!hits1.has(k)) ks.add(k)
      for (const [k, v] of (await vesumIndex(ks, new Set())).hits) hits1.set(k, v)
      env.phon = true; for (const x of pend) opts1[x] = linkOptions(types[x]!, env)
      lap(`MU phonetic pass: ${pend.length} unresolved Middle Ukrainian token types, ${ks.size} candidate keys, ${pend.filter(x => opts1[x]).length} linked`)
    }
    const freq = new Map<string, number>()            // B-2.1(b): lemma frequency among unambiguous direct links of modern witnesses
    opts1.forEach((o, x) => {
      if (o?.route !== 'direct') return
      const c = chooseLemma(o.opts, new Map())
      if (c && (c.decidedBy === 'unique' || c.decidedBy === 'tier')) bump(freq, c.id, typeCount[x]!)
    })
    const linked = opts1.map(o => { const c = o ? chooseLemma(o.opts, freq) : undefined; return c && o ? { c, route: o.route } : undefined })
    {   // FX-1 diagnostics: token types that would link without the gate but have no compatible analysis (they stay unresolved, B-2.2)
      const lost = new Map<string, { tokens: number; ex: Map<string, number> }>()
      types.forEach((t, x) => {
        if (opts1[x] || !t.gate) return
        const u = linkOptions({ ...t, gate: undefined }, env); if (!u) return
        const l = lost.get(t.gate) ?? lost.set(t.gate, { tokens: 0, ex: new Map() }).get(t.gate)!
        l.tokens += typeCount[x]!; l.ex.set(`${t.raw}→${chooseLemma(u.opts, freq)?.lemma}`, typeCount[x]!)
      })
      for (const [g, l] of [...lost].sort((a, b) => b[1].tokens - a[1].tokens)) lap(`gate ${g}: ${l.tokens} tokens unresolved by POS (e.g. ${[...l.ex].sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]).join(', ')})`)
    }
    {   // FX-3: one lemma = one POS class. Where tokens of one lemma id were linked to analyses of different classes, the class carrying most tokens wins and the others re-choose among
      // the remaining options of their route (an option of another id is fine; the same id in the losing class is not); nothing left → unresolved (B-2.2).
      const votes = new Map<string, Map<string, number>>()
      linked.forEach((L, x) => { if (!L) return; const m = votes.get(L.c.id) ?? votes.set(L.c.id, new Map()).get(L.c.id)!; m.set(L.c.cls, (m.get(L.c.cls) ?? 0) + typeCount[x]!) })
      const major = new Map([...votes].map(([id, m]) => [id, [...m].sort((a, b) => b[1] - a[1])[0]![0]]))
      let moved = 0, dropped = 0
      linked.forEach((L, x) => {
        if (!L || major.get(L.c.id) === L.c.cls) return
        const o = opts1[x]!, rest = o.opts.filter(p => p.id !== L.c.id || p.cls === major.get(p.id))
        const c = chooseLemma(rest, freq)
        if (c && (major.get(c.id) ?? c.cls) === c.cls) { linked[x] = { c, route: o.route }; moved++ } else { linked[x] = undefined; dropped++ }
      })
      lap(`POS agreement (FX-3): ${moved} token types re-linked, ${dropped} left unresolved`)
    }
    return { hits1, linked, has1: Uint8Array.from(opts1, o => (o ? 1 : 0)) }
  })
  const { hits1, linked, has1 } = L1
  const env: Env = { hits: hits1, derive, fold, phon: true }   // the MU pass leaves env.phon on
  // #end
  const songVocab: Record<string, SongVocab> = {}   // BL-18: per authored song, lemma/form counts only (pipelines/song-vocab.ts)
  for (const [sid, m] of lyricTypes) {
    const counts = new Map<string, { n: number; lemma?: string }>()
    for (const [raw, { x, n }] of m) counts.set(raw, { n, lemma: linked[x]?.c.lemma })
    songVocab[sid] = vocabOf(LYRICS_SOURCES[sid]!, counts)
  }
  if (lyricTypes.size) lap(`authored-song vocabularies: ${Object.entries(songVocab).map(([s, v]) => `${s} ${v.linked}/${v.tokens} tokens, ${v.lemmas.length} lemmas`).join('; ')}`)

  // ── 4. aggregate tokens into lemmas / spellings ────────────────────────────────────────────────
  const lemmas = new Map<string, LemmaAcc>(), lemmaList: LemmaAcc[] = []
  const routes: Record<string, Record<string, number>> = {}, wLinked = new Map<string, number>()
  const unres = new Map<string, number>(), docs: { id: Int32Array; seg: Int32Array }[] = []
  const phraseDocs: PhraseDoc[] = [], rawIds = new Map<string, number>(), rawNames: string[] = []   // BL-12: n-gram input (lemma ids; raw spellings of unlinked tokens in pre-1600 / non-modern texts)
  const wmeta = new Map<string, Loaded>(adm.map(l => [l.w.id, l]))
  const r2uQueried = new Set<string>(existsSync(resolve(WORK, 'r2u-rows.json')) ? (rd<{ queried?: string[] }>(resolve(WORK, 'r2u-rows.json')).queried ?? []) : [])
  // SPEC 63 OQ: per-witness OCR quality (core/ocr-quality.ts), from the link result of this very build; a gated OCR witness is kept as KWIC but never sets a first attestation, an oldest form or an epoch claim
  const corpusIds = new Set(adm.map(a => a.w.id)), oq = new Map<string, OqResult>()
  adm.forEach(({ w }, wi) => {
    if (w.witnessType !== 'ocr') return
    const seen = new Map<string, number>(); let linkedN = 0
    w.tokens.forEach((t, ti) => { const k = t.raw.toLowerCase(); seen.set(k, (seen.get(k) ?? 0) + 1); if (linked[tix[wi]![ti]!]) linkedN++ })
    oq.set(w.id, ocrQuality(w, { tokens: w.tokens.length, linked: linkedN, hapaxTypes: [...seen.values()].filter(v => v === 1).length }, corpusIds))
  })
  { const g = [...oq.values()]; lap(`OQ: ${g.length} OCR witnesses, ${g.filter(r => r.excluded).length} excluded from first attestation / epochs (${g.filter(r => r.band === 'low').length} low, ${g.filter(r => r.band === 'garbage').length} garbage, ${g.filter(r => r.preferred).length} with a proofread edition)`) }
  adm.forEach(({ w, nlp }, wi) => {
    const oqx = oq.get(w.id), exc = !!oqx?.excluded, garbage = oqx?.band === 'garbage'   // OQ
    const m = meta[wi]!, ids = new Int32Array(w.tokens.length).fill(-1), seg = Int32Array.from(w.tokens.map(t => t.s))
    const rt = routes[w.id] = {} as Record<string, number>
    const nf = !!w.noFreq   // R2U-1: attests spellings (date, first attestation, one KWIC line) but counts nowhere
    let nl = 0
    w.tokens.forEach((tok, ti) => {
      const L = linked[tix[wi]![ti]!]
      if (!L) { if (!nf && w.witnessType !== 'ocr') bump(unres, rawKey(tok.raw)); return }   // CX-8: unproofread OCR never feeds the unresolved / neologism lists
      const { c, route } = L, raw = rawKey(tok.raw), ref: Ref = { wi, ti }
      if (!nf) { nl++; rt[route] = (rt[route] ?? 0) + 1 }
      let la = lemmas.get(c.id)
      if (!la) {
        la = { id: c.id, display: c.lemma, tags: c.hit.tags, cls: c.cls, idx: lemmaList.length, f: 0, perW: new Map(), perEpoch: new Map(), perCentury: new Map(), forms: new Map(), firstByW: new Map(), pre1400: false, dict: false, nm: { nMorph: 0, nNlp: 0 } }
        lemmas.set(c.id, la); lemmaList.push(la)
      }
      if (!nf) { la.f++; bump(la.perW, w.id); if (!exc) { bump(la.perCentury, m.cent); for (const e of m.ids) bump(la.perEpoch, e) } }   // OQ: no epoch claim from a gated OCR witness
      if (w.date[1] < 1400 && !exc) la.pre1400 = true
      if (w.witnessType === 'dictionary' && (!nf || r2uQueried.has(c.lemma))) la.dict = true   // R2U-1: an r2u lemma is kept only when it was looked up (the dictionaries' equivalents do not add lemmas)
      if (!nf) ids[ti] = la.idx
      {   // NP-1: PROIEL Ne (TOROT morph) and Stanza PROPN, counted per lemma
        const nm = la.nm, up = nlp?.tokens[ti]?.upos
        if (tok.morph) { nm.nMorph++; if (/^Ne/.test(tok.morph)) { const t = (nm.torot ??= { w: w.id, loc: tok.loc, raw: tok.raw, morph: tok.morph, n: 0, of: 0 }); t.n++ } }
        if (up) { nm.nNlp++; if (up === 'PROPN') { const s = (nm.stanza ??= { w: w.id, loc: tok.loc, raw: tok.raw, n: 0, of: 0 }); s.n++ } }
      }
      { const fk = w.id + '\0' + raw, fb = la.firstByW.get(fk); if (fb) fb.n++; else if (!exc) la.firstByW.set(fk, { wid: w.id, ref, raw: tok.raw, route, loc: tok.loc, n: 1 }) }   // OQ: a gated OCR witness is never a first-attestation candidate
      let fa = la.forms.get(raw)
      if (!fa) {
        la.forms.set(raw, fa = {
          raw, norm: w.lang === 'uk' ? key(tok.raw) : derive(raw, !!w.oldI).norm, modern: c.own.form || c.form, f: 0, oldI: !!w.oldI,
          date: w.date, latest: w.date, ocrDate: exc, firstW: w.id, firstLoc: tok.loc, epochs: new Set(), route, chosen: c, ref, first: ref, kwic: [], perW: new Map(), orvVernacular: false, regions: new Set(),
        })
      } else if (ROUTE_RANK[route] < ROUTE_RANK[fa.route]) { fa.route = route; fa.chosen = c; fa.modern = c.own.form || c.form; fa.ref = ref }
      if (!nf) fa.f++
      { const st = spellingDateStep({ date: fa.date, ocrDate: !!fa.ocrDate }, w, exc)   // OQ: gated OCR never sets a vetted spelling date (see spellingDateStep)
        if (st === 'take') { fa.date = w.date; fa.firstW = w.id; fa.firstLoc = tok.loc; fa.first = ref; fa.ocrDate = false } else if (st === 'ocr') fa.date = w.date }
      if (w.date[1] > fa.latest[1]) fa.latest = w.date
      if (m.pe && !nf && !exc) fa.epochs.add(m.pe)   // a dictionary spelling is no evidence of what the epoch's text looked like (research/30 §4): no epoch, no contact/dialect detection by epoch
      if (w.lang === 'orv') fa.orvVernacular = true
      if (w.region) fa.regions.add(w.id)   // B-3.6: region is provenance evidence for every admitted witness, any date
      if (nf) { if (fa.kwic.length < 6 && !fa.kwic.some(r => adm[r.wi]!.w.noFreq)) fa.kwic.push(ref) }   // R2U-1: one dictionary line per spelling
      else if (fa.kwic.length < 6 && (fa.perW.get(w.id) ?? 0) < 2 && !garbage) { fa.kwic.push(ref) }   // OQ: near-garbage OCR is not even a KWIC line
      if (!nf) bump(fa.perW, w.id)
    })
    wLinked.set(w.id, nl); docs.push({ id: ids, seg })
    {
      const oldText = w.date[1] < 1600 || w.lang !== 'uk', pk = new Int32Array(ids.length)
      for (let i = 0; i < ids.length; i++) {
        if (ids[i]! >= 0) { pk[i] = ids[i]!; continue }
        const r = rawKey(w.tokens[i]!.raw)
        if (!oldText || !/^\p{L}+$/u.test(r)) { pk[i] = -1; continue }
        const fk = foldSpelling(r); let x = rawIds.get(fk); if (x === undefined) { x = rawNames.length; rawIds.set(fk, x); rawNames.push(r) }   // BL-12b: spelling variants share one key
        pk[i] = -2 - x
      }
      phraseDocs.push({ wid: w.id, date: w.date, old: w.lang !== 'uk' || !!w.oldI, keys: pk, seg })
    }
    void nlp
  })
  const NL = [...wLinked.values()].reduce((a, b) => a + b, 0), unresolved = sizes.N - NL
  lap(`linked ${NL}/${sizes.N} tokens (${(100 * NL / sizes.N).toFixed(1)}%), ${lemmaList.length} lemmas`)
  // SPEC 63 PV: TOROT witnesses — every token with a TOROT lemma is linked, a name (Ne) or an ORV-only card; strict VESUM link unchanged
  const torot = scanTorot(adm.flatMap(({ w, nlp }, wi) => w.lang !== 'uk' && (w.tokens.some(t => t.lemma) || nlp) ? [{
    w: w.tokens.some(t => t.lemma) || !nlp ? w : { ...w, tokens: w.tokens.map((t, i) => { const n = nlp.tokens[i]; return n?.lemma ? { ...t, lemma: n.lemma, morph: [n.upos, n.feats].filter(Boolean).join(' ') } : t }) },
    model: !w.tokens.some(t => t.lemma), ids: docs[wi]!.id,
    reasonOf: (ti: number) => { const x = tix[wi]![ti]!, t = types[x]!; return has1[x] ? 'POS agreement (FX-3)' : linkOptions({ ...t, gate: undefined }, env) ? `POS gate (${gateSourceUk(t.gate)} ${t.gate})` : 'no VESUM-attested fold/derivation candidate' },
    lemmaOf: (i: number) => lemmaList[i]!,
  }] : []), new Date().toISOString())
  lap(`TOROT: ${torot.file.names.length} name cards, ${torot.file.orv.length} ORV-only cards`)

  const fMax = lemmaList.reduce((m, l) => l.f > m ? l.f : m, -Infinity)   // no spread: millions of lemmas at 10M tokens
  // CX budget: lemmas attested only in later (post-1400, non-dictionary) texts must reach KEEP_MIN_F tokens; the 15 MiB core limit (B-5a) is held by this threshold, never by dropping fields
  const KEEP_MIN_F = Number(process.env['KEEP_MIN_F'] ?? 5)
  lap('kept-lemma histogram (f ≥ k, not pre-1400/dict): ' + [2, 3, 4, 5, 6, 8].map(k => `${k}:${lemmaList.filter(l => l.f >= k && !l.pre1400 && !l.dict).length}`).join(' ') + `; pre-1400 ${lemmaList.filter(l => l.pre1400).length}, dict-only ${lemmaList.filter(l => l.dict && !l.pre1400 && l.f < 2).length}`)
  if (process.env['HIST_ONLY']) process.exit(0)
  const kept = lemmaList.filter(l => l.f >= KEEP_MIN_F || l.pre1400 || l.dict)
  const keep = new Uint8Array(lemmaList.length); kept.forEach(l => (keep[l.idx] = 1))
  // SPEC 63 PV-6: lemmas dropped by KEEP_MIN_F still get a light card (/lw/:lemma): the text shards reference them as 'l:<lemma>'
  const light = lightIndex(adm.map(({ w }) => w), docs.map(d => d.id), lemmaList, keep)
  for (const [wid, r] of light.refs) { const cur = torot.refs.get(wid); if (!cur) torot.refs.set(wid, r); else r.forEach((x, i) => { if (x && !cur[i]) cur[i] = x }) }
  lap(`light cards: ${light.file.lemmas.length} lemmas dropped by KEEP_MIN_F`)
  {   // SPEC 63 GZ-1: unresolved tokens whose own spelling is a VESUM form (FX-3 homonym losers, gate-free leftovers) get a light-card ref too; strict link counts unchanged
    const byLemma = new Map(light.file.lemmas.map(l => [l[0], l]))
    const gz = vesumFormLight(adm.map(({ w }) => w), docs.map(d => d.id), (wid, ti) => !!torot.refs.get(wid)?.[ti], hits1, byLemma)
    for (const [wid, r] of gz.refs) { const cur = torot.refs.get(wid); if (!cur) torot.refs.set(wid, r); else r.forEach((x, i) => { if (x && !cur[i]) cur[i] = x }) }
    for (const l of gz.lemmas) light.file.lemmas.push(l)
    lap(`GZ-1: ${gz.tokens} unresolved VESUM-form tokens got a light card (${gz.lemmas.length} new light lemmas)`)
  }
  {   // SPEC 63 MU-3: capitalised unresolved tokens of Middle Ukrainian witnesses get name cards; analysis/middle-ukr-extraction.md
    const muWs = adm.flatMap(({ w }, wi) => w.orth && MU_ORTH.has(w.orth) ? [{ w, ids: docs[wi]!.id, wi }] : [])
    const cap = capNames(muWs, new Set(torot.file.names.map(n => n.id)))
    for (const [wid, r] of cap.refs) { const cur = torot.refs.get(wid); if (!cur) torot.refs.set(wid, r); else r.forEach((x, i) => { if (x && !cur[i]) cur[i] = x }) }
    for (const n of cap.names) torot.file.names.push(n)
    const rows: MuWitness[] = muWs.map(({ w, ids, wi }) => {
      const rules: Record<string, number> = {}, unresolved = new Map<string, number>(), refs = cap.refs.get(w.id)
      w.tokens.forEach((t, ti) => {
        const L = linked[tix[wi]![ti]!]
        if (L) { for (const r of L.c.cand.trace) if (r.startsWith('MU-')) rules[r] = (rules[r] ?? 0) + 1; return }
        if (!refs?.[ti]) bump(unresolved, rawKey(t.raw))
      })
      return { w, n: w.tokens.length, linked: ids.reduce((a, b) => a + (b >= 0 ? 1 : 0), 0), names: cap.tokens.get(w.id) ?? 0, rules, unresolved }
    })
    muReport(rows, rd<{ linked: Record<string, { n: number; linked: number }> }>(resolve(ANALYSIS, 'mu-baseline.json')).linked, ANALYSIS, ['o18_33', 'o18_26', 'i14_09'])
    lap(`MU: ${cap.names.length} capitalisation name cards; ${rows.reduce((a, r) => a + r.linked, 0)}/${rows.reduce((a, r) => a + r.n, 0)} tokens linked in ${rows.length} Middle Ukrainian witnesses`)
  }
  let cvStressSrc: StressJson | undefined, cvWords: string[] = []   // SPEC 63 CP-6: thin-card stress (requested with the lemma stress, attached just before the cv shards are written)
  let seWanted: string[] = []   // SPEC 63 SE: lk() keys of the CV light / dictionary-only cards (the modern sense sources are read for these and for the full / light lemmas)
  let cvLater: () => void = () => {}   // CV shards live in lex/, which writeLexicon() recreates: written after it
  {   // SPEC 63 AR: archaic lemmas (dictionary headwords unknown to VESUM + unverified recurring clusters); cards /ar/:id, text refs 'a:<id>'
    // #stage archaic
    const ar = await sc.run('archaic', {}, () => buildArchaic(adm.map(({ w }, wi) => ({ w, linked: (ti: number) => !!linked[tix[wi]![ti]!], epoch: meta[wi]!.pe })), derive, ''))
    // #end
    ar.file.generated = new Date().toISOString()   // RS-2: a cached file carries the time of the run that computed it
    for (const [wid, r] of ar.refs) { const cur = torot.refs.get(wid); if (!cur) torot.refs.set(wid, r); else r.forEach((x, i) => { if (x && !cur[i]) cur[i] = x }) }
    writeJsonAtomic(resolve(PUB, 'archaic.json'), JSON.stringify(ar.file)); archReport(ar.file, ar.counts, ANALYSIS)
    lap(`archaic lemmas: ${ar.file.entries.filter(e => e.status === 'dictionary').length} dictionary, ${ar.file.entries.filter(e => e.status === 'unverified').length} unverified; ${ar.counts.dictionaryTokens + ar.counts.unverifiedTokens} corpus tokens linked`)
    // SPEC 63 CV: every word attested in a dictionary witness (headwords AND quoted equivalents) without a full card gets a light card /lw/:word with its attestation lines
    const cv = buildCv(adm.map(({ w }) => ({ w })), (wi, ti) => { const L = linked[tix[wi]![ti]!]; if (!L) return undefined; const la = lemmas.get(L.c.id); return { lemma: L.c.lemma, tags: L.c.hit.tags, full: !!la && keep[la.idx] === 1 } },
      new Set(ar.file.entries.flatMap(e => [e.id, ...e.variants])), (wid, ti) => !!torot.refs.get(wid)?.[ti],
      (() => {   // SL: Plast headwords (public/data/sociolect.json, ingest-plast) get a card unless a full lemma, a light card or an /ar card already owns the word
        const sp = resolve(PUB, 'sociolect.json')
        const owned = new Set<string>([...kept.map(l => l.display), ...light.file.lemmas.map(l => l[0]), ...ar.file.entries.flatMap(e => [e.id, ...e.variants])].map(lk))
        const plastWords = existsSync(sp) ? rd<{ plast: { entries: { w: string }[] } }>(sp).plast.entries.map(e => e.w) : []
        return { words: [...plastWords, ...userWords(ROOT)], owned }   // CV-6: the owner's words (specs/user-words.txt) always get a card
      })(),
      (() => {   // CV-5: every VESUM analysis of an attested spelling, and the first corpus token (with the word before it) of each lemma that KEEP_MIN_F dropped
        const first = new Map<number, [number, number]>()
        docs.forEach((d, wi) => d.id.forEach((idx, ti) => { if (idx >= 0 && !keep[idx] && !first.has(idx)) first.set(idx, [wi, ti]) }))
        const lightEx = [...first].map(([idx, [wi, ti]]) => {
          const w = adm[wi]!.w, t = w.tokens[ti]!, L = linked[tix[wi]![ti]!], pt = ti > 0 && w.tokens[ti - 1]!.s === t.s ? w.tokens[ti - 1]!.raw : undefined
          return { lemma: lemmaList[idx]!.display, tags: lemmaList[idx]!.tags, w: w.id, loc: t.loc, raw: t.raw, form: L?.c.form, ...(pt ? { prev: pt } : {}) }
        })
        const analyses = (k: string): [string, string][] => { const seen = new Set<string>(), out: [string, string][] = []; for (const h of hits1.get(k) ?? []) { const s = h.lemma + '\0' + h.tags; if (!seen.has(s) && out.length < 8) { seen.add(s); out.push([h.lemma, h.tags]) } } return out }
        return { analyses, light: lightEx }
      })(),
      process.env['DICT_ONLY'] === '0' ? undefined : await (async () => {   // SPEC 63 DO-1: every VESUM lemma (and r2u / Plast / dictionary word) with no corpus attestation gets a dictionary-only light card
        const owned = new Set<string>([...kept.map(l => l.display), ...light.file.lemmas.map(l => l[0]), ...ar.file.entries.flatMap(e => [e.id, ...e.variants])].map(lk))
        return { vesum: await vesumLemmaList(), owned, attested: new Set(light.file.lemmas.map(l => lk(l[0]))),
          ...(process.env['DICT_HIST'] === '0' ? {} : { hist: await (async () => {   // SPEC 63 GG: headwords of the historical dictionaries (core/dx-hist.ts)
            const stats: Record<string, HistStats> = {}, groups = groupHist(histHeads(ROOT), stats), ck = new Set<string>(); for (const g of groups.values()) for (const k of g.cands) ck.add(k)
            const lemmaOf = new Map<string, string[]>(); for (const [k, hs] of (await vesumIndex(ck, new Set())).hits) lemmaOf.set(k, [...new Set(hs.map(h => lk(h.lemma)))])
            const corpus = new Map<string, number>(); types.forEach((t, x) => { if (t.lang === 'uk' && typeCount[x]! > 0) { const k = lk(t.raw); if (ck.has(k)) corpus.set(k, (corpus.get(k) ?? 0) + typeCount[x]!) } })   // per token TYPE, full-text counts only
            return { groups, lemmaOf, corpus, stats }
          })() }) }
      })())
    if (Object.keys(cv.stats.hist).length) lap(`GG: ${cv.stats.histNew} new dictionary-only cards from historical dictionaries, ${cv.stats.histMerged} merged into existing dictionary-only cards; ` + Object.entries(cv.stats.hist).map(([n, h]) => `${n.split(',')[0]} ${h.heads} headwords, ${h.rejected} rejected, +${h.added} (${h.sole} sole, ${h.corroborated} corpus-corroborated), ${h.merged} merged, ${h.inCards} already cards, ${h.dropped} uncorroborated`).join(' | '))
    seWanted = [...cv.entries.map(e => e[0]), ...ar.file.entries.flatMap(e => [e.id, ...e.variants])]
    for (const [wid, r] of cv.refs) { const cur = torot.refs.get(wid); if (!cur) torot.refs.set(wid, r); else r.forEach((x, i) => { if (x && !cur[i]) cur[i] = x }) }
    cvWords = cv.entries.filter(e => e[1][1] && /^[\p{L}'’-]+$/u.test(e[1][0])).map(e => e[1][0])
    cvLater = () => { const n = attachCvStress(cv.entries, cvStressSrc); lap(`CP-6 stress on ${n} of ${cv.entries.length} thin cards`); const wc = writeCv(PUB, cv.entries, light.file.lemmas.map(l => l[0]), ar.file.entries, new Date().toISOString(), cv.forms)
    lap(`CV cards: ${cv.entries.length} words from ${cv.stats.tokens} dictionary tokens (${cv.stats.vesum} VESUM-linked, ${cv.stats.asIs} as-is spellings; ${cv.stats.skippedFull} already full cards, ${cv.stats.skippedArchaic} owned by /ar); DO: ${cv.stats.dictOnly} dictionary-only cards (${cv.stats.dictVesum} known to VESUM, f = 0); ${cv.stats.refTokens} text tokens linked; cv/ ${wc.shards} shards ${(wc.bytes / 1048576).toFixed(2)} MB (max ${(wc.maxShard / 1024).toFixed(0)} KB), cardindex.json ${(wc.indexBytes / 1048576).toFixed(2)} MB (${wc.index.lw.length} /lw, ${wc.index.ar.length} /ar)`) }
  }
  const fx = lemmaList.map(l => l.f), names = lemmaList.map(l => l.display)
  // #stage collocations
  const { coll } = await sc.run('collocations', { chunked: ['coll'] }, () => ({ coll: collocations(docs, fx, keep, names) }))
  // #end
  lap(`${kept.length} lemmas kept (f ≥ 2, pre-1400 or dictionary headword); collocations for ${coll.size}`)

  // ── 5. selection, requests for the Python stages, LT corpus keys ──────────────────────────────
  const lt = await ltIndex()
  const sel = new Map<string, FormAcc[]>(kept.map(l => [l.id, selectForms([...l.forms.values()], 12)]))
  const stressReq = new Set<string>(), ruReq = new Set<string>()
  const auto = await buildAutoLabels(ROOT, kept.map(l => l.display))   // SPEC 63 AC: labels from the sources' own abbreviations, recomputed on every build
  lap(`autolabels: kaikki ${auto.stats.kaikkiLemmas} lemmas / ${auto.stats.kaikkiSenses} tagged senses, r2u ${auto.stats.r2uRows} articles (${auto.stats.r2uLabelled} with a regional label → ${auto.stats.dialectLemmas} lemmas), ${auto.stats.ruHeads} Russian headwords`)
  const ltCorpus: ReportData['ltCorpus'] = []
  types.forEach((t, x) => { const e = lt[key(t.raw)]; if (e && t.lang === 'uk' && typeCount[x]! > 0) { ltCorpus.push({ form: key(t.raw), f: typeCount[x]!, file: e[0] }); ruReq.add(key(t.raw)) } })
  for (const w of cvWords) stressReq.add(w)   // SPEC 63 CP-6: VESUM-linked headwords of the thin cards (light, CV, dictionary-only)
  for (const l of kept) {
    stressReq.add(l.display)
    for (const fa of sel.get(l.id)!) {
      if (fa.modern) stressReq.add(fa.modern)
      if (fa.chosen.tier > 0 || lt[key(fa.raw)]) ruReq.add(key(fa.raw))
    }
    if (lt[l.id] || /:(bad|subst|slang|alt)\b/.test(':' + l.tags) || auto.ruPairs.has(key(l.display))) ruReq.add(l.id)   // AC-3: a lemma that is a Russian headword in r2u gets the Russian-dictionary check
  }
  mkdirSync(WORK, { recursive: true })
  writeJsonAtomic(resolve(WORK, 'stress-request.json'), JSON.stringify([...stressReq]))
  writeJsonAtomic(resolve(WORK, 'ru-request.json'), JSON.stringify([...ruReq]))
  lap(`requests: stress ${stressReq.size}, ru ${ruReq.size}`)

  // dry run: which VESUM keys will detect() look up?
  const dryEnv: AnnEnv = { hits: new Map(), lt, ru: {}, derive: (s, oldI) => derive(s, oldI).candidates.map(c => c.form) }
  const keys2 = new Set<string>(kept.map(l => l.id))
  for (const l of kept) for (const fa of sel.get(l.id)!) for (const k of lookupKeys(fa, dryEnv)) keys2.add(k)

  // #stage python
  const pyStage = opts.noPy ? undefined : () => sc.run('python', {
    parallel: true, produces: ['stress.json', 'ru.json'].map(f => resolve(WORK, f)), inputs: { stress: sha(JSON.stringify([...stressReq])), ru: sha(JSON.stringify([...ruReq])), allowStale: !!opts.allowStalePy },
    files: ['stress.py', 'russian_check.py', 'pyproject.toml', 'uv.lock'].map(f => resolve(ROOT, 'nlp', f)),
  }, async () => {
    try { await runPy('stress.py'); await runPy('russian_check.py') } catch (e) {
      // RS-1: a failed Python stage fails the build (stale stress.json/ru.json may belong to another lemma set); --allow-stale-py reuses them knowingly
      if (!opts.allowStalePy) throw new Error(`python stage failed (use --allow-stale-py to reuse the existing stress.json/ru.json): ${String((e as Error).message).slice(0, 600)}`)
      console.warn('  ! python stage failed, --allow-stale-py: using existing outputs if any:', String((e as Error).message).slice(0, 300))
    }
    if (!opts.allowStalePy) for (const [out, req] of [['stress.json', 'stress-request.json'], ['ru.json', 'ru-request.json']] as const)
      if (!isFresh(resolve(WORK, out), resolve(WORK, req))) throw new Error(`${out} is missing or older than ${req}: the python stage did not produce it`)
    const text = (f: string) => (existsSync(resolve(WORK, f)) ? readFileSync(resolve(WORK, f), 'utf8') : null)
    return { stress: text('stress.json'), ru: text('ru.json') }   // RS-2: the stage's outputs are the two JSON files; a hit restores them
  })
  // #end
  // #stage vesum2
  const v2Stage = () => sc.run('vesum2', { parallel: true, chunked: ['hits', 'paradigms', 'lemmaTags'] }, async () => {
    const v2 = await vesumIndex(keys2, new Map(kept.map(l => [l.id, l.cls] as const)))
    {   // BL-8: participles / adverbial participles are VESUM lemmas of their own — link them to the kept verbs by construction + VESUM oracle (core/verbs.ts) and append them to the verb paradigm
      const cand = new Map<string, string[]>()
      for (const l of kept) if (paradigmKindOf(v2.lemmaTags.get(l.id) ?? l.tags) === 'verb') { const c = participleCandidates(v2.paradigms.get(l.id) ?? []); if (c.length) cand.set(l.id, c) }
      const ph = (await vesumIndex(new Set([...cand.values()].flat().flatMap(participleSurfaces)), new Set())).hits
      let n = 0
      for (const [id, c] of cand) { const add = acceptParticiples(v2.paradigms.get(id)!, c, ph, key); if (add.length) { v2.paradigms.get(id)!.push(...add); n += add.length } }
      lap(`verb participles linked: ${n} forms for ${cand.size} verbs with candidates`)
    }
    return { ...v2 }
  })
  // #end
  lap(`VESUM pass 2 (${keys2.size} keys, ${kept.length} paradigms) + python stages`)
  const [v2, py] = await Promise.all([v2Stage(), pyStage?.()])
  sc.join(['vesum2', 'python'])
  if (py) for (const [f, text] of [['stress.json', py.stress], ['ru.json', py.ru]] as const) {   // RS-2: restore the python outputs a cache hit stands for (untouched when already identical)
    const dest = resolve(WORK, f)
    if (text !== null && (!existsSync(dest) || readFileSync(dest, 'utf8') !== text)) writeJsonAtomic(dest, text)
  }
  lap('pass 2 done')
  const stressJson = existsSync(resolve(WORK, 'stress.json')) ? rd<StressJson>(resolve(WORK, 'stress.json')) : undefined
  const ruJson = existsSync(resolve(WORK, 'ru.json')) ? rd<{ forms: AnnEnv['ru'] }>(resolve(WORK, 'ru.json')).forms : {}
  if (!stressJson) console.warn('  ! no stress.json — stress variants empty')
  else {   // GAPS #5: a stale stress.json (python stage skipped/failed, UV_BIN unset) silently loses stress for new lemmas — say so
    const miss = [...stressReq].filter(f => !(f in stressJson.forms)).length
    if (miss && !opts.noPy && !opts.allowStalePy) throw new Error(`stress.json lacks ${miss} of ${stressReq.size} requested forms after a python run`)
    if (miss) console.warn(`  ! stress.json lacks ${miss} of ${stressReq.size} requested forms (stale: run without --no-py, set UV_BIN)`)
    lap(`stress: ${stressReq.size - miss}/${stressReq.size} requested forms answered, ${[...stressReq].filter(f => stressJson.forms[f]?.length).length} with a dictionary stress`)
  }
  cvStressSrc = stressJson
  const annEnv: AnnEnv = { hits: v2.hits, lt, ru: ruJson, derive: dryEnv.derive }

  // ── 5b. epoch paradigms of the kept noun lemmas (SPEC 50 EP-3/EP-4) ───────────────────────────
  const nounLemmas = new Map(kept.flatMap(l => { const t = v2.lemmaTags.get(l.id) ?? l.tags; const k = paradigmKindOf(t); return k === 'noun' || k === 'pron' || k === 'verb' ? [[l.id, { display: l.display, tags: t }] as const] : [] }))   // FX-5: nouns get the noun grid, pronouns (VESUM `pron` segment) the pronominal grid, BL-8: verbs the verb grid; other POS none
  const PROBE = ['рука', 'земля', 'князь', 'город', 'син', 'я', 'ти', 'себе', 'ми', 'ви', 'він', 'аз', 'да']   // FX-6 test lemmas
  // #stage epochs
  const epochRes = await sc.run('epochs', { chunked: ['epochs'] }, () => buildEpochs({
      probe: new Set(PROBE), kindOf: id => { const l = lemmas.get(id); return l ? paradigmKindOf(v2.lemmaTags.get(id) ?? l.tags) : '' },
      adm, epochsOf: meta.map(m => (m.sh.value === 'unknown' ? [] : m.sh.value.epochs)), tix, linked, lemmas: nounLemmas, hits: hits1,
      derive: (s, oldI) => derive(s, oldI), vesumLoc: VESUM_LOC,
  }))
  // #end
  lap(`epoch paradigms: ${epochRes.epochs.size} of ${nounLemmas.size} noun lemmas have attested cells`)

  // ── 6. annotations (B-3) ──────────────────────────────────────────────────────────────────────
  const witMap = new Map(adm.map(l => [l.w.id, l.w]))
  const soundType: Record<string, number> = {}, soundToken: Record<string, number> = {}
  for (const l of lemmaList) for (const fa of l.forms.values()) for (const id of fa.chosen.own.trace) { soundType[id] = (soundType[id] ?? 0) + 1; soundToken[id] = (soundToken[id] ?? 0) + fa.f }

  const wRegion = new Map([...witMap].map(([id, w]) => [id, regionOf(w.region)] as const))
  const regionN = REGIONS.map(r => ({ code: r.code, name: r.name, oblasts: r.oblasts, N: adm.filter(({ w }) => regionOf(w.region) === r.code).reduce((s, { w }) => s + w.tokens.length, 0) }))
  // #stage annotate
  const ann = await sc.run('annotate', { chunked: ['cards'] }, () => {
    const kwicOf = (r: Ref): Kwic => {
      const { w } = adm[r.wi]!, t = w.tokens[r.ti]!
      let a = r.ti, b = r.ti
      while (a > 0 && r.ti - a < 6 && w.tokens[a - 1]!.s === t.s) a--
      while (b + 1 < w.tokens.length && b - r.ti < 6 && w.tokens[b + 1]!.s === t.s) b++
      return { w: w.id, loc: t.loc, left: w.tokens.slice(a, r.ti).map(x => x.raw).join(' '), node: t.raw, right: w.tokens.slice(r.ti + 1, b + 1).map(x => x.raw).join(' '), date: w.date }
    }
    const kline = (r: Ref) => { const k = kwicOf(r); return `${k.left} [${k.node}] ${k.right}`.trim() }

    const linkEvidence = (fa: FormAcc): Evidence[] => {
      const c = fa.chosen, { w, nlp } = adm[fa.ref.wi]!, tok = w.tokens[fa.ref.ti]!
      const ev = [D('VESUM', VESUM_LOC, `${c.form} ${c.hit.tags} (лема: ${c.hit.lemma})`)]
      if (c.corr) ev.push(corrEvidence(c.corr.row, c.corr.old))   // FX-2
      if (fa.route === 'torot-lemma') ev.push(D('TOROT', `${w.id}: ${tok.loc}`, `${tok.raw} ← лема «${tok.lemma}»${tok.morph ? ' · ' + tok.morph : ''}`, 'наукова анотація TOROT'))
      else if (fa.route === 'stanza-lemma') ev.push(D('stanza orv', nlp?.model ?? 'stanza orv', `${tok.raw} → «${nlp?.tokens[fa.ref.ti]?.lemma}»`, `модельна лематизація, не словниковий факт (P-1.7)${nlp?.outOfDomain ? '; текст поза доменом моделі' : ''}`))
      else ev.push(D(w.id, tok.loc, `${tok.raw} → ${c.own.form}${c.own.trace.length ? ' [' + c.own.trace.join('→') + ']' : ''}`))
      if (c.own.trace.includes('R24r')) ev.push(...R24_CITE.slice(0, 2))   // BL-20: ц/з/с → к/г/х before и/і/ѣ
      return ev
    }

    const detectHits: Record<string, number> = {}, hints: Record<string, number> = {}
    const lemmaStatsInput = (la: LemmaAcc): Counts => ({ f: la.f, perW: la.perW, perEpoch: la.perEpoch, perCentury: la.perCentury })
    const cards: LemmaCard[] = [], lemTags = new Map<string, string>()   // lemTags: UL-1 input
    for (const la of kept) {
      const accs = sel.get(la.id)!
      const paradigm = (() => { const seen = new Set<string>(); return (v2.paradigms.get(la.id) ?? []).filter(p => { const k = p.form + '\0' + p.tags; return seen.has(k) ? false : (seen.add(k), true) }) })()
      const pairs = accs.map(fa => {
        const det = detectCard(fa, annEnv)
        for (const c of Object.values(det.claims)) for (const r of (c.method ?? '').split('+')) detectHits[r] = (detectHits[r] ?? 0) + 1
        for (const h of det.hints) hints[h] = (hints[h] ?? 0) + 1
        const c = fa.chosen
        const link: FormCard['link'] = claim<LinkVal>({ lemma: c.lemma, form: c.form, route: fa.route, alternatives: c.alternatives }, linkEvidence(fa),
          { method: `${fa.route}${c.own.trace.length ? '[' + c.own.trace.join('+') + ']' : ''}${c.alternatives.length ? `;tie=${c.decidedBy}` : ''}` })
        const card: FormCard = {
          raw: fa.raw, norm: fa.norm, modern: fa.modern, f: fa.f, date: fa.date, ...(fa.ocrDate ? { ocrOnly: true as const } : {}), link,
          derivation: traceSteps(fa.norm, c.own), claims: det.claims, hints: det.hints, epochs: [...fa.epochs], kwic: fa.kwic.map(kwicOf),
          byW: Object.fromEntries([...fa.perW].sort((a, b) => a[0].localeCompare(b[0]))),   // BL-6c: true per-witness counts of this spelling
        }
        return { card, acc: fa }
      })
      const lc = lemmaContact(la.display, annEnv)
      const modernCards = pairs.filter(p => p.card.epochs.includes('shev.modern'))
      // first (B-3.5): one candidate per (witness, spelling) over ALL spellings of the lemma, ranked by rankFirst
      const fbw = [...la.firstByW.values()]   // perf: spread once (was re-spread per candidate, O(F²))
      const cands: FirstCand[] = fbw.map(x => { const wm = witMap.get(x.wid)!; return { witness: x.wid, author: authorById[wm.author]!, date: wm.date, witnessType: wm.witnessType, loc: x.loc, form: x.raw, route: x.route, n: x.n } })
      const refOf = new Map(cands.map((c, i) => [c, fbw[i]!.ref]))
      const first = firstClaim(cands, witMap, c => kline(refOf.get(c)!))
      // oldest (B-3.4) and first attestation use ONE tie-break (FX-3): the oldest spelling IS the spelling of the ranked first attestation. Fallback (no vetted first): min date.to, commoner spelling.
      const ranked = rankFirst(cands)
      let oldest: LemmaCard['claims']['oldest']
      if (ranked && first.value !== 'unknown') {
        const fc = ranked.first, fw = witMap.get(fc.witness)!
        oldest = claim({ form: rawKey(fc.form), date: fc.date, epoch: primaryEpoch(fc.date, 'shev') ?? 'unknown' }, [D(fc.witness, fc.loc, kline(refOf.get(fc)!)), fw.dateCite], { method: 'min date.to; same tie-break as first (B-3.5)' })
      } else {
        const old = [...la.forms.values()].sort((a, b) => a.date[1] - b.date[1] || b.f - a.f)[0]!
        oldest = claim({ form: old.raw, date: old.date, epoch: primaryEpoch(old.date, 'shev') ?? 'unknown' }, [D(old.firstW, old.firstLoc, kline(old.first)), witMap.get(old.firstW)!.dateCite], { method: 'min date.to' })
      }
      // dialect (B-3.6)
      let dia: Record<string, Claim<true>> = {}; const regionWs = new Set<string>()
      for (const p of pairs) {
        const sub = Object.fromEntries(Object.entries(p.card.claims).filter(([l]) => l !== 'rusyn' && RULE_AXIS.get(l) === 'dialect')) as Record<string, Claim<true>>
        if (Object.keys(sub).length) { dia = mergeClaims(dia, sub); p.acc.regions.forEach(r => regionWs.add(r)) }
      }
      const regionEv = [...regionWs].slice(0, 3).map(wid => D(wid, 'region', witMap.get(wid)!.region ?? ''))
      for (const [l, c] of Object.entries(dia)) dia[l] = claim(true as const, [...c.evidence, ...regionEv], { score: c.score, method: c.method })
      const diaBase = Object.keys(dia).length
      dia = mergeClaims(dia, auto.dialect.get(la.display) ?? {})   // AC-1 + AC-2: dictionary region label → gazetteer group (own quote; no witness-region evidence)
      const szBase = surzhykClaim(modernCards.map(p => p.card.claims), lc)
      const szAuto = autoContactClaim(la.display, (annEnv.hits.get(key(la.display)) ?? []).length > 0, annEnv.ru[key(la.display)], auto.ruPairs.get(key(la.display)) ?? [], VESUM_LOC, 'data/work/ru.json (nlp/russian_check.py)')   // AC-3
      const sz = withAutoContact(szBase, szAuto)
      const ac = auto.counts; ac.lemmas++; if (diaBase) ac.diaBase++; if (Object.keys(dia).length) ac.diaAfter++; if (isKnown(szBase)) ac.szBase++; if (isKnown(sz)) ac.szAfter++; if (szAuto) ac.szAuto++
      const order = lemmaStatsInput(la)
      const stats = lemmaStats(order, fMax, sizes, coll.get(la.idx) ?? [])
      const byRegion = new Map<string, number>()   // perf: witness → region code resolved once (wRegion), one pass over perW
      for (const [wid, y] of la.perW) { const code = wRegion.get(wid); if (code !== undefined) byRegion.set(code, (byRegion.get(code) ?? 0) + y) }
      stats.byRegion = regionN.filter(r => r.N > 0).map(r => ({ code: r.code, f: byRegion.get(r.code) ?? 0, N: r.N }))
      const lemmaPos = v2.lemmaTags.get(la.id) ?? la.tags
      lemTags.set(la.display, lemmaPos)
      const proper = properClaim(la.display, {
        vesum: lemmaPos, ...(la.nm.torot ? { torot: { ...la.nm.torot, of: la.nm.nMorph } } : {}), ...(la.nm.stanza ? { stanza: { ...la.nm.stanza, of: la.nm.nNlp } } : {}),
      }, VESUM_LOC)   // NP-1
      const pal = palatalClaim(la.display, [...la.forms.values()].map(fa => ({ raw: fa.raw, forms: [...new Set([key(fa.norm), key(fa.raw), key(fa.modern)])], f: fa.f, viaR24r: fa.chosen.own.trace.includes('R24r'), ev: D(fa.firstW, fa.firstLoc, kline(fa.first)) })))   // BL-20
      cards.push({
        lemma: la.display, pos: posLabel(lemmaPos), paradigmKind: paradigmKindOf(lemmaPos), paradigm, ...(epochRes.epochs.has(la.id) ? { epochs: epochRes.epochs.get(la.id)! } : {}),
        stress: stressVariants([la.display, ...new Set(accs.map(a => a.modern))].slice(0, 4), stressJson),
        forms: pairs.map(p => p.card), first, stats,
        claims: { register: registerClaim(paradigm, la.display), surzhyk: sz, origin: originClaim(pairs), oldest, dialect: dia, rusyn: lemmaRusyn(modernCards.map(p => p.card)), ...(proper ? { proper } : {}), ...(pal ? { palatalization: pal } : {}) },
      })
    }
    cards.sort((a, b) => b.stats.f - a.stats.f || a.lemma.localeCompare(b.lemma, 'uk'))
    return { cards, detectHits, hints, lemTags, counts: { ...auto.counts } }   // auto.counts is advanced by the loop: a hit restores it below
  })
  // #end
  Object.assign(auto.counts, ann.counts)
  const { cards, detectHits, hints, lemTags } = ann
  lap(`${cards.length} lemma cards annotated`)
  { const pf = preflightShards(cards); lap(`pre-flight: ${pf.big.length} lemma(s) over the shard limit (PF-4 part files), ${pf.overBuckets} bucket(s) will overflow, largest lemma ${pf.max} B`) }   // RS-1: fail in seconds, not at minute 50


  // #stage phrases
  const ph = await sc.run('phrases', {}, () => {
    const frames: Phraseme[] = [], keysOut = new Map<Phraseme, number[]>(), cands = mine(phraseDocs, k => (k >= 0 ? names[k]! : '~' + rawNames[-2 - k]!), (wi, ti) => adm[wi]!.w.tokens[ti]!.raw, { top: 40000, frames, keysOut })
    // SPEC 63 PH-2: occurrences (KWIC, century counts, earliest) of the listed phrasemes in one corpus scan; PH-1: component POS from the lemma cards
    const listed = new Map<Phraseme, number[]>()
    for (const c of cands.slice(0, 40000)) listed.set(c, keysOut.get(c)!)
    const phKwic = (wi: number, ti: number, n: number): Kwic => {
      const { w } = adm[wi]!, t = w.tokens[ti]!
      let a = ti, b = ti + n - 1
      while (a > 0 && ti - a < 6 && w.tokens[a - 1]!.s === t.s) a--
      while (b + 1 < w.tokens.length && b - (ti + n - 1) < 6 && w.tokens[b + 1]!.s === t.s) b++
      return { w: w.id, loc: t.loc, left: w.tokens.slice(a, ti).map(x => x.raw).join(' '), node: w.tokens.slice(ti, ti + n).map(x => x.raw).join(' '), right: w.tokens.slice(ti + n, b + 1).map(x => x.raw).join(' '), date: w.date }
    }
    const evidence = collectEvidence(phraseDocs, listed, phKwic)
    return { cands, frames, evidence }
  })
  // #end
  // SPEC 63 SE: sense evolution. Rows = dictionary article lines of the corpus' dictionary witnesses (every token linked to a lemma / light / archaic card), uk.wiktionary and en.wiktionary (kaikki) senses.
  // #stage senses
  const se = await sc.run('senses', { chunked: ['entries'] }, async () => {
    const rows = dictRows(adm, (wi, ti) => {
      const L = linked[tix[wi]![ti]!]; if (L) return L.c.lemma
      const r = torot.refs.get(adm[wi]!.w.id)?.[ti]; return r && /^[la]:/.test(r) ? r.slice(2) : undefined
    })
    const wanted = new Set<string>([...cards.map(c => lk(c.lemma)), ...light.file.lemmas.map(l => lk(l[0])), ...seWanted.map(lk)])
    wiktRows(ROOT, cards.map(c => c.lemma), rows)
    await kaikkiRows(ROOT, k => wanted.has(k), rows)
    const pr = parsedRows(ROOT, k => wanted.has(k), h => derive(h, true).candidates.slice(0, 1).map(c => c.form), rows)   // SE-11: Тимченко, СУМ XVI–XVII, Матеріали, Шевченко, Білецький-Носенко, Закревський
    lap(`SE-11 OQ gate: gloss blanked ${JSON.stringify(pr.blanked)}; cross-reference rows dropped ${JSON.stringify(pr.xref)}`)
    const dictW = new Set(adm.filter(({ w }) => w.witnessType === 'dictionary').map(({ w }) => w.id))
    const kw = new Map(cards.map(c => [lk(c.lemma), c.forms.flatMap(f => f.kwic).filter(x => !dictW.has(x.w)).slice(0, 12)] as const))
    const r = buildSenseEntries(rows, k => kw.get(k) ?? [])
    return { entries: r.entries, stats: r.stats }
  })
  // #end
  // #tail
  // ── 8. outputs ────────────────────────────────────────────────────────────────────────────────
  const generated = new Date().toISOString()
  const metas: WitnessMeta[] = adm.map(({ w, nlp }, i) => {
    const { tokens: _t, dropped, ...rest } = w
    const ru = ruOfWitness({ id: w.id, title: w.title, edition: w.edition, url: w.url })   // SPEC 63 RU-2
    return { ...rest, ...(ru ? { ru } : {}), ...(oq.get(w.id) && oqFlag(oq.get(w.id)!) ? { oq: oqFlag(oq.get(w.id)!) } : {}), n: w.tokens.length, linked: wLinked.get(w.id) ?? 0, dropped, epochShev: meta[i]!.sh, epochWl: meta[i]!.wl, ...(nlp?.outOfDomain ? { outOfDomain: true } : {}) }
  })
  const topUnresolved = [...unres].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 200).map(([form, f]) => ({ form, f }))
  const corpus: CorpusMeta = { generated, authors: AUTHORS, witnesses: metas, epochSizes: sizes.epoch, centurySizes: sizes.century, N: sizes.N, linked: NL, unresolved, topUnresolved, rusynStatus: RUSYN_STATUS, regions: regionN.filter(r => r.N > 0) }

  const lexV = await lexIndexVesum()
  const flagged = (hs: VesumHit[]) => hs.filter(h => h.tags.split(':').some(t => (FLAG_TAGS as readonly string[]).includes(t)))
  let attested = 0
  for (const c of cards) for (const f of c.forms) for (const k of [key(f.raw), key(f.modern)]) {
    const hs = flagged(v2.hits.get(k) ?? []); if (hs.length && !lexV[k]) { lexV[k] = hs; attested++ }
  }
  const lexindex: LexIndex = { generated, lt, vesum: lexV }

  mkdirSync(PUB, { recursive: true }); mkdirSync(ANALYSIS, { recursive: true })
  const lexIdxJson = JSON.stringify(lexindex)
  const budget = writeLexicon(cards, PUB)   // B-5: core + detail shards, nothing dropped
  cvLater()
  lap(`lexicon.json core ${(budget.bytes / 1048576).toFixed(2)} MB (${fmtBreakdown(budget.fields)}),${budget.shards} shards (max ${(budget.shardMax / 1024).toFixed(0)} KB, median ${(budget.shardMedian / 1024).toFixed(0)} KB)`)
  lap(`texts: ${(writeTexts(adm.map(a => a.w), PUB, torot.refs) / 1048576).toFixed(1)} MB (shipped on the data branch, B-5f)`)
  { const n = attachDictModern(ROOT, torot.file.orv, l => derive(l, true).candidates.map(c => c.form)); lap(`ORV cards with a dictionary counterpart (MM-28): ${n} of ${torot.file.orv.length}`) }
  writeJsonAtomic(resolve(PUB, 'torot.json'), JSON.stringify(torot.file)); writeJsonAtomic(resolve(PUB, 'light.json'), JSON.stringify(light.file)); torotReport(torot.stats, rd<{ linked: Record<string, number> }>(resolve(ANALYSIS, 'torot-baseline.json')).linked, ANALYSIS,
    [['arch', 'PV-7 Архангельське Євангеліє 1092'], ['o18_26', 'PV-6 Прокопович «Владимир» 1705']].flatMap(([id, what]) => { const x = adm.findIndex(a => a.w.id === id); return x < 0 ? [] : [{ id: id!, what: what!, n: adm[x]!.w.tokens.length, linked: wLinked.get(id!) ?? 0 }] }))
  writeJsonAtomic(resolve(PUB, 'corpus.json'), JSON.stringify(corpus)); writeJsonAtomic(resolve(PUB, 'lexindex.json'), lexIdxJson)
  writeJsonAtomic(resolve(PUB, 'alt.json'), JSON.stringify(altFile(altStandardMap(await vesumLemmaList()))))   // SPEC 63 MM-10: VESUM :alt lemma → standard lemma, read by /lw
  {   // NP-2: toponym gazetteer + spelling-variant clusters over every capitalised token of the admitted witnesses
    const scan = new PlaceScan(); for (const { w } of adm) for (const t of w.tokens) scan.add(w, t)
    const places: PlacesFile = {
      format: 1, generated, N: sizes.N,
      source: { coords: 'Wikidata P625 (query.wikidata.org, 2026-10-12)', licence: 'CC0', tiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© учасники OpenStreetMap (ODbL)' },
      places: scan.result(),
    }
    writeJsonAtomic(resolve(PUB, 'places.json'), JSON.stringify(places)); lap(`places.json: ${places.places.length} toponyms`)
  }
  lap(`loanlabels.json: ${writeLoanLabels(ROOT, PUB)} lemmas; heteronyms.json: ${writeHeteronymCandidates(ROOT, PUB)} candidate forms; songs.json: ${writeSongs(PUB, generated, songVocab)} songs`)   // LW-2 / HT-1 exports for the W10 stream
  {   // BL-12
    const phPos = new Map(cards.map(c => [c.lemma, c.pos]))
    const p = writePhrases(ROOT, PUB, generated, ph.cands, ph.frames, { evidence: ph.evidence, posOf: l => phPos.get(l) ?? '' }); lap(`phrases.json (BL-12/12b): ${p.candidates} candidates (>= 2 source families or attested), ${p.formulas} single-family formulas, ${p.attestedTitles} attested idioms (${p.matched} matched); PH pages: ${p.details} (${p.withGloss} with gloss, ${p.withEtymology} with etymology, ${p.withEvidence} with corpus evidence)`)
  }
  { const u = writeUsage(lemTags, ROOT, PUB, generated, auto.kaikki, auto.usage); writeAutoReport(ROOT, auto, cards.map(c => c.lemma), u, generated); lap(`usage.json: ${u.lemmas} lemmas with a usage label (${u.vesum} VESUM, ${u.wikt} uk.wiktionary, ${u.kaikki} en.wiktionary/kaikki)`) }   // UL-1
  { const s = writeSenses(ROOT, PUB, cards.map(c => c.lemma)); lap(`senses.json (uk.wiktionary, BL-9): ${s.lemmas} of ${s.looked} looked-up lemmas have senses, ${s.senses} senses, ${s.withStress} with a stress`) }   // BL-9
  { writeJsonAtomic(resolve(ROOT, 'data/work/se.json'), JSON.stringify(Object.fromEntries(se.entries))); const t = se.stats; lap(`SE: ${t.lemmas} lemmas with sense rows (${t.rows} rows, ${t.groups} senses, ${t.aligned} aligned across dictionaries, ${t.transitions} transitions, ${t.typed} typed by a source, ${t.withHistory} with a historical dictionary row, ${t.kwicAssigned} corpus contexts assigned by evidence); rows per dictionary: ${Object.entries(t.byDict).map(([d, n]) => d + ' ' + n).join(', ')}`) }   // SE-1…SE-4: data/work/se.json → lm/se/ (build-parts)
  { const d = await writeDim(ROOT, PUB, generated, cards.map(c => c.lemma)); lap(`dim.json (MM-23): ${d.derivatives} derivatives of ${d.bases} bases (${d.sum} links from СУМ, ${d.wikt} from en.wiktionary)`) }
  { const e = writeEtymology(cards, ROOT, PUB, generated); lap(`etymology.json: ${e.entries} lemmas with an etymology, ${e.conflicts} conflict flags`) }   // ET-1…ET-3
  { const r = writeR2u(ROOT, PUB, generated, cards.map(c => c.lemma)); lap(`r2u.json (R2U-1): ${r.rows} articles from ${r.lookups} lookups, ${r.lemmasWith} kept lemmas appear as a native equivalent of a Russian headword`) }   // R2U-1
  { const c = writeCognates(cards, ROOT, PUB, generated); lap(`cognates.json (BL-15): ${c.entries} lemmas with Proto-Slavic counterparts, ${c.dated} with a dated counterpart, ${c.flags} ET-3 review flags`) }   // BL-15

  const rd2: ReportData = {
    generated, flags: { py: !opts.noPy, stress: !!stressJson, ru: Object.keys(ruJson).length > 0 }, authors: AUTHORS, witnesses: metas, routes, excluded,
    sizes, N: sizes.N, linked: NL, unresolved, topUnresolved, soundType, soundToken, detectHits, hints,
    lemmas: lemmaList.map(l => ({ lemma: l.display, tags: l.tags, f: l.f, perEpoch: l.perEpoch })), cards, keptCount: kept.length, allCount: lemmaList.length, spellings: lemmaList.reduce((s, l) => s + l.forms.size, 0),
    ltCorpus: ltCorpus.sort((a, b) => b.f - a.f), budget: { ...budget, lexindexBytes: Buffer.byteLength(lexIdxJson), lexindexAttested: attested },
    stressForms: stressJson ? Object.keys(stressJson.forms).length : 0, stressSource: stressJson?.source ?? '', ruForms: Object.keys(ruJson).length, fMax, epochs: epochRes.stats,
  }
  writeJsonAtomic(resolve(ANALYSIS, 'REPORT.md'), renderReport(rd2))

  // console summary
  console.log('\n=== SUMMARY ===')
  console.log(`corpus N=${sizes.N} linked=${NL} (${(100 * NL / sizes.N).toFixed(1)}%) unresolved=${unresolved}`)
  console.log('N per shev epoch:', Object.fromEntries(Object.entries(sizes.epoch).filter(([k]) => k.startsWith('shev.'))))
  const rtot: Record<string, number> = {}
  for (const r of Object.values(routes)) for (const [k, v] of Object.entries(r)) rtot[k] = (rtot[k] ?? 0) + v
  console.log('tokens linked per route:', rtot)
  console.log(`lemmas: ${lemmaList.length} total, ${kept.length} kept, ${cards.length} in lexicon.json; lexicon.json ${(budget.bytes / 1048576).toFixed(2)} MB + ${budget.shards} shards (max ${(budget.shardMax / 1024).toFixed(0)} KB), lexindex.json ${(Buffer.byteLength(lexIdxJson) / 1048576).toFixed(2)} MB`)
  lap('done → public/data/{corpus,lexicon,lexindex}.json, analysis/REPORT.md')
  void ruleById; void epochById; void unknown
  return { corpus, cards }
}

/** bytes of each column of the packed core (wire form [lemma, pos, paradigm, forms, first, claims, stats, paradigmKind?]) plus the evidence pool and tag table — what the core file is made of */
const WIRE_COLUMNS = ['lemma', 'pos', 'paradigm', 'forms', 'first', 'claims', 'stats', 'paradigmKind'] as const
export function coreBreakdown(core: ReturnType<typeof packCore>): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(WIRE_COLUMNS.map(c => [c, 0]))
  for (const w of core.cards) (w as unknown[]).forEach((v, i) => { out[WIRE_COLUMNS[i] ?? `col${i}`]! += Buffer.byteLength(JSON.stringify(v)) + 1 })
  out['ev (pool)'] = Buffer.byteLength(JSON.stringify(core.ev)); out['tags (table)'] = Buffer.byteLength(JSON.stringify(core.tags))
  if (!out['paradigmKind']) delete out['paradigmKind']
  return out
}
export const fmtBreakdown = (f: Record<string, number>) => Object.entries(f).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${(n / 1048576).toFixed(2)}`).join(', ') + ' MiB'

export interface LexStats { bytes: number; fields: Record<string, number>; pool: number; lemmas: number; shards: number; shardMax: number; shardMedian: number; shardTotal: number; epochBytes?: number; shrunk?: [number, number]; /** SPEC 63 PF-4 */ overflow?: [string, number, number][] }
/**
 * RS-1 pre-flight, run right after annotate: the same size arithmetic as writeLexicon, but only per lemma (about 60 MB of JSON, seconds).
 * Throws, naming the lemma and the piece, when a lemma cannot be split into PF-4 part files that fit `limit`; otherwise reports how many lemmas/buckets will overflow.
 */
export function preflightShards(cards: LemmaCard[], limit = SHARD_LIMIT): { big: [string, number][]; overBuckets: number; max: number } {
  const big: [string, number][] = [], perBucket = new Map<number, number>()
  let max = 0
  for (const c of cards) {
    const { detail } = splitCard(c), n = Buffer.byteLength(JSON.stringify(packShard([[c.lemma, detail]]))), b = bucketOf(c.lemma)
    max = Math.max(max, n); perBucket.set(b, (perBucket.get(b) ?? 0) + n)
    if (n > limit) { big.push([c.lemma, n]); try { splitDetail(c.lemma, detail, limit) } catch (e) { throw new Error(`pre-flight: ${(e as Error).message} (lemma «${c.lemma}» is ${n} B; PF-4 cannot split it)`) } }
  }
  return { big: big.sort((a, b) => b[1] - a[1]), overBuckets: [...perBucket.values()].filter(n => n > limit).length, max }
}

/**
 * B-5 (amendment 2026-10-11): writes <dir>/lexicon.json (core, ALL cards, evidence pooled) and <dir>/lex/<bucket>.json (detail shards, one per non-empty bucket; each lemma in exactly one).
 * Stale shards are removed first. Throws when core or a shard exceeds its limit — lemmas are never dropped to make it fit.
 */
export function writeLexicon(cards: LemmaCard[], dir: string, coreLimit = CORE_LIMIT, shardLimit = SHARD_LIMIT): LexStats {
  const parts = cards.map(splitCard), core = packCore(parts.map(p => p.core)), json = JSON.stringify(core), bytes = Buffer.byteLength(json)
  const fields = coreBreakdown(core)
  console.log(`  lexicon.json core ${bytes} B, ${cards.length} lemmas, per field: ${fmtBreakdown(fields)}`)
  if (bytes > coreLimit) throw new Error(`lexicon.json core ${bytes} B exceeds the ${coreLimit} B sanity cap (B-5a; fields: ${fmtBreakdown(fields)}): move fields to LemmaDetail instead of dropping lemmas`)
  const buckets = new Map<number, [string, LemmaDetail][]>()
  parts.forEach(p => { const b = bucketOf(p.core.lemma); (buckets.get(b) ?? buckets.set(b, []).get(b)!).push([p.core.lemma, p.detail]) })
  // RS-1: write into lex.next and swap after every shard passed validation; a throw below leaves the previous lex/ + lexicon.json untouched
  const lexFinal = resolve(dir, 'lex'), lex = resolve(dir, 'lex.next'); rmSync(lex, { recursive: true, force: true }); mkdirSync(lex, { recursive: true })
  const sizes: number[] = []
  let epochBytes = 0, shrunk1 = 0, shrunk2 = 0
  const overflow: [lemma: string, bytes: number, parts: number][] = []   // PF-4
  const sz = (es: [string, LemmaDetail][]) => Buffer.byteLength(JSON.stringify(packShard(es)))
  try {
  for (const [b, es0] of [...buckets].sort((x, y) => x[0] - y[0])) {
    let es = es0, s = JSON.stringify(packShard(es)), n = Buffer.byteLength(s)
    const bare = sz(es.map(([l, d]) => [l, (({ epochs: _e, ...r }) => r)(d)] as [string, LemmaDetail]))
    // EP-1.5: over budget → drop ctx in this shard, then cap cells at 2 spellings (largest lemmas first); n, ex and cells are never dropped
    if (n > shardLimit) { es = es.map(([l, d]) => [l, d.epochs ? { ...d, epochs: shrinkEpochs(d.epochs, 1) } : d]); shrunk1++; s = JSON.stringify(packShard(es)); n = Buffer.byteLength(s) }
    if (n > shardLimit) {
      const order = es.map(([l, d], i) => [i, d.epochs ? JSON.stringify(d.epochs).length : 0] as const).sort((x, y) => y[1] - x[1])
      es = [...es]; shrunk2++
      for (const [i] of order) { const [l, d] = es[i]!; if (!d.epochs) break; es[i] = [l, { ...d, epochs: shrinkEpochs(d.epochs, 2) }]; s = JSON.stringify(packShard(es)); n = Buffer.byteLength(s); if (n <= shardLimit) break }
    }
    // SPEC 63 PF-4: still over → nothing is shrunk or dropped; the biggest lemmas (unshrunk) move to part files lex/<b>-<k>.json, the bucket shard keeps a pointer (Shard.over)
    let over: Record<string, string[]> | undefined
    if (n > shardLimit) {
      const own = new Map(es0.map(([l, d]) => [l, sz([[l, d]])])), byBig = [...es0].sort((x, y) => own.get(y[0])! - own.get(x[0])!)
      const moved = new Set<string>(); let keep = es0
      while (keep.length && sz(keep) > shardLimit) { moved.add(byBig[moved.size]![0]); keep = es0.filter(([l]) => !moved.has(l)) }
      over = {}; let k = 0
      for (const [l, d] of es0) {
        if (!moved.has(l)) continue
        let parts: LemmaDetail[]
        try { parts = splitDetail(l, d, shardLimit) } catch (e) { throw new Error(`shard ${b}: ${(e as Error).message}; lemma sizes in the bucket: ${es0.map(([x]) => `${x} ${own.get(x)} B`).join(', ')} (B-5b, PF-4)`) }
        over[l] = parts.map(part => { const name = `${b}-${++k}`, t = JSON.stringify(packShard([[l, part]])); writeJsonAtomic(resolve(lex, `${name}.json`), t); sizes.push(Buffer.byteLength(t)); return name })
        overflow.push([l, own.get(l)!, parts.length])
      }
      es = keep; s = JSON.stringify({ ...packShard(es), over }); n = Buffer.byteLength(s)
      if (n > shardLimit) throw new Error(`shard ${b} (${es.length} lemmas) is ${n} B, over ${shardLimit} B even without ${[...moved].join(', ')} (B-5b, PF-4)`)
    }
    epochBytes += Math.max(0, n - bare)
    writeJsonAtomic(resolve(lex, `${b}.json`), s); sizes.push(n)
  }
  } catch (e) { rmSync(lex, { recursive: true, force: true }); throw e }
  sizes.sort((a, b) => a - b)
  if (overflow.length) console.log(`  PF-4: ${overflow.length} lemma(s) in part files: ${overflow.map(([l, n, p]) => `${l} ${n} B → ${p} part(s)`).join(', ')}`)
  swapDir(lex, lexFinal); writeJsonAtomic(resolve(dir, 'lexicon.json'), json)
  return { bytes, fields, pool: core.ev.length, lemmas: cards.length, shards: sizes.length, shardMax: sizes.at(-1) ?? 0, shardMedian: sizes[sizes.length >> 1] ?? 0, shardTotal: sizes.reduce((a, b) => a + b, 0), epochBytes, shrunk: [shrunk1, shrunk2], overflow }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv, fromAt = argv.findIndex(a => a === '--from' || a.startsWith('--from='))
  const from = fromAt < 0 ? undefined : argv[fromAt]!.includes('=') ? argv[fromAt]!.split('=')[1] : argv[fromAt + 1]
  await build({ noPy: argv.includes('--no-py'), allowStalePy: argv.includes('--allow-stale-py'), cache: { enabled: !argv.includes('--no-cache'), ...(from ? { from } : {}), ...(argv.includes('--cache-verify') ? { verify: true } : {}) } })
}
