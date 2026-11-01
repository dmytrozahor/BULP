/**
 * SPEC 63 MM-52 (owner: «проаналізуй цей же текст на галицькі форми … та додай все відсутнє»; text = Яцків, «Огні горять», 1902, OCR): Galician folds (core/gal-mm52.ts), the reverse guard,
 * the split tokens (separated «ся», fused -ж / -б, person clitics жеби'м), and the link step (pipelines/build-link.ts) on a hand-made VESUM fixture.
 */
import { describe, it, expect } from 'vitest'
import { fold as foldRaw } from '../core/orthography.ts'
import { withGal } from '../core/gal-folds.ts'
import { GEN_I_FOLD, UNCONTR_FOLD, GEM_FOLD, APOS_FOLD, PL1_M_FOLD, LONG_INF_FOLD, ZIYI_INF_FOLD, GENPL_IY_INF_FOLD, MM52_FOLDS, galGate, personClitic, splitFused, isReflNext, fusedHostOk } from '../core/gal-mm52.ts'
import { foldById } from '../core/orthography.ts'
import { derive as deriveRaw } from '../core/phonology.ts'
import { key } from '../core/text.ts'
import { variantFor, corrEvidence } from '../core/correspondences.ts'
import { chooseLemma, linkOptions, wantedKeys, type Env, type TypeCtx } from '../pipelines/build-link.ts'
import type { VesumHit } from '../core/types.ts'

const V: Record<string, [string, string][]> = {   // form → [lemma, tags]
  дід: [['дід', 'noun:anim:m:v_naz']], казав: [['казати', 'verb:imperf:past:m']], йшов: [['йти', 'verb:imperf:past:m']], мама: [['мама', 'noun:anim:f:v_naz']], мами: [['мама', 'noun:anim:f:v_rod']],
  щоб: [['щоб', 'conj:subord']], би: [['би', 'part']], жеби: [['жеби', 'conj:subord:arch']], що: [['що', 'conj:subord']], щось: [['щось', 'adv:insert']],
  люди: [['люди', 'noun:anim:p:v_naz']], дальні: [['дальній', 'adj:p:v_naz']], дальній: [['дальній', 'adj:m:v_naz']],
  ночі: [['ніч', 'noun:inanim:f:v_rod']], ніч: [['ніч', 'noun:inanim:f:v_naz']], земля: [['земля', 'noun:inanim:f:v_naz']], землі: [['земля', 'noun:inanim:f:v_rod']], лісі: [['ліс', 'noun:inanim:m:v_mis']], ліси: [['ліс', 'noun:inanim:p:v_naz']],
  питання: [['питання', 'noun:inanim:n:v_naz']], життю: [['життя', 'noun:inanim:n:v_dav']], життя: [['життя', 'noun:inanim:n:v_naz']], "п'ять": [['п\'ять', 'numr:v_naz']], "м'ясо": [['м\'ясо', 'noun:inanim:n:v_naz']],
  станції: [['станція', 'noun:inanim:f:v_rod']], партії: [['партія', 'noun:inanim:f:v_rod']], парти: [['парта', 'noun:inanim:p:v_naz']], діти: [['дитина', 'noun:anim:p:v_naz']], дітей: [['дитина', 'noun:anim:p:v_rod']], люди2: [],
  старався: [['старатися', 'verb:rev:imperf:past:m']], старав: [['старати', 'verb:imperf:past:m']], чому: [['чому', 'adv:pron:int']], ж: [['ж', 'part']], ніж: [['ніж', 'noun:inanim:m:v_naz']], ти: [['ти', 'noun:anim:p:v_naz:pron:pers:2']],
  курва: [['курва', 'noun:anim:f:v_naz:vulg']], поїдемо: [['поїхати', 'verb:perf:futr:p:1']], тамка: [['тамка', 'adv:pron:dem:arch']], бис: [['бис', 'noun:anim:m:v_naz']], абим: [], аби: [['аби', 'conj:subord']],
}
const hits = new Map<string, VesumHit[]>(Object.entries(V).map(([k, v]) => [key(k), v.map(([lemma, tags]) => ({ lemma, tags }))]))
const dm = new Map<string, ReturnType<typeof deriveRaw>>()
const env: Env = {
  hits,
  derive: (s, oldI) => { const k = (oldI ? '1' : '0') + s; let d = dm.get(k); if (!d) dm.set(k, d = deriveRaw(s, { oldI })); return d },
  fold: (s, orth) => withGal(foldRaw(s, orth ?? 'желехівка'), s),   // the build.ts wrapper
}
const t = (raw: string, extra: Partial<TypeCtx> = {}): TypeCtx => ({ lang: 'uk', oldI: false, raw, ...extra })
const link = (raw: string, extra: Partial<TypeCtx> = {}) => { const r = linkOptions(t(raw, extra), env), c = r && chooseLemma(r.opts, new Map()); return c ? { lemma: c.lemma, trace: c.cand.trace } : undefined }

