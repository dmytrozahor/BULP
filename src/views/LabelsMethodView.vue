<script setup lang="ts">
/**
 * SPEC 63 LB-6 «Як визначаються мітки»: the methods page linked from every Labels block. Plain Ukrainian; every threshold and every table row is printed from the SAME constants the build uses
 * (core/labels.ts TH, core/dict-labels.ts tables, core/autolabel.ts GAZETTEER), so the page cannot drift from the code.
 */
import { RouterLink } from 'vue-router'
import { CHECKED_REGISTER, HOW, CLASS_UK, REGISTER, TH, VESUM_TAGS, VESUM_TAGS_URL, VESUM_TYPE, WORD_TYPES, areaUk } from '../../core/labels.ts'
import { DICT_LABEL_TABLES, groupsOfArea, resolveRow } from '../../core/dict-labels.ts'
import { GAZETTEER } from '../../core/autolabel.ts'
import { DIALECTS } from '../../core/rules.ts'
const attachUk = { article: 'мітка стоїть будь-де в статті українського заголовного слова → усі заголовні слова статті', after: 'мітка в дужках ПІСЛЯ українського відповідника (ru→uk словник) → лише цей відповідник', before: 'мітка в дужках ПЕРЕД українським відповідником (ru→uk словник) → лише цей відповідник' } as const
const kindUk = { area: 'область', dialectal: 'діалектне', register: 'регістр', type: 'тип слова' } as const
const rowArea = (r: (typeof DICT_LABEL_TABLES)[number]['rows'][number]) => { const x = resolveRow(r); return x.area ? areaUk(x.area) : x.places[0] ?? '' }
const rowGroup = (r: (typeof DICT_LABEL_TABLES)[number]['rows'][number]) => { const x = resolveRow(r); return x.group.map(g => DIALECTS[g.group] ?? g.group).join(', ') }
</script>

