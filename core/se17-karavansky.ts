/**
 * SPEC 63 SE-17 — Святослав Караванський, «Практичний словник синонімів української мови» (2-ге вид., Київ: Українська книга, 2000; ≈ 17 000 синонімічних рядів). IN COPYRIGHT. Pure (no node imports).
 * The OCR / text layer of the owner's scan (pdftotext in reading order, 3 columns; a scan page is a spread of two printed pages: printed = 2·i − 2 and 2·i − 1) is parsed into FULL rows
 * (headword, POS, the synonym words of each sense) that stay in a gitignored file on the machine. The owner's decision (2026-11-04, option b): only WORD-TO-WORD LINKS are published —
 * at most 5 synonyms per headword, no labels, remarks, examples or sense structure, the dictionary and the spread cited; the source row's order is NOT reproduced (the 5 are chosen by
 * rank — mutual first — and shown in alphabetical order). Option (a), full lists, needs the rights holders' permission and is NOT implemented.
 *
 * The notation (preface, «Приклади вживання скорочень»): the nest word is in CAPITALS, then the synonymous series separated by commas, senses by «;»; a remark in (…) is a sense hint;
 * /…/ holds optional parts; a lower-case abbreviation before a word labels THAT word (д. діялектизм, г. галицький, сов. совєтизм, р. рідко …), a capital one labels the nest word (Р., ЗН.);
 * a word in CAPITALS inside a series is a cross-reference to another nest (it is also a synonym); «&» introduces diminutive variants; «див.» / «пор.» point to another nest; «ФР.» /
 * «У ФР.» start phraseology; «-» abbreviates a repeated stem (згинати, за-, пере-).
 */
