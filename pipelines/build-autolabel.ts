/**
 * BUILD step SPEC 63 AC: automatic labels, recomputed on every build from what the ingested sources say (no hand lists).
 *  - kaikki (en.wiktionary, data/raw/kaikki/uk.jsonl): sense tags → usage rows (AC-1, table KAIKKI_TAGS). The 300 MB dump is streamed once into the cache
 *    data/work/autolabel-kaikki.json, which is keyed by the table so a changed table re-harvests.
 *  - r2u (Грінченко): the dictionary's regional abbreviations → dialect-group claims through the gazetteer (AC-1 + AC-2).
 *  - r2u ru→uk articles by Russian headword → AC-3 contact claims (applied in build.ts where VESUM / pymorphy3-ru verdicts exist).
 */
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { key } from '../core/text.ts'
import { fold } from '../core/orthography.ts'
import { mergeClaims } from './build-annotate.ts'
import { D, type Claim } from '../core/evidence.ts'
import { GAZETTEER, HRINCH_ABBR, KAIKKI_KEEP, KAIKKI_TAGS, R2U_ABBR, regionDialectClaims, type R2uPair } from '../core/autolabel.ts'
import { DIALECT_LEX } from '../core/dialect-lex.ts'
import { R2U_DIR, storedRows, tokenRaw } from './ingest-r2u.ts'
import { r2uDictById, rowUrl } from './r2u.ts'

export type KaikkiTags = Map<string, [tag: string, gloss: string][]>
const tableKey = () => createHash('sha256').update(JSON.stringify(KAIKKI_TAGS.rows.map(r => r.abbr))).digest('hex').slice(0, 12)

/** Ukrainian lemma (key) → [tag, first gloss] of every sense carrying a table tag (form-of senses are not lemma labels). */
export async function loadKaikki(root: string): Promise<{ words: KaikkiTags; senses: number }> {
  const cache = resolve(root, 'data/work/autolabel-kaikki.json'), src = resolve(root, 'data/raw/kaikki/uk.jsonl')
  let obj: Record<string, [string, string][]> | undefined
  if (existsSync(cache)) { const c = JSON.parse(readFileSync(cache, 'utf8')) as { table: string; words: Record<string, [string, string][]> }; if (c.table === tableKey()) obj = c.words }
  if (!obj && existsSync(src)) {
    obj = {}
    const rl = createInterface({ input: createReadStream(src, 'utf8'), crlfDelay: Infinity })
    for await (const line of rl) {
      let e: { word?: string; lang_code?: string; senses?: { tags?: string[]; glosses?: string[] }[] }
      try { e = JSON.parse(line) } catch { continue }
      if (e.lang_code !== 'uk' || !e.word) continue
      for (const s of e.senses ?? []) {
        const tags = s.tags ?? []
        if (tags.includes('form-of') || tags.includes('alt-of')) continue
        for (const t of tags) if (KAIKKI_KEEP.has(t)) { const l = (obj[key(e.word)] ??= []); if (!l.some(x => x[0] === t)) l.push([t, (s.glosses?.[0] ?? '').slice(0, 120)]) }
      }
    }
    writeFileSync(cache, JSON.stringify({ table: tableKey(), words: obj }))
  }
  const words: KaikkiTags = new Map(Object.entries(obj ?? {}))
  return { words, senses: [...words.values()].reduce((n, l) => n + l.length, 0) }
}

export interface AutoLabels {
  kaikki: KaikkiTags
  /** lemma display → dialect-group claims from dictionary region labels (AC-1 + AC-2) */
  dialect: Map<string, Record<string, Claim<true>>>
  /** key of a Russian headword → r2u ru→uk articles (AC-3 input) */
  ruPairs: Map<string, R2uPair[]>
  stats: { kaikkiLemmas: number; kaikkiSenses: number; r2uRows: number; r2uLabelled: number; dialectLemmas: number; ruHeads: number }
  /** filled by build.ts per lemma card: lemmas, dialect (before/after the automatic channel), surzhyk (rule-derived before / after / computed by AC-3) */
  counts: { lemmas: number; diaBase: number; diaAfter: number; szBase: number; szAfter: number; szAuto: number }
}

