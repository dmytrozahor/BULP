/**
 * Grapheme -> IPA (SPEC 60 IP-1…IP-3, U-13). research/13 B' (standard, quoted from uk.wikipedia «Українська фонетика»,
 * whose refs are Тоцька 1981, Погрібний 1984, Пономарів 2001) and C' (dialect rows keyed to research/04 §1 codes).
 *
 * > "Ненаголошені голосні, так само як і наголошені, є звуками повного творення" — so no vowel reduction is claimed;
 * > only the е/и merger «мине́—мене́ [mɛ̝ˈnɛ]» is rendered, and only when the stress is known (research/08 A3).
 * Every row that fired is returned with its method: 'quoted' (WP wording) or 'derived' (our reading, never a dictionary fact).
 */
import { stripStress, unifyApostrophe } from './text.ts'

export type IpaMethod = 'quoted' | 'derived'
export interface IpaRow { id: string; method: IpaMethod; cite: string; quote?: string }
export interface IpaResult { ipa: string; stressKnown: boolean; flags: string[]; rows: IpaRow[]; dialect?: string }

const WP = 'uk.wikipedia «Українська фонетика» (Тоцька 1981; Погрібний 1984; Пономарів 2001)'
const STD: Record<string, IpaRow> = {
  v: { id: 'STD-V', method: 'quoted', cite: `${WP}, «Фонетичні особливості»`, quote: 'Фонема /w/ твориться як губно-губний [w] перед огубленими голосними /u ɔ/, часто й перед /ɑ/ … Перед /i/, часто перед /ɪ ɛ/ … як губно-зубний [ʋ]. Перед дзвінкими приголосними на початку слова — [w], перед глухими — [ʍ]. Після голосного в середині та кінці слова … [u̯]' },
  vowels: { id: 'STD-VOWEL', method: 'quoted', cite: `${WP}, «Голосні»`, quote: 'і [i]; и [ɪ]; е [ɛ]; а [ɑ]; о [ɔ]; у [u]' },
  merge: { id: 'STD-EY', method: 'quoted', cite: `${WP}, «Голосні»`, quote: 'Сплутування ненаголошених /ɪ/ та /ɛ/ — одна з найхарактерніших рис українського вокалізму … мине́—мене́ [mɛ̝ˈnɛ]' },
  soft: { id: 'STD-SOFT', method: 'quoted', cite: `${WP}, «Фонетичні особливості»`, quote: 'Звуки [mʲ bʲ pʲ wʲ fʲ …] трапляються переважно перед голосним /i/. Проте деякі з них трапляються в таких українських словах, як свято, тьмяний' },
  long: { id: 'STD-LONG', method: 'quoted', cite: `${WP}, «Довгі приголосні»`, quote: 'знання [znɑˈɲːɑ], зілля [ˈzʲiʎːɑ], обличчя [ɔˈblɪt͡ʃʲːɑ]' },
  voice: { id: 'STD-VOICE', method: 'quoted', cite: `${WP}, «Уподібнення за голосом»`, quote: 'регресивна асиміляція за дзвінкістю … вогко, легко, кігті, нігті, дігтяр: /ɦ/ … [ˈlɛɦkɔ]; дзвінкі приголосні не оглушуються' },
  gh: { id: 'STD-G', method: 'quoted', cite: `${WP}, таблиця приголосних`, quote: 'г /ɦ/; ґ /ɡ/' },
  cons: { id: 'STD-CONS', method: 'derived', cite: 'research/13 B (щ [ʃt͡ʃ], ц ч дж дз, -ться [t͡sʲːɐ]) — [U]: Тоцька/Погрібний лише друк; значення виведені, не цитовані' },
  syl: { id: 'STD-SYL', method: 'derived', cite: 'межа складу для знака наголосу — наше виведення (максимальний початок складу, крім початку слова)' },
}

// ── dialect codes (research/04 §1) ─────────────────────────────────────────────────────────────
export const DIALECT_GROUPS: Record<string, string[]> = {
  NORTH: ['CHN', 'MPL', 'WPL'], SE: ['MDN', 'SLB', 'STP'], SW: ['VOL', 'POD', 'NDN', 'HUT', 'BOY', 'LEM'],
}
export const IPA_DIALECTS: { code: string; label: string }[] = [
  { code: 'CHN', label: 'східнополіський' }, { code: 'MPL', label: 'середньополіський' }, { code: 'WPL', label: 'західнополіський' },
  { code: 'MDN', label: 'середньонаддніпрянський' }, { code: 'SLB', label: 'слобожанський' }, { code: 'STP', label: 'степовий' },
  { code: 'VOL', label: 'волинський' }, { code: 'POD', label: 'подільський' }, { code: 'NDN', label: 'наддністрянський' },
  { code: 'HUT', label: 'гуцульський' }, { code: 'BOY', label: 'бойківський' }, { code: 'LEM', label: 'лемківський' },
]
const expand = (code: string) => new Set(DIALECT_GROUPS[code] ?? [code])