export const KAR_SHORT = 'Караванський, Практичний словник синонімів української мови (2000)'
export const KAR_DICT = 'karavansky'
/** the lower-case abbreviations of the preface (a word that follows one is labelled and is NOT published as a link) */
export const KAR_LABELS = new Set(['анал', 'анат', 'ан', 'бар', 'б', 'біб', 'бб', 'бібл', 'бл', 'біол', 'бі', 'бот', 'бт', 'буд', 'бд', 'бук', 'бк', 'від', 'відпов', 'вій', 'в-й', 'ест', 'вул', 'вл', 'г', 'геог', 'гг', 'геол', 'гл', 'гір', 'гр', 'грам', 'грм', 'д', 'дип', 'дп', 'дит', 'дт', 'дієс', 'д-о', 'док', 'дк', 'ев', 'ек', 'ел', 'етн', 'ж', 'жін', 'жп', 'жм', 'жрг', 'з', 'зай', 'з-к', 'зал', 'зл', 'зап', 'зп', 'зб', 'зв', 'зн', 'арх', 'зет', 'ід', 'ім', 'ір', 'ігор', 'іст', 'іс', 'кн', 'к', 'кул', 'кл', 'лай', 'л', 'лінґ', 'лґ', 'літ', 'лт', 'май', 'м-й', 'мат', 'мт', 'мед', 'мд', 'мет', 'мин', 'мн', 'мист', 'м-о', 'міт', 'мж', 'мож', 'мор', 'мр', 'муз', 'м', 'н', 'пак', 'нк', 'нег', 'нґ', 'недок', 'ндк', 'неос', 'по', 'нд', 'нст', 'обр', 'о', 'од', 'ок', 'орн', 'ор', 'ос', 'п', 'поб', 'пб', 'поет', 'пор', 'пі', 'пох', 'их', 'ппр', 'пр', 'пре', 'приб', 'п-о', 'прий', 'пр-к', 'прик', 'п-к', 'пр.н', 'р', 'рад', 'рд', 'р.в', 'рел', 'рл', 'с.г', 'сил', 'с', 'сл', 'сов', 'св', 'сп', 'спрт', 'суч', 'сч', 'теат', 'тт', 'текс', 'тс', 'тех', 'т', 'тлк', 'ур', 'укр', 'у', 'фр', 'фам', 'ф', 'фіз', 'фз', 'філ', 'фл', 'флк', 'фот', 'фт', 'хем', 'х', 'ц', 'цер', 'ч', 'чис', 'ч-к', 'чол', 'чл', 'шк', 'юр', 'п.ф', 'ц.д', 'з.п', 'б.з', 'од.зб'])
const CAPS = 'А-ЯІЇЄҐ'
const WORD = /^[а-яіїєґ]+(?:['’ʼ-][а-яіїєґ]+)*$/u

export interface KarPage { text: string; no: number }
export interface KarRow {
  head: string
  /** the other nest words named in the heading («АБАТ, АБАТИСА, і АБАТСТВО, див. …») */ extra?: string[]
  /** the POS the heading prints (сп. пр. зай. дк. нд. …), as a coarse class: conj adv pron verb ... */ pos?: string
  /** the synonym words (no labels, single words only), per sense; a word printed in CAPITALS (cross-reference) is lower-cased and flagged in `ref` */
  senses: string[][]
  /** words after a remark «(шкот) …» inside a sense: bound to that context (a narrower sense); a link only when the other nest lists the headword back */
  cx?: string[]
  ref?: string[]
  /** the printed spread «с. 10–11» */ page: string
  /** the nest is only a pointer («див. X»), no series */ xref?: boolean
}
export interface KarStats { pages: number; chunks: number; orphanLines: number; entries: number; xref: number; senses: number; items: number; words: number; labelled: number; phrases: number; stems: number; rejectedHead: number }
export const newKarStats = (): KarStats => ({ pages: 0, chunks: 0, orphanLines: 0, entries: 0, xref: 0, senses: 0, items: 0, words: 0, labelled: 0, phrases: 0, stems: 0, rejectedHead: 0 })
export const karPage = (scan: number): string => `с. ${2 * scan - 2}–${2 * scan - 1}`

/** the printed spaced capitals «Н Е Д О В І Р О К» → «НЕДОВІРОК» */
const unspace = (s: string): string => s.replace(new RegExp(`(?<![${CAPS}a-zа-яіїєґ])((?:[${CAPS}] ){2,}[${CAPS}])(?![${CAPS}a-zа-яіїєґ])`, 'gu'), m => m.replace(/ /g, ''))
const RUNNING = new RegExp('^[' + CAPS + "'’ʼ \\-]+$", 'u')
const HEAD = new RegExp(`^([${CAPS}][${CAPS}'’ʼ\\-]*[${CAPS}](?: [${CAPS}][${CAPS}'’ʼ\\-]*[${CAPS}])*)(?=[ ,.;]|$)`, 'u')
const POS_MARK: Record<string, string> = { 'сп': 'conj', 'пр': 'adv', 'зай': 'pron', 'дк': 'verb', 'нд': 'verb', 'ч': 'part', 'виг': 'intj', 'прий': 'prep', 'чис': 'numr' }
const NOT_HEAD = new Set(['ЖМ', 'ФР', 'ЗН', 'ЛАЙ', 'ІМ', 'ІД', 'ПОР', 'ДИВ'])

/** the lines of a page → entry strings (a new entry starts at a capitals headword after a line that ended an entry, and only inside a block that starts with one) */
export function splitKarEntries(pages: KarPage[], st?: KarStats): { text: string; scan: number }[] {
  const out: { text: string; scan: number }[] = []
  for (const p of pages) {
    if (st) st.pages++
    const blocks = p.text.split(/\n\s*\n/)
    for (const b of blocks) {
      const lines = b.split('\n').map(l => unspace(l.trim())).filter(l => l && !/^\d{1,3}$/.test(l) && !/^[А-ЯІЇЄҐ]$/u.test(l))
      if (!lines.length || (lines.length === 1 && RUNNING.test(lines[0]!))) continue   // a running head (one capitals word alone in a block)
      if (st) st.chunks++
      let cur: { text: string; scan: number } | undefined, prevEnded = true
      for (const l of lines) {
        const h = HEAD.exec(l), startsEntry = !!h && !NOT_HEAD.has(h[1]!) && (prevEnded || !cur)
        if (startsEntry) { if (cur) out.push(cur); cur = { text: l, scan: p.no } } else if (cur) cur.text += (/-$/.test(cur.text) ? '' : ' ') + l
        else if (st) st.orphanLines++
        prevEnded = /[.!?)]$|\/\.$/.test(l)
      }
      if (cur) out.push(cur)
    }
  }
  return out
}

/** split at top-level separators, not inside (…) or /…/ */
function splitTop(s: string, seps: string): string[] {
  const out: string[] = []; let depth = 0, slash = false, cur = ''
  for (const c of s) {
    if (c === '(') depth++; else if (c === ')') depth = Math.max(0, depth - 1)
    else if (c === '/') slash = !slash
    if (!depth && !slash && seps.includes(c)) { out.push(cur); cur = '' } else cur += c
  }
  out.push(cur)
  return out.map(x => x.trim()).filter(Boolean)
}
const lowerFirst = (w: string): string => w.toLowerCase()

/** one entry string → a row (or undefined when the heading is no headword) */
export function parseKarEntry(text: string, scan: number, st?: KarStats): KarRow | undefined {
  const m = HEAD.exec(text); if (!m) { if (st) st.rejectedHead++; return undefined }
  const head = m[1]!.toLowerCase()
  if (head.includes(' ')) { if (st) st.phrases++; return undefined }   // «СИПАТИ СЛОВАМИ», «АБИ ТО»: a phrase heading, no word-to-word link
  let rest = text.slice(m[0].length).replace(/^[\s,]+/, '').replace(/[.\s]+$/, '')
  const row: KarRow = { head, senses: [], page: karPage(scan) }
  // a heading with more nest words: «АБАТ, АБАТИСА, і АБАТСТВО, див. …», «АФЕРА і АФЕРИСТ, а. АВАНТУРА …»
  const extra: string[] = []
  for (;;) {
    const e = new RegExp(`^(?:і |та )?([${CAPS}][${CAPS}'’ʼ\\-]*[${CAPS}])(?=[ ,.;]|$)[\\s,]*`, 'u').exec(rest)
    if (!e || NOT_HEAD.has(e[1]!)) break
    const before = rest.slice(0, e[0].length)
    // after a plain comma a capitals word is a cross-reference synonym of the head, not another nest word — only «і X» / «та X» joins nest words
    if (!/^(?:і|та) /.test(before)) break
    extra.push(e[1]!.toLowerCase()); rest = rest.slice(e[0].length)
  }
  if (extra.length) row.extra = extra
  if (/^(?:[А-ЯІЇЄҐ'’ʼ-]+[,\s]+(?:і\s+)?)*(?:див|пор)\.?(?:\s|$)/u.test(rest) && !/^пор/u.test(rest)) { row.xref = true; if (st) st.xref++ }
  // POS markers (lower case abbreviations printed straight after the heading): «АБО сп., чи …», «АБИДЕ пр., (…)»
  let pm: RegExpExecArray | null
  while ((pm = /^([а-яіїєґ]{1,5})\.(?:\s*,)?\s*/u.exec(rest)) && POS_MARK[pm[1]!] && !row.pos) { row.pos = POS_MARK[pm[1]!]; rest = rest.slice(pm[0].length) }
  if (row.xref) return row
  // «п-к ОЧЕВИДНИЙ, (факт) …»: from here the series belongs to the derived adjective (a nest of its own inside the article), not to the headword
  rest = rest.split(/(?<![\p{L}])п-к\s+(?=[А-ЯІЇЄҐ'’-]{2})/u)[0]!.replace(/[,;\s]+$/, '')
  const refs: string[] = [], cx: string[] = []
  let stopAll = false
  for (const sense of splitTop(rest, ';')) {
    if (stopAll) break
    const words: string[] = []
    let ctx = false   // after the first remark «(шкот) …» of a sense the words are bound to that context (a narrower sense), not plain synonyms of the headword
    for (let item of splitTop(sense, ',')) {
      if (st) st.items++
      // phraseology / pointers end the usable part of the sense
      if (/^(?:У\s+)?ФР\./u.test(item) || /^&/.test(item)) break
      item = item.replace(/^\d{1,2}\.\s*/u, '')   // the numbered senses «2. (сторона) західній напрям»
      // «док. ПОЄДНАТИСЯ, згуртуватися»: a nest word of another form; what follows is ITS series
      if (/^(?:док|недок|мн|од|зб)\.\s+[А-ЯІЇЄҐ'’-]{2,}/u.test(item)) { stopAll = true; break }
      if (/^(?:див|пор|пі|п-к|пр\.)(?![\p{L}])/u.test(item)) continue
      if (/^\(/.test(item)) ctx = true
      item = item.replace(/^\(([^()]*)\)\s*/u, '')
      if (!item || /[/(]/.test(item)) { if (item && st) st.phrases++; continue }
      if (/-$/.test(item) || /^-/.test(item)) { if (st) st.stems++; continue }
      const toks = item.split(/\s+/)
      if (toks.length > 1) {
        // «д. альбо», «сов. штик»: a lower-case label before a word → that word is labelled (never published); «П. маса, натовп»: a capital label qualifies the NEST word for the rest of the sense
        if (/^[А-ЯІЇЄҐ]{1,4}\.?$/u.test(toks[0]!) && /\.$/.test(toks[0]!)) { if (st) st.labelled++; break }
        if (toks.length === 2 && /^[а-яіїєґ.\-]{1,8}\.$/u.test(toks[0]!)) { if (st) st.labelled++; continue }
        if (st) st.phrases++; continue
      }
      const w = toks[0]!.replace(/[.!?]+$/, '')
      if (/\.$/.test(toks[0]!) || KAR_LABELS.has(w)) continue
      const cap = new RegExp(`^[${CAPS}'’ʼ\-]+$`, 'u').test(w)
      const lw = lowerFirst(w)
      if (!WORD.test(lw) || lw.length < 2) continue
      if (ctx) { cx.push(lw); continue }
      words.push(lw); if (cap) refs.push(lw)
      if (st) st.words++
    }
    if (words.length) { row.senses.push([...new Set(words)]); if (st) st.senses++ }
  }
  if (refs.length) row.ref = [...new Set(refs)]
  if (cx.length) row.cx = [...new Set(cx)]
  return row
}

export function parseKaravansky(pages: KarPage[], st: KarStats = newKarStats()): KarRow[] {
  const rows: KarRow[] = []
  for (const e of splitKarEntries(pages, st)) { const r = parseKarEntry(e.text, e.scan, st); if (r) { rows.push(r); st.entries++ } }
  return rows
}

// ── links (option b) ────────────────────────────────────────────────────────────────────────────
export interface KarLink { h: string; t: string; page: string; /** the other nest lists the headword back */ m?: 1; /** the target is itself a nest word of the dictionary (so a one-sided link between two nest words is detectable) */ n?: 1 }
export interface KarLinkStats { heads: number; headsWithLinks: number; linksOut: number; mutual: number; pairsAll: number; pairsBothVesum: number; pairsSamePos: number; capped: number }
export type PosSet = (w: string) => ReadonlySet<string> | undefined
/** the distinct unordered pairs (a, b) of all series words with the headword, regardless of the cap, for the measurement */
export function allPairs(rows: KarRow[], withContext = true): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>()
  for (const r of rows) {
    if (r.xref) continue
    const ws = [...r.senses.flat(), ...(withContext ? r.cx ?? [] : [])]
    for (const h of [r.head, ...(r.extra ?? [])]) for (const w of ws) { if (w === h) continue; (m.get(h) ?? m.set(h, new Set()).get(h)!).add(w) }
  }
  return m
}
const hashKey = (s: string): number => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.codePointAt(0)!, 16777619) >>> 0; return h }
/**
 * The published links: for each headword at most `max` synonyms that are VESUM lemmas of the headword's POS (both ends known), mutual links first (B's own nest lists A), then the rest by a fixed
 * hash of the pair (NOT the printed order, so the series is never reproduced as a block); the chosen ones are listed alphabetically. A series word that is itself a nest word of the dictionary
 * but does not list the headword back is dropped when a mutual alternative exists only through the ranking (one-sided links stay allowed: the guard of CR-1 is applied there, by the adapter).
 */
export function selectKarLinks(rows: KarRow[], posOf: PosSet, max = 5): { links: KarLink[]; stats: KarLinkStats } {
  const all = allPairs(rows), plainP = allPairs(rows, false), pageOf = new Map<string, string>()
  for (const r of rows) if (!r.xref) for (const h of [r.head, ...(r.extra ?? [])]) if (!pageOf.has(h)) pageOf.set(h, r.page)
  const st: KarLinkStats = { heads: all.size, headsWithLinks: 0, linksOut: 0, mutual: 0, pairsAll: 0, pairsBothVesum: 0, pairsSamePos: 0, capped: 0 }
  const links: KarLink[] = []
  const seenPair = new Set<string>()
  for (const [h, ws] of [...all].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const hp = posOf(h)
    const cands: { w: string; mutual: boolean }[] = []
    for (const w of ws) {
      const key = h < w ? h + '|' + w : w + '|' + h
      const first = !seenPair.has(key); seenPair.add(key)
      if (first) st.pairsAll++
      const wp = posOf(w)
      if (!hp?.size || !wp?.size) continue
      if (first) st.pairsBothVesum++
      const shared = [...hp].some(p => wp.has(p))
      if (!shared) continue
      if (first) st.pairsSamePos++
      const mutual = all.get(w)?.has(h) ?? false
      if (!mutual && !plainP.get(h)?.has(w)) continue   // a word that only a context-bound («(шкот) …») sense names is a link only when the other nest lists the headword back
      cands.push({ w, mutual })
    }
    cands.sort((a, b) => +b.mutual - +a.mutual || hashKey(h + '>' + a.w) - hashKey(h + '>' + b.w))
    if (cands.length > max) st.capped += cands.length - max
    const pick = cands.slice(0, max).sort((a, b) => (a.w < b.w ? -1 : 1))
    if (pick.length) st.headsWithLinks++
    for (const c of pick) { links.push({ h, t: c.w, page: pageOf.get(h)!, ...(c.mutual ? { m: 1 as const } : {}), ...(all.has(c.w) ? { n: 1 as const } : {}) }); st.linksOut++; if (c.mutual) st.mutual++ }
  }
  return { links, stats: st }
}
