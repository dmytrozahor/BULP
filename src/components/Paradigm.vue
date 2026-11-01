<script setup lang="ts">
/**
 * research/02 §1 (goroh.pp.ua «Словозміна»): noun table «відмінок | однина | множина» with seven cases; verb blocks Інфінітив · Теперішній ·
 * Майбутній · Минулий · Наказовий. Cells are D-evidence: the verbatim VESUM tag is shown on hover/focus (title) and as text in the grid footer.
 */
import { computed } from 'vue'
import Spell from './Spell.vue'
import { ctxOfTags } from '../lib/dialectView.ts'
import { formStress, ST_SOURCES, type StLemma } from '../../core/stress-src.ts'
import { renderStress } from '../../core/text.ts'
import { dialect } from '../lib/views.ts'
import { originsFor } from '../../core/origin.ts'
import { buildGrids, nonNormative, type PForm } from '../lib/paradigm.ts'
const props = defineProps<{ paradigm: PForm[]; kind?: string; /** GG-14: stressed forms from the sidecar (kaikki …); a form that no source stresses is shown plain, nothing is generated */ stressForms?: StLemma['forms'] }>()
const stressed = (form: string): { text: string; tip: string }[] => (props.stressForms?.length ? formStress(props.stressForms, form) : []).map(x => ({ text: renderStress(form.toLowerCase(), x.positions), tip: ST_SOURCES[x.src]?.by ?? x.src }))
/** MM-55: the dialect respelling of a FORM needs what the header gets: the stress of that form (sidecar) and the origin of its і (the alternation inside this paradigm: сел- ~ сіл) - without them the stressed-vowel and origin rules (CHN сіл → сіел) were skipped for every form of the table */
const formList = computed(() => props.paradigm.map(p => p.form))
const ctxFor = (p: PForm) => {
  const base = ctxOfTags(p.tags)
  if (!dialect.value) return base
  const st = props.stressForms?.length ? formStress(props.stressForms, p.form)[0] : undefined
  const o = originsFor(p.form, { paradigm: formList.value })
  return { ...base, ...(st ? { positions: st.positions as number[] } : {}), ...(o.via !== 'none' ? { origins: o.origins } : {}) }
}
const grids = computed(() => props.kind === 'uninflected' ? [] : buildGrids(props.paradigm))
</script>

<template>
  <p v-if="kind === 'uninflected'" class="sans">незмінне слово <span class="muted small">— не відмінюється, окремої парадигми немає (SPEC 61 FX-5)</span></p>
  <div v-else-if="!paradigm.length" class="unk">парадигма відсутня у ВЕСУМ</div>
  <div v-for="g in grids" :key="g.id" class="tablewrap" style="margin-bottom:.8rem">
    <table>
      <caption v-if="grids.length > 1" class="small muted" style="text-align:left">{{ g.title }}</caption>
      <thead><tr><th scope="col"></th><th v-for="c in g.cols" :key="c" scope="col">{{ c }}</th></tr></thead>
      <tbody>
        <tr v-for="r in g.rows" :key="r.label">
          <th scope="row">{{ r.label }}</th>
          <td v-for="(cell, i) in r.cells" :key="i">
            <template v-if="cell.length"><span v-for="(p, j) in cell" :key="j">
              <span class="tagtip" tabindex="0" :class="{ nonnorm: nonNormative(p.tags) }" :title="p.tags" :aria-label="`${p.form}: ${p.tags}`"><Spell :w="p.form" :ctx="ctxFor(p)" quiet /></span><span v-for="(x, k) in stressed(p.form)" :key="k" class="muted small" :title="'наголос ' + x.tip" data-testid="par-stress"> ({{ x.text }})</span><span v-if="j < cell.length - 1">, </span></span></template>
            <span v-else class="muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <p v-if="kind !== 'uninflected'" class="small muted"><span class="nonnorm">помаранчевим</span> — нестандартні/короткі форми (джерело й ліцензія — у ⓘ панелі).</p>
</template>
