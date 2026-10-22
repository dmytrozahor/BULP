/**
 * SPEC 63 OV-2…OV-4 — the DIALECT view: a word respelled in MODERN orthography so that its spelling carries the dialect pronunciation
 * (owner 2026-10-22: «сучасний правопис це бейзлайн … коли переключаєш на якийсь діалект то СУЧАСНИМ ПРАВОПИСОМ передається діалектне звучання»).
 *
 * The detectors of core/rules.ts go dialect form → label; this module goes the other way (standard spelling → the spelling of a dialect), and ONLY by a feature
 * that already has a cited detector row: every rule here names the detector feature it implements, the cite (verbatim ЕУМ / uk.wikipedia / Аркушин quote) is
 * read from that row (`dialectRule(feature:CODE)`), and a test fails if a rule has no cite. No cite → no rule: e.g. initial и- (інший → инший) has no
 * dialect statement in the repo (the Желехівка quote is orthographic, MM-16), so it is NOT generated; it can only be shown as ATTESTED (src/lib/dialectView.ts).
 * A form made here is a RECONSTRUCTION by rule («за правилами»), never an attestation (P-1.7). Rules that need the part of speech, the gender or the stress do not
 * fire without it (reported in `skipped`), they never guess.
 */
import { dialectRule } from './form-class.ts'
import { DIALECTS } from './rules.ts'
import { stripStress, unifyApostrophe } from './text.ts'
import type { Evidence } from './evidence.ts'

export type Need = 'verb' | 'neuter' | 'stress'
export interface RespellCtx {
  /** part of speech / gender of the word (from the card's VESUM tags); unknown = undefined */
  pos?: 'verb' | 'noun' | 'adj' | 'other'; gender?: 'm' | 'f' | 'n'
  /** indices (into the unstressed word) of stressed vowels */
  positions?: number[]
}
type Edit = [start: number, end: number, to: string]
interface SpellRule {
  id: string
  /** dialect codes that implement it → the detector feature (core/rules.ts) that carries the cite, default the rule id */
  codes: Record<string, string>
  needs?: Need
  /** edits on the CURRENT string; `st` = stressed vowel indices of the current string (only with needs 'stress') */
  edits: (w: string, st: Set<number>) => Edit[]
  example: [std: string, dialect: string]
  /** the standard words the rule must not touch even though the pattern matches (not a prefix / not that part of speech) */
  skip?: RegExp
}
const all = (re: RegExp, to: (m: RegExpExecArray) => string, g = 0): ((w: string) => Edit[]) =>
  w => [...w.matchAll(re.global ? re : new RegExp(re.source, re.flags + "g"))].map(m => [m.index! + (g ? m[0].indexOf(m[g]!) : 0), m.index! + (g ? m[0].indexOf(m[g]!) + m[g]!.length : m[0].length), to(m as RegExpExecArray)] as Edit)
const VOWELS = 'аеиіоуяюєїы'
const DEVOICE: Record<string, string> = { б: 'п', д: 'т', г: 'х', ґ: 'к', ж: 'ш', з: 'с' }

