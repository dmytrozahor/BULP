/**
 * SPEC 63 SN-2 — background sense audit (no agent watching): `npm run audit:senses`.
 * Reads the built public/data (cv/ shards, cardindex.json, lexicon.json, sociolect.json, corpus.json) and writes analysis/sense-audit.md (atomic; idempotent: the same data give the same file
 * except the date line). Exit code 1 if a Plast headword has no card (the build test fails on the same condition). Without built data it writes nothing and exits 0 (RS-1: nothing half-done).
 *  - Plast sense: every Plast headword must resolve to a card of some kind (full / light / CV / archaic) — the card views join the Plast sense by headword (src/components/PlastSenses.vue).
 *  - Dictionary headwords: CV cards with dictionary attestation lines must yield ≥ 1 sense (core/sn.ts senseOfAtts).
 *  - Dating: each sense must have a first dictionary/witness year.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unpackCore } from '../core/pack.ts'
import { lk, type CvEntry } from '../core/cv.ts'
import { auditMarkdown, auditSenses, senseOfAtts, type AuditCard, type DictDir } from '../core/sn.ts'
import { R2U_DICTS } from './r2u.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rd = <T>(p: string) => JSON.parse(readFileSync(p, 'utf8')) as T

/** pure core of the audit over already-loaded data (tests call this with fixtures) */
export function runAudit(d: {
  cv: Iterable<[string, CvEntry]>; fullLemmas: Iterable<string>; cardKeys: ReadonlySet<string>; plastWords: string[]
  dateOf: (w: string) => [number, number] | undefined; dirOf?: (w: string) => DictDir | undefined
}) {
  const cards: AuditCard[] = [], plastKeys = new Set(d.plastWords.map(lk)), seen = new Set<string>()
  for (const [k, e] of d.cv) {
    seen.add(k)
    const atts = e[3], s = senseOfAtts(atts, e[0], d.dateOf, d.dirOf)
    const plast = plastKeys.has(k)
    cards.push({ word: e[0], kind: 'cv', plast, plastSense: plast, dictLines: atts.length, senses: s.senses })
  }
  for (const l of d.fullLemmas) { const k = lk(l); seen.add(k); cards.push({ word: l, kind: 'full', plast: plastKeys.has(k), plastSense: plastKeys.has(k), dictLines: 0, senses: [] }) }
  // a Plast headword that no card owns has no Plast sense anywhere
  for (const w of d.plastWords) { const k = lk(w); if (!seen.has(k)) cards.push({ word: w, kind: 'light', plast: true, plastSense: d.cardKeys.has(k), dictLines: 0, senses: [] }) }
  return auditSenses(cards)
}

function main() {
  const pub = resolve(ROOT, 'public/data')
  if (!existsSync(resolve(pub, 'lexicon.json')) || !existsSync(resolve(pub, 'cv'))) { console.log('no built data (public/data/lexicon.json + cv/): nothing audited'); return 0 }
  const corpus = rd<{ witnesses: { id: string; date?: [number, number] }[] }>(resolve(pub, 'corpus.json'))
  const dates = new Map(corpus.witnesses.map(w => [w.id, w.date]))
  const r2u = new Map(R2U_DICTS.map(x => [x.unitId, x]))
  const dateOf = (w: string) => dates.get(w) ?? r2u.get(w)?.years
  const dirOf = (w: string) => r2u.get(w)?.dir
  const cv: [string, CvEntry][] = []
  for (const f of readdirSync(resolve(pub, 'cv')).filter(x => x.endsWith('.json'))) {
    for (const [k, e] of Object.entries(rd<Record<string, CvEntry>>(resolve(pub, 'cv', f)))) cv.push([k, e[0] ? e : ([k, ...e.slice(1)] as unknown as CvEntry)])   // DO-6: '' = the key is the word
  }
  const ci = rd<{ lw: string[]; ar: string[][]; ld?: string[] }>(resolve(pub, 'cardindex.json'))
  const cardKeys = new Set([...ci.lw, ...(ci.ld ?? []), ...ci.ar.flat()].map(lk))
  const full = unpackCore(rd(resolve(pub, 'lexicon.json'))).map(c => c.lemma)
  const sp = resolve(pub, 'sociolect.json')
  const plastWords = existsSync(sp) ? rd<{ plast: { entries: { w: string }[] } }>(sp).plast.entries.map(e => e.w) : []
  const res = runAudit({ cv, fullLemmas: full, cardKeys, plastWords, dateOf, dirOf })
  const out = resolve(ROOT, 'analysis/sense-audit.md'), tmp = out + '.tmp'
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(tmp, auditMarkdown(res, new Date().toISOString().slice(0, 10))); renameSync(tmp, out)
  console.log(`sense audit: ${res.cards} cards, ${res.plastWithoutSense.length} Plast without sense, ${res.headwordsWithoutSense.length} headwords without sense, ${res.sensesWithoutDate.length} undated senses -> analysis/sense-audit.md`)
  return res.plastWithoutSense.length ? 1 : 0
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('pipelines/sense-audit.ts')) process.exit(main())
