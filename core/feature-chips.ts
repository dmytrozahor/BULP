/**
 * SPEC 63 MM-16: form-level FEATURE chips (visible spelling / pronunciation properties of a cited rule), with a qualifier that says whose feature it is.
 * A chip exists only for a rule that carries a verbatim source (the fold's own `cite`, core/zhel-folds.ts); no cite, no chip.
 *
 * The qualifier is the point (owner, MM-16): Грінченко («Під хмарним небом», Львів 1893, НТШ) is a Slobozhanian printed in the Galician orthography (Желехівка), so «сьпівати» there is
 * the EDITION's spelling, not the author's dialect. For a Galician-authored witness the same spelling may be called Galician pronunciation. An older (pre-1800), non-Желехівка text with
 * initial и- (иньшій) shows an older form, not a dialect.
 *
 * Unlike a CONTACT label (суржик, покруч, русизм: the origin of a form, form level only, MM-9 rule 2), a feature chip marks a visible property wherever it occurs (form, lemma headword, text token).
 */
import type { Evidence } from './evidence.ts'
import { foldById } from './orthography.ts'
import { ZHEL_FOLDS } from './zhel-folds.ts'

export type FeatureQualifier = 'galician' | 'edition' | 'older' | 'neutral'
export interface FeatureCtx { orth?: string; edition?: string; authorRegion?: string; witnessRegion?: string; year?: number }
/** `dialect`: the dialect group the rule's own source names, for the dialect switch (OV agent). Absent when no source states one: the Желехівка statements are ORTHOGRAPHIC (how the edition writes), and no quote in the repo says which dialect group a spelling reflects (no cite, no link). */
export interface FeatureChip { rule: string; feature: string; label: string; qualifier: FeatureQualifier; text: string; cite: Evidence; dialect?: { group: string; source: string } }

const GALICIAN = /Галич|Львів|Прикарпатт|Покутт|Буковин|Лемківщ|Закарпатт|Підкарпатт/i
export const isGalician = (region?: string) => !!region && GALICIAN.test(region)
const place = (edition?: string) => /^([А-ЯІЇЄҐ][а-яіїєґ'’-]+)\s+(\d{4})/.exec(edition ?? '')?.slice(1, 3).join(' ')

interface Feature { label: string; feature: string; galician: string; edition: (p: string) => string; older?: string; /** text for a witness without the Желехівка orthography whose author is not Galician (OCR editions): the form is named, no dialect is claimed */ neutral?: string }
const FEATURES: Record<string, Feature> = {
  'ORTH-ZHEL-SOFT': { feature: 'асимілятивна м’якість', label: 'ь після с, з, ц перед губним (сьпів, сьвіт, цьвях)',
    galician: 'галицька вимова, передана желехівкою', edition: p => `західна (галицька) вимова, передана желехівкою (правопис видання${p ? ' ' + p : ''}), не діалект автора` },
  'ORTH-ZHEL-INIT-I': { feature: 'початкове и- = [і]', label: 'и- на початку слова замість і- (инший)',
    galician: 'галицька форма', edition: p => `давніша / галицька форма (правопис видання${p ? ' ' + p : ''}), не діалект автора`, older: 'давніша форма' },
  'ORTH-ADJ-IISH': { feature: 'вищий ступінь на -ійш-', label: '-ійший / -ійше замість -іший / -іше (скорійше, новійший)', galician: 'галицька форма (Смаль-Стоцький: -ї(й)ший)', neutral: 'галицька (давніша) форма вищого ступеня, не діалектна ознака автора',
    edition: p => `галицька форма (правопис видання${p ? ' ' + p : ''}), не діалект автора`, older: 'давніша форма' },
  'ORTH-VERB-OVATI': { feature: 'інфінітив на -овати (давніший суфікс)', label: '-овати замість -увати (шановати, куповати)', galician: 'давніша форма (Огоновський: -ова-ти, нині -ува-ти)', neutral: 'давніша форма (суфікс -ова-, нині -ува-), не діалектна ознака автора',
    edition: p => `давніша форма (правопис видання${p ? ' ' + p : ''}), не діалект автора`, older: 'давніша форма' },
  'ORTH-PART-HYPH': { feature: 'частка через дефіс', label: 'ж, б, бо, но, то через дефіс (прийми-ж, було-б)', galician: 'давній / галицький правопис частки', neutral: 'давній / галицький правопис частки через дефіс',
    edition: p => `давній / галицький правопис частки (правопис видання${p ? ' ' + p : ''}), не діалект автора`, older: 'давній правопис частки' },
  'ORTH-ZHEL-JE-OBL': { feature: 'відмінкове -єм замість -ям (бажанєм)', label: '-нєм / -тєм замість -нням / -ттям',
    galician: 'галицьке написання -є (Желехівка)', edition: p => `написання -є за правописом видання${p ? ' ' + p : ''} (Желехівка), не діалект автора` },
  'ORTH-ZHEL-JE': { feature: 'закінчення -є замість -я (бажанє, житє, знанє)', label: '-нє / -тє / -лє замість -ння / -ття / -лля',
    galician: 'галицьке написання -є (Желехівка)', edition: p => `написання -є за правописом видання${p ? ' ' + p : ''} (Желехівка: «відповідно до наддніпрянського я»), не діалект автора` },
}

/** `rules` = ids found in a form's derivation / fold trace; one chip per cited feature rule. */
export function featureChips(rules: readonly string[], ctx: FeatureCtx = {}): FeatureChip[] {
  const out: FeatureChip[] = [], seen = new Set<string>()
  for (const id of rules) {
    const f = FEATURES[id], fold = foldById[id]
    if (!f || !fold || seen.has(id)) continue
    seen.add(id)
    const galicia = isGalician(ctx.authorRegion ?? ctx.witnessRegion)
    const zhel = ctx.orth === 'желехівка'
    const qualifier: FeatureQualifier = galicia ? 'galician' : f.older && !zhel && (ctx.year ?? 9999) < 1800 ? 'older' : f.neutral && !zhel ? 'neutral' : 'edition'
    out.push({ rule: id, feature: f.feature, label: f.label, qualifier, cite: fold.cite,
      text: qualifier === 'galician' ? f.galician : qualifier === 'older' ? f.older! : qualifier === 'neutral' ? f.neutral! : f.edition(place(ctx.edition) ?? '') })
  }
  return out
}
export const FEATURE_RULES: readonly string[] = ZHEL_FOLDS.map(f => f.id).filter(id => id in FEATURES)