export const SPELL_RULES: SpellRule[] = [
  // neuter nouns lose the long soft consonant: NDN / SYAN -є (житє, знанє, бажанє), POD / VOL -я (житя, зіля)
  { id: 'SW-NO-LENGTH', codes: { NDN: 'SW-NO-LENGTH', SYAN: 'SW-NO-LENGTH' }, needs: 'neuter', example: ['бажання', 'бажанє'],
    edits: all(/([нтлдзс])\1я$/, m => m[1] + 'є') },
  { id: 'SW-NO-LENGTH-A', codes: { POD: 'SW-NO-LENGTH', VOL: 'SW-NO-LENGTH' }, needs: 'neuter', example: ['життя', 'житя'],
    edits: all(/([нтлдзс])\1я$/, m => m[1] + 'я') },
  // губний + j is not broken by л: любйу, купйу, робйат
  { id: 'SW-LABIAL-J', codes: { BOY: 'SW-LABIAL-J', HUT: 'SW-LABIAL-J', LEM: 'SW-LABIAL-J', SYAN: 'SW-LABIAL-J' }, needs: 'verb', example: ['люблю', 'любйу'],
    edits: w => [...all(/[бпвмф](лю)$/, () => 'йу', 1)(w), ...all(/[бпвмф](лять)$/, () => 'йат', 1)(w)] },
  { id: 'SW-VN-MN', codes: { BOY: 'SW-VN-MN', POD: 'SW-VN-MN', SYAN: 'SW-VN-MN' }, example: ['внук', 'мнук'], edits: w => [...w.matchAll(/в(?=н)/g)].map(m => [m.index!, m.index! + 1, 'м'] as Edit) },
  { id: 'SW-KJ-GJ', codes: { HUT: 'SW-KJ-GJ', PKB: 'SW-KJ-GJ', NDN: 'SW-KJ-GJ' }, example: ['дід', 'ґід'],
    edits: w => [...w.matchAll(/([тд])(?=і)/g)].map(m => [m.index!, m.index! + 1, m[1] === 'т' ? 'к' : 'ґ'] as Edit) },
  { id: 'HARD-C-FINAL', codes: { NDN: 'HARD-C-FINAL', POD: 'HARD-C-FINAL', PKB: 'PKB-DEPAL-S', HUT: 'PKB-DEPAL-S' }, example: ['хлопець', 'хлопец'],
    edits: all(/[еи](ць)$/, () => 'ц', 1) },
  { id: 'SW-3SG-CONTRACT', codes: { BOY: 'SW-3SG-CONTRACT', ZAK: 'SW-3SG-CONTRACT', SYAN: 'SW-3SG-CONTRACT', HUT: 'SW-3SG-CONTRACT' }, needs: 'verb', example: ['думаєш', 'думаш'],
    edits: w => (/аєш$/.test(w) ? all(/а(є)ш$/, () => '', 1)(w) : /ає$/.test(w) ? all(/а(є)$/, () => 'т', 1)(w) : []) },
  { id: 'SW-1PL-ME', codes: { BOY: 'SW-1PL-ME', ZAK: 'SW-1PL-ME' }, needs: 'verb', example: ['носимо', 'носиме'], edits: all(/(?:ем|им)(о)$/, () => 'е', 1) },
  { id: 'SE-TRUNC-3SG', codes: { SE: 'SE-TRUNC-3SG', MDN: 'SE-TRUNC-3SG' }, needs: 'verb', example: ['думає', 'дума'], edits: all(/а(є)$/, () => '', 1) },
  { id: 'R-SOFT-FINAL', codes: { MDN: 'R-SOFT-FINAL', SE: 'R-SOFT-FINAL' }, example: ['гончар', 'гончарь'], skip: /^(тер|дир|бір|мир|ліпір)$/,
    edits: w => (new RegExp(`[${VOWELS}]р$`).test(w) && w.length > 3 ? [[w.length, w.length, 'ь'] as Edit] : []) },
  // акання / укання need the stress (an unstressed о): no stress → the rule is skipped, never guessed
  { id: 'CHN-AKANYE', codes: { CHN: 'CHN-AKANYE', SLB: 'CHN-AKANYE' }, needs: 'stress', example: ['голова', 'галава'],
    edits: (w, st) => [...w.matchAll(/о/g)].filter(m => !st.has(m.index!)).map(m => [m.index!, m.index! + 1, 'а'] as Edit) },
  { id: 'SW-UKANYE', codes: { MDN: 'SW-UKANYE', SLB: 'SW-UKANYE', STP: 'SW-UKANYE', HUT: 'SW-UKANYE', LEM: 'SW-UKANYE', VOL: 'SW-UKANYE' }, needs: 'stress', example: ['могила', 'мугила'],
    edits: (w, st) => {
      const vs = [...w].map((c, i) => [c, i] as const).filter(([c]) => VOWELS.includes(c))
      return vs.flatMap(([c, i], k) => { const n = vs[k + 1]; return c === 'о' && !st.has(i) && n && st.has(n[1]) && 'іуи'.includes(n[0]) ? [[i, i + 1, 'у'] as Edit] : [] })
    } },
  { id: 'SW-DEVOICE', codes: { WPL: 'SW-DEVOICE', LEM: 'SW-DEVOICE', STP: 'SW-DEVOICE', PKB: 'SW-DEVOICE' }, example: ['мед', 'мет'],
    edits: w => { const c = w[w.length - 1]!; return w.length > 2 && c in DEVOICE ? [[w.length - 1, w.length, DEVOICE[c]!] as Edit] : [] } },
  { id: 'SW-PROTH', codes: { NDN: 'SW-PROTH', POD: 'SW-PROTH', WPL: 'SW-PROTH' }, example: ['орати', 'ворати'], skip: /^(один|одна|одне|одні|один|ось|отже|очі|оце|оцей|уже)$/,
    edits: w => (w.length > 3 && /^[оу]/.test(w) ? [[0, 0, 'в'] as Edit] : []) },
  { id: 'PKB-VI-PREFIX', codes: { HUT: 'PKB-VI-PREFIX', PKB: 'PKB-VI-PREFIX' }, needs: 'verb', example: ['витратити', 'вітратити'],
    edits: all(/^в(и)(?=[бвгґдзжкпстхцчш])/, () => 'і', 1) },
  { id: 'SFX-ISHCH-CMP', codes: { POD: 'SFX-ISHCH-CMP', PKB: 'SFX-ISHCH-CMP' }, example: ['добріший', 'добрішчий'], edits: all(/і(ш)ий$/, () => 'шч', 1) },
  { id: 'MPL-YON', codes: { MPL: 'MPL-YON' }, example: ['він', 'йон'], edits: w => (w === 'він' ? [[0, 3, 'йон'] as Edit] : []) },
]
for (const r of SPELL_RULES) for (const k of Object.keys(r.codes)) if (!(k in DIALECTS)) throw new Error(`respell: ${r.id}: unknown dialect code ${k}`)

