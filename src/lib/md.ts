/**
 * Minimal inline-markdown + spec parser so /method renders SPEC 00 verbatim (specs/00-principles.md is imported with ?raw).
 * Input is our own repository text; HTML is escaped first anyway.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const inlineMd = (s: string) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')

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
