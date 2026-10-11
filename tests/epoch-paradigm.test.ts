/** SPEC 50 backend tests (fixture tokens, no full build): decoders, cell evidence, split/merge. */
import { describe, it, expect } from 'vitest'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { dualShown, epochDisabled, cellEvidence, cellsFromProiel, cellsFromUd, cellsFromVesum, NOUN_KEYS, nounKey, parseNounKey } from '../core/cells.ts'
import { claim, D, isKnown } from '../core/evidence.ts'
import { assignStem, STEM_RULES, stemClaim } from '../core/stem.ts'
import { confirm, reconstruct, type ReconCell } from '../core/reconstruct.ts'
import { MODELS } from '../core/morph-tables.ts'
import { generalNotes, MORPH_HISTORY, mhById, notesFor } from '../core/morph-history.ts'
import type { CellForm, StemValue, WitnessOut } from '../core/types.ts'
import { assignEpoch } from '../core/epochs.ts'
import { buildEpochs, type NlpTok } from '../pipelines/build-epochs.ts'
import type { Chosen, Route } from '../pipelines/build-link.ts'
import { mergeCard, packShard, splitCard, unpackShard } from '../core/shard.ts'
import type { CorpusMeta, LemmaCard } from '../core/types.ts'

const dir = mkdtempSync(join(tmpdir(), 'epfx-'))
execFileSync(process.execPath, ['--import', 'tsx', 'pipelines/fixture.ts', dir], { stdio: 'ignore' })
const corpus = JSON.parse(readFileSync(join(dir, 'corpus.json'), 'utf8')) as CorpusMeta
const cards = JSON.parse(readFileSync(join(dir, 'lexicon.json'), 'utf8')) as LemmaCard[]
const kin = cards.find(c => c.lemma === 'кінь')!

describe('EP-1.2 contract fixture', () => {
  it('fixture epochs type-check against EpochParadigms', () => {
    const e = kin.epochs!
    expect(e.paradigms.map(p => p.epoch)).toEqual(['shev.old', 'shev.middle', 'shev.late_middle', 'shev.modern'])
    for (const p of e.paradigms) for (const c of p.cells) { expect(parseNounKey(c.key), c.key).toBeTruthy(); for (const f of c.forms) { expect(e.tags[f.t]).toBeTruthy(); expect(corpus.witnesses[f.ex[0]]).toBeTruthy() } }
    expect(isKnown(e.stem) && e.stem.value.rule).toBe('ST-10')
  })
  it('cell key grammar: 7 + 3 + 7 noun keys, dual merged', () => {
    expect(NOUN_KEYS).toHaveLength(17)
    expect(nounKey('du', 'gen')).toBe('du.gl'); expect(nounKey('du', 'loc')).toBe('du.gl'); expect(nounKey('du', 'ins')).toBe('du.di'); expect(nounKey('du', 'voc')).toBe('du.nav')
  })
})

describe('EP-1.1 split/merge keeps epochs; core has none', () => {
  it('round-trip', () => {
    const { core, detail } = splitCard(kin)
    expect('epochs' in core).toBe(false)
    expect(detail.epochs).toEqual(kin.epochs)
    expect(mergeCard(core, detail)).toEqual(kin)
    const back = unpackShard(JSON.parse(JSON.stringify(packShard([[kin.lemma, detail]]))))
    expect(back.get(kin.lemma)!.epochs).toEqual(kin.epochs)
    const other = cards.find(c => !c.epochs)!, s = splitCard(other)
    expect('epochs' in s.detail).toBe(false); expect(mergeCard(s.core, s.detail)).toEqual(other)
  })
})

