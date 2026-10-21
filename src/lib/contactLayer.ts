/**
 * SPEC 63 MM-9 rule 2 (owner 2026-10-21): contact labels (суржик, покруч, русизм, контактне…) are shown ONLY at the form / spelling level
 * (/f form view, spelling sub-cards, the annotator's token chip), never on the main lemma card or its header. The lemma-level `claims.surzhyk` stays in the data
 * as an aggregate for statistics and search, and is not drawn on the lemma card.
 */
import type { Claim } from '../../core/evidence.ts'
import { isKnown } from '../../core/evidence.ts'
import type { CoreCard, CoreForm } from '../../core/types.ts'
import { categoryOf } from './analyze.ts'

/** the chips of the lemma card header: origin, register, dialect, and NEVER the contact layer */
export function lemmaChipKeys(c: CoreCard['claims'], dialects: number): { origin: boolean; register: boolean; dialect: boolean } {
  return { origin: isKnown(c.origin), register: isKnown(c.register), dialect: dialects > 0 }
}
/** the form's own contact-layer claims (label category `contact`): what the form sub-card shows as «контактне / суржик» */
export function formContactClaims(f: Pick<CoreForm, 'claims'> | undefined): Record<string, Claim<true>> {
  return Object.fromEntries(Object.entries(f?.claims ?? {}).filter(([label, cl]) => categoryOf(label) === 'contact' && cl.value !== ('unknown' as never)))
}
