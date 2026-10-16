/** SPEC 63 CV-4: unlinked corpus spellings are searchable «неперевірена лема» cards (нѣгдѣ). */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { UV_SHARDS, UvScan, isCleanSpelling, uvOccurrences, uvPrefixFile, uvShard, type UvGroup, type UvPrefixShard } from '../core/uv.ts'
import { foldSpelling } from '../core/phrasemes.ts'
import { key } from '../core/text.ts'
import { loadUvGroup, uvOfSpelling, uvSearch, type UvFetch } from '../src/lib/uvData.ts'
import { makeRouter } from '../src/router.ts'
import { userHypothesesOf } from '../core/uv-hypotheses.ts'
import { deriveWithSteps } from '../src/lib/derive.ts'
import { buildCv } from '../pipelines/build-cv.ts'
import { cvBucket, lk, pickByContext } from '../core/cv.ts'

const rd = (p: string) => readFileSync(p, 'utf8')
const have = existsSync('public/data/uv/g/0.json') && existsSync('public/data/uv/p')
const real = have ? describe : describe.skip
const fold = (k: string) => foldSpelling(k)

describe('CV-4 grouping and filtering', () => {
  it('CV-4 spellings are grouped by the fold key; the headword is the most frequent spelling; all spellings, witnesses and occurrences are kept', () => {
    const s = new UvScan()
    s.add('нѣгдѣ', 'w1', 3, false); s.add('нѣгдѣ', 'w2', 8, false); s.add('негде', 'w3', 1, false); s.add('нѣгдѣ', 'w2', 9, false)
    const g = [...s.groups(fold)]
    expect(g).toHaveLength(1)
    const [gk, { g: grp }] = g[0]!
    expect(gk).toBe(fold(key('нѣгдѣ'))); expect(grp[0]).toBe('нѣгдѣ'); expect(grp[1]).toBe(4); expect(grp[2]).toBe(3)
    expect(grp[3]).toEqual([['нѣгдѣ', 3], ['негде', 1]]); expect(uvOccurrences(grp).map(o => o.w)).toEqual(['w1', 'w2', 'w3'])
  })
  it('CV-4 OCR garbage is excluded: digits, Latin and mixed script, repeated letters, and spellings seen only in OCR scans', () => {
    for (const bad of ['ab3д', 'слово1', 'кnига', 'word', 'ооо', 'ав']) expect(isCleanSpelling(bad), bad).toBe(false)
    for (const ok of ['нѣгдѣ', 'рушничний', "м'ясо", 'ѿ-тоую']) expect(isCleanSpelling(ok), ok).toBe(true)
    const s = new UvScan(); s.add('шумъ', 'ocr1', 0, true); s.add('гамъ', 'w', 0, true); s.add('гамъ', 'w2', 0, false)
    expect([...s.groups(fold).values()].map(x => x.g[0])).toEqual(['гамъ'])
  })
  it('CV-4 a spelling that already owns a card is skipped; an ORV card is attached by lemma or form key', () => {
    const s = new UvScan(); s.add('нѣгдѣ', 'w', 0, false); s.add('вода', 'w', 1, false)
    const m = s.groups(fold, k => k === 'вода', sks => (sks.includes('нѣгдѣ') ? 'нѣгдѣ' : ''))
    expect([...m.values()].map(x => x.g[0])).toEqual(['нѣгдѣ']); expect([...m.values()][0]!.g[4]).toBe('нѣгдѣ')
  })
  it('CV-4 shards: stable hash, prefix file = hex of the first two letters', () => {
    expect(uvShard('негде')).toBeLessThan(UV_SHARDS); expect(uvShard('негде')).toBe(uvShard('негде')); expect(uvPrefixFile('нѣгдѣ')).toBe('43d-463')
  })
})