// ── units ───────────────────────────────────────────────────────────────────────────────────────
interface U { k: 'C' | 'V' | 'X'; ph: string; g: string; soft?: boolean; long?: boolean; apos?: boolean; idx: number; stressed?: boolean }
const CONS: Record<string, string> = {
  б: 'b', в: 'v', г: 'ɦ', ґ: 'ɡ', д: 'd', ж: 'ʒ', з: 'z', к: 'k', л: 'l', м: 'm', н: 'n', п: 'p', р: 'r', с: 's', т: 't', ф: 'f', х: 'x',
  ц: 't͡s', ч: 't͡ʃ', ш: 'ʃ', щ: 'ʃt͡ʃ', й: 'j',
}
const VOW: Record<string, string> = { а: 'ɑ', е: 'ɛ', и: 'ɪ', і: 'i', о: 'ɔ', у: 'u', ы: 'ɨ' }
const IOT: Record<string, string> = { я: 'ɑ', ю: 'u', є: 'ɛ' }
const HARD = new Set(['ʒ', 't͡ʃ', 'ʃ', 'ʃt͡ʃ', 'd͡ʒ', 'j'])
const DEVOICE: Record<string, string> = { b: 'p', d: 't', ɦ: 'x', ɡ: 'k', ʒ: 'ʃ', z: 's', 'd͡ʒ': 't͡ʃ', 'd͡z': 't͡s' }
const VOICE: Record<string, string> = { p: 'b', t: 'd', x: 'ɣ', k: 'ɡ', ʃ: 'ʒ', s: 'z', 't͡ʃ': 'd͡ʒ', 't͡s': 'd͡z' }
const VOICED_OBS = new Set(Object.keys(DEVOICE)), VOICELESS_OBS = new Set([...Object.keys(VOICE), 'f', 'ʃt͡ʃ'])
const SONORANT = new Set(['v', 'j', 'l', 'm', 'n', 'r'])
const GH_EXC = /(вогк|легк|кігт|нігт|дігт)/
const PREFIX_NO_AFFRICATE = new Set(['від', 'під', 'над', 'об', 'без', 'пере'])

function decode(s: string, rows: Map<string, IpaRow>, flags: string[]): U[] {
  const out: U[] = []
  let apos = false
  const last = () => out[out.length - 1]
  const softenLast = () => { const p = last(); if (p && p.k === 'C' && p.ph !== 'j' && !HARD.has(p.ph)) p.soft = true }
  const pushC = (ph: string, g: string, idx: number) => {
    const p = last()
    if (p && p.k === 'C' && p.ph === ph && ph !== 'j' && !apos) { p.long = true; rows.set(STD.long!.id, STD.long!); return }
    out.push({ k: 'C', ph, g, idx })
  }
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!
    if (s.startsWith('ться', i)) { out.push({ k: 'C', ph: 't͡s', g: 'ться', soft: true, long: true, idx: i }, { k: 'V', ph: 'ɑ', g: 'я', idx: i + 3 }); rows.set(STD.cons!.id, STD.cons!); i += 3; apos = false; continue }
    if ((s.startsWith('дж', i) || s.startsWith('дз', i)) && !PREFIX_NO_AFFRICATE.has(s.slice(0, i))) {
      pushC(s.slice(i, i + 2) === 'дж' ? 'd͡ʒ' : 'd͡z', s.slice(i, i + 2), i); i++; apos = false; rows.set(STD.cons!.id, STD.cons!); continue
    }
    if (c === 'ь') { softenLast(); apos = false; continue }
    if (c === "'") { const p = last(); if (p) p.apos = true; apos = true; continue }
    if (c === 'ў') { out.push({ k: 'C', ph: 'u̯', g: 'ў', idx: i }); apos = false; continue }
    if (c in CONS) {
      pushC(CONS[c]!, c, i); if (CONS[c] === 'ʃt͡ʃ' || 't͡ʃ,t͡s'.includes(CONS[c]!)) rows.set(STD.cons!.id, STD.cons!)
      if (c === 'г' || c === 'ґ') rows.set(STD.gh!.id, STD.gh!)
      apos = false; continue
    }
    if (c in VOW) {
      if (c === 'і') softenLast()
      out.push({ k: 'V', ph: VOW[c]!, g: c, idx: i }); rows.set(STD.vowels!.id, STD.vowels!); apos = false; continue
    }
    if (c in IOT) {
      const p = last()
      if (p && p.k === 'C' && !apos && p.ph !== 'j') { softenLast(); if (p.soft) rows.set(STD.soft!.id, STD.soft!) }
      else out.push({ k: 'C', ph: 'j', g: c, idx: i })
      out.push({ k: 'V', ph: IOT[c]!, g: c, idx: i }); apos = false; continue
    }
    if (c === 'ї') { out.push({ k: 'C', ph: 'j', g: c, idx: i }, { k: 'V', ph: 'i', g: c, idx: i }); apos = false; continue }
    if (c === ' ' || c === '-') { out.push({ k: 'X', ph: c, g: c, idx: i }); apos = false; continue }
    flags.push(`невідомий знак «${c}» пропущено`)
  }
  return out
}

