/** SPEC 63 RG-1: the rights registry (core/rights.ts) is complete, enforced on the build output, and pinned. */
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { clip, clipTo, EVIDENCE_CAP, isFullText, maxChars, RIGHTS, SIZE_BUDGET, UNCERTAIN, type Rights } from '../core/rights.ts'
import { DICT_COVER } from '../core/se.ts'
import { SOURCES } from '../core/sources.ts'
import { claim } from '../core/evidence.ts'

const root = resolve(__dirname, '..')

/** every JSON file under `dir` (non-recursive into huge trees: shards live one level down) */
function jsonFiles(dir: string, depth = 2): string[] {
  const d = resolve(root, dir); if (!existsSync(d)) return []
  const out: string[] = []
  for (const n of readdirSync(d)) {
    const f = resolve(d, n), st = statSync(f)
    if (st.isDirectory() && depth > 0) out.push(...jsonFiles(dir + '/' + n, depth - 1))
    else if (n.endsWith('.json')) out.push(f)
  }
  return out
}
/** the id under which a stored object is licensed: a dictionary row `d`, or an evidence record `source` */
const idOf = (o: Record<string, unknown>): string | undefined => {
  const id = typeof o.d === 'string' ? o.d : typeof o.source === 'string' ? o.source : undefined
  if (id === 'ESUM' && typeof o.locator === 'string' && /goroh/.test(o.locator)) return 'ESUM-GOROH'
  return id
}
const TEXT_FIELDS = ['g', 'q', 'quote', 'gloss']
function walk(v: unknown, visit: (o: Record<string, unknown>, siblings: Record<string, unknown>[]) => void): void {
  if (Array.isArray(v)) {
    const objs = v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x))
    for (const o of objs) visit(o, objs)
    for (const x of v) walk(x, visit)
  } else if (v && typeof v === 'object') for (const x of Object.values(v as object)) walk(x, visit)
}
/** the build outputs that hold third-party text, when the build has produced them */
const outputs = (): string[] => [...jsonFiles('public/data/lm/se'), ...jsonFiles('public/data/lm/etym'), resolve(root, 'public/data/etymology.json'), ...jsonFiles('data/work/se-parsed', 0)].filter(f => existsSync(f))

