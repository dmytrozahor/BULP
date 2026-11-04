/** SPEC 63 DB-1 / DB-2: the badge chips of a lemma (main chip = the region of the earliest reliable attestation, then the secondary chips), shared by the page badge (DialectBadge) and the map markers (ArmsMarks) so they cannot disagree. Reads only lazy data (lm/lb, lm/fr, lm/cg) and the card already on view. */
import { computed } from 'vue'
import { firedRules } from '../../core/form-class.ts'
import { badgeWithFirst } from '../../core/dialect-first.ts'
import type { BadgeChip } from '../../core/dialect-badge.ts'
import { useLabels } from './labelsData.ts'
import { corrOf } from './corrData.ts'
import { frLoaded, frPeek } from './firstData.ts'
import { useData } from '../composables/useData.ts'

export function useBadge(lemma: () => string) {
  const { corpus, byLemma } = useData()
  const { entry, loading: lbLoading } = useLabels(lemma)
  const loading = computed(() => lbLoading.value || !frLoaded(lemma()))
  const chips = computed<BadgeChip[]>(() => {
    const w = lemma(); if (!w || loading.value) return []
    const card = byLemma.value.get(w), fc = card?.forms.find(f => f.raw === w)
    const fired = fc ? firedRules(fc.claims).map(r => ({ id: r.id, code: r.code, feature: r.feature, cite: r.cite })) : []
    const name = (c: string) => corpus.value?.regions?.find(r => r.code === c)?.name ?? c
    const fr = frPeek(w)
    return badgeWithFirst({ d: entry.value.d, regionName: name, lemma: w, fired, groups: corrOf(w) ?? [], ...(fr ? { fr } : {}) })
  })
  return { chips, loading }
}
