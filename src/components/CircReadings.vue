<script setup lang="ts">
/**
 * SPEC 63 OR-2/OR-3: «можливі читання» of a spelling with ô / ê, the dialect-IPA variant picker, and the derivation branches from the marked etymological о/е (BL-14 chains).
 * Nothing here is a claim about what the writer meant: every reading is a possibility with its own source (P-1.7); the IPA is derived.
 */
import { computed, ref } from 'vue'
import { CIRC_DATES, NOT_EVIDENCED, circBranches, readingsOf } from '../../core/ocirc.ts'
import { IPA_DIALECTS } from '../../core/ipa.ts'
import EvidenceList from './EvidenceList.vue'
import IkavismChain from './IkavismChain.vue'
const props = defineProps<{ spelling: string }>()
const list = computed(() => readingsOf(props.spelling))
const br = computed(() => circBranches(props.spelling))
const sel = ref('')
const picked = computed(() => list.value.find(r => r.id === sel.value))
const NAME = Object.fromEntries([...IPA_DIALECTS.map(d => [d.code, d.label]), ['GAL', 'галицька/максимовичева етимологічна орфографія']])
const KIND = { orthography: 'правопис', dialect: 'говір', stage: 'проміжна стадія' } as const
</script>

<template>
  <div v-if="list.length" class="circ small sans">
    <p class="muted" style="margin:.2rem 0">Літера «ô/ê» — не одне читання. Нижче — усі читання, які мають джерело; яке мав на увазі пишучий — невідомо, якщо автор не сказав.</p>
    <label>вимова: <select v-model="sel" aria-label="читання літери ô/ê" style="font-size:.85em">
      <option value="">— оберіть читання —</option>
      <option v-for="r in list" :key="r.id" :value="r.id">{{ r.sound }} · {{ r.regions.join(', ') }}</option>
    </select></label>
    <p v-if="picked" style="margin:.3rem 0"><strong style="font-size:1.05rem">{{ picked.ipa }}</strong> <span class="muted">· {{ picked.form }} · виведено за правилами (не запис вимови)</span></p>
    <table style="border-collapse:collapse;width:100%">
      <thead><tr><th scope="col" style="text-align:left">читання</th><th scope="col" style="text-align:left">IPA</th><th scope="col" style="text-align:left">де (група)</th><th scope="col" style="text-align:left">коли</th></tr></thead>
      <tbody>
        <template v-for="r in list" :key="r.id">
          <tr>
            <td><strong class="mono">{{ r.sound }}</strong> <span class="muted">{{ KIND[r.kind] }}</span><br>{{ r.label }}</td>
            <td><span class="mono">{{ r.ipa ?? 'невідомо' }}</span><br><span class="muted">{{ r.form }}</span></td>
            <td>{{ r.regions.map(c => NAME[c] ?? c).join('; ') }}</td>
            <td>{{ r.period }}</td>
          </tr>
          <tr><td colspan="4"><details><summary class="muted">доказ ({{ r.evidence.length }})</summary><EvidenceList :evidence="r.evidence" /></details></td></tr>
        </template>
      </tbody>
    </table>
    <p v-for="n in NOT_EVIDENCED" :key="n.sound" class="muted" style="margin:.3rem 0">Не засвідчено: ô як <strong>[{{ n.sound }}]</strong>.
      <details style="display:inline"><summary class="muted">чому</summary><EvidenceList :evidence="[n.why]" /></details></p>
    <div v-if="br" style="margin-top:.4rem">
      <strong>Виведення з ô: марковане етимологічне {{ br.letter === 'ô' ? 'о' : 'е' }} → засвідчені рефлекси ({{ br.word }})</strong>
      <IkavismChain :chains="br.chains" />
      <details><summary class="muted">датування рефлексів</summary><EvidenceList :evidence="[CIRC_DATES]" /></details>
    </div>
  </div>
</template>
