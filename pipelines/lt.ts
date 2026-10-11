/**
 * LanguageTool Ukrainian replace tables → LexIndex['lt'] (research/05 §2: "8,038 entries in replace.txt").
 *
 * Format (file header): "# Format: word=suggestion1|suggestion2|suggestion3..." — `#` starts a comment line (also used to
 * comment out entries); split on the FIRST `=`. Everything right of it is kept VERBATIM as the suggestion string, because
 * replace.txt puts free-text notes and `;` lists there ("абсорбуючий=поглинальний|вбиральний|що абсорбує (всотує|поглинає; …); абсорбент").
 * replace_soft.txt context prefix: the first alternative may be "ctx: релігія,поезія" or "ctx: військ." (a usage condition, not
 * a replacement). We do NOT strip it — it stays verbatim as the first alternative so the evidence line is exact; use
 * `ltSuggestions()` to get the plain replacements and the ctx note separately.
 * Keys are key()-normalised (lower case, no stress). On a key collision replace.txt beats replace_soft.txt, then first line wins.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { LexIndex } from '../core/types.ts'
import { key } from '../core/text.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = 'https://raw.githubusercontent.com/languagetool-org/languagetool/master/languagetool-language-modules/uk/src/main/resources/org/languagetool/rules/uk/'
export const LT_FILES = [['replace', 'replace.txt'], ['soft', 'replace_soft.txt']] as const

export interface LtLine { wrong: string; suggest: string }

/** Parse one table; comment/blank/`=`-less lines are skipped. */
export function parseLt(text: string): LtLine[] {
  const out: LtLine[] = []
  for (const raw of text.replace(/^﻿/, '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i <= 0) continue
    const wrong = line.slice(0, i).trim(), suggest = line.slice(i + 1).trim()
    if (wrong && suggest) out.push({ wrong, suggest })
  }
  return out
}

/** Split a suggestion string into plain replacements and the optional `ctx:` note (soft file). */
export function ltSuggestions(suggest: string): { ctx?: string; alts: string[] } {
  const parts = suggest.split('|').map(s => s.trim())
  return parts[0]?.startsWith('ctx:') ? { ctx: parts[0].slice(4).trim(), alts: parts.slice(1) } : { alts: parts }
}

/** Build the index from already-loaded file texts (pure; used by tests). */
export function buildLt(texts: { replace: string; soft: string }): LexIndex['lt'] {
  const lt: LexIndex['lt'] = {}
  for (const [file] of LT_FILES) for (const { wrong, suggest } of parseLt(texts[file])) {
    const k = key(wrong)
    if (!(k in lt)) lt[k] = [file, suggest]
  }
  return lt
}

async function cached(name: string): Promise<string> {
  const p = resolve(ROOT, 'data/raw/lt', name)
  if (!existsSync(p)) {
    const r = await fetch(BASE + name)
    if (!r.ok) throw new Error(`LT fetch ${name}: ${r.status}`)
    mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, await r.text())
  }
  return readFileSync(p, 'utf8')
}

const both = () => Promise.all(LT_FILES.map(([, f]) => cached(f))) as Promise<[string, string]>

export async function ltIndex(): Promise<LexIndex['lt']> {
  const [replace, soft] = await both()
  return buildLt({ replace, soft })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [replace, soft] = await both()
  const nr = parseLt(replace).length, ns = parseLt(soft).length
  const lt = buildLt({ replace, soft })
  const ctx = parseLt(soft).filter(l => ltSuggestions(l.suggest).ctx !== undefined).length
  console.log(`replace.txt lines: ${replace.split('\n').length}, entries: ${nr}`)
  console.log(`replace_soft.txt lines: ${soft.split('\n').length}, entries: ${ns} (with ctx: prefix: ${ctx})`)
  console.log(`index keys: ${Object.keys(lt).length}, JSON bytes: ${Buffer.byteLength(JSON.stringify(lt))}`)
}
