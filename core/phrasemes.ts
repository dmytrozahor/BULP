/**
 * BL-12: phraseme CANDIDATES = n-grams (2–5) over linked lemmas (raw spellings for old texts) scored by association × archaism.
 *
 * > P-1.7 "Anything inferred … is labelled with `method` and never shown as a dictionary fact." — every record carries method 'collocation+archaism' (a model).
 * > Rychlý 2008 logDice (core/stats.ts); the n-gram variant compares the gram with its prefix and suffix (n−1)-grams: logDice(f_gram, f_prefix, f_suffix).
 * score = (logDice/14) × (0.1 + archaism) × min(3, log2(1 + source families)); archaism = 0.5·share(pre-1400) + 0.2·share(pre-1600) + 0.2·share(CS / old orthography) + 0.1·min(1, (witnesses−1)/3).
 * A formula repeated in ≥ 2 different witnesses (Слово: «испити шеломомь Дону») therefore outranks a frequent modern bigram. Nothing here is a dictionary fact.
 */
import { logDice, mi } from './stats.ts'

export const PHRASE_METHOD = 'collocation+archaism' as const
/** key ≥ 0 = lemma id, key ≤ −2 = raw spelling id, −1 = break (unlinked modern token / punctuation) */
export interface PhraseDoc { wid: string; date: [number, number]; old: boolean; keys: ArrayLike<number>; seg: ArrayLike<number>; fam?: string }
/**
 * BL-12b source FAMILY of a witness id: all Sophia graffiti = one family, a chronicle's redactions (pvl_*) = one, the pages of one codex (i14_NN) = one, a poet's volumes (shevchenko_N) = one.
 * A repetition inside one family is one witness for the repetition score (the same scribal formula / the same text copied), not independent evidence.
 */
export const phraseFamily = (wid: string): string => (/^pvl/.test(wid) ? 'pvl' : wid.replace(/[-_]?\d+$/, '') || wid)
const SPELL_FOLD: Record<string, string> = { 'ѹ': 'у', 'ꙋ': 'у', 'ѡ': 'о', 'ѻ': 'о', 'ѣ': 'е', 'ѧ': 'я', 'ꙗ': 'я', 'ѩ': 'я', 'ѫ': 'у', 'ы': 'и', 'ѵ': 'и', 'ѳ': 'ф', 'ꙇ': 'і', 'ї': 'і', 'ѕ': 'з', 'ѯ': 'кс', 'ѱ': 'пс', 'ъ': '', 'ь': '', 'ꙿ': '' }
/** BL-12b: spelling-variant key of an unlinked old word — «своемоу» and «своему» (and ѹ/оу, ѣ/е, ы/и, jer variants) fold to one key, so one formula is not counted as many */
export const foldSpelling = (raw: string): string => raw.normalize('NFC').toLowerCase().replace(/[ѹꙋѡѻѣѧꙗѩѫыѵѳꙇїѕѯѱъьꙿ]/g, c => SPELL_FOLD[c]!).replace(/оу/g, 'у').replace(/[\u0300-\u036f\u0483-\u0489]/g, '')
export interface PhraseComponents { logDice: number; mi: number; pre1400: number; pre1600: number; old: number; archaism: number; witnesses: number; families: number }
export interface Phraseme { lemmas: string[]; spellings: string[]; f: number; witnesses: string[]; nW: number; /** BL-12b: distinct source families among the witnesses */ families: string[]; nF: number; dates: [number, number]; score: number; components: PhraseComponents; method: typeof PHRASE_METHOD; attested?: string }
export interface PhraseOpts { minF?: number; minW?: number; maxN?: number; top?: number }
const r3 = (x: number) => Math.round(x * 1000) / 1000

