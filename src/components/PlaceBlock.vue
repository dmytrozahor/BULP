<script setup lang="ts">
import { isOldForm } from '../lib/nav.ts'
/** NP-1/NP-3 word-card block «Власна назва / на мапі»: proper-name claim, the gazetteer row (Wikidata QID, coordinates), the spelling-variant cluster and a link to /map. */
import { computed, onMounted, ref } from 'vue'
import { isKnown } from '../../core/evidence.ts'
import { NAME_KIND_UK, placeClaim, type PlaceOut } from '../../core/places.ts'
import type { CoreCard } from '../../core/types.ts'
import { loadPlaces, osmLink, placeForLemma } from '../lib/placesData.ts'
import { fmtDate } from '../lib/format.ts'
import ClaimBadge from './ClaimBadge.vue'
const props = defineProps<{ card: Pick<CoreCard, 'lemma' | 'claims'> }>()
const place = ref<PlaceOut>()
onMounted(() => { loadPlaces().then(d => { place.value = placeForLemma(d.places, props.card.lemma) }).catch(() => { /* optional data */ }) })
const proper = computed(() => props.card.claims.proper)
const kind = computed(() => (proper.value && isKnown(proper.value) ? NAME_KIND_UK[proper.value.value] : ''))
const claim = computed(() => (place.value ? placeClaim(place.value) : undefined))
</script>

<template>
  <section v-if="proper || place" class="card" aria-labelledby="h-place">
    <h2 id="h-place"><span>Власна назва · на мапі</span></h2>
    <p v-if="proper" class="sans small"><span class="muted">тип: </span><ClaimBadge :claim="proper" :text="kind" /></p>
    <template v-if="place && claim">
      <p class="sans small">
        <ClaimBadge :claim="claim" :text="`${place.name} · ${place.qid}`" />
        <span class="muted"> {{ place.pt[0].toFixed(3) }}°N {{ place.pt[1].toFixed(3) }}°E</span>
        · <RouterLink :to="{ path: '/map', query: { place: place.id } }">на мапі →</RouterLink>
        · <a :href="osmLink(place.pt[0], place.pt[1])" target="_blank" rel="noopener">OpenStreetMap ↗</a>
      </p>
      <p v-if="place.note" class="sans small muted">{{ place.note }}</p>
      <p class="sans small"><span class="muted">написання в корпусі ({{ place.n }} токенів у {{ place.nW }} пам’ятках): </span>
        <span v-for="v in place.variants.slice(0, 14)" :key="v.raw" :class="['lang', { old: isOldForm(v.raw, v.date[1]) }]" style="margin-right:.6rem" :title="`${v.w}, ${v.loc}, ${fmtDate(v.date)}`">{{ v.raw }}<small class="muted">×{{ v.f }}</small></span></p>
      <p v-if="place.recon.length" class="sans small"><span class="muted">реконструкції зі сучасної назви (гіпотези, правила R…): </span>
        <span v-for="r in place.recon" :key="r.form" class="derived" style="margin-right:.6rem" :title="r.rules.join('+')">{{ r.form }}<small v-if="r.confirmed"> ✓ є в корпусі</small></span></p>
    </template>
  </section>
</template>