describe('EP-2.2 decoders: proiel, ud, vesum', () => {
  it('PROIEL', () => {
    expect(cellsFromProiel('Nb -d---fa--i').keys).toEqual(['du.nav'])
    expect(cellsFromProiel('Nb -s---mv--i').keys).toEqual(['sg.voc'])
    expect(cellsFromProiel('Ne -p---mg--i')).toMatchObject({ grid: 'noun', keys: ['pl.gen'], gender: 'm' })
    expect(cellsFromProiel('V- 3saia----i').grid).toBe('verb')
    expect(cellsFromProiel('C- ---------n').grid).toBeUndefined()
  })
  it('UD', () => {
    expect(cellsFromUd('NOUN', 'Case=Ins|Gender=Fem|Number=Dual').keys).toEqual(['du.di'])
    expect(cellsFromUd('PROPN', 'Case=Nom|Gender=Masc|Number=Sing')).toMatchObject({ keys: ['sg.nom'], gender: 'm', amb: 1 })
    expect(cellsFromUd('VERB', 'Mood=Ind').grid).toBe('verb'); expect(cellsFromUd('NUM', null).grid).toBeUndefined()
  })
  it('VESUM: руки → 4 keys', () => {
    const d = cellsFromVesum(['noun:inanim:f:v_rod', 'noun:inanim:p:v_naz', 'noun:inanim:p:v_zna', 'noun:inanim:p:v_kly'])
    expect(d.keys).toEqual(['sg.gen', 'pl.nom', 'pl.acc', 'pl.voc']); expect(d.amb).toBe(4); expect(d.gender).toBe('f')
  })
})

describe('EP-2.3 / EP-2.4 underspecified → amb or dropped; dual g and l → du.gl', () => {
  it('amb and dropped', () => {
    expect(cellsFromProiel('Nb -s---qc--i')).toMatchObject({ keys: ['sg.gen', 'sg.dat'], amb: 2, gender: undefined })   // gender q has no effect on a noun cell; case c = gen/dat
    expect(cellsFromProiel('Nb -s---me--i').keys).toEqual(['sg.dat', 'sg.acc'].sort((a, b) => NOUN_KEYS.indexOf(a) - NOUN_KEYS.indexOf(b)))
    expect(cellsFromProiel('Nb -s---mx--i')).toMatchObject({ keys: [], under: true })
    expect(cellsFromProiel('Nb -s---mo--i')).toMatchObject({ keys: [], under: true })   // oblique singular = 5 cells > 4
    expect(cellsFromProiel('Nb -x---mn--i').under).toBe(true)
    expect(cellsFromProiel('Nb -d---mo--i').keys).toEqual(['du.nav', 'du.gl', 'du.di'])   // oblique dual merges into 3 cells
    expect(cellsFromUd('NOUN', 'Case=Acc,Nom|Number=Sing').keys).toEqual(['sg.nom', 'sg.acc'])
    expect(cellsFromUd('NOUN', 'Gender=Fem|Number=Sing').under).toBe(true)
  })
  it('dual g and l', () => {
    expect(cellsFromProiel('Nb -d---mg--i').keys).toEqual(['du.gl']); expect(cellsFromProiel('Nb -d---nl--i').keys).toEqual(['du.gl'])
    expect(cellsFromUd('NOUN', 'Case=Gen|Number=Dual').keys).toEqual(['du.gl']); expect(cellsFromUd('NOUN', 'Case=Loc|Number=Dual').keys).toEqual(['du.gl'])
  })
})

describe('EP-2.5 every cell form yields a valid claim', () => {
  it('claims, stanza note, outOfDomain note', () => {
    const e = kin.epochs!
    for (const p of e.paradigms) for (const c of p.cells) for (const f of c.forms) {
      const ev = cellEvidence(f, e, corpus), cl = claim(c.key, ev)
      expect(cl.evidence[0]!.quote).toContain(`«${e.tags[f.t]}»`)
      if (f.src === 'stanza') { expect(ev.note).toContain('P-1.7'); expect(ev.note).toContain('поза доменом') }   // fixture stanza cell = samovydets (outOfDomain)
      if (f.src === 'torot') expect(ev.note).toContain('TOROT')
      if (f.src === 'vesum') expect(ev.note).toContain('ВЕСУМ')
    }
  })
})

