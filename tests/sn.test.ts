/** SPEC 63 CV-6 (owner word list), SN-1 (attestation line → sense, dated), SN-2 (sense audit). Fixture-level; the real-data checks skip without built shards. */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { auditMarkdown, glossOf, missingUserWords, parseUserWords, priorityQueries, senseOfAtts } from '../core/sn.ts'
import { runAudit } from '../pipelines/sense-audit.ts'
import { userWords } from '../pipelines/build-cv.ts'
import { lk, cvBucket, type CvAtt, type CvEntry } from '../core/cv.ts'

const LIST = readFileSync('specs/user-words.txt', 'utf8')
const R = (s: string) => `r2u X · s?w=q#9_1: ${s}`
const dates: Record<string, [number, number]> = { r2u_umanets: [1893, 1898], r2u_nikovsky: [1927, 1927], r2u_hrinch27: [1927, 1928], r2u_hrinch09: [1907, 1909] }
const dirs: Record<string, 'ru-uk' | 'uk-ru'> = { r2u_umanets: 'ru-uk', r2u_nikovsky: 'uk-ru', r2u_hrinch27: 'uk-ru', r2u_hrinch09: 'uk-ru' }

describe('CV-6 owner word list', () => {
  it('CV-6 specs/user-words.txt parses the owner words with their lookups', () => {
    const w = parseUserWords(LIST)
    expect(w.map(x => x.word)).toEqual(["м'ясень", 'мишиця', "в'язь"])
    expect(w[2]!.lookups.map(l => l.q)).toEqual(["в'язь", 'мышца'])
    expect(parseUserWords('# c\nслово\t\tsrc\nx\tru:мышца,ukr:м\'ясо\t')[1]!.lookups).toEqual([{ q: 'мышца', scope: 'ru' }, { q: "м'ясо", scope: 'ukr' }])
  })
  it('CV-6 the priority queue looks every listed word up first (ukr), then the other lookups in both scopes, deduplicated', () => {
    const q = priorityQueries(parseUserWords(LIST))
    expect(q.slice(0, 3)).toEqual([["м'ясень", 'ukr'], ['мишиця', 'ukr'], ["в'язь", 'ukr']])
    expect(q).toContainEqual(['мускул', 'ru']); expect(q).toContainEqual(['мышца', 'ukr'])
    expect(new Set(q.map(x => x.join('\0'))).size).toBe(q.length)
  })
  it('CV-6 the build gets the listed words and a listed word without a card is reported', () => {
    expect(userWords('.')).toEqual(["м'ясень", 'мишиця', "в'язь"])
    expect(missingUserWords(parseUserWords(LIST), w => w !== 'мишиця')).toEqual(['мишиця'])
    expect(readFileSync('pipelines/build.ts', 'utf8')).toContain('userWords(ROOT)')
    expect(readFileSync('harvest/r2u.ts', 'utf8')).toContain('priorityQueries')
  })
  // real data: every listed word has a card (cv/ shard or lexicon)
  it.skipIf(!existsSync('public/data/cv/0.json'))('CV-6 built data: every listed word has a card', async () => {
    const ci = JSON.parse(readFileSync('public/data/cardindex.json', 'utf8')) as { lw: string[]; ld?: string[]; ar: string[][] }
    const keys = new Set([...ci.lw, ...(ci.ld ?? []), ...ci.ar.flat()].map(lk))
    const { unpackCore } = await import('../core/pack.ts')
    for (const c of unpackCore(JSON.parse(readFileSync('public/data/lexicon.json', 'utf8')))) keys.add(lk(c.lemma))
    expect(missingUserWords(parseUserWords(LIST), w => keys.has(lk(w)))).toEqual([])
  })
})

