/** SPEC 63 SL-1…SL-4 — sociolects, Plast vocabulary, loanwords. */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { SOURCES } from '../core/sources.ts'
import { DIALECT_UNKNOWN, SOC_UK, literaryStatus, parsePlastLines, plastOf, sociolectBadges, type SociolectFile } from '../core/sociolect.ts'
import { PROCESSES, SL1_WORDS, htmlLines } from '../pipelines/ingest-plast.ts'

const rd = (p: string) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const real = existsSync(new URL('../public/data/sociolect.json', import.meta.url)) ? JSON.parse(rd('public/data/sociolect.json')) as SociolectFile : undefined
const LINES = ['БРАТчик – бр. – виховник новацтва', 'ВАтра – церемоніальне вогнище, зазвичай ввечері. Одна з найважливіших частин таборів.',
  'ПтаШАТа (частіше УПП – улад пластових пташат) – вікова група приблизно 3-5 річних пластунів/-ок', 'Друг бунчужний стає готовий надати накази – Табір 2024',
  'ВПР: Відкриття пластового року', 'СКОБ/SKOB/CKO6: Сильно, Красно, Обережно, Бистро!', 'УПЮ.UPU: Улад пластунів юнаків']
const fx = (): SociolectFile => ({ format: 1, generated: 'x', plast: { source: 'PLSEA', url: 'u', retrieved: 'x', licence: 'cite-only', compiler: 'c', entries: parsePlastLines(LINES) }, processes: PROCESSES, literary: [{ w: 'ватра', vesum: 'ватра noun:inanim:f:v_naz' }, { w: 'екстремітет', vesum: null }] })

describe('SL-1 process research', () => {
  it('every listed word has a row in research/33; undocumented ones say unknown', () => {
    const r = rd('research/33-sociolects-plast.md')
    for (const w of SL1_WORDS) expect(r, w).toContain(w)
    expect(r).toMatch(/no source found \(unknown\)/)
  })
  it('every process row carries source, verbatim quote and locator, and its source is registered', () => {
    expect(PROCESSES.length).toBeGreaterThan(0)
    for (const p of PROCESSES) { expect(p.quote.length).toBeGreaterThan(10); expect(p.loc).toBeTruthy(); expect(SOURCES[p.source], p.source).toBeTruthy() }
  })
  it('an undocumented word gets no process badge (no evidence, no label)', () => { expect(sociolectBadges('аплікабіліті', fx())).toEqual([]) })
})

describe('SL-2 Plast ingest', () => {
  it('parses terms (dash split outside parentheses) and abbreviations, skips captions', () => {
    const e = parsePlastLines(LINES)
    expect(e.filter(x => x.k === 'term').map(x => x.w)).toEqual(['БРАТчик', 'ВАтра', 'ПтаШАТа'])
    expect(e.filter(x => x.k === 'abbr').map(x => x.w)).toEqual(['ВПР', 'СКОБ', 'УПЮ'])
    expect(e.find(x => x.w === 'БРАТчик')!.g).toBe('бр. – виховник новацтва')
    expect(e.find(x => x.w === 'ВАтра')!.g).toBe('церемоніальне вогнище, зазвичай ввечері.')
  })
  it('extracts the glossary part of the page between the compiler line and the contact block', () => {
    expect(htmlLines('<p>menu</p><p>Контакти</p><p>Впорядкував: Я. 2021</p><p>Рій – група</p><p>Контакти</p>')).toEqual(['Рій – група'])
  })
  it('public/data/sociolect.json is cite-only: ≤ 160-char glosses, locators, licence note, no page text', () => {
    if (!real) return
    expect(real.plast.entries.length).toBeGreaterThanOrEqual(60)
    for (const e of real.plast.entries) { expect(e.g.length).toBeLessThanOrEqual(160); expect(e.loc).toBeTruthy() }
    expect(real.plast.licence).toMatch(/цитати/)
    expect(JSON.stringify(real).length).toBeLessThan(60_000)
  })
})

describe('SL-3 dialect characterisation', () => {
  it('no dialect attribution is stored; the UI states «діалектна належність не встановлена»', () => {
    if (real) expect(JSON.stringify(real)).not.toMatch(/"dialect"/)
    expect(DIALECT_UNKNOWN).toBe('діалектна належність не встановлена')
    expect(rd('src/components/SociolectBadges.vue')).toContain('DIALECT_UNKNOWN')
    expect(rd('research/33-sociolects-plast.md')).toMatch(/Disallow: \//)
  })
})

describe('SL-4 literary status and badges', () => {
  it('Plast headwords get the «пластова лексика» badge, computed from the entry (stress/case-insensitive), evidence = the quote', () => {
    const f = fx(), b = sociolectBadges('ватра', f)
    expect(b.map(x => x.text)).toEqual(['пластова лексика'])
    expect(b[0]!.claim.evidence[0]!).toMatchObject({ source: 'PLSEA', kind: 'D' })
    expect(plastOf('Ватра', f)).toHaveLength(1)
  })
  it('abbreviation entries add «абревіатура»; process rows add the badge for their own word only', () => {
    const f = fx()
    expect(sociolectBadges('впр', f).map(x => x.text)).toEqual(['пластова лексика', 'абревіатура'])
    const ab = sociolectBadges('всмысле', f)
    expect(ab.map(x => x.text)).toEqual(['абревіатура']); expect(ab[0]!.claim.evidence[0]!.source).toBe('FBRU')
    expect(sociolectBadges('всм', f)).toEqual([])
  })
  it('VESUM presence/absence is reported; unchecked words give null', () => {
    const f = fx()
    expect(literaryStatus('ватра', f)).toMatchObject({ status: 'present' }); expect(literaryStatus('екстремітет', f)).toEqual({ status: 'absent' }); expect(literaryStatus('зебра', f)).toBeNull()
    if (real) for (const w of SL1_WORDS) expect(literaryStatus(w, real), w).toBeTruthy()
  })
  it('badges render on word and form pages through ClaimBadge (evidence popover → /source card); sources are registered', () => {
    for (const v of ['WordView', 'FormView']) expect(rd(`src/views/${v}.vue`)).toContain('<SociolectBadges')
    expect(rd('src/components/SociolectBadges.vue')).toContain('ClaimBadge')
    for (const id of ['PLSEA', 'FBRU']) expect(SOURCES[id]).toBeTruthy()
    expect(rd('src/views/SourceView.vue')).toContain('sociolectFile')
    expect(Object.values(SOC_UK).sort()).toEqual(['абревіатура', 'англіцизм', 'жаргон', 'пластова лексика'])
  })
})
