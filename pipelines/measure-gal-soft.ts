/**
 * MM-48…MM-51 measurement (not part of the build): runs every fold of core/gal-soft.ts (+ ORTH-ZHEL-SOFT) over the corpus vocabulary that VESUM does not list as a form and reports, per rule, the newly
 * linked types / tokens, the top examples, the forms the reverse guard blocked (plain already a VESUM form, a fold would have produced another VESUM form) and a seeded random sample for hand checks.
 * usage: node pipelines/measure-gal-soft.ts <BULP root with data/raw/vesum and data/work> <out.json>
 */
import { createReadStream, readdirSync, readFileSync } from 'node:fs'
import { writeJsonAtomic } from './robust.ts'
import { createInterface } from 'node:readline'
import { resolve } from 'node:path'
import { GAL_SOFT_MEASURED } from '../core/gal-soft.ts'
import { galSoftGate } from '../core/gal-soft.ts'
import { ZHEL_FOLDS } from '../core/zhel-folds.ts'

const root = process.argv[2]!, out = process.argv[3]!
const norm = (s: string) => s.normalize('NFC').replace(/\u0301/g, '').replace(/[ʼ'`]/g, '’').toLowerCase()
const forms = new Set<string>(), lemmaOf = new Map<string, string>()
const rl = createInterface({ input: createReadStream(resolve(root, 'data/raw/vesum/dict_corp_vis.txt'), 'utf8') })
let lemma = ''
for await (const line of rl) {
  const w = line.replace(/#.*$/, '').trim().split(/\s+/)[0]; if (!w) continue
  if (!/^\s/.test(line)) lemma = norm(w)
  const k = norm(w); forms.add(k); if (!lemmaOf.has(k)) lemmaOf.set(k, lemma)
}
const freq = new Map<string, number>()
const dir = resolve(root, 'data/work')
for (const f of readdirSync(dir).filter(x => x.endsWith('.json') && !x.endsWith('.nlp.json'))) {
  let j: { tokens?: { raw: string }[] }; try { j = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) } catch { continue }
  if (!Array.isArray(j.tokens)) continue
  for (const t of j.tokens) { if (!/^\p{L}[\p{L}'’ʼ-]*$/u.test(t.raw)) continue; const k = norm(t.raw); freq.set(k, (freq.get(k) ?? 0) + 1) }
}
const folds = [...GAL_SOFT_MEASURED, ...ZHEL_FOLDS.filter(f => f.id === 'ORTH-ZHEL-SOFT')]
const rep: Record<string, { types: number; tokens: number; top: [string, string, number][]; blocked: [string, string, number][]; gated: [string, string, number][]; sample: [string, string, number][] }> = {}
for (const f of folds) rep[f.id] = { types: 0, tokens: 0, top: [], blocked: [], gated: [], sample: [] }
const need = new Set<string>()
for (const w of freq.keys()) for (const f of folds) { const t = f.apply(w); if (t !== w && forms.has(norm(t))) need.add(norm(t)) }
const tagsOf = new Map<string, string[]>(); let lemmaNow = ''
for await (const line of createInterface({ input: createReadStream(resolve(root, 'data/raw/vesum/dict_corp_vis.txt'), 'utf8') })) {
  if (line && !/^\s/.test(line)) lemmaNow = norm(line.replace(/#.*$/, '').trim().split(/\s+/)[0] ?? '')
  const body = line.replace(/#.*$/, '').trim().split(/\s+/); const k = body[0] ? norm(body[0]) : ''
  if (need.has(k)) (tagsOf.get(k) ?? tagsOf.set(k, []).get(k)!).push((lemmaNow || '') + '|' + (body[1] ?? ''))
}
for (const [w, n] of freq) {
  const plain = forms.has(w)
  for (const f of folds) {
    const t = f.apply(w); if (t === w) continue
    const kt = norm(t); if (!forms.has(kt)) continue
    const r = rep[f.id]!
    if (plain) { r.blocked.push([w, t, n]); continue }
    if (!(tagsOf.get(kt) ?? []).some(tg => galSoftGate(f.id, w, tg.split('|')[1]!, k => forms.has(k), tg.split('|')[0]!))) { r.gated.push([w, t, n]); continue }
    r.types++; r.tokens += n; r.top.push([w, t, n])
  }
}
let seed = 20261101; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32
for (const r of Object.values(rep)) {
  r.top.sort((a, b) => b[2] - a[2]); r.blocked.sort((a, b) => b[2] - a[2]); r.gated.sort((a, b) => b[2] - a[2])
  const all = [...r.top]; for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [all[i], all[j]] = [all[j]!, all[i]!] }
  r.sample = all.slice(0, 50); r.top = r.top.slice(0, 30); r.blocked = r.blocked.slice(0, 15); r.gated = r.gated.slice(0, 15)
}
writeJsonAtomic(out, JSON.stringify({ vocab: freq.size, vesumForms: forms.size, rep }, null, 1))
console.log('done', freq.size, forms.size)
