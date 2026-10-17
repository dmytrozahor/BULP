/**
 * BUILD stage, epoch paradigms (SPEC 50 EP-3, EP-4, EP-1.4/1.5): every token linked to a kept noun lemma is placed in a grammatical cell of its shev epoch,
 * using the tag of its own source (TOROT manual morph > Stanza UD feats > VESUM lines of a modern direct link, EP-2.1) — or counted as dropped; a stem claim is derived from the Old Ukrainian lemma.
 * Absence is never evidence (EP-3.8): a cell with no token simply does not exist here. Reconstructions are not computed into the data (EP-1.3); the REPORT counts them.
 */
import { cellsFromProiel, cellsFromUd, cellsFromVesum, isEnclitic, NOUN_KEYS, PRON_KEYS, VERB_KEYS, type Decoded } from '../../../core/cells.ts'
import { paradigmKindOf } from '../../../core/pos-gate.ts'
import { D, unknown, type Evidence } from '../../../core/evidence.ts'
import { EPOCHS } from '../../../core/epochs.ts'
import { confirm, reconstruct } from '../../../core/reconstruct.ts'
import { stemClaim } from '../../../core/stem.ts'
import { key } from '../../../core/text.ts'
import type { CellForm, EpochCell, EpochParadigm, EpochParadigms, StemValue, TagSource, VesumHit, WitnessOut } from '../../../core/types.ts'
import type { Chosen, Route } from '../../../pipelines/build-link.ts'

export const CELL_CAP = 4   // EP-1.4: spellings kept per cell, the rest counted in `more`
export interface NlpTok { lemma?: string; upos?: string; feats?: string | null }
export interface NlpIn { model: string; outOfDomain?: boolean; tokens: (NlpTok | null)[] }
export interface EpochEnv {
  adm: { w: WitnessOut; nlp?: NlpIn }[]
  epochsOf: string[][]                                   // shev epoch ids per witness (EP-3.2)
  tix: Int32Array[]; linked: ({ c: Chosen; route: Route } | undefined)[]
  lemmas: Map<string, { display: string; tags: string }>  // kept lemmas by id, tags = VESUM lemma tags
  hits: ReadonlyMap<string, VesumHit[]>
  derive: (s: string, oldI: boolean) => { candidates: { form: string }[] }
  vesumLoc: string
  /** FX-6: lemma ids whose per-token outcome is tallied in stats.probe even when they are not noun lemmas */
  probe?: ReadonlySet<string>; kindOf?: (id: string) => string
}
export interface SrcCount { tagged: number; placed: number; conflict: number; underspecified: number }
export interface EpochStats {
  perEpoch: Record<string, { bySrc: Record<TagSource, SrcCount>; untagged: number; lemmas: number; cells: number; cellForms: number }>
  conflictWhy: Record<string, number>   // `${source}:${reason}` → tokens (a token in k epochs counts k times)
  stemByRule: Record<string, number>; stemStanza: number; stemUnknown: number; pronLemmas: number; verbLemmas: number; lemmasWithEpochs: number
  recon: { stems: number; cells: number; forms: number; confirmed: number; confirmedCells: number }
  /** FX-6: per test lemma, tokens by outcome (a token counted once, not per epoch); `why` = `${source}:${reason}` of the conflicts */
  probe: Record<string, { kind: string; tokens: number; untagged: number; placed: number; conflict: number; underspecified: number; why: Record<string, number> }>
}

const rawKey = (s: string) => s.normalize('NFC').toLowerCase()
const lemmaGender = (tags: string): 'm' | 'f' | 'n' | undefined => { const t = tags.split(':'), g = (['m', 'f', 'n'] as const).filter(x => t.includes(x)); return g.length === 1 ? g[0] : undefined }
const SRC_UK: Record<TagSource, string> = { torot: 'TOROT', stanza: 'Stanza (модель)', vesum: 'ВЕСУМ' }

interface Agg { raw: string; src: TagSource; tag: string; amb?: number; n: number; w: number; ti: number; date: number; loc: string }
interface Obs { old: string; src: 'torot' | 'stanza'; n: number; w: number; ti: number }
interface EpAcc { N: number; dropped: { conflict: number; underspecified: number; untagged: number }; cells: Map<string, Map<string, Agg>> }
interface LemAcc { id: string; eps: Map<string, EpAcc>; obs: Map<string, Obs>; genders: Map<string, { g: 'm' | 'f' | 'n'; n: number; w: number; ti: number; src: TagSource; tag: string }>; sources: Map<string, TagSource> }