describe('SN-1 attestation lines link to dated senses', () => {
  it('SN-1 a ru→uk line documents the Russian headword as the sense; uk→ru lines document the Russian gloss', () => {
    expect(glossOf(R('Му́скулъ = мъя́сень, ми́шиця (С. Жел.)'), "м'ясень", 'ru-uk')).toBe('Мускулъ')
    expect(glossOf(R("В'язь, -ли – мышца"), "в'язь", 'uk-ru')).toBe('мышца')
    expect(glossOf(R("*В'язь, -ли, ж. Мышца. Сл. Нік."), "в'язь", 'uk-ru')).toBe('Мышца')
  })
  it('SN-1 lines of one sense are grouped, the earliest source is `first`, the others `later`, years shown as range', () => {
    const atts: CvAtt[] = [
      ['r2u_hrinch27', R("*В'язь, -ли, ж. Мышца. Сл. Нік."), "в'язь"],
      ['r2u_nikovsky', R("В'язь, -ли – мышца"), "в'язь"],
      ['r2u_umanets', R('Мышца = в\'язь'), "в'язь"],
      ['r2u_hrinch09', R("В'язь, -зи, ж. Шея."), "в'язь"],
    ]
    const r = senseOfAtts(atts, "в'язь", w => dates[w], w => dirs[w])
    expect(r.lineSense.slice(0, 3)).toEqual([0, 0, 0]); expect(r.lineSense[3]).toBe(1)
    expect(r.senses[0]!.first).toEqual({ w: 'r2u_umanets', from: 1893, to: 1898 })
    expect(r.senses[0]!.later.map(l => l.from)).toEqual([1927, 1927])
    expect(r.senses[1]!.first?.from).toBe(1907)
  })
  it('SN-1 every line gets a sense even when no gloss is readable; an undated witness leaves first null', () => {
    const r = senseOfAtts([['zzz', 'loc without article', 'слово']], 'слово', () => undefined)
    expect(r.lineSense).toEqual([0]); expect(r.senses[0]!.first).toBeNull()
  })
  it('SN-1 the card view shows the sense list and numbers each line', () => {
    expect(readFileSync('src/views/LightWordView.vue', 'utf8')).toMatch(/AttSenses/); expect(readFileSync('src/views/LightWordView.vue', 'utf8')).toContain('lineSense')
  })
})

describe('SN-2 sense audit', () => {
  const e = (w: string, atts: CvAtt[]): [string, CvEntry] => [lk(w), [w, '', atts.length, atts]]
  it('SN-2 counts Plast cards without a Plast sense, headwords without sense and undated senses; the markdown names them', () => {
    const res = runAudit({
      cv: [e('мускул', [['r2u_umanets', R('Мускул = м\'ясень'), 'мускул']]), e('нічийне', [['zzz', R('x'), 'нічийне']])],
      fullLemmas: ['вода'], cardKeys: new Set(['ватра']), plastWords: ['Ватра', 'Вода', 'Загублене'],
      dateOf: w => dates[w], dirOf: w => dirs[w],
    })
    expect(res.plastCards).toBe(3); expect(res.plastWithoutSense).toEqual(['Загублене'])
    expect(res.sensesWithoutDate).toEqual([{ word: 'нічийне', gloss: 'x' }])
    expect(res.headwordsWithoutSense).toEqual([])
    const md = auditMarkdown(res, '2026-10-17')
    expect(md).toContain('Загублене'); expect(md).toContain('without a Plast sense: 1')
  })
  it('SN-2 the audit is an npm script that writes analysis/sense-audit.md atomically', () => {
    expect(JSON.parse(readFileSync('package.json', 'utf8')).scripts['audit:senses']).toContain('sense-audit.ts')
    const s = readFileSync('pipelines/sense-audit.ts', 'utf8'); expect(s).toContain('renameSync'); expect(s).toContain('analysis/sense-audit.md')
  })
  it.skipIf(!existsSync('public/data/cv/0.json'))('SN-2 built data: every Plast headword has a card', async () => {
    const { runAudit: _r } = await import('../pipelines/sense-audit.ts'); expect(_r).toBeTypeOf('function')
    const ci = JSON.parse(readFileSync('public/data/cardindex.json', 'utf8')) as { lw: string[]; ld?: string[]; ar: string[][] }
    const keys = new Set([...ci.lw, ...(ci.ld ?? []), ...ci.ar.flat()].map(lk))
    const { unpackCore } = await import('../core/pack.ts')
    for (const c of unpackCore(JSON.parse(readFileSync('public/data/lexicon.json', 'utf8')))) keys.add(lk(c.lemma))
    const plast = (JSON.parse(readFileSync('public/data/sociolect.json', 'utf8')) as { plast: { entries: { w: string }[] } }).plast.entries
    expect(plast.filter(p => !keys.has(lk(p.w))).map(p => p.w).slice(0, 20)).toEqual([])
    void cvBucket
  })
})
