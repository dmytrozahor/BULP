<script setup lang="ts">
/** Shell: navigation + FIXTURE banner (data/*.json carry "generated": "FIXTURE" until the real pipeline overwrites them). */
import { useData } from './composables/useData.ts'
const { isFixture, error, loading, progress } = useData()
</script>

<template>
  <a class="skip" href="#main">До змісту</a>
  <header class="top">
    <RouterLink to="/" class="brand">Лексикон<small>походження словоформ</small></RouterLink>
    <nav aria-label="Розділи">
      <RouterLink to="/">Пошук</RouterLink>
      <RouterLink to="/annotate">Анотатор</RouterLink>
      <RouterLink to="/analyze">Аналіз слова</RouterLink>
      <RouterLink to="/derive">Деривація</RouterLink>
      <RouterLink to="/corpus">Корпус</RouterLink>
      <RouterLink to="/report">Звіт</RouterLink>
      <RouterLink to="/method">Метод</RouterLink>
    </nav>
  </header>
  <p v-if="isFixture" class="fixture" role="status">Показано <strong>фікстуру</strong>: вигадані числа й приклади для розробки інтерфейсу (деривації, епохи й мітки обчислено реальним кодом). Справжні дані замінять <code>public/data</code>.</p>
  <p v-if="error" class="fixture err" role="alert">Не вдалося завантажити дані: {{ error }}</p>
  <div v-if="loading" class="loadbar sans small" role="progressbar" aria-label="Завантаження даних" :aria-valuenow="Math.round(progress.frac * 100)" aria-valuemin="0" aria-valuemax="100">
    <span>{{ progress.phase }}… {{ progress.note }} · {{ Math.round(progress.frac * 100) }}%</span><i :style="{ width: progress.frac * 100 + '%' }" />
  </div>
  <main id="main"><RouterView /></main>
  <footer class="foot">
    Похідні дані некомерційні, з тією самою ліцензією (CC BY-NC-SA): ВЕСУМ і Brown-UK — CC BY-NC-SA 4.0, TOROT — CC BY-NC-SA 3.0, LanguageTool — LGPL.
    <RouterLink to="/corpus">Ліцензії</RouterLink> · <RouterLink to="/method">Як це працює</RouterLink>
  </footer>
</template>
