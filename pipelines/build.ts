/**
 * BUILD stage (SPEC 20): data/work/*.json (+ .nlp.json, stress.json, ru.json) → public/data/{corpus,lexicon,lexindex}.json + analysis/REPORT.md.
 * `npm run build:data` · flags: --no-py (reuse existing stress.json/ru.json instead of running the Python scripts).
 *
 * > P-1.1 "Every label the system emits is a Claim = { value, evidence } with evidence.length ≥ 1." — every label below comes from claim()
 * > M-3.3 "Unlinked tokens are kept as unresolved and counted; nothing is guessed."
 * > B-5  "lexicon.json: lemmas with f ≥ 2 or with ≥1 pre-1400 attestation; ≤ 6 KWIC per FormCard, ≤ 12 FormCards per lemma. Target ≤ 15 MB raw."
 *
 * Passes over VESUM (7M lines, ~15 s each): (1) every candidate form/lemma of every token type; (2) paradigms of the kept lemmas plus every key
 * detect() asks for (found by a dry run) — so rule evaluation never needs a third lookup. (3) lexIndexVesum for lexindex.json.
 */
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { claim, D, unknown, type Claim, type Evidence } from '../core/evidence.ts'
import { derive as deriveRaw, ruleById, type Derivation } from '../core/phonology.ts'
import { fold as foldRaw } from '../core/orthography.ts'
import { assignEpoch, epochById } from '../core/epochs.ts'
import { key } from '../core/text.ts'
import { RUSYN_STATUS } from '../core/rules.ts'
import type { Author, CorpusMeta, FormCard, Kwic, LemmaCard, LexIndex, VesumHit, WitnessMeta, WitnessOut } from '../core/types.ts'
import { AUTHORS, authorById } from './authors.ts'
import { FLAG_TAGS, lexIndexVesum, vesumIndex } from './vesum.ts'
import { ltIndex } from './lt.ts'
import { chooseLemma, linkOptions, posLabel, traceSteps, wantedKeys, ROUTE_RANK, type Chosen, type Env, type Route, type TypeCtx } from './build-link.ts'
import {
  admit, detectCard, firstClaim, lemmaContact, lemmaRusyn, lookupKeys, mergeClaims, originClaim, primaryEpoch, registerClaim, RULE_AXIS, selectForms, stressVariants, surzhykClaim, VESUM_LOC,
  type AnnEnv, type FirstCand, type FormAcc, type Ref, type StressJson,
} from './build-annotate.ts'
import { collocations, lemmaStats, type Counts, type Sizes } from './build-stats.ts'
import { renderReport, type ReportData } from './build-report.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = resolve(ROOT, 'data/work'), PUB = resolve(ROOT, 'public/data'), ANALYSIS = resolve(ROOT, 'analysis')
const DEFAULT_UV = 'C:\\Users\\User\\.claude\\jobs\\293095c9\\tmp\\uv\\uv.exe'
const LIMIT_BYTES = 15 * 1024 * 1024
const execP = promisify(execFile)

interface NlpOut { model: string; outOfDomain?: boolean; tokens: ({ lemma?: string } | null)[] }
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
  id: string; display: string; tags: string; idx: number; f: number
  perW: Map<string, number>; perEpoch: Map<string, number>; perCentury: Map<number, number>
  forms: Map<string, FormAcc>
  firstByW: Map<string, { ref: Ref; raw: string; route: Route; loc: string }>
  pre1400: boolean
}

