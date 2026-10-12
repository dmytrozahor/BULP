<script setup lang="ts">
/**
 * SPEC 60 IP-3: IPA per stress variant, with the «вимова: літературна / <говір>» toggle (IP-2).
 * Every IPA string is derived (never a dictionary fact, P-1.7): the rows that fired are listed with their method and cite.
 */
import { computed, ref } from 'vue'
import type { StressVariant } from '../../core/types.ts'
import { renderStress } from '../../core/text.ts'
import { toIpa, IPA_DIALECTS } from '../../core/ipa.ts'
const props = defineProps<{ variants: StressVariant[]; lemma: string }>()
const dialect = ref('')
const items = computed(() => props.variants.length
  ? props.variants.map(v => ({ label: renderStress(v.form, v.positions), r: toIpa(v.form, v.positions, dialect.value || undefined) }))
  : [{ label: props.lemma, r: toIpa(props.lemma, null, dialect.value || undefined) }])
</script>
<template>
  <div class="small ipa-row" style="margin:.2rem 0">
    <span class="muted">вимова: </span>
    <select v-model="dialect" aria-label="вимова: літературна або говір" style="font-size:.85em">
      <option value="">літературна</option>
      <option v-for="d in IPA_DIALECTS" :key="d.code" :value="d.code">{{ d.label }} ({{ d.code }})</option>
    </select>
    <div v-for="(it, i) in items" :key="i">
      <strong style="font-size:1.05rem">{{ it.r.ipa }}</strong>
      <span class="muted"> · {{ it.label }} · виведено за правилами (не словникова вимова)</span>
      <details>
        <summary class="muted">правила ({{ it.r.rows.length }})</summary>
        <div v-for="row in it.r.rows" :key="row.id"><code>{{ row.id }}</code> {{ row.method === 'quoted' ? 'цитата' : 'виведено' }} — {{ row.cite }}<template v-if="row.quote">: «{{ row.quote }}»</template></div>
      </details>
      <div v-for="f in it.r.flags" :key="f" class="unk">{{ f }}</div>
    </div>
  </div>
</template>
