<script setup lang="ts">
/**
 * SPEC 63 CP-9: the title word of a thin card. A MODERN word goes through Spell, so the «Говір» and «Правопис» switches act on the title like on the full card; a HISTORICAL spelling
 * (ORV / archaic / Middle Ukrainian / unlinked) is a quotation of a witness and is never respelled (the same rule as OvPronunciation).
 */
import Spell from './Spell.vue'
defineProps<{ word: string; historical?: boolean }>()
</script>

<template>
  <span v-if="historical" data-testid="thin-title" data-historical="1" title="історичне написання пам’ятки: перемикачі правопису й говору його не змінюють">{{ word }}</span>
  <Spell v-else :w="word" data-testid="thin-title" />
</template>