describe('MM-52 the owner sentence «але дїд казав, жебиʼм йшов до курвої мами і ми тамка не поїдем»', () => {
  const sentence = 'але дїд казав, жебиʼм йшов до курвої мами і ми тамка не поїдем'
  it('every word of it that VESUM can confirm is linked; жебиʼм (= жеби + м) and дїд (= дід) included', () => {
    const toks = sentence.match(/[\p{L}'’ʼ]+/gu)!
    expect(toks).toHaveLength(13)
    expect(link('дїд')).toMatchObject({ lemma: 'дід', trace: ['ORTH-ZHEL-TY'] })
    expect(link('жебиʼм')).toMatchObject({ lemma: 'щоб', trace: ['ORTH-GAL-PCL'] })
    expect(link("жеби'м")?.lemma).toBe('щоб'); expect(link("жебиʼм")?.lemma).toBe('щоб'); expect(link('жеби’м')?.lemma).toBe('щоб')
    expect(link('тамка')?.lemma).toBe('тамка')
  })
  it('поїдем (short 1pl) is the rule ORTH-GAL-1PL-M when VESUM does not list it itself', () => {
    expect(link('поїдем')).toMatchObject({ lemma: 'поїхати', trace: ['ORTH-GAL-1PL-M'] })
  })
  it('MM-52b курвої (= курвиної, possessive adjective of курва reduced by the speaker) links to курва; evidence kind P, the owner quoted verbatim, locator SPEC 63 MM-52b', () => {
    expect(link('курвої')?.lemma).toBe('курва'); expect(link('курвого')?.lemma).toBe('курва'); expect(link('курвому')?.lemma).toBe('курва')
    const row = variantFor('курвої')!, ev = corrEvidence(row, 'курвої')
    expect(ev.kind).toBe('P'); expect(ev.quote).toBe('Курвої це прийменник від курва, редукований'); expect(ev.locator).toBe('SPEC 63 MM-52b')
    expect(ev.note).toContain('присвійний прикметник'); expect(ev.note).toContain('за свідченням носія')
  })
  it('MM-52b is not generalised: no cited pattern for the reduction of -ин- possessives, so мамин-type forms are untouched', () => {
    expect(link('мамої')).toBeUndefined(); expect(link('батької')).toBeUndefined()
  })
})

describe('MM-52 person clitics on жеби / би / аби / що (ЕУМ um162, um173)', () => {
  it.each([['жебим', 'жеби', 'м'], ["жеби'м", 'жеби', 'м'], ['жебиʼм', 'жеби', 'м'], ['жебись', 'жеби', 'сь'], ['жебисьмо', 'жеби', 'сьмо'], ['жебисте', 'жеби', 'сте'], ['бим', 'би', 'м'], ['бись', 'би', 'сь'], ['бисьмо', 'би', 'сьмо'], ['бисте', 'би', 'сте'], ['абим', 'аби', 'м'], ['абись', 'аби', 'сь'], ['щом', 'що', 'м'], ['щось', 'що', 'сь']])('%s = %s + -%s', (w, host, clitic) => {
    expect(personClitic(w)).toMatchObject({ host, clitic })
  })
  it('a person is stated for every clitic', () => { expect(personClitic('жебисьмо')!.person).toBe('1 особа мн.'); expect(personClitic('жебись')!.person).toBe('2 особа одн.') })
  it('the link never splits a form VESUM lists: щось stays щось, бис stays бис', () => {
    expect(link('щось')).toMatchObject({ lemma: 'щось', trace: [] })
    expect(link('бис')).toMatchObject({ lemma: 'бис', trace: [] })
  })
  it('жеби is linked to щоб (VF-ZHEBY, ЕУМ um174), бим / бись to the particle би', () => {
    expect(link('жеби')?.lemma).toBe('щоб'); expect(link('бим')).toMatchObject({ lemma: 'би', trace: ['ORTH-GAL-PCL'] }); expect(link('бись')?.lemma).toBe('би')
    expect(link('щом')?.lemma).toBe('що')
  })
})

describe('MM-52 the old lengthened / uncontracted endings (owner: «людии … людиї має вести до люди і всі аналогічні форми»)', () => {
  it('дальниї → дальній (full adjective ending, ЕУМ um174), the cite is a real quotation', () => {
    expect(UNCONTR_FOLD.apply('дальниї')).toBe('дальні'); expect(link('дальниї')).toMatchObject({ lemma: 'дальній', trace: ['ORTH-GAL-UNCONTR'] })
    expect(UNCONTR_FOLD.cite.kind).toBe('Q'); expect(UNCONTR_FOLD.cite.quote).toContain('нестягнені членні форми')
    expect(UNCONTR_FOLD.apply('добрії')).toBe('добрі'); expect(UNCONTR_FOLD.apply('добрая')).toBe('добра'); expect(UNCONTR_FOLD.apply('синєє')).toBe('синє'); expect(UNCONTR_FOLD.apply('добру́ю'.normalize('NFC').replace('́', ''))).toBe('добру')
  })
  it('людиї and людии → люди, graded зіставлено (kind P, no statement found)', () => {
    expect(LONG_INF_FOLD.apply('людиї')).toBe('люди'); expect(LONG_INF_FOLD.apply('людии')).toBe('люди')
    expect(link('людиї')).toMatchObject({ lemma: 'люди', trace: ['ORTH-GAL-LONG-INF'] }); expect(link('людии')).toMatchObject({ lemma: 'люди', trace: ['ORTH-GAL-LONG-INF'] })
    expect(LONG_INF_FOLD.cite.kind).toBe('P'); expect(LONG_INF_FOLD.cite.note).toContain('не знайдено')
  })
  it('-иї for -ії wins over the lengthened plural: станциї → станції, партиї → партії (not парти)', () => {
    expect(link('станциї')).toMatchObject({ lemma: 'станція', trace: ['ORTH-GAL-ZIYI-INF'] }); expect(link('партиї')?.lemma).toBe('партія')
    expect(ZIYI_INF_FOLD.cite.kind).toBe('P')
  })
  it('дітий / людий → дітей / людей (gen. pl. -ий), graded зіставлено', () => {
    expect(GENPL_IY_INF_FOLD.apply('дітий')).toBe('дітей'); expect(link('дітий')?.lemma).toBe('дитина'); expect(GENPL_IY_INF_FOLD.cite.kind).toBe('P')
  })
})

describe('MM-52 the other Galician folds', () => {
  it('-и for -і: ночи, земли → ночі, землі (ЕУМ um173, um162); the dative -ови is not this rule', () => {
    expect(GEN_I_FOLD.apply('земли')).toBe('землі'); expect(GEN_I_FOLD.apply('Славкови')).toBe('Славкови'); expect(GEN_I_FOLD.cite.quote).toContain('н')
    expect(link('ночи')).toMatchObject({ lemma: 'ніч', trace: ['ORTH-GAL-GEN-I'] }); expect(link('земли')?.lemma).toBe('земля')
  })
  it('no geminate: питаня, житю → питання, життю', () => {
    expect(GEM_FOLD.apply('питаня')).toBe('питання'); expect(GEM_FOLD.apply('житю')).toBe('життю'); expect(GEM_FOLD.apply('дрантє')).toBe('дрантя')
    expect(link('питаня')).toMatchObject({ lemma: 'питання', trace: ['ORTH-GAL-GEM'] }); expect(link('житю')?.lemma).toBe('життя')
  })
  it('no apostrophe: пять, мясо → п’ять, м’ясо (Желехівка quote)', () => {
    expect(APOS_FOLD.apply('пять')).toBe("п'ять"); expect(APOS_FOLD.apply('мясо')).toBe("м'ясо"); expect(link('пять')?.lemma).toBe("п'ять")
  })
  it('1pl -м: поїдем → поїдемо only for a 1st person plural verb', () => { expect(PL1_M_FOLD.apply('ходим')).toBe('ходимо') })
  it('separated «ся»: старав ся → старатися (Желехівка quote), without the next token the verb stays старати', () => {
    expect(isReflNext('ся')).toBe(true); expect(isReflNext('сь')).toBe(true); expect(isReflNext('сяк')).toBe(false); expect(isReflNext(undefined)).toBe(false)
    expect(link('старав', { refl: true })).toMatchObject({ lemma: 'старатися', trace: ['ORTH-GAL-SYA-SEP'] }); expect(link('старав')).toMatchObject({ lemma: 'старати', trace: [] })
  })
  it('fused particle: чомуж, тиж → чому, ти; ніж (VESUM) is not split; a preposition is no host', () => {
    expect(splitFused('чомуж')).toEqual({ host: 'чому', particle: 'ж' }); expect(link('чомуж')).toMatchObject({ lemma: 'чому', trace: ['ORTH-GAL-FUSED'] }); expect(link('тиж')?.lemma).toBe('ти')
    expect(link('ніж')).toMatchObject({ lemma: 'ніж', trace: [] }); expect(fusedHostOk('ж', 'prep')).toBe(false); expect(fusedHostOk('ж', 'adv:pron:int')).toBe(true)
  })
})

describe('MM-52 reverse guard: a form VESUM lists is never redirected', () => {
  it('лісі (VESUM) is not turned into any fold result; ліси is not read as лісі', () => {
    expect(link('лісі')).toMatchObject({ lemma: 'ліс', trace: [] }); expect(link('ліси')).toMatchObject({ lemma: 'ліс', trace: [] })
  })
  it('galGate drops a guarded option when the token itself is a VESUM form, and an option with the wrong analysis', () => {
    const o = (id: string, tags: string) => ({ cand: { trace: [id] }, hit: { tags } })
    expect(galGate([o('ORTH-GAL-GEN-I', 'noun:inanim:f:v_rod')], true)).toHaveLength(0)
    expect(galGate([o('ORTH-GAL-GEN-I', 'noun:inanim:f:v_rod')], false, undefined, 'ночи')).toHaveLength(1)
    expect(galGate([o('ORTH-GAL-GEN-I', 'verb:imperf:inf')], false, undefined, 'ночи')).toHaveLength(0)
    expect(galGate([o('ORTH-GAL-GEN-I', 'noun:inanim:m:v_naz:abbr')], false, undefined, 'бами')).toHaveLength(0)
    expect(galGate([o('ORTH-GAL-GEN-I', 'noun:inanim:f:v_rod')], false, undefined, 'пи')).toHaveLength(0)
    expect(galGate([o('ORTH-ZHEL-SOFT', 'noun:inanim:m:v_naz')], true, 'желехівка')).toHaveLength(1)   // a text WITH orth keeps the old behaviour
  })
})

describe('MM-52 every rule is cited, branches, and is registered', () => {
  it.each(MM52_FOLDS.map(f => [f.id, f] as const))('%s has a quote, branch: true, era [] and is in foldById', (id, f) => {
    expect(f.cite.quote.length).toBeGreaterThan(10); expect(f.branch).toBe(true); expect(f.era).toEqual([]); expect(foldById[id]).toBe(f)
    expect(id.endsWith('-INF') ? f.cite.kind === 'P' : f.cite.kind === 'Q').toBe(true)
  })
  it('the split-token steps are registered for the trace', () => { for (const id of ['ORTH-GAL-SYA-SEP', 'ORTH-GAL-FUSED', 'ORTH-GAL-PCL']) expect(foldById[id]).toBeDefined() })
  it('wantedKeys asks VESUM for the hosts of the split tokens', () => {
    expect(wantedKeys(t("жеби'м"), env)).toContain('жеби'); expect(wantedKeys(t('старав', { refl: true }), env)).toContain('старався'); expect(wantedKeys(t('чомуж'), env)).toContain('чому')
  })
})
