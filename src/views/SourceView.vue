<script setup lang="ts">
/**
 * BL-16 /source/:id — in-site card of a reference work from the SOURCES registry: bibliography, licence, every verbatim quote we hold (with locators)
 * and every place on the site that cites it (lemma cards, /method rules and epochs). Copyrighted works are represented by our quotes, never hosted in full;
 * the external URL is the secondary «оригінал ↗».
 */
import { computed, onMounted, ref } from 'vue'
import { SOURCES } from '../../core/sources.ts'
import { RULES } from '../../core/phonology.ts'
import { EPOCHS } from '../../core/epochs.ts'
import { CS_RULES, CONTACT_RULES, DIALECT_RULES, REGISTER_RULES, RUSYN_RULES } from '../../core/rules.ts'
import { useData } from '../composables/useData.ts'
import { collectQuotes, type HeldQuote } from '../lib/sourceQuotes.ts'
import { epochTo, ruleTo, witnessTo, wordTo } from '../lib/nav.ts'
import { KIND_UK } from '../lib/format.ts'
import { loadSociolect, sociolectFile } from '../lib/sociolectData.ts'
const props = defineProps<{ id: string }>()
const { loaded, cards, witnessById } = useData()
const src = computed(() => SOURCES[props.id])
const wit = computed(() => witnessById.value.get(props.id))
const held = ref<HeldQuote[]>([]), busy = ref(true)
function scan() {
  const into = new Map<string, HeldQuote>(), id = props.id
  for (const r of [...RULES, ...CS_RULES, ...CONTACT_RULES, ...DIALECT_RULES, ...RUSYN_RULES, ...REGISTER_RULES]) collectQuotes(r, id, { label: r.id, to: ruleTo(r.id) }, into)
  for (const e of EPOCHS) collectQuotes(e, id, { label: e.id, to: epochTo(e.id) }, into)
  for (const c of cards.value) { if (into.size >= 200) break; collectQuotes(c, id, { label: c.lemma, to: wordTo(c.lemma) }, into) }
  loadSociolect(); const sf = sociolectFile.value   // SL: Plast entries and process rows are quotes of their sources too
  if (sf) {
    for (const e of sf.plast.entries) collectQuotes({ source: sf.plast.source, locator: e.loc, quote: e.g, kind: 'D' }, id, { label: e.w, to: wordTo(e.w) }, into)
    for (const r of sf.processes) collectQuotes({ source: r.source, locator: r.loc, quote: r.quote, kind: 'Q' }, id, { label: r.w, to: wordTo(r.w) }, into)
  }
  held.value = [...into.values()]; busy.value = false
}
onMounted(() => { const go = () => (loaded.value ? scan() : setTimeout(go, 150)); go() })
</script>

<template>
  <p class="small sans"><RouterLink to="/method">← метод і джерела</RouterLink></p>
  <template v-if="src">
    <h1>{{ src.title }}</h1>
    <p class="sans small"><code>{{ id }}</code><template v-if="src.year"> · {{ src.year }}</template><template v-if="src.license"> · ліцензія: {{ src.license }}</template>
      <template v-if="src.url"> · <a :href="src.url" target="_blank" rel="noopener">оригінал ↗</a></template></p>
    <p class="small sans muted">Захищені авторським правом праці тут представлені лише нашими цитатами (≤ 300 знаків) з локаторами, повного тексту ми не розміщуємо.</p>
    <h2>Цитати, які ми маємо ({{ held.length }}<template v-if="held.length >= 200">+</template>)</h2>
    <div v-if="busy" class="skeleton" style="height:4rem" />
    <p v-else-if="!held.length" class="muted small sans">У зібраних даних цитат із цього джерела немає.</p>
    <div v-for="(h, i) in held" :key="i" class="ev">
      <span :class="['kind', 'kind-' + h.ev.kind]">{{ h.ev.kind }} {{ KIND_UK[h.ev.kind] }}</span>
      <span class="small"><span class="muted">локатор: </span>{{ h.ev.locator }}</span>
      <blockquote>{{ h.ev.quote }}</blockquote>
      <div class="small sans"><span class="muted">де цитується ({{ h.nPlaces }}): </span>
        <template v-for="(p, j) in h.places" :key="p.to"><template v-if="j">, </template><RouterLink :to="p.to">{{ p.label }}</RouterLink></template></div>
    </div>
  </template>
  <template v-else-if="wit">
    <p class="card">«{{ id }}» — пам’ятка корпусу. <RouterLink :to="witnessTo(id)">Відкрити картку пам’ятки →</RouterLink></p>
  </template>
  <p v-else-if="loaded" class="card muted" role="status">Джерела «{{ id }}» немає в реєстрі. <RouterLink to="/method">Метод</RouterLink>.</p>
</template>
