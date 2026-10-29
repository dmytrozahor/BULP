/** SPEC 63 PS-8: cut a snippet into plain parts and person-mention parts, given the build's mentions of the witness (surface forms). Pure. */
export interface MentionLike { f: string; p: string; why: string }
export type Part = { t: string } | { t: string; p: string; why: string }
export function splitMentions(text: string, ms: readonly MentionLike[]): Part[] {
  if (!ms.length || !text) return [{ t: text }]
  const hits: { s: number; e: number; m: MentionLike }[] = []
  for (const m of ms) { let i = text.indexOf(m.f); while (i >= 0 && m.f) { const before = text[i - 1], after = text[i + m.f.length]; if (!(before && /\p{L}/u.test(before)) && !(after && /\p{L}/u.test(after))) hits.push({ s: i, e: i + m.f.length, m }); i = text.indexOf(m.f, i + m.f.length) } }
  hits.sort((a, b) => a.s - b.s || b.e - a.e)
  const out: Part[] = []; let at = 0
  for (const h of hits) { if (h.s < at) continue; if (h.s > at) out.push({ t: text.slice(at, h.s) }); out.push({ t: text.slice(h.s, h.e), p: h.m.p, why: h.m.why }); at = h.e }
  if (at < text.length) out.push({ t: text.slice(at) })
  return out
}
