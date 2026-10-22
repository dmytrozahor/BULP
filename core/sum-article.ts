/**
 * SPEC 63 GG-7 — what the СУМ-11 and СУМ-20 article parsers share (core/sum11-parse.ts, core/sum20-parse.ts). Pure (no node imports).
 * © policy (НАН, in copyright): the output keeps ONLY the headword, stress, POS/grammar, sense numbers, per-sense labels, a gloss of at most 200 characters (the first characters of the
 * definition, cut at a word boundary and closed with «…» when longer; the definition's illustrative quotations are never taken) and the volume/page. No `full`, no quotation field exists here.
 */
import { GLOSS_MAX, glossOk, ocrScore } from './se-parse.ts'
import { clip, type SumArticleIn } from './sum-import.ts'

/** usage labels as printed in СУМ-11 / СУМ-20 (closed on purpose: an unknown abbreviation stays in the gloss) */
export const SUM_LABELS = ['розм', 'заст', 'діал', 'перен', 'спец', 'рідко', 'книжн', 'поет', 'ірон', 'жарт', 'зневажл', 'пестл', 'вульг', 'уроч', 'фольк', 'проф', 'техн', 'мед', 'бот', 'зоол', 'військ', 'юр', 'церк', 'пошир', 'неол', 'арх', 'присл', 'фам', 'лайл', 'евф', 'зменш', 'збільш', 'збірн', 'полігр', 'мат', 'фіз', 'хім', 'геол', 'мор', 'грам', 'лінгв', 'філос', 'муз', 'анат', 'буд', 'ав', 'пейор', 'ласк', 'шутл', 'канц', 'публ', 'тех', 'іст', 'рел', 'біол', 'комп', 'екон', 'спорт', 'театр', 'кіно', 'вет', 'тільки недок', 'тільки док', 'тільки мн', 'тільки одн'] as const
const LAB = SUM_LABELS.join('|')
const LABEL_RE = new RegExp(`^(?:(?:або|і|та)\\s+)?(?:переважно\\s+)?(${LAB})\\.(?:-(?:${LAB})\\.)?[\\s,;]*`, 'iu')
const VALENCE_RE = /^(?:(?:на|в|у|за|до|з|із|від|про|по|над|під|перед|між|для)\s+)?(?:кого|чого|кому|чому|що|ким|чим|ком|кого-що|кому-що|кого-небудь|чого-небудь|що-небудь)(?:\s+(?:і|та|або)\s+(?:кого|чого|кому|чому|що|ким|чим))?\s*[,.]\s*/iu
/** the article is only a cross-reference «див. X» (a «Те саме, що X» is a definition and is kept) */
const XREF = /^[.\s,]*(?:[а-яіїє]{1,7}\.\s*)*див\./u

/** one grammar block right after a headword: inflections, then POS («ж.», «недок.», «присл.») or an adjective ending «а, е.» */
export const GRAM_SRC = String.raw`((?:[,;]\s*[а-яіїєґ'’\-]{1,16}\.?(?:\s[а-яіїєґ'’\-]{1,10})?){0,6}?(?:,\s*|\s+)?(?:(?:ч|ж|с|мн|недок|док|присл|прийм|спол|част|виг|займ|числ|ім|предик|вставн|незм)\.(?:\s*і\s*(?:ч|ж|с)\.)?|(?:а|я),\s*(?:е|є)\.)(?:,\s*(?:перех|неперех|безос|зворот)\.)?)`

const ALPHA = 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'
const key = (s: string): number[] => [...s.toLowerCase().normalize('NFC')].map(c => ALPHA.indexOf(c)).filter(i => i >= 0)
function cmp(a: number[], b: number[]): number { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? -1) - (b[i] ?? -1); if (d) return d } return 0 }

