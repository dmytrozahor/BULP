<script setup lang="ts">
/** SPEC 63 NV-1: «‹ 1 2 3 … 9 ›» controls shared by every long list; the parent owns the page (usePage → `?p=`). */
import { computed } from 'vue'
import { pageWindow } from '../lib/page.ts'
const props = defineProps<{ page: number; pages: number; total?: number }>()
const emit = defineEmits<{ go: [page: number] }>()
const win = computed(() => pageWindow(props.page, props.pages))
</script>

<template>
  <nav v-if="pages > 1" class="pager row sans small" aria-label="Сторінки">
    <button type="button" class="chip" :disabled="page <= 1" aria-label="Попередня сторінка" @click="emit('go', page - 1)">‹</button>
    <template v-for="(n, i) in win" :key="i">
      <span v-if="n === '…'" class="muted" aria-hidden="true">…</span>
      <button v-else type="button" class="chip" :aria-pressed="n === page" :aria-current="n === page ? 'page' : undefined" @click="emit('go', n)">{{ n }}</button>
    </template>
    <button type="button" class="chip" :disabled="page >= pages" aria-label="Наступна сторінка" @click="emit('go', page + 1)">›</button>
    <span v-if="total !== undefined" class="muted">{{ total }}</span>
  </nav>
</template>
