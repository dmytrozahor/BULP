/**
 * SPEC 63 DV-1 / DV-1b — turns the output of pipelines/dv1-scan.ts (DV_IN, default data/work/dv1) into
 *   data/dv/hypotheses.json        the shipped hypotheses (correspondences ≥ 80 % by hand check), read by pipelines/build-corr.ts as CR-1 members graded «гіпотеза»
 *   data/dv/stats.json             counts per method, per rule, the explained share of the unresolved tokens
 *   analysis/dialect-variants-review.md   the top 300 unresolved candidates for the owner to confirm or reject in bulk
 *   public/data/dv/numerals.json   the numeral map (lazy), and analysis/dialect-numerals.md (the table page)
 * Lines the owner confirmed (data/owner/variants-confirmed.tsv) or rejected (variants-rejected.tsv) leave the review file. Idempotent; atomic writes.
 *   node --experimental-transform-types pipelines/build-dv.ts [DV_IN]
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DV_EXPLORED, DV_PRECISION, DV_RULES, DV_SHIP_PRECISION, hypothesisOk, dvRuleById, parseOwnerTsv, ownerPairKey, type DvLink } from '../core/dialect-variants.ts'
import { COL_OF_GROUP, NUM_COLS, colOfArea, coverage, mergeCells, NO_DATA, GRADE_NUM_UK, type NumCell, type NumRow, type NumeralMap } from '../core/numeral-map.ts'
import { VARIANT_FAMILIES } from '../core/variant-families.ts'
import { readJson, writeJsonAtomic } from './robust.ts'

const ROOT = resolve(process.env.DV_ROOT ?? '.'), IN = resolve(process.argv[2] ?? process.env.DV_IN ?? resolve(ROOT, 'data/work/dv1'))
const rd = <T>(n: string): T => readJson<T>(resolve(IN, n))
const SHIPPED = new Set(Object.entries(DV_PRECISION).filter(([, p]) => p.c / p.n >= DV_SHIP_PRECISION).map(([r]) => r))
// rules measured at ≥ 80 % in the second hand check (the table in core/dialect-variants.ts is the record; the new sub-rules are added by `precision.json` written after the check)
const precFile = resolve(ROOT, 'data/dv/precision.json')
if (existsSync(precFile)) for (const [r, p] of Object.entries(readJson<Record<string, { n: number; c: number }>>(precFile))) { DV_PRECISION[r] = p; if (p.c / p.n >= DV_SHIP_PRECISION) SHIPPED.add(r); else SHIPPED.delete(r) }

const own = (f: string) => { const p = resolve(ROOT, 'data/owner', f); return existsSync(p) ? parseOwnerTsv(readFileSync(p, 'utf8')) : [] }
const confirmed = own('variants-confirmed.tsv'), rejected = own('variants-rejected.tsv')
const drop = new Set([...confirmed, ...rejected].map(r => ownerPairKey(r.form, r.target)))

interface Hyp { form: string; raw: string; f: number; nW: number; wits: string[]; hits: { rule: string; target: string; lemma: string; pos: string; tags: string }[] }
const skew = rd<Record<string, [string, number][]>>('dv1-skew.json')
const regionsOf = (k: string): [string, number][] => skew[k] ?? []
const nWof = (k: string, d: number): number => +(skew[k + '\u0001w']?.[0]?.[0] ?? d)
const regionLine = (k: string): string => {
  const r = regionsOf(k); const tot = r.reduce((a, x) => a + x[1], 0); if (!tot) return 'регіон невідомий'
  return r.slice(0, 2).map(([n, t]) => `${n} ${Math.round((t / tot) * 100)} %`).join(', ')
}

// ── hypotheses: single-target hits (or all hits on one lemma) of one rule ───────────────────────────────────────────
const hyp = rd<Hyp[]>('dv1-hyp.json')
interface Cand { form: string; target: string; lemma: string; pos: string; rule: string; f: number; nW: number }
const cands: Cand[] = []
for (const h of hyp) {
  const lemmas = new Set(h.hits.map(x => x.lemma)); if (lemmas.size !== 1) continue   // ambiguous: not offered
  const x = h.hits[0]!
  if (x.rule.includes('+')) continue
  cands.push({ form: h.form, target: x.target, lemma: x.lemma, pos: x.pos, rule: x.rule, f: h.f, nW: nWof(h.form, h.nW) })
}
const live = cands.filter(c => !drop.has(ownerPairKey(c.form, c.lemma)) && !drop.has(ownerPairKey(c.form, c.target)))
const posOk = (c: Cand) => { const r = dvRuleById[c.rule]; return !r?.pos || r.pos.includes(c.pos) }
const ship = live.filter(c => posOk(c) && hypothesisOk({ form: c.form, f: c.f, nW: c.nW, vesumKnown: false, targetNormative: true, targetPos: [c.pos], target: c.target, ruleId: c.rule }, SHIPPED).ok)
const rows: DvLink[] = ship.map(c => ({ form: c.form, target: c.lemma, method: 'hypothesis', grade: 'hyp', via: c.rule, pos: c.pos, f: c.f, nW: c.nW, regions: regionsOf(c.form).slice(0, 3) }))
mkdirSync(resolve(ROOT, 'data/dv'), { recursive: true })
writeJsonAtomic(resolve(ROOT, 'data/dv/hypotheses.json'), JSON.stringify({ format: 1, shipped: [...SHIPPED].sort(), rows }))

// ── stats ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const st = rd<{ tokens: number; types: number; byClass: Record<string, { tokens: number; types: number }>; m1: Record<string, { tokens: number; types: number }>; m2: Record<string, { tokens: number; types: number }>; cands: number; candTokens: number }>('dv1-stats.json')
const pct = (n: number) => (100 * n / st.tokens).toFixed(2) + ' %'
const hypTok = cands.reduce((a, c) => a + c.f, 0), shipTok = ship.reduce((a, c) => a + c.f, 0)
const byRule: Record<string, { types: number; tokens: number; shipped: number }> = {}
for (const c of cands) { const r = (byRule[c.rule] ??= { types: 0, tokens: 0, shipped: 0 }); r.types++; r.tokens += c.f }
for (const c of ship) byRule[c.rule]!.shipped++
// what the methods explain (one count per spelling; a spelling with a dictionary link is counted under dict only). ORTH-GAL-I-E (крадіжів > крадежів, 44 types) failed the second spot check and is not counted.
const M2_DROP = new Set(['ORTH-GAL-I-E'])
const lk = rd<DvLink[]>('dv1-links.json').filter(l => !(l.method === 'rule' && M2_DROP.has(l.via)))
const firstOf = new Map<string, DvLink>(); for (const l of lk) { const o = firstOf.get(l.form); if (!o || (l.method === 'dict' && o.method !== 'dict')) firstOf.set(l.form, l) }
const explained: Record<string, { types: number; tokens: number; share: string }> = {}
for (const l of firstOf.values()) { const e = (explained[l.method] ??= { types: 0, tokens: 0, share: '' }); e.types++; e.tokens += l.f }
explained.hypothesis = { types: ship.length, tokens: shipTok, share: '' }; explained.hypothesisAllRulesIncludingNotShipped = { types: cands.length, tokens: hypTok, share: '' }
for (const e of Object.values(explained)) e.share = pct(e.tokens)
const spotCheck = { method1: { perSource: { 'Буковина': [50, 2], 'Онишкевич': [50, 3], 'Гуцульські': [50, 2], 'Чабаненко': [50, 2], 'Сабадош': [50, 2], 'місце запису (ВЕСУМ arch / slang)': [50, 2] }, note: '[checked, doubtful]; plausibility judged by reading, not against the scans' }, method2: { sample: 200, wrong: 9, note: 'restricted fold set; ORTH-1928-* (≈70 % wrong), ORTH-DAT-OVI (≈40 %), ORTH-GAL-I-E removed' } }
writeJsonAtomic(resolve(ROOT, 'data/dv/stats.json'), JSON.stringify({ format: 1, explained, spotCheck, tokens: st.tokens, types: st.types, byClass: st.byClass, m1: st.m1, m2: st.m2, hyp: { types: cands.length, tokens: hypTok, shippedTypes: ship.length, shippedTokens: shipTok, byRule }, precision: DV_PRECISION, shipped: [...SHIPPED] }, null, 1))

// ── review file ───────────────────────────────────────────────────────────────────────────────────────────────────────
const num = existsSync(resolve(IN, 'dv1-num.json')) ? rd<{ hits: { form: string; f: number; nW: number; tgt: string; lemma: string; tags: string; rule: string }[]; vesumNon: { form: string; lemma: string; tags: string }[] }>('dv1-num.json') : { hits: [], vesumNon: [] }
const L: string[] = []
const line = (c: { form: string; lemma: string; target: string; f: number; nW: number; pos?: string }) => `- ${c.form} → ${c.lemma}${c.target !== c.lemma ? ` (${c.target})` : ''}${c.pos ? ` [${c.pos}]` : ''}: ${c.f} вживань, ${c.nW} пам’яток; ${regionLine(c.form)}`
L.push('# Діалектні варіанти: кандидати для підтвердження власником (SPEC 63 DV-1)', '',
  'Усе нижче — **гіпотези**: словникового підтвердження немає, збіг знайдено за системним відповідником і VESUM, регіон — це регіон пам’яток, а не говір. Підтверджені рядки копіюйте у `data/owner/variants-confirmed.tsv` (форма TAB стандартне слово TAB говір), відхилені — у `data/owner/variants-rejected.tsv`; вони більше не повертаються. Форма, яку знає VESUM, сюди не потрапляє.', '',
  `Джерело: ${st.types.toLocaleString('uk')} різних написань, ${st.tokens.toLocaleString('uk')} вживань без картки. Правила, перевірені вручну на точність ≥ ${DV_SHIP_PRECISION * 100} %, позначено «поширюється»; решта показана для порівняння й не потрапляє в дані.`, '')
let n = 0
const perRule = [...DV_RULES, ...DV_EXPLORED].map(r => r.id)
const order = [...perRule].sort((a, b) => +SHIPPED.has(b) - +SHIPPED.has(a))
const pool = live.filter(c => !SHIPPED.has(c.rule) ? ['DV-JE-JA', 'DV-JE-I', 'DV-DZ-Z', 'DV-JE-T', 'DV-JE-O-INIT'].includes(c.rule) : true)
const LIMIT = 300, take = new Map<string, Cand[]>()
// shipped rules first (all of them, by frequency), then the others by frequency until 300
for (const r of order) { const a = pool.filter(c => c.rule === r).sort((x, y) => y.f - x.f); take.set(r, a) }
let budget = LIMIT
const chosen = new Map<string, Cand[]>()
const rest = order.filter(r => !SHIPPED.has(r) && (take.get(r)?.length ?? 0) > 0)
for (const r of order) { const a = take.get(r)!; if (!SHIPPED.has(r)) continue; const k = Math.min(a.length, budget); chosen.set(r, a.slice(0, k)); budget -= k }
for (let i = 0; i < rest.length; i++) { const r = rest[i]!, a = take.get(r)!, k = Math.min(a.length, Math.ceil(budget / (rest.length - i))); chosen.set(r, a.slice(0, k)); budget -= k }
for (const r of order) {
  const a = chosen.get(r); if (!a?.length) continue
  const ruleDef = [...DV_RULES, ...DV_EXPLORED].find(x => x.id === r)!, p = DV_PRECISION[r]
  L.push(`## ${r}: ${ruleDef.name}`, '', `${SHIPPED.has(r) ? '**поширюється як гіпотеза**' : '_не поширюється_'}${p ? `; точність за ручною перевіркою ${p.c} із ${p.n} (${Math.round(100 * p.c / p.n)} %)` : ''}; усього ${byRule[r]?.types ?? 0} написань, ${byRule[r]?.tokens ?? 0} вживань. ${ruleDef.note}`, '')
  for (const c of a) { L.push(line(c)); n++ }
  L.push('')
}
if (num.hits.length) {
  L.push('## Числівники (DV-1b): написання, впізнані як форми числівників', '')
  const seen = new Set<string>()
  for (const h of [...num.hits].sort((x, y) => y.f - x.f).slice(0, 60)) { if (drop.has(ownerPairKey(h.form, h.lemma)) || seen.has(h.form)) continue; seen.add(h.form); L.push(line({ form: h.form, lemma: h.lemma, target: h.tgt, f: h.f, nW: h.nW })) }
  L.push('')
}
L.push('## Для копіювання', '', 'Стандартне слово — лема. Рядок: `форма<TAB>лема<TAB>говір`.', '', '```')
for (const r of order) for (const c of chosen.get(r) ?? []) if (SHIPPED.has(r)) L.push(`${c.form}\t${c.lemma}\t`)
L.push('```', '')
mkdirSync(resolve(ROOT, 'analysis'), { recursive: true })
writeJsonAtomic(resolve(ROOT, 'analysis/dialect-variants-review.md'), L.join('\n'))
console.log(`review: ${n} lines; shipped hypotheses ${ship.length} types / ${shipTok} tokens; explored ${cands.length} types / ${hypTok} tokens`)

// ── numeral map ─────────────────────────────────────────────────────────────────────────────────────────────────────────
import { CARD_LEMMAS, ORD_LEMMAS, NUM_ACCEPT } from '../core/numeral-lists.ts'
const links = rd<DvLink[]>('dv1-links.json')
const place = existsSync(resolve(IN, 'dv1-placeonly.json')) ? rd<{ form: string; gloss: string; pos: string; area: string; src: string; loc: string; q: string; flags: string }[]>('dv1-placeonly.json').filter(p => !drop.has(ownerPairKey(p.form, p.gloss))) : []
// CR-1 hook (pipelines/build-corr.ts): place-only rows of the dialect dictionaries whose headword VESUM lists only as arch / slang (штири, єден, оба …)
writeJsonAtomic(resolve(ROOT, 'data/dv/placeonly.json'), JSON.stringify({ format: 1, rows: place.map(p => ({ w: [p.form], gloss: p.gloss, codes: [], src: p.src, loc: p.loc, q: p.q, village: p.area + ' (місце запису)' })) }))
const cells = new Map<string, NumCell[]>()
const push = (lemma: string, c: NumCell) => { (cells.get(lemma) ?? cells.set(lemma, []).get(lemma)!).push(c) }
for (const p of place) if (CARD_LEMMAS.includes(p.gloss) || ORD_LEMMAS.includes(p.gloss)) (cells.get(p.gloss) ?? cells.set(p.gloss, []).get(p.gloss)!).push({ std: p.gloss, form: p.form, col: colOfArea(p.area), grade: 'dict', cite: `${p.src}, ${p.loc}: «${p.q}» (місце запису; ВЕСУМ: ${p.flags})` })
for (const l of links) if (l.method === 'dict' && (CARD_LEMMAS.includes(l.target) || ORD_LEMMAS.includes(l.target))) push(l.target, { std: l.target, form: l.form, col: colOfArea((l.area ?? '') + ' ' + l.via), grade: 'dict', cite: `${l.via}${l.loc ? ', ' + l.loc : ''}: «${l.q ?? ''}»`, f: l.f, nW: l.nW, regions: regionsOf(l.form).slice(0, 3) })
for (const f of VARIANT_FAMILIES) {
  const lemma = f.head; if (!CARD_LEMMAS.includes(lemma) && !ORD_LEMMAS.includes(lemma)) continue
  for (const m of f.members) {
    if (m.role !== 'dialect' && m.role !== 'alt' && m.role !== 'rare') continue
    const std = m.form.replace(/^єд/, 'од').replace(/^шт/, 'чот')
    if (m.owner) push(lemma, { std: lemma, form: m.form, col: /галиц/i.test(m.owner.relation) ? 'GAL' : 'ANY', grade: 'owner', cite: `за свідченням носія: «${m.owner.quote}»` })
    else if (m.cite) push(lemma, { std: lemma, form: m.form, col: 'ANY', grade: 'dict', cite: `${m.cite.source}: ${m.cite.quote}` }); void std
  }
}
// DV-7: historical variant spellings of a numeral, in the column of their dialect group, graded as the group row is (dict / корпус → hypothesis-like 'hyp' on this map: a corpus skew is a distribution of witness regions, not a dialect fact)
const histF = resolve(ROOT, 'data/dv/hist-forms.json')
if (existsSync(histF)) for (const r of readJson<{ rows: import('../core/dialect-hist.ts').HistRow[] }>(histF).rows) {
  if (!CARD_LEMMAS.includes(r.l) && !ORD_LEMMAS.includes(r.l)) continue
  for (const a of r.areas) { const col = COL_OF_GROUP[a.g]; if (!col) continue; push(r.l, { std: r.t, form: r.v, col, grade: a.grade === 'dict' ? 'dict' : 'hyp', cite: a.dict ? `${a.dict[1]}, ${a.dict[2]}: «${a.dict[3]}»` : `історична форма (DV-7): ${r.n} уживань, ${r.nw} пам’яток${r.first ? `; перша фіксація ${r.first.y}` : ''}`, f: a.tokens, nW: a.witnesses }) }
}
for (const o of confirmed) if (CARD_LEMMAS.includes(o.target) || ORD_LEMMAS.includes(o.target)) push(o.target, { std: o.target, form: o.form, col: colOfArea(o.area), grade: 'owner', cite: `за свідченням носія (data/owner/variants-confirmed.tsv)${o.remark ? ': «' + o.remark + '»' : ''}` })
for (const v of num.vesumNon) { const l = v.lemma; if ((CARD_LEMMAS.includes(l) || ORD_LEMMAS.includes(l)) && l !== v.form) push(l, { std: l, form: v.form, col: 'ANY', grade: 'dict', cite: `ВЕСУМ: ${v.tags}` }) }
for (const h of num.hits) {
  if (h.f < 5 || h.nW < 2 || !NUM_ACCEPT.includes(h.form) || drop.has(ownerPairKey(h.form, h.lemma))) continue
  push(h.lemma, { std: h.tgt, form: h.form, col: 'COR', grade: 'hyp', cite: `відповідник «${h.rule}», VESUM: ${h.tags}`, f: h.f, nW: nWof(h.form, h.nW), regions: regionsOf(h.form).slice(0, 4), via: h.rule })
}
const rowsN: NumRow[] = [...CARD_LEMMAS.map(l => ['card', l] as const), ...ORD_LEMMAS.map(l => ['ord', l] as const)].map(([kind, lemma]) => ({ lemma, kind, cells: mergeCells(cells.get(lemma) ?? []).filter(c => c.form !== c.std) }))
const nm: NumeralMap = { format: 1, generated: new Date().toISOString(), cols: NUM_COLS, rows: rowsN }
mkdirSync(resolve(ROOT, 'public/data/dv'), { recursive: true })
writeJsonAtomic(resolve(ROOT, 'public/data/dv/numerals.json'), JSON.stringify(nm))
const cv = coverage(nm)
const T: string[] = ['# Числівники за говорами (SPEC 63 DV-1b)', '',
  'Клітинка = числівник × говір. Порожня клітинка — **«немає даних»**, а не стандартна форма й не форма, добудована за аналогією. Ступінь: словник (мітка говору в словнику або Вікісловнику), носій (за свідченням власника), гіпотеза (форму впізнано за системним відповідником і засвідчено в корпусі; регіон — це регіон пам’яток, а не говір).', '',
  `Покриття: ${cv.cellsFilled} клітинок із ${cv.cellsTotal} (${cv.lemmas} числівників × ${cv.cols} стовпців); за ступенем найсильнішого свідчення: словник ${cv.byGrade.dict}, носій ${cv.byGrade.owner}, гіпотеза ${cv.byGrade.hyp}; форм ${cv.formsTotal}.`, '',
  `За стовпцями: ${NUM_COLS.map(c => `${c.name} ${cv.byCol[c.id] ?? 0}`).join('; ')}.`, '',
  '| числівник | ' + NUM_COLS.map(c => c.name).join(' | ') + ' |', '|---|' + NUM_COLS.map(() => '---').join('|') + '|']
for (const r of rowsN) T.push(`| ${r.lemma} | ` + NUM_COLS.map(c => { const x = r.cells.filter(y => y.col === c.id); return x.length ? x.map(y => `${y.form}${y.std !== r.lemma ? ` (< ${y.std})` : ''} [${GRADE_NUM_UK[y.grade]}${y.f ? `, ${y.f}` : ''}]`).join('; ') : NO_DATA }).join(' | ') + ' |')
writeJsonAtomic(resolve(ROOT, 'analysis/dialect-numerals.md'), T.join('\n') + '\n')
console.log(`numerals: ${cv.cellsFilled}/${cv.cellsTotal} cells, by grade ${JSON.stringify(cv.byGrade)}, by col ${JSON.stringify(cv.byCol)}, forms ${cv.formsTotal}, form cells ${cv.formCellsFilled}`)
