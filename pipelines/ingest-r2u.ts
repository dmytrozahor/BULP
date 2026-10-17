/**
 * r2u.org.ua ingester (research/30): a licensed dump of r2u result pages in data/raw/r2u (NO automated /s queries: robots.txt disallows them) → one `dictionary` witness per dictionary + data/work/r2u-rows.json.
 *
 *  - Ukrainian forms are the witness tokens: headwords of the Ukrainian-headword dictionaries (Грінченко, Ніковський, Голоскевич, Желехівський) and the Ukrainian
 *    equivalents of the Russian-headword ones (Уманець–Спілка, Кримський, Ізюмов, …). The raw spelling is kept (detached «ся» joined as «-ся»; stress marks removed from
 *    the token, kept in the locator's quote); the orthography fold (core/orthography.ts, era `желехівка` / `r2u`) and VESUM do the rest.
 *  - Rows with a Russian side (ru→uk equivalents, uk→ru glosses) go to data/work/r2u-rows.json for build-r2u.ts: the Russian-contact evidence (SPEC 63 / research/30 §5).
 *
 * Locator of a token = «r2u <dict short> · s?w=<lookup>#<dict>_<row>: <first 90 characters of the article>».
 */
import { existsSync, readFileSync, mkdirSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import type { Ingester } from './ingest.ts'
import type { TokenRec, WitnessOut } from '../core/types.ts'
import { witnessOf } from './ingest-torot.ts'
import { stripStress } from '../core/text.ts'
import { parseSearch, r2uDictById, type R2uRow } from './r2u.ts'
import { writeAtomic } from '../harvest/lib.ts'
export const R2U_DIR = 'data/raw/r2u'   // an OPEN, licensed dump of result pages goes here: pages/<file>.html.gz + index.jsonl (see research/30 §2)
export interface IndexLine { q: string; scope: string; file: string; at: string; status: number; bytes: number }
const readIndex = (): IndexLine[] => (existsSync(`${R2U_DIR}/index.jsonl`) ? readFileSync(`${R2U_DIR}/index.jsonl`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as IndexLine) : [])

export interface StoredRow extends R2uRow { q: string; scope: string }
export interface RowsFile { format: 1; lookups: number; /** lemmas looked up (scope ukr): a looked-up lemma that the dictionaries know is kept as a dictionary headword even at corpus f < 2 (build.ts) */ queried: string[]; rows: StoredRow[] }

/** Every distinct article (dict + row id) found by the cached lookups, in lookup order. */
/** `pagesSub`: sub-folder of the page files relative to `dir` (the open dump keeps them in «pages/», SPEC 63 AC reads it that way; the witness ingester keeps the default ''). */
export function storedRows(dir = R2U_DIR, pagesSub = ''): { rows: StoredRow[]; lookups: number; queried: string[] } {
  const seen = new Set<string>(), rows: StoredRow[] = []
  let lookups = 0; const queried = new Set<string>()
  const index = dir === R2U_DIR ? readIndex() : readFileSync(`${dir}/index.jsonl`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
  for (const l of index) {
    const path = `${dir}/${pagesSub}${l.file}`
    if (l.status !== 200 || !existsSync(path)) continue
    lookups++; if (l.scope === 'ukr') queried.add(l.q)
    for (const r of parseSearch(gunzipSync(readFileSync(path)).toString('utf8'))) {
      const k = `${r.dict}_${r.rowId}`
      if (!seen.has(k)) { seen.add(k); rows.push({ ...r, q: l.q, scope: l.scope }) }
    }
  }
  return { rows, lookups, queried: [...queried] }
}

/** Token spelling of a form: stress marks removed, apostrophes unified (the dictionaries use ’ and '), reflexive already «-ся»-joined by wordList. */
export const tokenRaw = (f: string) => stripStress(f).toLowerCase().replace(/[’ʼ]/g, "'")

export function r2uWitness(unit: Parameters<typeof witnessOf>[0], dictId: number, rows: StoredRow[]): WitnessOut {
  const d = r2uDictById[dictId]!, tokens: TokenRec[] = []
  let s = 0
  for (const r of rows.filter(r => r.dict === dictId)) {
    const forms = d.dir === 'ru-uk' ? r.eq : r.head
    if (!forms.length) continue
    const loc = `r2u ${d.short} · s?w=${r.q}#${r.dict}_${r.rowId}: ${r.text.slice(0, 90)}`
    for (const f of new Set(forms.map(tokenRaw))) tokens.push({ raw: f, loc, s })
    s++
  }
  return witnessOf(unit, tokens, { noFreq: true })
}

export default {
  parse: (u, _files) => {
    const d = Object.values(r2uDictById).find(x => x.unitId === u.id)!
    memo ??= storedRows(R2U_DIR, 'pages/')
    if (!wrote) {
      mkdirSync('data/work', { recursive: true })
      const out: RowsFile = { format: 1, lookups: memo.lookups, queried: memo.queried, rows: memo.rows }
      writeAtomic('data/work/r2u-rows.json', JSON.stringify(out)); wrote = true
    }
    const w = r2uWitness(u, d.id, memo.rows)
    return w.tokens.length ? [w] : []   // a dictionary none of whose articles was found yet is no witness
  },
} satisfies Ingester
let memo: ReturnType<typeof storedRows> | undefined, wrote = false
