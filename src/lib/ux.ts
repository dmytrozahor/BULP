/**
 * SPEC 61 UX helpers (pure, tested in tests/ui.test.ts): FX-5 paradigm kind by POS (tolerant reader), UX-4 grouping of identical per-spelling claims,
 * UX-5 top-N form chips, UX-2 one-line panel summaries. Nothing here removes evidence: it only decides what is collapsed or counted.
 */
import type { Claim } from '../../core/evidence.ts'

export type ParadigmKind = 'noun' | 'pron' | 'adj' | 'verb' | 'numr' | 'uninflected' | 'unknown'
export const KIND_UK: Record<ParadigmKind, string> = { noun: 'іменник', pron: 'займенник', adj: 'прикметник', verb: 'дієслово', numr: 'числівник', uninflected: 'незмінне слово', unknown: 'невідомо' }

const norm = (v: string): ParadigmKind | undefined => {
  const s = v.toLowerCase()
  if (/indecl|invar|uninfl|незмінн|adv|conj|part\b|particle|prep|intj|sconj|cconj|adp|interj|прислівн|сполучн|част|прийменн|вигук/.test(s)) return 'uninflected'
  if (/pron|займенн/.test(s)) return 'pron'
  if (/verb|дієсл|partic|дієприкм/.test(s)) return 'verb'
  if (/adj|прикм/.test(s)) return 'adj'
  if (/num|числів/.test(s)) return 'numr'
  if (/noun|іменн|subst/.test(s)) return 'noun'
}

/**
 * FX-5: the lemma's paradigm kind. Reads the data field when the backend provides it (any of `paradigmKind` / `paradigm_kind` / `paradigmType` /
 * `paradigm.kind`), else infers from the VESUM tags (pronouns are `noun:…:&pron:…` / `adj:…:&pron:…`), else from the POS text.
 */
export function paradigmKindOf(card: { pos?: string; paradigm?: { form: string; tags: string }[] } | undefined): ParadigmKind {
  if (!card) return 'unknown'
  const c = card as Record<string, any>
  for (const v of [c.paradigmKind, c.paradigm_kind, c.paradigmType, c.paradigm?.kind]) if (typeof v === 'string') { const k = norm(v); if (k) return k }
  const tags = card.paradigm?.[0]?.tags
  if (tags) {
    if (/&pron/.test(tags)) return 'pron'
    const head = tags.split(':')[0]!
    if (head === 'noun') return 'noun'
    if (head === 'adj') return 'adj'
    if (head === 'verb') return 'verb'
    if (head === 'numr') return 'numr'
    if (['adv', 'conj', 'part', 'prep', 'intj', 'insert', 'onomat'].includes(head)) return 'uninflected'
  }
  return norm(card.pos ?? '') ?? 'unknown'
}

/** UX-4: group spellings whose label claims are identical (same keys, values and evidence loci) so each claim renders once «у N формах». */
export function claimSignature(claims: Record<string, Claim<unknown>>): string {
  return JSON.stringify(Object.keys(claims).sort().map(k => [k, claims[k]!.value, (claims[k]!.evidence ?? []).map(e => `${e.source}|${e.locator}|${e.quote}`)]))
}
export function groupFormClaims<T extends { raw: string; claims: Record<string, Claim<any>> }>(forms: T[]): { claims: Record<string, Claim<any>>; forms: string[] }[] {
  const by = new Map<string, { claims: Record<string, Claim<any>>; forms: string[] }>()
  for (const f of forms) {
    if (!Object.keys(f.claims).length) continue
    const s = claimSignature(f.claims), g = by.get(s)
    if (g) g.forms.push(f.raw); else by.set(s, { claims: f.claims, forms: [f.raw] })
  }
  return [...by.values()].sort((a, b) => b.forms.length - a.forms.length)
}

/** UX-5: the N most frequent spellings (stable for ties); `rest` is the «+N» count. `freq` maps raw → f when the detail shard is loaded. */
export function topForms<T extends { raw: string }>(forms: T[], freq: Map<string, number> | undefined, n = 6): { shown: T[]; rest: number } {
  const ranked = freq ? [...forms].sort((a, b) => (freq.get(b.raw) ?? 0) - (freq.get(a.raw) ?? 0)) : forms
  return { shown: ranked.slice(0, n), rest: Math.max(0, forms.length - n) }
}

/** FX-3-style placed count of an epoch paradigm: cells that hold at least one attested form, over all epochs. */
export function placedCells(epochs: { paradigms: { cells: { forms: unknown[] }[] }[] } | undefined): number {
  return (epochs?.paradigms ?? []).reduce((n, p) => n + p.cells.filter(c => c.forms.length).length, 0)
}