describe('CV-4 search and card', () => {
  const g: UvGroup = ['нѣгдѣ', 4, 3, [['нѣгдѣ', 3], ['негде', 1]], '', 'w1', 3]
  const files: Record<string, unknown> = {
    [`p/${uvPrefixFile('нѣгдѣ')}`]: { 'нѣгдѣ': ['негде', 'нѣгдѣ'], 'нѣгдѣсь': ['негдесь', 'нѣгдѣсь'] } satisfies UvPrefixShard,
    [`g/${uvShard('негде')}`]: { 'негде': g },
  }
  const get: UvFetch = async p => files[p] ?? null
  it('CV-4 search finds a spelling case-insensitively by exact key or prefix (≥ 2 letters), exact first; a one-letter query finds nothing', async () => {
    const r = await uvSearch('НѢГДѢ', 30, get)
    expect(r.map(x => [x.group, x.exact])).toEqual([['негде', true], ['негдесь', false]]); expect(await uvSearch('н', 30, get)).toEqual([])
    expect((await uvSearch('нѣг', 30, get)).length).toBe(2)
  })
  it('CV-4 the card and the spelling→card link load through the same shards', async () => {
    expect(await loadUvGroup('негде', get)).toEqual(g); expect(await uvOfSpelling('Нѣгдѣ', get)).toEqual({ group: 'негде', head: 'нѣгдѣ' })
  })
  it('CV-4 /uv/:id is routed; search lists the unverified block AFTER the verified results, labelled «неперевірена»; the spelling page links the card', () => {
    expect(makeRouter(true).resolve('/uv/негде').matched.at(-1)!.path).toBe('/uv/:id')
    const v = rd('src/views/SearchView.vue'); expect(v.indexOf('data-testid="uv-hits"')).toBeGreaterThan(v.indexOf('Усі леми')); expect(v).toMatch(/неперевірена/)
    expect(rd('src/components/UnlinkedSpelling.vue')).toMatch(/\/uv\//)
    const c = rd('src/views/UnverifiedView.vue')
    for (const s of ['неперевірена лема', 'Написання в тексті', 'Вживання', 'ThinCard', 'Пам’ятки', 'реконструкція (гіпотеза)', 'Давньоруська лема']) expect(c, s).toContain(s)
  })
  it('CV-4 uv/ is shipped on the data branch (DIRS) and ignored by git like lex/ and cv/', () => {
    expect(rd('pipelines/data-branch.ts')).toMatch(/DIRS = \['lex', 'texts', 'cv', 'uv'\]/); expect(rd('.gitignore')).toMatch(/public\/data\/uv/)
  })
})

real('CV-4 the real data', () => {
  it('CV-4 нѣгдѣ has a card with its spellings, occurrences and a search hit', async () => {
    const get: UvFetch = async p => (existsSync(`public/data/uv/${p}.json`) ? JSON.parse(rd(`public/data/uv/${p}.json`)) : null)
    const hit = await uvOfSpelling('нѣгдѣ', get); expect(hit).toBeTruthy()
    const g = (await loadUvGroup(hit!.group, get))!; expect(g[3].some(s => key(s[0]) === key('нѣгдѣ'))).toBe(true); expect(g[1]).toBeGreaterThanOrEqual(3); expect(uvOccurrences(g).length).toBeGreaterThan(0)
    expect((await uvSearch('Нѣгдѣ', 30, get)).some(h => h.group === hit!.group)).toBe(true)
  })
  it('CV-4 no card has digits / Latin letters, and no spelling in a card also owns a verified card', () => {
    const idx = JSON.parse(rd('public/data/cardindex.json')) as { lw: string[] }, owned = new Set(idx.lw.map(w => key(w)))
    let n = 0
    for (let i = 0; i < UV_SHARDS; i++) for (const [gk, g] of Object.entries(JSON.parse(rd(`public/data/uv/g/${i}.json`)) as Record<string, UvGroup>)) {
      n++; for (const [raw] of g[3]) { expect(isCleanSpelling(raw), raw).toBe(true); expect(owned.has(key(raw)), raw).toBe(false) } if (n > 3000) return
      void gk
    }
  })
  it('CV-4 the card files stay small: every file ≤ 256 KiB', () => {
    for (let i = 0; i < UV_SHARDS; i++) expect(readFileSync(`public/data/uv/g/${i}.json`).length).toBeLessThan(256 * 1024)
  })
})

describe('CV-4 (a) нѣгдѣ → нігди is a user hypothesis, never an uncited rule', () => {
  it('CV-4 нѣгдѣ and негде get the user form «нігди» with author and date; other spellings get none', () => {
    for (const s of ['нѣгдѣ', 'Негде']) { const h = userHypothesesOf([s]); expect(h.map(x => x.form)).toEqual(['нігди']); expect(h[0]!.author).toBe('user'); expect(h[0]!.date).toBe('2026-10-16') }
    expect(userHypothesesOf(['вода'])).toEqual([])
  })
  it('CV-4 the rule engine does NOT produce нігди (no cited final -ѣ > -и rule); the hypothesis is labelled «гіпотеза користувача» on the card, the spelling page and the analyser', () => {
    expect(deriveWithSteps('нѣгдѣ').candidates.map(c => c.form)).not.toContain('нігди')
    expect(rd('src/components/UserHypotheses.vue')).toContain('гіпотеза користувача')
    for (const p of ['src/views/UnverifiedView.vue', 'src/components/UnlinkedSpelling.vue', 'src/views/AnalyzeView.vue']) expect(rd(p), p).toMatch(/<UserHypotheses/)
  })
})

describe('CV-5 thin cards render the full card components and every VESUM analysis', () => {
  const an: [string, string][] = [['риночок', 'noun:inanim:m:v_mis'], ['риночка', 'noun:inanim:f:v_zna']]
  it('CV-5 a preceding на / в / у / по / при picks the locative analysis only when exactly one analysis is a locative', () => {
    expect(pickByContext('на', an)).toBe('риночок'); expect(pickByContext('На', an)).toBe('риночок'); expect(pickByContext('при', an)).toBe('риночок')
    expect(pickByContext('і', an)).toBeUndefined(); expect(pickByContext(undefined, an)).toBeUndefined()
    expect(pickByContext('на', [['а', 'noun:v_mis'], ['б', 'noun:v_mis']])).toBeUndefined(); expect(pickByContext('на', [['риночок', 'noun:m:v_mis']])).toBeUndefined()
  })
  it('CV-5 риночку: both analyses get a card with all analyses listed, the context pick is stored, the example is kept', () => {
    const r = buildCv([], () => undefined, new Set(), () => false, undefined, { analyses: () => an, light: [{ lemma: 'риночка', tags: 'noun:inanim:f:v_naz', w: 'song_zazhuryla', loc: 'в. 1', raw: 'рыночку', form: 'риночку', prev: 'на' }] })
    const m = new Map(r.entries)
    expect(m.get('риночка')![4]).toMatchObject({ an, prev: 'на', pick: 'риночок' }); expect(m.get('риночок')![4]).toMatchObject({ an, pick: 'риночок' })
    expect(m.get('риночок')![3][0]![0]).toBe('song_zazhuryla')
  })
  it('CV-5 LightWordView lists all analyses and mounts ThinCard (KWIC, dialect, derivation, senses, etymology, cognates); UnverifiedView mounts it too', () => {
    const l = rd('src/views/LightWordView.vue'), t = rd('src/components/ThinCard.vue')
    expect(l).toContain('data-testid="vesum-analyses"'); expect(l).toMatch(/<ThinCard/); expect(rd('src/views/UnverifiedView.vue')).toMatch(/<ThinCard/)
    for (const c of ['<Kwic', '<DialectBlock', '<DerivationSteps', '<SensesBlock', '<EtymologyBlock', '<CognatesPanel', '<UsageChips']) expect(t, c).toContain(c)
  })
})

real('CV-5 the real data: риночку', () => {
  it('CV-5 /lw/риночка lists риночок (v_mis) and риночка (v_zna) as analyses of the attested spelling', () => {
    const k = (w: string) => JSON.parse(rd(`public/data/cv/${cvBucket(w)}.json`))[lk(w)]
    const a = k('риночка'), b = k('риночок')
    expect(a?.[4]?.an?.map((x: string[]) => x[0])).toEqual(expect.arrayContaining(['риночка', 'риночок'])); expect(b).toBeTruthy()
  })
})

