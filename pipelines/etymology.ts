/**
 * ET-2 harvest: Wiktionary etymologies from the kaikki.org Ukrainian JSONL and a cite-only sample of ЕСУМ from goroh.pp.ua.
 * `tsx pipelines/etymology.ts kaikki`      → data/work/etymology-kaikki.json  (reads data/raw/kaikki/uk.jsonl, pinned by sha256)
 * `tsx pipelines/etymology.ts goroh [N]`   → data/work/etymology-goroh.json   (the N most frequent common-noun/verb/adj lemmas of public/data/lexicon.json, ≥ 1.5 s apart, resumable)
 *
 * > "kaikki.org is deprecated and may disappear; … pin the 2026-10-03 file and record its SHA-256." — research/22 §3
 * > "ЕСУМ text is copyrighted print: do not bulk-harvest. Store only short quoted excerpts with citation and locator, and link to the mirror URL." — research/22 §3
 * Downloaded files are data only (P-4.5): parsed, never executed.
 */
import { createHash } from 'node:crypto'
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { EtymStep, KaikkiRec } from '../core/etymology.ts'
import { goroh, FORM_OF_ETYM } from '../core/etymology.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const KAIKKI_IN = resolve(ROOT, 'data/raw/kaikki/uk.jsonl'), KAIKKI_OUT = resolve(ROOT, 'data/work/etymology-kaikki.json'), GOROH_OUT = resolve(ROOT, 'data/work/etymology-goroh.json')

const CHAIN = new Set(['inh', 'der', 'bor', 'lbor', 'calque', 'cal', 'sl', 'slb', 'obor', 'uder', 'inh+', 'bor+', 'der+'])
const PREFIX = /^(Inherited from|Borrowed from|Derived from|Learned borrowing from|Calque of|Semantic loan from|Ultimately from)\s+/i
/** Wiktionary etymology templates → the chain of origins in Wiktionary's own wording (expansions), duplicates of the «+» forms removed. */
export function chainOf(templates: { name: string; expansion?: string }[] | undefined): EtymStep[] {
  const out: EtymStep[] = [], seen = new Set<string>()
  for (const t of templates ?? []) {
    if (!CHAIN.has(t.name) || !t.expansion) continue
    const text = t.expansion.replace(PREFIX, '').trim(), rel = t.name.replace('+', '')
    if (!text || seen.has(text)) continue
    seen.add(text); out.push({ rel, text })
  }
  return out.slice(0, 8)
}

export async function extractKaikki(file = KAIKKI_IN): Promise<{ file: string; sha256: string; extracted: string; words: Record<string, KaikkiRec> }> {
  const sha = createHash('sha256'), words: Record<string, KaikkiRec> = {}
  createReadStream(file).on('data', d => sha.update(d))
  const rl = createInterface({ input: createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line) continue
    const j = JSON.parse(line) as { word?: string; etymology_text?: string; etymology_templates?: { name: string; expansion?: string }[] }
    const t = (j.etymology_text ?? '').trim().replace(FORM_OF_ETYM, '').trim()   // MM-12: the form-of pointer is not an etymology
    if (!j.word || !t || /^from\s*\?+$/i.test(t)) continue
    const rec: KaikkiRec = { text: t, ...(chainOf(j.etymology_templates).length ? { chain: chainOf(j.etymology_templates) } : {}) }
    const old = words[j.word]
    if (!old || t.length > old.text.length) words[j.word] = rec   // several parts of speech: keep the fuller statement
  }
  return { file: 'kaikki.org-dictionary-Ukrainian.jsonl (enwiktionary dump 2026-09-02, extracted 2026-10-03)', sha256: sha.digest('hex'), extracted: '2026-10-03', words }
}

// ── goroh (ЕСУМ), cite-only ──────────────────────────────────────────────────────────────────────
const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
const unstress = (s: string) => s.normalize('NFC').replace(/[́]/g, '').toLowerCase()
/** The first ≤ 2 clauses (list items) of the ЕСУМ entry whose headword is the lemma; undefined when the page has no such entry. */
export function parseGoroh(html: string, lemma: string): string | undefined {
  const cards = html.split('class="card etymology-root"').slice(1)
  for (const c of cards) {
    const head = /<h2 class="card-header">\s*<span class="uppercase">([^<]+)<\/span>/.exec(c)
    if (!head || unstress(strip(head[1]!)) !== unstress(lemma)) continue
    const block = /<div class="list">([\s\S]*?)<div class="section collapsible">|<div class="list">([\s\S]*)$/.exec(c)
    const items = [...(block?.[1] ?? block?.[2] ?? '').matchAll(/<div class="list-item circle">([\s\S]*?)<\/div>/g)].map(m => strip(m[1]!)).filter(Boolean)
    if (!items.length) return undefined
    let q = items[0]!
    if (items[1] && (q + ' ' + items[1]).length <= 300) q += ' ' + items[1]
    return q.length > 300 ? q.slice(0, 299) + '…' : q
  }
  return undefined
}

async function fetchGoroh(n: number) {
  const { unpackCore } = await import('../core/pack.ts')
  const cards = unpackCore(JSON.parse(readFileSync(resolve(ROOT, 'public/data/lexicon.json'), 'utf8')))
  const todo = cards.filter(c => /^[а-яіїєґ']+$/.test(c.lemma) && !c.claims.proper).sort((a, b) => b.stats.f - a.stats.f).slice(0, n).map(c => c.lemma)
  const out: Record<string, string | null> = existsSync(GOROH_OUT) ? JSON.parse(readFileSync(GOROH_OUT, 'utf8')) : {}
  for (const lemma of todo) {
    if (lemma in out) continue
    const r = await fetch(goroh(lemma), { headers: { 'User-Agent': 'BULP-ukr-lexicon/0.1 (dmytrozah.dev@gmail.com) research' } })
    out[lemma] = r.ok ? parseGoroh(await r.text(), lemma) ?? null : null
    writeFileSync(GOROH_OUT, JSON.stringify(out))
    await new Promise(res => setTimeout(res, 1500))
  }
  console.log(`goroh: ${Object.values(out).filter(Boolean).length} quotes of ${Object.keys(out).length} fetched`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2]
  if (cmd === 'kaikki') {
    const r = await extractKaikki(); writeFileSync(KAIKKI_OUT, JSON.stringify(r))
    console.log(`kaikki: ${Object.keys(r.words).length} words with an etymology, sha256 ${r.sha256}`)
  } else if (cmd === 'goroh') await fetchGoroh(+(process.argv[3] ?? 200))
  else console.log('usage: tsx pipelines/etymology.ts kaikki | goroh [N]')
}