async function runPy(script: string): Promise<void> {
  const uv = process.env['UV_BIN'] ?? (existsSync(DEFAULT_UV) ? DEFAULT_UV : 'uv')
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
      const k = `${w.lang}|${w.oldI ? 1 : 0}|${w.orth ?? ''}|${lemma ?? ''}|${stanza ?? ''}|${raw}`
      let x = typeIdx.get(k)
      if (x === undefined) { x = types.length; typeIdx.set(k, x); types.push({ lang: w.lang, oldI: !!w.oldI, orth: w.orth, raw, lemma, stanza }); typeCount.push(0) }
      typeCount[x]!++; a[i] = x
    })
    return a
  })
  lap(`${types.length} token types`)
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

  // ── 4. aggregate tokens into lemmas / spellings ────────────────────────────────────────────────
  const lemmas = new Map<string, LemmaAcc>(), lemmaList: LemmaAcc[] = []
  const routes: Record<string, Record<string, number>> = {}, wLinked = new Map<string, number>()
  const unres = new Map<string, number>(), docs: { id: Int32Array; seg: Int32Array }[] = []
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
        la = { id: c.id, display: c.lemma, tags: c.hit.tags, idx: lemmaList.length, f: 0, perW: new Map(), perEpoch: new Map(), perCentury: new Map(), forms: new Map(), firstByW: new Map(), pre1400: false }
        lemmas.set(c.id, la); lemmaList.push(la)
      }
      la.f++; bump(la.perW, w.id); bump(la.perCentury, m.cent); for (const e of m.ids) bump(la.perEpoch, e)
      if (w.date[1] < 1400) la.pre1400 = true
      ids[ti] = la.idx
      if (!la.firstByW.has(w.id)) la.firstByW.set(w.id, { ref, raw: tok.raw, route, loc: tok.loc })
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
      if (w.region && w.date[1] >= 1798) fa.regions.add(w.id)
      if (fa.kwic.length < 6 && (fa.perW.get(w.id) ?? 0) < 2) fa.kwic.push(ref)
      bump(fa.perW, w.id)
    })
    wLinked.set(w.id, nl); docs.push({ id: ids, seg })
    void nlp
  })
  const NL = [...wLinked.values()].reduce((a, b) => a + b, 0), unresolved = sizes.N - NL
  lap(`linked ${NL}/${sizes.N} tokens (${(100 * NL / sizes.N).toFixed(1)}%), ${lemmaList.length} lemmas`)

  const fMax = Math.max(...lemmaList.map(l => l.f))
  const kept = lemmaList.filter(l => l.f >= 2 || l.pre1400)
  const keep = new Uint8Array(lemmaList.length); kept.forEach(l => (keep[l.idx] = 1))
  const fx = lemmaList.map(l => l.f), names = lemmaList.map(l => l.display)
  const coll = collocations(docs, fx, keep, names)
  lap(`${kept.length} lemmas kept (f ≥ 2 or pre-1400); collocations for ${coll.size}`)

  // ── 5. selection, requests for the Python stages, LT corpus keys ──────────────────────────────
  const lt = await ltIndex()
  const sel = new Map<string, FormAcc[]>(kept.map(l => [l.id, selectForms([...l.forms.values()], 12)]))
  const stressReq = new Set<string>(), ruReq = new Set<string>()
  const ltCorpus: ReportData['ltCorpus'] = []
  types.forEach((t, x) => { const e = lt[key(t.raw)]; if (e && t.lang === 'uk') { ltCorpus.push({ form: key(t.raw), f: typeCount[x]!, file: e[0] }); ruReq.add(key(t.raw)) } })
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
  const [v2] = await Promise.all([vesumIndex(keys2, new Set(kept.map(l => l.id))), py()])
  lap('pass 2 done')
  const stressJson = existsSync(resolve(WORK, 'stress.json')) ? rd<StressJson>(resolve(WORK, 'stress.json')) : undefined
  const ruJson = existsSync(resolve(WORK, 'ru.json')) ? rd<{ forms: AnnEnv['ru'] }>(resolve(WORK, 'ru.json')).forms : {}
  if (!stressJson) console.warn('  ! no stress.json — stress variants empty')
  const annEnv: AnnEnv = { hits: v2.hits, lt, ru: ruJson, derive: dryEnv.derive }

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
    if (fa.route === 'torot-lemma') ev.push(D('TOROT', `${w.id}: ${tok.loc}`, `${tok.raw} ← лема «${tok.lemma}»${tok.morph ? ' · ' + tok.morph : ''}`, 'наукова анотація TOROT'))
    else if (fa.route === 'stanza-lemma') ev.push(D('stanza orv', nlp?.model ?? 'stanza orv', `${tok.raw} → «${nlp?.tokens[fa.ref.ti]?.lemma}»`, `модельна лематизація, не словниковий факт (P-1.7)${nlp?.outOfDomain ? '; текст поза доменом моделі' : ''}`))
    else ev.push(D(w.id, tok.loc, `${tok.raw} → ${c.own.form}${c.own.trace.length ? ' [' + c.own.trace.join('→') + ']' : ''}`))
    return ev
  }

  const soundType: Record<string, number> = {}, soundToken: Record<string, number> = {}
  for (const l of lemmaList) for (const fa of l.forms.values()) for (const id of fa.chosen.own.trace) { soundType[id] = (soundType[id] ?? 0) + 1; soundToken[id] = (soundToken[id] ?? 0) + fa.f }
  const detectHits: Record<string, number> = {}, hints: Record<string, number> = {}

  const cards: LemmaCard[] = []
  for (const la of kept) {
    const accs = sel.get(la.id)!
    const paradigm = (() => { const seen = new Set<string>(); return (v2.paradigms.get(la.id) ?? []).filter(p => { const k = p.form + '\0' + p.tags; return seen.has(k) ? false : (seen.add(k), true) }) })()
    const pairs = accs.map(fa => {
      const det = detectCard(fa, annEnv)
      for (const c of Object.values(det.claims)) for (const r of (c.method ?? '').split('+')) detectHits[r] = (detectHits[r] ?? 0) + 1
      for (const h of det.hints) hints[h] = (hints[h] ?? 0) + 1
      const c = fa.chosen
      const link: FormCard['link'] = claim<LinkVal>({ lemma: c.lemma, form: c.form, route: fa.route as LinkVal['route'], alternatives: c.alternatives }, linkEvidence(fa),
        { method: `${fa.route}${c.own.trace.length ? '[' + c.own.trace.join('+') + ']' : ''}${c.alternatives.length ? `;tie=${c.decidedBy}` : ''}` })
      const card: FormCard = {
        raw: fa.raw, norm: fa.norm, modern: fa.modern, f: fa.f, date: fa.date, link,
        derivation: traceSteps(fa.norm, c.own), claims: det.claims, hints: det.hints, epochs: [...fa.epochs], kwic: fa.kwic.map(kwicOf),
      }
      return { card, acc: fa }
    })
    const lc = lemmaContact(la.display, annEnv)
    const modernCards = pairs.filter(p => p.card.epochs.includes('shev.modern'))
    // oldest (B-3.4): over ALL spellings of the lemma, not only the selected ones
    const old = [...la.forms.values()].sort((a, b) => a.date[1] - b.date[1] || b.f - a.f)[0]!
    const oldW = witMap.get(old.firstW)!
    const oldest: LemmaCard['claims']['oldest'] = claim({ form: old.raw, date: old.date, epoch: primaryEpoch(old.date, 'shev') ?? 'unknown' },
      [D(old.firstW, old.firstLoc, kline(old.first)), oldW.dateCite], { method: 'min date.to' })
    // first (B-3.5)
    const cands: FirstCand[] = [...la.firstByW].map(([wid, x]) => ({ witness: wid, author: authorById[witMap.get(wid)!.author]!, date: witMap.get(wid)!.date, witnessType: witMap.get(wid)!.witnessType, loc: x.loc, form: x.raw, route: x.route }))
    const refOf = new Map(cands.map(c => [c, la.firstByW.get(c.witness)!.ref]))
    const first = firstClaim(cands, witMap, c => kline(refOf.get(c)!))
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
    const lemmaPos = v2.lemmaTags.get(la.id) ?? la.tags
    cards.push({
      lemma: la.display, pos: posLabel(lemmaPos), paradigm,
      stress: stressVariants([la.display, ...new Set(accs.map(a => a.modern))], stressJson),
      forms: pairs.map(p => p.card), first, stats,
      claims: { register: registerClaim(paradigm, la.display), surzhyk: surzhykClaim(modernCards.map(p => p.card.claims), lc), origin: originClaim(pairs), oldest, dialect: dia, rusyn: lemmaRusyn(modernCards.map(p => p.card)) },
    })
  }
  cards.sort((a, b) => b.stats.f - a.stats.f || a.lemma.localeCompare(b.lemma, 'uk'))
  lap(`${cards.length} lemma cards annotated`)

  // ── 7. size limits (B-5) ──────────────────────────────────────────────────────────────────────
  const budget = fitBudget(cards, kept.filter(l => l.pre1400).map(l => l.display))
  lap(`lexicon.json ${(budget.bytes / 1048576).toFixed(1)} MB (tiers ${JSON.stringify(budget.tiers)}, dropped ${budget.dropped})`)

  // ── 8. outputs ────────────────────────────────────────────────────────────────────────────────
  const generated = new Date().toISOString()
  const metas: WitnessMeta[] = adm.map(({ w }, i) => {
    const { tokens: _t, dropped, ...rest } = w
    return { ...rest, n: w.tokens.length, linked: wLinked.get(w.id) ?? 0, dropped, epochShev: meta[i]!.sh, epochWl: meta[i]!.wl }
  })
  const topUnresolved = [...unres].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 200).map(([form, f]) => ({ form, f }))
  const corpus: CorpusMeta = { generated, authors: AUTHORS, witnesses: metas, epochSizes: sizes.epoch, centurySizes: sizes.century, N: sizes.N, linked: NL, unresolved, topUnresolved, rusynStatus: RUSYN_STATUS, regions: [] /* B5 */ }

  const lexV = await lexIndexVesum()
  const flagged = (hs: VesumHit[]) => hs.filter(h => h.tags.split(':').some(t => (FLAG_TAGS as readonly string[]).includes(t)))
  let attested = 0
  for (const c of cards) for (const f of c.forms) for (const k of [key(f.raw), key(f.modern)]) {
    const hs = flagged(v2.hits.get(k) ?? []); if (hs.length && !lexV[k]) { lexV[k] = hs; attested++ }
  }
  const lexindex: LexIndex = { generated, lt, vesum: lexV }

  mkdirSync(PUB, { recursive: true }); mkdirSync(ANALYSIS, { recursive: true })
  const lexJson = JSON.stringify(budget.cards), lexIdxJson = JSON.stringify(lexindex)
  writeFileSync(resolve(PUB, 'lexicon.json'), lexJson); writeFileSync(resolve(PUB, 'corpus.json'), JSON.stringify(corpus)); writeFileSync(resolve(PUB, 'lexindex.json'), lexIdxJson)

  const rd2: ReportData = {
    generated, flags: { py: !opts.noPy, stress: !!stressJson, ru: Object.keys(ruJson).length > 0 }, authors: AUTHORS, witnesses: metas, routes, excluded,
    sizes, N: sizes.N, linked: NL, unresolved, topUnresolved, soundType, soundToken, detectHits, hints,
    lemmas: lemmaList.map(l => ({ lemma: l.display, tags: l.tags, f: l.f, perEpoch: l.perEpoch })), cards: budget.cards, keptCount: kept.length, allCount: lemmaList.length, spellings: lemmaList.reduce((s, l) => s + l.forms.size, 0),
    ltCorpus: ltCorpus.sort((a, b) => b.f - a.f), budget: { bytes: budget.bytes, tiers: budget.tiers, dropped: budget.dropped, lexindexBytes: Buffer.byteLength(lexIdxJson), lexindexAttested: attested },
    stressForms: stressJson ? Object.keys(stressJson.forms).length : 0, stressSource: stressJson?.source ?? '', ruForms: Object.keys(ruJson).length, fMax,
  }
  writeFileSync(resolve(ANALYSIS, 'REPORT.md'), renderReport(rd2))

  // console summary
  console.log('\n=== SUMMARY ===')
  console.log(`corpus N=${sizes.N} linked=${NL} (${(100 * NL / sizes.N).toFixed(1)}%) unresolved=${unresolved}`)
  console.log('N per shev epoch:', Object.fromEntries(Object.entries(sizes.epoch).filter(([k]) => k.startsWith('shev.'))))
  const rtot: Record<string, number> = {}
  for (const r of Object.values(routes)) for (const [k, v] of Object.entries(r)) rtot[k] = (rtot[k] ?? 0) + v
  console.log('tokens linked per route:', rtot)
  console.log(`lemmas: ${lemmaList.length} total, ${kept.length} kept, ${budget.cards.length} in lexicon.json; lexicon.json ${(Buffer.byteLength(lexJson) / 1048576).toFixed(2)} MB, lexindex.json ${(Buffer.byteLength(lexIdxJson) / 1048576).toFixed(2)} MB`)
  lap('done → public/data/{corpus,lexicon,lexindex}.json, analysis/REPORT.md')
  void ruleById; void epochById; void unknown
  return { corpus, cards: budget.cards }
}