/** Loads every automatic-label input for the kept lemmas (displays). */
export async function buildAutoLabels(root: string, lemmas: string[]): Promise<AutoLabels> {
  const k = await loadKaikki(root)
  const want = new Map(lemmas.map(l => [key(l), l])), dialect = new Map<string, Record<string, Claim<true>>>(), ruPairs = new Map<string, R2uPair[]>()
  let r2uRows = 0, r2uLabelled = 0
  if (existsSync(resolve(root, R2U_DIR, 'index.jsonl'))) {
    const { rows } = storedRows(resolve(root, R2U_DIR), 'pages/')   // the open dump: pages/<file>.html.gz beside index.jsonl
    r2uRows = rows.length
    for (const r of rows) {
      const d = r2uDictById[r.dict]; if (!d) continue
      if (d.dir === 'ru-uk') {   // AC-3: the Russian headword's Ukrainian equivalents
        for (const h of r.head) {
          const kk = key(tokenRaw(h)), p: R2uPair = { dict: d.short, url: rowUrl(r.q, r.scope, r), head: h, eq: r.eq, text: r.text }
          if (r.eq.length && !(ruPairs.get(kk) ?? ruPairs.set(kk, []).get(kk)!).some(x => x.url === p.url)) ruPairs.get(kk)!.push(p)
        }
        continue
      }
      const table = R2U_ABBR[r.dict]
      if (!table || !r.labels?.length) continue
      const lemma = r.head.flatMap(h => fold(tokenRaw(h), d.orth).map(c => want.get(key(c.form)))).find((x): x is string => !!x)
      if (!lemma) continue
      r2uLabelled++
      for (const l of r.labels) {
        const row = table.rows.find(x => x.abbr === l.abbr)!
        const art = D('R2U', rowUrl(r.q, r.scope, r), l.quote, `${d.short} (${d.years[0]}–${d.years[1]}), стаття цілком; мітка «${l.abbr}» стоїть у статті`)
        const c = regionDialectClaims(art, table, row)
        if (Object.keys(c).length) dialect.set(lemma, mergeClaims(dialect.get(lemma) ?? {}, c))
      }
    }
  }
  return { kaikki: k.words, dialect, ruPairs, counts: { lemmas: 0, diaBase: 0, diaAfter: 0, szBase: 0, szAfter: 0, szAuto: 0 }, stats: { kaikkiLemmas: k.words.size, kaikkiSenses: k.senses, r2uRows, r2uLabelled, dialectLemmas: dialect.size, ruHeads: ruPairs.size } }
}

/**
 * SPEC 63 AC-5 → analysis/auto-classification.md: coverage per label type before (without the automatic channel) / after, and agreement with the old hand list
 * (core/dialect-lex.ts, now a fixture with its own quotes; it is NOT an input of any channel above).
 */
