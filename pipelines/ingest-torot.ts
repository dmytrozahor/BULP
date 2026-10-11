/**
 * TOROT / PROIEL XML ingester (units `ostromir`, `pvl_lav`) — SPEC 10 M-2.4.
 *
 * > "TOROT tokens keep TOROT `lemma`, `morphology`, `citation-part` as D-evidence." — specs/10-mining.md M-2.4
 * > "TOROT (verified), the best structured old-East-Slavic data" — research/01 §4
 *
 * Method: <sentence> → <token form lemma part-of-speech morphology citation-part>. Empty tokens (PROIEL null
 * elements: no `form`) are skipped. morph = `${pos} ${morphology}`, loc = citation-part (else sentence id), s = sentence index.
 */
import type { Ingester } from './ingest.ts'
import type { Unit } from './manifest.ts'
import type { TokenRec, WitnessOut } from '../core/types.ts'

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
const unent = (s: string) => s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|(\w+));/gi, (m, d, h, n) =>
  d ? String.fromCodePoint(+d) : h ? String.fromCodePoint(parseInt(h, 16)) : ENT[n] ?? m)

const attrs = (tag: string): Record<string, string> =>
  Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1]!, unent(m[2]!)]))

/** Pure: PROIEL XML text → tokens. */
export function parseProiel(xml: string): TokenRec[] {
  const out: TokenRec[] = []
  let s = -1
  for (const m of xml.matchAll(/<sentence\b([^>]*)>([\s\S]*?)<\/sentence>/g)) {
    s++
    const sid = attrs(m[1]!).id ?? String(s)
    for (const t of m[2]!.matchAll(/<token\b([^>]*?)\/?>/g)) {
      const a = attrs(t[1]!)
      if (!a.form) continue
      const rec: TokenRec = { raw: a.form, loc: a['citation-part'] || sid, s }
      if (a.lemma) rec.lemma = a.lemma
      const morph = [a['part-of-speech'], a.morphology].filter(Boolean).join(' ')
      if (morph) rec.morph = morph
      out.push(rec)
    }
  }
  return out
}

/** Witness shell with the Unit's metadata copied verbatim. */
export const witnessOf = (u: Unit, tokens: TokenRec[], over: Partial<WitnessOut> = {}): WitnessOut => ({
  id: u.id, unit: u.id, title: u.title, author: u.author, url: u.urls[0]!, date: u.date, dateCite: u.dateCite,
  ...(u.msDate && { msDate: u.msDate }), lang: u.lang, ...(u.region && { region: u.region }),
  witnessType: u.witnessType, edition: u.edition, ...(u.orth && { orth: u.orth }), ...(u.oldI && { oldI: u.oldI }),
  ...(u.license && { license: u.license }), dropped: { unmapped: 0, apparatus: 0 }, tokens, ...over,
})

export default {
  parse: (u, files) => [witnessOf(u, files.flatMap(f => parseProiel(f.body.toString('utf8'))))],
} satisfies Ingester
