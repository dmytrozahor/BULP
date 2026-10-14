<script setup lang="ts">
/**
 * SPEC 63 DP-4: the «діалектні варіанти» block of a standard pronoun's card (той → тамтой, отой, тот; цей → оцей; сей → сесь) and, on a variant lemma's card,
 * the back-link to its standard lemma. Per variant: dialect claims (group from the gazetteer / the named говір, evidence popover), the rule-derived paradigm
 * (every form a link to its /f page), the corpus attestation of the variant lemma and what the sources do not say. FD-4: one class table per derived cell.
 * Renders nothing for lemmas without DP variants.
 */
import { computed } from 'vue'
import { isKnown } from '../../core/evidence.ts'
import { DIALECTS } from '../../core/rules.ts'
import { cellKey, formClass, type CardLike } from '../../core/form-class.ts'
import { deriveVariant, variantById, variantClaims, variantsOfStd } from '../../core/pronoun-variants.ts'
import { useData } from '../composables/useData.ts'
import { fmtDate } from '../lib/format.ts'
import { dialectTo, formTo, wordTo } from '../lib/nav.ts'
import EvidencePopover from './EvidencePopover.vue'
import FormClassTable from './FormClassTable.vue'
const props = defineProps<{ lemma: string }>()
const { byLemma, fullOf } = useData()
const asVariant = computed(() => variantById(props.lemma))
const std = computed(() => byLemma.value.get(asVariant.value?.std ?? props.lemma))
const variants = computed(() => (std.value ? variantsOfStd(std.value.lemma) : []))
const rows = computed(() => variants.value.map(v => {
  const forms = deriveVariant(v, std.value!.paradigm)
  const card = byLemma.value.get(v.id)
  const first = card && isKnown(card.first) ? (card.first.value as { date: [number, number]; witness: string; author: string }) : undefined
  return { v, forms, card, first, claims: variantClaims(v), cells: [...new Set(forms.map(f => cellKey(f.tags)))] }
}))
const cardsFor = computed<CardLike[]>(() => [std.value, ...variants.value.map(v => byLemma.value.get(v.id))].filter(Boolean).map(c => (fullOf(c) ?? c) as CardLike))
const derivedAll = computed(() => rows.value.flatMap(r => r.forms))
const cellTables = computed(() => [...new Set(derivedAll.value.map(f => cellKey(f.tags)))].slice(0, 12).map(cell => ({ cell, members: formClass(cell, cardsFor.value, derivedAll.value) })).filter(t => t.members.length > 1))
const SCOPE = { full: 'повна парадигма (джерело: відмінюється як стандартна лема)', nominative: 'лише називний відмінок (джерела описують тільки його; непрямі форми не виводимо)' }
</script>

<template>
  <section v-if="rows.length" class="card dialect-variants" aria-label="діалектні варіанти">
    <h2><span>Діалектні варіанти</span><span class="small">{{ asVariant ? `варіант леми «${asVariant.std}»` : `${rows.length} варіантів` }}</span></h2>
    <p v-if="asVariant" class="small sans">Це діалектний варіант займенника <RouterLink :to="wordTo(asVariant.std)">{{ asVariant.std }}</RouterLink> (зв’язок <code>dialect-variant</code>, правило: {{ asVariant.op.kind === 'prefix' ? `префікс «${asVariant.op.p}» + форми стандартної леми` : `основа «${asVariant.op.from}» → «${asVariant.op.to}»` }}).</p>
    <div v-for="r in rows" :key="r.v.id" class="sans" style="margin:.6rem 0" :aria-current="r.v.id === lemma ? 'true' : undefined">
      <div>
        <RouterLink v-if="r.card" :to="wordTo(r.v.id)" class="lang" style="font-size:1.1rem"><strong>{{ r.v.id }}</strong></RouterLink><strong v-else class="lang" style="font-size:1.1rem">{{ r.v.id }}</strong>
        <span class="badge" title="маршрут зв’язку зі стандартною лемою">dialect-variant → {{ r.v.std }}</span>
        <template v-for="(c, i) in r.claims" :key="i">
          <RouterLink v-if="c.code" :to="dialectTo(c.code)" class="badge dialect">{{ DIALECTS[c.code] }}</RouterLink>
          <span v-else class="badge" title="джерело не називає групу, а газетьєр AC не має такого регіону">група не встановлена</span>
          <EvidencePopover :evidence="c.evidence" :heading="`«${r.v.id}»${c.region ? ' · ' + c.region : ''}`" :label="r.v.id"><span class="badge">ⓘ</span></EvidencePopover>
        </template>
      </div>
      <p class="small muted" style="margin:.2rem 0">{{ SCOPE[r.v.scope] }}
        <EvidencePopover :evidence="[r.v.scopeEv]" heading="Обсяг парадигми" :label="r.v.id"><span class="badge">ⓘ</span></EvidencePopover>
        <template v-if="r.first"> · у корпусі: від {{ fmtDate(r.first.date) }}, f = {{ r.card!.stats.f }}</template><template v-else> · у корпусі як лема не засвідчено</template></p>
      <p class="small" style="margin:.2rem 0;line-height:1.7"><template v-for="f in r.forms" :key="f.form + f.tags">
        <RouterLink :to="formTo(f.form, r.card ? r.v.id : undefined)" class="lang" :title="`${f.tags} ← ${f.stdForm} (${f.rule})`">{{ f.form }}</RouterLink>{{ ' ' }}</template></p>
      <ul class="small muted" style="margin:.2rem 0 0 1rem"><li v-for="(c, i) in r.claims.filter(c => c.note)" :key="i">{{ c.note }}</li></ul>
    </div>
    <p class="small muted sans">Форми виведено правилом із парадигми стандартної лами (ВЕСУМ, теги дослівно в підказці); це не словникові статті. Походження варіанта в сусідніх мовах (пол. tamten) джерелами не названо.</p>
    <details v-if="cellTables.length" class="small sans"><summary>таблиці клітинок: варіант → діалектна група → докази → найраніше → f ({{ cellTables.length }})</summary>
      <FormClassTable v-for="t in cellTables" :key="t.cell" :members="t.members" :caption="t.cell" />
    </details>
  </section>
</template>
