/**
 * SPEC 63 DV-7 (owner 2026-11-05: «знайди історичні форми такі само для всіх інші діалектів») — historical VARIANT FORMS of standard lemmas, per dialect group, from the historical witnesses. Pure.
 * Source data: for every lemma the forms of its lex shard (byW = tokens per witness; derivation = the cited rule chain from the written spelling to the modern form). Method:
 *   1 the variant spelling is the written form; pure orthography (ѣ ъ ь ы ѧ ѹ … the SPELL_FOLD of core/phrasemes.ts) is folded out of BOTH the variant and the modern form; if they are equal after that the
 *     difference is a spelling convention and is dropped; what remains is a FORM difference and is classified by its edit (classOf);
 *   2 per region the witnesses are gated like the first attestation (no dictionary, no gated OCR, no dateUncertain, no Russian-language witness, no place abroad), tokens, witnesses and the first year are counted;
 *   3 a skew is stated only when the region holds ≥ HF.tokens tokens in ≥ HF.witnesses witnesses with ≥ HF.share of the variant's tokens AND that share is ≥ HF.ratio times the region's share of the whole reliable corpus (Галичина is 60 % of it: there 0.9 is needed);
 *   4 grades: dict (a dialect dictionary lists the spelling for the lemma, in the area it names), corpus (a skew that passes 3, worded as a distribution of the REGIONS OF THE WITNESSES), hyp (attested in the
 *     region by ≥ 1 reliable witness but below the thresholds, or classes we do not trust alone). A dialect fact is never derived from a corpus skew alone: the place of print is not the dialect of the word.
 * Classes that carry Russian-orthography or OCR noise do not ship (HF_NOISE).
 */
import { foldSpelling } from './phrasemes.ts'
import { GROUP_MARK, markKeyOf } from './coats.ts'
import { isDialectRegion } from './dialect-badge.ts'

export const HF = { tokens: 30, witnesses: 3, share: 0.6, ratio: 1.5 } as const
/** a variant is offered at all only with this much (any region): reliable tokens in ≥ 2 reliable witnesses */
export const HF_OFFER = { tokens: 3, witnesses: 2 } as const

export type FormClass = 'vowel-ie' | 'vowel-yi' | 'vowel-oi' | 'vowel-ea' | 'vowel-other' | 'palatal' | 'final-t' | 'prothesis' | 'cluster' | 'geminate' | 'apostrophe' | 'other'
export const CLASS_UK: Record<FormClass, string> = {
  'vowel-ie': 'голосний е ~ є / і (рефлекс ѣ, е)', 'vowel-yi': 'голосний и ~ і / е (рефлекс ѣ, ы)', 'vowel-oi': 'голосний о ~ і / у (рефлекс о)', 'vowel-ea': 'голосний е ~ я / а',
  'vowel-other': 'інша заміна голосного', palatal: 'м’який / твердий приголосний', 'final-t': 'кінцеве -т ~ -ть', prothesis: 'протеза (в-, г-, й-, о-)', cluster: 'зміна групи приголосних', geminate: 'подовження / скорочення приголосного', apostrophe: 'апостроф', other: 'інше',
}
/** classes that do not ship: they are Russian spelling or OCR damage in the measured sample (see analysis/dialect-historical-forms.md) */
export const HF_NOISE: ReadonlySet<FormClass> = new Set(['other', 'cluster', 'apostrophe', 'vowel-other'])
/** rule chains that are known to mis-link or to be an era spelling and never make a variant (measured in DV-5: ORTH-1928-* ≈ 70 % wrong, ORTH-DAT-OVI ≈ 40 %, ORTH-GAL-I-E; the suffix-changing folds) */
export const HF_BAD_RULES = /^(ORTH-1928-|ORTH-DAT-OVI|ORTH-GAL-I-E|ORTH-GAL-LONG-INF|ORTH-GAL-ZIYI-INF|ORTH-GAL-GENPL-IY-INF|ORTH-GAL-FUSED|ORTH-GAL-PCL|ORTH-GAL-SYA-SEP|ORTH-PART-HYPH|ORTH-SYA|MU-)/