export interface PageHead { lo?: string; hi?: string; page?: number; rest: string[] }
/** the running head of a page: «ВИКЛЮВАТИ / 299 / ВИКОВЗАТИ» (first headword, printed page, last headword); without it the whole page is body */
export function pageHead(raw: string): PageHead {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  for (const i of [1, 2]) {
    if (lines[i] && /^\d{1,4}$/.test(lines[i]!) && lines[i - 1] && lines[i - 1]!.length < 40 && !/\d/.test(lines[i - 1]!)) {
      const nx = lines[i + 1], hi = nx && nx.length < 40 && !/\d/.test(nx) ? nx : undefined
      return { lo: lines[i - 1], ...(hi ? { hi } : {}), page: Number(lines[i]), rest: lines.slice(hi ? i + 2 : i + 1) }
    }
  }
  // pages with no printed number (СУМ-11 prints it on one page of a spread): two one-word lines are the running head
  const one = (s?: string): boolean => !!s && s.length < 40 && /^[\p{L}'’\-¹²³]+$/u.test(s)
  if (one(lines[0]) && one(lines[1])) return { lo: lines[0], hi: lines[1], rest: lines.slice(2) }
  return { rest: lines }
}
/** the headword lies between the page's running heads (compared by the first two letters in the Ukrainian alphabet; an unreadable running head disables the check) */
export function inPageRange(head: string, lo?: string, hi?: string): boolean {
  if (!lo || !hi) return true
  const a = key(lo).slice(0, 2), b = key(hi).slice(0, 2), h = key(head).slice(0, 2)
  if (a.length < 2 || b.length < 2 || cmp(a, b) > 0) return true
  return cmp(h, a) >= 0 && cmp(h, b) <= 0
}
/** the lines of a page as one text: a hyphen at a line end joins the halves of a word */
export function joinLines(lines: string[]): string {
  let out = ''
  for (const l of lines) {
    if (!out) { out = l; continue }
    if (/\p{L}-$/u.test(out) && /^\p{Ll}/u.test(l)) out = out.slice(0, -1) + l
    else out += ' ' + l
  }
  return out.replace(/\s+/g, ' ')
}

/** a headword that may become an entry: lower-case Ukrainian letters, one apostrophe or hyphen between letters, a vowel, no run of 5 consonants */
export const headOk = (h: string): boolean => /^[а-яіїєґ]+(?:['\-][а-яіїєґ]+)*$/u.test(h) && h.length >= 2 && h.length <= 32 && /[аеєиіїоуюя]/.test(h) && !/[бвгґджзйклмнпрстфхцчшщ]{5,}/.test(h) && !/[бвгґджзклмнпрстфхцчшщ][йї]/.test(h)   // «й»/«ї» right after a consonant is the OCR of a stress mark («драбинйк», «заснїти»)

/** sense numbers must run 1, 2, 3 … (a page number inside a quotation is not a sense); a body without «1.» is one sense */
export function splitNumbered(body: string): { n: number; text: string }[] {
  const re = /(?:^|\s)(\d{1,2})\.\s+(?=[^\d\s])/g
  const marks: { n: number; at: number; end: number }[] = []
  let want = 1
  for (const m of body.matchAll(re)) if (Number(m[1]) === want && (want > 1 || m.index! < 12)) { marks.push({ n: want, at: m.index!, end: m.index! + m[0].length }); want++ }
  if (!marks.length) return [{ n: 1, text: body }]
  return marks.map((m, i) => ({ n: m.n, text: body.slice(m.end, marks[i + 1]?.at ?? body.length) }))
}

/** labels and valence («кого, що.») at the start of a sense, then the definition up to the first quotation or «//»; the quotation is NEVER taken. A long definition keeps its first ≤ 200 characters + «…» */
export function senseOf(text: string): { labels: string[]; gloss: string } {
  let t = text.replace(/\s+/g, ' ').replace(/^[\s,;.]+/, '')
  const labels: string[] = []
  for (let i = 0; i < 8; i++) {
    const l = LABEL_RE.exec(t)
    if (l && labels.length < 4 && (labels.length > 0 || !/^(?:або|і|та)\s/iu.test(t))) { labels.push(l[0].replace(/[\s,;]+$/, '').toLowerCase().replace(/^(?:або|і|та)\s+/, '').replace(/^переважно\s+/, '')); t = t.slice(l[0].length); continue }
    const v = VALENCE_RE.exec(t)
    if (v) { t = t.slice(v[0].length); continue }
    break
  }
  const cut = t.search(/\s\/\/\s|(?<=[\p{Ll}\d)\]])\.\s+(?=[\p{Lu}«"(|\[—–-])|:\s+(?=[\p{Lu}«"|\[—–-])|\s[|\[]\p{Lu}/u)
  const def = (cut < 0 ? t : t.slice(0, cut)).replace(/^[\s,.;:–—-]+/, '').replace(/[\s,;:.]+$/, '')
  return { labels, gloss: clip(def, GLOSS_MAX) }
}

/** a headword printed in CAPITALS inside the running text («МАСЛЕЧКО, а, с.»); the grammar block must follow */
export const HEAD_CAPS = new RegExp(String.raw`(?<![\p{L}'’\-])([А-ЯІЇЄҐ][А-ЯІЇЄҐ'’\-́]{1,40})[¹²³⁴]?${GRAM_SRC}`, 'gu')
export interface Cand { head: string; gram: string; start: number; end: number }
export interface SumStats { pages: number; pagesNoText: number; candidates: number; crossRefs: number; badHead: number; outOfRange: number; badBody: number; noSense: number; entries: number; senses: number; clippedGloss: number }
export const newStats = (): SumStats => ({ pages: 0, pagesNoText: 0, candidates: 0, crossRefs: 0, badHead: 0, outOfRange: 0, badBody: 0, noSense: 0, entries: 0, senses: 0, clippedGloss: 0 })
/** pass rate of the candidates that look like articles: entries / (candidates − cross-references) */
export const passRate = (s: SumStats): number => { const d = s.candidates - s.crossRefs; return d > 0 ? Math.round((s.entries / d) * 1000) / 1000 : 0 }

/** the articles of one page text: candidates → (pair headwords share one body) → validated entries. `minScore` = share of plausible words of the article body */
export function articlesOf(text: string, cands: Cand[], ph: PageHead, vol: number, page: number | undefined, st: SumStats, minScore: number): SumArticleIn[] {
  const out: SumArticleIn[] = []
  let pending: Cand[] = []
  cands.forEach((c, i) => {
    st.candidates++
    const body = text.slice(c.end, cands[i + 1]?.start ?? text.length).trim()
    if (body.replace(/[\s,.;]/g, '').length < 3) { pending.push(c); return }   // «ВИКЛЮЧАТИ, аю, недок. ВИКЛЮЧИТИ, чу, док. …»: the pair shares the next body
    const group = [...pending, c]; pending = []
    if (XREF.test(body) && body.length < 120) { st.crossRefs += group.length; return }
    if (ocrScore(body.slice(0, 600)) < minScore) { st.badBody += group.length; return }
    const senses = splitNumbered(body).map(p => ({ n: p.n, ...senseOf(p.text) })).filter(s => /^[\p{L}«"(]/u.test(s.gloss) && (s.gloss.length >= 6 || s.gloss.includes(' ')) && glossOk(s.gloss)).slice(0, 12)
    if (!senses.length) { st.noSense += group.length; return }
    for (const g of group) {
      const stress = g.head.includes('́') ? g.head.normalize('NFC').toLowerCase() : undefined
      const head = g.head.replace(/[́¹²³⁴\d]/g, '').replace(/[’ʼ]/g, "'").toLowerCase()
      if (!headOk(head)) { st.badHead++; continue }
      if (!inPageRange(head, ph.lo, ph.hi)) { st.outOfRange++; continue }
      st.entries++; st.senses += senses.length; st.clippedGloss += senses.filter(s => s.gloss.endsWith('…')).length
      out.push({ head, ...(stress ? { stress } : {}), pos: g.gram.replace(/\s+/g, ' ').replace(/^[,\s]+/, '').slice(0, 40), vol, ...(page !== undefined ? { page } : {}), senses: senses.map(s => ({ n: s.n, labels: s.labels, gloss: s.gloss })) })
    }
  })
  return out
}
