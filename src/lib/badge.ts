/** SPEC 63 DB-1: the badge chips of a lemma, shared by the page badge (DialectBadge) and the map markers (ArmsMarks) so they cannot disagree. Reads only lazy data (lm/lb, lm/cg) and the card already on view. */
import { computed } from 'vue'
import { firedRules } from '../../core/form-class.ts'
import { badgeChips, type BadgeChip } from '../../core/dialect-badge.ts'
import { useLabels } from './labelsData.ts'
import { corrOf } from './corrData.ts'
import { useData } from '../composables/useData.ts'

export function useBadge(lemma: () => string) {
  const { corpus, byLemma } = useData()
  const { entry, loading } = useLabels(lemma)
  const chips = computed<BadgeChip[]>(() => {
    const w = lemma(); if (!w || loading.value) return []
    const card = byLemma.value.get(w), fc = card?.forms.find(f => f.raw === w)
    const fired = fc ? firedRules(fc.claims).map(r => ({ id: r.id, code: r.code, feature: r.feature, cite: r.cite })) : []
    const name = (c: string) => corpus.value?.regions?.find(r => r.code === c)?.name ?? c
    return badgeChips({ d: entry.value.d, regionName: name, lemma: w, fired, groups: corrOf(w) ?? [] })
  })
  return { chips, loading }
}
