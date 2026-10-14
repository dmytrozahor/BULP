/**
 * SPEC 63 PH-1/PH-3 harvest: glosses / etymology / register tags / synonyms of phrasemes from the pinned kaikki.org dump of en.wiktionary
 * (data/raw/kaikki/uk.jsonl, CC BY-SA 4.0). Only multi-word headwords are kept. Each statement carries source + locator (SPEC 00); nothing is translated or guessed.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { phraseKey, type Quoted } from '../core/phraseme-pages.ts'
import { idiomWords } from '../core/phrasemes.ts'

export interface DictEntry { word: string; pos: string; gloss: Quoted[]; etymology: Quoted[]; tags: Quoted[]; synonyms: Quoted[] }
const SRC = 'en.wiktionary (kaikki.org, Wiktextract)', LIC = 'CC BY-SA 4.0'
export function harvestKaikkiPhrases(root: string): Map<string, DictEntry[]> {
  const p = resolve(root, 'data/raw/kaikki/uk.jsonl'), out = new Map<string, DictEntry[]>()
  if (!existsSync(p)) return out
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    if (!/"word":\s*"[^"]*\s[^"]*"/.test(line)) continue
    let e: { word: string; pos: string; senses?: { glosses?: string[]; tags?: string[] }[]; etymology_text?: string; synonyms?: { word: string }[] }
    try { e = JSON.parse(line) } catch { continue }
    if (!/\s/.test(e.word)) continue
    const at = (path: string): string => `kaikki uk.jsonl › «${e.word}» (${e.pos}) › ${path}`
    const gloss: Quoted[] = [], tags: Quoted[] = []
    ;(e.senses ?? []).slice(0, 4).forEach((s, i) => {
      for (const g of s.glosses ?? []) gloss.push({ text: g, src: SRC, loc: at(`senses[${i}].glosses`), licence: LIC })
      for (const t of s.tags ?? []) if (!tags.some(x => x.text === t)) tags.push({ text: t, src: SRC, loc: at(`senses[${i}].tags`), licence: LIC })
    })
    const d: DictEntry = {
      word: e.word, pos: e.pos, gloss, tags,
      etymology: e.etymology_text ? [{ text: e.etymology_text.trim(), src: SRC, loc: at('etymology_text'), licence: LIC }] : [],
      synonyms: (e.synonyms ?? []).slice(0, 6).map(s => ({ text: s.word, src: SRC, loc: at('synonyms'), licence: LIC })),
    }
    const k = phraseKey(idiomWords(e.word)), a = out.get(k) ?? []
    a.push(d); out.set(k, a)
  }
  return out
}
