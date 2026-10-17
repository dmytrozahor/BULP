import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MU_FOLDS, muCandidates } from '../core/mu-fold.ts'
import { foldById } from '../core/orthography.ts'
import { SOURCES } from '../core/sources.ts'
import { derive } from '../core/phonology.ts'
import { fold } from '../core/orthography.ts'
import { chooseLemma, linkOptions, traceSteps, type Env, type TypeCtx } from '../pipelines/build-link.ts'
import { capNames, muReport } from '../pipelines/build-mu.ts'
import type { VesumHit } from '../core/types.ts'

const rd = (p: string) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const mkEnv = (rows: Record<string, VesumHit[]>): Env => ({
  hits: new Map(Object.entries(rows)),
  derive: (s, oldI) => derive(s, { oldI }),
  fold,
})
const ctx = (raw: string, over: Partial<TypeCtx> = {}): TypeCtx => ({ lang: 'uk', oldI: false, orth: 'modernised', raw, ...over })
const lemmaOf = (t: TypeCtx, env: Env) => { const o = linkOptions(t, env); return o ? chooseLemma(o.opts, new Map()) : undefined }

describe('SPEC 63 MU', () => {
  it('MU-1 every rule cites a read source with a locator, and its quote is in research/35', () => {
    const doc = rd('research/35-middle-ukr-morphology.md').replace(/\s+/g, ' ')
    expect(SOURCES['RUSL']?.url).toContain('izbornyk.org.ua/rusaniv')
    expect(MU_FOLDS.length).toBeGreaterThanOrEqual(20)
    for (const f of MU_FOLDS) {
      expect(f.cite.locator.length, f.id).toBeGreaterThan(3)
      expect(['RUSL', 'PAVL', 'SHEV', 'PRAV', 'ENC'], f.id).toContain(f.cite.source)
      if (f.cite.kind !== 'Q') { expect(doc, f.id).toContain('PAVL ' + f.cite.locator.match(/с\. \d+/)![0]); continue }   // a paraphrased (decoded) table: research/35 names the page
      const q = f.cite.quote.replace(/\s+/g, ' ').slice(0, 45)
      expect(doc.includes(q), `${f.id}: «${q}» not in research/35`).toBe(true)
    }
    expect(doc).toContain('NOT implemented')
  })

  it('MU-2 fold engine: enclitic split + past -л → -в, the chain is shown through foldById', () => {
    const c = muCandidates('дойшол-єм').find(x => x.form === 'дойшов')!
    expect(c.trace).toEqual(['MU-ENCL-1SG', 'MU-PAST-L'])
    expect(foldById['MU-ENCL-1SG']).toBeTruthy()
    expect(foldById['MU-ENCL-1SG']!.cite.quote).toContain('-м, -єсь (-сь), -єсьмо (-сьмо, -сьмы), -єсьте (-сьте)')
    expect(traceSteps('дойшол-єм', { form: 'дойшов', trace: c.trace, branches: 2 }).map(s => `${s.rule}:${s.from}>${s.to}`)).toEqual(['MU-ENCL-1SG:дойшол-єм>дойшол', 'MU-PAST-L:дойшол>дойшов'])
    expect(muCandidates('сказали-сьте').map(x => x.form)).toContain('сказали')
    expect(muCandidates('люди')).toEqual([])
  })

  it('MU-2 a candidate links only through VESUM with the analysis the rule states (POS / case gate)', () => {
    const adjGen: VesumHit = { lemma: 'польський', tags: 'adj:f:v_rod' }
    const env = mkEnv({ польської: [adjGen], польськім: [{ lemma: 'польський', tags: 'adj:m:v_mis' }] })
    const got = lemmaOf(ctx('польськой'), env)!
    expect(got.lemma).toBe('польський'); expect(got.cand.trace).toEqual(['MU-FEM-OJ-GEN'])
    // wrong analysis (masc. loc. for a fem. gen. rule) → nothing
    expect(lemmaOf(ctx('польськой'), mkEnv({ польської: [{ lemma: 'польський', tags: 'adj:m:v_mis' }] }))).toBeUndefined()
    // the dat./loc. reading: -ой → -ій, accepted only for v_dav/v_mis fem.
    expect(lemmaOf(ctx('давной'), mkEnv({ давній: [{ lemma: 'давній', tags: 'adj:f:v_dav' }] }))!.cand.trace).toEqual(['MU-FEM-OJ-DAT'])
    // not Middle Ukrainian text (orth differs) → no MU route
    expect(lemmaOf(ctx('польськой', { orth: 'кулішівка' }), env)).toBeUndefined()
    // the token's own POS annotation vetoes (a noun-gate token cannot take an adjective analysis)
    expect(lemmaOf(ctx('польськой', { lang: 'ruthenian', gate: 'U:ADP' }), env)).toBeUndefined()
    // a plain route always wins over MU
    expect(linkOptions(ctx('польськой'), mkEnv({ польськой: [{ lemma: 'польськой', tags: 'noun:inanim:m:v_naz' }], польської: [adjGen] }))!.opts.every(o => o.cand.trace.length === 0)).toBe(true)
  })

  it('MU-2 rules: loc. pl. -ех, gen. pl. -ов, short participle -ен, uncontracted -оє/-ії; proper nouns and participles are excluded where stated', () => {
    const env = mkEnv({
      дітях: [{ lemma: 'дитя', tags: 'noun:anim:p:v_mis' }], гетьманів: [{ lemma: 'гетьман', tags: 'noun:anim:p:v_rod' }], заложений: [{ lemma: 'заложений', tags: 'adj:m:v_naz:adjp:pasv:perf' }],
      велике: [{ lemma: 'великий', tags: 'adj:n:v_naz' }], римські: [{ lemma: 'римський', tags: 'adj:p:v_naz' }], явлені: [{ lemma: 'явлений', tags: 'adj:p:v_naz:adjp:pasv:perf' }],
      людах: [{ lemma: 'Люда', tags: 'noun:anim:p:v_mis:prop:fname' }], рушив: [{ lemma: 'рушити', tags: 'verb:imperf:past:m' }],
    })
    const tr = (raw: string) => lemmaOf(ctx(raw), env)?.cand.trace.join('+')
    expect(tr('дітех')).toBe('MU-LOC-PL-EH-JAH'); expect(tr('гетьманов')).toBe('MU-GEN-PL-OV'); expect(tr('заложен')).toBe('MU-SHORT-EN')
    expect(tr('великоє')).toBe('MU-CONTR-E'); expect(tr('римськії')).toBe('MU-CONTR-IE'); expect(tr('рушил')).toBe('MU-PAST-L')
    expect(tr('явленіє')).toBeUndefined()   // a participle plural is not accepted for the -іє rule (it is the noun явленіє)
    expect(tr('людех')).toBeUndefined()      // a proper noun does not confirm the loc. pl. rule
  })

  it('MU-2 spelling and sound folds (кг, -ск-, е/о → і, -ніє → -ння) run in the second pass and are checked by VESUM; closed-syllable о → і is restricted; names and 1st-person verbs are refused', () => {
    const env = mkEnv({
      ґрунт: [{ lemma: 'ґрунт', tags: 'noun:inanim:m:v_naz' }], римського: [{ lemma: 'римський', tags: 'adj:m:v_rod' }], білий: [{ lemma: 'білий', tags: 'adj:m:v_naz' }],
      військо: [{ lemma: 'військо', tags: 'noun:inanim:n:v_naz' }], гіда: [{ lemma: 'гід', tags: 'noun:anim:m:v_rod' }], наставлення: [{ lemma: 'наставлення', tags: 'noun:inanim:n:v_naz' }],
      опікунів: [{ lemma: 'опікун', tags: 'noun:anim:p:v_rod' }], писаний: [{ lemma: 'писаний', tags: 'adj:m:v_naz:adjp:pasv:imperf' }], всію: [{ lemma: 'всіяти', tags: 'verb:perf:futr:s:1' }],
      ідиного: [{ lemma: 'Ідин', tags: 'adj:m:v_rod' }],
    })
    const tr = (raw: string, phon = true) => { const e = { ...env, phon } as Env; const o = linkOptions(ctx(raw, { orth: 'ізборник-нормалізований' }), e); const c = o && chooseLemma(o.opts, new Map()); return c?.cand.trace.join('+') }
    expect(tr('кгрунт', false)).toBe('MU-KG-G'); expect(tr('римского', false)).toBe('MU-SK')
    expect(tr('белий')).toBe('MU-E-I-1'); expect(tr('белий', false)).toBeUndefined()   // е/о → і only in the second pass
    expect(tr('войсько')).toBe('MU-O-I-1'); expect(tr('года')).toBeUndefined()           // an open syllable is not R10
    expect(tr('наставленіе')).toBe('MU-NIJE-NNJA'); expect(tr('опекунов')).toBe('MU-E-I-1+MU-GEN-PL-OV'); expect(tr('писан')).toBe('MU-SHORT-AN')
    expect(tr('всею')).toBeUndefined()    // VESUM «всію» is a 1st-person verb
    expect(tr('единого')).toBeUndefined() // VESUM «Ідин» is a name
  })

  it('MU-3 capitalised unresolved tokens (not paragraph-first, never written lower-case) get name cards with basis capitalisation', () => {
    const tok = (raw: string, s: number) => ({ raw, loc: 'абз. ' + s, s })
    const w = { id: 'o18_x', title: 't', lang: 'uk', orth: 'modernised', tokens: [tok('Бродов', 1), tok('під', 1), tok('Пуфендорфію', 1), tok('Когда', 1), tok('когда', 1), tok('війна', 2), tok('Пуфендорфію', 2), tok('Хмельницький', 2)] } as never
    const r = capNames([{ w, ids: Int32Array.from([-1, -1, -1, -1, -1, -1, -1, 5]) }], new Set())
    expect(r.names.map(n => n.id)).toEqual(['пуфендорфію'])
    expect(r.names[0]).toMatchObject({ basis: 'capitalisation', kind: 'unknown', n: 2 })
    expect(r.refs.get('o18_x')).toEqual(['', '', 'n:пуфендорфію', '', '', '', 'n:пуфендорфію', ''])   // Бродов is paragraph-first, Когда is also written «когда», Хмельницький is linked
  })

  it('MU-3 report: link % before/after per witness, rules fired, reasons for the remainder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mu-'))
    try {
      const w = { id: 'o18_33', title: 'Величко', tokens: [], orth: 'modernised', lang: 'uk' } as never
      const md = muReport([{ w, n: 100, linked: 80, names: 5, rules: { 'MU-PAST-L': 7 }, unresolved: new Map([['чрез', 3], ['хмельницьком', 1]]) }], { o18_33: { n: 100, linked: 70 } }, dir, ['o18_33'])
      expect(md).toContain('| 70 (70.0%) | 80 (80.0%) | +10 | 5 | 85.0% |')
      expect(md).toMatch(/\| MU-PAST-L \| 7 \| RUSL/)
      expect(md).toMatch(/\| чрез \| 3 \| no-rule \|/); expect(md).toMatch(/\| хмельницьком \| 1 \| MU-no-vesum \|/)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('MU-3 the generated report (analysis/middle-ukr-extraction.md) and its baseline exist and show a gain for Величко 1720', () => {
    if (!existsSync(new URL('../analysis/middle-ukr-extraction.md', import.meta.url))) return
    const md = rd('analysis/middle-ukr-extraction.md'), base = JSON.parse(rd('analysis/mu-baseline.json')).linked
    expect(base.o18_33.linked).toBe(12497)
    const m = md.match(/\| o18_33 — [^|]*\| \d+ \| (\d+) \([\d.]+%\) \| (\d+) \(/)!
    expect(Number(m[2])).toBeGreaterThan(Number(m[1]))
  })
})
