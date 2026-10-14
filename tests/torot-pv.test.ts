import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseProiel } from '../pipelines/ingest-torot.ts'
import { derive } from '../core/phonology.ts'
import { expandTitlo } from '../core/text.ts'
import { TorotScan, bucketOf } from '../core/torot.ts'
import { lightIndex, scanTorot, torotReport } from '../pipelines/build-torot.ts'
import { textShard } from '../pipelines/build-texts.ts'
import { rowRef, type Row } from '../src/lib/witnessText.ts'
import { oesVariants, oesFoldById, oesPast } from '../core/oes-folds.ts'
import { makeRouter } from '../src/router.ts'

const XML = `<sentence id="9001"><token id="1" form="киевѣ" citation-part="0.3" lemma="кыевъ" part-of-speech="Ne" morphology="-s---ml--i"/><token id="2" form="ѿ" citation-part="0.3" lemma="отъ" part-of-speech="R-" morphology="---------n"/><token id="3" form="хоумъ" citation-part="0.4" lemma="хоумъ" part-of-speech="Nb" morphology="-s---mn--i"/></sentence>`

describe('SPEC 63 PV', () => {
  it('PV-1 TOROT lemma, POS+morphology and citation-part are the token annotation; a lemma is evidence, not a link', () => {
    const t = parseProiel(XML)
    expect(t[0]).toMatchObject({ raw: 'киевѣ', lemma: 'кыевъ', morph: 'Ne -s---ml--i', loc: '0.3' })
    expect(bucketOf(t[2]!, false)).toBe('orv'); expect(bucketOf(t[2]!, true)).toBe('linked')
  })
  it('PV-2 ORV folds are the existing cited tables (ѿ → от, ꙗ/ѧ → я) reused, not re-implemented', () => {
    expect(derive('ѿ', { oldI: true }).norm).toBe('от')
    expect(derive('ꙗзыкъ', { oldI: true }).norm.startsWith('ѧ')).toBe(true)
  })
  it('PV-3 Ne tokens become name cards (/name/:id) with TOROT evidence; type unknown unless the gazetteer knows it', () => {
    const s = new TorotScan(), t = parseProiel(XML)[0]!
    expect(bucketOf(t, true)).toBe('name')
    expect(s.add('name', 'pvl_lav', t)).toBe('n:кыевъ')
    const c = s.names.get('кыевъ')!
    expect(c).toMatchObject({ lemma: 'кыевъ', n: 1, evidence: [{ w: 'pvl_lav', loc: '0.3', morph: 'Ne -s---ml--i' }] })
    expect(c.modern).toBeUndefined()
    expect(makeRouter(true).resolve('/name/кыевъ').matched.at(-1)!.path).toBe('/name/:id')
  })
  it('PV-4 per-witness report: link % before/after and top-50 unlinked lemmas with reasons', () => {
    const toks = parseProiel(XML), d = mkdtempSync(join(tmpdir(), 'pv-'))
    try {
      const { stats } = scanTorot([{ w: { id: 'pvl_lav', title: 'ПВЛ', lang: 'orv', tokens: toks }, ids: Int32Array.from([-1, -1, -1]), reasonOf: () => 'no VESUM-attested fold/derivation candidate', lemmaOf: () => ({ display: '', tags: '' }) }], 'x')
      expect(stats[0]).toMatchObject({ names: 1, orv: 2, none: 0 })
      torotReport(stats, { pvl_lav: 1 }, d)
      const md = readFileSync(join(d, 'torot-extraction.md'), 'utf8')
      expect(md).toContain('| pvl_lav | 3 | 3 | 1 (33.3%)'); expect(md).toContain('Top-50'); expect(md).toContain('| хоумъ | 1 | no VESUM-attested')
    } finally { rmSync(d, { recursive: true, force: true }) }
  })
  it('PV-5 ORV-only lemma gets a card (/orv/:id) with TOROT POS/morphology, gloss unknown, and the shard carries the ref', () => {
    const toks = parseProiel(XML), s = new TorotScan()
    expect(s.add('orv', 'pvl_lav', toks[2]!, { reason: 'x' })).toBe('o:хоумъ')
    expect(s.orv.get('хоумъ')).toMatchObject({ pos: 'Nb common noun', gloss: 'unknown', reason: 'x' })
    expect(textShard({ id: 'w', tokens: toks }, ['n:кыевъ', '', 'o:хоумъ']).tokens[2]).toEqual(['хоумъ', '0.4', 0, 'o:хоумъ'])
    expect(makeRouter(true).resolve('/orv/хоумъ').matched.at(-1)!.path).toBe('/orv/:id')
  })
  it('PV-6 lemmas dropped by KEEP_MIN_F get a light card /lw/:lemma and tokens reference it', () => {
    const w = { id: 'o18_26', tokens: [{ raw: 'повелитель', loc: 'a', s: 0 }, { raw: 'вода', loc: 'a', s: 0 }] }
    const r = lightIndex([w], [Int32Array.from([0, 1])], [{ display: 'повелитель', tags: 'noun:m:v_naz', f: 1 }, { display: 'вода', tags: 'noun:f:v_naz', f: 99 }], Uint8Array.from([0, 1]))
    expect(r.refs.get('o18_26')).toEqual(['l:повелитель', '']); expect(r.file.lemmas[0]).toEqual(['повелитель', 'noun:m:v_naz', 1, 'o18_26|a|повелитель'])
    const row = (ref: string, lemma?: string): Row => ({ raw: 'x', loc: 'a', sep: ' ', status: 'unknown', ref, lemma })
    expect(rowRef(row('l:повелитель'))).toBe('/lw/' + encodeURIComponent('повелитель')); expect(rowRef(row('l:повелитель', 'інше'))).toBeUndefined()
    expect(makeRouter(true).resolve('/lw/повелитель').matched.at(-1)!.path).toBe('/lw/:lemma')
  })
  it('PV-7 nomina sacra expand with or without titlo, original spelling kept as the token (ісъ → Ісус, двдъ → Давид, рства → рождьства)', () => {
    expect(expandTitlo('ісъ').word).toBe('иисусъ'); expect(expandTitlo('двдъ').word).toBe('давидъ'); expect(expandTitlo('рства').word).toBe('рождьства')
    expect(expandTitlo('сна').expanded).toBeUndefined()   // сна = gen. of сон: not expanded without a titlo
    expect(derive('цръ', { oldI: true }).candidates.map(c => c.form)).toContain('цар')
  })
  it('PV-8 non-TOROT witnesses: cited OES folds (instr. -мь → -мъ, -ѣмъ → -емъ) propose candidates; Stanza ORV PROPN/NOUN become model-labelled name / ORV cards', () => {
    expect(oesVariants('конь' + 'мь')).toEqual([{ form: 'коньмъ', trace: ['OES-MJER'] }])
    expect(oesVariants('сыномъ')).toEqual([]); expect(oesVariants('данѣмъ').map(v => v.form)).toContain('данемъ')
    expect(oesFoldById['OES-MJER']!.cite.quote).toContain('коньмь (-емь)')
    const s = new TorotScan(), m = { raw: 'Моисѣомъ', loc: 'a', lemma: 'моисеи', morph: 'PROPN Case=Ins' }
    expect(bucketOf(m, false)).toBe('name'); expect(s.add('name', 'ilarion', m, { model: true })).toBe('n:моисеи')
    expect(s.names.get('моисеи')).toMatchObject({ model: true, pos: 'PROPN (Stanza ORV, модель)' })
  })
  it('PV-8b cited OES endings: gen. -аго, long -ыи, aorist / imperfect with stem agreement and the quoted sources in research/37', () => {
    expect(oesVariants('рускаго').map(v => v.form)).toContain('руского'); expect(oesVariants('добрыи').map(v => v.form)).toContain('добрий')
    expect(oesPast('отиде', 'отъити')).toMatchObject({ tense: 'aorist', id: 'OES-AOR' }); expect(oesPast('быхомъ', 'быти')).toMatchObject({ tense: 'aorist' })
    expect(oesPast('писаше', 'писати')).toMatchObject({ tense: 'imperfect', id: 'OES-IMPF' }); expect(oesPast('столъ', 'отъити')).toBeUndefined()
    const md = readFileSync('research/37-oes-morphology.md', 'utf8')
    for (const q of [oesFoldById['OES-GEN-AGO']!.cite.quote, oesFoldById['OES-LONG-YI']!.cite.quote, 'знахъ | знахомъ', 'писахъ, писаше, писаховѣ, писахомъ, писаху']) expect(md.includes(q.slice(0, 40)), q.slice(0, 40)).toBe(true)
  })
})
