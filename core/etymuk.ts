/**
 * SPEC 63 GG-11 (open-source part): etymologies from the «Етимологія» sections of uk.wiktionary (CC BY-SA 4.0). Pure: no node or DOM imports.
 *
 * The section is wikitext with templates: `{{етимологія|lang|word}}`, `{{етимологія:слово|uk}}` (a transcluded template PAGE «Шаблон:етимологія:слово» that holds the whole article,
 * often with the sources named at the end), `{{lang-xx|word}}`, `{{праслов|word}}`, `{{ЕСУМ5}}`. A small expander turns them into plain text; what it cannot expand is dropped and counted
 * (`part`). A section with nothing left («Від ??», an empty template) is a stub and gives no etymology; a bare pointer («див. …», «форма від …») is not an etymology either (MM-12 rule).
 *
 * ЕСУМ: the citation is a POINTER taken from the page («ЕСУМ т. N, с. M (за Вікісловником)»); the project never presents the Wiktionary text as its own reading of ЕСУМ, and nothing is copied from
 * ЕСУМ beyond what the Wiktionary page itself prints.
 */
import { Q, type Evidence } from './evidence.ts'
import { ukSection } from './synphr.ts'

export interface UkCite { src: 'ЕСУМ' | 'Фасмер'; vol?: number; page?: number }
/** lo = 1: the page names only the language of origin, no word · t text (≤ MAX_TEXT) · rev / ts revision id and timestamp of the dump's page · cites sources named on the page · part = 1: some template could not be expanded */
export interface UkEtym { t: string; lo?: 1; rev?: number; ts?: string; cites?: UkCite[]; part?: 1 }

export const MAX_TEXT = 600
export const UKWIKT_LICENCE = 'CC BY-SA 4.0'
export const ukWiktUrl = (title: string) => `https://uk.wiktionary.org/wiki/${encodeURIComponent(title)}#${encodeURIComponent('Етимологія')}`
export const ukWiktRevUrl = (rev: number) => `https://uk.wiktionary.org/w/index.php?oldid=${rev}`
export const citeLabel = (c: UkCite): string => c.src === 'ЕСУМ'
  ? `ЕСУМ${c.vol ? ` т. ${c.vol}` : ''}${c.page ? `, с. ${c.page}` : ''} (за Вікісловником)`
  : 'Фасмер (за Вікісловником)'

const clip = (s: string, n: number): string => {
  if (s.length <= n) return s
  const cut = s.slice(0, n - 1), sp = cut.lastIndexOf(' ')
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:(—-]+$/, '') + '…'
}

