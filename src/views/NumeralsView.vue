<script setup lang="ts">
/** SPEC 63 DV-1b: «Числівники за говорами» — the whole numeral map as one table (lazy data). A cell without data says «немає даних». */
import { computed } from 'vue'
import { GRADE_NUM_UK, NO_DATA, NUM_COLS, coverage } from '../../core/numeral-map.ts'
import { numeralMap } from '../lib/numeralData.ts'
const m = computed(() => numeralMap())
const cov = computed(() => (m.value ? coverage(m.value) : undefined))
</script>

<template>
  <main class="page sans" data-testid="numerals-page">
    <h1>Числівники за говорами</h1>
    <p class="muted">Клітинка = числівник × говір. Порожня клітинка — «{{ NO_DATA }}»: стандартна форма в ній не підставляється й за аналогією нічого не добудовується. Ступінь: словник, носій, гіпотеза (форму впізнано за відповідником і засвідчено в корпусі; регіон — це регіон пам’ятки, а не говір).</p>
    <p v-if="m === undefined" class="muted">Завантаження…</p>
    <p v-else-if="m === null" class="muted">{{ NO_DATA }}</p>
    <template v-else>
      <p v-if="cov" class="muted">Заповнено {{ cov.cellsFilled }} клітинок із {{ cov.cellsTotal }}: словник {{ cov.byGrade.dict }}, носій {{ cov.byGrade.owner }}, гіпотеза {{ cov.byGrade.hyp }}.</p>
      <div class="scroll-x">
        <table class="corr-table small">
          <thead><tr><th>Числівник</th><th v-for="c in NUM_COLS" :key="c.id" :title="c.basis">{{ c.name }}</th></tr></thead>
          <tbody>
            <tr v-for="r in m.rows" :key="r.lemma">
              <td><RouterLink :to="'/w/' + encodeURIComponent(r.lemma)">{{ r.lemma }}</RouterLink></td>
              <td v-for="c in NUM_COLS" :key="c.id">
                <template v-if="r.cells.some(x => x.col === c.id)"><span v-for="(x, i) in r.cells.filter(y => y.col === c.id)" :key="x.form + x.std" :title="x.cite"><template v-if="i">; </template>{{ x.form }}<span class="muted"> [{{ GRADE_NUM_UK[x.grade] }}]</span></span></template>
                <span v-else class="muted">{{ NO_DATA }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </main>
</template>
