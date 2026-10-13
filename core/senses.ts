/**
 * BL-9 senses: parser for uk.wiktionary wikitext (CC BY-SA 4.0). Pure: shared by the build (pipelines/build-extras.ts writeSenses) and the tests.
 * Layout of a uk.wiktionary page [Q: API samples робити rev 542827, атлас rev 553107, 2026-10-14]:
 *   `{{=uk=}}` opens the Ukrainian section (next `{{=xx=}}` closes it); homonyms are level-2 headings `== атлас І ==` (template `{{Омоніми|uk|2}}`);
 *   the part of speech is the first template `{{імен uk …}}` / `{{дієсл uk …}}`; syllables with the stress `{{склади|ро|би́|ти}}` (U+0301 after the stressed vowel);
 *   senses are the `# …` / `## …` lines under `==== Значення ====`.
 * A sense carries its stress only where the page gives a stressed syllable division of that homonym — nothing is inferred (P-1.7).
 */
export interface Sense { gloss: string; pos?: string; stress?: string; source: string }
export type SensesFile = Record<string, Sense[]>

const POS_BY_TEMPLATE: Record<string, string> = {
  імен: 'іменник', дієсл: 'дієслово', прикм: 'прикметник', присл: 'прислівник', займ: 'займенник', числ: 'числівник', спол: 'сполучник', прийм: 'прийменник',
  част: 'частка', виг: 'вигук', дієприсл: 'дієприслівник', дієприкм: 'дієприкметник',
}
const POS_BY_CAT: [RegExp, string][] = [[/Іменники/, 'іменник'], [/Дієслова/, 'дієслово'], [/Прикметники/, 'прикметник'], [/Прислівники/, 'прислівник'], [/Займенники/, 'займенник'], [/Числівники/, 'числівник']]
const MAXLEN = 160, PER_GROUP = 4, PER_LEMMA = 8   // size budget of senses.json (lazy file, ~4 MB for 12k lemmas)
const ACUTE = /\u0301/

/** Drop all templates (innermost first), unwrap links, strip markup and HTML. */
export function cleanGloss(s: string): string {
  let t = s, prev = ''
  while (t !== prev) { prev = t; t = t.replace(/\{\{[^{}]*\}\}/g, '') }
  t = t.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<[^>]+>/g, '').replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2').replace(/\[https?:[^\s\]]+\s*([^\]]*)\]/g, '$1')
  t = t.replace(/'{2,}/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[,;:.\s]+/, '').replace(/[;:,]\s*$/, '').trim()
  if (t.length > MAXLEN) { const cut = t.slice(0, MAXLEN), sp = cut.lastIndexOf(' '); t = (sp > 120 ? cut.slice(0, sp) : cut).replace(/[;:,.\s]+$/, '') + '…' }
  return t
}