/** the detector row (core/rules.ts) that carries the cite of rule `r` for dialect `code` */
export const spellCite = (r: SpellRule, code: string): { id: string; cite: Evidence } | undefined => {
  const id = `${r.codes[code]}:${code}`, d = dialectRule(id)
  return d ? { id, cite: d.cite } : undefined
}
/** dialects that have ≥ 1 respelling rule, in DIALECTS order (the switch lists exactly these); the rest are reported empty */
export const SPELL_DIALECTS: string[] = Object.keys(DIALECTS).filter(c => SPELL_RULES.some(r => c in r.codes))
export const SPELL_EMPTY: string[] = Object.keys(DIALECTS).filter(c => !SPELL_DIALECTS.includes(c))
/** the switch groups (research/04 §1 headings): umbrella → members */
export const DIALECT_BRANCHES: { id: string; label: string; codes: string[] }[] = [
  { id: 'SW', label: 'південно-західні', codes: ['VOL', 'POD', 'NDN', 'SYAN', 'PKB', 'HUT', 'BOY', 'LEM', 'ZAK'] },
  { id: 'NORTH', label: 'північні (поліські)', codes: ['CHN', 'MPL', 'WPL'] },
  { id: 'SE', label: 'південно-східні', codes: ['SE', 'MDN', 'SLB', 'STP'] },
].map(b => ({ ...b, codes: b.codes.filter(c => SPELL_DIALECTS.includes(c)) })).filter(b => b.codes.length)

export interface Seg { text: string; from?: string; rule?: string }
export interface FiredSpell { rule: string; detector: string; code: string; group: string; cite: Evidence; from: string; to: string }
export interface Respelled {
  code: string; input: string; text: string; segs: Seg[]; fired: FiredSpell[]
  skipped: { rule: string; why: string }[]
  /** stressed vowel indices of `text` (when the input had positions) */
  positions?: number[]
}
interface Cell { t: string; o: number; n: number; from?: string; rule?: string }

