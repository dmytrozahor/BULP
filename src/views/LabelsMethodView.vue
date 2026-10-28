<script setup lang="ts">
/**
 * SPEC 63 LB-6 «Як визначаються мітки»: the methods page linked from every Labels block. Plain Ukrainian; every threshold and every table row is printed from the SAME constants the build uses
 * (core/labels.ts TH, core/dict-labels.ts tables, core/autolabel.ts GAZETTEER), so the page cannot drift from the code.
 */
import { RouterLink } from 'vue-router'
import { CHECKED_REGISTER, CLASS_KEY_UK, DICT_BASES, G2_STRONG, GRADE_UK, HOW, HOW_SUM, HOW_VESUM, SUM_NORM_UK, VESUM_NORM_UK, CLASS_UK, REGISTER, TH, VESUM_TAGS, VESUM_TAGS_URL, VESUM_TYPE, WORD_TYPES, areaUk } from '../../core/labels.ts'
import { DICT_LABEL_TABLES, EXTRA_LABEL_TABLES, groupsOfArea, resolveRow } from '../../core/dict-labels.ts'
import { GAZETTEER } from '../../core/autolabel.ts'
import { DIALECTS } from '../../core/rules.ts'
const attachUk = { article: 'мітка стоїть будь-де в статті українського заголовного слова → усі заголовні слова статті', after: 'мітка в дужках ПІСЛЯ українського відповідника (ru→uk словник) → лише цей відповідник', before: 'мітка в дужках ПЕРЕД українським відповідником (ru→uk словник) → лише цей відповідник', sense: 'мітка надрукована на значенні статті (розібрані рядки СУМ) → лише це значення; заголовне слово стоїть у рядку', tag: 'тег значення en.Вікісловника (набір kaikki) → мітка леми, адреса — стаття слова', category: 'категорія статті uk.Вікісловника → мітка леми, адреса — стаття слова' } as const
const kindUk = { area: 'область', dialectal: 'діалектне', register: 'регістр', type: 'тип слова' } as const
const rowArea = (r: (typeof DICT_LABEL_TABLES)[number]['rows'][number]) => { const x = resolveRow(r); return x.area ? areaUk(x.area) : x.places[0] ?? '' }
const rowGroup = (r: (typeof DICT_LABEL_TABLES)[number]['rows'][number]) => { const x = resolveRow(r); return x.group.map(g => DIALECTS[g.group] ?? g.group).join(', ') }
</script>

