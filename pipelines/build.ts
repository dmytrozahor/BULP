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
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { claim, D, unknown, type Claim, type Evidence } from '../core/evidence.ts'
import { derive as deriveRaw, ruleById, type Derivation } from '../core/phonology.ts'
import { fold as foldRaw } from '../core/orthography.ts'
import { assignEpoch, epochById } from '../core/epochs.ts'
import { key } from '../core/text.ts'
import { RUSYN_STATUS } from '../core/rules.ts'
import { REGIONS, regionOf } from './regions.ts'
import type { Author, CorpusMeta, FormCard, Kwic, LemmaCard, LemmaDetail, LexIndex, VesumHit, WitnessMeta, WitnessOut } from '../core/types.ts'
import { packCore } from '../core/pack.ts'
import { bucketOf, packShard, splitCard } from '../core/shard.ts'
import { AUTHORS, authorById } from './authors.ts'
import { FLAG_TAGS, lexIndexVesum, vesumIndex } from './vesum.ts'
import { ltIndex } from './lt.ts'
import { palatalClaim, R24_CITE } from '../core/palatalization.ts'
import { chooseLemma, linkOptions, posLabel, traceSteps, wantedKeys, ROUTE_RANK, type Chosen, type Env, type Route, type TypeCtx } from './build-link.ts'
import {
  admit, detectCard, firstClaim, lemmaContact, lemmaRusyn, lookupKeys, mergeClaims, originClaim, primaryEpoch, rankFirst, registerClaim, RULE_AXIS, selectForms, stressVariants, surzhykClaim, VESUM_LOC,
  type AnnEnv, type FirstCand, type FormAcc, type Ref, type StressJson,
} from './build-annotate.ts'
import { foldSpelling, mine, type PhraseDoc } from '../core/phrasemes.ts'
import { writePhrases } from './build-phrases.ts'
import { collocations, lemmaStats, type Counts, type Sizes } from './build-stats.ts'
import { renderReport, type ReportData } from './build-report.ts'
import { buildEpochs, shrinkEpochs } from './build-epochs.ts'
import { writeTexts } from './build-texts.ts'
import { gateKey, paradigmKindOf } from '../core/pos-gate.ts'
import { acceptParticiples, participleCandidates } from '../core/verbs.ts'
import { corrEvidence } from '../core/correspondences.ts'
import { PlaceScan, properClaim, type NameEvidence, type PlacesFile } from '../core/places.ts'
import { writeEtymology } from './build-etymology.ts'
import { writeCognates } from './build-cognates.ts'
import { writeUsage } from './build-usage.ts'
import { writeHeteronymCandidates, writeLoanLabels, writeSenses, writeSongs } from './build-extras.ts'
import { LYRICS_SOURCES, loadLyrics, vocabOf, type SongVocab } from './song-vocab.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = resolve(ROOT, 'data/work'), PUB = resolve(ROOT, 'public/data'), ANALYSIS = resolve(ROOT, 'analysis')
const CORE_LIMIT = 15 * 1024 * 1024, SHARD_LIMIT = 256 * 1024   // SPEC 20 B-5a / B-5b (raised 192 → 256 KiB for SPEC 50 epoch paradigms, see B-5b)
const execP = promisify(execFile)

interface NlpOut { model: string; outOfDomain?: boolean; tokens: ({ lemma?: string; upos?: string; feats?: string | null } | null)[] }
interface Loaded { w: WitnessOut; nlp?: NlpOut }
type LinkVal = Exclude<FormCard['link']['value'], 'unknown'>

const rd = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
const rawKey = (s: string) => s.normalize('NFC').toLowerCase()
const bump = <K>(m: Map<K, number>, k: K, n = 1) => m.set(k, (m.get(k) ?? 0) + n)

