<script setup lang="ts">
/**
 * BL-16 /witness/:id — the card of one witness (пам’ятка): metadata, author, dating + its citation, epochs, licence, media and the first page of its running text with
 * every word clickable (/w). A Saint Sophia inscription (sophia-<n>) is a graffiti card: IIIF image, transcription, words, portal link as secondary «сторінка порталу ↗».
 * The external URL is only ever the secondary «оригінал ↗».
 */
import { computed, ref, watch } from 'vue'
import { isKnown } from '../../core/evidence.ts'
import { useData } from '../composables/useData.ts'
import { epochShort, fmtDate, fmtNum, LANG_UK, WTYPE_UK } from '../lib/format.ts'
import { authorTo, epochTo, textTo, wordTo } from '../lib/nav.ts'
import { loadSophia, resolveMedia } from '../lib/sophiaData.ts'
import { sophiaIdOf, type SophiaItem, type WitnessMedia } from '../lib/media.ts'
import { loadTokens, rowsOf, type Row } from '../lib/witnessText.ts'
import AuthorBadge from '../components/AuthorBadge.vue'
import EvidencePopover from '../components/EvidencePopover.vue'
import MediaPanel from '../components/MediaPanel.vue'
const props = defineProps<{ id: string }>()
const { loaded, witnessById, annData } = useData()
const w = computed(() => witnessById.value.get(props.id))
const epochs = computed(() => (w.value && isKnown(w.value.epochShev) ? w.value.epochShev.value.epochs : []))
const sophiaId = computed(() => sophiaIdOf(props.id))
const item = ref<SophiaItem>(), media = ref<WitnessMedia>(), toks = ref<Awaited<ReturnType<typeof loadTokens>>>(null), textState = ref<'loading' | 'done'>('loading')
watch(() => props.id, async id => {
  item.value = undefined; media.value = undefined; toks.value = null; textState.value = 'loading'
  if (sophiaId.value !== undefined) {
    loadSophia().then(d => { if (id === props.id) item.value = d.items.find(i => i.id === sophiaId.value) }).catch(() => undefined)
    resolveMedia(id, w.value as { media?: WitnessMedia } | undefined).then(m => { if (id === props.id) media.value = m }).catch(() => undefined)
  } else if (w.value?.media) media.value = w.value.media
  const t = await loadTokens(id); if (id === props.id) { toks.value = t; textState.value = 'done' }
}, { immediate: true })
const rows = computed<Row[]>(() => (toks.value && loaded.value ? rowsOf(toks.value, 0, 120, annData.value) : []))
const title = computed(() => w.value?.title ?? (item.value ? `Графіті ${item.value.title}, панель ${item.value.panel}` : props.id))
</script>

<template>
  <p class="small sans"><RouterLink to="/texts">← усі пам’ятки</RouterLink><template v-if="sophiaId !== undefined"> · <RouterLink to="/sophia">графіті Софії</RouterLink></template></p>
  <h1>{{ title }}</h1>
  <div v-if="!loaded" class="skeleton" style="height:6rem" />
  <p v-else-if="!w && !item" class="card muted" role="status">Пам’ятки «{{ id }}» немає в корпусі. <RouterLink to="/texts">Усі пам’ятки</RouterLink>.</p>
  <template v-else>
    <ul v-if="w" class="sans small" style="list-style:none;padding:0">
      <li><span class="muted">автор: </span><AuthorBadge :author="w.author" :witness="w.id" /> <RouterLink :to="authorTo(w.author)">картка автора →</RouterLink></li>
      <li><span class="muted">дата: </span>{{ fmtDate(w.date) }}
        <EvidencePopover :evidence="[w.dateCite]" :heading="`Датування: ${fmtDate(w.date)}`" label="датування"><span class="badge">ⓘ джерело дати</span></EvidencePopover></li>
      <li v-if="epochs.length"><span class="muted">епоха: </span><template v-for="(e, i) in epochs" :key="e"><template v-if="i"> / </template><RouterLink :to="epochTo(e)">{{ epochShort(e) }}</RouterLink></template></li>
      <li v-if="w.region"><span class="muted">регіон: </span>{{ w.region }}</li>
      <li><span class="muted">мова: </span>{{ LANG_UK[w.lang] ?? w.lang }} · <span class="muted">тип: </span>{{ WTYPE_UK[w.witnessType] ?? w.witnessType }}<template v-if="w.msDate"> · список {{ w.msDate }}</template></li>
      <li><span class="muted">видання: </span>{{ w.edition }}<template v-if="w.license"> ({{ w.license }})</template> · {{ fmtNum(w.n) }} слів</li>
    </ul>
    <p v-if="w?.licenceNote" class="small sans muted licence-note" role="note">{{ w.licenceNote }}</p>
    <section v-if="item" class="card sans small">
      <strong>Графіті № {{ item.title }}</strong> · {{ item.type }} · {{ item.from === item.to ? item.from : `${item.from}–${item.to}` }} · панель {{ item.panel }}
      · <a :href="item.viewer" target="_blank" rel="noopener">сторінка порталу ↗</a>
    </section>
    <MediaPanel v-if="media" :media="media" :licence-note="w?.licenceNote" :refs="[w?.url, id]" />
    <h2>Текст</h2>
    <div v-if="textState === 'loading'" class="skeleton" style="height:4rem" />
    <p v-else-if="!rows.length" class="muted small sans" role="status">Транскрипції цієї пам’ятки ще немає в даних<template v-if="sophiaId !== undefined"> (ліцензію тексту портал не вказує)</template>.</p>
    <template v-else>
      <p class="reader" style="font-family:var(--serif);line-height:2">
        <template v-for="(t, i) in rows" :key="i">
          <RouterLink v-if="t.lemma" :class="['tok', t.status, { derived: t.provenance === 'derived' }]" :to="wordTo(t.lemma)" :title="`${t.loc} · лема «${t.lemma}»`">{{ t.raw }}</RouterLink>
          <span v-else class="tok unknown" :title="t.loc">{{ t.raw }}</span>{{ t.sep }}
        </template>
      </p>
      <p class="small sans"><RouterLink :to="textTo(id)">читати весь текст у читачі →</RouterLink></p>
    </template>
    <p v-if="w" class="small sans muted">Оригінал: <a :href="w.url" target="_blank" rel="noopener">оригінал ↗</a></p>
  </template>
</template>
