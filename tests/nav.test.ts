import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { makeRouter, routes } from '../src/router.ts'
import { ELEMENT_ROUTES, authorTo, dialectTo, epochTo, evidenceTo, formTo, isOldForm, ruleTo, sourceTo, textTo, witnessTo, wordTo, type ElementKind } from '../src/lib/nav.ts'
import { collectQuotes, type HeldQuote } from '../src/lib/sourceQuotes.ts'
import { findLoc } from '../src/lib/witnessText.ts'
import { EPOCHS } from '../core/epochs.ts'
import { RULES } from '../core/phonology.ts'
import { CS_RULES, CONTACT_RULES, DIALECT_RULES, DIALECTS, REGISTER_RULES, RUSYN_RULES } from '../core/rules.ts'
import { SOURCES } from '../core/sources.ts'

const KINDS = Object.keys(ELEMENT_ROUTES) as ElementKind[]

describe('BL-16 router walk: no element type is a dead end', () => {
  it('every element kind resolves to a real (non catch-all) route', () => {
    const r = makeRouter(true)
    for (const k of KINDS) {
      const m = r.resolve(ELEMENT_ROUTES[k])
      expect(m.matched.length, k).toBeGreaterThan(0)
      expect(m.matched.at(-1)!.name, k).not.toBe('catch-all')
    }
    expect(KINDS.length).toBe(12)
  })
  it('link builders encode ids and land on the right views', () => {
    const r = makeRouter(true), to = (p: string) => r.resolve(p).matched.at(-1)!.path
    expect(to(wordTo('вода'))).toBe('/w/:lemma'); expect(to(formTo('ѣ/x', 'l'))).toBe('/f/:form'); expect(to(witnessTo('sophia-12'))).toBe('/witness/:id')
    expect(to(authorTo('a b'))).toBe('/author/:id'); expect(to(sourceTo('SHEV'))).toBe('/source/:id'); expect(to(textTo('arch', 'Ін 1:5'))).toBe('/texts')
    expect(r.resolve(textTo('arch', 'Ін 1:5')).query).toEqual({ w: 'arch', loc: 'Ін 1:5' })
    expect(to(epochTo('shev.old'))).toBe('/method'); expect(r.resolve(epochTo('shev.old')).hash).toBe('#epoch-shev.old')
  })
  it('every /method anchor the builders can point at exists in the data the page renders', () => {
    const ids = new Set([...RULES, ...CS_RULES, ...CONTACT_RULES, ...DIALECT_RULES, ...RUSYN_RULES, ...REGISTER_RULES].map(r => r.id))
    expect(EPOCHS.length).toBeGreaterThan(5); expect(ids.size).toBeGreaterThan(20); expect(Object.keys(DIALECTS).length).toBeGreaterThan(5)
    const mv = readFileSync('src/views/MethodView.vue', 'utf8')
    for (const a of ['`epoch-${e.id}`', '`rule-${r.id}`', '`dialect-${code}`']) expect(mv).toContain(a)
    expect(ruleTo([...ids][0]!)).toMatch(/^\/method#rule-/); expect(dialectTo(Object.keys(DIALECTS)[0]!)).toMatch(/^\/method#dialect-/)
  })
  it('evidence «джерело» is internal: registry source -> /source/:id, witness -> its text at the locator', () => {
    expect(evidenceTo('SHEV', 'с. 1')).toBe('/source/SHEV'); expect(evidenceTo('arch', 'Ін 1:5', true)).toBe(textTo('arch', 'Ін 1:5'))
    for (const id of Object.keys(SOURCES)) expect(makeRouter(true).resolve(sourceTo(id)).matched.at(-1)!.path).toBe('/source/:id')
  })
  it('the route table has the witness/author/source cards', () => {
    const paths = routes.map(r => r.path); for (const p of ['/witness/:id', '/author/:id', '/source/:id', '/w/:lemma', '/f/:form', '/texts']) expect(paths).toContain(p)
  })
  it('every external anchor in a view/component is secondary: its text contains ↗', () => {
    const dirs = ['src/views', 'src/components'], bad: string[] = []
    for (const d of dirs) for (const f of readdirSync(d).filter(x => x.endsWith('.vue'))) {
      const s = readFileSync(`${d}/${f}`, 'utf8')
      for (const m of s.matchAll(/<a\b[^>]*target="_blank"[^>]*>([\s\S]*?)<\/a>/g)) if (!m[1]!.includes('↗') && !/Wikidata|OpenStreetMap|wikidata|qid/i.test(m[0] + m[1])) bad.push(`${f}: ${m[0].slice(0, 90)}`)
    }
    expect(bad).toEqual([])
  })
})

describe('BL-16 in-site sources', () => {
  const ev = (source: string, locator: string, quote: string) => ({ kind: 'Q' as const, source, locator, quote })
  it('collectQuotes gathers verbatim quotes of one source with the places citing them (deduped, capped)', () => {
    const shared = ev('SHEV', 'с. 5', 'ę > a'), into = new Map<string, HeldQuote>()
    collectQuotes({ lemma: 'a', x: [shared, ev('VESUM', 'v', 'q')] }, 'SHEV', { label: 'a', to: '/w/a' }, into)
    collectQuotes({ lemma: 'b', y: { z: shared } }, 'SHEV', { label: 'b', to: '/w/b' }, into)
    collectQuotes({ lemma: 'b', y: { z: shared } }, 'SHEV', { label: 'b', to: '/w/b' }, into)
    expect(into.size).toBe(1); const h = [...into.values()][0]!; expect(h.nPlaces).toBe(2); expect(h.places.map(p => p.label)).toEqual(['a', 'b'])
    const capped = new Map<string, HeldQuote>(); collectQuotes([ev('SHEV', '1', 'a'), ev('SHEV', '2', 'b')], 'SHEV', { label: 'x', to: '/x' }, capped, { maxQuotes: 1 }); expect(capped.size).toBe(1)
  })
  it('findLoc: exact locator, then prefix; -1 when absent', () => {
    const t: [string, string, string][] = [['а', 'стб. 1', ' '], ['б', 'стб. 2 р. 3', ' ']]
    expect(findLoc(t, 'стб. 1')).toBe(0); expect(findLoc(t, 'стб. 2')).toBe(1); expect(findLoc(t, 'стб. 9')).toBe(-1)
  })
})

describe('BL-17c old-letter face', () => {
  it('isOldForm: old letters / titlo / pre-1800 attestation', () => {
    for (const f of ['вѣра', 'ѧзыкъ', 'бꙋдеть', 'члв҃къ', 'сынъ']) expect(isOldForm(f), f).toBe(true)
    expect(isOldForm('вода')).toBe(false); expect(isOldForm('вода', 1798)).toBe(true); expect(isOldForm('вода', 1800)).toBe(false)
  })
})
