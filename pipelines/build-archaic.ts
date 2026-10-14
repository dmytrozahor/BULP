/**
 * BUILD stage, SPEC 63 AR: archaic lemmas. Dictionary headwords that VESUM does not know become `dictionary` lemmas; every unresolved corpus token whose spelling (or derive()/MU candidate)
 * equals a variant links to them (ref `a:<id>` in the text shards, card /ar/:id); recurring unresolved clusters of Middle Ukrainian witnesses without a dictionary entry become `unverified`
 * candidates. Output: public/data/archaic.json and analysis/archaic-lemmas.md (counts per epoch). The strict VESUM link of build-link.ts is not touched.
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { WitnessOut } from '../core/types.ts'
import { ArchScan, archId, archStats, type ArchFile } from '../core/archaic.ts'
import { MU_ORTH, muCandidates } from '../core/mu-fold.ts'
import { foldSpelling } from '../core/phrasemes.ts'
import { key } from '../core/text.ts'

export interface ArchIn { w: Pick<WitnessOut, 'id' | 'title' | 'tokens' | 'date' | 'witnessType' | 'orth' | 'lang' | 'oldI'>; linked: (ti: number) => boolean; epoch?: string }
type Derive = (s: string, oldI: boolean) => { norm: string; candidates: { form: string }[] }
const MIN_UNVERIFIED_F = 3

export function buildArchaic(ins: ArchIn[], derive: Derive, generated: string): { file: ArchFile; refs: Map<string, string[]>; counts: { dictionaryTokens: number; unverifiedTokens: number } } {
  const scan = new ArchScan(), refs = new Map<string, string[]>(), keysOf = (raw: string, oldI: boolean, orth?: string): string[] => {
    const ks = new Set([archId(raw)])
    for (const c of derive(raw, oldI).candidates) ks.add(archId(c.form))
    ks.add(archId(derive(raw, oldI).norm))
    if (orth && MU_ORTH.has(orth)) for (const m of muCandidates(key(raw))) ks.add(archId(m.form))
    ks.delete(''); return [...ks]
  }
  // 1. dictionary headwords nobody linked to VESUM
  const dictRefs = new Map<string, string[]>()
  for (const { w, linked, epoch } of ins) {
    if (w.witnessType !== 'dictionary') continue
    const groups = new Map<string, { ti: number[]; raws: string[]; any: boolean }>()
    w.tokens.forEach((t, ti) => { const g = groups.get(t.loc) ?? groups.set(t.loc, { ti: [], raws: [], any: false }).get(t.loc)!; g.ti.push(ti); g.raws.push(t.raw); g.any ||= linked(ti) })
    const r: string[] = new Array(w.tokens.length).fill('')
    for (const [loc, g] of groups) {
      if (g.any) continue                                   // a variant has a VESUM continuant: an ordinary word, not an archaic lemma
      const id = scan.addDictEntry({ id: w.id, date: w.date, ...(epoch ? { epoch } : {}) }, loc, g.raws); if (!id) continue
      for (const ti of g.ti) r[ti] = 'a:' + id
    }
    dictRefs.set(w.id, r)
  }
  for (const e of [...scan.byId.values()]) for (const v of e.variants) for (const k of keysOf(v, true)) scan.alias(k, e.id)
  // 2. corpus tokens that equal a dictionary variant
  const counts = { dictionaryTokens: 0, unverifiedTokens: 0 }
  for (const { w, linked, epoch } of ins) {
    const r = dictRefs.get(w.id) ?? new Array<string>(w.tokens.length).fill(''); let any = r.some(Boolean)
    if (w.witnessType !== 'dictionary') w.tokens.forEach((t, ti) => {
      if (linked(ti) || t.raw.length < 3 || !/^\p{L}[\p{L}'’ʼ-]*$/u.test(t.raw)) return
      const id = scan.lookup(keysOf(t.raw.toLowerCase(), !!w.oldI, w.orth)); if (!id) return
      scan.hit(id, w, epoch, t); r[ti] = 'a:' + id; any = true; counts.dictionaryTokens++
    })
    if (any) refs.set(w.id, r)
  }
  // 3. recurring unresolved clusters of Middle Ukrainian witnesses: `unverified`
  const clusters = new Map<string, { raws: Map<string, number>; f: number }>()
  for (const { w, linked } of ins) {
    if (!w.orth || !MU_ORTH.has(w.orth)) continue
    const r = refs.get(w.id)
    w.tokens.forEach((t, ti) => {
      if (linked(ti) || r?.[ti] || t.raw.length < 4 || !/^\p{Ll}[\p{L}'’ʼ-]*$/u.test(t.raw)) return
      const k = foldSpelling(t.raw.toLowerCase()), c = clusters.get(k) ?? clusters.set(k, { raws: new Map(), f: 0 }).get(k)!
      c.f++; c.raws.set(t.raw.toLowerCase(), (c.raws.get(t.raw.toLowerCase()) ?? 0) + 1)
    })
  }
  const uid = new Map<string, string>()
  for (const [k, c] of clusters) if (c.f >= MIN_UNVERIFIED_F) { const raws = [...c.raws].sort((a, b) => b[1] - a[1]); uid.set(k, scan.addUnverified(raws[0]![0], raws.map(x => x[0]))) }
  for (const { w, linked, epoch } of ins) {
    if (!w.orth || !MU_ORTH.has(w.orth)) continue
    const r = refs.get(w.id) ?? new Array<string>(w.tokens.length).fill(''); let any = r.some(Boolean)
    w.tokens.forEach((t, ti) => {
      if (linked(ti) || r[ti] || t.raw.length < 4 || !/^\p{Ll}[\p{L}'’ʼ-]*$/u.test(t.raw)) return
      const id = uid.get(foldSpelling(t.raw.toLowerCase())); if (!id) return
      scan.hit(id, w, epoch, t); r[ti] = 'a:' + id; any = true; counts.unverifiedTokens++
    })
    if (any) refs.set(w.id, r)
  }
  return { file: scan.file(generated), refs, counts }
}

export function archReport(file: ArchFile, counts: { dictionaryTokens: number; unverifiedTokens: number }, outDir: string): string {
  const s = archStats(file)
  let md = '# Archaic lemmas (SPEC 63 AR)\n\nGenerated by `pipelines/build-archaic.ts`. `dictionary` = a headword of the historical dictionary witness (BL-11) none of whose variants is a VESUM form; its card quotes the dictionary\'s own header line with locator. ' +
    '`unverified` = a recurring unresolved word (≥ 3 tokens, spelling-folded) of a Middle Ukrainian witness without any dictionary entry — a candidate only, labelled so on its card. Tokens are linked only through a spelling that equals a variant (derive() / MU candidates), never guessed.\n\n' +
    `| kind | lemmas | corpus tokens linked |\n|---|---|---|\n| dictionary | ${s.dictionary} | ${counts.dictionaryTokens} |\n| unverified | ${s.unverified} | ${counts.unverifiedTokens} |\n| **all** | ${s.dictionary + s.unverified} | ${s.tokens} |\n\n` +
    '## Per epoch\n\nA lemma counts in an epoch when a corpus token of it falls there, or (dictionary lemmas) the dictionary witness does.\n\n| epoch | archaic lemmas | corpus tokens |\n|---|---|---|\n'
  for (const [ep, b] of Object.entries(s.byEpoch).sort()) md += `| ${ep} | ${b.lemmas} | ${b.tokens} |\n`
  md += '\n## Most frequent\n\n| lemma | kind | tokens | first attestation | dictionary line |\n|---|---|---|---|---|\n'
  for (const e of file.entries.slice(0, 30)) md += `| ${e.head} | ${e.status} | ${e.n} | ${e.first ? `${e.first.w} ${e.first.date[0]}` : '—'} | ${e.dict ? e.dict.quote.slice(0, 70).replace(/\|/g, '/') : '—'} |\n`
  writeFileSync(resolve(outDir, 'archaic-lemmas.md'), md)
  return md
}