const isObs = (u?: U) => !!u && u.k === 'C' && (VOICED_OBS.has(u.ph) || VOICELESS_OBS.has(u.ph))
function assimilate(us: U[], s: string, rows: Map<string, IpaRow>) {
  for (let i = us.length - 2; i >= 0; i--) {
    const a = us[i]!, b = us[i + 1]!
    if (a.k !== 'C' || !isObs(b)) continue
    if (a.ph === 'ɦ' && GH_EXC.test(s)) continue
    if (VOICED_OBS.has(a.ph) && VOICELESS_OBS.has(b.ph)) { a.ph = DEVOICE[a.ph]!; rows.set(STD.voice!.id, STD.voice!) }
    else if (VOICELESS_OBS.has(a.ph) && VOICED_OBS.has(b.ph) && a.ph in VOICE) { a.ph = VOICE[a.ph]!; rows.set(STD.voice!.id, STD.voice!) }
  }
}

/** в by position (WP quote in STD-V). */
function resolveV(us: U[], rows: Map<string, IpaRow>) {
  us.forEach((u, i) => {
    if (u.k !== 'C' || u.ph !== 'v') return
    const p = us[i - 1], n = us[i + 1]
    const pv = p?.k === 'V', nv = n?.k === 'V'
    let ph: string
    if (pv && !nv) ph = 'u̯'
    else if (nv) ph = ['i', 'ɪ', 'ɛ'].includes(n!.ph) ? 'ʋ' : 'w'
    else if (!p || p.k === 'X') ph = n && n.k === 'C' && VOICELESS_OBS.has(n.ph) ? 'ʍ' : 'w'
    else ph = n && n.k === 'C' && VOICELESS_OBS.has(n.ph) ? 'ʍ' : 'w'
    if (!p && !n) ph = 'w'
    u.ph = ph; if (ph === 'u̯') u.soft = false
    rows.set(STD.v!.id, STD.v!)
  })
}

