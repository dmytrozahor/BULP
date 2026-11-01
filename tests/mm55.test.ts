/**
 * MM-55 (owner: «Село якось не переключається нормально в поліських діалектах, мало би бути типу лес / ліес теж перетворення»).
 * CAUSE: (1) село itself has no site of the cited Polissian reflexes: ЕУМ um161 / um155 / um150 state the reflexes of ѣ and of the e that arose in a NEW CLOSED syllable (діед, піеч, л’ес — л’есок;
 * ліс < лѣсъ, сіл < сел), not of the e of an open syllable (*selo keeps е in every dialect), so the header «село» is unchanged by design (CHN only has the akanye of an unstressed о).
 * (2) the FORMS of the paradigm that DO have the site (gen. pl. сіл < села) were never respelled: Paradigm.vue passed neither the stress of the form nor the origin of its і to the respelling,
 * so every origin / stress rule was skipped for the whole table. Fixed: per-form stress (sidecar) and origin (the alternation inside the paradigm).
 */
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { respell } from '../core/respell.ts'
import { originsFor } from '../core/origin.ts'
import { ipaOf, setDialect, resetViews } from '../src/lib/views.ts'
import Paradigm from '../src/components/Paradigm.vue'

const PAR = ['село', 'села', 'селу', 'сіл', 'селам', 'селах', 'селом']
const org = (w: string, oldForms: string[] = []) => originsFor(w, { paradigm: PAR, oldForms }).origins
const LIS = originsFor('ліс', { paradigm: ['ліс', 'лісу', 'лісом'], oldForms: ['лѣс'] }).origins
const LISOK = originsFor('лісок', { paradigm: ['лісок', 'лісочок'], oldForms: ['лѣсокъ'] }).origins
const rs = (w: string, c: string, positions: number[], origins: unknown) => respell(w, c, { positions, origins: origins as never, pos: 'noun' })

describe('MM-55 село and ліс under the Polissian dialects', () => {
  it('ліс (ѣ, stressed): CHN and MPL іе (ЕУМ um150 / um155 / um161), WPL keeps і; лісок (ѣ, unstressed): CHN and MPL е (лесок)', () => {
    expect(rs('ліс', 'CHN', [1], LIS).text).toBe('ліес'); expect(rs('ліс', 'MPL', [1], LIS).text).toBe('ліес'); expect(rs('ліс', 'WPL', [1], LIS).text).toBe('ліс')
    expect(rs('лісок', 'CHN', [3], LISOK).text).toBe('лесок'); expect(rs('лісок', 'MPL', [3], LISOK).text).toBe('лесок')
  })
  it('село: the e of the open syllable is no site of the cited reflexes: unchanged in CHN, MPL, WPL (stress on the ending, and in the plural сéла)', () => {
    for (const c of ['CHN', 'MPL', 'WPL']) {
      expect(rs('село', c, [3], org('село')).text, c).toBe('село'); expect(rs('села', c, [1], org('села')).text, c).toBe('села'); expect(rs('селу', c, [3], org('селу')).text, c).toBe('селу')
    }
  })
  it('the form сіл (gen. pl., e in a new closed syllable): CHN and MPL сіел with the origin from the paradigm and the stress; WPL keeps і (plain WPL has no іе)', () => {
    const o = org('сіл')
    expect(o[1]).toMatchObject({ rule: 'R10', src: 'е' })
    expect(rs('сіл', 'CHN', [1], o).text).toBe('сіел'); expect(rs('сіл', 'MPL', [1], o).text).toBe('сіел'); expect(rs('сіл', 'WPL', [1], o).text).toBe('сіл')
    expect(rs('сіл', 'CHN', [], o).text).toBe('сіл')   // no stress, no rule (never guessed)
  })
  it('IPA and spelling agree: the dialect IPA of сіл has the diphthong exactly when the spelling does', () => {
    const o = org('сіл')
    expect(ipaOf('сіл', 'CHN', { positions: [1], origins: o }).ipa).toContain('i̯ɛ'); expect(ipaOf('сіл', 'WPL', { positions: [1], origins: o }).ipa).not.toContain('i̯ɛ')
    expect(ipaOf('село', 'CHN', { positions: [3], origins: org('село') }).ipa).toBe(ipaOf('село', '', { positions: [3] }).ipa)
    expect(ipaOf('ліс', 'CHN', { positions: [1], origins: LIS }).ipa).toContain('i̯ɛ')
  })
})

const render = async (props: Record<string, unknown>) => renderToString(createSSRApp({ render: () => h(Paradigm as never, props) }))
const txt = (s: string) => s.replace(/<[^>]+>/g, '')
describe('MM-55 Paradigm.vue: every form is respelled with ITS stress and ITS origin', () => {
  const par = PAR.map(form => ({ form, tags: 'noun:inanim:n:v_naz' }))
  const stressForms = [{ form: 'сіл', positions: [1], src: 'test' }, { form: 'село', positions: [3], src: 'test' }, { form: 'села', positions: [1], src: 'test' }]
  it('CHN: сіл → сіел in the table, село / села unchanged; standard without a dialect', async () => {
    setDialect('CHN')
    try { const t = txt(await render({ paradigm: par, stressForms })); expect(t).toContain('сіел'); expect(t).toContain('село'); expect(t).toContain('села') } finally { setDialect(''); resetViews() }
    expect(txt(await render({ paradigm: par, stressForms }))).not.toContain('сіел')
  })
})