// ── stem types (EP-4) and reconstruction (EP-5) ──
const sv = (old: string, g: StemValue['gender']) => assignStem(old, g)!
const forms = (cs: ReconCell[], key: string) => cs.find(c => c.key === key)!.forms.map(f => f.form)
describe('EP-4 stem types', () => {
  it('EP-4.1/4.2 stem rules on old lemmas', () => {
    expect(sv('сынъ', 'm')).toMatchObject({ rule: 'ST-01', type: 'u', model: 'сынъ', score: 0.5 })
    expect(sv('конь', 'm')).toMatchObject({ rule: 'ST-10', type: 'jo', model: 'конь' })
    expect(sv('мечь', 'm')).toMatchObject({ rule: 'ST-10', type: 'jo', model: 'мечь' })
    expect(sv('гость', 'm')).toMatchObject({ rule: 'ST-07', type: 'i', model: 'зꙗть' })
    expect(sv('печь', 'f')).toMatchObject({ rule: 'ST-08', type: 'i', model: 'печь' })
    expect(sv('рука', 'f')).toMatchObject({ rule: 'ST-13', type: 'a', model: 'рѣка' })
    expect(sv('душа', 'f')).toMatchObject({ rule: 'ST-14', type: 'ja', model: 'доуша' })
    expect(sv('земля', 'f')).toMatchObject({ rule: 'ST-14', type: 'ja', model: 'землꙗ' })
    expect(sv('имя', 'n')).toMatchObject({ rule: 'ST-03', type: 'men' })
    expect(sv('теля', 'n')).toMatchObject({ rule: 'ST-04', type: 'nt' })
    expect(sv('небо', 'n')).toMatchObject({ rule: 'ST-02', type: 's' })
    expect(sv('мати', 'f')).toMatchObject({ rule: 'ST-05', type: 'r' })
    expect(sv('градъ#1', 'm')).toMatchObject({ rule: 'ST-09', type: 'o', model: 'плодъ' })
    expect(sv('село', 'n')).toMatchObject({ rule: 'ST-11', model: 'село' }); expect(sv('поле', 'n')).toMatchObject({ rule: 'ST-12', model: 'поле' })
    expect(assignStem('камы', 'm')).toBeUndefined()      // masc. n-stem: no model table
    expect(assignStem('птица', 'f')).toBeUndefined()     // -ц-: softness not sourced (ST-14)
  })
  it('EP-4.2 every STEM_RULES row has a Q cite', () => {
    expect(STEM_RULES.length).toBe(14); expect(new Set(STEM_RULES.map(r => r.id)).size).toBe(14)
    for (const r of STEM_RULES) { expect(r.cite.kind, r.id).toBe('Q'); expect(r.cite.source).toBe('PAVL'); expect(r.cite.quote.length).toBeGreaterThan(20); expect(() => claim(r.id, r.cite)).not.toThrow() }
  })
  it('EP-4.3 stem claim evidence = rule cite + lemma record (+ gender)', () => {
    const lemmaEv = D('pvl_lav', 'л. 12', 'конь → «конь»', 'лема TOROT'), gEv = D('pvl_lav', 'л. 12', 'конь «Nb -s---mn--i»', 'рід за TOROT')
    const c = stemClaim('конь', 'm', lemmaEv, [gEv], false)
    expect(c.evidence).toHaveLength(3); expect(c.evidence[0]!.source).toBe('PAVL'); expect(c.evidence[1]).toEqual(lemmaEv); expect(c.method).toBe('ST-10')
    expect(stemClaim('конь', 'm', lemmaEv, [gEv], true).method).toBe('ST-10+stanza')
    expect(stemClaim('камы', 'm', lemmaEv, [gEv], false).value).toBe('unknown'); expect(stemClaim('конь', undefined, lemmaEv, [], false).value).toBe('unknown')
  })
})

describe('EP-6 per-epoch system and chronology', () => {
  it('EP-6.1 every MH entry has a Q cite', () => {
    expect(MORPH_HISTORY).toHaveLength(30)
    expect(new Set(MORPH_HISTORY.map(m => m.id)).size).toBe(30)
    MORPH_HISTORY.forEach((m, i) => { expect(m.id).toBe(`MH-${String(i + 1).padStart(2, '0')}`); expect(m.cite.some(e => e.kind === 'Q'), m.id).toBe(true); for (const e of m.cite) expect(() => claim(m.id, e)).not.toThrow() })
    for (const id of ['MH-08', 'MH-10', 'MH-11', 'MH-13']) expect(mhById[id]!.dated).toBeNull()   // gaps in research/11 §3: no source date, never a guess
    expect(notesFor('pl.dat').map(m => m.id)).toContain('MH-09'); expect(notesFor('sg.dat').map(m => m.id)).toContain('MH-07'); expect(notesFor('pl.gen').map(m => m.id)).toContain('MH-11')
    expect(notesFor('pl.voc').map(m => m.id)).toContain('MH-17'); expect(notesFor('du.gl').map(m => m.id)).toEqual(expect.arrayContaining(['MH-01', 'MH-02', 'MH-03']))
    expect(generalNotes('noun').map(m => m.id)).toContain('MH-05')
  })
  it('EP-6.2 dual column only where attested after shev.old', () => {
    const p = (key: string, n: number) => ({ cells: [{ key, forms: Array(n).fill(0) }] })
    expect(dualShown('shev.old')).toBe(true); expect(dualShown('shev.proto')).toBe(true)
    expect(dualShown('shev.middle', p('sg.nom', 3))).toBe(false); expect(dualShown('shev.middle')).toBe(false)
    expect(dualShown('shev.middle', p('du.nav', 1))).toBe(true); expect(dualShown('shev.late_middle', p('du.gl', 1))).toBe(true)
    expect(dualShown('shev.modern', p('du.nav', 1))).toBe(false)
  })
  it('EP-6.3 epoch without witnesses is disabled', () => {
    const sizes = { 'shev.old': 236845, 'shev.middle': 63594 }
    expect(epochDisabled('shev.early_middle', sizes)).toBe(true); expect(epochDisabled('shev.old', sizes)).toBe(false)
    expect(epochDisabled('shev.early_middle', corpus.epochSizes)).toBe(true)   // fixture corpus has no early_middle witness
  })
})