// ── dialect rows (research/13 C') ──────────────────────────────────────────────────────────────
interface DRow { id: string; codes: string[]; needsStress?: boolean; spell?: RegExp; phase: 'pre' | 'post'; cite: string; apply?: (us: U[]) => boolean }
const R4 = (k: string) => `research/04 §1 ${k}; research/13 C'`
const lastU = (us: U[]) => us[us.length - 1]
const DROWS: DRow[] = [
  { id: 'N-DIPH-UO', codes: ['NORTH'], phase: 'pre', cite: R4('N-DIPH-UO'), apply: us => us.reduce((f, u, i) => { const n = us[i + 1]; if (u.k === 'V' && u.g === 'у' && n && n.k === 'V' && 'оеі'.includes(n.g)) { u.ph = 'u̯'; return true } return f }, false) },
  { id: 'N-DIPH-IE', codes: ['CHN', 'MPL', 'WPL'], phase: 'pre', cite: R4('N-DIPH-IE'), apply: us => us.reduce((f, u, i) => { const n = us[i + 1]; if (u.k === 'V' && u.g === 'і' && n && n.k === 'V' && n.g === 'е') { u.ph = 'i̯'; return true } return f }, false) },
  { id: 'N-MONO-UY', codes: ['WPL', 'MPL', 'LEM', 'HUT'], phase: 'pre', spell: /(в[уи]л|к[уи]н|в[уи]з|т[уи]к)/, cite: R4('N-MONO-UY') + ' — читається як написано' },
  { id: 'MDN-O-KEPT', codes: ['MDN'], phase: 'pre', spell: /^воз$|кост|порог|радост/, cite: R4('MDN-O-KEPT') + ' — читається як написано' },
  { id: 'CHN-AKANYE', codes: ['CHN', 'SLB'], needsStress: true, phase: 'pre', cite: R4('CHN-AKANYE'), apply: us => us.reduce((f, u) => { if (u.k === 'V' && u.g === 'о' && !u.stressed) { u.ph = 'ɑ'; return true } return f }, false) },
  { id: 'UKANYE', codes: ['MDN', 'STP', 'SLB', 'SW'], needsStress: true, phase: 'pre', cite: R4('UKANYE'), apply: us => { const vs = us.filter(u => u.k === 'V'); let f = false; vs.forEach((u, i) => { const n = vs[i + 1]; if (u.g === 'у' && !u.stressed && n?.stressed && 'іу'.includes(n.g)) { u.ph = 'ʊ'; f = true } }); return f } },
  { id: 'CHN-V-W', codes: ['CHN', 'NDN', 'SW'], phase: 'pre', spell: /ў/, cite: R4('CHN-V-W') + '; ў = [u̯]' },
  { id: 'HARD-R', codes: ['POD', 'VOL', 'STP'], phase: 'pre', cite: R4('HARD-R'), apply: us => us.reduce((f, u) => { if (u.ph === 'r' && u.soft) { u.soft = false; return true } return f }, false) },
  { id: 'HARD-C-FINAL', codes: ['NDN', 'POD', 'HUT'], phase: 'pre', cite: R4('HARD-C-FINAL'), apply: us => { const u = lastU(us); if (u?.ph === 't͡s' && u.soft) { u.soft = false; return true } return false } },
  { id: 'R-SOFT-FINAL', codes: ['MDN', 'SLB', 'STP', 'BOY', 'HUT'], phase: 'pre', cite: R4('R-SOFT-FINAL'), apply: us => { const u = lastU(us); if (u?.ph === 'r' && !u.soft) { u.soft = true; return true } return false } },
  { id: 'EPENTH-L-N', codes: ['POD', 'MDN', 'NDN', 'SLB'], phase: 'pre', cite: R4('EPENTH-L-N'), apply: us => us.reduce((f, u, i) => { const p = us[i - 1]; if (u.ph === 'j' && 'яює'.includes(u.g) && p?.k === 'C' && 'bpvmf'.includes(p.ph)) { u.ph = p.ph === 'm' ? 'n' : 'l'; u.soft = true; return true } return f }, false) },
  { id: 'F-TO-X', codes: ['CHN', 'MDN', 'SLB', 'STP'], phase: 'pre', cite: R4('F-TO-X'), apply: us => us.reduce((f, u) => { if (u.ph === 'f') { u.ph = 'xʋ'; return true } return f }, false) },
  { id: 'NDN-A-E', codes: ['NDN', 'HUT'], phase: 'pre', spell: /(чіс\b|шипк|єблук)/, cite: R4('NDN-A-E') + ' — читається як написано' },
  { id: 'SW-KJ-GJ', codes: ['NDN', 'HUT', 'SW'], phase: 'pre', cite: R4('SW-KJ-GJ'), apply: us => us.reduce((f, u, i) => { const n = us[i + 1]; if (u.k === 'C' && (u.ph === 'k' || u.ph === 'ɡ') && (u.apos || u.soft) && n?.g === 'і') { u.ph = u.ph === 'k' ? 'c' : 'ɡ'; u.soft = true; return true } return f }, false) },
  { id: 'FINAL-DEVOICE', codes: ['STP', 'SW'], phase: 'post', cite: R4('CHN-VOICED-FINAL vs LEM/STP/SW'), apply: us => { const u = lastU(us); if (u?.k === 'C' && u.ph in DEVOICE) { u.ph = DEVOICE[u.ph]!; return true } return false } },
  { id: 'SW-PALATAL-SIBILANTS', codes: ['VOL', 'POD', 'NDN', 'HUT', 'BOY'], phase: 'post', cite: `${WP}, діалектна група (Погрібний p. 13); research/13 C'`, apply: us => us.reduce((f, u) => { const m: Record<string, string> = { 'd͡ʒ': 'd͡ʑ', 't͡ʃ': 't͡ɕ', ʒ: 'ʑ', ʃ: 'ɕ' }; if (u.k === 'C' && u.ph in m) { u.ph = m[u.ph]!; return true } return f }, false) },
  { id: 'CARP-Y', codes: ['BOY', 'LEM', 'HUT'], phase: 'post', spell: /ы/, cite: R4('CARP-Y') + '; LEM-IJ ий = [ɪj]' },
  { id: 'LEM-SIBILANTS', codes: ['LEM'], phase: 'post', cite: `${WP}, лемківський: шиплячі … [ʂ] і [ʐ]; research/13 C'`, apply: us => us.reduce((f, u) => { if (u.k === 'C' && (u.ph === 'ʃ' || u.ph === 'ʒ')) { u.ph = u.ph === 'ʃ' ? 'ʂ' : 'ʐ'; return true } return f }, false) },
]
export const IPA_DIALECT_ROWS = DROWS.map(r => ({ id: r.id, codes: [...expandAll(r.codes)], cite: r.cite }))
function expandAll(codes: string[]) { const s = new Set<string>(); for (const c of codes) for (const e of expand(c)) s.add(e); return s }

