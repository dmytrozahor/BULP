/**
 * SPEC 63 MM-37, owner file «засьпіваєш діалектна форма сь перед губним у Грінченка 1893.png» (Грінченко / Чайченко, «Під хмарним небом», Львів 1893, НТШ):
 * сь / зь / ць before a hard labial is the Желехівка spelling of the edition (cited, uk.wikipedia «Желехівка»); the dialect group is NOT stated by any source in the repo.
 */
import { describe, it, expect } from 'vitest'
import { fold } from '../core/orthography.ts'
import { withGal, toTsya, TSYA_PHON_FOLD } from '../core/gal-folds.ts'
import { featureChips } from '../core/feature-chips.ts'
import { wordRules } from '../core/word-rules.ts'
import { unknown } from '../core/evidence.ts'
import { emptyLex } from '../src/lib/analyze.ts'
import { annotate, type AnnotateData } from '../src/lib/annotate.ts'
import { featureMarks } from '../src/lib/featureMarks.ts'

const GRIN = { orth: 'желехівка', edition: 'Львів 1893, Наукове товариство ім. Шевченка', authorRegion: 'Слобожанщина' }
const forms = (w: string) => withGal(fold(w, 'желехівка')).map(c => c.form)
const data = (pairs: [string, string][]) => ({ ...emptyLex(), search: { map: new Map(pairs.map(([k, l]) => [k, [{ lemma: l, form: k, via: 'paradigm' }]])), keys: [] },
  cards: new Map(pairs.map(([, l]) => [l, { lemma: l, claims: { register: unknown(), origin: unknown(), dialect: {} }, first: unknown(), forms: [] }])) }) as unknown as AnnotateData

describe('MM-37 сь / зь / ць + labial → с / з / ц for linking (every labial of the cited statement)', () => {
  it.each([['засьпіваєш', 'заспіваєш'], ['сьпіви', 'співи'], ['засьміється', 'засміється'], ['сьвіт', 'світ'], ['цьвях', 'цвях'], ['зьвір', 'звір'], ['сьбити', 'сбити']])('%s → %s', (a, b) => {
    expect(forms(a)).toContain(b)
  })
  it('the text-view mark: засьпіваєш in a Желехівка witness carries ORTH-ZHEL-SOFT with the edition qualifier; no dialect group is claimed', () => {
    const m = featureMarks('засьпіваєш', GRIN, k => k === 'заспіваєш')
    expect(m.map(c => c.rule)).toEqual(['ORTH-ZHEL-SOFT']); expect(m[0]!.qualifier).toBe('edition')
    expect(m[0]!.text).toContain('правопис видання Львів 1893'); expect(m[0]!.text).toContain('не діалект автора'); expect(m[0]!.text).toContain('джерела не знайдено')
    expect(m[0]!.dialect).toBeUndefined(); expect(m[0]!.cite.quote).toContain('твердою губною')
  })
  it('the annotator links засьпіваєш → заспівати and gives the feature', () => {
    const t = annotate('засьпіваєш', data([['заспіваєш', 'заспівати']]))[0]!
    expect(t.lemma).toBe('заспівати'); expect(t.features).toEqual(['ORTH-ZHEL-SOFT'])
  })
  it('Аналіз слова / shared wordRules: a pair with the chip for a word with no witness context', () => {
    const w = wordRules('засьпіваєш', { known: k => k === 'заспіваєш' })
    expect(w.pairs.map(p => [p.rule, p.to])).toEqual([['ORTH-ZHEL-SOFT', 'заспіваєш']]); expect(w.pairs[0]!.text).toContain('джерела не знайдено')
    expect(featureChips(['ORTH-ZHEL-SOFT'], {})[0]!.qualifier).toBe('edition')
    expect(wordRules('заспіваєш', { known: () => true }).pairs).toEqual([])   // a known word gets nothing
  })
})

describe('MM-37 -тьця / -цця = -ться (сьпіваютьця, засьміетця)', () => {
  it('toTsya', () => {
    expect(toTsya('співаютьця')).toBe('співаються'); expect(toTsya('співаютця')).toBe('співаються'); expect(toTsya('сміється')).toBe('сміється')
    expect(toTsya('засміетця')).toBe('засміється'); expect(toTsya('місяця')).toBe('місяця')
  })
  it('the build/annotator candidates of сьпіваютьця include співаються; the fold has no source and therefore no chip', () => {
    expect(forms('сьпіваютьця')).toContain('співаються'); expect(forms('засьміетця')).toContain('засміється')
    expect(TSYA_PHON_FOLD.cite.source).toBe('OWNER'); expect(TSYA_PHON_FOLD.cite.note).toContain('не знайдено')
    expect(featureChips(['ORTH-TSYA-PHON'], GRIN)).toEqual([])
    expect(annotate('сьпіваютьця', data([['співаються', 'співатися']]))[0]!.lemma).toBe('співатися')
  })
})