/** rules that are only a spelling convention or a grapheme (Желехівка ь / є / ї, ъ, ы, ѣ-letters of the era orthographies, the missing apostrophe, ться): a chain made ONLY of them is orthography, not a form difference */
export const HF_PURE_ORTH = /^(ORTH-ZHEL-|ORTH-YAR-|ORTH-MAX-|ORTH-KUL-|ORTH-GAL-APOS|ORTH-TSYA-PHON|ORTH-ADJ-SOFT|R11$|R04$|R02$|R05$|R16p?$)/
export const isPureOrth = (rules: string[]): boolean => rules.length > 0 && rules.every(r => HF_PURE_ORTH.test(r))
/** the cited rules that remain, in words (the second column of the report) */
export const RULE_UK: Record<string, string> = { "ORTH-GAL-GEN-I": "-и ~ -і у давальному / місцевому (праци ~ праці)", "ORTH-VERB-OVATI": "-овати ~ -увати (ратовати ~ ратувати)", "ORTH-GAL-GEM": "-ня ~ -ння (питаня ~ питання)", "ORTH-ADJ-IISH": "-ійший ~ -іший", "ORTH-GAL-A-SOFT": "я ~ є / е після м’якого (узєв ~ узяв)", "ORTH-GAL-C-DEPAL": "-ц- ~ -ць- / -ця (водица ~ водиця)", "ORTH-GAL-3T": "3 ос. -т ~ -ть", R10: "новий ікавізм о, е ~ і", R21: "протетичні в, г", R25: "ис- / из- ~ с- / з-", R27: "слушати ~ слухати", R13: "подовження C + j", R09: "рефлекс ѣ", R03: "ky, gy, xy ~ k’i, g’i, x’i", R15: "ствердіння губних", R18: "ствердіння ж, ч, ш", R23: "стягнення прикметникових закінчень" }
export const lowerKey = (s: string): string => s.normalize('NFC').toLowerCase().replace(/[̀-ͯ]/g, '').replace(/[’ʼ`]/g, "'")
export const foldBoth = (s: string): string => foldSpelling(lowerKey(s)).replace(/ї/g, 'і')

/** the single edit between two folded strings (a → b), or undefined when they differ by more than 2 edits or the length differs by more than 1 */
export function editOf(a: string, b: string): { from: string; to: string; at: number; n: number } | undefined {
  if (a === b || Math.abs(a.length - b.length) > 1) return undefined
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++
  let ja = a.length, jb = b.length; while (ja > i && jb > i && a[ja - 1] === b[jb - 1]) { ja--; jb-- }
  const from = a.slice(i, ja), to = b.slice(i, jb)
  if (from.length > 2 || to.length > 2) return undefined
  return { from, to, at: i, n: Math.max(from.length, to.length) }
}
const V = 'аеєиіїоуюя'
/** the class of the difference variant → modern form (both folded); undefined = no usable single edit */
export function classOf(variantFold: string, modernFold: string): FormClass | undefined {
  const e = editOf(variantFold, modernFold); if (!e) return undefined
  const { from, to, at } = e, f = (c: string) => c.length === 1 && V.includes(c)
  const pair = (x: string, y: string) => (from === x && to === y) || (from === y && to === x)
  if (from === "'" || to === "'") return 'apostrophe'
  if (f(from) && f(to)) {
    if (pair('е', 'і') || pair('е', 'є') || pair('є', 'і')) return 'vowel-ie'
    if (pair('и', 'і') || pair('и', 'е')) return 'vowel-yi'
    if (pair('о', 'і') || pair('о', 'у') || pair('у', 'і')) return 'vowel-oi'
    if (pair('е', 'я') || pair('е', 'а') || pair('я', 'є') || pair('а', 'я') || pair('я', 'і')) return 'vowel-ea'
    return 'vowel-other'
  }
  if (at === 0 && ((from === '' && 'вгй'.includes(to)) || (to === '' && 'вгй'.includes(from)) || (from === '' && f(to)) || (to === '' && f(from)))) return 'prothesis'
  if (at + from.length === modernFold.length + 0 && ((from === 'т' && to === '') || (from === '' && to === 'т'))) return 'final-t'
  if ((from === '' || to === '') && at > 0 && (from + to).length === 1 && !V.includes(from + to) && (variantFold[at - 1] === (from + to) || modernFold[at - 1] === (from + to) || variantFold[at] === (from + to) || modernFold[at] === (from + to))) return 'geminate'
  if (from.length <= 1 && to.length <= 1 && !f(from) && !f(to) && (from + to).length >= 1) return 'palatal'
  return 'cluster'
}

// ── dialect groups of the regions ──────────────────────────────────────────────────────────────────────────────────────
const GROUP_OF_MARK = Object.fromEntries(Object.entries(GROUP_MARK).map(([g, m]) => [m, g]))
export const GROUP_NAME: Record<string, string> = { BOY: 'Бойківщина', HUT: 'Гуцульщина', LEM: 'Лемківщина', NDN: 'Галичина (наддністрянський)', ZAK: 'Закарпаття', POD: 'Поділля', VOL: 'Волинь', WPL: 'Полісся', CHN: 'Чернігівщина', MDN: 'Полтавщина', SLB: 'Слобожанщина', STP: 'Степ', PKB: 'Буковина і Покуття', SYAN: 'Надсяння' }
export const GROUPS = Object.keys(GROUP_NAME)
/** the dialect group a witness REGION is filed under for this report (a region of print, not a claim about the word); undefined = abroad or no group (Київ, Сумщина … ) */
export function groupOfRegion(code: string, name = ''): string | undefined {
  if (!isDialectRegion(code, name)) return undefined
  const base = code.replace(/^hist-/, ''), mk = markKeyOf(base) ?? (base === 'bukovyna' ? 'pokuttia' : undefined)
  const aliases: Record<string, string> = { pokuttia: 'PKB', bukovyna: 'PKB', halychyna: 'NDN', polissia: 'WPL', steppe: 'STP', tavria: 'STP', zaporizhzhia: 'STP', khersonshchyna: 'STP', katerynoslavshchyna: 'STP', odeshchyna: 'STP', kirovohradshchyna: 'STP', donechchyna: 'STP', luhanshchyna: 'SLB', sumshchyna: 'SLB' }
  if (mk && aliases[mk]) return aliases[mk]
  return mk ? GROUP_OF_MARK[mk] : undefined
}

// ── rows ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** per region: tokens, witnesses, first year (of a reliable witness), its witness id */
export type RegionStat = [tokens: number, witnesses: number, firstYear: number, firstWitness: string]
export interface HistForm {
  /** modern lemma */ l: string
  /** the written variant (lower case, no stress) */ v: string
  /** the modern form it stands for */ t: string
  c: FormClass
  /** how the form was linked to the lemma (direct = VESUM paradigm, stanza-lemma = a model, torot-lemma, variant …) */ via?: string
  /** the cited rule ids of the derivation (evidence, not a dialect label) */ r: string[]
  /** reliable tokens, witnesses */ n: number; nw: number
  /** region code → stat */ reg: Record<string, RegionStat>
  /** a dialect dictionary lists the spelling: [area, source, locator, quote] */ dict?: [string, string, string, string][]
}
export type HfGrade = 'dict' | 'corpus' | 'hyp'
export interface Skew { region: string; tokens: number; witnesses: number; share: number; ratio: number }
/** the region where the variant is concentrated, or undefined (thresholds HF); `background[region]` = tokens of the whole reliable corpus there */
export function skewOf(f: Pick<HistForm, 'n' | 'reg'>, background: Record<string, number>, bgTotal: number): Skew | undefined {
  let best: Skew | undefined
  for (const [region, [tokens, witnesses]] of Object.entries(f.reg)) {
    const share = tokens / f.n, bg = (background[region] ?? 0) / bgTotal
    if (!bg) continue
    const s = { region, tokens, witnesses, share, ratio: share / bg }
    if (tokens >= HF.tokens && witnesses >= HF.witnesses && share >= HF.share && s.ratio >= HF.ratio && (!best || tokens > best.tokens)) best = s
  }
  return best
}
/** the grade a (variant, dialect group) pair may carry */
export function gradeIn(f: HistForm, group: string, groupOfReg: (r: string) => string | undefined, sk: Skew | undefined): HfGrade | undefined {
  if (f.dict?.some(d => d[0].includes(GROUP_NAME[group]!.split(' ')[0]!))) return 'dict'
  if (sk && groupOfReg(sk.region) === group) return 'corpus'
  const regs = Object.entries(f.reg).filter(([r]) => groupOfReg(r) === group)
  return regs.length ? 'hyp' : undefined
}

/** a shipped row (data/dv/hist-forms.json): the variant, its lemma, the first fixation (any dialect region) and one area per dialect group */
export interface HistArea { g: string; grade: HfGrade; region?: string; tokens?: number; witnesses?: number; share?: number; y?: number; w?: string; dict?: [string, string, string, string] }
export interface HistRow { l: string; v: string; t: string; c: FormClass; r: string[]; n: number; nw: number; first?: { y: number; w: string; region: string }; areas: HistArea[] }
