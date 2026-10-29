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

/** MM-43 adds the speaker qualifiers: 'author' (the author's / record's region), 'speaker' (a character's speech), 'folklore' (a folk record) */
export type FeatureQualifier = 'galician' | 'edition' | 'older' | 'neutral' | 'author' | 'speaker' | 'folklore'
export interface FeatureCtx { orth?: string; edition?: string; authorRegion?: string; witnessRegion?: string; year?: number; /** sub-area of the witness (e.g. a Transcarpathian говірка) when the witness metadata gives one; never guessed */ area?: string }
/** `dialect`: the dialect group the rule's own source names, for the dialect switch (OV agent). Absent when no source states one: the Желехівка statements are ORTHOGRAPHIC (how the edition writes), and no quote in the repo says which dialect group a spelling reflects (no cite, no link). */
export interface FeatureChip { rule: string; feature: string; label: string; qualifier: FeatureQualifier; text: string; cite: Evidence; dialect?: { group: string; source: string } }

const GALICIAN = /Галич|Львів|Прикарпатт|Покутт|Буковин|Лемківщ|Закарпатт|Підкарпатт/i
export const isGalician = (region?: string) => !!region && GALICIAN.test(region)
const place = (edition?: string) => /^([А-ЯІЇЄҐ][а-яіїєґ'’-]+)\s+(\d{4})/.exec(edition ?? '')?.slice(1, 3).join(' ')

interface Feature { label: string; feature: string; galician: string; edition: (p: string) => string; older?: string; /** the dialect group the rule's own source names */ dialect?: { group: string; source: string }; /** text for a witness without the Желехівка orthography whose author is not Galician (OCR editions): the form is named, no dialect is claimed */ neutral?: string }
/** MM-41 (ЕУМ um162): ÿ ü ӱ = the Transcarpathian reflex of о, е, ѣ in a new closed syllable. The area is the SOURCE's statement (ÿ < о: central говірки); the TEXT's own area is named only when the witness gives one (ctx.area). */
const ZAK_Y: Feature = { feature: 'закарпатське ÿ (рефлекс о / ѣ)', label: 'ÿ, ü, ӱ замість і, е, о (вÿс, кÿнь, хл’ÿў)', dialect: { group: 'ZAK', source: 'ЕУМ um162' },
  galician: 'закарпатське ÿ — так ЕУМ (um162) друкує закарпатський рефлекс давніх о, е, ѣ у новозакритому складі; стандартне слово — із і, е або о (вÿс = віз, кÿнь = кінь)',
  neutral: 'літера ÿ (ü, ӱ): так ЕУМ (um162) друкує закарпатський рефлекс давніх о, е, ѣ; діалект автора цього тексту не встановлено, район не заявляється',
  edition: p => `літера ÿ (ü, ӱ) у виданні${p ? ' ' + p : ''}: так ЕУМ (um162) друкує закарпатський рефлекс давніх о, е, ѣ; діалект автора не заявляється, район не заявляється` }
const ZAK_O: Feature = { feature: 'закарпатське ô (закрите о)', label: 'ô, ê замість о, е (хôжу, ôс’ін’)', dialect: { group: 'ZAK', source: 'ЕУМ um162' },
  galician: 'закарпатське ô — так ЕУМ (um162) друкує закрите о (ôс’ін’, хôжу); стандартне слово — з о',
  neutral: 'літера ô: так ЕУМ (um162) друкує закрите о закарпатських говорів; діалект автора цього тексту не встановлено, район не заявляється',
  edition: p => `літера ô у виданні${p ? ' ' + p : ''}: закрите о (ЕУМ um162); діалект автора не заявляється, район не заявляється` }
/** MM-40: -рдц- is the older (Middle Ukrainian) spelling; the source is our own corpus, no dialect is claimed */
const RDC_TXT = 'давніша форма (середньоукраїнське написання -рдц-: сердце, сердцем), діалект не заявляється'
const FEATURES: Record<string, Feature> = {
  'ORTH-ZAK-Y': ZAK_Y, 'ORTH-ZAK-Y-V': ZAK_Y, 'ORTH-ZAK-Y-E': ZAK_Y, 'ORTH-ZAK-Y-E-V': ZAK_Y, 'ORTH-ZAK-Y-O': ZAK_Y, 'ORTH-ZAK-Y-O-V': ZAK_Y, 'ORTH-ZAK-O': ZAK_O,
  'ORTH-RDC': { feature: 'давніша форма -рдц-', label: 'сердце, сердцем замість серце, серцем', galician: RDC_TXT, neutral: RDC_TXT, older: RDC_TXT, edition: p => `давніша форма (правопис видання${p ? ' ' + p : ''}), діалект не заявляється` },
  'ORTH-ZHEL-SOFT': { feature: 'асимілятивна м’якість', label: 'ь після с, з, ц перед губним (сьпів, сьвіт, цьвях)',
    galician: 'галицька вимова, передана желехівкою', edition: p => `західна (галицька) вимова, передана желехівкою (правопис видання${p ? ' ' + p : ''}), не діалект автора; діалектну належність джерело не називає (джерела не знайдено)` },
  'ORTH-ZHEL-INIT-I': { feature: 'початкове и- = [і]', label: 'и- на початку слова замість і- (инший)',
    galician: 'галицька форма', edition: p => `давніша / галицька форма (правопис видання${p ? ' ' + p : ''}), не діалект автора`, older: 'давніша форма' },
  'ORTH-ADJ-IISH': { feature: 'вищий ступінь на -ійш-', label: '-ійший / -ійше замість -іший / -іше (скорійше, новійший)', galician: 'галицька форма (Смаль-Стоцький: -ї(й)ший)', neutral: 'галицька (давніша) форма вищого ступеня, не діалектна ознака автора',
    edition: p => `галицька форма (правопис видання${p ? ' ' + p : ''}), не діалект автора`, older: 'давніша форма' },
  'ORTH-VERB-OVATI': { feature: 'інфінітив на -овати (давніший суфікс)', label: '-овати замість -увати (шановати, куповати)', galician: 'давніша форма (Огоновський: -ова-ти, нині -ува-ти)', neutral: 'давніша форма (суфікс -ова-, нині -ува-), не діалектна ознака автора',
    edition: p => `давніша форма (правопис видання${p ? ' ' + p : ''}), не діалект автора`, older: 'давніша форма' },
  'ORTH-DAT-OVI': { feature: 'давальний відмінок на -ові на незміненій основі (західна форма)', label: 'міст-ові, містові замість мостові (без чергування о / і)', galician: 'західна форма (галицька)', neutral: 'західна форма давального відмінка на -ові, не діалектна ознака автора',
    edition: p => `західна форма (правопис видання${p ? ' ' + p : ''}), не діалект автора` },
  'ORTH-PART-HYPH': { feature: 'частка через дефіс', label: 'ж, б, бо, но, то, го через дефіс (прийми-ж, було-б, видів-го)', galician: 'давній / галицький правопис частки', neutral: 'давній / галицький правопис частки через дефіс',
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
    const base = qualifier === 'galician' ? f.galician : qualifier === 'older' ? f.older! : qualifier === 'neutral' ? f.neutral! : f.edition(place(ctx.edition) ?? '')
    out.push({ rule: id, feature: f.feature, label: f.label, qualifier, cite: fold.cite, ...(f.dialect ? { dialect: f.dialect } : {}),
      text: f.dialect && ctx.area ? `${base}; район за даними свідка: ${ctx.area}` : base })
  }
  return out
}
export const FEATURE_RULES: readonly string[] = ZHEL_FOLDS.map(f => f.id).filter(id => id in FEATURES)
/** every rule that has a chip (Желехівка folds and the Galician-grammar folds) */
export const FEATURE_RULE_IDS: readonly string[] = Object.keys(FEATURES)
