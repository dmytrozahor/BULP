/**
 * MM-61 measurement (not part of the build): how many noun / verb (and other) homonym pairs the stanza-lemma route could mix. A type counts when the model lemma L is a VESUM HEAD, the token
 * string is a form of L, the class of that head contradicts the model UPOS, and the same string has another VESUM reading whose class agrees with the UPOS.
 * usage: node pipelines/measure-homonyms.ts <BULP root with data/raw/vesum and data/work> <out.json>
 */
import { createReadStream, readdirSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { resolve } from 'node:path'
import { writeJsonAtomic } from './robust.ts'

const root = process.argv[2]!, out = process.argv[3]!
const norm = (s: string) => s.normalize('NFC').replace(/\u0301/g, '').replace(/[ʼ'`]/g, '’').toLowerCase()
const CLS: Record<string, string> = { noun: 'NOUN', verb: 'VERB', adj: 'ADJ', adv: 'ADV', numr: 'NUM', prep: 'ADP', conj: 'CCONJ', part: 'PART', intj: 'INTJ', advp: 'VERB' }
// 1. corpus types (form, model lemma, UPOS)
const types = new Map<string, number>(); const dir = resolve(root, 'data/work')
for (const f of readdirSync(dir).filter(x => x.endsWith('.nlp.json'))) {
  let j: { tokens?: { lemma?: string; upos?: string }[] }, w: { tokens?: { raw: string }[]; lang?: string }
  try { j = JSON.parse(readFileSync(resolve(dir, f), 'utf8')); w = JSON.parse(readFileSync(resolve(dir, f.replace('.nlp.json', '.json')), 'utf8')) } catch { continue }
  if (w.lang !== 'uk' || !j.tokens || !w.tokens) continue
  w.tokens.forEach((t, i) => { const n = j.tokens![i]; if (!n?.lemma || !n.upos || !/^\p{Ll}+$/u.test(t.raw)) return; const k = norm(t.raw) + '|' + norm(n.lemma) + '|' + n.upos; types.set(k, (types.get(k) ?? 0) + 1) })
}
const wantForm = new Set<string>(), wantLemma = new Set<string>()
for (const k of types.keys()) { const [f, l] = k.split('|'); wantForm.add(f!); wantLemma.add(l!) }
// 2. VESUM readings of those strings
const readings = new Map<string, { lemma: string; cls: string }[]>(), heads = new Map<string, Set<string>>(); let lemma = ''
for await (const line of createInterface({ input: createReadStream(resolve(root, 'data/raw/vesum/dict_corp_vis.txt'), 'utf8') })) {
  const body = line.replace(/#.*$/, '').trim().split(/\s+/); if (!body[0]) continue
  const isHead = !/^\s/.test(line); if (isHead) lemma = norm(body[0])
  const f = norm(body[0]), cls = CLS[(body[1] ?? '').split(':')[0]!] ?? ''
  if (isHead && wantLemma.has(f)) (heads.get(f) ?? heads.set(f, new Set()).get(f)!).add(cls)
  if (wantForm.has(f)) (readings.get(f) ?? readings.set(f, []).get(f)!).push({ lemma, cls })
}
// 3. affected types
const pairs = new Map<string, { tokens: number; model: string; upos: string; other: string }>()
for (const [k, n] of types) {
  const [f, l, upos] = k.split('|') as [string, string, string]
  const hc = heads.get(l); if (!hc || hc.has(upos)) continue                 // the head agrees with the model UPOS, or the lemma is no head
  const rs = readings.get(f) ?? []; if (!rs.some(r => r.lemma === l)) continue   // the token is not a form of the head
  const other = rs.find(r => r.cls === upos && r.lemma !== l); if (!other) continue
  const key = `${f} -> ${l} (${[...hc].join('/')}) vs ${other.lemma} (${upos})`; const p = pairs.get(key) ?? { tokens: 0, model: l, upos, other: other.lemma }; p.tokens += n; pairs.set(key, p)
}
const list = [...pairs].sort((a, b) => b[1].tokens - a[1].tokens)
writeJsonAtomic(out, JSON.stringify({ types: types.size, pairs: list.length, tokens: list.reduce((s, x) => s + x[1].tokens, 0), top: list.slice(0, 40) }, null, 1))
console.log('done', types.size, list.length)
