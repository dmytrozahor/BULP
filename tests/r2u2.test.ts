/** SPEC 63 R2U-2: the r2u dump becomes dated dictionary witnesses, labels and Russian-contact pairs by running the pipeline only. */
import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { HOLOSK_ABBR, R2U_ABBR } from '../core/autolabel.ts'
import { SOURCES } from '../core/sources.ts'
import { fold } from '../core/orthography.ts'
import { parseCell, R2U_DICTS } from '../pipelines/r2u.ts'
import { storedRows, r2uWitness } from '../pipelines/ingest-r2u.ts'
import { UNITS_R2U } from '../pipelines/nw-r2u.ts'

describe('R2U-2 dump ingestion', () => {
  it('R2U-2 every r2u dictionary is a dated dictionary unit with a quoted dateCite', () => {
    expect(UNITS_R2U.length).toBe(R2U_DICTS.length)
    for (const u of UNITS_R2U) { expect(u.witnessType).toBe('dictionary'); expect(u.date[0]).toBeGreaterThan(1880); expect(u.dateCite.quote.length).toBeGreaterThan(5) }
    expect(UNITS_R2U.find(u => u.id === 'r2u_umanets')!.date).toEqual([1893, 1898])
  })
  it('R2U-2 the Голоскевич label table quotes its own list and is wired to dictionary 11', () => {
    expect(R2U_ABBR[11]).toBe(HOLOSK_ABBR); expect(SOURCES.HOLOSK).toBeDefined()
    for (const r of HOLOSK_ABBR.rows) expect(r.meaning).toContain(r.abbr.replace(/\.$/, ''))
    const r = parseCell(11, 1, '<span class="KrymUkr">ба́ба, -би, діял. ба́бця; стар. ба́бка</span>')
    expect(r?.labels?.map(x => x.abbr)).toEqual(['діял.', 'стар.'])
  })
  it('R2U-2 a Якубські headword with the leading «*» is parsed', () => {
    const r = parseCell(13, 1, '<span class="KrymRusBold">*Земля</span><span class="KrymUkr"> — земля́, ґрунт, -ту.</span>')
    expect(r?.head).toEqual(['Земля']); expect(r?.eq).toContain('земля́')
  })
  it('R2U-2 ORTH-SYA joins the detached reflexive and folds it to modern «ся»', () => {
    const r = parseCell(9, 1, '<span class="KrymRusBold">Выглядѣть</span> = <span class="KrymUkr">видава́ти ся, здава́ти ся</span>')
    expect(r?.eq).toContain('видава́ти-ся')
    expect(fold('видавати-ся', 'желехівка').map(c => c.form)).toContain('видаватися')
  })
  it('R2U-2 the real dump (when present): all pages are read, rows exist for every modelled dictionary, witnesses are noFreq', () => {
    if (!existsSync('data/raw/r2u/index.jsonl')) return
    const s = storedRows('data/raw/r2u', 'pages/')
    expect(s.lookups).toBe(3003)
    for (const d of R2U_DICTS.filter(d => [9, 12, 8, 11].includes(d.id))) {
      expect(s.rows.filter(r => r.dict === d.id).length).toBeGreaterThan(100)
      const w = r2uWitness(UNITS_R2U.find(u => u.id === d.unitId)!, d.id, s.rows)
      expect(w.noFreq).toBe(true); expect(w.tokens.length).toBeGreaterThan(100)
    }
  })
})