/** Respell a modern word for dialect `code`. Pure; the same word and context always give the same result. */
export function respell(word: string, code: string, ctx: RespellCtx = {}): Respelled {
  const input = unifyApostrophe(stripStress(word))
  const lower = input.toLowerCase()
  let cells: Cell[] = [...lower].map((c, i) => ({ t: input[i] === input[i]!.toLowerCase() ? c : input[i]!, o: i, n: 1 }))
  const fired: FiredSpell[] = [], skipped: { rule: string; why: string }[] = []
  const stressOrig = new Set(ctx.positions ?? [])
  for (const r of SPELL_RULES) {
    if (!(code in r.codes)) continue
    if (r.needs === 'verb' && ctx.pos !== 'verb') { skipped.push({ rule: r.id, why: ctx.pos ? 'правило для дієслів' : 'потребує частини мови' }); continue }
    if (r.needs === 'neuter' && !(ctx.pos === 'noun' && ctx.gender === 'n')) { skipped.push({ rule: r.id, why: ctx.gender ? 'правило для іменників середнього роду' : 'потребує роду' }); continue }
    if (r.needs === 'stress' && !stressOrig.size) { skipped.push({ rule: r.id, why: 'потребує наголосу' }); continue }
    const cite = spellCite(r, code); if (!cite) continue
    const cur = cells.map(c => c.t).join('')
    if (r.skip?.test(lower)) continue
    // stressed vowel indices of the current string
    const st = new Set<number>(); let at = 0
    for (const c of cells) { if ([...stressOrig].some(p => p >= c.o && p < c.o + c.n)) { const m = [...c.t.toLowerCase()].map((x, i) => [x, i] as const).filter(([x]) => VOWELS.includes(x)); st.add(at + (m.length ? m[m.length - 1]![1] : 0)) } at += c.t.length }
    const edits = r.edits(cur.toLowerCase(), st).sort((a, b) => b[0] - a[0])
    if (!edits.length) continue
    let changed = false
    for (const [s0, e0, to0] of edits) {
      // keep only the part that really changes (common prefix / suffix), so a segment marks exactly the changed letters
      const was = cur.slice(s0, e0); let a = 0
      while (a < was.length && a < to0.length && was[a] === to0[a]) a++
      let b = 0
      while (b < was.length - a && b < to0.length - a && was[was.length - 1 - b] === to0[to0.length - 1 - b]) b++
      if (a + b >= Math.min(was.length, to0.length) && !to0.slice(a, to0.length - b)) { if (a > 0) a--; else if (b > 0) b-- }
      const s = s0 + a, e = e0 - b, to = to0.slice(a, to0.length - b)
      if (s === e && !to) continue
      // map char offsets to cells; an insertion (s === e) attaches to the cell it precedes (or the last one)
      let pos = 0, i0 = -1, i1 = -1
      cells.forEach((c, i) => { const cs = pos, ce = pos + c.t.length; if (i0 < 0 && (s < ce || (s === e && s <= cs))) i0 = i; if (e > cs) i1 = i; pos = ce })
      if (i0 < 0) i0 = cells.length - 1
      if (s === e) i1 = i0
      if (i1 < i0) i1 = i0
      const span = cells.slice(i0, i1 + 1)
      const spanStart = cells.slice(0, i0).reduce((x, c) => x + c.t.length, 0)
      const text = span.map(c => c.t).join('')
      const pre = s - spanStart
      const newT = s === e ? text.slice(0, pre) + to + text.slice(pre) : text.slice(0, pre) + to + text.slice(pre + (e - s))
      const merged: Cell = { t: newT, o: span[0]!.o, n: span.reduce((x, c) => x + c.n, 0), from: span.map(c => c.from ?? c.t).join(''), rule: r.id }
      cells = [...cells.slice(0, i0), merged, ...cells.slice(i1 + 1)]
      changed = true
    }
    if (changed) {
      const after = cells.map(c => c.t).join('')
      fired.push({ rule: r.id, detector: cite.id, code, group: DIALECTS[code]!, cite: cite.cite, from: cur, to: after })
    }
  }
  const text = cells.map(c => c.t).join('')
  let positions: number[] | undefined
  if (ctx.positions?.length) {
    positions = []; let at = 0
    for (const c of cells) {
      if (ctx.positions.some(p => p >= c.o && p < c.o + c.n)) {
        const vs = [...c.t.toLowerCase()].map((x, i) => [x, i] as const).filter(([x]) => VOWELS.includes(x))
        positions.push(at + (vs.length ? vs[vs.length - 1]![1] : 0))
      }
      at += c.t.length
    }
  }
  // segments: consecutive unchanged cells are one plain segment, a changed cell is its own marked segment
  const segs: Seg[] = []
  for (const c of cells) {
    if (c.rule) segs.push({ text: c.t, from: c.from, rule: c.rule })
    else if (segs.length && !segs[segs.length - 1]!.rule) segs[segs.length - 1]!.text += c.t
    else segs.push({ text: c.t })
  }
  return { code, input, text, segs, fired, skipped, positions }
}
/** a dialect leaves the word unchanged → shown as is, no mark */
export const unchanged = (r: Respelled) => r.text === r.input
