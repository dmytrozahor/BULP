/**
 * SPEC 63 DB-1 — the coloured dialect/region badge of a lemma page, as data. Pure: no node or DOM imports.
 *
 * > owner 2026-11-04: «кольорову личку належності до діалекту роби на головній сторінці леми, навіть якщо це просто гіпотеза» · «і типу якимось атрибутом гарним»
 *
 * The badge is DERIVED from what the project already stores (the lm/lb result of core/labels.ts, the corpus region table inside it, the dialect rules that fire on the spelling, the CR-1 groups);
 * nothing is stored per word and no word is classified by hand. The GRADE is printed in words and drawn in the shape, never by colour alone:
 *   dict     a dictionary states the word itself              solid chip, «бойківське»
 *   place    a dictionary only records a place                solid outline, «зафіксовано: Бойківщина»
 *   corpus   a distribution over the witnesses' regions       lighter fill, «у корпусі переважно: Галичина» (a REGION of witnesses, never a dialect adjective)
 *   hyp      weak or no evidence, shown anyway                dashed outline, «гіпотеза: Галичина» + the basis (a claim() of kind P)
 *   general  clearly general (corpus-general, СУМ-general)    neutral «загальновживане»
 *   none     no signal at all                                 neutral grey «говір не встановлено»
 * A hypothesis is derived, in this order, from signals that exist: (1) the corpus distribution BELOW the regular threshold, (2) a dialect feature found in the spelling, (3) the CR-1 group.
 * The variant families (core/variant-families.ts) name a role, never a region, so they give no region to a chip and are not a signal here.
 */
import { claim, P, Q, type Claim, type Evidence } from './evidence.ts'
import { AREAS, groupsOfArea, tableById } from './dict-labels.ts'
import { TH, keyness, corpusSummary, type DialectResult } from './labels.ts'
import { DIALECTS } from './rules.ts'
import { GROUP_MARK, markKeyOf, markByKey } from './coats.ts'
import type { CorrGroup } from './corr.ts'