describe('RG-1 rights registry', () => {
  it('every source of core/sources.ts and every dictionary of core/se.ts has a rights entry', () => {
    const missing = [...Object.keys(SOURCES), ...DICT_COVER.map(d => d.id)].filter(id => !RIGHTS[id])
    expect(missing).toEqual([])
  })

  it('every entry is well formed: quote has fields and a positive limit within the evidence backstop, links has a positive maxLinks, pd states why', () => {
    for (const [id, r] of Object.entries(RIGHTS) as [string, Rights][]) {
      if (r.license === 'quote') { expect(r.fields.length, id).toBeGreaterThan(0); expect(r.maxChars, id).toBeGreaterThan(0); expect(r.maxChars, id).toBeLessThanOrEqual(EVIDENCE_CAP) }
      else if (r.license === 'links') expect(r.maxLinks, id).toBeGreaterThan(0)
      else if (r.license === 'pd') expect(r.note.trim().length, id).toBeGreaterThan(10)
      else if (r.license === 'open') expect(r.terms.trim().length, id).toBeGreaterThan(0)
    }
  })

  it('a granted entry needs non-empty evidence, date and scope', () => {
    for (const [id, r] of Object.entries(RIGHTS)) if (r.license === 'granted') {
      expect(r.evidence.trim().length, id).toBeGreaterThan(0); expect(r.date, id).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(r.scope.trim().length, id).toBeGreaterThan(0)
      if (r.maxChars !== undefined) expect(r.maxChars, id).toBeGreaterThan(0)
    }
  })

  it('NO source is granted now (there is no written permission); changing this list is a deliberate edit', () => {
    const granted = Object.entries(RIGHTS).filter(([, r]) => r.license === 'granted').map(([id]) => id)
    expect(granted).toEqual([])   // when a permission arrives: add the entry in core/rights.ts, name it here, rebuild
    for (const id of ['sum11', 'sum20', 'esum', 'ESUM', 'arkushyn', 'chabanenko']) expect(isFullText(id)).toBe(false)
  })

  it('the pinned licence of the sources that matter: in-copyright dictionaries are quote, Караванський is links (5), the PD dictionaries are pd', () => {
    for (const id of ['sum11', 'sum20', 'sum16', 'timchenko-materials', 'shevchenko', 'arkushyn', 'chabanenko', 'onyshkevych', 'sabadosh', 'bukovyna', 'hutsul', 'lysenko', 'dsu14', 'ESUM', 'poltavshchyna']) expect(RIGHTS[id]!.license, id).toBe('quote')
    expect(RIGHTS.karavansky).toEqual({ license: 'links', maxLinks: 5 })
    for (const id of ['zhelekhivsky', 'timchenko', 'biletsky-nosenko', 'zakrevsky', 'verkhratsky', 'slavynetsky', 'kotliarevsky1798', 'pavlovsky1818']) expect(RIGHTS[id]!.license, id).toBe('pd')
  })

  it('the sources whose status is not established sit in `quote` and are listed (UNCERTAIN)', () => {
    expect(UNCERTAIN.length).toBeGreaterThan(0)
    for (const id of UNCERTAIN) expect(RIGHTS[id]!.license, id).toBe('quote')
  })

  it('maxChars / clip: the limits the parsers read are the ones they had; a grant would lift them', () => {
    for (const id of ['arkushyn', 'chabanenko', 'onyshkevych', 'sabadosh', 'bukovyna', 'hutsul', 'lysenko', 'sum11', 'sum20', 'sum16', 'shevchenko', 'ESUM', 'slavynetsky', 'timchenko', 'zhelekhivsky']) expect(maxChars(id), id).toBe(200)
    expect(maxChars('timchenko', 120)).toBe(120); expect(maxChars('sum16', 120)).toBe(120); expect(maxChars('wikt.uk', 160)).toBe(160); expect(maxChars('R2U', 300)).toBe(300); expect(maxChars('R2U')).toBe(200); expect(maxChars('r2u_hrinch09')).toBe(200); expect(maxChars('ESUM-GOROH')).toBe(200); expect(maxChars('ESUM-GOROH', 300)).toBe(300)
    expect(maxChars('karavansky')).toBe(0); expect(maxChars('unregistered-witness', 300)).toBe(300)
    const long = 'слово '.repeat(60)
    expect(clip('arkushyn', long)).toBe(clipTo(long, 200)); expect(clip('arkushyn', long).length).toBeLessThanOrEqual(200); expect(clip('arkushyn', long).endsWith('…')).toBe(true)
    expect(clip('arkushyn', 'коротко')).toBe('коротко'); expect(SIZE_BUDGET).toBe(200)
  })

  it('no hand-written copy of a limit survives: ESUM_MAX is derived, GLOSS_MAX and MAX_QUOTE are gone', () => {
    for (const f of readdirSync(resolve(root, 'core')).filter(n => n.endsWith('.ts') && n !== 'rights.ts')) {
      const t = readFileSync(resolve(root, 'core', f), 'utf8')
      expect(/\b(GLOSS_MAX|MAX_QUOTE)\b/.test(t), f).toBe(false)
      expect(/ESUM_MAX\s*=\s*\d/.test(t), f).toBe(false)
    }
  })

  it('evidence backstop: a quote is cut at EVIDENCE_CAP while the source is not granted', () => {
    const c = claim('x', { source: 'ESUM', quote: 'а'.repeat(500), locator: 'т. 1, с. 1', kind: 'Q' })
    expect(c.evidence[0]!.quote.length).toBe(EVIDENCE_CAP)
  })

  it('build output: no text stored for a `quote` source exceeds its limit; a `links` source stores no text and at most maxLinks per headword (when the build output is present)', () => {
    const files = outputs(); let checked = 0
    for (const f of files) {
      const j = JSON.parse(readFileSync(f, 'utf8')) as unknown
      walk(j, (o, sibs) => {
        const id = idOf(o); const r = id ? RIGHTS[id] : undefined; if (!id || !r) return
        if (r.license === 'quote') for (const k of TEXT_FIELDS) { const v = o[k]; if (typeof v === 'string') { checked++; expect(v.length, `${f} ${id}.${k}`).toBeLessThanOrEqual(maxChars(id, EVIDENCE_CAP)) } }
        if (r.license === 'links') {
          for (const k of TEXT_FIELDS) expect(o[k] === undefined || o[k] === '', `${f} ${id}.${k}`).toBe(true)
          expect(sibs.filter(x => idOf(x) === id).length, `${f} ${id} links per headword`).toBeLessThanOrEqual(r.maxLinks)
        }
      })
    }
    expect(checked >= 0).toBe(true)   // vacuous where the build output is absent (CI without data); on the worker it bites
  })

  it('the OCR directories (third-party scans) stay git-ignored', () => {
    const dirs = ['data/raw/se14-ocr', 'data/raw/se15-ocr', 'data/raw/se16-ocr', 'data/raw/se17-ocr', 'data/raw/nan-ocr', 'data/raw/sum-ocr', 'data/raw/ocr', 'data/raw/owner-ocr', 'data/raw/hist-lex-ocr', 'data/raw/ia-ocr', 'data/raw/arkushyn']
    const raw = resolve(root, 'data/raw'); if (existsSync(raw)) for (const n of readdirSync(raw)) if (/ocr/i.test(n) && !dirs.includes('data/raw/' + n)) dirs.push('data/raw/' + n)
    for (const d of dirs) {
      let ignored = true
      try { execFileSync('git', ['check-ignore', '-q', d + '/probe.txt'], { cwd: root, stdio: 'ignore' }) } catch { ignored = false }
      expect(ignored, d).toBe(true)
    }
  })
})
