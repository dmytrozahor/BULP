/**
 * SPEC 63 DB-3b — the numbers of a dialect VARIANT card, computed at route time from the parent lemma's spelling data (forms[].f / date / byW / kwic): no per-variant data file.
 * > owner 2026-11-04: «підкартка типу окрема картка для леми»
 * Honest: every number here is the variant's OWN (its spellings' tokens, witnesses, dates); a variant with no attested spelling has none and the card says «у корпусі не засвідчено». The parent's
 * numbers are never passed off as the variant's; what is inherited (senses, etymology) is labelled «від леми …» by the view. Pure.
 */
import type { Kwic } from './types.ts'

export interface VForm { raw: string; modern?: string; f: number; date: [number, number]; ocrOnly?: true; byW?: Record<string, number>; kwic?: Kwic[] }
export interface VWit { date: [number, number]; region?: string; witnessType?: string; oq?: unknown; dateUncertain?: unknown; title?: string }
export interface VariantStats {
  /** the attested spellings of the lemma that ARE this variant */ forms: VForm[]
  /** tokens of those spellings (all witnesses) */ f: number
  /** per million tokens of the whole corpus; undefined without a corpus size */ ipm?: number
  /** the earliest RELIABLE attestation of this spelling (no gated OCR, no dictionary, no uncertain date) */ first?: { date: [number, number]; witness?: string; form: string }
  /** witnesses of this spelling, earliest first */ byWitness: { w: string; n: number }[]
  /** tokens per witness region of the corpus table (code, f, N): the input of the regions block */ byRegion: { code: string; f: number; N: number }[]
  /** tokens per century with ipm of the century's size */ byCentury: { c: number; f: number; ipm: number; smooth: number | null }[]
  /** examples of this spelling (≤ 6) */ kwic: Kwic[]
}
const reliable = (w: VWit | undefined): w is VWit => !!w && w.witnessType !== 'dictionary' && !w.oq && !w.dateUncertain

export function variantStats(all: VForm[], form: string, norm: (s: string) => string, wit: (id: string) => VWit | undefined, regions: { code: string; name: string; N: number }[] | undefined, N: number | undefined, centurySizes: Record<string, number> | undefined): VariantStats {
  const k = norm(form), forms = all.filter(f => norm(f.raw) === k || (f.modern !== undefined && norm(f.modern) === k))
  const f = forms.reduce((a, x) => a + x.f, 0)
  const by = new Map<string, number>()
  for (const x of forms) for (const [w, n] of Object.entries(x.byW ?? {})) by.set(w, (by.get(w) ?? 0) + n)
  const byWitness = [...by].map(([w, n]) => ({ w, n })).sort((a, b) => (wit(a.w)?.date[0] ?? 9999) - (wit(b.w)?.date[0] ?? 9999) || b.n - a.n)
  let first: VariantStats['first']
  for (const { w } of byWitness) { const x = wit(w); if (reliable(x) && (!first || x.date[0] < first.date[0])) first = { date: x.date, witness: w, form: forms[0]!.raw } }
  if (!first) { const ok = forms.filter(x => !x.ocrOnly && !x.byW).sort((a, b) => a.date[0] - b.date[0])[0]; if (ok) first = { date: ok.date, form: ok.raw } }   // a form with no witness table (older data): its own date
  const reg = new Map<string, number>(), cen = new Map<number, number>()
  for (const { w, n } of byWitness) {
    const x = wit(w); if (!x) continue
    const r = regions?.find(r => r.name === (x.region ?? '').trim()); if (r) reg.set(r.code, (reg.get(r.code) ?? 0) + n)
    const c = Math.ceil(x.date[0] / 100); cen.set(c, (cen.get(c) ?? 0) + n)
  }
  const byRegion = (regions ?? []).filter(r => reg.has(r.code)).map(r => ({ code: r.code, f: reg.get(r.code)!, N: r.N }))
  const byCentury = [...cen].sort((a, b) => a[0] - b[0]).map(([c, n]) => ({ c, f: n, ipm: centurySizes?.[String(c)] ? (n / centurySizes[String(c)]!) * 1e6 : 0, smooth: null }))
  return { forms, f, ...(N ? { ipm: (f / N) * 1e6 } : {}), ...(first ? { first } : {}), byWitness, byRegion, byCentury, kwic: forms.flatMap(x => x.kwic ?? []).slice(0, 6) }
}
