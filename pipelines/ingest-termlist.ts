/**
 * SPEC 63 CX-6 — term list ingester for the Prague 1925 technical glossary (nw-termlist.ts). Reads the committed transcription
 * pipelines/src-mat-term-1925.tsv (page, no., uk, ru, cs, de); the Ukrainian term words are the witness tokens (cite-only: a term is one `dictionary` entry),
 * the Russian / Czech / German equivalents are quoted glosses carried in the token locator («с. 5, № 9: uk = ru | cs | de»).
 */
import { readFileSync } from 'node:fs'
import type { Ingester } from './ingest.ts'
import type { Unit } from './manifest.ts'
import type { TokenRec, WitnessOut } from '../core/types.ts'
import { words } from './ingest-izbornyk.ts'
import { witnessOf } from './ingest-torot.ts'

export interface TermRow { page: number; no: number; uk: string; ru: string; cs: string; de: string }
export function parseTerms(tsv: string): TermRow[] {
  return tsv.split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => {
    const [page, no, uk, ru, cs, de] = l.split('\t')
    return { page: +page!, no: +no!, uk: uk!, ru: ru ?? '', cs: cs ?? '', de: de ?? '' }
  })
}

export const termLoc = (r: TermRow) => `с. ${r.page}, № ${r.no}: ${r.uk} = ${[r.ru, r.cs, r.de].filter(Boolean).join(' | ')}`.slice(0, 220)

export default {
  parse(u: Unit): WitnessOut[] {
    const rows = parseTerms(readFileSync(new URL('./src-mat-term-1925.tsv', import.meta.url), 'utf8'))
    const dropped = { unmapped: 0, apparatus: 0 }, tokens: TokenRec[] = []
    rows.forEach((r, s) => { const loc = termLoc(r); for (const w of words(r.uk.replace(/\/[^/]*\//g, m => ' ' + m.slice(1, -1) + ' '), dropped)) tokens.push({ raw: w, loc, s }) })
    console.log(`${u.id}: ${rows.length} term entries, ${tokens.length} tokens`)
    return [witnessOf(u, tokens, { dropped })]
  },
} satisfies Ingester