describe('EP-5 reconstruction', () => {
  const R = (old: string, g: StemValue['gender'], epoch = 'shev.old') => reconstruct(sv(old, g), epoch)
  it('EP-5.1 no reconstruction after shev.old', () => {
    for (const e of ['shev.early_middle', 'shev.middle', 'shev.late_middle', 'shev.modern']) expect(R('рука', 'f', e)).toEqual([])
    expect(R('рука', 'f', 'shev.proto').length).toBeGreaterThan(10)
  })
  it('EP-5.2 рука / имя reconstructions', () => {
    const r = R('рука', 'f')
    expect(forms(r, 'sg.ins')).toEqual(['рукою']); expect(forms(r, 'pl.loc')).toEqual(['рукахъ']); expect(forms(r, 'du.di')).toEqual(['рукама']); expect(forms(r, 'sg.nom')).toEqual(['рука'])
    const i = R('имя', 'n')
    expect(forms(i, 'sg.gen')).toEqual(['имене', 'имени']); expect(forms(i, 'pl.nom')).toEqual(['имена']); expect(forms(i, 'sg.nom')).toEqual(['имꙗ'])
    expect(forms(R('небо', 'n'), 'sg.gen')).toEqual(['небесе']); expect(forms(R('мати', 'f'), 'sg.gen')).toEqual(['матере'])
    expect(forms(R('теля', 'n'), 'sg.gen')).toEqual(['телꙗте', 'телꙗти'])
    expect(forms(R('сынъ', 'm'), 'sg.acc')).toEqual(['сынъ', 'сына']); expect(R('отроча', 'n')).toEqual([])   // nominative -а ≠ the model's -я: unknown
  })
  it('EP-5.3 velar alternation нога / вълкъ', () => {
    expect(forms(R('рука', 'f'), 'sg.dat')).toEqual(['руцѣ']); expect(forms(R('нога', 'f'), 'sg.loc')).toEqual(['нозѣ'])
    expect(forms(R('вълкъ', 'm'), 'sg.loc')).toEqual(['вълцѣ']); expect(forms(R('вълкъ', 'm'), 'pl.nom')).toEqual(['вълци']); expect(forms(R('вълкъ', 'm'), 'pl.acc')).toEqual(['вълкы'])
    expect(forms(R('плодъ', 'm'), 'sg.loc')).toEqual(['плодѣ'])
    const t = R('рука', 'f').find(c => c.key === 'sg.dat')!.forms[0]!.trace
    expect(t.map(s => s.rule)).toEqual(['ST-13', 'MOR-TAB', 'MOR-VEL'])
  })
  it('EP-5.4 reconstructions carry method and cited trace', () => {
    for (const [o, g] of [['рука', 'f'], ['конь', 'm'], ['сынъ', 'm'], ['печь', 'f'], ['имя', 'n'], ['вълкъ', 'm']] as const) for (const c of R(o, g)) for (const f of c.forms) {
      expect(f.method).toBe('reconstruction'); expect(f.trace.length).toBeGreaterThanOrEqual(2)
      for (const s of f.trace) { expect(s.cite.length, `${o} ${c.key} ${s.rule}`).toBeGreaterThan(0); for (const e of s.cite) expect(() => claim(s.rule, e)).not.toThrow() }
    }
  })
  it('EP-5.5 confirmation only in the same cell', () => {
    const cf = (raw: string): CellForm => ({ raw, n: 1, src: 'torot', t: 0, ex: [0, 'x'] })
    const rec = R('рука', 'f'), ep = (key: string) => ({ epoch: 'shev.old', grid: 'noun' as const, N: 1, cells: [{ key, forms: [cf('роуцѣ')] }], dropped: { conflict: 0, underspecified: 0, untagged: 0 } })
    const on = confirm(rec, ep('sg.dat')), off = confirm(rec, ep('du.nav'))
    expect(on.find(c => c.key === 'sg.dat')!.forms[0]!.confirmedBy).toHaveLength(1)    // роуцѣ ≈ руцѣ after оу → у
    expect(on.find(c => c.key === 'du.nav')!.forms[0]!.confirmedBy).toBeUndefined()
    expect(off.find(c => c.key === 'sg.dat')!.forms[0]!.confirmedBy).toBeUndefined(); expect(off.find(c => c.key === 'du.nav')!.forms[0]!.confirmedBy).toHaveLength(1)
    expect(confirm(rec, undefined)).toBe(rec)
  })
  it('EP-5.6 vocative = nominative marker', () => {
    const n = R('село', 'n'), pv = n.find(c => c.key === 'pl.voc')!, sv1 = n.find(c => c.key === 'sg.voc')!
    expect(pv.forms).toEqual([]); expect(pv.eq).toMatchObject({ key: 'pl.nom' }); expect(pv.eq!.cite.source).toBe('PAVL'); expect(pv.eq!.cite.locator).toContain('74')
    expect(sv1.eq).toMatchObject({ key: 'sg.nom' })
    expect(R('рука', 'f').find(c => c.key === 'sg.voc')!.eq).toBeUndefined(); expect(forms(R('рука', 'f'), 'sg.voc')).toEqual(['руко'])
  })
  it('PAVL model tables: every model has the 17 noun cells but the blank printed ones, with a quote per cell', () => {
    expect(MODELS.map(m => m.lemma)).toEqual(['рѣка', 'землꙗ', 'доуша', 'плодъ', 'село', 'конь', 'поле', 'мечь', 'сынъ', 'боукы', 'печь', 'чьсть', 'зꙗть', 'мати', 'имꙗ', 'телꙗ', 'небо'])
    for (const m of MODELS) for (const c of Object.values(m.cells)) { expect(c.cite.kind).toBe('Q'); expect(c.ends.length).toBeGreaterThan(0); expect(c.row.length).toBeGreaterThan(3) }
    expect(Object.keys(MODELS.find(m => m.lemma === 'печь')!.cells)).toHaveLength(17)
  })
})

