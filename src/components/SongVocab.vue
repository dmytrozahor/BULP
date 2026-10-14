<script setup lang="ts">
/**
 * BL-18: the words of a song as a clickable list — lemma (→ /w/<lemma>) with its spellings and counts (→ /f/<spelling>?lemma=). Counts only, never running text (authored songs).
 * A lemma / spelling the corpus does not hold is shown plain: no link leads to an empty page.
 */
import { computed } from 'vue'
import { key } from '../../core/text.ts'
import { useData } from '../composables/useData.ts'
import { formTo, wordTo } from '../lib/nav.ts'
const props = defineProps<{ lemmas: [string, number, [string, number][]][]; unresolved?: [string, number][] }>()
const { byLemma } = useData()
const hasForm = (lemma: string, form: string) => !!byLemma.value.get(lemma)?.forms.some(f => key(f.raw) === key(form))
const total = computed(() => props.lemmas.reduce((s, l) => s + l[1], 0))
</script>

<template>
  <div class="songvocab sans">
    <p class="small muted">{{ lemmas.length }} лем, {{ total }} слововживань<template v-if="unresolved?.length"> · без леми: {{ unresolved.reduce((s, u) => s + u[1], 0) }}</template></p>
    <ul class="vocab">
      <li v-for="[lemma, f, forms] in lemmas" :key="lemma">
        <RouterLink v-if="byLemma.has(lemma)" :to="wordTo(lemma)" class="lem">{{ lemma }}</RouterLink><span v-else class="lem">{{ lemma }}</span>
        <span class="muted small"> ×{{ f }}</span>
        <span class="small"> · <template v-for="([form, n], i) in forms" :key="form"><template v-if="i">, </template><RouterLink v-if="hasForm(lemma, form)" :to="formTo(form, lemma)">{{ form }}</RouterLink><template v-else>{{ form }}</template><span v-if="n > 1" class="muted"> ×{{ n }}</span></template></span>
      </li>
    </ul>
    <p v-if="unresolved?.length" class="small muted">Без леми (форма невпізнана або неоднозначна — не вгадуємо): <template v-for="([form, n], i) in unresolved" :key="form"><template v-if="i">, </template>{{ form }}<span v-if="n > 1"> ×{{ n }}</span></template></p>
  </div>
</template>

<style scoped>
.vocab { list-style: none; padding: 0; margin: .4rem 0; columns: 18rem; column-gap: 1.5rem; }
.vocab li { break-inside: avoid; padding: .15rem 0; }
.lem { font-weight: 600; }
</style>
