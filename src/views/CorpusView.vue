<script setup lang="ts">
/** Corpus statistics (SPEC 10 M-5.1, M-6): witnesses + vetting, epoch sizes (denominators), link coverage, unresolved forms, licences (SPEC 00 P-4.4). */
import { computed } from 'vue'
import { EPOCHS } from '../../core/epochs.ts'
import { SOURCES } from '../../core/sources.ts'
import { useData } from '../composables/useData.ts'
import { epochShort, fmtNum } from '../lib/format.ts'
import { sourceTo, epochTo } from '../lib/nav.ts'
import WitnessTable from '../components/WitnessTable.vue'
const { corpus, loaded, ensureCorpus } = useData()
ensureCorpus()
const groups = computed(() => (['shev', 'wl'] as const).map(sc => {
  const eps = EPOCHS.filter(e => e.scheme === sc && !e.overlay && corpus.value?.epochSizes[e.id])
  const max = Math.max(1, ...eps.map(e => corpus.value!.epochSizes[e.id]!))
  return { sc, title: sc === 'shev' ? 'Шевельов' : 'Історія літературної мови (WL)', rows: eps.map((e, i) => ({ id: e.id, name: epochShort(e.id), n: corpus.value!.epochSizes[e.id]!, w: corpus.value!.epochSizes[e.id]! / max * 100, ramp: `var(--ep${sc === 'shev' ? i + 1 : [2, 4, 6][i] ?? 6})` })) }
}))
const lic = ['VESUM', 'TOROT', 'LT', 'WS'] as const
</script>

<template>
  <h1>Корпус</h1>
  <div v-if="!loaded"><div class="skeleton" v-for="i in 5" :key="i" /></div>
  <template v-else-if="corpus">
    <section class="card"><h2><span>Покриття</span></h2>
      <div class="row sans" style="gap:2rem">
        <div><strong style="font-size:1.6rem">{{ fmtNum(corpus.N) }}</strong><div class="small muted">слів (N)</div></div>
        <div><strong style="font-size:1.6rem">{{ fmtNum(corpus.linked) }}</strong><div class="small muted">прив’язано до лем ({{ fmtNum(corpus.linked / corpus.N * 100, 1) }}%)</div></div>
        <div><strong style="font-size:1.6rem">{{ fmtNum(corpus.unresolved) }}</strong><div class="small muted">не прив’язано (unresolved)</div></div>
        <div><strong style="font-size:1.6rem">{{ corpus.nWitnesses }}</strong><div class="small muted">пам’яток</div></div>
      </div>
      <div v-if="corpus.nVocab" class="row sans" style="gap:2rem;margin-top:.8rem" data-test="n-vocab">
        <div><strong style="font-size:1.6rem">{{ fmtNum(corpus.nVocab) }}</strong><div class="small muted">токенів лише для словника (vocab-only), не входять до N</div></div>
      </div>
      <p v-if="corpus.nVocab" class="small muted">N — повнотекстовий корпус: з нього цитати (KWIC), перші засвідчення й ipm. «Лише словник» — Вікіпедія, HPLT та інші джерела під ліцензіями без права цитувати: з них беруться форми слів і лічильники, жодного рядка тексту; ці числа не змішуються з N.
        <template v-if="corpus.vocabSources?.length">Джерела: {{ corpus.vocabSources.map(([s, n]) => s + ' ' + fmtNum(n)).join(' · ') }}. Для hplt лічаться лише слова, яких немає у ВЕСУМ.</template></p>
      <p class="small muted">Непрограмні токени не вгадуються — залишаються unresolved і лічаться (SPEC 10 M-3.3). Згенеровано: {{ corpus.generated }}.</p>
    </section>

    <section class="card"><h2><span>Пам’ятки й автори</span></h2><WitnessTable :witnesses="corpus.witnesses" /></section>

    <div class="grid2">
      <section v-for="g in groups" :key="g.sc" class="card"><h2><span>Розмір за епохами — {{ g.title }}</span></h2>
        <div v-for="r in g.rows" :key="r.id" style="margin:.4rem 0">
          <div class="row small sans" style="justify-content:space-between"><RouterLink :to="epochTo(r.id)">{{ r.name }}</RouterLink><span>{{ fmtNum(r.n) }} слів</span></div>
          <div class="bar"><i :style="{ width: r.w + '%', background: r.ramp }"></i></div>
        </div>
        <p class="small muted">Це знаменники (N) для ipm. Пам’ятка з кількома епохами ділиться порівну.</p>
      </section>
    </div>

    <section class="card"><h2><span>Найчастіші неприв’язані форми</span></h2>
      <div class="tablewrap"><table><thead><tr><th>форма</th><th class="num">f</th></tr></thead>
        <tbody><tr v-for="u in corpus.topUnresolved" :key="u.form"><td style="font-family:var(--serif)">{{ u.form }}</td><td class="num">{{ u.f }}</td></tr></tbody></table></div>
      <p class="small muted">Кандидати на розширення правил або словника.</p>
    </section>

    <section class="card"><h2><span>Ліцензії</span></h2>
      <ul class="sans small">
        <li v-for="k in lic" :key="k"><RouterLink :to="sourceTo(k)"><strong>{{ SOURCES[k]!.title }}</strong></RouterLink> — {{ SOURCES[k]!.license }} <a v-if="SOURCES[k]!.url" :href="SOURCES[k]!.url" target="_blank" rel="noopener">оригінал ↗</a></li>
        <li>ВЕСУМ і Brown-UK — <strong>CC BY-NC-SA 4.0</strong>; TOROT — <strong>CC BY-NC-SA 3.0</strong>; LanguageTool — <strong>LGPL-2.1+</strong>.</li>
      </ul>
      <p><strong>Похідні дані (public/data/*.json) — некомерційні, з поширенням на тих самих умовах (share-alike).</strong> SPEC 00 P-4.4: «Licences are respected and displayed».</p>
    </section>
  </template>
</template>
