/**
 * MM-61 (owner: «діти і дівати теж переплуталося»). діти is a homonym: the plural of дитина (noun) and the perfective infinitive діти (verb, дівати). In the live data the VERB card діти carries 430
 * attestations (the noun дитина 45 317) and its first attestation is the unrelated Archangel Gospel «дѣлаѩ»: tokens of the noun «діти» were linked to the verb.
 * CAUSE: for a Ukrainian witness the token's own POS gate is OFF (build.ts: `w.lang === 'uk' ? undefined : gateKey(...)`), and the stanza-lemma route (BL-19) accepts the model lemma «діти» (the model
 * lemmatises the plural noun with its surface form) because the token IS a VESUM form of the head «діти» (the verb infinitive): the route returns only the verb and the form-based reading дитина never competes.
 * FIX: the model's UPOS is kept as a SOFT gate for such tokens (`softGate`): a stanza-lemma option whose POS class contradicts the model UPOS is dropped when another reading of the same string agrees with it.
 */
import { describe, expect, it } from 'vitest'
import { chooseLemma, linkOptions, type Env, type TypeCtx } from '../pipelines/build-link.ts'
import { derive as deriveRaw } from '../core/phonology.ts'
import { fold as foldRaw } from '../core/orthography.ts'
import type { VesumHit } from '../core/types.ts'

const H = (lemma: string, tags: string): VesumHit => ({ lemma, tags })
const hits = new Map<string, VesumHit[]>([
  ['діти', [H('дитина', 'noun:anim:p:v_naz'), H('діти', 'verb:perf:inf'), H('діти', 'verb:perf:inf:short')]], ['дитина', [H('дитина', 'noun:anim:f:v_naz')]],
  ['зима', [H('зима', 'noun:inanim:f:v_naz')]], ['зими', [H('зима', 'noun:inanim:f:v_rod'), H('зим', 'noun:inanim:p:v_naz')]],
])
const freq = new Map([['дитина', 45000], ['діти', 400]])
const env: Env = { hits, derive: (s, oldI) => deriveRaw(s, { oldI }), fold: (s, o) => foldRaw(s, o) }
const lemma = (t: Partial<TypeCtx>) => { const r = linkOptions({ lang: 'uk', oldI: false, raw: 'діти', ...t } as TypeCtx, env); return r ? chooseLemma(r.opts, freq)?.lemma : undefined }

describe('MM-61 noun / verb homonym діти', () => {
  it('without a model lemma the frequent noun wins (form route)', () => { expect(lemma({})).toBe('дитина') })
  it('the model lemma «діти» + UPOS NOUN no longer drags the noun token onto the verb card', () => { expect(lemma({ stanza: 'діти', softGate: 'U:NOUN' })).toBe('дитина') })
  it('a model that really says VERB keeps the verb reading; a model lemma that agrees with the noun is unchanged', () => {
    expect(lemma({ stanza: 'діти', softGate: 'U:VERB' })).toBe('діти'); expect(lemma({ stanza: 'дитина', softGate: 'U:NOUN' })).toBe('дитина')
  })
  it('no model POS at all (older shards): unchanged behaviour', () => { expect(lemma({ stanza: 'діти' })).toBe('діти') })
})

import { existsSync, readFileSync } from 'node:fs'
const LEX = new URL('../public/data/lexicon.json', import.meta.url)
describe('MM-61 real data (skips without public/data/lexicon.json; true after the build that carries the fix)', () => {
  it.skipIf(!existsSync(LEX))('the verb card діти is a small fraction of the noun дитина', () => {
    const j = JSON.parse(readFileSync(LEX, 'utf8')) as { cards: unknown[][] }
    const f = (c: unknown[]) => (c.find(x => Array.isArray(x) && x.length === 4 && typeof x[0] === 'number' && typeof x[1] === 'number') as number[] | undefined)?.[0] ?? 0
    const verb = j.cards.find(c => c[0] === 'діти' && /^дієслово/.test(String(c[1]))), noun = j.cards.find(c => c[0] === 'дитина')
    expect(verb && noun).toBeTruthy(); expect(f(verb!)).toBeLessThan(f(noun!) / 100)
  })
})
