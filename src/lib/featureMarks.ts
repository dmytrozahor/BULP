/**
 * SPEC 63 MM-16 (owner: «підкреслюй де це видно»): which cited feature rules (core/feature-chips.ts) a token's spelling shows, for the text view, the annotator and the lemma header.
 * Computed on demand from the rules themselves, no new data: a rule marks a spelling only when it APPLIES to it and the folded form is a known word (so a legitimate -овати verb or a
 * hyphenated word the lexicon knows is never marked). Rules bound to an orthography (Желехівка) apply only to witnesses of that orthography.
 */
import { key } from '../../core/text.ts'
import { foldById } from '../../core/orthography.ts'
import { FEATURE_RULE_IDS, featureChips, type FeatureChip, type FeatureCtx } from '../../core/feature-chips.ts'

export function featureMarks(raw: string, ctx: FeatureCtx, known: (k: string) => boolean): FeatureChip[] {
  const k = key(raw)
  if (!k || known(k)) return []
  const ids = FEATURE_RULE_IDS.filter(id => {
    const f = foldById[id]; if (!f) return false
    if (f.era.length && !(ctx.orth && f.era.includes(ctx.orth))) return false
    const out = f.apply(k)
    return out !== k && known(key(out))
  })
  return featureChips(ids, ctx)
}
/** one-line tooltip: the feature, its qualifier text and the rule id */
export const markTitle = (cs: FeatureChip[]) => cs.map(c => `${c.feature}: ${c.text} (${c.rule})`).join(' · ')
