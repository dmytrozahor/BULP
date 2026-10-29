/** SPEC 63 PS «Постаті»: the persons builder on fixtures, the licence gate, the ambiguous-match rule, mentions (positives and negatives), routes, honest empties. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { buildPersons, cleanName, confidentMatch, findMentions, licenceOk, mentionIndex, shardOf, shardsOf, surnameOf, thumbUrl, SHARDS, type AuthorIn, type WdCand, type WitnessIn } from '../core/persons.ts'
import { personRows, sortRows } from '../src/lib/personsView.ts'
import { splitMentions } from '../src/lib/mentionSplit.ts'
import { makeRouter } from '../src/router.ts'
import { personTo } from '../src/lib/nav.ts'
import MentionText from '../src/components/MentionText.vue'

const A = (id: string, name: string, life = '—', extra: Partial<AuthorIn> = {}): AuthorIn => ({ id, name, life, label: 'ukrainian', status: 'vetted', ...extra })
const W = (id: string, author: string, y: number, n: number, extra: Partial<WitnessIn> = {}): WitnessIn => ({ id, title: id, author, date: [y, y], n, ...extra })
const authors = [
  A('hrinchenko', 'Борис Грінченко', '1863–1910', { region: 'Слобожанщина', evidence: [{ source: 'WS', quote: 'q', locator: 'l', kind: 'Q' }] }),
  A('hv_борис_грінченко', 'Борис Грінченко'),
  A('shevchenko', 'Тарас Шевченко', '1814–1861'),
  A('hv_шевченко_т', 'Шевченко Т.'),
  A('hv_петро_дорошенко', 'Петро Дорошенко', '1627–1698'),
  A('hv_дмитро_дорошенко', 'Дмитро Дорошенко', '1882–1951'),
  A('hv_день', 'Іван День'),
  A('anon1', 'Анонім: Пересторога', '—', { label: 'institutional' }),
  A('hv_vyd', 'Державне видавництво України'),
]
const wits = [
  W('chaichenko1893', 'hrinchenko', 1893, 31972, { edition: 'Львів 1893 (псевдонім Василь Чайченко)', region: 'Львів' }),
  W('grdict', 'hv_борис_грінченко', 1907, 500, { title: 'Словник української мови', witnessType: 'dictionary', ru: { kind: 'dictionary', why: 'x' } }),
  W('kobzar', 'shevchenko', 1840, 9000), W('kobzar2', 'hv_шевченко_т', 1860, 100),
  W('d1', 'hv_петро_дорошенко', 1670, 10), W('d2', 'hv_дмитро_дорошенко', 1930, 20), W('den', 'hv_день', 1900, 5),
  W('an', 'anon1', 1605, 40), W('vyd', 'hv_vyd', 1930, 3),
]

describe('PS-1 persons builder', () => {
  const { index, persons } = buildPersons(authors, wits, { generated: 't', linguists48: [['борис', 'грінченко']] })
  const by = (id: string) => persons.find(p => p.id === id)!
  it('PS-1 author records merge by the folded name; initials join the ONE full name they fit; Дорошенки stay two persons', () => {
    expect([...by('hrinchenko').authorIds].sort()).toEqual(['hrinchenko', 'hv_борис_грінченко'])
    expect([...by('shevchenko').authorIds].sort()).toEqual(['hv_шевченко_т', 'shevchenko'])
    expect(persons.filter(p => p.name.endsWith('Дорошенко'))).toHaveLength(2)
    expect(index.alias['hv_борис_грінченко']).toBe('hrinchenko')
  })
  it('PS-1 a pseudonym is recorded only where the metadata says it, with its cite; tokens and works are summed and dated', () => {
    expect(by('hrinchenko').aliases).toEqual([{ name: 'Василь Чайченко', cite: expect.stringContaining('псевдонім Василь Чайченко') }])
    expect(by('shevchenko').aliases).toEqual([])
    expect(by('hrinchenko').tokens).toBe(32472); expect(by('hrinchenko').works.map(w => w.y)).toEqual([1893, 1907])
    expect(by('hrinchenko').centuries).toEqual([19, 20])
  })
  it('PS-1 collective, anonymous and publisher authors are not persons; the RF flag follows the witness', () => {
    expect(by('anon1').kind).toBe('collective'); expect(by('hv_vyd').kind).toBe('collective')
    expect(by('hrinchenko').ru).toBe(true); expect(by('shevchenko').ru).toBe(false)
  })
  it('PS-1 linguist flag: research/48 names it, else a dictionary/grammar authored in the metadata, with the reason; otherwise none', () => {
    expect(by('hrinchenko').linguist?.basis).toBe('research48')
    const b = buildPersons(authors, wits, { generated: 't' }).persons.find(p => p.id === 'hrinchenko')!
    expect(b.linguist?.basis).toBe('metadata'); expect(b.roles).toContain('укладач словника')
    expect(by('shevchenko').linguist).toBeNull(); expect(by('shevchenko').roles).toEqual(['автор'])
  })
  it('PS-2 identity only from a cited vetting quote; no quote = null («не встановлено»); life years are parsed, not guessed', () => {
    expect(by('hrinchenko').identity?.evidence).toHaveLength(1); expect(by('shevchenko').identity).toBeNull()
    expect(by('hrinchenko').birth).toBe(1863); expect(by('hv_день').birth).toBeNull(); expect(by('hv_день').life).toBeNull()
  })
  it('PS-3 index rows are compact and sharded deterministically; every author id is reachable in its shard', () => {
    expect(index.rows).toHaveLength(persons.length); expect(index.shards).toBe(SHARDS)
    const sh = shardsOf(persons)
    for (const p of persons) for (const a of p.authorIds) expect(sh.get(shardOf(a))![a]!.id).toBe(p.id)
  })
  it('PS-3 name cleaning: «Surname, Given, years», trailing titles and parentheses', () => {
    expect(cleanName('Chaikovskyi, Andrii, 1857-1935')).toMatchObject({ name: 'Andrii Chaikovskyi', years: [1857, 1935] })
    expect(cleanName('Данило Корсунський (укладач ruthenian-редакції «Перегринації»)').name).toBe('Данило Корсунський')
  })
  it('PS-4 list filters and sort: epoch, role, region, identity (stated + не встановлено), language, name search', () => {
    const r = index.rows
    expect(personRows(r, { century: 19 }).map(x => x.id)).toContain('hrinchenko')
    expect(personRows(r, { role: 'лінгвіст' }).map(x => x.id)).toEqual(['hrinchenko'])
    expect(personRows(r, { identity: '—' }).map(x => x.id)).not.toContain('hrinchenko')
    expect(personRows(r, { q: 'шевч' }).map(x => x.id)).toEqual(['shevchenko'])
    expect(personRows(r, {}).some(x => x.kind === 'collective')).toBe(false); expect(personRows(r, { collective: true }).some(x => x.kind === 'collective')).toBe(true)
    expect(sortRows(r, 'n')[0]!.id).toBe('hrinchenko')
  })
})

describe('PS-6 portraits: the licence gate and the ambiguous-match rule', () => {
  it('PS-6 only free licences pass; non-free, unknown, NC/ND and empty are refused', () => {
    for (const ok of ['Public domain', 'CC BY-SA 4.0', 'CC BY 3.0', 'CC0', 'PD-old-70', 'Attribution']) expect(licenceOk(ok), ok).toBe(true)
    for (const no of ['', undefined, 'Fair use', 'Non-free media', 'CC BY-NC 4.0', 'CC BY-ND 2.0', 'All rights reserved', 'unknown', 'Copyrighted free use']) expect(licenceOk(no), String(no)).toBe(false)
  })
  const c = (qid: string, label: string, b: number | null, d: number | null, human = true): WdCand => ({ qid, labels: [label], b, d, human, image: 'x.jpg' })
  it('PS-6 one candidate with name and BOTH years equal is a match', () => {
    const m = confidentMatch({ name: 'Тарас Шевченко', b: 1814, d: 1861 }, [c('Q1', 'Тарас Григорович Шевченко', 1814, 1861), c('Q2', 'Тарас Шевченко', 1950, null)])
    expect(m.why).toBe('ok'); expect(m.hit?.qid).toBe('Q1')
  })
  it('PS-6 two candidates that fit are ambiguous: no image, no guess; a wrong year, a non-human, missing years never match', () => {
    expect(confidentMatch({ name: 'Іван Франко', b: 1856, d: 1916 }, [c('Q1', 'Іван Франко', 1856, 1916), c('Q2', 'Іван Франко', 1856, 1916)])).toEqual({ hit: null, why: 'ambiguous' })
    expect(confidentMatch({ name: 'Іван Франко', b: 1856, d: 1916 }, [c('Q1', 'Іван Франко', 1856, 1917)]).why).toBe('no-confident-match')
    expect(confidentMatch({ name: 'Іван Франко', b: 1856, d: 1916 }, [c('Q1', 'Іван Франко', 1856, 1916, false)]).why).toBe('no-confident-match')
    expect(confidentMatch({ name: 'Іван Франко', b: 1856, d: null }, [c('Q1', 'Іван Франко', 1856, null)]).why).toBe('no-years')
    expect(confidentMatch({ name: 'Франко', b: 1856, d: 1916 }, [c('Q1', 'Франко', 1856, 1916)]).why).toBe('no-confident-match')
  })
  it('PS-6 a non-free portrait in the seed is dropped by the builder; the thumbnail URL is on upload.wikimedia.org', () => {
    const p = { file: 'a b.jpg', h: 'a/ab', licence: 'Fair use', author: 'x', page: 'p', qid: 'Q1', checked: 'd' }
    expect(buildPersons(authors, wits, { generated: 't', portraits: { shevchenko: p } }).persons.find(x => x.id === 'shevchenko')!.portrait).toBeUndefined()
    expect(buildPersons(authors, wits, { generated: 't', portraits: { shevchenko: { ...p, licence: 'Public domain' } } }).persons.find(x => x.id === 'shevchenko')!.portrait?.file).toBe('a b.jpg')
    expect(thumbUrl('a b.jpg', 'a/ab', 250)).toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/a_b.jpg/250px-a_b.jpg')
    expect(thumbUrl('m.svg', 'a/ab')).toMatch(/\/240px-m\.svg\.png$/)
  })
})

describe('PS-8 mentions in texts', () => {
  const { persons } = buildPersons(authors, wits, { generated: 't' })
  const ix = mentionIndex(persons, f => f === 'день')
  const find = (text: string, y: number, extra = {}) => findMentions(text, { date: [y, y], ...extra }, ix).map(m => ({ f: text.slice(m.s, m.e), p: m.p }))
  it('PS-8 true positives: full name, inflected surname in a text within his time, initials + surname, a documented pseudonym', () => {
    expect(find('Як писав Тарас Шевченко у «Кобзарі»', 1900)).toEqual([{ f: 'Тарас Шевченко', p: 'shevchenko' }])
    expect(find('вірші Шевченка читали', 1900)).toEqual([{ f: 'Шевченка', p: 'shevchenko' }])
    expect(find('ст. Т. Шевченко та інші', 1950)).toEqual([{ f: 'Т. Шевченко', p: 'shevchenko' }])
    expect(find('збірка Василь Чайченко вийшла', 1893)).toEqual([{ f: 'Василь Чайченко', p: 'hrinchenko' }])
  })
  it('PS-8 negatives: before the birth, a shared surname, a lower-case common word, a bare first name, a person from the far past/future', () => {
    expect(find('Шевченка читали', 1790)).toEqual([])                                 // before 1814
    expect(find('Дорошенка обрали гетьманом', 1900)).toEqual([])                       // two persons with this surname
    expect(find('Дорошенко Дмитро писав', 1930)).toEqual([{ f: 'Дорошенко Дмитро', p: 'hv_дмитро_дорошенко' }])   // full name resolves it
    expect(find('Петро Дорошенко', 1500)).toEqual([])                                  // not yet born
    expect(find('цей день був, а День знов', 1900)).toEqual([])                        // a common word equals the surname «День»
    expect(find('Тарас сказав, Борис пішов', 1900)).toEqual([])                        // bare first names
    expect(find('Шевченка читали', 2100)).toEqual([])                                  // far outside his time, no context
    expect(find('шевченка читали', 1900)).toEqual([])                                  // lower case
  })
  it('PS-8 context rescue: a bare surname in the person’s own text is linked; the reason is recorded', () => {
    const m = findMentions('Шевченка', { date: [2100, 2100], author: 'shevchenko' }, ix); expect(m[0]?.why).toBe('автор цього тексту')
  })
  it('PS-8 surname detection is never a guess: given-name lists and suffixes decide, otherwise none', () => {
    expect(surnameOf(['тарас', 'шевченко'])).toBe('шевченко'); expect(surnameOf(['сімович', 'василь'])).toBe('сімович')
    expect(surnameOf(['олександр', 'олесь'])).toBeNull(); expect(surnameOf(['гнатюк', 'володимир', 'михайлович'])).toBe('гнатюк')
  })
  it('PS-8 the client only renders: a snippet is cut at the surface forms (whole words only) and the tooltip carries the reason', async () => {
    const ms = [{ f: 'Шевченка', p: 'shevchenko', why: 'автор цього тексту' }]
    expect(splitMentions('вірші Шевченка й Шевченкa', ms).map(x => x.t)).toEqual(['вірші ', 'Шевченка', ' й Шевченкa'])
    expect(splitMentions('без імен', ms)).toEqual([{ t: 'без імен' }]); expect(splitMentions('ПодШевченка', ms)).toEqual([{ t: 'ПодШевченка' }])
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
    const app = createSSRApp({ render: () => h(MentionText, { text: 'вірші Шевченка' }) }); app.use(router); await router.push('/'); await router.isReady()
    expect(await renderToString(app)).toContain('вірші Шевченка')                       // no witness: plain text, never a link
  })
})

describe('PS-5 routes, nav and honest empties', () => {
  it('PS-5 /persons and /person/:id are routes, in the nav group «Джерела та спільноти»; the person link builder encodes', () => {
    const r = makeRouter(true)
    expect(r.resolve('/persons').matched.at(-1)!.path).toBe('/persons'); expect(r.resolve(personTo('a b')).matched.at(-1)!.path).toBe('/person/:id')
    expect(readFileSync('src/lib/navMenu.ts', 'utf8')).toContain("to: '/persons', label: 'Постаті'")
  })
  it('PS-5 the views carry the honest empties and the licence line; data stays out of the first load', () => {
    const v = readFileSync('src/views/PersonView.vue', 'utf8'), l = readFileSync('src/views/PersonsView.vue', 'utf8')
    for (const t of ['портрета немає у вільному доступі (перевірено: Wikidata/Commons', 'не встановлено', 'немає даних (перевірено', 'Wikimedia Commons ↗', 'p.portrait.licence', 'LB-14']) expect(v, t).toContain(t)
    for (const t of ['persons-absent', 'persons-empty', 'не встановлено']) expect(l, t).toContain(t)
    expect(readFileSync('src/lib/personsData.ts', 'utf8')).toContain("fetchJson('./data/persons/index.json')")
    expect(readFileSync('src/router.ts', 'utf8')).toContain("() => import('./views/PersonView.vue')")
  })
  it('PS-5 the author badge, the witness card and the author card link to the person page', () => {
    expect(readFileSync('src/components/AuthorBadge.vue', 'utf8')).toContain('personTo(a.id)')
    expect(readFileSync('src/views/WitnessView.vue', 'utf8')).toContain('personTo(w.author)')
    expect(readFileSync('src/views/AuthorView.vue', 'utf8')).toContain('personTo(props.id)')
  })
})
