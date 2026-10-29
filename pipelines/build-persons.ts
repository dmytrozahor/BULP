/**
 * SPEC 63 PS: writes the persons sidecar public/data/persons/ (index.json + s<N>.json shards of full records + mentions/m<N>.json) from the built corpus.json.
 * Crash-tolerant (RS-1): the whole directory is written to persons.next and swapped in (swapDir); every file is written atomically; re-running is idempotent.
 * Inputs: public/data/corpus.json (authors + witnesses), research/48-*.md when it exists (names of Ukrainian linguists), data/seed/persons-portraits.json (checked Commons portraits,
 * written by pipelines/persons-portraits.ts), data/work/*.json (witness texts, for the mentions; WORK env overrides; absent = no mentions, reported).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { buildPersons, findMentions, mentionIndex, nameTokens, shardOf, shardsOf, SHARDS, type AuthorIn, type Mention, type Person, type WitnessIn } from '../core/persons.ts'
import { key } from '../core/text.ts'
import { readJson, swapDir, writeJsonAtomic } from './robust.ts'

const PUB = resolve('public/data'), OUT = join(PUB, 'persons')
export function linguists48(root = resolve('research')): string[][] {
  if (!existsSync(root)) return []
  const f = readdirSync(root).find(n => /^48-.*\.md$/.test(n)); if (!f) return []
  const out: string[][] = []
  for (const line of readFileSync(join(root, f), 'utf8').split(/\r?\n/)) {
    if (!/^\s*(\||[-*]\s|#{2,4}\s)/.test(line)) continue
    const cells = line.startsWith('|') ? line.split('|').slice(1, 2) : [line.replace(/^\s*([-*]\s|#+\s)/, '')]
    const t = nameTokens(cells[0]!.replace(/[*_`]/g, '').replace(/\(.*?\)/g, '')).full
    if (t.length >= 2 && t.length <= 4) out.push(t)
  }
  return out
}

function main() {
  const corpus = readJson<{ generated: string; authors: AuthorIn[]; witnesses: WitnessIn[] }>(join(PUB, 'corpus.json'))
  const seedP = resolve('data/seed/persons-portraits.json')
  const portraits = existsSync(seedP) ? readJson<Record<string, never>>(seedP) : {}
  const { index, persons } = buildPersons(corpus.authors, corpus.witnesses, { generated: corpus.generated, linguists48: linguists48(), portraits })
  const next = `${OUT}.next`; rmSync(next, { recursive: true, force: true }); mkdirSync(join(next, 'mentions'), { recursive: true })
  writeJsonAtomic(join(next, 'index.json'), JSON.stringify(index))
  for (const [i, m] of shardsOf(persons)) writeJsonAtomic(join(next, `s${i}.json`), JSON.stringify(m))
  const nm = writeMentions(next, persons, corpus.witnesses)
  swapDir(next, OUT)
  console.log(`persons: ${persons.filter(p => p.kind === 'person').length} persons + ${persons.filter(p => p.kind === 'collective').length} collective/anonymous authors from ${corpus.witnesses.length} witnesses; linguists ${persons.filter(p => p.linguist).length}; portraits ${persons.filter(p => p.portrait).length}; mentions ${nm}`)
}

function writeMentions(dir: string, persons: Person[], ws: WitnessIn[]): number {
  const work = resolve(process.env.WORK ?? 'data/work')
  if (!existsSync(work)) { for (let i = 0; i < SHARDS; i++) writeJsonAtomic(join(dir, 'mentions', `m${i}.json`), '{}'); console.log('mentions: no data/work, sidecar empty'); return 0 }
  const authorOf = new Map(ws.map(w => [w.id, w])), files = readdirSync(work).filter(f => f.endsWith('.json') && authorOf.has(f.slice(0, -5)))
  const texts = new Map<string, { raw: string; loc: string }[]>()
  const lower = new Set<string>()      // folded forms that occur with a lower-case initial somewhere: common words, never linked on a bare surname
  for (const f of files) {
    let j: { tokens?: { raw: string; loc: string }[] }; try { j = JSON.parse(readFileSync(join(work, f), 'utf8')) } catch { continue }
    const toks = (j.tokens ?? []).map(t => ({ raw: t.raw, loc: t.loc })); texts.set(f.slice(0, -5), toks)
    for (const t of toks) if (/^\p{Ll}/u.test(t.raw)) lower.add(key(t.raw).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʹʼ’'`ˈ]/g, ''))
  }
  const ix = mentionIndex(persons, f => lower.has(f))
  const per = Array.from({ length: SHARDS }, () => ({} as Record<string, unknown[]>)); let n = 0
  for (const [id, toks] of texts) {
    const w = authorOf.get(id)!; let text = '', starts: number[] = []
    for (const t of toks) { starts.push(text.length); text += t.raw + ' ' }
    const ms = findMentions(text, { date: w.date, region: w.region, author: w.author, text }, ix)
    if (!ms.length) continue
    const tokAt = (off: number) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; starts[m]! <= off ? lo = m : hi = m - 1 } return lo }
    per[shardOf(id) % SHARDS]![id] = ms.map((m: Mention) => { const t = tokAt(m.s); return { t, n: tokAt(m.e - 1) - t + 1, loc: toks[t]!.loc, f: text.slice(m.s, m.e), p: m.p, why: m.why } })
    n += ms.length
  }
  per.forEach((o, i) => writeJsonAtomic(join(dir, 'mentions', `m${i}.json`), JSON.stringify(o)))
  return n
}
if (process.argv[1] && /build-persons.ts$/.test(process.argv[1].split(String.fromCharCode(92)).join("/"))) main()