// ── build stage (EP-3, EP-1.4) on fixture tokens ──
type Tok = { raw: string; morph?: string; lemma?: string; nlp?: NlpTok | null; type?: number }
const wit = (id: string, lang: 'orv' | 'uk' | 'ruthenian', date: [number, number], toks: Tok[], outOfDomain = false) => ({
  w: { id, lang, date, oldI: false, tokens: toks.map((t, i) => ({ raw: t.raw, loc: `${id}:${i}`, s: 0, morph: t.morph, lemma: t.lemma })) } as unknown as WitnessOut,
  nlp: toks.some(t => t.nlp !== undefined) ? { model: 'm', outOfDomain, tokens: toks.map(t => t.nlp ?? null) } : undefined,
})
const chosen = (id: string, own = id) => ({ c: { id, own: { form: own } } as unknown as Chosen, route: 'torot-lemma' as Route })
const run = (ws: ReturnType<typeof wit>[], epochs: string[][], link: (w: number, t: number) => ReturnType<typeof chosen> | undefined, hits = new Map<string, { lemma: string; tags: string }[]>(), tags = 'noun:inanim:f:v_naz') => {
  const tix = ws.map(({ w }, wi) => Int32Array.from(w.tokens.map((_, ti) => wi * 1000 + ti)))
  const linked: ({ c: Chosen; route: Route } | undefined)[] = []
  ws.forEach(({ w }, wi) => w.tokens.forEach((_, ti) => { linked[wi * 1000 + ti] = link(wi, ti) }))
  return buildEpochs({ adm: ws, epochsOf: epochs, tix, linked, lemmas: new Map([['рука', { display: 'рука', tags }], ['конь', { display: 'конь', tags: 'noun:anim:m:v_naz' }]]), hits, derive: s => ({ candidates: [{ form: s }] }), vesumLoc: 'vesum' })
}
const cellOf = (r: ReturnType<typeof run>, lemma: string, epoch: string, key: string) => r.epochs.get(lemma)?.paradigms.find(p => p.epoch === epoch)?.cells.find(c => c.key === key)
const rk = () => chosen('рука')
describe('EP-3 epoch paradigms build', () => {
  it('EP-3.1 torot morph wins over stanza feats; untagged tokens are counted, not placed', () => {
    const w = wit('a', 'orv', [1110, 1118], [{ raw: 'руцѣ', morph: 'Nb -s---fd--i', nlp: { lemma: 'рука', upos: 'NOUN', feats: 'Case=Acc|Gender=Fem|Number=Sing' } }, { raw: 'и' }])
    const r = run([w], [['shev.old']], (_, t) => (t === 0 ? rk() : chosen('рука')))
    const p = r.epochs.get('рука')!.paradigms[0]!
    expect(p.cells.map(c => [c.key, c.forms[0]!.src])).toEqual([['sg.dat', 'torot']]); expect(p.dropped.untagged).toBe(1); expect(p.N).toBe(1)
  })
  it('EP-3.2 shev epoch of the witness: Eneida → late_middle, low-confidence witness in both epochs', () => {
    expect(assignEpoch([1798, 1798], 'shev').value).toMatchObject({ epochs: ['shev.late_middle'] })
    const low = assignEpoch([1300, 1450], 'shev').value
    expect(low !== 'unknown' && low.epochs.length).toBe(2)
    const w = wit('lowc', 'ruthenian', [1300, 1450], [{ raw: 'руцѣ', morph: 'Nb -s---fd--i' }])
    const r = run([w], [low === 'unknown' ? [] : low.epochs], rk)
    expect(r.epochs.get('рука')!.paradigms.map(p => p.epoch)).toEqual(['shev.old', 'shev.early_middle'].filter(e => low !== 'unknown' && low.epochs.includes(e)))
  })
  it('EP-3.3 / EP-3.4 grid mismatch, stanza lemma and gender disagreement → conflict', () => {
    const w = wit('s', 'ruthenian', [1672, 1702], [
      { raw: 'ити', morph: 'V- --pnfa---i' },
      { raw: 'рукы', nlp: { lemma: 'нога', upos: 'NOUN', feats: 'Case=Nom|Gender=Fem|Number=Plur' } },                 // lemma disagrees with the link (route token)
      { raw: 'коня', nlp: { lemma: 'конь', upos: 'NOUN', feats: 'Case=Gen|Gender=Fem|Number=Sing' } },                  // Gender=Fem for a masc. lemma
      { raw: 'коня', nlp: { lemma: 'конь', upos: 'NOUN', feats: 'Case=Gen|Gender=Masc|Number=Sing' } },
    ])
    const r = run([w], [['shev.middle']], (_, t) => ({ ...(t === 0 ? rk() : t === 1 ? rk() : chosen('конь')), route: 'token' as const }))
    expect(r.epochs.get('рука')!.paradigms[0]).toMatchObject({ N: 2, dropped: { conflict: 2 } })
    expect(r.epochs.get('конь')!.paradigms[0]).toMatchObject({ N: 2, dropped: { conflict: 1 } })
    expect(r.stats.perEpoch['shev.middle']!.bySrc.stanza.placed).toBe(1)
  })
  it('EP-3.5 modern «руки» under рука → 4 keys, amb 4, raw unfolded', () => {
    const w = wit('m', 'uk', [1882, 1882], [{ raw: 'руки' }])
    const hits = new Map([['руки', ['noun:inanim:f:v_rod', 'noun:inanim:p:v_naz', 'noun:inanim:p:v_zna', 'noun:inanim:p:v_kly'].map(t => ({ lemma: 'рука', tags: t }))]])
    const r = run([w], [['shev.modern']], () => ({ ...chosen('рука', 'руки'), route: 'direct' as const }), hits)
    const p = r.epochs.get('рука')!.paradigms[0]!
    expect(p.cells.map(c => c.key)).toEqual(['sg.gen', 'pl.nom', 'pl.acc', 'pl.voc']); expect(p.cells.every(c => c.forms[0]!.amb === 4 && c.forms[0]!.src === 'vesum' && c.forms[0]!.raw === 'руки')).toBe(true)
    expect(r.epochs.get('рука')!.tags[p.cells[0]!.forms[0]!.t]).toContain('v_rod')
  })
  it('EP-3.6 first ex = earliest witness; EP-3.7 N = placed + conflict + underspecified', () => {
    const early = wit('early', 'orv', [1050, 1060], [{ raw: 'руцѣ', morph: 'Nb -s---fd--i' }, { raw: 'руцѣ', morph: 'Nb -s---fx--i' }, { raw: 'ити', morph: 'V- --pnfa---i' }])
    const late = wit('late', 'orv', [1200, 1210], [{ raw: 'руцѣ', morph: 'Nb -s---fd--i' }])
    const r = run([early, late], [['shev.old'], ['shev.old']], rk)
    const p = r.epochs.get('рука')!.paradigms[0]!, f = p.cells[0]!.forms[0]!
    expect(f).toMatchObject({ n: 2, ex: [0, 'early:0'] }); expect(p.N).toBe(4); expect(p.dropped).toMatchObject({ conflict: 1, underspecified: 1, untagged: 0 })
  })
  it('EP-3.8 no dual loss inferred from absence: stanza-only lemma has no du cells, no negative field exists', () => {
    const w = wit('s2', 'orv', [1200, 1292], [{ raw: 'руки', nlp: { lemma: 'рука', upos: 'NOUN', feats: 'Case=Gen|Gender=Fem|Number=Sing' } }])
    const r = run([w], [['shev.old']], () => ({ ...rk(), route: 'stanza-lemma' as const }))
    const ep = r.epochs.get('рука')!
    expect(ep.paradigms[0]!.cells.filter(c => c.key.startsWith('du.'))).toEqual([]); expect(JSON.stringify(ep)).not.toMatch(/lost|loss|absent/)
  })
  it('EP-1.4 a cell with 6 spellings stores 4 and counts the rest in `more`; EP-1.3 every stored form has src', () => {
    const spell = ['а', 'б', 'в', 'г', 'д', 'е'], counts = [9, 8, 7, 6, 5, 2]
    const toks = spell.flatMap((s, i) => Array.from({ length: counts[i]! }, () => ({ raw: 'рук' + s, morph: 'Nb -s---fn--i' })))
    const r = run([wit('c', 'orv', [1110, 1118], toks)], [['shev.old']], rk)
    const c = cellOf(r, 'рука', 'shev.old', 'sg.nom')!
    expect(c.forms.map(f => f.raw)).toEqual(['рука', 'рукб', 'рукв', 'рукг']); expect(c.more).toBe(5 + 2)
    for (const f of c.forms) { expect(f.src).toBe('torot'); expect(f.ctx!.length).toBeLessThanOrEqual(60) }
  })
  it('EP-4 stem claim from the Old Ukrainian lemma: TOROT lemma, or Stanza lemma marked model-based (D4)', () => {
    const t = run([wit('t', 'orv', [1110, 1118], [{ raw: 'коня', lemma: 'конь', morph: 'Nb -s---mg--i' }])], [['shev.old']], () => chosen('конь')).epochs.get('конь')!.stem
    expect(isKnown(t) && t.value).toMatchObject({ rule: 'ST-10', type: 'jo', old: 'конь', gender: 'm' }); expect(t.method).toBe('ST-10'); expect(t.evidence.map(e => e.source)).toEqual(['PAVL', 't', 't'])
    const s = run([wit('g', 'orv', [1200, 1292], [{ raw: 'коня', nlp: { lemma: 'конь', upos: 'NOUN', feats: 'Case=Gen|Gender=Masc|Number=Sing' } }])], [['shev.old']], () => ({ ...chosen('конь'), route: 'stanza-lemma' as const })).epochs.get('конь')!.stem
    expect(s.method).toBe('ST-10+stanza'); expect(s.evidence.some(e => /stanza/.test(e.note ?? '') && /P-1\.7/.test(e.note ?? ''))).toBe(true)
    const none = run([wit('v', 'uk', [1882, 1882], [{ raw: 'коня' }])], [['shev.modern']], () => ({ ...chosen('конь', 'коня'), route: 'direct' as const }), new Map([['коня', [{ lemma: 'конь', tags: 'noun:anim:m:v_rod' }]]])).epochs.get('конь')!.stem
    expect(none.value).toBe('unknown')   // no shev.proto/old token: no Old Ukrainian lemma
  })
})
