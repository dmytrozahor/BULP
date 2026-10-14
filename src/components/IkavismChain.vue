<script setup lang="ts">
/**
 * BL-14: staged chain of the new ikavism (о > о· > у· > ü > і; е > е· > (іе) > і; ѣ > е· > і) with its Shevelov quote, marked
 * «реконструкція»; and the attested dialect reflexes (вул, кун’, вÿс …) where research/27 cites them. A stage is never an attestation.
 */
import { computed } from 'vue'
import type { IkavChain, DialectReflex } from '../../core/ikavism.ts'
import { chainsForWord, dialectReflexes } from '../../core/ikavism.ts'
import EvidenceList from './EvidenceList.vue'
const props = defineProps<{ chains?: IkavChain[]; lemma?: string; paradigm?: string[]; old?: string[] }>()
const list = computed<IkavChain[]>(() => props.chains ?? (props.lemma ? chainsForWord(props.lemma, { paradigm: props.paradigm, oldForms: props.old }) : []))
const reflexes = computed<DialectReflex[]>(() => (props.lemma ? dialectReflexes(props.lemma) : []))
const BR = { south: 'південна гілка: звуження', north: 'північна гілка: дифтонги' } as const
const KIND = { dialect: 'говір', orthography: 'правопис XIX ст.', chancery: 'грамота' } as const
</script>

<template>
  <div v-if="list.length || reflexes.length" class="ikav small">
    <div v-for="(c, i) in list" :key="i" class="card" style="margin:.3rem 0">
      <div><strong>{{ c.src }} > і</strong> · {{ BR[c.branch] }} <span class="derived-badge">реконструкція</span></div>
      <ol class="mono" style="margin:.2rem 0;padding-left:1.2rem">
        <li v-for="(s, j) in c.stages" :key="j"><span class="derived">{{ s.form }}</span> <span class="muted">/{{ s.sound }}/ {{ s.note }} · не засвідчено</span></li>
      </ol>
      <details><summary class="muted">цитата та датування</summary><EvidenceList :evidence="[c.quote, c.dates]" /></details>
    </div>
    <div v-if="reflexes.length" style="margin:.3rem 0">
      <span class="muted">засвідчені діалектні рефлекси: </span>
      <details v-for="(x, i) in reflexes" :key="i" style="display:inline-block;margin-right:.5rem">
        <summary><strong class="mono">{{ x.form }}</strong> <span class="muted">{{ x.regions.join(', ') }} · {{ KIND[x.kind] }}</span></summary>
        <EvidenceList :evidence="[x.evidence]" />
      </details>
    </div>
  </div>
</template>
