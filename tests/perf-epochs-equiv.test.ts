/** perf: the memoised buildEpochs must return exactly what the per-token reference (tests/fixtures/ref/build-epochs.old.ts, the pre-perf code) returns. */
import { describe, it, expect } from 'vitest'
import { buildEpochs } from '../pipelines/build-epochs.ts'
import { buildEpochs as oldBuild } from './fixtures/ref/build-epochs.old.ts'

let seed = 12345
const rnd = (n: number) => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return (((t ^ (t >>> 14)) >>> 0) % n) }
const pick = <T>(xs: T[]) => xs[rnd(xs.length)]!

describe('perf: buildEpochs memoisation is output-identical', () => {
  it('random fixture corpus, all tag sources', () => {
    const lemmaIds = ['рука', 'конь', 'я', 'ити']
    const raws = ['Руки', 'руки', 'РУКЪ', 'коня', 'КОНЬ', 'я', 'мене', 'идѫ', 'руцѣ']
    const morphs = ['Nb -s---fd--i', 'Nb -d---fa--i', 'Ne -p---mg--i', 'V- 3saia----i', 'Pp 1s---nn--i']
    const feats = [['NOUN', 'Case=Gen|Gender=Fem|Number=Sing'], ['NOUN', 'Case=Gen|Gender=Masc|Number=Sing'], ['PRON', 'Case=Gen|Number=Sing'], ['VERB', null], ['NOUN', 'Case=Acc,Nom|Number=Plur']] as const
    const nlemmas = ['рука', 'конь', 'нога', 'я']
    const types = Array.from({ length: 24 }, (_, i) => {
      const id = pick(lemmaIds)
      return { c: { id, own: { form: pick(['руки', 'коня', 'мене', 'ходить', 'руцѣ']) } }, route: pick(['direct', 'direct', 'torot-lemma', 'stanza-lemma', 'token']) as never }
    })
    const hits = new Map([
      ['руки', ['noun:inanim:f:v_rod', 'noun:inanim:p:v_naz', 'noun:inanim:p:v_zna'].map(t => ({ lemma: 'рука', tags: t }))],
      ['коня', [{ lemma: 'кінь', tags: 'noun:anim:m:v_rod' }, { lemma: 'конь', tags: 'noun:anim:m:v_rod' }, { lemma: 'конь', tags: 'noun:anim:m:v_zna' }]],
      ['мене', ['noun:anim:s:v_zna:pron:pers:1', 'noun:anim:s:v_rod:pron:pers:1'].map(t => ({ lemma: 'я', tags: t }))],
    ])
    const adm = Array.from({ length: 30 }, (_, wi) => {
      const lang = pick(['uk', 'orv', 'ruthenian'] as const), n = 5 + rnd(40)
      const toks = Array.from({ length: n }, (_, ti) => {
        const r = rnd(4)
        return { raw: pick(raws), loc: `w${wi}:${ti}`, s: ti >> 3, ...(r === 0 ? { morph: pick(morphs), lemma: pick(nlemmas) } : {}) }
      })
      const nlp = rnd(3) ? { model: 'm', tokens: toks.map(() => { if (!rnd(2)) return null; const [upos, f] = pick([...feats]); return { upos, feats: f, lemma: pick(nlemmas) } }) } : undefined
      return { w: { id: 'w' + wi, lang, date: [1100 + wi * 20, 1110 + wi * 20], oldI: !!rnd(2), tokens: toks } as never, nlp }
    })
    const linked = types.map(t => (rnd(8) ? t : undefined))
    const tix = adm.map(({ w }: any) => Int32Array.from(w.tokens.map(() => rnd(types.length))))
    const epochsOf = adm.map((_, i) => (i % 5 === 0 ? [] : i % 3 === 0 ? ['shev.old', 'shev.middle'] : [pick(['shev.proto', 'shev.old', 'shev.modern'])]))
    const lemmas = new Map([['рука', { display: 'рука', tags: 'noun:inanim:f:v_naz' }], ['конь', { display: 'конь', tags: 'noun:anim:m:v_naz' }], ['я', { display: 'я', tags: 'noun:anim:s:v_naz:pron:pers:1' }]])
    let calls = 0
    const mk = () => ({ adm, epochsOf, tix, linked: linked as never, lemmas, hits, derive: (s: string) => (calls++, { candidates: [{ form: s }, { form: s.replace('ь', '') }] }), vesumLoc: 'vesum', probe: new Set(['ити']), kindOf: (id: string) => (id === 'я' ? 'pron' : id === 'ити' ? 'verb' : 'noun') })
    const a = oldBuild(mk()), c0 = calls, b = buildEpochs(mk())
    expect(JSON.stringify([...b.epochs])).toBe(JSON.stringify([...a.epochs]))
    expect(JSON.stringify(b.stats)).toBe(JSON.stringify(a.stats))
    const bs = Object.values(a.stats.perEpoch).map(e => e.bySrc)
    for (const src of ["torot", "stanza", "vesum"] as const) expect(bs.reduce((s, x) => s + x[src].placed, 0), src).toBeGreaterThan(0)
    expect(Object.keys(a.stats.conflictWhy).length).toBeGreaterThan(0)
    expect(a.epochs.size).toBeGreaterThan(0)
    expect(calls - c0).toBeLessThanOrEqual(c0)   // memo never calls derive more often
  })
})
