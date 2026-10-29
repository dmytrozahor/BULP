/**
 * SPEC 63 OV-1…OV-8: the two GLOBAL, per-viewer switches of every card (dialect + orthography) and the composition of what they show.
 * Order of the layers: the word in modern orthography (baseline) -> respelled for the dialect (core/respell.ts) -> written in the chosen orthography (core/orth-forward.ts).
 * The IPA depends on the dialect ONLY (`ipaOf`); the orthography changes letters, never pronunciation. State is remembered in localStorage inside try/catch (private windows,
 * blocked storage and SSR just use the defaults), like src/lib/viewMode.ts.
 */
import { ref, type Ref } from 'vue'
import { respell, NO_ORIGIN, SPELL_DIALECTS, type Respelled, type RespellCtx } from '../../core/respell.ts'
import type { AttestedForm } from './dialectAttested.ts'
import { toOrth, ORTHS, type OrthCtx, type OrthId, type OrthResult } from '../../core/orth-forward.ts'
import { toIpa } from '../../core/ipa.ts'
import type { Evidence } from '../../core/evidence.ts'

export const DIALECT_KEY = 'ukr-lex.dialect', ORTH_KEY = 'ukr-lex.orth'
const store = (): Storage | undefined => { try { return globalThis.localStorage ?? undefined } catch { return undefined } }
const get = (k: string, st = store()): string | undefined => { try { return st?.getItem(k) ?? undefined } catch { return undefined } }
const put = (k: string, v: string, st = store()) => { try { if (v) st?.setItem(k, v); else st?.removeItem(k) } catch { /* blocked storage: the choice lives for this page only */ } }
const okD = (v?: string) => (v && SPELL_DIALECTS.includes(v) ? v : '')
const okO = (v?: string): OrthId => (ORTHS.some(o => o.id === v) ? v as OrthId : '2019')

/** '' = нормативна (the default, nothing respelled) */
export const dialect: Ref<string> = ref(okD(get(DIALECT_KEY)))
export const orth: Ref<OrthId> = ref(okO(get(ORTH_KEY)))
export function setDialect(c: string) { dialect.value = okD(c); put(DIALECT_KEY, dialect.value) }
export function setOrth(o: string) { orth.value = okO(o); put(ORTH_KEY, orth.value === '2019' ? '' : orth.value) }
/** test hook: forget in-memory state and re-read storage */
export function resetViews(st?: Storage) { dialect.value = okD(get(DIALECT_KEY, st)); orth.value = okO(get(ORTH_KEY, st)) }

export type ViewCtx = RespellCtx & OrthCtx & {
  /** a dialect spelling of this very word printed by a source: it wins over the rule output (OV-13) */
  attested?: AttestedForm
  /** show «походження і не встановлено» when a Polissian rule needed the origin and had none (the card header only, OV-13) */
  noteOrigin?: boolean
}
export type PieceKind = 'plain' | 'dialect' | 'orth'
export interface Piece { text: string; kind: PieceKind; from?: string; rule?: string; ev?: Evidence; unsure?: boolean }
export interface Shown {
  word: string; dialect: string; orth: OrthId
  text: string; pieces: Piece[]
  /** the dialect respelling (undefined = baseline, or a dialect that changes nothing in this word) */
  respelled?: Respelled; ortho?: OrthResult
  generated: boolean
  /** the printed dialect spelling shown instead of the rule output (OV-13) */
  attested?: AttestedForm
  /** OV-13: a rule needed the origin of і and the card has none */
  note?: string
}
interface Layer { s: number; e: number; text: string; from?: string; rule?: string; unsure?: boolean }