const strip = (s: string) => s.normalize('NFD').replace(/\u0301/g, '').normalize('NFC').toLowerCase().replace(/[’ʼ`]/g, "'")
/**
 * Stressed spelling of one homonym block, from (in this order) the nested `{{склади|ро|би́|ти}}`, `склади=пра́-ви-ло`, the level-2 heading `==пра́вило==`, `{{транскрипція|рука́}}`.
 * A candidate counts only if it has a stress mark AND, with the mark removed, equals the page title (so a stem variant or a partial form is never taken).
 */
export function stressOf(block: string, title: string, heading = ''): string | undefined {
  const cands: string[] = []
  const nested = /склади\s*=\s*\{\{склади\|([^{}]*)\}\}|\{\{склади\|([^{}]*)\}\}/.exec(block)
  if (nested) cands.push((nested[1] ?? nested[2]!).split('|').filter(x => x && !x.includes('=')).join(''))
  const plain = /склади\s*=\s*([^|{}\n]+)/.exec(block)
  if (plain) cands.push(plain[1]!.replace(/[-\s]/g, ''))
  cands.push(heading.replace(/[=\s]/g, ''))
  const tr = /\{\{транскрипція\|([^{}|]*)\}\}/.exec(block)
  if (tr) cands.push(tr[1]!.replace(/&nbsp;|\s/g, ''))
  for (const c of cands) { const s = c.normalize('NFC'); if (ACUTE.test(s.normalize('NFD')) && strip(s) === strip(title)) return s }
}
function posOf(block: string): string | undefined {
  const m = /\{\{\s*([а-яіїєґ]+)\s+uk\b/i.exec(block)
  if (m && POS_BY_TEMPLATE[m[1]!.toLowerCase()]) return POS_BY_TEMPLATE[m[1]!.toLowerCase()]
  const c = /\{\{Категорія\|[^}]*\}\}/.exec(block)
  return c ? POS_BY_CAT.find(([re]) => re.test(c[0]))?.[1] : undefined
}

/** Templates can span lines ({{семантика|…), so they are removed from the whole block before it is read line by line. */
const dropTemplates = (s: string) => { let t = s, prev = ''; while (t !== prev) { prev = t; t = t.replace(/\{\{[^{}]*\}\}/g, '') } return t }

/** Glosses of the `Значення` subsection(s) of one homonym block. */
function glossesOf(block: string): string[] {
  const out: string[] = []
  let on = false, lvl = 0
  for (const line of dropTemplates(block).split(/\r?\n/)) {
    const h = /^(=+)\s*(.*?)\s*\1\s*$/.exec(line)
    if (h) { if (/^Значення/.test(h[2]!)) { on = true; lvl = h[1]!.length } else if (!on || h[1]!.length <= lvl) on = false; continue }   // deeper sub-headings (===== Частка =====) stay inside
    if (/^;/.test(line)) { on = /^;\s*Значення/.test(line); continue }   // definition-list style `; Значення`
    if (!on) continue
    const m = /^(#{1,2})\s*(?![:*#])(.*)$/.exec(line)
    if (!m) continue
    const g = cleanGloss(m[2]!)
    if (g.length >= 2 && !/^[-–—?]+$/.test(g) && !out.includes(g)) out.push(g)
  }
  return out
}

/** Senses of the Ukrainian section of a page, one block per homonym; `source` = «uk.wiktionary r<revid>»; `title` validates the stress (see stressOf). */
export function parseSenses(wikitext: string, revid: number | string, title = ''): Sense[] {
  const lang = /^=?\s*\{\{[=-]([a-z-]+)[=-][^\n]*$/gim   // `{{=uk=}}`, `{{=uk=|{{PAGENAME}}}}`, `= {{-uk-}} =`
  let from = -1, to = wikitext.length, m: RegExpExecArray | null
  while ((m = lang.exec(wikitext))) { if (from < 0) { if (m[1] === 'uk') from = m.index + m[0].length } else { to = m.index; break } }
  if (from < 0) return []
  const sec = wikitext.slice(from, to), source = `uk.wiktionary r${revid}`
  // level-2 headings split homonyms (`== атлас І ==`, `==пра́вило==`); text before the first heading is its own block
  const blocks: { heading: string; text: string }[] = [{ heading: '', text: '' }]
  for (const line of sec.split(/\r?\n/)) {
    if (/^==(?!=)[^=\n]*==\s*$/.test(line)) blocks.push({ heading: line, text: '' })
    else blocks[blocks.length - 1]!.text += line + '\n'
  }
  const out: Sense[] = []
  for (const b of blocks) {
    if (!/Значення/.test(b.text)) continue
    const pos = posOf(b.text), stress = stressOf(b.text, title, b.heading)
    for (const g of glossesOf(b.text)) out.push({ gloss: g, ...(pos ? { pos } : {}), ...(stress ? { stress } : {}), source })
  }
  // size budget: ≤ PER_GROUP senses per homonym stress, ≤ PER_LEMMA per lemma (the first senses are the main ones)
  const seen = new Map<string, number>(), kept: Sense[] = []
  for (const s of out) { const k = s.stress ?? '', n = seen.get(k) ?? 0; if (n < PER_GROUP && kept.length < PER_LEMMA) { kept.push(s); seen.set(k, n + 1) } }
  return kept
}

/** UI: senses of a lemma whose stress equals `stressed` (NFC/NFD-insensitive); heteronym readings use this to pick their own sense. */
export const sensesWithStress = (rows: Sense[] | undefined, stressed: string): Sense[] =>
  (rows ?? []).filter(s => s.stress && s.stress.normalize('NFC') === stressed.normalize('NFC'))
/** Wiktionary revision of a sense (for the permalink), or undefined. */
export const senseRevision = (s: Sense): string | undefined => /r(\d+)$/.exec(s.source)?.[1]
