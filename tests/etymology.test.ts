/** SPEC 60 ET-1…ET-3 (research/22): extracted vs hypotheses, attribution, ≤2-clause ЕСУМ quote, conflict flag, word-card panel. */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildEtymology, dictDating, etymConflict, goroh } from '../core/etymology.ts'
import { chainOf, parseGoroh } from '../pipelines/etymology.ts'

const rd = (p: string) => readFileSync(p, 'utf8')
const HATA = `<div class="card etymology-root" id="28876"><h2 class="card-header"><span class="uppercase">ха́та</span><span class="short-interpret">«будинок»</span></h2><p></p>
<div class="list"><div class="list-item circle">висловлювалася також думка, що слово <I>ха́та</I> ностратичне;</div>
<div class="list-item circle">з української мови слово поширилося в російську, польську та інші слов’янські;</div>
<div class="list-item circle">третя клауза, якої в цитаті бути не повинно;</div></div>
<div class="section collapsible"><div class="list"><div class="list-item circle">не з цього блоку</div></div></div></div>
<div class="card etymology-root" id="1"><h2 class="card-header"><span class="uppercase">я́тка</span></h2><div class="list"><div class="list-item circle">інша стаття;</div></div></div>`

describe('ET-1 data model', () => {
  it('ET-1 sources are verbatim Q evidence with CC BY-SA attribution; hypotheses stay a separate empty-by-default list', () => {
    const e = buildEtymology('місто', { text: 'Inherited from Middle Ukrainian мѣ́сто, from Proto-Slavic *mě̀sto.', chain: [{ rel: 'inh', text: 'Proto-Slavic *mě̀sto' }] }, undefined, [], [1100, 1200], '2026-10-03')!
    expect(e.sources).toHaveLength(1); expect(e.sources[0]).toMatchObject({ source: 'KAIKKI', kind: 'Q' })
    expect(e.sources[0]!.note).toContain('CC BY-SA 4.0'); expect(e.sources[0]!.locator).toContain('en.wiktionary.org')
    expect(e.hypotheses).toEqual([]); expect(e.conflict).toBeUndefined()
    expect(buildEtymology('x', undefined, undefined, [], undefined, '')).toBeUndefined()
    const h = buildEtymology('x', undefined, undefined, [{ author: 'проєкт', text: 'гіпотеза', status: 'proposed', evidence: [], date: '2026-10-12' }], undefined, '')!
    expect(h.text).toBe(''); expect(h.hypotheses[0]!.status).toBe('proposed'); expect(h.sources).toEqual([])
  })
  it('ET-1 chain comes from Wiktionary templates, «+» duplicates removed', () => {
    const c = chainOf([{ name: 'inh', expansion: 'Old East Slavic мѣ́сто (mě́sto)' }, { name: 'inh+', expansion: 'Inherited from Old East Slavic мѣ́сто (mě́sto)' }, { name: 'cog', expansion: 'Polish miasto' }, { name: 'inh', expansion: 'Proto-Slavic *mě̀sto' }])
    expect(c).toEqual([{ rel: 'inh', text: 'Old East Slavic мѣ́сто (mě́sto)' }, { rel: 'inh', text: 'Proto-Slavic *mě̀sto' }])
  })
})

describe('ET-2 sources', () => {
  it('ET-2 ЕСУМ via goroh: ≤ 2 clauses verbatim, ≤ 300 chars, locator is the goroh URL; other headwords are ignored', () => {
    const q = parseGoroh(HATA, 'хата')!
    expect(q).toContain('висловлювалася') ; expect(q).toContain('поширилося'); expect(q).not.toContain('третя'); expect(q).not.toContain('не з цього блоку')
    expect(q.length).toBeLessThanOrEqual(300)
    expect(parseGoroh(HATA, 'кінь')).toBeUndefined()
    const e = buildEtymology('хата', undefined, q, [], undefined, '')!
    expect(e.sources[0]).toMatchObject({ source: 'ESUM', kind: 'Q', locator: goroh('хата') }); expect(goroh('хата')).toContain('%D0%95')
  })
})

describe('ET-3 conflict flag', () => {
  it('ET-3 antedates: corpus earlier than the dictionary century; postdates only for explicit «attested»', () => {
    expect(dictDating('Borrowed from Polish in the 17th century.')).toMatchObject({ kind: 'borrowed', from: 1601, to: 1700 })
    expect(dictDating('First attested in 1627.')).toMatchObject({ kind: 'attested', from: 1627, to: 1627 })
    expect(dictDating('Inherited from Old East Slavic.')).toBeUndefined()
    expect(etymConflict(dictDating('Borrowed from Polish in the 17th century.'), [1117, 1200])?.conflict).toBe('corpus-antedates')
    expect(etymConflict(dictDating('Borrowed from Polish in the 17th century.'), [1672, 1702])).toBeUndefined()
    expect(etymConflict(dictDating('Borrowed from Polish in the 17th century.'), [1900, 1900])).toBeUndefined()   // «borrowed» gives only a lower bound
    expect(etymConflict(dictDating('first attested in the 12th century'), [1672, 1702])?.conflict).toBe('corpus-postdates')
    const e = buildEtymology('w', { text: 'Borrowed from Polish in the 17th century.' }, undefined, [], [1117, 1200], '')!
    expect(e.conflict).toBe('corpus-antedates'); expect(e.conflictNote).toContain('1117')
  })
})

describe('ET word-card panel', () => {
  it('ET panel is in WordView and loads etymology.json lazily', () => {
    expect(rd('src/views/WordView.vue')).toContain('<EtymologyBlock')
    expect(rd('src/lib/etymologyData.ts')).toContain('./data/etymology.json')
    const b = rd('src/components/EtymologyBlock.vue')
    expect(b).toContain('CC BY-SA'); expect(b).toContain('hypotheses')
  })
})
