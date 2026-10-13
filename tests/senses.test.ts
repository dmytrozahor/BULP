// BL-9: uk.wiktionary senses (CC BY-SA): parser, stress per homonym, mapping onto heteronym readings, build output.
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { cleanGloss, parseSenses, senseRevision, sensesWithStress, stressOf } from '../core/senses.ts'
import { HETERONYMS } from '../core/heteronyms.ts'
import { groupByStress, sensesSummary } from '../src/lib/sensesData.ts'

const ROBYTY = `{{=uk=}}

=== Морфосинтаксичні ознаки ===
{{дієсл uk 4c|склади={{склади|ро|би́|ти}}|роб|ро́б|безособове=|відп=зробити|л=1}}

=== Семантичні властивості ===

==== Значення ====
# діяти, бути зайнятим чимось {{семантика|синоніми=|антоніми=|гіпероніми=|гіпоніми=}} {{приклад2|||джерело=}}
# виготовляти, створювати [[виріб|будь-які вироби]] {{семантика|
|синоніми=
}}
{{списки семантичних зв'язків}}

==== Холоніми ====
#
{{=ru=}}
==== Значення ====
# делать
`
// two homonyms: stress from the heading / склади, as on uk.wiktionary «город» (rev text shortened)
const GOROD = `{{=uk=}}
{{Омоніми|uk|2}}
== го́род ==
=== Морфосинтаксичні ознаки ===
{{імен uk 1a m inanim|склади=го́-род}}
==== Значення ====
# місце кожної команди в різних масових іграх
== горо́д ==
=== Морфосинтаксичні ознаки ===
{{імен uk 1a m inanim|склади={{склади|го|ро́д}}}}
==== Значення ====
# ділянка землі при садибі
# '''місто''' {{заст.}}
`

describe('BL-9 uk.wiktionary parser', () => {
  it('reads glosses of the Ukrainian section only; templates (also multi-line) and links are removed; POS from the template', () => {
    const s = parseSenses(ROBYTY, 542827, 'робити')
    expect(s.map(x => x.gloss)).toEqual(['діяти, бути зайнятим чимось', 'виготовляти, створювати будь-які вироби'])
    expect(s[0]).toMatchObject({ pos: 'дієслово', stress: 'роби́ти', source: 'uk.wiktionary r542827' })
    expect(senseRevision(s[0]!)).toBe('542827')
  })
  it('stress per homonym block, validated against the page title', () => {
    const s = parseSenses(GOROD, 570901, 'город')
    expect(s.map(x => [x.stress, x.gloss])).toEqual([['го́род', 'місце кожної команди в різних масових іграх'], ['горо́д', 'ділянка землі при садибі'], ['горо́д', 'місто']])
    expect(groupByStress(s).map(g => g.stress)).toEqual(['го́род', 'горо́д'])
    expect(stressOf('{{склади|ру|ка́}}', 'не-рука')).toBeUndefined()   // a stress that does not spell the title is never taken
    expect(stressOf('{{склади|ро|би}}', 'роби')).toBeUndefined()      // no stress mark → unknown, not guessed
  })
  it('caps senses per lemma and cleans markup', () => {
    const many = '{{=uk=}}\n==== Значення ====\n' + Array.from({ length: 30 }, (_, i) => `# значення ${i}`).join('\n')
    expect(parseSenses(many, 1, 'x').length).toBeLessThanOrEqual(8)
    expect(cleanGloss("[[a|b]] ''c'' {{t|x}} <ref>r</ref>;")).toBe('b c')
    expect(cleanGloss('слово '.repeat(60)).length).toBeLessThanOrEqual(165)
    expect(sensesSummary(parseSenses(GOROD, 1, 'город'))).toMatch(/· значень: 3$/)
  })
  it('maps heteronym readings to the sense of the same stress', () => {
    const h = HETERONYMS.find(x => x.form === 'город')!
    expect(h).toBeTruthy()
    const rows = parseSenses(GOROD, 1, 'город')
    const [a, b] = h.readings
    expect(sensesWithStress(rows, a!.stressed).map(s => s.gloss)).toEqual(['місце кожної команди в різних масових іграх'])   // го́род
    expect(sensesWithStress(rows, b!.stressed)).toHaveLength(2)                                                            // горо́д
  })
})

describe.skipIf(!existsSync('public/data/senses.json'))('BL-9 built senses.json', () => {
  type J = Record<string, { gloss: string; pos?: string; stress?: string; source: string }[]>
  const load = () => JSON.parse(readFileSync('public/data/senses.json', 'utf8')) as J
  it('every sense has a gloss and a revision source; size within the lazy-file budget', () => {
    const rows = Object.values(load()).flat()
    expect(rows.length).toBeGreaterThan(1000)
    expect(rows.every(s => s.gloss.length >= 2 && /^uk\.wiktionary r\d+$/.test(s.source))).toBe(true)
    expect(statSync('public/data/senses.json').size).toBeLessThan(5 * 1024 * 1024)
  })
  it('the heteronym город is mapped per reading where Wiktionary gives the stress', () => {
    const rows = load()['город']
    if (!rows) return
    const h = HETERONYMS.find(x => x.form === 'город')!
    expect(h.readings.some(r => sensesWithStress(rows as never, r.stressed).length > 0)).toBe(true)
  })
})
