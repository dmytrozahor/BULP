<script setup lang="ts">
/**
 * SPEC 63 PV-3 /name/:id and PV-5 /orv/:id — in-site card of a TOROT lemma that has no (VESUM-linked) modern lemma: a proper name (POS Ne) or an ORV-only lemma.
 * Everything shown is TOROT's own annotation (lemma, part-of-speech, morphology, citation-part); gloss and person/place type are «unknown» unless a cited source gives them.
 */
import { computed, ref, watch } from 'vue'
import type { NameCard, OrvCard, TorotFile } from '../../core/torot.ts'
import { loadTorot } from '../lib/torotData.ts'
import { textTo, witnessTo, wordTo } from '../lib/nav.ts'
const props = defineProps<{ id: string; kind: 'name' | 'orv' }>()
const file = ref<TorotFile>(), err = ref('')
watch(() => props.kind, () => { loadTorot().then(f => (file.value = f), e => (err.value = String(e))) }, { immediate: true })
const card = computed<NameCard | OrvCard | undefined>(() => (props.kind === 'name' ? file.value?.names : file.value?.orv)?.find(c => c.id === props.id))
const asName = computed(() => (props.kind === 'name' ? (card.value as NameCard | undefined) : undefined))
const asOrv = computed(() => (props.kind === 'orv' ? (card.value as OrvCard | undefined) : undefined))
</script>

<template>
  <p class="small sans"><RouterLink to="/texts">← тексти</RouterLink></p>
  <p v-if="err" class="muted sans">{{ err }}</p>
  <div v-else-if="!file" class="skeleton" style="height:4rem" />
  <p v-else-if="!card" class="muted sans">Картки «{{ id }}» немає в TOROT-даних.</p>
  <template v-else>
    <h1>{{ card.lemma }} <small class="muted sans">{{ kind === 'name' ? 'власна назва' : 'давньоруська лема без сучасного відповідника' }}</small></h1>
    <p class="sans small">TOROT: <code>{{ card.pos }}</code> <code v-if="card.morph">{{ card.morph }}</code> · {{ card.n }} вжив.</p>
    <p v-if="asName" class="sans small">Тип: <b>{{ asName.kind === 'place' ? 'топонім (за газетиром)' : 'невідомо (TOROT Ne не розрізняє особу/місце/народ)' }}</b>
      <template v-if="asName.modern"> · сучасна форма (VESUM): <RouterLink :to="wordTo(asName.modern)">{{ asName.modern }}</RouterLink></template>
      <template v-else> · сучасна форма: невідомо</template></p>
    <p v-if="asOrv" class="sans small">Чому без сучасного зв’язку: {{ asOrv.reason }} · значення (TOROT): невідомо — у XML немає глоси.</p>
    <h2>Написання</h2>
    <p class="sans"><span v-for="f in card.forms" :key="f.raw" class="chip">{{ f.raw }} ×{{ f.f }}</span></p>
    <h2>Свідчення (TOROT, citation-part)</h2>
    <ul class="sans small">
      <li v-for="(e, i) in card.evidence" :key="i"><RouterLink :to="textTo(e.w, e.loc)">«{{ e.raw }}»</RouterLink> · лема «{{ card.lemma }}», {{ e.morph }} · {{ e.loc }} · <RouterLink :to="witnessTo(e.w)">{{ e.w }}</RouterLink></li>
    </ul>
  </template>
</template>
