<script setup lang="ts">
/**
 * BL-15 word-card panel «Відповідники»: the same word in Polish / Belarusian / Russian / Old Polish … via the Proto-Slavic descendants graph (Wiktionary, CC BY-SA, D-evidence),
 * each with its first attestation where the source gives one. The ET-3 flag «українська фіксація давніша…» is a review prompt, never a correction.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { COG_LANG_UK, FLAG_UK, wiktPsl, type CognateEntry, type CognateFile } from '../../core/cognates.ts'
import { yatEdge } from '../../core/yat-corr.ts'
import { cognatesOf } from '../lib/cognatesData.ts'
import EvidenceList from './EvidenceList.vue'
import Panel from './Panel.vue'
const props = defineProps<{ lemma: string }>()
const entry = ref<CognateEntry>(), file = ref<CognateFile>(), done = ref(false)
const load = () => { done.value = false; cognatesOf(props.lemma).then(r => { entry.value = r.entry; file.value = r.file; done.value = true }) }
onMounted(load); watch(() => props.lemma, load)
const same = computed(() => (entry.value?.rows ?? []).filter(r => !r.b && !r.o)), other = computed(() => (entry.value?.rows ?? []).filter(r => r.b || r.o))   // GZ-5
const span = (d: [number, number]) => (d[0] === d[1] ? String(d[0]) : `${d[0]}–${d[1]}`)
</script>

<template>
  <Panel id="h-cog" :open="false" title="Відповідники" :empty="done && !entry"
    :summary="entry ? `*${entry.pivot.replace(/^\*/, '')} · ${same.length} відповідників${entry.rows.some(r => r.d) ? ', є датування' : ''}${entry.flag ? ' · ⚑ для перегляду' : ''}` : 'завантаження…'"
    :info="`Відповідники беремо з дерева нащадків праслов’янської форми у Вікісловнику (${file?.attribution.licence ?? 'CC BY-SA 4.0'}); дати — з тексту етимології відповідника, лише якщо вони там є. Відсутність дати не означає відсутності слова.`">
    <template v-if="entry">
      <p v-if="entry.flag" class="sans small" role="note" style="border-left:3px solid #b8860b;padding-left:.5rem">
        <strong>Для перегляду (ET-3).</strong> {{ FLAG_UK[entry.flag.code] }}. <span class="muted">{{ entry.flag.note }}. Це підказка для перевірки, а не виправлення й не твердження.</span></p>
      <p class="sans small muted">Праслов’янська форма: <a :href="wiktPsl(entry.pivot)" target="_blank" rel="noopener">*{{ entry.pivot.replace(/^\*/, '') }} ↗</a><template v-if="entry.gloss"> · {{ entry.gloss }}</template></p>
      <table class="sans small">
        <thead><tr><th>мова</th><th>форма</th><th>звукова відповідність</th><th>перша фіксація (за Вікісловником)</th></tr></thead>
        <tbody>
          <tr v-for="r in same" :key="r.l + r.w">
            <td>{{ COG_LANG_UK[r.l] }}</td><td lang="und">{{ r.w }}</td>
            <td class="muted"><span v-for="y in yatEdge(lemma, r.l, r.w)" :key="y.id" :title="y.cite.map(c => c.quote).join(' | ')" data-testid="cog-rule">{{ y.label }}</span></td>
            <td><template v-if="r.d">{{ span(r.d) }} <span class="muted">«{{ r.q }}» · {{ r.k === 'tree' ? 'позначка в дереві' : 'текст етимології' }}</span></template><span v-else class="muted">не вказано</span></td>
          </tr>
        </tbody>
      </table>
      <template v-if="other.length">
        <p class="sans small" style="margin-bottom:.2rem"><strong>Споріднені за етимоном, інше слово</strong> <span class="muted">(запозичення або дублет з іншим значенням; не відповідники)</span></p>
        <ul class="sans small" data-testid="cog-other">
          <li v-for="r in other" :key="r.l + r.w">{{ COG_LANG_UK[r.l] }} <span lang="und">{{ r.w }}</span><template v-if="r.g"> — «{{ r.g }}»</template><span v-else class="muted"> · запозичено</span></li>
        </ul>
      </template>
      <EvidenceList :evidence="entry.evidence" />
      <p class="small muted sans">Вікісловник — {{ file?.attribution.licence }}; автори статей на сторінках слів. Додаткова перевірка вручну: SStp, SPXVI, KorBa, НКРЯ, ГСБМ (немає масового доступу).</p>
    </template>
    <p v-else-if="done" class="sans small muted">Відповідників для цього слова в зібраних даних немає.</p>
    <p v-else class="muted small">завантаження…</p>
  </Panel>
</template>
