/**
 * віра.укр Archangel Gospel (1092) ingester (unit `arch`) — SPEC 10 M-1.3, M-2.1.
 *
 * > "Chapter URL: `/b/arch-gospel/{matt|mark|luke|john}-cs-ar-{N}` … Verse anchor: `#{book}-cs-ar-{N}:{v}`. HTML is
 * >  `<div id="matt-cs-ar-1:1" …>` followed by `<div class="verse-body cs-arch">TEXT</div>`. Text is rendered with the
 * >  font `UstavUCS3.ttf`, so the HTML holds a font-specific transliteration … A mapping table must be built by
 * >  comparing against the font, before matching forms." — research/01 §2
 *
 * discover: the index page exposes only the first chapter of each book; every chapter page links to all chapters of its
 * own book, so we read the index, then the four chapter-1 pages, and collect all `{book}-cs-ar-{N}` links.
 * parse: verse div + `.verse-body` → decodeVira (core/text.ts) → whitespace tokens; loc = "{Мт|Мк|Лк|Ін} {N}:{v}",
 * s = running verse index. A token that still contains a Latin letter is dropped and counted in `dropped.unmapped`.
 */
import type { Ingester } from './ingest.ts'
import type { Unit } from './manifest.ts'
import type { TokenRec } from '../core/types.ts'
import { decodeVira, hasUnmapped } from '../core/text.ts'
import { witnessOf } from './ingest-torot.ts'

const BOOKS: Record<string, string> = { matt: 'Мт', mark: 'Мк', luke: 'Лк', john: 'Ін' }
const ORIGIN = 'https://xn--80ad6b1e.xn--j1amh'
const CHAPTER_LINK = /\/b\/arch-gospel\/((?:matt|mark|luke|john)-cs-ar-\d+)(?![\w:-])/g

/** Glyph slots whose value could not be established from a verse comparison (see report): any stray non-Cyrillic symbol or one of these. */
const UNRESOLVED = /[^\p{Script=Cyrillic}\p{M}'’-]|[ӐҲӬҴӣ]/u

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', apos: "'" }
const unhtml = (s: string) => s.replace(/<[^>]*>/g, '')
  .replace(/&(?:#(\d+)|#x([0-9a-f]+)|(\w+));/gi, (m, d, h, n) => d ? String.fromCodePoint(+d) : h ? String.fromCodePoint(parseInt(h, 16)) : entities[n] ?? m)

/** Pure: chapter links found on a page. */
export const chapterLinks = (html: string) => [...new Set([...html.matchAll(CHAPTER_LINK)].map(m => `${ORIGIN}/b/arch-gospel/${m[1]}`))]

export interface Verse { book: string; ch: number; v: number; text: string; notes: number }
/** Pure: verses of a chapter page (`<div id="john-cs-ar-1:1" …>` … `<div class="verse-body …">TEXT</div>`). */
export function parseVerses(html: string): Verse[] {
  const out: Verse[] = []
  const re = /<div\s+id="(matt|mark|luke|john)-cs-ar-(\d+):(\d+)"[\s\S]*?<div\s+class="verse-body[^"]*">([\s\S]*?)<\/div>/g
  for (const m of html.matchAll(re)) {
    // editorial notes: <sup title="Описка, у відомих списках … " data-bs-toggle="tooltip">*</sup> — apparatus, removed and counted
    const notes = (m[4]!.match(/<sup\b/g) ?? []).length
    out.push({ book: m[1]!, ch: +m[2]!, v: +m[3]!, notes, text: unhtml(m[4]!.replace(/<sup\b[\s\S]*?<\/sup>/g, '')).replace(/\s+/g, ' ').trim() })
  }
  return out
}

/** Pure: decoded verse text → tokens (loc "Ін 1:1"); returns count of dropped (unmapped-Latin) tokens. */
export function verseTokens(vs: Verse[]): { tokens: TokenRec[]; unmapped: number } {
  const tokens: TokenRec[] = []; let unmapped = 0
  vs.forEach((v, s) => {
    const loc = `${BOOKS[v.book]} ${v.ch}:${v.v}`
    // split at whitespace and sentence punctuation (. , : ; " ( ) !); stray symbols stay inside the word and get it dropped
    for (const raw of decodeVira(v.text).split(/[\s.,:;!"()]+/)) {
      if (!/\p{L}/u.test(raw)) continue                       // only titlo marks left (leaked verse number)
      if (hasUnmapped(raw) || UNRESOLVED.test(raw)) { unmapped++; continue }
      tokens.push({ raw, loc, s })
    }
  })
  return { tokens, unmapped }
}

export default {
  async discover(u, fetchText) {
    const found = new Set<string>()
    for (const first of chapterLinks(await fetchText(u.urls[0]!))) {
      for (const l of chapterLinks(await fetchText(first))) found.add(l)
      await new Promise(r => setTimeout(r, 350))
    }
    const order = Object.keys(BOOKS)
    return [...found].sort((a, b) => order.indexOf(a.match(/(matt|mark|luke|john)/)![1]!) - order.indexOf(b.match(/(matt|mark|luke|john)/)![1]!) || +a.match(/(\d+)$/)![1]! - +b.match(/(\d+)$/)![1]!)
  },
  parse(u: Unit, files) {
    const verses = files.flatMap(f => parseVerses(f.body.toString('utf8')))
    const { tokens, unmapped } = verseTokens(verses)
    return [witnessOf(u, tokens, { dropped: { unmapped, apparatus: verses.reduce((n, v) => n + v.notes, 0) } })]
  },
} satisfies Ingester