// ── the section ──────────────────────────────────────────────────────────────────────────────────
const HEADING = /^(=+)\s*(.*?)\s*=+\s*$/
/** bodies of the «Етимологія» sections of the Ukrainian part of a page (a section ends at the next heading) */
export function etymSections(wikitext: string): string[] {
  const uk = ukSection(wikitext); if (!uk) return []
  const out: string[] = []; let cur: string[] | undefined
  for (const l of uk.split('\n')) {
    const m = HEADING.exec(l)
    if (m) { if (cur) out.push(cur.join('\n')); cur = /^Етимологія$/i.test(m[2]!.replace(/'+/g, '').trim()) ? [] : undefined; continue }
    if (cur) cur.push(l)
  }
  if (cur) out.push(cur.join('\n'))
  return out.filter(s => s.trim())
}

// ── the expander ─────────────────────────────────────────────────────────────────────────────────
export interface Ctx { tpl: (name: string) => string | undefined; cites: UkCite[]; unresolved: number }
const addCite = (ctx: Ctx, c: UkCite) => { if (!ctx.cites.some(x => x.src === c.src && x.vol === c.vol && x.page === c.page)) ctx.cites.push(c) }

/** split `a|b|{{c|d}}` on top-level pipes (templates and links nest) */
function splitArgs(s: string): string[] {
  const out: string[] = []; let cur = '', t = 0, l = 0
  for (let i = 0; i < s.length; i++) {
    if (s.startsWith('{{', i)) { t++; cur += '{{'; i++; continue }
    if (s.startsWith('}}', i)) { t = Math.max(0, t - 1); cur += '}}'; i++; continue }
    if (s.startsWith('[[', i)) { l++; cur += '[['; i++; continue }
    if (s.startsWith(']]', i)) { l = Math.max(0, l - 1); cur += ']]'; i++; continue }
    if (s[i] === '|' && t === 0 && l === 0) { out.push(cur); cur = ''; continue }
    cur += s[i]
  }
  out.push(cur); return out
}
const posNamed = (args: string[]): { pos: string[]; named: Record<string, string> } => {
  const pos: string[] = [], named: Record<string, string> = {}
  for (const a of args) { const m = /^\s*([^={}\[\]]{1,20}?)\s*=(.*)$/s.exec(a); if (m) named[m[1]!] = m[2]!.trim(); else pos.push(a.trim()) }
  return { pos, named }
}
const tplBody = (t: string): string => t.replace(/<noinclude>[\s\S]*?<\/noinclude>/g, '').replace(/<\/?includeonly>/g, '').replace(/<onlyinclude>|<\/onlyinclude>/g, '')
const subst = (body: string, pos: string[], named: Record<string, string>): string =>
  body.replace(/\{\{\{\s*([^{}|]+?)\s*(?:\|([^{}]*))?\}\}\}/g, (_m, k: string, d?: string) => (/^\d+$/.test(k) ? pos[+k - 1] : named[k]) || d || '')

/** the short language label of a code, from the project's own «Шаблон:lang-xx» page: «[[латинська мова|лат.]]» → «лат.» */
export function langAbbr(code: string, ctx: Ctx): string {
  const t = ctx.tpl(`lang-${code}`)
  const m = t && /\[\[[^\]|]*\|([^\]]+)\]\]/.exec(tplBody(t))
  return m ? m[1]!.trim() : code
}

/** the page names only the language of origin (the template has no word): the text says so plainly */
export const NOWORD = '(слово не вказано)'
const SRC_TPL = /^(?:ЕСУМ|ЕтимологічнийСловникУкраїнськоїМови)\s*(\d+)?$/
const ESUM_VOL = /^\s*(\d)\s*$/
function render(name: string, args: string[], ctx: Ctx, depth: number): string {
  const n = name.trim()
  const { pos, named } = posNamed(args)
  const ex = (s: string | undefined) => (s ? expand(s, ctx, depth + 1) : '')
  let m: RegExpExecArray | null
  if ((m = SRC_TPL.exec(n))) {   // {{ЕСУМ5}} · {{ЕСУМ|5|467}} · {{ЕСУМ6|}}
    const vol = m[1] ? +m[1] : ESUM_VOL.test(pos[0] ?? '') ? +pos[0]! : undefined
    const pg = m[1] ? pos[0] : pos[1]
    addCite(ctx, { src: 'ЕСУМ', ...(vol ? { vol } : {}), ...(pg && /^\d{1,4}$/.test(pg.trim()) ? { page: +pg } : {}) }); return ''
  }
  if (n === 'Ф') { addCite(ctx, { src: 'Фасмер' }); return '' }
  if (/^[A-ZЭЁa-z]{2,8}\.\d+/.test(n) || /^(?:Категорія|категорія|Cf|cf|wikipedia|Вікіпедія|ds|довжина слова|переклад|doc)$/.test(n)) return ''   // bibliography / navigation templates
  if (n.toLowerCase().startsWith('етимологія')) {
    if (n.includes(':')) {   // a transcluded article: Шаблон:етимологія:<слово>
      const body = ctx.tpl(n); if (!body || depth > 3) { ctx.unresolved++; return '' }
      return expand(subst(tplBody(body), pos, named), ctx, depth + 1)
    }
    const word = pos[1]
    if (!word) { if (pos[0]) return `${langAbbr(pos[0], ctx)} ${NOWORD}`; ctx.unresolved++; return '' }   // «Від {{етимологія|en}}» renders «Від ??»: the page names the language and no word
    return `${named['зачин'] ? ex(named['зачин']) + ' ' : ''}${langAbbr(pos[0] ?? '', ctx)} ${ex(word)}${named['т'] ? ` (${ex(named['т'])})` : ''}${named['доп'] ? ' ' + ex(named['доп']) : ''}${pos[2] ? ` ‘${ex(pos[2])}’` : ''}`
  }
  if ((m = /^lang-([a-z-]+)$/i.exec(n))) return `${langAbbr(m[1]!, ctx)}${pos[0] ? ' ' + ex(pos[0]) : ''}`
  if (n === 'lang' && pos[0]) return `${langAbbr(pos[0], ctx)}${pos[1] ? ' ' + ex(pos[1]) : ''}`
  if (n === 'праслов') return `праслов’янської форми${pos[0] ? ' ' + ex(pos[0]) : ''}, від якої також виникли `
  if (/^fonts$/i.test(n)) return ex(pos[0])
  const body = ctx.tpl(n)   // a small plain template (a language name …): {{se}} → «північносаамська»
  if (body && depth <= 3 && tplBody(body).length <= 160 && !/\{\{#|\{\{\{/.test(tplBody(body))) return expand(tplBody(body), ctx, depth + 1)
  return ''
}
/** replace every `{{…}}` (nesting-aware) by its rendering */
export function expand(src: string, ctx: Ctx, depth = 0): string {
  let out = '', i = 0
  while (i < src.length) {
    if (src.startsWith('{{', i) && !src.startsWith('{{{', i)) {
      let d = 0, j = i
      for (; j < src.length; j++) {
        if (src.startsWith('{{', j)) { d++; j++ } else if (src.startsWith('}}', j)) { d--; j++; if (d === 0) break }
      }
      if (d !== 0) { out += src.slice(i); break }   // unbalanced: keep the remainder
      const inner = src.slice(i + 2, j - 1)
      const a = splitArgs(inner)
      out += render(a[0]!, a.slice(1), ctx, depth)
      i = j + 1; continue
    }
    out += src[i]; i++
  }
  return out
}

const ENT: Record<string, string> = { '&nbsp;': ' ', '&#32;': ' ', '&#160;': ' ', '&amp;nbsp;': ' ', '&lsquo;': '‘', '&rsquo;': '’', '&ndash;': '–', '&mdash;': '—', '&quot;': '"', '&amp;': '&' }
/** wikitext after expansion → plain one-line text */
export function plainEtym(s: string): string {
  return s.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref\b[^>]*\/>/g, '').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/\[\[(?:Категорія|Category|Файл|File):[^\]]*\]\]/gi, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1').replace(/\[https?:\/\/[^\s\]]+\]/g, '')
    .replace(/<[^>]+>/g, '').replace(/'{2,}/g, '').replace(/&(?:amp;)?(?:nbsp|#32|#160|lsquo|rsquo|ndash|mdash|quot);|&amp;/g, e => ENT[e] ?? ENT[e.replace('&amp;', '&')] ?? ' ')
    .split('\n').map(l => l.replace(/^[*#:;]+\s*/, '').trim()).filter(l => /[\p{L}\p{N}]/u.test(l)).join(' ')
    .replace(/\s+/g, ' ').replace(/\s+([,.;:)»])/g, '$1').replace(/([(«])\s+/g, '$1').replace(/\(\s*\)/g, '').trim()
}

const POINTER = /^(?:див(?![\p{L}])\.?|дивись|дивіться|форма(?![\p{L}])|те саме|те ж|[=→])/iu
const OPENER = /^(?:Походить від|Утворено від|Від|З)(?![\p{L}])[\s:,.-]*/iu
/** harvest ЕСУМ citations printed in prose («[ЕСУМ 2, 562; Фасмер …]») */
function proseCites(raw: string, ctx: Ctx) {
  for (const m of raw.matchAll(/ЕСУМ\s*(\d)\s*,\s*(?:с\.\s*)?(\d{1,4})/g)) addCite(ctx, { src: 'ЕСУМ', vol: +m[1]!, page: +m[2]! })
  for (const m of raw.matchAll(/\{\{\s*ЕСУМ\s*\|\s*(\d)\s*\|\s*(\d{1,4})\s*\}\}/g)) addCite(ctx, { src: 'ЕСУМ', vol: +m[1]!, page: +m[2]! })
  if (/Фасмер/.test(raw)) addCite(ctx, { src: 'Фасмер' })
}

export type Verdict = 'ok' | 'empty' | 'stub' | 'pointer'
/** one section body → the plain text, the ЕСУМ/Фасмер pointers it names, and a verdict */
export function parseSection(body: string, tpl: (name: string) => string | undefined): { verdict: Verdict; t: string; cites: UkCite[]; part: boolean; lo: boolean } {
  const ctx: Ctx = { tpl, cites: [], unresolved: 0 }
  proseCites(body, ctx)
  const t0 = plainEtym(expand(body.replace(/<!--[\s\S]*?-->/g, ''), ctx))
  const t = t0
  const cites = ctx.cites, lo = t.includes(NOWORD) && !/\p{L}/u.test(t.replace(/\S+ \(слово не вказано\)/g, '').replace(OPENER, ''))
  if (!t) return { verdict: 'empty', t, cites, part: ctx.unresolved > 0, lo }
  if (!/\p{L}/u.test(t.replace(OPENER, '')) || /^(?:Від|З)?\s*\?+$/.test(t)) return { verdict: 'stub', t, cites, part: ctx.unresolved > 0, lo }
  if (POINTER.test(t) && t.length < 80) return { verdict: 'pointer', t, cites, part: ctx.unresolved > 0, lo }
  return { verdict: 'ok', t, cites, part: ctx.unresolved > 0, lo }
}

export interface UkRaw { t: string[]; rev?: number; ts?: string }
export interface UkCount { pages: number; sections: number; ok: number; empty: number; stub: number; pointer: number }
/** the page's etymology (several sections are joined with « | »; the cites of all) or undefined when no section carries a statement */
export function ukEtymOf(sections: string[], tpl: (name: string) => string | undefined, meta: { rev?: number; ts?: string } = {}, count?: UkCount): UkEtym | undefined {
  const texts: string[] = [], cites: UkCite[] = []; let part = false, lo = true
  if (count) count.pages++
  for (const s of sections) {
    const r = parseSection(s, tpl)
    if (count) { count.sections++; count[r.verdict]++ }
    if (r.verdict !== 'ok') continue
    if (!texts.includes(r.t)) texts.push(r.t)
    for (const c of r.cites) if (!cites.some(x => x.src === c.src && x.vol === c.vol && x.page === c.page)) cites.push(c)
    part ||= r.part; lo &&= r.lo
  }
  if (!texts.length) return undefined
  return { t: clip(texts.join(' | '), MAX_TEXT), ...(meta.rev ? { rev: meta.rev } : {}), ...(meta.ts ? { ts: meta.ts } : {}), ...(cites.length ? { cites } : {}), ...(part ? { part: 1 as const } : {}), ...(lo ? { lo: 1 as const } : {}) }
}

/** the evidence of the card: Q (the Wiktionary text itself, clipped to the 300-char limit), locator = the page, note = revision, dump, licence */
export function ukEtymEvidence(lemma: string, u: UkEtym, dump: string): Evidence {
  const cites = u.cites?.length ? `; на сторінці названо: ${u.cites.map(citeLabel).join(', ')}` : ''
  return Q('WIKTUK', ukWiktUrl(lemma), clip(u.t, 300),
    `uk.Вікісловник, ${UKWIKT_LICENCE}, автори — в історії сторінки${u.rev ? `; версія ${u.rev} (${(u.ts ?? '').slice(0, 10)})` : ''}; дамп ${dump}${cites}. Це текст Вікісловника, не наше прочитання ЕСУМ`)
}
