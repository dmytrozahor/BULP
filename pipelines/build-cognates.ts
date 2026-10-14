/** BUILD step BL-15: public/data/cognates.json from data/work/cognates-kaikki.json (npm run data:cognates) for the lemmas of the lexicon, plus the ET-3 review flag
 *  (vernacular Ukrainian attestation, interval logic, core/cognates.ts). Absent input → no file. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isKnown } from '../core/evidence.ts'
import { cognateFlag, cogEvidence, stripAccent, type CogLang, type CognateFile, type CogRow } from '../core/cognates.ts'
import type { EtymStep } from '../core/etymology.ts'
import type { LemmaCard } from '../core/types.ts'

const DONOR: [RegExp, CogLang][] = [[/^Old Polish\b/, 'zlw-opl'], [/^Polish\b/, 'pl'], [/^Belarusian\b/, 'be'], [/^Old Ruthenian\b/, 'zle-ort'], [/^Russian\b/, 'ru'], [/^Old East Slavic\b/, 'orv']]
const BOR = new Set(['bor', 'bor+', 'lbor', 'obor'])
export const donorOf = (chain: EtymStep[] | undefined): CogLang | undefined => {
  const s = chain?.find(x => BOR.has(x.rel)); return s ? DONOR.find(([re]) => re.test(s.text.trim()))?.[1] : undefined
}
/** the earliest attestation is vernacular iff its spelling carries no Church-Slavonic claim and the lemma is not CS by origin (research/28 §3.3.3) */
export const isVernacular = (c: Pick<LemmaCard, 'forms' | 'first' | 'claims'>): boolean => {
  if (!isKnown(c.first)) return false
  const raw = c.first.value.form.toLowerCase()
  if (c.claims.origin.value === 'church_slavonic') return false
  const fs = c.forms.filter(f => f.raw.toLowerCase() === raw || f.norm.toLowerCase() === raw)
  return fs.length > 0 && fs.every(f => !f.claims['church_slavonic'])
}

export function writeCognates(cards: Pick<LemmaCard, 'lemma' | 'forms' | 'first' | 'claims'>[], root: string, pub: string, generated: string): { entries: number; dated: number; flags: number } {
  const p = resolve(root, 'data/work/cognates-kaikki.json')
  if (!existsSync(p)) return { entries: 0, dated: 0, flags: 0 }
  const kk = JSON.parse(readFileSync(p, 'utf8')) as { files: CognateFile['attribution']['files']; pivots: Record<string, { pivot: string; gloss?: string; rows: CogRow[] }> }
  const ety = existsSync(resolve(root, 'data/work/etymology-kaikki.json')) ? JSON.parse(readFileSync(resolve(root, 'data/work/etymology-kaikki.json'), 'utf8')).words as Record<string, { chain?: EtymStep[] }> : {}
  const entries: CognateFile['entries'] = {}
  let dated = 0, flags = 0
  for (const c of cards) {
    const k = kk.pivots[stripAccent(c.lemma)]; if (!k) continue
    const rows = k.rows.slice().sort((a, b) => a.l.localeCompare(b.l))
    const ev = [cogEvidence(k.pivot, `*${k.pivot.replace(/^\*/, '')}: ${rows.map(r => `${r.l} ${r.w}${r.b ? ' (запозичено)' : ''}`).join(', ')}`, '2026-10-14')]
    const e: CognateFile['entries'][string] = { pivot: k.pivot, ...(k.gloss ? { gloss: k.gloss } : {}), rows, evidence: ev }
    if (rows.some(r => r.d)) dated++
    if (isKnown(c.first) && isVernacular(c)) {
      const f = cognateFlag({ ours: c.first.value.date, vernacular: true }, rows, donorOf(ety[c.lemma]?.chain))
      if (f) { e.flag = f; flags++ }
    }
    entries[c.lemma] = e
  }
  const file: CognateFile = {
    format: 1, generated,
    attribution: {
      wiktionary: 'Відповідники та датування — Вікісловник (en.wiktionary.org), дерева нащадків Proto-Slavic і тексти етимологій; автори статей; витяг Wiktextract / kaikki.org (Tatu Ylönen)',
      licence: 'CC BY-SA 4.0 — зберігайте атрибуцію й ліцензію', files: kk.files,
    },
    entries,
  }
  writeFileSync(resolve(pub, 'cognates.json'), JSON.stringify(file))
  return { entries: Object.keys(entries).length, dated, flags }
}
