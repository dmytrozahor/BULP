/** SPEC 63 GG-12 / GG-13 — synonyms, antonyms and phraseology from open sources only (uk.wiktionary dump + kaikki/en.wiktionary): parsers, build step, sidecars, cards. Fixtures only (the dumps are not in the repo). */
import { describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { renderToString } from 'vue/server-renderer'
import { createSSRApp, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { kaikkiPhrase, kaikkiRelRows, okTerm, parseUkPage, phraseLine, ukSection, wiktUrl } from '../core/synphr.ts'
import { phrBucket, synBucket, SYN_BUCKETS, PHR_BUCKETS } from '../core/parts.ts'
import { combine, writeSynPhr, xmlPages, type Stage } from '../pipelines/build-synphr.ts'
import SynAntBlock from '../src/components/SynAntBlock.vue'
import PhraseologyBlock from '../src/components/PhraseologyBlock.vue'

const MATI = `= {{-uk-}} =
{{Омоніми|uk|2}}
== мати I ==
===Морфосинтаксичні ознаки===
{{імен uk 8e^ f a|склади={{склади|ма́|ти}}|ма́тер}}
=== Семантичні властивості ===
====Значення====
# [[жінка]] [[щодо]] [[дитина|дитини]], яку вона [[народити|народила]]. {{приклад2|Текст|автор}}
# [[самиця]], стосовно своїх малят. {{приклад|}}
==== Синоніми ====
# [[матір]], {{урочист.}} [[неня]], [[ненька]]; (''під час пологів'') [[породілля]], ''рідк.'' [[порожденниця]]
# —
==== Антоніми ====
# [[батько]]
===Усталені та термінологічні словосполучення, фразеологізми ===
* [[альма матер]] — шанобливо про рідний навчальний заклад
* [[Божа Мати]] ([[Господня Мати]], [[Пречиста Мати]])
* [[вража мати]] - [[лайка]]
*
====Прислів'я та приказки ====
* [[Мати моя, мати, як мені тебе не згадувати]]
= {{-fr-}} =
==== Синоніми ====
# [[maman]]
`
const LEAD = `===Морфосинтаксичні ознаки===
{{імен uk 3a m una|склади=ру́х}}
{{морфо-uk|рух}}
==== Значення ====
# зміна положення
==== Синоніми ====
# [[порух]], [[ворушіння]]
# [[вулиця]] [[Ёж]] ёлка
==== Антоніми ====
# [[спокій]], [[нерухомість]]
{{=ba=}}
==== Синоніми ====
# [[хәрәкәт]]
`
const FOREIGN = `===Значення===
# [[мати]]
==== Синоніми ====
# [[maman]]
{{ds|4|fr}}
{{Категорія|мова=fr|Родинні зв’язки}}
`

describe('GG-12 uk.wiktionary: which part of a page is Ukrainian', () => {
  it('the explicit «= {{-uk-}} =» block ends at the next language heading; the «{{=uk=}}» marker and a leading part with Ukrainian markers also count; a foreign page and a foreign part do not', () => {
    expect(ukSection(MATI)).toContain('Синоніми'); expect(ukSection(MATI)).not.toContain('maman')
    expect(ukSection('{{=uk=}}\n==== Синоніми ====\n# [[a]]\n{{=ba=}}\n# [[b]]')).toContain('[[a]]')
    expect(ukSection(LEAD)).toContain('порух'); expect(ukSection(LEAD)).not.toContain('хәрәкәт')
    expect(ukSection(FOREIGN)).toBeUndefined()
    expect(parseUkPage('mère', FOREIGN)).toEqual({ syn: [], phr: [] })
  })
})

describe('GG-12 parseUkPage: relations with the sense they are attached to', () => {
  const p = parseUkPage('мати', MATI)
  it('each target keeps its relation, the item number of the list (= the sense number) and the gloss of that sense; stress, links and the examples template are cleaned', () => {
    const s = p.syn.filter(x => x.r === 's')
    expect(s.map(x => x.t)).toEqual(['матір', 'неня', 'ненька', 'породілля', 'порожденниця'])
    expect(s.every(x => x.n === 1 && x.d === 'u' && x.g === 'жінка щодо дитини, яку вона народила.')).toBe(true)
    expect(p.syn.find(x => x.r === 'a')).toMatchObject({ t: 'батько', n: 1 })
  })
  it('qualifiers are those the page prints (урочист., рідк., під час пологів); an empty item «—» gives nothing; the other-language section is not read', () => {
    expect(p.syn.find(x => x.t === 'неня')!.q).toEqual(['урочист.'])
    expect(p.syn.find(x => x.t === 'порожденниця')!.q).toEqual(['рідк.'])
    expect(p.syn.find(x => x.t === 'породілля')!.q).toEqual(['під час пологів'])
    expect(p.syn.some(x => x.t === 'maman')).toBe(false)
  })
  it('a leading-part page: items, antonyms, Russian-letter and non-Ukrainian junk targets are rejected; a target equal to the headword is dropped; nothing is mirrored onto the target', () => {
    const r = parseUkPage('рух', LEAD)
    expect(r.syn.map(x => `${x.r}:${x.t}`)).toEqual(['s:порух', 's:ворушіння', 'a:спокій', 'a:нерухомість'])
    expect(parseUkPage('вулиця', '{{=uk=}}\n==== Синоніми ====\n# [[вулиця]], [[шлях]]\n').syn.map(x => x.t)).toEqual(['шлях'])
    expect(okTerm('боксёр')).toBe(false); expect(okTerm('частина доби')).toBe(true); expect(okTerm('що й купи не держиться')).toBe(false); expect(okTerm('a b')).toBe(false)
  })
})

describe('GG-13 uk.wiktionary phraseology', () => {
  const p = parseUkPage('мати', MATI)
  it('«Усталені … фразеологізми» and «Прислів’я та приказки» rows: the unit, its variants, the gloss; the empty bullet is skipped; kinds stay apart', () => {
    expect(p.phr.filter(x => x.k === 'f').map(x => x.p)).toEqual(['альма матер', 'Божа Мати', 'вража мати'])
    expect(p.phr.find(x => x.p === 'Божа Мати')!.v).toEqual(['Господня Мати', 'Пречиста Мати'])
    expect(p.phr.find(x => x.p === 'альма матер')!.g).toBe('шанобливо про рідний навчальний заклад')
    expect(p.phr.find(x => x.k === 'p')!.p).toContain('Мати моя, мати')
    expect(p.phr.every(x => x.d === 'u')).toBe(true)
  })
  it('phraseLine handles variants and the « - » gloss separator, and refuses a line without Cyrillic', () => {
    expect(phraseLine('[[вража мати]] ([[лиха мати]]) - [[лайка]]')).toEqual({ p: 'вража мати', v: ['лиха мати'], g: 'лайка' })
    expect(phraseLine('[[foo bar]]')).toBeUndefined(); expect(phraseLine('')).toBeUndefined()
  })
})

describe('GG-12 / GG-13 kaikki (en.wiktionary) entries', () => {
  const e = {
    word: 'горі́лка', lang_code: 'uk', pos: 'noun',
    synonyms: [{ word: 'гори́чка', tags: ['Western'] }],
    senses: [{ glosses: ['vodka'], synonyms: [{ word: 'во́дка' }], antonyms: [{ word: 'вода' }], hypernyms: [{ word: 'напій' }] }, { glosses: ['x'], coordinate_terms: [{ word: 'горілка' }, { word: 'Latin' }] }],
  }
  it('entry-level and sense-level relations: the sense gloss goes with the row, tags are kept, a target equal to the headword or in Latin script is dropped', () => {
    const r = kaikkiRelRows(e)
    expect(r.map(x => `${x.r}:${x.t}:${x.g ?? ''}`)).toEqual(['s:горичка:', 's:водка:vodka', 'a:вода:vodka', 'h:напій:vodka'])
    expect(r[0]!.q).toEqual(['Western']); expect(r.every(x => x.d === 'e')).toBe(true)
  })
  it('only multi-word headwords of pos phrase / proverb / prep_phrase are phrasemes; they are filed under their content words too', () => {
    const p = kaikkiPhrase({ word: 'око за око, зуб за зуб', pos: 'phrase', senses: [{ glosses: ['an eye for an eye'] }] })!
    expect(p.row).toEqual({ p: 'око за око, зуб за зуб', k: 'w', d: 'e', g: 'an eye for an eye' }); expect(p.keys).toEqual(['око', 'зуб'])
    expect(kaikkiPhrase({ word: 'око', pos: 'noun' })).toBeUndefined(); expect(kaikkiPhrase({ word: 'лісовий кіт', pos: 'noun' })).toBeUndefined()
  })
})

describe('GG-12 / GG-13 the build step', () => {
  const page = (title: string, ns: number, text: string, redirect = false) => `  <page>
    <title>${title}</title>
    <ns>${ns}</ns>
${redirect ? '    <redirect title="мати" />\n' : ''}    <revision>
      <text bytes="1" xml:space="preserve">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>
    </revision>
  </page>
`
  const xml = `<mediawiki>
${page('мати', 0, MATI)}${page('Файл:x', 6, '{{=uk=}}\n==== Синоніми ====\n# [[a]]')}${page('перенаправлення', 0, '#REDIRECT [[мати]]', true)}${page('рух', 0, LEAD)}</mediawiki>
`
  it('xmlPages yields main-namespace non-redirect pages with entities decoded', async () => {
    const got: [string, string][] = []
    for await (const pg of xmlPages(Readable.from([xml]))) got.push(pg)
    expect(got.map(g => g[0])).toEqual(['мати', 'рух']); expect(got[0]![1]).toContain('==== Синоніми ====')
  })
  const stage = (syn: Stage['syn'], phr: Stage['phr'] = {}): Stage => ({ v: 1, src: 'ukwikt', bytes: 1, pages: 1, syn, phr })
  it('combine: a target is linked only when VESUM or a card knows it (multi-word targets are unlinked), the counts are measured, groups are connected components of the synonym relation', () => {
    const known = new Set(['неня', 'мама', 'матір'])
    const r = combine([stage({ мати: [{ t: 'неня', r: 's', d: 'u', n: 1 }, { t: 'мамця', r: 's', d: 'u', n: 1 }, { t: 'частина доби', r: 'h', d: 'u' }], матір: [{ t: 'мама', r: 's', d: 'e' }, { t: 'мати', r: 'a', d: 'e' }] })], k => known.has(k))
    expect(r.syn['мати']!.map(x => `${x.t}:${x.u ?? 0}`)).toEqual(['неня:0', 'мамця:1', 'частина доби:1'])
    expect(r.stats).toMatchObject({ synHeads: 2, synPairs: 5, synLinked: 2, synUnlinked: 3, groups: 2 }); expect(r.stats.synByRel).toEqual({ s: 3, h: 1, a: 1 })
  })
  it('writeSynPhr: dump + kaikki → syn.json / phr.json / stats; atomic writes, the stage cache is reused on a rerun, and a torn cache is rebuilt (RS-1)', async () => {
    const raw = mkdtempSync(join(tmpdir(), 'sp-'))
    mkdirSync(join(raw, 'data/raw/ukwikt-dump'), { recursive: true }); mkdirSync(join(raw, 'data/raw/kaikki'), { recursive: true })
    writeFileSync(join(raw, 'data/raw/ukwikt-dump/ukwiktionary-test-pages-articles.xml'), xml)
    writeFileSync(join(raw, 'data/raw/kaikki/uk.jsonl'), [JSON.stringify({ word: 'горі́лка', lang_code: 'uk', pos: 'noun', synonyms: [{ word: 'гори́чка' }], senses: [{ glosses: ['vodka'] }] }), JSON.stringify({ word: 'око за око', lang_code: 'uk', pos: 'proverb', senses: [{ glosses: ['x'] }] }), JSON.stringify({ word: 'word', lang_code: 'en', pos: 'noun', synonyms: [{ word: 'term' }] })].join('\n') + '\n')
    const st = await writeSynPhr(raw, raw, k => k === 'неня')
    const syn = JSON.parse(readFileSync(join(raw, 'data/work/syn.json'), 'utf8')), phr = JSON.parse(readFileSync(join(raw, 'data/work/phr.json'), 'utf8'))
    expect(syn['мати'].find((x: { t: string }) => x.t === 'неня')).toBeDefined(); expect(syn['мати'].find((x: { t: string }) => x.t === 'неня').u).toBeUndefined(); expect(syn['мати'].find((x: { t: string }) => x.t === 'ненька').u).toBe(1)
    expect(syn['горілка']).toEqual([{ t: 'горичка', r: 's', d: 'e', u: 1 }]); expect(syn['word']).toBeUndefined()
    expect(phr['мати'].some((x: { p: string }) => x.p === 'альма матер')).toBe(true); expect(phr['око'][0]).toMatchObject({ p: 'око за око', x: 1 })
    expect(st.inputs.ukwikt!.pages).toBe(2); expect(st.inputs.kaikki!.pages).toBe(2)
    const cache = join(raw, 'data/work/synphr-ukwikt.json'); const m1 = statSync(cache).mtimeMs; utimesSync(cache, new Date(1e12), new Date(1e12))
    await writeSynPhr(raw, raw, () => false); expect(statSync(cache).mtimeMs).toBe(1e12)   // reused, not rewritten
    writeFileSync(cache, '{"v":1,"src":"ukwikt","by'); await writeSynPhr(raw, raw, () => false)   // a killed writer's torn file
    expect(JSON.parse(readFileSync(cache, 'utf8')).pages).toBe(2); expect(m1).toBeGreaterThan(0)
    expect(readFileSync('pipelines/build-synphr.ts', 'utf8')).toContain('writeJsonAtomic')
  })
  it('the sidecars are sharded like the other lm/ sidecars (build-parts writes lm/syn and lm/phr from the work files) and the main build runs the step', () => {
    expect(SYN_BUCKETS).toBe(1024); expect(PHR_BUCKETS).toBe(512); expect(synBucket('мати')).toBe(synBucket('мати')); expect(synBucket('мати')).toBeLessThan(SYN_BUCKETS); expect(phrBucket('мати')).toBeLessThan(PHR_BUCKETS)
    const bp = readFileSync('pipelines/build-parts.ts', 'utf8'); expect(bp).toContain("'SYN_FILE'"); expect(bp).toContain("'PHR_FILE'"); expect(bp).toContain('`lm/${name}/${b}.json`')
    const b = readFileSync('pipelines/build.ts', 'utf8'); expect(b).toContain('writeSynPhr(ROOT, ROOT'); expect(b).toContain('GG-12/GG-13')
  })
})

describe('GG-12 / GG-13 the cards', () => {
  const html = async (c: object, props: Record<string, unknown>) => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
    const app = createSSRApp({ render: () => h(c, props as never) }); app.use(router)
    return renderToString(app)
  }
  it('Синоніми й антоніми: relations grouped by sense with edition badges, linked and unlinked targets, qualifiers, source pages and licence', async () => {
    const s = await html(SynAntBlock, { word: 'мати', kind: 'word', rows: [
      { t: 'матір', r: 's', d: 'u', n: 1, g: 'жінка щодо дитини' }, { t: 'неня', r: 's', d: 'u', n: 1, g: 'жінка щодо дитини', q: ['урочист.'], u: 1 },
      { t: 'батько', r: 'a', d: 'u', n: 1, g: 'жінка щодо дитини' }, { t: 'mother-ish', r: 'h', d: 'e', u: 1 }] })
    expect(s).toContain('Синоніми'); expect(s).toContain('Антоніми'); expect(s).toContain('Ширші поняття'); expect(s).toContain('(жінка щодо дитини)')
    expect(s).toContain('href="/w/%D0%BC%D0%B0%D1%82%D1%96%D1%80"'); expect(s).toContain('data-testid="synant-unlinked"'); expect(s).toContain('(урочист.)')
    expect(s).toContain(wiktUrl('u', 'мати')); expect(s).toContain(wiktUrl('e', 'мати')); expect(s).toContain('CC BY-SA 4.0'); expect(s).toContain('не виводимо')
  })
  it('no relations: the honest «немає даних (перевірено: …)» line names both editions and the fields read', async () => {
    const s = await html(SynAntBlock, { word: 'невідомеслово', rows: [] })
    expect(s).toContain('немає даних (перевірено:'); expect(s).toContain('uk.Вікісловник'); expect(s).toContain('kaikki.org'); expect(s).toContain('coordinate_terms')
    const p = await html(PhraseologyBlock, { word: 'невідомеслово', rows: [] })
    expect(p).toContain('немає даних (перевірено:'); expect(p).toContain('Прислів’я та приказки'); expect(p).toContain('prep_phrase')
  })
  it('Фразеологія: units grouped by kind, variants and gloss as given, edition badge, the licence, and the note that this is the Wiktionary list (not attested / candidate)', async () => {
    const rows = Array.from({ length: 14 }, (_, i) => ({ p: `вираз ${i}`, k: 'f' as const, d: 'u' as const }))
    const s = await html(PhraseologyBlock, { word: 'мати', kind: 'dict', rows: [...rows, { p: 'Божа Мати', k: 'f', d: 'u', v: ['Господня Мати'], g: 'про Богородицю' }, { p: 'Мати моя', k: 'p', d: 'u' }, { p: 'око за око', k: 'w', d: 'e', x: 1 }] })
    expect(s).toContain('Усталені словосполучення й фразеологізми'); expect(s).toContain('Прислів’я та приказки'); expect(s).toContain('Фрази en.Вікісловника, що містять це слово')
    expect(s).toContain('(Господня Мати)'); expect(s).toContain('— про Богородицю'); expect(s).toContain('ще 3'); expect(s).toContain('CC BY-SA 4.0'); expect(s).toContain('не є ні «засвідченими»')
  })
  it('lazy and on every card kind: the Огляд tab loads both components as async chunks (the first load of a card does not grow); no view imports them statically; the parity matrix lists both blocks', async () => {
    const ov = readFileSync('src/components/OverviewTab.vue', 'utf8')
    expect(ov).toMatch(/defineAsyncComponent\(\(\) => import\('\.\/SynAntBlock\.vue'\)\)/); expect(ov).toMatch(/defineAsyncComponent\(\(\) => import\('\.\/PhraseologyBlock\.vue'\)\)/)
    expect(ov).toContain('Синоніми й антоніми'); expect(ov).toContain('>Фразеологія<'); expect(ov).not.toMatch(/^import (SynAntBlock|PhraseologyBlock) from/m)
    const { MATRIX, KINDS } = await import('../src/lib/cardParity.ts')
    for (const k of Object.keys(KINDS) as (keyof typeof KINDS)[]) for (const b of ['synonyms', 'wiktPhraseology'] as const) expect(MATRIX[k][b], `${k} × ${b}`).toBe(k === 'phrase' ? 'na' : 'empty')
    expect(existsSync('analysis/card-parity.md') && readFileSync('analysis/card-parity.md', 'utf8')).toContain('`wiktPhraseology`')
  })
})

import { phrClaim, synClaim } from '../core/synphr.ts'
describe('GG-12 / GG-13 every row passes the evidence validator (source, locator and quote non-empty)', () => {
  it('synClaim / phrClaim build claims with the page URL as locator and the page statement as quote, for uk and en rows alike', () => {
    const p = parseUkPage('мати', MATI)
    for (const r of p.syn) { const c = synClaim('мати', r); expect(c.evidence[0]!.locator).toContain('wiktionary.org/wiki/'); expect(c.evidence[0]!.quote.trim()).not.toBe('') }
    for (const r of p.phr) expect(phrClaim('мати', r).evidence[0]!.quote).toContain(r.p)
    expect(synClaim('горілка', kaikkiRelRows({ word: 'горілка', lang_code: 'uk', synonyms: [{ word: 'горичка' }] } as never)[0]!).evidence[0]!.locator).toContain('en.wiktionary.org')
    expect(phrClaim('око', { p: 'око за око', k: 'w', d: 'e', x: 1 }).evidence[0]!.locator).toContain(encodeURIComponent('око за око'))
  })
})
