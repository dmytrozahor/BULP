/**
 * SPEC 63 LB-11 — measure the seven classes over the LIVE data without a build (read-only): the stored lm/lb shards of the live build (LB_LIVE_LB dir) give classes 1–3 and the
 * LB-9 sub-class; for every other entry the tail (classes 4–7, core/labels.ts tailClass) is applied to the facts of pipelines/lb-facts.ts, read from the committed small files
 * (corpus.json, lexicon.json, light.json, archaic.json: the same as on Pages) and the live cv shards (LB_LIVE_CV dir).
 * LB-16: LB_EXTRA_HITS = JSON of pipelines/lb-extra-hits.ts (key → dictionary hits of tables that are not in the live shards yet); an entry that is not class «діалектне за словником» and has such a hit becomes one (strict when a hit marks the word,
 * place-only when every hit records only a place), exactly as dialectOf does for hits in the build; the result also splits the class into strict / place for the attested entries.
 * Env: PARTS_DATA (public/data), LB_LIVE_LB, LB_LIVE_CV, LB_MEASURE_OUT (status JSON), LB_MEASURE_MD (section appended to analysis/labels-coverage.md; empty = skip).
 * Crash-tolerant: reads only, writes the status file at the end via writeJsonAtomic.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { lk } from '../core/cv.ts'
import { seBucket } from '../core/parts.ts'
import { unpackCore } from '../core/pack.ts'
import { CLASS_KEYS, CLASS_KEY_UK, GRADE_UK, classKeyOf, emptyEntry, gradeOf, tailClass, witFromRegionRows, type DialectResult, type LbEntry, type TailFacts } from '../core/labels.ts'
import { archaicFacts, cvFacts, lightFacts, witMeta } from './lb-facts.ts'
import type { DictHit } from '../core/dict-labels.ts'
import { writeJsonAtomic } from './robust.ts'

const PUB = process.env.PARTS_DATA ?? 'public/data', LB = process.env.LB_LIVE_LB ?? '', CV = process.env.LB_LIVE_CV ?? '', OUT = process.env.LB_MEASURE_OUT ?? 'lb-measure.json', EXTRA = process.env.LB_EXTRA_HITS ?? ''
const rj = <T>(p: string): T | undefined => { try { return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) as T : undefined } catch { return undefined } }

export function measure() {
  const wm = witMeta(rj(`${PUB}/corpus.json`))
  const stored = new Map<string, LbEntry>()
  for (const f of readdirSync(LB)) { const j = rj<Record<string, LbEntry>>(`${LB}/${f}`); if (j) for (const [k, e] of Object.entries(j)) stored.set(k, e) }
  const all: Record<string, number> = {}, att: Record<string, number> = {}, grade: Record<string, number> = {}, few: Record<string, number> = {}, fewKind: Record<string, number> = {}, kinds: Record<string, number> = {}
  const extra = new Map<string, DictHit[]>(Object.entries(rj<Record<string, DictHit[]>>(EXTRA) ?? {}))
  const seen = new Set<string>(); let total = 0, attTotal = 0
  const add = { all: 0, att: 0, attStrict: 0, attPlace: 0, upgraded: 0 }, split = { strict: 0, place: 0 }, dictKind: Record<string, number> = {}, fullSplit = { strict: 0, place: 0 }
  const one = (k: string, kind: string, facts: TailFacts, attested: boolean, fullWit?: ReturnType<typeof witFromRegionRows>) => {
    if (seen.has(k)) return; seen.add(k)
    const e = stored.get(k) ?? emptyEntry()
    let d: DialectResult = e.d
    if (d.c === 'few') { const marks = [...new Set(e.r.map(r => r[0]))]; d = tailClass(d.corp, undefined, { ...facts, ...(marks.length ? { marks } : {}), ...(fullWit ? { wit: fullWit } : {}) }, true) }
    const x = extra.get(k)
    if (x?.length) {
      const strict = x.some(h => !h.p)
      if (d.c !== 'dict') { d = { c: 'dict', strict, dict: x }; add.all++; if (attested) { add.att++; if (strict) add.attStrict++; else add.attPlace++ } }
      else if (d.strict === false && strict) { d = { ...d, strict: true, dict: [...(d.dict ?? []), ...x] }; add.upgraded++ }
    }
    if (d.c === 'dict') dictKind[kind] = (dictKind[kind] ?? 0) + 1
    if (attested && d.c === 'dict') { if (d.strict === false) split.place++; else split.strict++ }
    if (kind === 'full' && d.c === 'dict') { if (d.strict === false) fullSplit.place++; else fullSplit.strict++ }
    const key = classKeyOf(d), g = gradeOf(d) ?? 'none'
    total++; all[key] = (all[key] ?? 0) + 1; grade[`${key}:${g}`] = (grade[`${key}:${g}`] ?? 0) + 1; kinds[kind] = (kinds[kind] ?? 0) + 1
    if (attested) { attTotal++; att[key] = (att[key] ?? 0) + 1 }
    if (key === 'few') { few[d.why ?? '—'] = (few[d.why ?? '—'] ?? 0) + 1; fewKind[kind] = (fewKind[kind] ?? 0) + 1 }
  }
  const lex = rj<unknown>(`${PUB}/lexicon.json`)
  if (lex) for (const c of unpackCore(lex)) {
    const k = lk(c.lemma), rows = (stored.get(k)?.d.corp?.rows) ?? [], fv = c.first?.value
    one(k, 'full', { vesum: c.paradigm.length > 0 }, true, witFromRegionRows(rows, wm.regionName, typeof fv === 'object' ? fv.date[0] : 0))
  }
  for (const r of rj<{ lemmas: [string, string, number, string][] }>(`${PUB}/light.json`)?.lemmas ?? []) one(lk(r[0]), 'light', lightFacts(r, wm.meta), true)
  for (const a of rj<{ entries: { id: string; witnesses?: Record<string, number>; dict?: { w?: string } }[] }>(`${PUB}/archaic.json`)?.entries ?? []) one(lk(a.id), 'archaic', archaicFacts(a, wm.meta), true)
  if (CV && existsSync(CV)) for (const f of readdirSync(CV)) for (const [w, e] of Object.entries(rj<Record<string, unknown[]>>(`${CV}/${f}`) ?? {})) { const x = cvFacts(e, wm.meta); one(lk(w), x.attested ? 'cv-attested' : 'cv-dict', x.facts, x.attested) }
  if (process.env.LB_KNOWN_OUT) writeJsonAtomic(process.env.LB_KNOWN_OUT, JSON.stringify([...seen]))
  const res = { total, attTotal, all, att, grade, few, fewKind, kinds, dictAtt: split, dictKind, fullDict: fullSplit, ...(extra.size ? { extra: { lemmasWithHits: extra.size, ...add } } : {}) }
  writeJsonAtomic(OUT, JSON.stringify(res, null, 1))
  const pc = (n: number, d: number) => `${n} (${d ? ((100 * n) / d).toFixed(1) : '0.0'} %)`
  const md = ['', `## LB-16 (LB-15 + джерела зі списку Грінченка${extra.size ? '' : ', без цих джерел'}): десять класів (виміряно на живих даних збірки, без build:data; ${new Date().toISOString().slice(0, 10)})`, '', `Усього записів ${total}; засвідчених у корпусі ${attTotal}. Класи 1–3 і підклас СУМ узято з опублікованих шардів lm/lb, класи 4–7 застосовано до решти за даними cv, light, archaic, corpus.`, '',
    '| клас | усі записи | засвідчені в корпусі |', '|---|---|---|', ...CLASS_KEYS.map(k => `| ${CLASS_KEY_UK[k]} | ${pc(all[k] ?? 0, total)} | ${pc(att[k] ?? 0, attTotal)} |`), '',
    `«Діалектне за словником» серед засвідчених: ${pc(att.dict ?? 0, attTotal)}, з них слово позначено діалектним ${pc(split.strict, attTotal)}, словник лише називає місце запису ${pc(split.place, attTotal)}; серед карток з корпусом (full): ${pc(dictKind.full ?? 0, kinds.full ?? 0)}.${extra.size ? ` Нові джерела (LB-16): ${extra.size} лем мають нові позначки, з них стало класом «діалектне» ${add.all} (засвідчених ${add.att}: ${add.attStrict} позначають слово, ${add.attPlace} лише місце), ${add.upgraded} підвищено з «лише місце» до «позначає слово».` : ''}`, '',
    '### Ступінь доказу', '', ...Object.entries(grade).sort().map(([k, n]) => { const [c, g] = k.split(':'); return `- ${CLASS_KEY_UK[c as keyof typeof CLASS_KEY_UK]}: ${g === 'none' ? 'без ступеня' : GRADE_UK[g as 'strong']}: ${n}` }), '',
    '### Чому «невизначено»', '', ...(Object.keys(few).length ? [...Object.entries(few).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `- ${k}: ${n}`), `- (решта ${Object.keys(few).length - 12 > 0 ? Object.keys(few).length - 12 : 0} різновидів причини — суміші словників без названої бази — разом ${Object.values(few).sort((a, b) => b - a).slice(12).reduce((a, b) => a + b, 0)})`] : ['- таких записів немає']), '']
  const mdOut = process.env.LB_MEASURE_MD
  if (mdOut && existsSync(mdOut)) { const t = readFileSync(mdOut, 'utf8').split(/\n## LB-1\d /)[0]!.replace(/\s+$/, ''); writeJsonAtomic(mdOut, t + '\n' + md.join('\n') + '\n') }
  console.log(JSON.stringify(res))
  return res
}
if (process.argv[1]?.endsWith('lb-measure.ts')) measure()
