/**
 * BL-18 — vocabulary of authored (copyright / unvetted) songs.
 *
 * > "authored songs (copyright): fetch lyrics only for analysis, store **vocabulary only** (lemma/form counts per song, no running text; display ≤ 2-line quotes + link),
 * >  authors only if P-2-vetted" — specs/62-backlog.md BL-18
 * > "Authored modern text: at most 2 consecutive lines as a quotation plus a link to the source; never the full text." — research/17 R3-6
 *
 * The lyrics are read from `data/raw/song-lyrics/<song id>.txt` (gitignored, never published, never emitted). Their words are linked by the SAME stage as every corpus token
 * (build.ts: VESUM analyses + chooseLemma), but they belong to no witness and add nothing to any frequency. What leaves the build is, per song and per lemma, the lemma,
 * its token count and the spellings with their counts — sorted alphabetically, so the order of the lyrics is not recoverable; an ambiguous or unknown form is counted, not guessed (P-3.1).
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { tokenize } from '../core/text.ts'

export interface SongVocab {
  /** where the lyrics were read for analysis (a pointer, not a copy) */
  source: { url: string; what: string }
  tokens: number; linked: number
  /** distinct lemmas with their spellings: [lemma, f, [[spelling, n], …]] */
  lemmas: [string, number, [string, number][]][]
  /** spellings with no (or no unique) lemma: [spelling, n] */
  unresolved: [string, number][]
}

/** Provenance of the analysed lyrics (the lyrics themselves are not stored). */
export const LYRICS_SOURCES: Record<string, SongVocab['source']> = {
  'hey-hu-hey-ha': { url: 'https://uk.wikisource.org/wiki/' + encodeURIComponent('Гей-гу,_гей-га'), what: 'uk.wikisource «Гей-гу, гей-га (Гімн куреня "Лісові чорти")», wikitext, прочитано лише для аналізу' },
  'hey-vidchyniaite': { url: 'https://www.youtube.com/watch?v=5Pchv7llNis', what: 'опис відео (Український Повстанець), прочитано лише для аналізу' },
  'duma-pro-baturyn': { url: 'https://www.youtube.com/watch?v=dqeQ8uS5zpI', what: 'опис відео (1nn234), прочитано лише для аналізу' },
  'de-yest-rus-otchyna': { url: 'http://nashe.com.ua/song.htm?id=11423', what: 'НАШЕ (тексти пісень), «Де єсть руска отчина» (слова Івана Гушалевича), прочитано лише для аналізу' },
}

/** Words of every cached lyric file, by song id. Wikitext / HTML markup is dropped; only Cyrillic words survive tokenize(). */
export function loadLyrics(root: string): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const id of Object.keys(LYRICS_SOURCES)) {
    const p = resolve(root, 'data/raw/song-lyrics', id + '.txt')
    if (!existsSync(p)) continue
    let t = readFileSync(p, 'utf8')
    const sep = t.indexOf('*****'); if (sep >= 0) t = t.slice(sep + 5)          // video descriptions: the credits above the separator are not lyrics
    t = t.replace(/\{\{[^}]*\}\}/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    out.set(id, tokenize(t).map(x => x.raw))
  }
  return out
}

/** Fold the per-type counts of one song into its vocabulary. `lemmaOf(typeIndex)` is the linked lemma (undefined → unresolved). */
export function vocabOf(source: SongVocab['source'], counts: Map<string, { n: number; lemma?: string }>): SongVocab {
  const by = new Map<string, Map<string, number>>(), unres: [string, number][] = []
  let tokens = 0, linked = 0
  for (const [form, { n, lemma }] of counts) {
    tokens += n
    if (!lemma) { unres.push([form, n]); continue }
    linked += n
    const m = by.get(lemma) ?? by.set(lemma, new Map()).get(lemma)!
    m.set(form, n)
  }
  return {
    source, tokens, linked,
    lemmas: [...by].map(([l, m]) => [l, [...m.values()].reduce((a, b) => a + b, 0), [...m].sort((a, b) => a[0].localeCompare(b[0], 'uk'))] as SongVocab['lemmas'][number]).sort((a, b) => a[0].localeCompare(b[0], 'uk')),
    unresolved: unres.sort((a, b) => a[0].localeCompare(b[0], 'uk')),
  }
}
