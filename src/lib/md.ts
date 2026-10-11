/**
 * Minimal inline-markdown + spec parser so /method renders SPEC 00 verbatim (specs/00-principles.md is imported with ?raw).
 * Input is our own repository text; HTML is escaped first anyway.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const inlineMd = (s: string) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')
  .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,(_m, t, u) => `<a href="${u}" rel="noopener">${t}</a>`)

export interface SpecItem { id: string; text: string }
export interface SpecSection { heading: string; quotes: string[]; items: SpecItem[] }

/** `## P-2 Authors` → section; `> quote` lines; `- **P-2.1** text` → item. */
export function parseSpec(md: string): SpecSection[] {
  const out: SpecSection[] = []; let cur: SpecSection | undefined
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^## (.+)/)
    if (h) { cur = { heading: h[1]!, quotes: [], items: [] }; out.push(cur); continue }
    if (!cur) continue
    const q = line.match(/^> (.+)/); if (q) { cur.quotes.push(q[1]!); continue }
    const it = line.match(/^- \*\*(P-\d+\.\d+)\*\* (.+)/); if (it) cur.items.push({ id: it[1]!, text: it[2]! })
  }
  return out
}

const slug = (s: string) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
export interface MdHeading { level: number; text: string; id: string }
/** Block markdown for analysis/REPORT.md: # headings (with anchor ids), pipe tables, -/1. lists, ``` code, paragraphs. Escapes first (own repository text). */
export function renderMd(md: string): { html: string; toc: MdHeading[] } {
  const L = md.split(/\r?\n/), out: string[] = [], toc: MdHeading[] = []; const seen = new Map<string, number>()
  for (let i = 0; i < L.length; i++) {
    const l = L[i]!
    if (/^```/.test(l)) { const b: string[] = []; for (i++; i < L.length && !/^```/.test(L[i]!); i++) b.push(esc(L[i]!)); out.push(`<pre><code>${b.join('\n')}</code></pre>`); continue }
    const h = l.match(/^(#{1,6}) (.+)/)
    if (h) { let id = slug(h[2]!) || 'h'; const n = seen.get(id) ?? 0; seen.set(id, n + 1); if (n) id += `-${n}`
      toc.push({ level: h[1]!.length, text: h[2]!, id }); out.push(`<h${h[1]!.length} id="${id}">${inlineMd(h[2]!)}</h${h[1]!.length}>`); continue }
    if (/^\s*\|/.test(l) && /^\s*\|[\s:|-]+\|\s*$/.test(L[i + 1] ?? '')) {
      const head = cells(l), rows: string[][] = []; i += 2
      for (; i < L.length && /^\s*\|/.test(L[i]!); i++) rows.push(cells(L[i]!)); i--
      out.push(`<div class="tablewrap"><table><thead><tr>${head.map(c => `<th>${inlineMd(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${inlineMd(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue }
    const li = l.match(/^\s*([-*]|\d+\.) (.+)/)
    if (li) { const tag = /\d/.test(li[1]!) ? 'ol' : 'ul', b: string[] = []
      for (; i < L.length; i++) { const m = L[i]!.match(/^\s*(?:[-*]|\d+\.) (.+)/); if (!m) break; b.push(`<li>${inlineMd(m[1]!)}</li>`) }
      i--; out.push(`<${tag}>${b.join('')}</${tag}>`); continue }
    const q = l.match(/^> ?(.*)/); if (q) { out.push(`<blockquote>${inlineMd(q[1]!)}</blockquote>`); continue }
    if (!l.trim()) continue
    const p: string[] = [l]; while (i + 1 < L.length && L[i + 1]!.trim() && !/^(#|```|\s*\||\s*([-*]|\d+\.) |>)/.test(L[i + 1]!)) p.push(L[++i]!)
    out.push(`<p>${inlineMd(p.join(' '))}</p>`)
  }
  return { html: out.join('\n'), toc }
}
