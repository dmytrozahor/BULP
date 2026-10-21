/**
 * SPEC 63 GG-5: the size of the vocab-only sources, kept APART from the full-text N. A vocab-only source (licence: CC BY-SA, ©, CC0 web crawl) adds word forms and counts, never a KWIC line
 * or a first attestation, so its tokens must not be added to `N` (the denominator of every ipm) and the site names the two numbers separately (boot.json `N` and `nVocab`).
 * Reads only the HEADER of data/work/harvest-vocab/<source>.json (written by ingest-harvest.ts `writeVocabFile`: source, licence, family, vocabOnly, docs, tokens come before `entries`),
 * so a 350 MB file is never parsed. NOTE: for `hplt` the harvester counts only the lower-case tokens that VESUM does not know (harvest/hplt.py), so its `tokens` are those, not running words.
 */
import { closeSync, existsSync, openSync, readSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

export interface VocabSrc { source: string; tokens: number; docs: number; family: string }
export interface VocabTotals { nVocab: number; sources: VocabSrc[] }

/** the header numbers of one vocab file's first bytes (null for a torn / foreign file) */
export function vocabHeader(head: string): VocabSrc | null {
  const VAL = /("(?:[^"\\]|\\.)*"|-?\d+)/
  const g = (k: string) => new RegExp('"' + k + '":' + VAL.source).exec(head)?.[1]
  const source = g('source'), tokens = g('tokens'), docs = g('docs'), family = g('family')
  if (!source || tokens === undefined || docs === undefined || tokens.startsWith('"') || docs.startsWith('"')) return null
  return { source: JSON.parse(source) as string, tokens: Number(tokens), docs: Number(docs), family: family ? JSON.parse(family) as string : '' }
}

export function vocabTotals(workDir: string): VocabTotals {
  const dir = resolve(workDir, 'harvest-vocab'), sources: VocabSrc[] = []
  if (existsSync(dir)) for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith('.json')) continue
    const fd = openSync(resolve(dir, f), 'r'), b = Buffer.alloc(4096)
    try { const h = vocabHeader(b.toString('utf8', 0, readSync(fd, b, 0, b.length, 0))); if (h) sources.push(h) } finally { closeSync(fd) }
  }
  // gramoty is another language family («never counted in N»); it is not Ukrainian vocabulary either
  return { nVocab: sources.filter(s => s.family !== 'east-slavic-comparative').reduce((a, s) => a + s.tokens, 0), sources }
}