export type BadgeGrade = 'dict' | 'place' | 'corpus' | 'hyp' | 'general' | 'none'
export const MAX_CHIPS = 3
export const GRADE_WORD: Record<BadgeGrade, string> = {
  dict: 'за словником', place: 'місце запису за словником', corpus: 'за розподілом у корпусі', hyp: 'гіпотеза', general: 'загальновживане', none: 'говір не встановлено',
}
/** one-line meaning of each grade, for the legend and the popover */
export const GRADE_HELP: Record<BadgeGrade, string> = {
  dict: 'словник прямо називає слово діалектним (мітка + цитата)', place: 'словник лише записує, ДЕ слово почуто (повіт, губернія): це не мітка діалектності слова',
  corpus: 'слово переважає в пам’ятках цього регіону; регіон пам’ятки — не діалектна мітка (FD-2)', hyp: 'слабкий або непрямий сигнал; це припущення, а не факт, і сторінка каже, на чому воно стоїть',
  general: 'слово вживається в багатьох регіонах корпусу або подане у СУМ без обмежувальних позначок', none: 'жоден сигнал не дає області; невідоме залишається невідомим',
}
/** neuter adjective of a dialect group («бойківське» — «слово», as the owner wrote it) */
export const GROUP_NEUT: Record<string, string> = {
  CHN: 'східнополіське (чернігівське)', MPL: 'середньополіське', WPL: 'західнополіське', NORTH: 'північне', MDN: 'середньонаддніпрянське (київсько-полтавське)', SE: 'південно-східне', SW: 'південно-західне',
  POD: 'подільське', NDN: 'наддністрянське (галицьке)', BOY: 'бойківське', LEM: 'лемківське', ZAK: 'закарпатське', HUT: 'гуцульське', SYAN: 'надсянське', PKB: 'покутсько-буковинське', VOL: 'волинське',
  SLB: 'слобожанське', STP: 'степове',
}
export const groupShort = (code: string): string => (GROUP_NEUT[code] ?? DIALECTS[code] ?? code).replace(/\s*\(.*$/, '')

// ── the palette: one colour per dialect group; the dark theme lightens the same hue (contrast is checked in tests/db1.test.ts) ───────────────────
const L: Record<string, string> = {
  CHN: '#7b3f98', MPL: '#4f4aa6', WPL: '#1f5fa8', NORTH: '#2f6575', MDN: '#1d7a5a', SE: '#4a7a1a', SW: '#a0521f', POD: '#7f6200', NDN: '#b03a2e',
  BOY: '#8c2f5f', LEM: '#0f6b8f', ZAK: '#6b4f1d', HUT: '#9c3d00', SYAN: '#556b2f', PKB: '#7a3b6e', VOL: '#00796b', SLB: '#8a5a00', STP: '#a14a00', REGION: '#4a5a6a',
}
const mix = (hex: string, w: number): string => {
  const n = (i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16), c = (v: number) => Math.round(v + (255 - v) * w).toString(16).padStart(2, '0')
  return '#' + [0, 1, 2].map(i => c(n(i))).join('')
}
export interface Hue { light: string; dark: string; /** text on the solid chip */ onLight: string; onDark: string }
export const PALETTE: Record<string, Hue> = Object.fromEntries(Object.entries(L).map(([k, v]) => [k, { light: v, dark: mix(v, 0.5), onLight: '#ffffff', onDark: '#10141a' }]))
export const hueOf = (code: string | undefined): Hue => PALETTE[code ?? ''] ?? PALETTE.REGION!
/** WCAG relative luminance and contrast of two #rrggbb colours */
export function contrast(a: string, b: string): number {
  const lum = (h: string) => { const f = (i: number) => { const v = parseInt(h.slice(1 + i * 2, 3 + i * 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(0) + 0.7152 * f(1) + 0.0722 * f(2) }
  const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** DB-1c (owner: «і еміграцію плашками не додавай»): a witness region that is a place of PUBLICATION abroad is not a dialect and never makes a chip or a map marker, at any grade. The `abroad-<city>` rows of pipelines/regions.ts (every city outside Ukraine of core/witness-place.ts) and any region named «еміграція / поза Україною …», «діаспора», «невідомо». The historical Ukrainian territories (Кубань, Холмщина, Підляшшя …) stay: they are ethnographic areas, not emigration. */
export const isDialectRegion = (code: string, name = ''): boolean => !/^(abroad-|emigr|diaspor|unknown|unk$)/i.test(code) && !/еміграц|поза Україною|діаспор|невідом/i.test(name)

export interface BadgeChip {
  grade: BadgeGrade
  /** what the chip prints, grade included («бойківське», «зафіксовано: Бойківщина», «у корпусі переважно: Галичина», «гіпотеза: Галичина») */ text: string
  /** dialect group code that colours it (PALETTE); undefined = the region colour */ code?: string
  /** keys of core/coats.ts MARKS: where the map puts a marker for it */ marks: string[]
  /** the sentence of the popover: what it rests on */ basis: string
  /** the evidence behind it (Q of the dictionary, D/P of the signal) */ evidence: Evidence[]
  /** hyp only: the claim (kind P) */ claim?: Claim<string>
  /** hyp: the signal that produced it */ signal?: 'corpus' | 'spelling' | 'cr1'
}
export interface FiredIn { id: string; code: string; feature?: string; cite: Evidence }
export interface BadgeInput {
  d: DialectResult
  /** witness-region code → printed name (corpus.regions) */ regionName: (code: string) => string
  /** the lemma's id for locators */ lemma: string
  /** dialect rules that fire on the lemma's own spelling (core/form-class.ts firedRules) */ fired?: FiredIn[]
  /** the CR-1 groups of the lemma */ groups?: CorrGroup[]
}

const SHARE = (f: number, F: number) => `${Math.round((f / Math.max(1, F)) * 100)} %`
const marksOfArea = (a: string): string[] => { const k = markKeyOf(a); return k ? [k] : [] }
const hyp = (name: string, code: string | undefined, marks: string[], basis: string, evidence: Evidence[], signal: NonNullable<BadgeChip['signal']>, lemma: string): BadgeChip => {
  const text = `гіпотеза: ${name}`
  // the claim is of kind P (a paraphrase of our own derivation): the original quotes stay in `evidence`
  const p = P('BULP-DB1', `DB-1 ${signal}: ${lemma}`, basis.slice(0, 280))
  return { grade: 'hyp', text, ...(code ? { code } : {}), marks, basis, evidence: [p, ...evidence], claim: claim(text, p, { method: `DB-1: ${signal}` }), signal }
}

/** the chips of a lemma page, in priority order (the host shows the first MAX_CHIPS and «ще N») */
export function badgeChips(inp: BadgeInput): BadgeChip[] {
  const { d, lemma } = inp, out: BadgeChip[] = []
  // ── dictionary: the word itself, or only the place ──
  if (d.c === 'dict') {
    const hits = d.dict ?? [], strict = d.strict !== false
    const evidence = hits.slice(0, 3).map(h => { const t = tableById(h.t); return Q(t?.source ?? h.t, h.u || t?.list || h.t, h.q.slice(0, 280)) })
    const how = hits.slice(0, 2).map(h => `${tableById(h.t)?.short ?? h.t}: мітка «${h.a}»`).join('; ')
    const seen = new Set<string>()
    if (strict) {
      for (const code of d.groups ?? []) {
        if (seen.has(code)) continue; seen.add(code)
        const areas = (d.areas ?? []).filter(a => groupsOfArea(a).some(g => g.group === code))
        out.push({ grade: 'dict', text: groupShort(code), code, marks: [...new Set([...areas.flatMap(marksOfArea), ...(GROUP_MARK[code] ? [GROUP_MARK[code]!] : [])])], basis: `словник називає слово ${groupShort(code)} (${how || 'мітка словника'})`, evidence })
      }
      for (const a of d.areas ?? []) {
        if ((d.groups ?? []).length && groupsOfArea(a).length) continue
        out.push({ grade: 'dict', text: AREAS[a] ?? a, marks: marksOfArea(a), basis: `словник позначає слово областю «${AREAS[a] ?? a}» (${how || 'мітка словника'}); групи говорів для цієї області немає у газетьєрі`, evidence })
      }
      if (!out.length) out.push({ grade: 'dict', text: 'діалектне (регіон не вказано)', marks: [], basis: `словник має мітку «діал.» без області (${(d.plain ?? []).map(p => p[0]).join(', ')})`, evidence })
    } else {
      const names = [...new Set([...(d.areas ?? []).map(a => AREAS[a] ?? a), ...hits.map(h => h.place ?? '').filter(Boolean)])]
      for (const a of d.areas ?? []) {
        const code = groupsOfArea(a)[0]?.group
        out.push({ grade: 'place', text: `зафіксовано: ${AREAS[a] ?? a}`, ...(code ? { code } : {}), marks: marksOfArea(a), basis: `словник записує місце, де слово почуто (${how || 'мітка місця'}); це не мітка діалектності слова`, evidence })
      }
      if (!out.length && names.length) out.push({ grade: 'place', text: `зафіксовано: ${names[0]}`, marks: [], basis: `словник записує місце «${names[0]}»; це не мітка діалектності слова`, evidence })
    }
  }
  // ── the CR-1 group: the lemma's own member, where a source or a distribution names an area ──
  const own = (inp.groups ?? []).flatMap(g => g.members.filter(m => m.form === lemma).map(m => ({ g, m })))
  for (const { m } of own) for (const a of m.areas) {
    if (!isDialectRegion('', a.dialect)) continue   // DB-1c
    if (a.grade === 'owner') continue
    const code = a.code, mk = code ? GROUP_MARK[code] : undefined
    if (a.grade === 'dict' && !out.some(c => c.grade === 'dict' && c.code === code && code)) out.push({ grade: 'dict', text: code ? groupShort(code) : a.dialect, ...(code ? { code } : {}), marks: mk ? [mk] : [], basis: `мітка «${a.dialect}» у відповідниках (Відповідники, CR-1)`, evidence: [a.ev] })
    if (a.grade === 'corpus' && d.c !== 'corpus') out.push({ grade: 'corpus', text: `у корпусі переважно: ${a.dialect}`, ...(code ? { code } : {}), marks: mk ? [mk] : [], basis: `розподіл варіанта за регіонами пам’яток (CR-1): ${a.tokens ?? '?'} уживань, ${a.witnesses ?? '?'} пам’яток`, evidence: [a.ev] })
  }
  // ── the corpus: a skew that passes the thresholds ──
  // DB-1c: when the top region is a place abroad, the next real region is taken IF it passes the same thresholds on the remaining regions; otherwise there is no corpus chip
  const real = d.corp ? corpusSummary(d.corp.rows.filter(r => isDialectRegion(r.code, inp.regionName(r.code)))) : undefined
  if (d.c === 'corpus' && real?.top) {
    const t = real.top, name = inp.regionName(t.code), mk = markKeyOf(t.code)
    out.push({ grade: 'corpus', text: `у корпусі переважно: ${name}`, ...(mk && markByKey[mk]?.code ? { code: markByKey[mk]!.code } : {}), marks: mk ? [mk] : [],
      basis: `${t.f} із ${real.f} вживань (${SHARE(t.f, real.f)}) у пам’ятках регіону «${name}»; значущий перекіс (G² = ${t.g2.toFixed(1)}, log₂ = ${t.lr.toFixed(1)}). Регіон пам’ятки — не діалектна мітка`,
      evidence: [{ source: 'CORPUS', quote: `${name}: f = ${t.f}, N = ${t.N}; усього f = ${real.f}`, locator: `lm/lb: ${lemma}`, kind: 'D' }] })
  }
  if (out.length) return out
  // ── clearly general ──
  if (d.c === 'general' && (!d.sub || d.sub === 'sum') && !d.marks?.length) {
    return [{ grade: 'general', text: 'загальновживане', marks: [], basis: d.sub === 'sum' ? 'СУМ-11/20 подає слово без обмежувальних позначок' : `слово засвідчене в ${d.corp?.att ?? '?'} регіонах корпусу, розподіл близький до загального (DP ${(d.corp?.dp ?? 0).toFixed(2)})`, evidence: [] }]
  }
  // ── hypotheses: weak or no evidence, shown anyway and said so ──
  // (1) the corpus distribution below the regular threshold
  const rows = (d.corp?.rows ?? []).filter(r => isDialectRegion(r.code, inp.regionName(r.code)))
  if (rows.length) {
    const F = rows.reduce((a, r) => a + r.f, 0), ks = keyness(rows).filter(k => k.g2 > 0 && k.f >= 2 && k.lr >= 1).sort((a, b) => b.g2 - a.g2)
    const k = ks[0]
    if (k && F >= 3) {
      const name = inp.regionName(k.code), mk = markKeyOf(k.code)
      out.push(hyp(name, mk ? markByKey[mk]?.code : undefined, mk ? [mk] : [], `у корпусі ${k.f} із ${F} вживань (${SHARE(k.f, F)}) у пам’ятках регіону «${name}» (log₂-відношення ${k.lr.toFixed(1)}); для твердження «регіонально марковане» потрібно ≥ ${TH.fRegionMin} вживань у регіоні і значущість G² з поправкою Бонферроні — це не виконано, тому лише гіпотеза`, [{ source: 'CORPUS', quote: `${name}: f = ${k.f}, N = ${k.N}; усього f = ${F}`, locator: `lm/lb: ${lemma}`, kind: 'D' }], 'corpus', lemma))
    }
  }
  if (!out.length && d.c === 'witness' && d.wit?.regions.some(r => isDialectRegion(r[0], r[1]))) {
    for (const [code, name] of d.wit.regions.filter(r => isDialectRegion(r[0], r[1])).slice(0, 2)) {
      const mk = markKeyOf(code)
      out.push(hyp(name, mk ? markByKey[mk]?.code : undefined, mk ? [mk] : [], `слово засвідчене лише в ${d.wit.n} ${d.wit.n === 1 ? 'пам’ятці' : 'пам’ятках'} (регіони: ${d.wit.regions.map(r => r[1]).join(', ')}); це слабкий доказ, не діалектна мітка`, [{ source: 'CORPUS', quote: `${d.wit.n} пам’яток; регіон: ${name}`, locator: `lm/lb: ${lemma}`, kind: 'D' }], 'corpus', lemma))
    }
  }
  // (2) a dialect feature found in the spelling
  const byCode = new Map<string, FiredIn[]>()
  for (const f of inp.fired ?? []) byCode.set(f.code, [...(byCode.get(f.code) ?? []), f])
  for (const [code, fs] of byCode) {
    const f = fs[0]!
    out.push(hyp(groupShort(code), code, GROUP_MARK[code] ? [GROUP_MARK[code]!] : [], `у написанні «${lemma}» спрацьовує ознака ${fs.map(x => x.id).join(', ')}${f.feature ? ` (${f.feature})` : ''}: ${f.cite.quote.slice(0, 160)} — ознака пов’язана з цим говором, але саме слово словник діалектним не називає`, fs.map(x => x.cite), 'spelling', lemma))
  }
  // (3) the CR-1 group: a same-lexeme variant (phonetic / morphological) that carries an area
  for (const g of inp.groups ?? []) for (const m of g.members) {
    if (m.form === lemma || (m.relation !== 'phonetic' && m.relation !== 'morph')) continue
    for (const a of m.areas) {
    if (!isDialectRegion('', a.dialect)) continue   // DB-1c
      if (!own.length && a.grade === 'owner') continue
      const code = a.code, mk = code ? GROUP_MARK[code] : undefined, name = code ? groupShort(code) : a.dialect
      if (out.some(c => c.text === `гіпотеза: ${name}`)) continue
      out.push(hyp(name, code, mk ? [mk] : [], `варіант тієї самої лексеми «${m.form}» у групі відповідників «${g.meaning}» має область «${a.dialect}» (${a.grade === 'dict' ? 'за словником' : a.grade === 'owner' ? 'за свідченням носія' : 'за розподілом у корпусі'}); для самого слова «${lemma}» області немає`, [a.ev], 'cr1', lemma))
    }
  }
  if (out.length) return out
  return [{ grade: 'none', text: 'говір не встановлено', marks: [], basis: d.c === 'few' && d.need ? d.need : 'жоден сигнал (словник, корпус, ознака у написанні, відповідники) не називає області', evidence: [] }]
}

/** the share of lemmas by grade (the first chip decides), for the report */
export const gradeOfChips = (cs: BadgeChip[]): BadgeGrade => cs[0]?.grade ?? 'none'
export const shownChips = (cs: BadgeChip[]) => ({ shown: cs.slice(0, MAX_CHIPS), more: Math.max(0, cs.length - MAX_CHIPS) })