const lemmaStatsInput = (la: LemmaAcc): Counts => ({ f: la.f, perW: la.perW, perEpoch: la.perEpoch, perCentury: la.perCentury })

/** B-5: tier t keeps (kwic, forms) = TIERS[t]; lemmas are processed by rank, each gets the richest tier within ~6× the average remaining budget. */
const TIERS: [number, number][] = [[6, 12], [3, 8], [2, 6], [1, 4], [0, 2]]
export function fitBudget(cards: LemmaCard[], pre1400: string[]): { cards: LemmaCard[]; bytes: number; tiers: number[]; dropped: number } {
  const slim = (c: LemmaCard, [k, n]: [number, number]): LemmaCard => ({ ...c, forms: selectForms(c.forms, n).map(f => ({ ...f, kwic: f.kwic.slice(0, k) })) })
  const variants = cards.map(c => TIERS.map((t, i) => { const v = i === 0 ? c : slim(c, t); return { v, size: JSON.stringify(v).length + 1 } }))
  const tiers = TIERS.map(() => 0); let remaining = LIMIT_BYTES, left = cards.length
  const pick = variants.map(vs => {
    const share = Math.max(remaining / Math.max(left, 1), 1) * 6
    let t = vs.findIndex(x => x.size <= share); if (t < 0) t = vs.length - 1
    remaining -= vs[t]!.size; left--; tiers[t]!++
    return t
  })
  let out = cards.map((_, i) => ({ i, v: variants[i]![pick[i]!]!.v, size: variants[i]![pick[i]!]!.size }))
  let bytes = out.reduce((s, x) => s + x.size, 2), dropped = 0
  const must = new Set(pre1400)
  for (let k = out.length - 1; k >= 0 && bytes > LIMIT_BYTES; k--) { const x = out[k]!; if (must.has(x.v.lemma)) continue; bytes -= x.size; out[k] = undefined as never; dropped++ }
  out = out.filter(Boolean)
  return { cards: out.map(x => x.v), bytes, tiers, dropped }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build({ noPy: process.argv.includes('--no-py') })
}