// ── main ────────────────────────────────────────────────────────────────────────────────────────
const render = (u: U) => u.ph + (u.soft && u.ph !== 'u̯' ? 'ʲ' : '') + (u.long ? 'ː' : '')

/**
 * @param form      headword or wordform (stress marks tolerated, stripped)
 * @param positions indices (into the unstressed form) of stressed vowels; null/[] = stress unknown
 * @param dialect   research/04 code (CHN … LEM, or a group NORTH/SE/SW); omitted = standard
 */
export function toIpa(form: string, positions: number[] | null = null, dialect?: string): IpaResult {
  const s = unifyApostrophe(stripStress(form)).toLowerCase()
  const rows = new Map<string, IpaRow>(), flags: string[] = []
  const us = decode(s, rows, flags)
  const vowels = us.filter(u => u.k === 'V')
  let stressKnown = !!positions && positions.length > 0
  if (!stressKnown && vowels.length === 1) { stressKnown = true; vowels[0]!.stressed = true; flags.push('один склад: наголос приймається за очевидний') }
  if (positions) for (const v of vowels) if (positions.includes(v.idx)) v.stressed = true
  if (!stressKnown && vowels.length > 1) flags.push('наголос невідомий: знак наголосу не ставиться, е/и не розрізняються (немає тверджень про редукцію)')
  const dset = dialect ? expand(dialect) : new Set<string>()
  const run = (phase: 'pre' | 'post') => {
    for (const r of DROWS) {
      if (r.phase !== phase) continue
      if (!expandAll(r.codes).size || ![...expandAll(r.codes)].some(c => dset.has(c))) continue
      if (r.needsStress && !stressKnown) { flags.push(`${r.id}: потребує наголосу — рядок пропущено`); continue }
      const fired = r.apply ? r.apply(us) : !!r.spell && r.spell.test(s)
      if (fired) rows.set(r.id, { id: r.id, method: 'derived', cite: r.cite })
    }
  }
  run('pre')
  assimilate(us, s, rows)
  resolveV(us, rows)
  run('post')
  // render with stress mark at the syllable boundary (STD-SYL)
  let out = ''
  const stressedAt = new Set<number>()
  us.forEach((u, i) => {
    if (u.k !== 'V' || !u.stressed || !stressKnown) return
    if (i > 0 && us[i - 1]!.k === 'V' && /̯$/.test(us[i - 1]!.ph)) i-- // glide of a dialect diphthong belongs to the nucleus
    let a = i; while (a > 0 && us[a - 1]!.k === 'C') a--
    const n = i - a
    let b = a === 0 ? 0 : n === 0 ? i : n === 1 ? i - 1 : us[i - 1]!.ph === 'j' ? i - 2 : i - 1
    if (b < a) b = a
    stressedAt.add(b)
  })
  if (stressedAt.size) rows.set(STD.syl!.id, STD.syl!)
  us.forEach((u, i) => {
    if (stressedAt.has(i)) out += 'ˈ'
    if (u.k === 'X') { out += u.ph; return }
    if (u.k === 'V' && stressKnown && !u.stressed && vowels.length > 1) {
      if (u.ph === 'ɛ') { out += 'ɛ̝'; rows.set(STD.merge!.id, STD.merge!); return }
      if (u.ph === 'ɪ') { out += 'ɪ̞'; rows.set(STD.merge!.id, STD.merge!); return }
    }
    out += render(u)
  })
  return { ipa: `[${out}]`, stressKnown, flags, rows: [...rows.values()], dialect }
}
