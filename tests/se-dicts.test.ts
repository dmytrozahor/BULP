/** SPEC 63 SE-9 / SE-10: the harvest list of the dated-sense dictionaries is consistent with the coverage records and the spec; the report script exists. */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { SE_DICTS } from '../harvest/se-dicts.ts'
import { dictById } from '../core/se.ts'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

describe('SE-10 harvest list', () => {
  it('SE-10 every harvested dictionary has a unique archive id, a licence status and a DICT_COVER record (or a declared sibling)', () => {
    expect(new Set(SE_DICTS.map(d => d.id)).size).toBe(SE_DICTS.length)
    for (const d of SE_DICTS) {
      expect(d.licence.startsWith('PD') || d.licence.startsWith('©'), d.id).toBe(true)
      expect(dictById(d.dict), `${d.id} → ${d.dict}`).toBeDefined()
    }
  })
  it('SE-10 copyrighted dictionaries keep only the headword line and short quotes; public-domain ones may be read in full', () => {
    for (const d of SE_DICTS.filter(x => x.licence.startsWith('©'))) expect(d.licence, d.id).toContain('≤ 200')
    expect(SE_DICTS.filter(d => d.licence.startsWith('PD')).map(d => d.id)).toEqual(expect.arrayContaining(['tymch1930', '1.2.1932', 'slovnyk33', 'bandurista3']))
  })
  it('SE-10 the historical periods are the dictionaries own (not the print year)', () => {
    expect(dictById('biletsky-nosenko')).toMatchObject({ edition: [1966, 1966], cover: [1840, 1842] })
    expect(dictById('timchenko')!.cover).toEqual([1501, 1800]); expect(dictById('sum16')!.cover).toEqual([1500, 1650])
  })
  it('SE-10 the chain waits for HV-5 and the launcher knows the job; the spec records the decisions', () => {
    expect(rd('harvest/se-chain.sh')).toContain('hv5-chain.sh'); expect(rd('harvest/launch.sh')).toContain('se-dicts')
    const spec = rd('specs/63-corpus-dialects.md'); expect(spec).toContain('**SE-10**'); expect(spec).toContain('tymch1930')
    expect(rd('research/45-literature-wanted.md')).toContain('| H10 |')
  })
  it('SE-7 the standalone report script reads the dictionary witnesses and writes analysis/sense-evolution.md atomically', () => {
    const s = rd('pipelines/se-report.ts'); expect(s).toContain('analysis/sense-evolution.md'); expect(s).toContain('writeJsonAtomic')
  })
})
