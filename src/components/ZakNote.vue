<script setup lang="ts">
/** SPEC 63 CP-10.4: «написання кÿнь зведено до кінь (закарпатське ÿ, ЕУМ um162)» on the card a /f/<кÿнь> visit was redirected to (?zak=); shown only when the MM-41 fold really leads there. */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { zakNote } from '../lib/zakRoute.ts'
const props = defineProps<{ target: string }>()
const route = useRoute()
const note = computed(() => zakNote(typeof route.query.zak === 'string' ? route.query.zak : undefined, props.target))
</script>
<template><p v-if="note" class="small sans card" role="note" data-testid="zak-note">{{ note.text }} <a :href="note.cite" target="_blank" rel="noopener">джерело ↗</a></p></template>
