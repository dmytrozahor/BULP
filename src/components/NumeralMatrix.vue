<script setup lang="ts">
/** SPEC 63 DV-1b: the forms of a numeral in the dialects, grouped by dialect, each with its grade and cite. An empty column is not printed; a numeral with no cell prints «немає даних». Lazy (public/data/dv/numerals.json). */
import { computed } from 'vue'
import { byColumn, GRADE_NUM_UK, NO_DATA } from '../../core/numeral-map.ts'
import { numeralRow } from '../lib/numeralData.ts'
const props = defineProps<{ lemma: string }>()
const row = computed(() => numeralRow(props.lemma))
const groups = computed(() => (row.value ? byColumn(row.value) : []))
const regions = (r?: [string, number][]) => (r ?? []).slice(0, 3).map(([n, t]) => `${n} ${t}`).join('; ')
</script>

<template>
  <div v-if="row" class="numeral-matrix hl-line sans small" data-testid="numeral-matrix">
    <h4 class="small sans">Числівник у говорах</h4>
    <p v-if="!groups.length" class="muted">{{ NO_DATA }}</p>
    <table v-else class="corr-table small sans">
      <thead><tr><th>Говір</th><th>Форма</th><th>Ступінь</th><th>Джерело</th></tr></thead>
      <tbody>
        <template v-for="g in groups" :key="g.col.id">
          <tr v-for="(c, i) in g.cells" :key="c.form + c.std">
            <td>{{ i ? '' : g.col.name }}</td>
            <td><strong>{{ c.form }}</strong><span v-if="c.std !== lemma" class="muted"> (до {{ c.std }})</span></td>
            <td>{{ GRADE_NUM_UK[c.grade] }}<span v-if="c.grade === 'hyp'" class="muted"> — не факт</span></td>
            <td class="muted">{{ c.cite }}<template v-if="c.f"> · {{ c.f }} вживань<template v-if="c.regions?.length">; регіони пам’яток: {{ regions(c.regions) }}</template></template></td>
          </tr>
        </template>
      </tbody>
    </table>
    <p class="muted">Порожні говори — «{{ NO_DATA }}». <RouterLink to="/numerals">Усі числівники за говорами</RouterLink></p>
  </div>
</template>