/** B-1: every data/work/<id>.json that is a WitnessOut (has tokens), with its Stanza output when the lengths agree. */
export function loadWitnesses(dir = WORK): Loaded[] {
  const out: Loaded[] = []
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith('.json') || /\.nlp\.json$|^stress|^ru|request/.test(f)) continue
    const w = rd<WitnessOut>(resolve(dir, f))
    if (!Array.isArray(w.tokens) || !w.id || !w.author) continue
    const np = resolve(dir, f.replace(/\.json$/, '.nlp.json'))
    let nlp = existsSync(np) ? rd<NlpOut>(np) : undefined
    if (nlp && nlp.tokens.length !== w.tokens.length) { console.warn(`  ! ${f}: nlp length ${nlp.tokens.length} ≠ ${w.tokens.length}, ignored`); nlp = undefined }
    out.push({ w, nlp })
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
  await execP(uv, ['run', '--project', 'nlp', 'python', `nlp/${script}`], { cwd: ROOT, maxBuffer: 1 << 26, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
}

export async function build(opts: { noPy?: boolean } = {}) {
  const t0 = Date.now(), lap = (m: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`)

  // ── 1. admission (B-1.1) ───────────────────────────────────────────────────────────────────────
  const loaded = loadWitnesses()
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
  const sizes: Sizes = { N: 0, epoch: {}, century: {}, witnesses: adm.map(({ w }) => ({ id: w.id, n: w.tokens.length })) }
  adm.forEach(({ w }, i) => {
    const n = w.tokens.length; sizes.N += n
    for (const id of meta[i]!.ids) sizes.epoch[id] = (sizes.epoch[id] ?? 0) + n
    const c = String(meta[i]!.cent); sizes.century[c] = (sizes.century[c] ?? 0) + n
  })

  // ── 2. token types, candidates, ONE VESUM pass ─────────────────────────────────────────────────
  const dmemo = new Map<string, Derivation>(), fmemo = new Map<string, ReturnType<typeof foldRaw>>()
  const derive: Env['derive'] = (s, oldI) => { const k = (oldI ? '1' : '0') + s; let d = dmemo.get(k); if (!d) dmemo.set(k, d = deriveRaw(s, { oldI })); return d }
  const fold: Env['fold'] = (s, orth) => { const k = (orth ?? '') + '|' + s; let d = fmemo.get(k); if (!d) fmemo.set(k, d = foldRaw(s, orth)); return d }

  const types: TypeCtx[] = [], typeIdx = new Map<string, number>(), typeCount: number[] = []
  const tix = adm.map(({ w, nlp }) => {
    const a = new Int32Array(w.tokens.length)
    w.tokens.forEach((t, i) => {
      const raw = rawKey(t.raw), lemma = t.lemma || undefined, stanza = !lemma ? nlp?.tokens[i]?.lemma || undefined : undefined
      const gate = w.lang === 'uk' ? undefined : gateKey(t.morph, nlp?.tokens[i]?.upos)   // FX-1: the token's own POS (TOROT manual, else Stanza)
      const k = `${w.lang}|${w.oldI ? 1 : 0}|${w.orth ?? ''}|${lemma ?? ''}|${stanza ?? ''}|${gate ?? ''}|${raw}`
      let x = typeIdx.get(k)
      if (x === undefined) { x = types.length; typeIdx.set(k, x); types.push({ lang: w.lang, oldI: !!w.oldI, orth: w.orth, raw, lemma, stanza, gate }); typeCount.push(0) }
      typeCount[x]!++; a[i] = x
    })
    return a
  })
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
  const forms = new Set<string>()
  for (const t of types) for (const k of wantedKeys(t, { derive, fold })) forms.add(k)
  lap(`${forms.size} candidate keys; VESUM pass 1`)
  const hits1 = (await vesumIndex(forms, new Set())).hits
  lap(`VESUM pass 1 done: ${hits1.size} keys with analyses`)

  // ── 3. link (B-2) ──────────────────────────────────────────────────────────────────────────────
  const env: Env = { hits: hits1, derive, fold }
  const opts1 = types.map(t => linkOptions(t, env))
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
  adm.forEach(({ w, nlp }, wi) => {
    const m = meta[wi]!, ids = new Int32Array(w.tokens.length).fill(-1), seg = Int32Array.from(w.tokens.map(t => t.s))
    const rt = routes[w.id] = {} as Record<string, number>
    let nl = 0
    w.tokens.forEach((tok, ti) => {
      const L = linked[tix[wi]![ti]!]
      if (!L) { bump(unres, rawKey(tok.raw)); return }
      const { c, route } = L, raw = rawKey(tok.raw), ref: Ref = { wi, ti }
      nl++; rt[route] = (rt[route] ?? 0) + 1
      let la = lemmas.get(c.id)
      if (!la) {
        la = { id: c.id, display: c.lemma, tags: c.hit.tags, cls: c.cls, idx: lemmaList.length, f: 0, perW: new Map(), perEpoch: new Map(), perCentury: new Map(), forms: new Map(), firstByW: new Map(), pre1400: false, dict: false, nm: { nMorph: 0, nNlp: 0 } }
        lemmas.set(c.id, la); lemmaList.push(la)
      }
      la.f++; bump(la.perW, w.id); bump(la.perCentury, m.cent); for (const e of m.ids) bump(la.perEpoch, e)
      if (w.date[1] < 1400) la.pre1400 = true
      if (w.witnessType === 'dictionary') la.dict = true
      ids[ti] = la.idx
      {   // NP-1: PROIEL Ne (TOROT morph) and Stanza PROPN, counted per lemma
        const nm = la.nm, up = nlp?.tokens[ti]?.upos
        if (tok.morph) { nm.nMorph++; if (/^Ne/.test(tok.morph)) { const t = (nm.torot ??= { w: w.id, loc: tok.loc, raw: tok.raw, morph: tok.morph, n: 0, of: 0 }); t.n++ } }
        if (up) { nm.nNlp++; if (up === 'PROPN') { const s = (nm.stanza ??= { w: w.id, loc: tok.loc, raw: tok.raw, n: 0, of: 0 }); s.n++ } }
      }
      { const fk = w.id + '\0' + raw, fb = la.firstByW.get(fk); if (fb) fb.n++; else la.firstByW.set(fk, { wid: w.id, ref, raw: tok.raw, route, loc: tok.loc, n: 1 }) }
      let fa = la.forms.get(raw)
      if (!fa) {
        la.forms.set(raw, fa = {
          raw, norm: w.lang === 'uk' ? key(tok.raw) : derive(raw, !!w.oldI).norm, modern: c.own.form || c.form, f: 0, oldI: !!w.oldI,
          date: w.date, latest: w.date, firstW: w.id, firstLoc: tok.loc, epochs: new Set(), route, chosen: c, ref, first: ref, kwic: [], perW: new Map(), orvVernacular: false, regions: new Set(),
        })
      } else if (ROUTE_RANK[route] < ROUTE_RANK[fa.route]) { fa.route = route; fa.chosen = c; fa.modern = c.own.form || c.form; fa.ref = ref }
      fa.f++
      if (w.date[1] < fa.date[1]) { fa.date = w.date; fa.firstW = w.id; fa.firstLoc = tok.loc; fa.first = ref }
      if (w.date[1] > fa.latest[1]) fa.latest = w.date
      if (m.pe) fa.epochs.add(m.pe)
      if (w.lang === 'orv') fa.orvVernacular = true
      if (w.region) fa.regions.add(w.id)   // B-3.6: region is provenance evidence for every admitted witness, any date
      if (fa.kwic.length < 6 && (fa.perW.get(w.id) ?? 0) < 2) fa.kwic.push(ref)
      bump(fa.perW, w.id)
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

  const fMax = Math.max(...lemmaList.map(l => l.f))
  const kept = lemmaList.filter(l => l.f >= 2 || l.pre1400 || l.dict)
  const keep = new Uint8Array(lemmaList.length); kept.forEach(l => (keep[l.idx] = 1))
  const fx = lemmaList.map(l => l.f), names = lemmaList.map(l => l.display)
  const coll = collocations(docs, fx, keep, names)
  lap(`${kept.length} lemmas kept (f ≥ 2, pre-1400 or dictionary headword); collocations for ${coll.size}`)

  // ── 5. selection, requests for the Python stages, LT corpus keys ──────────────────────────────
  const lt = await ltIndex()
  const sel = new Map<string, FormAcc[]>(kept.map(l => [l.id, selectForms([...l.forms.values()], 12)]))
  const stressReq = new Set<string>(), ruReq = new Set<string>()
  const ltCorpus: ReportData['ltCorpus'] = []
  types.forEach((t, x) => { const e = lt[key(t.raw)]; if (e && t.lang === 'uk' && typeCount[x]! > 0) { ltCorpus.push({ form: key(t.raw), f: typeCount[x]!, file: e[0] }); ruReq.add(key(t.raw)) } })
  for (const l of kept) {
    stressReq.add(l.display)
    for (const fa of sel.get(l.id)!) {
      if (fa.modern) stressReq.add(fa.modern)
      if (fa.chosen.tier > 0 || lt[key(fa.raw)]) ruReq.add(key(fa.raw))
    }
    if (lt[l.id] || /:(bad|subst|slang|alt)\b/.test(':' + l.tags)) ruReq.add(l.id)
  }
  mkdirSync(WORK, { recursive: true })
  writeFileSync(resolve(WORK, 'stress-request.json'), JSON.stringify([...stressReq]))
  writeFileSync(resolve(WORK, 'ru-request.json'), JSON.stringify([...ruReq]))
  lap(`requests: stress ${stressReq.size}, ru ${ruReq.size}`)

  // dry run: which VESUM keys will detect() look up?
  const dryEnv: AnnEnv = { hits: new Map(), lt, ru: {}, derive: (s, oldI) => derive(s, oldI).candidates.map(c => c.form) }
  const keys2 = new Set<string>(kept.map(l => l.id))
  for (const l of kept) for (const fa of sel.get(l.id)!) for (const k of lookupKeys(fa, dryEnv)) keys2.add(k)

  const py = async () => {
    if (opts.noPy) return
    try { await runPy('stress.py'); await runPy('russian_check.py') } catch (e) { console.warn('  ! python stage failed, using existing outputs if any:', String((e as Error).message).slice(0, 300)) }
  }
  lap(`VESUM pass 2 (${keys2.size} keys, ${kept.length} paradigms) + python stages`)
  const [v2] = await Promise.all([vesumIndex(keys2, new Map(kept.map(l => [l.id, l.cls] as const))), py()])
  lap('pass 2 done')
  {   // BL-8: participles / adverbial participles are VESUM lemmas of their own — link them to the kept verbs by construction + VESUM oracle (core/verbs.ts) and append them to the verb paradigm
    const cand = new Map<string, string[]>()
    for (const l of kept) if (paradigmKindOf(v2.lemmaTags.get(l.id) ?? l.tags) === 'verb') { const c = participleCandidates(v2.paradigms.get(l.id) ?? []); if (c.length) cand.set(l.id, c) }
    const ph = (await vesumIndex(new Set([...cand.values()].flat()), new Set())).hits
    let n = 0
    for (const [id, c] of cand) { const add = acceptParticiples(v2.paradigms.get(id)!, c, ph, key); if (add.length) { v2.paradigms.get(id)!.push(...add); n += add.length } }
    lap(`verb participles linked: ${n} forms for ${cand.size} verbs with candidates`)
  }
  const stressJson = existsSync(resolve(WORK, 'stress.json')) ? rd<StressJson>(resolve(WORK, 'stress.json')) : undefined
  const ruJson = existsSync(resolve(WORK, 'ru.json')) ? rd<{ forms: AnnEnv['ru'] }>(resolve(WORK, 'ru.json')).forms : {}
  if (!stressJson) console.warn('  ! no stress.json — stress variants empty')
  else {   // GAPS #5: a stale stress.json (python stage skipped/failed, UV_BIN unset) silently loses stress for new lemmas — say so
    const miss = [...stressReq].filter(f => !(f in stressJson.forms)).length
    if (miss) console.warn(`  ! stress.json lacks ${miss} of ${stressReq.size} requested forms (stale: run without --no-py, set UV_BIN)`)
    lap(`stress: ${stressReq.size - miss}/${stressReq.size} requested forms answered, ${[...stressReq].filter(f => stressJson.forms[f]?.length).length} with a dictionary stress`)
  }
  const annEnv: AnnEnv = { hits: v2.hits, lt, ru: ruJson, derive: dryEnv.derive }

  // ── 5b. epoch paradigms of the kept noun lemmas (SPEC 50 EP-3/EP-4) ───────────────────────────
  const nounLemmas = new Map(kept.flatMap(l => { const t = v2.lemmaTags.get(l.id) ?? l.tags; const k = paradigmKindOf(t); return k === 'noun' || k === 'pron' || k === 'verb' ? [[l.id, { display: l.display, tags: t }] as const] : [] }))   // FX-5: nouns get the noun grid, pronouns (VESUM `pron` segment) the pronominal grid, BL-8: verbs the verb grid; other POS none
  const PROBE = ['рука', 'земля', 'князь', 'город', 'син', 'я', 'ти', 'себе', 'ми', 'ви', 'він', 'аз', 'да']   // FX-6 test lemmas
  const epochRes = buildEpochs({
    probe: new Set(PROBE), kindOf: id => { const l = lemmas.get(id); return l ? paradigmKindOf(v2.lemmaTags.get(id) ?? l.tags) : '' },
    adm, epochsOf: meta.map(m => (m.sh.value === 'unknown' ? [] : m.sh.value.epochs)), tix, linked, lemmas: nounLemmas, hits: hits1,
    derive: (s, oldI) => derive(s, oldI), vesumLoc: VESUM_LOC,
  })
  lap(`epoch paradigms: ${epochRes.epochs.size} of ${nounLemmas.size} noun lemmas have attested cells`)

  // ── 6. annotations (B-3) ──────────────────────────────────────────────────────────────────────
  const witMap = new Map(adm.map(l => [l.w.id, l.w]))
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

  const soundType: Record<string, number> = {}, soundToken: Record<string, number> = {}
  for (const l of lemmaList) for (const fa of l.forms.values()) for (const id of fa.chosen.own.trace) { soundType[id] = (soundType[id] ?? 0) + 1; soundToken[id] = (soundToken[id] ?? 0) + fa.f }
  const detectHits: Record<string, number> = {}, hints: Record<string, number> = {}

  const regionN = REGIONS.map(r => ({ code: r.code, name: r.name, oblasts: r.oblasts, N: adm.filter(({ w }) => regionOf(w.region) === r.code).reduce((s, { w }) => s + w.tokens.length, 0) }))
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
        raw: fa.raw, norm: fa.norm, modern: fa.modern, f: fa.f, date: fa.date, link,
        derivation: traceSteps(fa.norm, c.own), claims: det.claims, hints: det.hints, epochs: [...fa.epochs], kwic: fa.kwic.map(kwicOf),
        byW: Object.fromEntries([...fa.perW].sort((a, b) => a[0].localeCompare(b[0]))),   // BL-6c: true per-witness counts of this spelling
      }
      return { card, acc: fa }
    })
    const lc = lemmaContact(la.display, annEnv)
    const modernCards = pairs.filter(p => p.card.epochs.includes('shev.modern'))
    // first (B-3.5): one candidate per (witness, spelling) over ALL spellings of the lemma, ranked by rankFirst
    const cands: FirstCand[] = [...la.firstByW.values()].map(x => ({ witness: x.wid, author: authorById[witMap.get(x.wid)!.author]!, date: witMap.get(x.wid)!.date, witnessType: witMap.get(x.wid)!.witnessType, loc: x.loc, form: x.raw, route: x.route, n: x.n }))
    const refOf = new Map(cands.map((c, i) => [c, [...la.firstByW.values()][i]!.ref]))
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
    const order = lemmaStatsInput(la)
    const stats = lemmaStats(order, fMax, sizes, coll.get(la.idx) ?? [])
    stats.byRegion = regionN.filter(r => r.N > 0).map(r => ({ code: r.code, f: [...la.perW].reduce((s, [wid, y]) => s + (regionOf(witMap.get(wid)?.region) === r.code ? y : 0), 0), N: r.N }))
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
      claims: { register: registerClaim(paradigm, la.display), surzhyk: surzhykClaim(modernCards.map(p => p.card.claims), lc), origin: originClaim(pairs), oldest, dialect: dia, rusyn: lemmaRusyn(modernCards.map(p => p.card)), ...(proper ? { proper } : {}), ...(pal ? { palatalization: pal } : {}) },
    })
  }
  cards.sort((a, b) => b.stats.f - a.stats.f || a.lemma.localeCompare(b.lemma, 'uk'))
  lap(`${cards.length} lemma cards annotated`)


  // ── 8. outputs ────────────────────────────────────────────────────────────────────────────────
  const generated = new Date().toISOString()
  const metas: WitnessMeta[] = adm.map(({ w, nlp }, i) => {
    const { tokens: _t, dropped, ...rest } = w
    return { ...rest, n: w.tokens.length, linked: wLinked.get(w.id) ?? 0, dropped, epochShev: meta[i]!.sh, epochWl: meta[i]!.wl, ...(nlp?.outOfDomain ? { outOfDomain: true } : {}) }
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
  lap(`lexicon.json core ${(budget.bytes / 1048576).toFixed(2)} MB, ${budget.shards} shards (max ${(budget.shardMax / 1024).toFixed(0)} KB, median ${(budget.shardMedian / 1024).toFixed(0)} KB)`)
  lap(`texts: ${(writeTexts(adm.map(a => a.w), PUB) / 1048576).toFixed(1)} MB (shipped on the data branch, B-5f)`)
  writeFileSync(resolve(PUB, 'corpus.json'), JSON.stringify(corpus)); writeFileSync(resolve(PUB, 'lexindex.json'), lexIdxJson)
  {   // NP-2: toponym gazetteer + spelling-variant clusters over every capitalised token of the admitted witnesses
    const scan = new PlaceScan(); for (const { w } of adm) for (const t of w.tokens) scan.add(w, t)
    const places: PlacesFile = {
      format: 1, generated, N: sizes.N,
      source: { coords: 'Wikidata P625 (query.wikidata.org, 2026-10-12)', licence: 'CC0', tiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© учасники OpenStreetMap (ODbL)' },
      places: scan.result(),
    }
    writeFileSync(resolve(PUB, 'places.json'), JSON.stringify(places)); lap(`places.json: ${places.places.length} toponyms`)
  }
  lap(`loanlabels.json: ${writeLoanLabels(ROOT, PUB)} lemmas; heteronyms.json: ${writeHeteronymCandidates(ROOT, PUB)} candidate forms; songs.json: ${writeSongs(PUB, generated, songVocab)} songs`)   // LW-2 / HT-1 exports for the W10 stream
  {   // BL-12
    const cands = mine(phraseDocs, k => (k >= 0 ? names[k]! : '~' + rawNames[-2 - k]!), (wi, ti) => adm[wi]!.w.tokens[ti]!.raw, { top: 40000 })
    const p = writePhrases(ROOT, PUB, generated, cands); lap(`phrases.json (BL-12/12b): ${p.candidates} candidates (>= 2 source families or attested), ${p.formulas} single-family formulas, ${p.attestedTitles} attested idioms (${p.matched} matched)`)
  }
  { const u = writeUsage(lemTags, ROOT, PUB, generated); lap(`usage.json: ${u.lemmas} lemmas with a usage label (${u.vesum} VESUM, ${u.wikt} Wiktionary)`) }   // UL-1
  { const s = writeSenses(ROOT, PUB, cards.map(c => c.lemma)); lap(`senses.json (uk.wiktionary, BL-9): ${s.lemmas} of ${s.looked} looked-up lemmas have senses, ${s.senses} senses, ${s.withStress} with a stress`) }   // BL-9
  { const e = writeEtymology(cards, ROOT, PUB, generated); lap(`etymology.json: ${e.entries} lemmas with an etymology, ${e.conflicts} conflict flags`) }   // ET-1…ET-3
  { const c = writeCognates(cards, ROOT, PUB, generated); lap(`cognates.json (BL-15): ${c.entries} lemmas with Proto-Slavic counterparts, ${c.dated} with a dated counterpart, ${c.flags} ET-3 review flags`) }   // BL-15

  const rd2: ReportData = {
    generated, flags: { py: !opts.noPy, stress: !!stressJson, ru: Object.keys(ruJson).length > 0 }, authors: AUTHORS, witnesses: metas, routes, excluded,
    sizes, N: sizes.N, linked: NL, unresolved, topUnresolved, soundType, soundToken, detectHits, hints,
    lemmas: lemmaList.map(l => ({ lemma: l.display, tags: l.tags, f: l.f, perEpoch: l.perEpoch })), cards, keptCount: kept.length, allCount: lemmaList.length, spellings: lemmaList.reduce((s, l) => s + l.forms.size, 0),
    ltCorpus: ltCorpus.sort((a, b) => b.f - a.f), budget: { ...budget, lexindexBytes: Buffer.byteLength(lexIdxJson), lexindexAttested: attested },
    stressForms: stressJson ? Object.keys(stressJson.forms).length : 0, stressSource: stressJson?.source ?? '', ruForms: Object.keys(ruJson).length, fMax, epochs: epochRes.stats,
  }
  writeFileSync(resolve(ANALYSIS, 'REPORT.md'), renderReport(rd2))

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

const lemmaStatsInput = (la: LemmaAcc): Counts => ({ f: la.f, perW: la.perW, perEpoch: la.perEpoch, perCentury: la.perCentury })

export interface LexStats { bytes: number; pool: number; lemmas: number; shards: number; shardMax: number; shardMedian: number; shardTotal: number; epochBytes?: number; shrunk?: [number, number] }
/**
 * B-5 (amendment 2026-10-11): writes <dir>/lexicon.json (core, ALL cards, evidence pooled) and <dir>/lex/<bucket>.json (detail shards, one per non-empty bucket; each lemma in exactly one).
 * Stale shards are removed first. Throws when core or a shard exceeds its limit — lemmas are never dropped to make it fit.
 */
export function writeLexicon(cards: LemmaCard[], dir: string, coreLimit = CORE_LIMIT, shardLimit = SHARD_LIMIT): LexStats {
  const parts = cards.map(splitCard), core = packCore(parts.map(p => p.core)), json = JSON.stringify(core), bytes = Buffer.byteLength(json)
  if (bytes > coreLimit) throw new Error(`lexicon.json core ${bytes} B exceeds ${coreLimit} B (B-5a): move fields to LemmaDetail instead of dropping lemmas`)
  const buckets = new Map<number, [string, LemmaDetail][]>()
  parts.forEach(p => { const b = bucketOf(p.core.lemma); (buckets.get(b) ?? buckets.set(b, []).get(b)!).push([p.core.lemma, p.detail]) })
  const lex = resolve(dir, 'lex'); rmSync(lex, { recursive: true, force: true }); mkdirSync(lex, { recursive: true })
  const sizes: number[] = []
  let epochBytes = 0, shrunk1 = 0, shrunk2 = 0
  const sz = (es: [string, LemmaDetail][]) => Buffer.byteLength(JSON.stringify(packShard(es)))
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
    if (n > shardLimit) throw new Error(`shard ${b} (${es.length} lemmas) is ${n} B, over ${shardLimit} B (B-5b)`)
    epochBytes += Math.max(0, n - bare)
    writeFileSync(resolve(lex, `${b}.json`), s); sizes.push(n)
  }
  sizes.sort((a, b) => a - b)
  writeFileSync(resolve(dir, 'lexicon.json'), json)
  return { bytes, pool: core.ev.length, lemmas: cards.length, shards: sizes.length, shardMax: sizes.at(-1) ?? 0, shardMedian: sizes[sizes.length >> 1] ?? 0, shardTotal: sizes.reduce((a, b) => a + b, 0), epochBytes, shrunk: [shrunk1, shrunk2] }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build({ noPy: process.argv.includes('--no-py') })
}