<template>
  <article class="card sans" data-testid="labels-method">
    <h1>Як визначаються мітки</h1>
    <p>Блок «Мітки» на кожній картці показує <strong>діалект, регістр, тип і значення</strong>. Кожна позначка має <strong>метод</strong> (як її визначено) і <strong>докази</strong> (цитата зі словника, тег чи таблиця чисел).
      Якщо даних немає, картка так і пише: «недостатньо даних» або «нейтральне (немає позначок у словниках)» з переліком перевірених джерел. Ми нічого не вгадуємо: діалектом слово називається лише тоді, коли так його позначає словник.</p>

    <h2 id="dialect">1. Діалект: один із чотирьох класів</h2>
    <p class="small muted">Порядок: а → б → в → г; перший, що підходить, і є класом. Числа корпусу показано в усіх класах.</p>
    <ol>
      <li><strong>{{ CLASS_UK.dict }}</strong>. {{ HOW.dict }} Ми читаємо власні списки скорочень словників (таблиці нижче). Слово з міткою <em>Галиц.</em>, <em>Гуцул.</em>, <em>Угор.</em>, <em>гал.</em>, <em>діал.</em>, <em>hucul.</em>, <em>ungr.</em> позначене як регіональне чи діалектне.
        Мітки <em>повіту чи губернії</em> у Грінченка («Лохв. у.», «Харьк. г.») лише кажуть, де слово чи приклад <em>записано</em>; такі слова мають окрему підпозначку «місце запису за словником (не обов’язково діалектне)» і діалектними не називаються.
        Група говорів додається, лише якщо область названа у наших цитованих статтях uk.wikipedia (газетьєр нижче).</li>
      <li><strong>{{ CLASS_UK.corpus }}</strong>. {{ HOW.corpus }} Формули: для кожного регіону порівнюємо частоту леми в його пам’ятках із частотою в решті корпусу: log-likelihood G² (df = 1) і log₂-відношення відносних частот (LR, зі згладжуванням 0,5).
        Регіон береться, якщо G² показує перевагу, p &lt; {{ TH.alpha }}/k, де k — число регіонів з матеріалом (поправка Бонферроні), LR ≥ {{ TH.lrMin }} (щонайменше вдвічі), у регіоні ≥ {{ TH.fRegionMin }} вживань, у лемі ≥ {{ TH.fMin }} вживань і регіонів з матеріалом ≥ {{ TH.regionsMin }}.
        Це <strong>не діалектна мітка</strong> (FD-2): регіон пам’ятки — місце видання чи авторства джерела.</li>
      <li><strong>{{ CLASS_UK.general }}</strong>. {{ HOW.general }} Міра розсіювання — нормований DP Грайса (0 — розподіл такий, як у корпусі, 1 — усе в одному регіоні): DP = ½ Σ|частка леми в регіоні − частка регіону в корпусі|, поділений на (1 − найменша частка регіону). Умови: ≥ {{ TH.fMin }} вживань, ≥ {{ TH.k }} регіонів, DP ≤ {{ TH.dpMax }}.</li>
      <li><strong>{{ CLASS_UK.few }}</strong>. {{ HOW.few }} Картка пише, чого саме бракує (скільки вживань, регіонів).</li>
    </ol>

    <h3>Словники і їхні списки скорочень</h3>
    <p class="small">Кожен рядок цитує пояснення скорочення з власного списку словника (сторінка — посилання). Нічого не додано від себе, крім відповідності «скорочення → область»; повіти розкриваються за статтями uk.wikipedia (CC BY-SA 4.0).</p>
    <section v-for="t in DICT_LABEL_TABLES" :key="t.id" class="lb-table" :data-testid="`lbm-${t.id}`">
      <h4>{{ t.short }} <span class="small muted">· {{ t.rows.length }} скорочень</span></h4>
      <p class="small"><a :href="t.list.split(' ')[0]" rel="noopener" target="_blank">{{ t.list }} ↗</a> · {{ attachUk[t.attach] }}.</p>
      <table class="small"><thead><tr><th>скорочення</th><th>пояснення у словнику (дослівно)</th><th>що означає в картці</th><th>область → група говорів</th></tr></thead>
        <tbody><tr v-for="r in t.rows" :key="r.abbr">
          <td><code>{{ r.abbr }}</code></td><td><em>{{ r.meaning }}</em></td>
          <td>{{ kindUk[r.kind] }}<template v-if="r.scope === 'place'">: місце запису</template><template v-if="r.reg"> · {{ REGISTER.find(x => x.id === r.reg)?.full ?? r.reg }}</template><template v-if="r.typ"> · {{ WORD_TYPES[r.typ] ?? r.typ }}</template></td>
          <td><template v-if="r.kind === 'area'">{{ rowArea(r) }}<template v-if="rowGroup(r)"> → {{ rowGroup(r) }}</template></template></td></tr></tbody></table>
    </section>
    <p class="small muted">Не читаємо: «Ум.», «Ув.» Грінченка (вони позначають <em>похідні форми</em>, перелічені в статті, а не заголовне слово); «Кн.» Уманця (у його списку це і «книжне слово», і джерело); позначки в прикладах ru→uk словників (це місце запису прикладу). Ніковський і Голоскевич не друкують власних списків територіальних скорочень, які ми могли б цитувати. Діалектних словників із читабельним текстом не знайдено (SV-2).</p>
    <h3>Газетьєр: область → група говорів</h3>
    <ul class="small"><li v-for="g in GAZETTEER" :key="g.group"><strong>{{ DIALECTS[g.group] ?? g.group }}</strong> ({{ g.stems.join(', ') }}): <q>{{ g.q }}</q> — <a :href="g.loc" rel="noopener" target="_blank">uk.wikipedia ↗</a></li></ul>
    <p class="small muted">Області без рядка газетьєра (Київщина, Слобожанщина, Катеринославщина …) групи не отримують: показано лише область.</p>

    <h2 id="register">2. Регістр (вжиток)</h2>
    <p>Регістр береться з позначок джерел, окремо для леми та для кожного значення. Джерела: {{ CHECKED_REGISTER.join('; ') }}. Усе, що не позначено, — «нейтральне (немає позначок у словниках)»; це не твердження про «літературність».
      Суржик — ознака <em>форми</em>, а не леми: його видно у мітках написань, не в цьому блоці.</p>
    <p class="small">Теги ВЕСУМ (<a :href="VESUM_TAGS_URL" rel="noopener" target="_blank">dict_uk/doc/tags.txt ↗</a>): <span v-for="(v, k) in VESUM_TAGS" :key="k"><code>{{ k }}</code> — {{ v.def }}; </span> Тег на частині форм леми показується окремо як властивість цих форм.</p>
    <p class="small">Позначки: <span v-for="r in REGISTER" :key="r.id">{{ r.uk }} — {{ r.full }} ({{ r.axis }}); </span></p>

    <h2 id="type">3. Тип</h2>
    <p>Частина мови, морфологічний клас (за тегами ВЕСУМ і типом парадигми) і словесний тип: власна назва (<code v-for="(v, k) in VESUM_TYPE" :key="k">{{ k }} </code> у ВЕСУМ), абревіатура, запозичення (мітка донора з аналізу запозичень), церковнослов’янізм (лише за твердженням із доказом чи за позначкою «Цер.»), архаїзм, історизм, зменшена/збільшена форма (лише на початку статті Желехівського).</p>

    <h2 id="senses">4. Значення</h2>
    <p>Блок посилається на «Значення за епохами»; позначки СУМ-11/СУМ-20 (розм., заст., книжн., спец., діал., перен., ірон., зневажл., …) стоять біля номера значення, до якого вони належать, з назвою словника.</p>

    <h2 id="limits">5. Межі</h2>
    <ul>
      <li>Покриття діалектного класу залежить від обсягу корпусу і від того, скільки статей словників прочитано; поточні числа — у <a href="https://github.com/dmytrozahor/BULP/blob/mvp/analysis/labels-coverage.md" rel="noopener" target="_blank">analysis/labels-coverage.md ↗</a>, їх перераховує кожна збірка даних.</li>
      <li>Пороги вибрано консервативно; звіт показує, як змінилося б покриття за м’якших порогів, але картки користуються лише порогами, надрукованими вище.</li>
    </ul>
    <p><RouterLink to="/method">← загальна методологія</RouterLink></p>
  </article>
</template>

<style scoped>
.lb-table table { border-collapse: collapse; width: 100%; } .lb-table th, .lb-table td { text-align: left; vertical-align: top; padding: .15rem .5rem; border-bottom: 1px solid var(--line); }
.lb-table { overflow-x: auto; }
</style>
