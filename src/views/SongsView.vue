<script setup lang="ts">
/**
 * NW-7 / MV-1: songs (public/data/songs.json, lazy). `/songs` = list; `/songs/:id` = one song: ≤ 2 quoted lines (lyrics policy), earliest record (collector/print, date, region),
 * authorship, evidence on demand, and the YouTube recordings through MediaPanel (youtube-nocookie, loaded only on click; audio is never stored).
 * Summary first, evidence one tap away (SPEC 61): evidence and recordings sit in collapsed panels with one-line summaries.
 */
import { computed, ref, watch } from 'vue'
import { useSongs, KIND_SONG_UK, songLines, type Song } from '../lib/datasets.ts'
import type { WitnessMedia } from '../lib/media.ts'
import { evidenceTo } from '../lib/nav.ts'
import Panel from '../components/Panel.vue'
import MediaPanel from '../components/MediaPanel.vue'
import EvidenceList from '../components/EvidenceList.vue'
const props = defineProps<{ id?: string }>()
const data = useSongs()
const kind = ref('')
const rows = computed(() => (data.value?.songs ?? []).filter(s => !kind.value || s.kind === kind.value))
const song = computed<Song | undefined>(() => (props.id ? data.value?.songs.find(s => s.id === props.id) : undefined))
const playing = ref<number>()
watch(() => props.id, () => { playing.value = undefined })
const mediaOf = (s: Song, i: number): WitnessMedia => {
  const m = s.media[i]!
  return { kind: 'youtube', url: m.id, id: m.id, title: m.title, attribution: `YouTube${m.uploader ? ` — завантажив(ла) ${m.uploader}` : ''} (сторонній відеозапис; лише вбудовування, аудіо не зберігається)`, licence: 'на розсуд правовласника відео' }
}
const lines = (s: Song) => s.quotes.flatMap(q => songLines(q.text).map(t => ({ t, q }))).slice(0, 2)
</script>

<template>
  <section>
    <template v-if="!id">
      <h1>Пісні</h1>
      <p class="muted sans small">{{ data?.policy }}</p>
      <p v-if="!data" class="muted" role="status">Завантаження…</p>
      <template v-else>
        <div class="row sans small" role="group" aria-label="Фільтр за видом">
          <button type="button" class="chip" :aria-pressed="!kind" @click="kind = ''">усі</button>
          <button v-for="(l, k) in KIND_SONG_UK" :key="k" type="button" class="chip" :aria-pressed="kind === k" @click="kind = k">{{ l }}</button>
        </div>
        <ul class="songs-list sans">
          <li v-for="s in rows" :key="s.id">
            <RouterLink :to="`/songs/${s.id}`"><strong>{{ s.title }}</strong></RouterLink>
            <span class="muted small"> · {{ KIND_SONG_UK[s.kind] }} · {{ s.earliest?.date ?? 'дата невідома' }}<template v-if="s.region"> · {{ s.region }}</template> · відео: {{ s.media.length }}</span>
          </li>
        </ul>
      </template>
    </template>

    <template v-else>
      <p class="sans small"><RouterLink to="/songs">← усі пісні</RouterLink></p>
      <p v-if="!data" class="muted" role="status">Завантаження…</p>
      <div v-else-if="!song" class="card" role="status"><h1>Пісні «{{ id }}» немає</h1></div>
      <template v-else>
        <header class="wordhead headline">
          <h1 class="lemma">{{ song.title }}</h1>
          <p class="hl-line sans"><span class="muted">{{ KIND_SONG_UK[song.kind] }} · {{ song.genre }}</span></p>
          <p class="hl-line sans"><span class="muted">Найдавніший запис: </span>{{ song.earliest?.date ?? 'невідомо' }}<template v-if="song.earliest"> — {{ song.earliest.what }}
            <span :class="song.earliest.check === 'Q' ? 'attested-badge' : 'derived-badge'">{{ song.earliest.check === 'Q' ? 'Q · звірено' : song.earliest.check + ' · не звірено' }}</span></template></p>
          <p v-if="song.region" class="hl-line sans"><span class="muted">Регіон: </span>{{ song.region }}</p>
          <p v-if="song.authorship" class="hl-line sans"><span class="muted">Авторство: </span>{{ song.authorship }}</p>
        </header>
        <div v-if="lines(song).length" class="card">
          <blockquote v-for="(l, i) in lines(song)" :key="i" style="margin:.2rem 0">{{ l.t }}</blockquote>
          <p class="small muted sans">Цитата (не більше 2 рядків) за <RouterLink :to="evidenceTo(song.quotes[0]!.evidence.source, song.quotes[0]!.evidence.locator)">джерелом</RouterLink><template v-if="/^https?:/.test(song.quotes[0]!.evidence.locator)"> (<a :href="song.quotes[0]!.evidence.locator" target="_blank" rel="noopener">оригінал ↗</a>)</template>.</p>
        </div>
        <p v-else class="small muted sans">Тексту не наведено: {{ song.licence === 'link-only' ? 'лише посилання (права на текст не підтверджено)' : 'немає цитати' }}.</p>
        <p v-if="song.witness" class="small sans">Текст у корпусі: <RouterLink :to="{ path: '/texts', query: { w: song.witness } }">пам’ятка {{ song.witness }}</RouterLink></p>
        <p v-if="song.note" class="small muted sans">{{ song.note }}</p>

        <Panel id="s-media" :title="'Записи · YouTube'" :summary="`${song.media.length} відео (сторонні завантаження; відтворення лише за кліком)`" :empty="!song.media.length" :open="false">
          <ul class="sans" style="list-style:none;padding:0;margin:0">
            <li v-for="(m, i) in song.media" :key="m.id" style="margin:.4rem 0">
              <button type="button" class="chip small" :aria-expanded="playing === i" @click="playing = playing === i ? undefined : i">{{ m.title }}</button>
              <span class="muted small"> {{ m.uploader }}</span>
              <MediaPanel v-if="playing === i" :media="mediaOf(song, i)" @close="playing = undefined" />
            </li>
          </ul>
        </Panel>
        <Panel id="s-ev" title="Докази · Evidence" :summary="`${song.evidence.length} джерел`" :empty="!song.evidence.length" :open="false">
          <EvidenceList :evidence="song.evidence" />
        </Panel>
      </template>
    </template>
  </section>
</template>

<style scoped>
.songs-list { list-style: none; padding: 0; margin: .6rem 0; }
.songs-list li { padding: .45rem 0; border-bottom: 1px solid var(--line); }
</style>
