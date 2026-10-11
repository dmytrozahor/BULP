<script setup lang="ts">
/** F3: public/data/report.md (copy of analysis/REPORT.md written by the build) rendered by lib/md.ts; headings carry anchors, /report#id deep-links. */
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { renderMd } from '../lib/md.ts'
const md = ref<string>(), err = ref(''), route = useRoute()
onMounted(async () => {
  try {
    const r = await fetch('./data/report.md')
    const t = await r.text()
    if (!r.ok || /^\s*<(!doctype|html)/i.test(t)) throw new Error('report.md ще не створено збіркою (npm run build:data)')
    md.value = t
    await nextTick(); const h = route.query.s; if (typeof h === 'string') document.getElementById(h)?.scrollIntoView()
  } catch (e) { err.value = String((e as Error).message ?? e) }
})
const r = computed(() => (md.value ? renderMd(md.value) : undefined))
const toc = computed(() => r.value?.toc.filter(h => h.level <= 3) ?? [])
const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
</script>

<template>
  <h1>Звіт збірки</h1>
  <p class="muted sans small">Автоматичний звіт <code>analysis/REPORT.md</code>: покриття лематизації за пам’ятками, найчастіші невирішені форми, підсумки міток. Числа подано разом зі знаменником (N).</p>
  <p v-if="err" class="card unk sans" role="alert">Звіт недоступний: {{ err }}. Нічого не вигадано — розділ порожній, доки збірка його не створить.</p>
  <p v-else-if="!r" class="muted sans" role="status">Завантаження звіту…</p>
  <div v-else class="report">
    <nav class="card small sans" aria-label="Зміст звіту"><strong>Зміст</strong>
      <ul style="list-style:none;padding:0;margin:.3rem 0 0"><li v-for="h in toc" :key="h.id" :style="{ paddingLeft: (h.level - 1) * .9 + 'rem' }"><a :href="`#/report?s=${h.id}`" @click.prevent="go(h.id)">{{ h.text }}</a></li></ul></nav>
    <article class="card" v-html="r.html"></article>
  </div>
</template>
