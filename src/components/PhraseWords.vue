<script setup lang="ts">
/** BL-12: the components of a phraseme candidate, each one a link — a lemma → /w/<lemma>, an unlinked raw spelling («~» prefix) → /f/<spelling>. */
import { formTo, wordTo } from '../lib/nav.ts'
defineProps<{ lemmas: string[] }>()
</script>
<template>
  <span class="phrase-words"><template v-for="(l, i) in lemmas" :key="i"><template v-if="i"> </template>
    <RouterLink v-if="l.startsWith('~')" :to="formTo(l.slice(1))" class="old">{{ l.slice(1) }}</RouterLink><RouterLink v-else :to="wordTo(l)">{{ l }}</RouterLink></template></span>
</template>
