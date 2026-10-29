/**
 * SPEC 63 GG-12 / GG-13 — synonyms, antonyms and phraseology from OPEN sources only: uk.wiktionary (official dump, sections «Синоніми», «Антоніми», «Гіпероніми», «Гіпоніми»,
 * «Усталені та термінологічні словосполучення, фразеологізми», «Прислів'я та приказки») and en.wiktionary through kaikki.org (Wiktextract; synonyms / antonyms / hypernyms / hyponyms /
 * coordinate_terms, multi-word headwords of pos phrase / proverb / prep_phrase). Both CC BY-SA 4.0. Pure (no node imports): parsers of one page / one kaikki entry → rows.
 * A row is a statement of a wiktionary page: head, relation, target, edition, the sense it is attached to (uk: item number + the gloss of that item; en: the sense gloss) and the
 * qualifiers the page prints. Nothing is inferred, mirrored or generated: a relation listed only on the target's page is not copied to the head.
 */
export type RelKind = 's' | 'a' | 'h' | 'o' | 'c'
/** edition of the source page: u = uk.wiktionary, e = en.wiktionary (kaikki) */
export type Edition = 'u' | 'e'
/** t target (no stress mark) · r relation · d edition · n item number of the uk.wiktionary list = sense number in «Значення» · g gloss of that sense · q qualifiers as printed · u 1 = no lemma / card of ours behind the target */
export interface SynRow { t: string; r: RelKind; d: Edition; n?: number; g?: string; q?: string[]; u?: 1 }
/** f established expression / phraseological unit (uk section) · p proverb / saying (uk section) · w multi-word headword of en.wiktionary (phrase, proverb, prep_phrase); x = 1: the page is that of a word INSIDE the phrase */
export type PhrKind = 'f' | 'p' | 'w'
export interface PhrRow { p: string; k: PhrKind; d: Edition; v?: string[]; g?: string; x?: 1 }

export const REL_NAME: Record<RelKind, string> = { s: 'Синоніми', a: 'Антоніми', h: 'Ширші поняття (гіпероніми)', o: 'Вужчі поняття (гіпоніми)', c: 'Співрядні поняття' }
export const REL_ORDER: RelKind[] = ['s', 'a', 'h', 'o', 'c']
export const ED_NAME: Record<Edition, string> = { u: 'uk.Вікісловник', e: 'en.Вікісловник (kaikki)' }
export const wiktUrl = (d: Edition, page: string) => `https://${d === 'u' ? 'uk' : 'en'}.wiktionary.org/wiki/${encodeURIComponent(page)}`
export const LICENCE = 'CC BY-SA 4.0'
/** what the «немає даних (перевірено: …)» line names */
export const CHECKED_SYN = 'uk.Вікісловник (розділи «Синоніми», «Антоніми», «Гіпероніми», «Гіпоніми»), en.Вікісловник через kaikki.org (поля synonyms, antonyms, hypernyms, hyponyms, coordinate_terms)'
export const CHECKED_PHR = 'uk.Вікісловник (розділи «Усталені та термінологічні словосполучення, фразеологізми», «Прислів’я та приказки»), en.Вікісловник через kaikki.org (багатослівні заголовки phrase / proverb / prep_phrase)'

export const stripStress = (s: string): string => s.normalize('NFC').replace(/́/g, '')
const WORD_RE = /^[\p{L}][\p{L}\p{M}'’ʼ-]*(?: [\p{L}][\p{L}\p{M}'’ʼ-]*){0,5}$/u
const CYR = /[А-Яа-яІіЇїЄєҐґ]/
/** a page title / target we keep: letters, hyphens, apostrophes, ≤ 6 words, some Cyrillic */
export const okTerm = (s: string): boolean => s.length >= 1 && s.length <= 40 && s.split(' ').length <= 3 && WORD_RE.test(s) && CYR.test(s) && !NOT_UK.test(s) && !PROSE.test(s)
/** letters the Ukrainian alphabet lacks (Russian / Belarusian spellings that sit on some uk.wiktionary pages) */
const NOT_UK = /[ёъыэўЁЪЫЭЎ]/u
/** relative / demonstrative words: a «target» containing one is a clause of prose, not a lemma or a term */
const PROSE = /(?:^| )(?:що|який|яка|яке|які|якого|якій|якому|якою|яких)(?: |$)/iu

