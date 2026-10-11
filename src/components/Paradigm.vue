<script setup lang="ts">
/**
 * research/02 §1 (goroh.pp.ua «Словозміна»): noun table «відмінок | однина | множина» with seven cases; verb blocks Інфінітив · Теперішній ·
 * Майбутній · Минулий · Наказовий. Cells are D-evidence: the verbatim VESUM tag is shown on hover/focus (title) and as text in the grid footer.
 */
import { computed } from 'vue'
import { buildGrids, nonNormative, type PForm } from '../lib/paradigm.ts'
const props = defineProps<{ paradigm: PForm[] }>()
const grids = computed(() => buildGrids(props.paradigm))
</script>

<template>
  <div v-if="!paradigm.length" class="unk">парадигма відсутня у ВЕСУМ</div>
  <div v-for="g in grids" :key="g.id" class="tablewrap" style="margin-bottom:.8rem">
    <table>
      <caption v-if="grids.length > 1" class="small muted" style="text-align:left">{{ g.title }}</caption>
      <thead><tr><th scope="col"></th><th v-for="c in g.cols" :key="c" scope="col">{{ c }}</th></tr></thead>
      <tbody>
        <tr v-for="r in g.rows" :key="r.label">
          <th scope="row">{{ r.label }}</th>
          <td v-for="(cell, i) in r.cells" :key="i">
            <template v-if="cell.length"><span v-for="(p, j) in cell" :key="j">
              <span class="tagtip" tabindex="0" :class="{ nonnorm: nonNormative(p.tags) }" :title="p.tags" :aria-label="`${p.form}: ${p.tags}`">{{ p.form }}</span><span v-if="j < cell.length - 1">, </span></span></template>
            <span v-else class="muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <p class="small muted">джерело: ВЕСУМ v6.8.6, CC BY-NC-SA 4.0 · теги дослівно при наведенні (D-докази) · <span class="nonnorm">помаранчевим</span> — позначені як нестандартні/короткі форми. Наголосу у ВЕСУМ немає.</p>
</template>
