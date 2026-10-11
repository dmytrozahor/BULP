import { describe, expect, it } from 'vitest'
import { indexLines, lexLines, parseTwisters, tagStats } from '../pipelines/vesum.ts'
import { buildLt, ltSuggestions, parseLt } from '../pipelines/lt.ts'

const VESUM = `а conj:coord
аа intj:bad
Київ noun:inanim:m:v_naz:prop:geo
  Києва noun:inanim:m:v_rod:prop:geo
писати verb:imperf:inf    # rv_zna
  писать verb:imperf:inf:short
  пиши verb:imperf:impr:s:2
абізяна noun:anim:f:v_naz:slang
  абізяни noun:anim:f:v_rod:slang
співпадати verb:imperf:inf:bad
  співпадає verb:imperf:pres:s:3:bad
стародавній adj:m:v_naz:arch
  стародавнього adj:m:v_rod:arch
заавансованість noun:inanim:f:v_naz
  заавансованости noun:inanim:f:v_rod:alt
`.split('\n')

describe('vesum', () => {
  it('finds forms case-insensitively with verbatim tags, and full paradigms', async () => {
    const r = await indexLines(VESUM, new Set(['кИєВа', 'писать', 'нема']), new Set(['писати']))
    expect(r.hits.get('києва')).toEqual([{ lemma: 'Київ', tags: 'noun:inanim:m:v_rod:prop:geo' }])
    expect(r.hits.get('писать')?.[0]?.tags).toBe('verb:imperf:inf:short')
    expect(r.hits.has('нема')).toBe(false)
    expect(r.paradigms.get('писати')!.map(p => p.form)).toEqual(['писати', 'писать', 'пиши'])
    expect(r.lemmaTags.get('писати')).toBe('verb:imperf:inf')
  })
  it('lex index: headwords only for every flag tag (SPEC 20 B-5 size budget)', async () => {
    const lex = await lexLines(VESUM)
    expect(lex['аа']).toBeTruthy()
    expect(lex['співпадати']).toBeTruthy()
    expect(lex['співпадає']).toBeUndefined()          // bad: headword only
    expect(lex['стародавнього']).toBeUndefined()      // arch: headword only
    expect(lex['стародавній']).toBeTruthy()
    expect(lex['абізяна']).toBeTruthy()               // slang headword
    expect(lex['абізяни']).toBeUndefined()            // slang inflection: corpus-attested forms are added by build.ts
    expect(lex['писать']).toBeUndefined()
    expect(lex['заавансованости']).toBeUndefined()    // alt form: not a headword
    expect(lex['а']).toBeUndefined()
  })
  it('tag stats count lemma and form lines', async () => {
    const s = await tagStats(VESUM)
    expect(s.lem.bad).toBe(2); expect(s.frm.bad).toBe(1); expect(s.frm.slang).toBe(1); expect(s.lem.slang).toBe(1)
  })
  it('parses twisters #> replacements and keeps the raw line', () => {
    const t = parseTwisters('# коммент\nкляча /n10.p1.<>      #> шкапа|шкапина|патика\n# білячий /adj :x  #> що білить\nсліпий /adj\n')
    expect([...t.keys()]).toEqual(['кляча'])
    expect(t.get('кляча')!.repl).toEqual(['шкапа', 'шкапина', 'патика'])
    expect(t.get('кляча')!.raw[0]).toContain('/n10.p1.<>')
  })
})

describe('languagetool', () => {
  it('parses comments and splits on the first =', () => {
    const l = parseLt('# Format\n\nабсорбуючий=поглинальний|що абсорбує (всотує|поглинає; вбирає)\na=b=c\nbad line\n')
    expect(l).toEqual([{ wrong: 'абсорбуючий', suggest: 'поглинальний|що абсорбує (всотує|поглинає; вбирає)' }, { wrong: 'a', suggest: 'b=c' }])
  })
  it('keeps ctx: prefix verbatim but exposes it separately', () => {
    const s = 'ctx: релігія,поезія|великотрудний|(дуже) трудний'
    expect(ltSuggestions(s)).toEqual({ ctx: 'релігія,поезія', alts: ['великотрудний', '(дуже) трудний'] })
    expect(ltSuggestions('x|y')).toEqual({ alts: ['x', 'y'] })
  })
  it('builds a key()-normalised index; replace beats soft', () => {
    const lt = buildLt({ replace: 'Слідуючий=наступний\n', soft: 'слідуючий=інший\nАладдін=Аладін\n' })
    expect(lt['слідуючий']).toEqual(['replace', 'наступний'])
    expect(lt['аладдін']).toEqual(['soft', 'Аладін'])
  })
})