<template>
  <article class="card sans" data-testid="labels-method">
    <h1>Як визначаються мітки</h1>
    <p>Блок «Мітки» на кожній картці показує <strong>діалект, регістр, тип і значення</strong>. Кожна позначка має <strong>метод</strong> (як її визначено) і <strong>докази</strong> (цитата зі словника, тег чи таблиця чисел).
      Якщо даних немає, картка так і пише: «невизначено» (з причиною) або «нейтральне (немає позначок у словниках)» з переліком перевірених джерел. Ми нічого не вгадуємо: діалектом слово називається лише тоді, коли так його позначає словник.</p>

    <h2 id="dialect">1. Діалект: кожне слово має рівно один із семи класів</h2>
    <p class="small muted">Порядок: 1 → 7; перший, що підходить, і є класом, жодне слово не лишається без класу. До кожного класу додано <strong>ступінь доказу</strong> (див. нижче). Нижче пункти а–в — це класи 1–3 (в «загальновживане»), далі 4–7. Числа корпусу показано в усіх класах.</p>
    <ol>
      <li><strong>{{ CLASS_UK.dict }}</strong>. {{ HOW.dict }} Ми читаємо власні списки скорочень словників (таблиці нижче). Слово з міткою <em>Галиц.</em>, <em>Гуцул.</em>, <em>Угор.</em>, <em>гал.</em>, <em>діал.</em>, <em>hucul.</em>, <em>ungr.</em> позначене як регіональне чи діалектне.
        Мітки <em>повіту чи губернії</em> у Грінченка («Лохв. у.», «Харьк. г.») лише кажуть, де слово чи приклад <em>записано</em>; такі слова мають окрему підпозначку «місце запису за словником (не обов’язково діалектне)» і діалектними не називаються.
        Група говорів додається, лише якщо область названа у наших цитованих статтях uk.wikipedia (газетьєр нижче).</li>
      <li><strong>{{ CLASS_UK.corpus }}</strong>. {{ HOW.corpus }} Формули: для кожного регіону порівнюємо частоту леми в його пам’ятках із частотою в решті корпусу: log-likelihood G² (df = 1) і log₂-відношення відносних частот (LR, зі згладжуванням 0,5).
        Регіон береться, якщо G² показує перевагу, p &lt; {{ TH.alpha }}/k, де k — число регіонів з матеріалом (поправка Бонферроні), LR ≥ {{ TH.lrMin }} (щонайменше вдвічі), у регіоні ≥ {{ TH.fRegionMin }} вживань, у лемі ≥ {{ TH.fMin }} вживань і регіонів з матеріалом ≥ {{ TH.regionsMin }}.
        Це <strong>не діалектна мітка</strong> (FD-2): регіон пам’ятки — місце видання чи авторства джерела.</li>
      <li><strong>{{ CLASS_UK.general }}</strong>. {{ HOW.general }} Міра розсіювання — нормований DP Грайса (0 — розподіл такий, як у корпусі, 1 — усе в одному регіоні): DP = ½ Σ|частка леми в регіоні − частка регіону в корпусі|, поділений на (1 − найменша частка регіону). Умови: ≥ {{ TH.fMin }} вживань, ≥ {{ TH.k }} регіонів, DP ≤ {{ TH.dpMax }}.</li>
      <li><strong>{{ SUM_NORM_UK }}</strong> (підклас загальновживаного, рахується окремо). {{ HOW_SUM }} Умова: для слова немає порівнюваних даних корпусу (немає засвідчень, або вживань менше ніж {{ TH.fMin }}, або регіонів з матеріалом менше ніж {{ TH.regionsMin }}), воно є заголовним у СУМ-11 або СУМ-20, жодне з його значень не має позначки (окрім «перен.», граматичних і словотвірних приміток: «тільки недок.», «тільки мн.», «присл.», «зменш.» …), і жодне інше джерело не дає діалектної чи регістрової позначки.</li>
      <li><strong>{{ VESUM_NORM_UK }}</strong> (клас 4, ступінь середній; продовження попереднього пункту). {{ HOW_VESUM }} Слово обмежене, якщо тег ВЕСУМ чи позначка СУМ вказує вжиток (розм., заст., спец. …): тоді воно далі не підходить під клас 4.</li>
      <li><strong>{{ CLASS_UK.witness }}</strong> (клас 5, ступінь слабкий). {{ HOW.witness }} Картка пише кількість пам’яток, регіон і століття: «засвідчено лише в N пам’ятках з X, XII ст. (слабкий доказ)»; для давніх пам’яток — «давньоукраїнське, …». Ми <em>не називаємо</em> такі слова діалектними.</li>
      <li><strong>{{ CLASS_UK.base }}</strong> (клас 6, ступінь слабкий). {{ HOW.base }} Основу словника ми цитуємо з його власної передмови (таблиця нижче) і нічого не вигадуємо: якщо передмова краю не називає, словник сюди не потрапляє.</li>
      <li><strong>{{ CLASS_UK.few }}</strong> (клас 7, без ступеня). {{ HOW.few }}</li>
    </ol>

    <h3 id="grades">Ступінь доказу</h3>
    <ul class="small" data-testid="lbm-grades">
      <li><strong>{{ GRADE_UK.strong }}</strong>: діалектна чи регіональна позначка словника (клас 1); значущий перекіс у корпусі з G² ≥ {{ G2_STRONG }} (p &lt; 0,001; клас 2); розсіювання щонайменше в {{ TH.k }} регіонах (клас 3).</li>
      <li><strong>{{ GRADE_UK.medium }}</strong>: словник лише називає місце запису (не обов’язково діалектне); значущий перекіс у корпусі з меншим G²; нормативний статус за словником (клас 4).</li>
      <li><strong>{{ GRADE_UK.weak }}</strong>: пам’ятки одного регіону (клас 5) і регіональна база словника (клас 6): такі класи кажуть, звідки джерело, а не що слово діалектне.</li>
    </ul>
    <h3 id="bases">Регіональна база словників (клас 6), дослівно з передмов</h3>
    <ul class="small" data-testid="lbm-bases"><li v-for="b in DICT_BASES" :key="b.id"><strong>{{ b.short }}</strong>: {{ b.region }} — <q>{{ b.quote }}</q> <a :href="b.url" rel="noopener" target="_blank">джерело ↗</a></li></ul>
    <p class="small muted">Словники без названої в передмові бази (наприклад Грінченко) до класу 6 не потрапляють. Усі сім класів: {{ Object.values(CLASS_KEY_UK).join('; ') }}.</p>
    <h3>Словники і їхні списки скорочень</h3>
    <p class="small">Кожен рядок цитує пояснення скорочення з власного списку словника (сторінка — посилання). Нічого не додано від себе, крім відповідності «скорочення → область»; повіти розкриваються за статтями uk.wikipedia (CC BY-SA 4.0).</p>
    <section v-for="t in [...DICT_LABEL_TABLES, ...EXTRA_LABEL_TABLES]" :key="t.id" class="lb-table" :data-testid="`lbm-${t.id}`">
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