export function mine(docs: PhraseDoc[], lemma: (key: number) => string, spelling: (wi: number, ti: number) => string, o: PhraseOpts = {}): Phraseme[] {
  const minF = o.minF ?? 3, minW = o.minW ?? 2, maxN = o.maxN ?? 5, top = o.top ?? 3000
  const gram = (d: PhraseDoc, i: number, n: number) => {
    let s = ''
    for (let j = 0; j < n; j++) { const k = d.keys[i + j]!; if (k === -1 || d.seg[i + j] !== d.seg[i]) return undefined; s += (j ? ',' : '') + k }
    return s
  }
  const f1 = new Map<number, number>()
  for (const d of docs) for (let i = 0; i < d.keys.length; i++) { const k = d.keys[i]!; if (k !== -1) f1.set(k, (f1.get(k) ?? 0) + 1) }
  let prev: Map<string, number> | undefined
  const found: { g: string; f: number; fp: number; fs: number }[] = []
  for (let n = 2; n <= maxN; n++) {
    const cnt = new Map<string, number>()
    for (const d of docs) for (let i = 0; i + n <= d.keys.length; i++) {
      const g = gram(d, i, n); if (g === undefined) continue
      if (n > 2 && (!prev!.has(gram(d, i, n - 1)!) || !prev!.has(gram(d, i + 1, n - 1)!))) continue
      cnt.set(g, (cnt.get(g) ?? 0) + 1)
    }
    const freq = new Map<string, number>()
    for (const [g, f] of cnt) if (f >= minF) freq.set(g, f)
    for (const [g, f] of freq) {
      const ks = g.split(',').map(Number)
      if (ks.every(k => k === ks[0])) continue
      const fp = n === 2 ? f1.get(ks[0]!)! : prev!.get(ks.slice(0, -1).join(','))!, fs = n === 2 ? f1.get(ks[1]!)! : prev!.get(ks.slice(1).join(','))!
      found.push({ g, f, fp, fs })
    }
    if (!freq.size) break
    prev = freq
  }
  // second pass: witnesses, dates and spellings of the survivors only
  const idx = new Map(found.map((x, i) => [x.g, i]))
  const wit = found.map(() => new Map<string, { date: [number, number]; old: boolean; fam: string }>()), sp = found.map(() => new Map<string, number>())
  docs.forEach((d, wi) => {
    for (let n = 2; n <= maxN; n++) for (let i = 0; i + n <= d.keys.length; i++) {
      const g = gram(d, i, n), x = g === undefined ? undefined : idx.get(g); if (x === undefined) continue
      wit[x]!.set(d.wid, { date: d.date, old: d.old, fam: d.fam ?? phraseFamily(d.wid) })
      if (sp[x]!.size < 40) { const s = Array.from({ length: n }, (_, j) => spelling(wi, i + j)).join(' '); sp[x]!.set(s, (sp[x]!.get(s) ?? 0) + 1) }
    }
  })
  const N = [...f1.values()].reduce((a, b) => a + b, 0), out: Phraseme[] = []
  found.forEach((x, i) => {
    const ws = [...wit[i]!]; if (ws.length < minW) return
    const fams = new Map<string, typeof ws>()
    for (const w of ws) { const a = fams.get(w[1].fam) ?? []; a.push(w); fams.set(w[1].fam, a) }
    const nF = fams.size
    // BL-12b: shares and the repetition term count FAMILIES (each family's own share), so 150 Sophia inscriptions weigh as one witness
    const share = (p: (v: { date: [number, number]; old: boolean }) => boolean) => [...fams.values()].reduce((s, a) => s + a.filter(([, v]) => p(v)).length / a.length, 0) / nF
    const p14 = share(v => v.date[1] < 1400), p16 = share(v => v.date[1] < 1600), old = share(v => v.old)
    const arch = 0.5 * p14 + 0.2 * p16 + 0.2 * old + 0.1 * Math.min(1, (nF - 1) / 3)
    const ld = logDice(x.f, x.fp, x.fs), m = mi(x.f, x.fp, x.fs, N)
    if (ld <= 0) return
    const score = (ld / 14) * (0.1 + arch) * Math.min(3, Math.log2(1 + nF))
    const dates = ws.map(([, v]) => v.date), ks = x.g.split(',').map(Number)
    out.push({
      lemmas: ks.map(lemma), spellings: [...sp[i]!].sort((a, b) => b[1] - a[1]).slice(0, 3).map(s => s[0]), f: x.f,
      witnesses: ws.map(w => w[0]).slice(0, 8), nW: ws.length, families: [...fams.keys()].slice(0, 8), nF, dates: [Math.min(...dates.map(d => d[0])), Math.max(...dates.map(d => d[1]))], score: r3(score), method: PHRASE_METHOD,
      components: { logDice: r3(ld), mi: r3(m), pre1400: r3(p14), pre1600: r3(p16), old: r3(old), archaism: r3(arch), witnesses: ws.length, families: nF },
    })
  })
  out.sort((a, b) => b.score - a.score || b.f - a.f)
  const byF = new Map<number, Phraseme[]>()
  for (const p of out) { const a = byF.get(p.f) ?? []; a.push(p); byF.set(p.f, a) }
  const res: Phraseme[] = []   // a gram contained in a longer gram with the same support is dropped (keep the maximal formula)
  for (const p of out) {
    const j = ' ' + p.lemmas.join(' ') + ' '
    if (byF.get(p.f)?.some(q => q.lemmas.length > p.lemmas.length && (' ' + q.lemmas.join(' ') + ' ').includes(j))) continue
    res.push(p); if (res.length >= top) break
  }
  return res
}

/** `/phrases` epoch filter: the earliest witness falls before `max` */
export const PHRASE_EPOCHS = [{ id: 'all', label: 'усі', max: 9999 }, { id: 'pre1400', label: 'до 1400', max: 1400 }, { id: 'pre1600', label: 'до 1600', max: 1600 }, { id: 'pre1800', label: 'до 1800', max: 1800 }] as const
export const phraseInEpoch = (p: Phraseme, max: number) => p.dates[0] < max
/** lowercase word list of an idiom title (for matching with the lemma sequences of candidates) */
export const idiomWords = (t: string) => t.toLowerCase().normalize('NFC').split(/[^\p{L}'’ʼ]+/u).filter(Boolean)