export function buildEpochs(env: EpochEnv, shevOrder = EPOCHS.filter(e => e.scheme === 'shev' && !e.overlay).map(e => e.id)) {
  const accs = new Map<string, LemAcc>()
  const stats: EpochStats = { perEpoch: {}, conflictWhy: {}, stemByRule: {}, stemStanza: 0, stemUnknown: 0, pronLemmas: 0, verbLemmas: 0, lemmasWithEpochs: 0, recon: { stems: 0, cells: 0, forms: 0, confirmed: 0, confirmedCells: 0 }, probe: {} }
  const st = (e: string) => (stats.perEpoch[e] ??= { bySrc: { torot: { tagged: 0, placed: 0, conflict: 0, underspecified: 0 }, stanza: { tagged: 0, placed: 0, conflict: 0, underspecified: 0 }, vesum: { tagged: 0, placed: 0, conflict: 0, underspecified: 0 } }, untagged: 0, lemmas: 0, cells: 0, cellForms: 0 })
  const pcache = new Map<string, Decoded>(), ucache = new Map<string, Decoded>()
  const proiel = (m: string) => pcache.get(m) ?? (pcache.set(m, cellsFromProiel(m)), pcache.get(m)!)
  const ud = (u: string, f: string | null | undefined) => { const k = u + '|' + (f ?? ''); return ucache.get(k) ?? (ucache.set(k, cellsFromUd(u, f)), ucache.get(k)!) }
  const lg = new Map([...env.lemmas].map(([id, l]) => [id, lemmaGender(l.tags)]))
  /** FX-5: the grid of a kept lemma — pronouns (VESUM `pron` segment) get the pronominal grid (no stem type), everything else here is a noun */
  const gridOfLemma = new Map([...env.lemmas].map(([id, l]) => { const k = paradigmKindOf(l.tags); return [id, k === 'pron' ? 'pron' as const : k === 'verb' ? 'verb' as const : 'noun' as const] as const }))

  env.adm.forEach(({ w, nlp }, wi) => {
    const eps = env.epochsOf[wi]!
    if (!eps.length) return
    w.tokens.forEach((tok, ti) => {
      const L = env.linked[env.tix[wi]![ti]!]
      const isProbe = !!L && !!env.probe?.has(L.c.id)
      if (!L || (!env.lemmas.has(L.c.id) && !isProbe)) return
      // ── EP-3.1 / EP-2.1: one tag source per token ──
      let src: TagSource | undefined, tag = '', dec: Decoded | undefined, conflict = '', oldLemma: string | undefined
      const nt = nlp?.tokens[ti]
      if (tok.morph) { src = 'torot'; tag = tok.morph; dec = proiel(tok.morph); oldLemma = tok.lemma }
      else if (nt?.upos) {
        src = 'stanza'; tag = nt.feats ?? nt.upos; dec = ud(nt.upos, nt.feats); oldLemma = nt.lemma
        // EP-3.4: the model's analysis must be the one the link followed
        const same = L.route === 'stanza-lemma' || (!!nt.lemma && env.derive(nt.lemma, !!w.oldI).candidates.some(c => key(c.form) === L.c.id))
        const g = lg.get(L.c.id)
        if (!same) conflict = 'lemma'; else if (dec.gender && g && dec.gender !== g && gridOfLemma.get(L.c.id) !== 'pron') conflict = 'gender'   // personal pronouns: the VESUM lemma line's gender is one of several
      } else if (w.lang === 'uk' && L.route === 'direct') {
        const lines = (env.hits.get(key(L.c.own.form)) ?? []).filter(h => key(h.lemma) === L.c.id).map(h => h.tags)
        if (lines.length) { src = 'vesum'; tag = lines.join(' | '); dec = cellsFromVesum(lines) }
      }
      const why = !src || !dec ? '' : conflict || (dec.grid !== (gridOfLemma.get(L.c.id) ?? (env.kindOf?.(L.c.id) === 'pron' ? 'pron' : 'noun')) ? 'grid:' + (dec.grid ?? 'none') : '')
      if (isProbe) {   // FX-6 diagnostics: one outcome per token for the named test lemmas (also non-noun ones, which have no noun grid by design)
        const p = (stats.probe[L.c.id] ??= { kind: env.kindOf?.(L.c.id) ?? '', tokens: 0, untagged: 0, placed: 0, conflict: 0, underspecified: 0, why: {} })
        p.tokens++
        if (!src || !dec) p.untagged++
        else if (why) { p.conflict++; const k = src + ':' + why; p.why[k] = (p.why[k] ?? 0) + 1 }
        else if (dec.under || !dec.keys.length) p.underspecified++
        else p.placed++
      }
      if (!env.lemmas.has(L.c.id)) return
      for (const e of eps) {
        let la = accs.get(L.c.id)
        if (!la) accs.set(L.c.id, la = { id: L.c.id, eps: new Map(), obs: new Map(), genders: new Map(), sources: new Map() })
        let ea = la.eps.get(e)
        if (!ea) la.eps.set(e, ea = { N: 0, dropped: { conflict: 0, underspecified: 0, untagged: 0 }, cells: new Map() })
        if (!src || !dec) { ea.dropped.untagged++; st(e).untagged++; continue }
        const c = st(e).bySrc[src]; c.tagged++; ea.N++
        if (why) { ea.dropped.conflict++; c.conflict++; stats.conflictWhy[src + ':' + why] = (stats.conflictWhy[src + ':' + why] ?? 0) + 1; continue }   // EP-3.3 grid mismatch / EP-3.4
        if (dec.under || !dec.keys.length) { ea.dropped.underspecified++; c.underspecified++; continue }
        c.placed++
        const raw = rawKey(tok.raw)
        for (const k of dec.keys) {
          const cell = ea.cells.get(k) ?? (ea.cells.set(k, new Map()), ea.cells.get(k)!), id = raw + '\0' + src
          const a = cell.get(id)
          if (!a) cell.set(id, { raw, src, tag, amb: dec.amb > 1 ? dec.amb : undefined, n: 1, w: wi, ti, date: w.date[1], loc: tok.loc })
          else { a.n++; if (w.date[1] < a.date) { a.date = w.date[1]; a.w = wi; a.ti = ti; a.loc = tok.loc; a.tag = tag; a.amb = dec.amb > 1 ? dec.amb : undefined } }   // EP-3.6: first ex = earliest witness (adm is date-ordered, so ties keep the first)
        }
        // EP-4.1 observations: old lemma of a placed token in shev.proto / shev.old
        if ((e === 'shev.proto' || e === 'shev.old') && (src === 'torot' || src === 'stanza') && oldLemma) {
          const ok = `${src}|${oldLemma}`, o = la.obs.get(ok)
          if (o) o.n++; else la.obs.set(ok, { old: oldLemma, src, n: 1, w: wi, ti })
          if (dec.gender && gridOfLemma.get(L.c.id) === 'noun') { const gk = `${src}|${dec.gender}`, g = la.genders.get(gk); if (g) g.n++; else la.genders.set(gk, { g: dec.gender, n: 1, w: wi, ti, src, tag }) }
        }
      }
    })
  })

  const out = new Map<string, EpochParadigms>()
  const ctxOf = (wi: number, ti: number): string => {
    const { w } = env.adm[wi]!, s = w.tokens[ti]!.s
    for (let r = 3; r >= 0; r--) {
      let a = ti, b = ti
      while (a > 0 && ti - a < r && w.tokens[a - 1]!.s === s) a--
      while (b + 1 < w.tokens.length && b - ti < r && w.tokens[b + 1]!.s === s) b++
      const t = w.tokens.slice(a, b + 1).map(x => x.raw).join(' ')
      if (t.length <= 60) return t
    }
    return w.tokens[ti]!.raw
  }
  for (const la of accs.values()) {
    const tags: string[] = [], tix = new Map<string, number>(), t = (s: string) => tix.get(s) ?? (tix.set(s, tags.length), tags.push(s), tags.length - 1)
    const paradigms: EpochParadigm[] = []
    for (const e of shevOrder) {
      const ea = la.eps.get(e)
      if (!ea) continue
      const cells: EpochCell[] = [], grid = gridOfLemma.get(la.id) ?? 'noun'
      for (const k of grid === 'pron' ? PRON_KEYS : grid === 'verb' ? VERB_KEYS : NOUN_KEYS) {
        const m = ea.cells.get(k)
        if (!m) continue
        // pronoun grid: enclitic forms form a marked sub-row — they are sorted after the tonic forms and are exempt from the cap competition (own cap)
        const sorted = [...m.values()].sort((x, y) => y.n - x.n || x.date - y.date || x.w - y.w || x.ti - y.ti)
        const encOf = (a: Agg) => grid === 'pron' && isEnclitic(k, a.raw)
        const all = [...sorted.filter(a => !encOf(a)), ...sorted.filter(encOf)]
        const forms: CellForm[] = [...all.filter(a => !encOf(a)).slice(0, CELL_CAP), ...all.filter(encOf).slice(0, CELL_CAP)]
          .map(a => ({ raw: a.raw, n: a.n, src: a.src, t: t(a.tag), ...(encOf(a) ? { enc: true as const } : {}), ...(a.amb ? { amb: a.amb } : {}), ex: [a.w, a.loc] as [number, string], ctx: ctxOf(a.w, a.ti) }))
        const more = all.length > forms.length ? all.filter(a => !forms.some(f => f.raw === a.raw && f.src === a.src)).reduce((s, a) => s + a.n, 0) : 0
        cells.push({ key: k, forms, ...(more ? { more } : {}) })
      }
      if (!cells.length && !ea.N) continue
      paradigms.push({ epoch: e, grid, N: ea.N, cells, dropped: ea.dropped })
      const s = st(e); s.lemmas += cells.length ? 1 : 0; s.cells += cells.length; s.cellForms += cells.reduce((x, c) => x + c.forms.length, 0)
    }
    if (!paradigms.length) continue
    // ── EP-4: stem claim ──
    const pick = <T extends { n: number; w: number; ti: number }>(xs: T[]) => xs.sort((x, y) => y.n - x.n || x.w - y.w || x.ti - y.ti)[0]
    const tor = [...la.obs.values()].filter(o => o.src === 'torot'), obs = pick(tor.length ? tor : [...la.obs.values()])
    let stem = unknown<StemValue>()
    const isVerb = gridOfLemma.get(la.id) === 'verb', isPron = gridOfLemma.get(la.id) === 'pron' || isVerb   // BL-8: verbs, like pronouns, have no stem type and no reconstruction; pronouns have no stem type (FX-5): stem stays unknown, no reconstruction, not counted in the stem stats
    if (obs && !isPron) {
      const gs = [...la.genders.values()].filter(g => g.src === obs.src), best = pick(gs.reduce<typeof gs>((acc, g) => { const x = acc.find(y => y.g === g.g); x ? (x.n += g.n) : acc.push({ ...g }); return acc }, []))
      const lemma = env.lemmas.get(la.id)!, vg = lg.get(la.id), tok = env.adm[obs.w]!.w.tokens[obs.ti]!, wid = env.adm[obs.w]!.w.id
      const lemmaEv: Evidence = D(wid, tok.loc, `${tok.raw} → «${obs.old}»`, obs.src === 'torot' ? 'TOROT lemma' : 'stanza lemma; модельна лематизація, не словниковий факт (P-1.7)')
      let g = best?.g, gev: Evidence[] = []
      if (best) { const gt = env.adm[best.w]!.w.tokens[best.ti]!; gev = [D(env.adm[best.w]!.w.id, gt.loc, `${gt.raw} «${best.tag}»`, `рід за розміткою ${SRC_UK[best.src]}`)] }
      else if (vg) { g = vg; gev = [D('VESUM', env.vesumLoc, `${lemma.display} ${lemma.tags}`, 'рід леми за ВЕСУМ')] }
      stem = stemClaim(obs.old, g, lemmaEv, gev, obs.src === 'stanza')
    }
    if (isVerb) stats.verbLemmas++
    else if (isPron) stats.pronLemmas++
    else if (stem.value === 'unknown') stats.stemUnknown++
    else { stats.stemByRule[stem.value.rule] = (stats.stemByRule[stem.value.rule] ?? 0) + 1; if (obs?.src === 'stanza') stats.stemStanza++ }
    out.set(la.id, { tags, paradigms, stem })
    stats.lemmasWithEpochs++
    // REPORT EP-8.1: reconstructions and their confirmation (not stored)
    if (stem.value !== 'unknown') {
      let any = false
      for (const e of ['shev.proto', 'shev.old']) {
        const p = paradigms.find(x => x.epoch === e), cells = confirm(reconstruct(stem.value, e), p).filter(c => c.forms.length)
        if (!cells.length) continue
        any = true
        stats.recon.cells += cells.length; stats.recon.confirmedCells += cells.filter(c => c.forms.some(f => f.confirmedBy)).length
        for (const c of cells) for (const f of c.forms) { stats.recon.forms++; if (f.confirmedBy) stats.recon.confirmed++ }
      }
      if (any) stats.recon.stems++
    }
  }
  return { epochs: out, stats }
}

/** EP-1.5 shrink steps for an over-budget shard: level 1 drops `ctx`, level 2 also caps every cell at 2 spellings (the rest into `more`). `n`, `ex`, cells are never dropped. */
export function shrinkEpochs(ep: EpochParadigms, level: 1 | 2): EpochParadigms {
  return { ...ep, paradigms: ep.paradigms.map(p => ({ ...p, cells: p.cells.map(c => {
    const kept = level === 2 ? c.forms.slice(0, 2) : c.forms, extra = level === 2 ? c.forms.slice(2).reduce((s, f) => s + f.n, 0) : 0
    return { ...c, forms: kept.map(({ ctx: _c, ...f }) => f), ...(c.more || extra ? { more: (c.more ?? 0) + extra } : {}) }
  }) })) }
}