// ── uk.wiktionary wikitext ───────────────────────────────────────────────────────────────────────
const SECTION: Record<string, 'rel-s' | 'rel-a' | 'rel-h' | 'rel-o' | 'gloss' | 'phr-f' | 'phr-p'> = {
  'синоніми': 'rel-s', 'антоніми': 'rel-a', 'гіпероніми': 'rel-h', 'гіпоніми': 'rel-o', 'значення': 'gloss',
  'усталені та термінологічні словосполучення, фразеологізми': 'phr-f', 'усталені словосполучення, фразеологізми': 'phr-f',
  'прислів\'я та приказки': 'phr-p', 'прислів’я та приказки': 'phr-p',
}
const UK_SIGNAL = /мова=uk\b|\{\{ds\|\d*\|uk\}\}|\{\{-uk-\}\}|\{\{(?:морфо|transcription)-uk\b|\{\{[^{}|]{1,30}\suk[\s|}]/u
const FOREIGN = /мова=(?!uk\b)[a-z-]+|\{\{ds\|\d*\|(?!uk\})[a-z-]+\}\}/
const LANG_END = /^(?:=[^=].*[^=]=|\{\{=[A-Za-z-]+=\}\})\s*$/
/**
 * the text of the Ukrainian part of a uk.wiktionary page. Two layouts exist: an explicit block «= {{-uk-}} =» up to the next level-1 heading, and (the common one, Ukrainian being
 * the default language of the project) a leading part with no language heading, which ends at the first level-1 heading or «{{=xx=}}» marker. The leading part counts only when it
 * carries Ukrainian markers (мова=uk, {{ds|n|uk}}, морфо-uk, …) and no foreign-language marker: a page of another language that merely explains in Ukrainian is not read.
 */
export function ukSection(wikitext: string): string | undefined {
  const lines = wikitext.split('\n'); let from = -1
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!
    if (/^=\s*\{\{-uk-\}\}\s*=\s*$|^\{\{=uk=\}\}\s*$/.test(l)) { from = i + 1; continue }
    if (from >= 0 && LANG_END.test(l)) return lines.slice(from, i).join('\n')
  }
  if (from >= 0) return lines.slice(from).join('\n')
  const end = lines.findIndex(l => LANG_END.test(l)), lead = (end < 0 ? lines : lines.slice(0, end)).join('\n')
  return UK_SIGNAL.test(lead) && !FOREIGN.test(lead) ? lead : undefined
}
/** remove templates (nesting-aware), keep nothing of them */
function dropTemplates(s: string): string {
  let out = '', depth = 0
  for (let i = 0; i < s.length; i++) {
    if (s.startsWith('{{', i)) { depth++; i++; continue }
    if (s.startsWith('}}', i) && depth > 0) { depth--; i++; continue }
    if (depth === 0) out += s[i]
  }
  return out
}
const unlink = (s: string): string => s.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
const plain = (s: string): string => unlink(dropTemplates(s)).replace(/<[^>]+>/g, '').replace(/'{2,}/g, '').replace(/&nbsp;|&amp;nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
/** split on , ; outside brackets / parentheses / templates */
function splitTop(s: string): string[] {
  const out: string[] = []; let cur = '', b = 0, p = 0, t = 0
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2)
    if (two === '[[') { b++; cur += two; i++; continue }
    if (two === ']]') { b = Math.max(0, b - 1); cur += two; i++; continue }
    if (two === '{{') { t++; cur += two; i++; continue }
    if (two === '}}') { t = Math.max(0, t - 1); cur += two; i++; continue }
    const c = s[i]!
    if (c === '(') p++; else if (c === ')') p = Math.max(0, p - 1)
    if ((c === ',' || c === ';') && !b && !p && !t) { out.push(cur); cur = ''; continue }
    cur += c
  }
  out.push(cur); return out
}
const ABBR = /^(?:заст|рідк|розм|урочист|поет|книжн|перен|жарт|зневажл|пестл|ірон|фольк|діал|вульг|спец|прост|мед|техн|зменш|збільш|ласк|нар|церк|евф|рел)\.?$/u
/** qualifiers printed with a target: ''рідк.'', {{позначка|заст.|…}}, {{урочист.}}, bare «пестл.», and the (…) beside a target */
function qualifiers(piece: string): string[] {
  const q: string[] = []
  for (const m of piece.matchAll(/\{\{\s*позначка\s*\|\s*([^|}]+)/g)) q.push(m[1]!.trim())
  for (const m of piece.matchAll(/\{\{\s*([^|{}]+?)\s*(?:\|[^{}]*)?\}\}/g)) { const n = m[1]!.trim(); if (ABBR.test(n) && !q.includes(n)) q.push(n) }
  for (const m of piece.matchAll(/'{2}([^']+)'{2}/g)) { const n = m[1]!.trim(); if (n.length <= 30 && !q.includes(n)) q.push(n) }
  for (const m of piece.matchAll(/\(([^()]{1,40})\)/g)) { const n = plain(m[1]!); if (n && !/\[\[/.test(m[1]!) && !q.includes(n)) q.push(n) }
  const bare = plain(dropTemplates(piece)).replace(/\([^)]*\)/g, ' ').split(' ').filter(w => ABBR.test(w) && /\.$/.test(w))
  for (const w of bare) if (!q.includes(w)) q.push(w)
  return q.slice(0, 4)
}
/** the target text of one comma-separated piece: the words outside templates / parentheses / italics, with the abbreviations removed */
function targetOf(piece: string): string | undefined {
  let s = dropTemplates(piece).replace(/\([^)]*\)/g, ' ').replace(/'{2}[^']*'{2}/g, ' ')
  s = unlink(s).replace(/<[^>]+>/g, '').replace(/&nbsp;|&amp;nbsp;/g, ' ').replace(/^[\s*:\-—–]+|[\s*:\-—–]+$/g, '')
  const words = s.split(/\s+/).filter(w => w && !(ABBR.test(w) && /\.$/.test(w)))
  const t = stripStress(words.join(' ')).replace(/[.!?]+$/g, '')
  return okTerm(t) ? t : undefined
}
interface Item { n: number; text: string }
const itemsOf = (body: string): Item[] => {
  const out: Item[] = []; let n = 0
  for (const l of body.split('\n')) { const m = /^#(?![:*#])\s*(.*)$/.exec(l); if (m) out.push({ n: ++n, text: m[1]! }) }
  return out
}
const clip = (s: string, k: number): string => (s.length > k ? s.slice(0, k - 1) + '…' : s)
const glossOf = (text: string): string | undefined => {
  const g = clip(plain(text.replace(/\{\{\s*приклад2?\s*\|[\s\S]*$/u, '')).replace(/^[\s,.;:)\]-]+/, ''), 90)
  return /^[\p{L}«"(]/u.test(g) && /\p{L}{3}/u.test(g) ? g : undefined
}

export interface UkPage { syn: SynRow[]; phr: PhrRow[] }
/** all relation rows and phraseology rows of the Ukrainian section of one uk.wiktionary page */
export function parseUkPage(title: string, wikitext: string): UkPage {
  const res: UkPage = { syn: [], phr: [] }
  const sec = ukSection(wikitext); if (!sec) return res
  // split into (homonym, section) bodies; a «== мати I ==» heading starts a new homonym, so the item numbers restart
  const parts: { hom: number; name: string; body: string }[] = []
  let hom = 0, cur: { hom: number; name: string; lines: string[] } | undefined
  const flush = () => { if (cur) parts.push({ hom: cur.hom, name: cur.name, body: cur.lines.join('\n') }); cur = undefined }
  for (const l of sec.split('\n')) {
    if (/^==[^=].*[^=]==\s*$/.test(l)) { flush(); hom++; continue }
    const h = /^={3,5}\s*(.+?)\s*={3,5}\s*$/.exec(l)
    if (h) { flush(); cur = { hom, name: h[1]!.toLowerCase().replace(/\s+/g, ' '), lines: [] }; continue }
    cur?.lines.push(l)
  }
  flush()
  const glosses = new Map<number, Map<number, string>>()
  for (const p of parts) if (SECTION[p.name] === 'gloss') { const m = new Map<number, string>(); for (const it of itemsOf(p.body)) { const g = glossOf(it.text); if (g) m.set(it.n, g) } glosses.set(p.hom, m) }
  const head = stripStress(title)
  for (const p of parts) {
    const kind = SECTION[p.name]; if (!kind || kind === 'gloss') continue
    if (kind.startsWith('rel-')) {
      const r = kind.slice(4) as RelKind
      for (const it of itemsOf(p.body)) {
        for (const piece of splitTop(it.text)) {
          const t = targetOf(piece); if (!t || t.toLowerCase() === head.toLowerCase()) continue
          const q = qualifiers(piece), g = glosses.get(p.hom)?.get(it.n)
          const row: SynRow = { t, r, d: 'u', n: it.n, ...(g ? { g } : {}), ...(q.length ? { q } : {}) }
          if (!res.syn.some(x => x.t === t && x.r === r && x.n === it.n && x.g === g)) res.syn.push(row)
        }
      }
    } else {
      const k: PhrKind = kind === 'phr-p' ? 'p' : 'f'
      for (const l of p.body.split('\n')) {
        const m = /^\*(?![*:])\s*(.*)$/.exec(l); if (!m) continue
        const ph = phraseLine(m[1]!); if (!ph) continue
        if (!res.phr.some(x => x.p === ph.p && x.k === k)) res.phr.push({ ...ph, k, d: 'u' })
      }
    }
  }
  return res
}
/** «[[альма матер]] — шанобливо про …», «[[Божа Мати]] ([[Господня Мати]], [[Пречиста Мати]])», «[[вража мати]] (…) - [[лайка]]»: phrase, variants, gloss */
export function phraseLine(raw: string): { p: string; v?: string[]; g?: string } | undefined {
  const s = dropTemplates(raw).trim(); if (!s) return undefined
  // the gloss follows the first « — » / « - » / « – » outside brackets
  const m = /^(.*?)\s+[—–-]\s+(.+)$/.exec(s)
  const head = m ? m[1]! : s, gloss = m ? clip(plain(m[2]!), 160) : undefined
  const variants: string[] = []
  for (const pm of head.matchAll(/\(([^()]*)\)/g)) for (const piece of splitTop(pm[1]!)) { const t = phraseText(piece); if (t) variants.push(t) }
  const p = phraseText(head.replace(/\([^()]*\)/g, ' ')); if (!p) return undefined
  return { p, ...(variants.length ? { v: [...new Set(variants)].slice(0, 6) } : {}), ...(gloss && gloss.length > 2 ? { g: gloss } : {}) }
}
const phraseText = (s: string): string | undefined => {
  const t = stripStress(plain(s)).replace(/^[\s*:]+|[\s*]+$/g, '')
  if (!t || t.length > 120 || !CYR.test(t) || /[{}|=<>]/.test(t)) return undefined
  return t
}

// ── kaikki (en.wiktionary) entries ───────────────────────────────────────────────────────────────
interface KkRel { word?: string; tags?: string[]; raw_tags?: string[]; sense?: string }
export interface KkEntry { word?: string; lang_code?: string; pos?: string; senses?: ({ glosses?: string[]; tags?: string[] } & Record<string, unknown>)[] }
const KK_REL: [string, RelKind][] = [['synonyms', 's'], ['antonyms', 'a'], ['hypernyms', 'h'], ['hyponyms', 'o'], ['coordinate_terms', 'c']]
/** entry-level and sense-level relations of one kaikki entry (language «uk» only) */
export function kaikkiRelRows(e: KkEntry): SynRow[] {
  const out: SynRow[] = [], head = e.word ? stripStress(e.word) : ''
  const add = (list: KkRel[] | undefined, r: RelKind, g: string | undefined) => {
    for (const x of list ?? []) {
      if (!x.word) continue
      const t = stripStress(x.word.trim()); if (!okTerm(t) || t.toLowerCase() === head.toLowerCase()) continue
      const q = [...(x.tags ?? []), ...(x.raw_tags ?? [])].filter(v => typeof v === 'string').slice(0, 4), sg = g ?? (x.sense ? clip(x.sense, 90) : undefined)
      if (!out.some(o => o.t === t && o.r === r && o.g === sg)) out.push({ t, r, d: 'e', ...(sg ? { g: sg } : {}), ...(q.length ? { q } : {}) })
    }
  }
  for (const [f, r] of KK_REL) {
    add((e as Record<string, unknown>)[f] as KkRel[] | undefined, r, undefined)
    for (const s of e.senses ?? []) add(s[f] as KkRel[] | undefined, r, s.glosses?.[0] ? clip(s.glosses[0], 90) : undefined)
  }
  return out
}
const PHRASE_POS = new Set(['phrase', 'proverb', 'prep_phrase'])
export const contentWords = (p: string): string[] => stripStress(p).toLowerCase().split(/[\s,.;:!?«»"()]+/).map(w => w.replace(/^-+|-+$/g, '')).filter(w => w.length >= 3 && CYR.test(w))
/** a multi-word headword of pos phrase / proverb / prep_phrase → one PhrRow (page = the phrase itself) and the lemma keys of its content words that it is filed under */
export function kaikkiPhrase(e: KkEntry): { row: PhrRow; keys: string[] } | undefined {
  if (!e.word || !e.pos || !PHRASE_POS.has(e.pos) || !/\s/.test(e.word.trim())) return undefined
  const p = stripStress(e.word.trim()); if (p.length > 120 || !CYR.test(p)) return undefined
  const g = e.senses?.find(s => s.glosses?.[0] && !(s.tags ?? []).includes('form-of'))?.glosses?.[0]
  return { row: { p, k: 'w', d: 'e', ...(g ? { g: clip(g, 160) } : {}) }, keys: [...new Set(contentWords(p))] }
}

// ── evidence (core/evidence.ts): every row can be turned into a claim that the validator accepts (source, non-empty locator, non-empty quote) ──
import { D, claim, type Claim } from './evidence.ts'
const SRC_NAME: Record<Edition, string> = { u: 'uk.wiktionary', e: 'en.wiktionary (kaikki.org)' }
/** a relation row as a claim: locator = the source page URL (+ the sense), quote = the statement the page makes */
export function synClaim(head: string, r: SynRow): Claim<string> {
  const sense = r.g ? ` [${r.g}]` : r.n ? ` [п.${r.n}]` : ''
  return claim(r.t, D(SRC_NAME[r.d], wiktUrl(r.d, head), `${head}${sense} — ${REL_NAME[r.r].toLowerCase()}: ${r.t}`, LICENCE))
}
export function phrClaim(head: string, r: PhrRow): Claim<string> {
  return claim(r.p, D(SRC_NAME[r.d], wiktUrl(r.d, r.x ? r.p : head), `${r.p}${r.g ? ' — ' + r.g : ''}`, LICENCE))
}