/** Compose both layers over the modern spelling `word`. Pure. */
export function show(word: string, d: string, o: OrthId, ctx: ViewCtx = {}): Shown {
  const at = d && ctx.attested && ctx.attested.dialect === d ? ctx.attested : undefined
  if (at) {
    const pieces: Piece[] = [{ text: at.form, kind: 'dialect', from: word, rule: 'attested', ev: at.ev }]
    return { word, dialect: d, orth: o, text: at.form, pieces, generated: false, attested: at }
  }
  const rs = d ? respell(word, d, ctx) : undefined
  const note = ctx.noteOrigin && rs?.skipped.some(s => s.why === NO_ORIGIN) ? NO_ORIGIN : undefined
  const dr = rs && rs.text !== rs.input ? rs : undefined
  const t1 = dr ? dr.text : word
  const or = o === '2019' || o === 'orig' ? undefined : toOrth(t1, o, dr ? { ...ctx, origins: undefined } : ctx)
  const dl: Layer[] = [], ol: Layer[] = []
  if (dr) { let at = 0; for (const s of dr.segs) { dl.push({ s: at, e: at + s.text.length, text: s.text, from: s.from, rule: s.rule }); at += s.text.length } }
  if (or) { let at = 0; for (const s of or.segs) { if (!s.rule) { at += s.text.length; continue } const len = s.rule ? (s.unsure && s.from === '' ? 0 : (s.from ?? '').length) : s.text.length; ol.push({ s: at, e: at + len, text: s.text + (s.unsure ? '?' : ''), from: s.from, rule: s.rule, unsure: s.unsure }); at += len } }
  const cuts = new Set<number>([0, t1.length])
  for (const l of [...dl, ...ol]) { cuts.add(l.s); cuts.add(l.e) }
  const xs = [...cuts].sort((a, b) => a - b)
  const pieces: Piece[] = []
  const push = (p: Piece) => { const last = pieces[pieces.length - 1]; if (last && last.kind === 'plain' && p.kind === 'plain') last.text += p.text; else pieces.push(p) }
  const done = new Set<Layer>()
  const orthPiece = (l: Layer): Piece => ({ text: l.text, kind: 'orth', from: l.from, rule: l.rule, unsure: l.unsure, ev: or!.rules.find(r => r.id === l.rule)?.cite })
  for (let i = 0; i < xs.length; i++) {
    const a = xs[i]!, b = xs[i + 1] ?? a
    for (const l of ol.filter(l => l.s === l.e && l.s === a && !done.has(l))) { done.add(l); push(orthPiece(l)) }
    if (b === a) continue
    const o1 = ol.find(l => l.s < l.e && l.s <= a && b <= l.e)
    if (o1) { if (!done.has(o1)) { done.add(o1); push(orthPiece(o1)) } continue }   // the rest of a segment that spans several pieces adds no text
    const d1 = dl.find(l => l.rule && l.s <= a && b <= l.e)
    if (d1) { const f = dr!.fired.find(x => x.rule === d1.rule); push({ text: t1.slice(a, b), kind: 'dialect', from: d1.from, rule: f?.detector ?? d1.rule, ev: f?.cite }); continue }
    push({ text: t1.slice(a, b), kind: 'plain' })
  }
  return { word, dialect: d, orth: o, text: pieces.map(p => p.text).join(''), pieces, respelled: dr, ortho: or, generated: !!dr, ...(note ? { note } : {}) }
}

/** IPA of the word: the dialect only (the orthography never enters). The stress positions follow the respelling. */
export function ipaOf(word: string, d: string, ctx: ViewCtx = {}) {
  const rs = d ? respell(word, d, ctx) : undefined
  const ch = !!rs && rs.text !== rs.input
  // OV-13: when the respelling came from the ORIGIN of і, the IPA rows V1/V2/V6/V11 read the standard form with its origins (the letters of the respelled text have none)
  const byOrigin = ch && rs!.fired.some(f => f.rule.startsWith('NORTH-') || f.rule === 'WPL-A-E') && !!ctx.origins
  if (byOrigin || (!ch && ctx.origins)) return toIpa(word, ctx.positions ?? null, d || undefined, ctx.origins)
  return toIpa(ch ? rs!.text : word, ch ? rs!.positions ?? null : ctx.positions ?? null, d || undefined)
}