export function writeAutoReport(root: string, auto: AutoLabels, lemmas: string[], usage: { lemmas: number; wikt: number; vesum: number; kaikki: number; kaikkiOnly: number }, generated: string): void {
  const c = auto.counts, N = c.lemmas || 1, pc = (n: number) => `${n} (${((100 * n) / N).toFixed(1)} %)`
  const have = new Map(lemmas.map(l => [key(l), l]))
  let inKept = 0, grp = 0, agree = 0, disagree = 0, kk = 0
  const bad: string[] = []
  for (const e of DIALECT_LEX) for (const w of e.w) {
    const l = have.get(key(w)); if (!l) continue
    inKept++
    const g = auto.dialect.get(l)
    if (g) { grp++; if (Object.keys(g).some(x => e.codes.includes(x))) agree++; else { disagree++; bad.push(`${w}: ${e.codes.join('/')} vs ${Object.keys(g).join('/')}`) } }
    if ((auto.kaikki.get(key(w)) ?? []).some(t => t[0] === 'dialectal')) kk++
  }
  const lexWords = DIALECT_LEX.reduce((n, e) => n + e.w.length, 0)
  const lexKaikki = DIALECT_LEX.reduce((n, e) => n + e.w.filter(w => (auto.kaikki.get(key(w)) ?? []).some(t => t[0] === 'dialectal')).length, 0)
  const tbl = (t: { id: string; source: string; list: string; rows: unknown[] }) => `| ${t.id} | ${t.source} | ${t.list} | ${t.rows.length} |`
  const out = [
    '# Automatic classification (SPEC 63 AC-5)', '',
    `Generated by the build (${generated}). Every label below is computed from a source's own abbreviation / tag / region name and carries a verbatim quote; no word is classified by hand.`, '',
    `## Coverage of ${c.lemmas} kept lemmas, before → after the automatic channels`, '',
    '| label type | before | after | channel added |', '|---|---|---|---|',
    `| usage / register (rozm., dial., zast., arkh., …) | ${pc(usage.lemmas - usage.kaikkiOnly)} | ${pc(usage.lemmas)} | AC-1 en.wiktionary sense tags via KAIKKI_TAGS: ${usage.kaikki} lemmas (${usage.kaikkiOnly} with no other label) |`,
    `| dialect group | ${pc(c.diaBase)} | ${pc(c.diaAfter)} | AC-1 + AC-2 Грінченко regional abbreviations → gazetteer: ${auto.stats.dialectLemmas} lemmas (${auto.stats.r2uLabelled} labelled r2u articles of ${auto.stats.r2uRows}) |`,
    `| surzhyk / contact | ${pc(c.szBase)} | ${pc(c.szAfter)} | AC-3 ∉ ВЕСУМ ∧ pymorphy3-ru ∧ r2u equivalent: ${c.szAuto} lemmas (${auto.stats.ruHeads} Russian headwords read from r2u) |`, '',
    '"before" = the same build with the automatic channel switched off (VESUM tags + uk.wiktionary categories for usage; phonetic rules, DIALECT_BOOK/LEX quotes and witness regions for dialect; DETECT contact rules for surzhyk).', '',
    '## Agreement with the old hand list (core/dialect-lex.ts, fixture)', '',
    `- hand list: ${lexWords} words with their own verbatim ЕУМ / dictionary quotes; ${inKept} of them are kept lemmas.`,
    `- Грінченко region label → gazetteer group on those lemmas: ${grp} labelled, ${agree} agree, ${disagree} disagree${disagree ? ' (' + bad.slice(0, 5).join('; ') + ')' : ''}. Precision = ${grp ? ((100 * agree) / grp).toFixed(0) + ' %' : 'n/a (no overlap yet: the r2u dump is still being fetched)'}.`,
    `- en.wiktionary «dialectal» tag on hand-list words: ${lexKaikki} of ${lexWords} (${kk} among kept lemmas) — recall of the automatic territorial label on the hand list; the tag carries no dialect group, so agreement is on kind only.`,
    `- surzhyk: no hand list exists; the baseline is the rule-derived claim. AC-3 flags ${c.szAuto} lemmas, ${c.szAfter - c.szBase} of them new.`, '',
    "## Tables (AC-1, one per source; each row quotes the source's own list)", '',
    '| table | source | list of abbreviations | rows |', '|---|---|---|---|', tbl(HRINCH_ABBR), tbl(KAIKKI_TAGS), `| gazetteer (AC-2) | WUK | uk.wikipedia articles of each говір (research/04 §0) | ${GAZETTEER.length} |`, '',
    '## Limits', '',
    '- Only the Грінченко table is wired for r2u: the Ніковський / Желехівський / Уманець front matter on r2u.org.ua has no list of abbreviations to quote.',
    '- Грінченко county abbreviations («Бердич. у.», «Харьк. г.», …) name administrative units, not dialect areas; the gazetteer does not map them, so they yield no claim (unknown, not a guess).',
    '- uk.wiktionary categories and VESUM tags were already automatic (SPEC 60 UL-1); ЕУМ-quoted entries of core/dialect-lex.ts stay as cite-only evidence claims.',
  ]
  writeFileSync(resolve(root, 'analysis/auto-classification.md'), out.join('\n') + '\n')
}
