<script setup lang="ts">
/** Shell: navigation + FIXTURE banner (data/*.json carry "generated": "FIXTURE" until the real pipeline overwrites them). */
import { useData } from './composables/useData.ts'
import { ref } from 'vue'
import { loadFailures, retryEpoch, retryFailed } from './lib/fetchJson.ts'
const { isFixture, error, loading, progress } = useData()

/** Theme: light by default; an explicit choice is persisted in localStorage; prefers-color-scheme (CSS) applies only while no choice is stored. */
const KEY = 'lex-theme'
function stored(): 'light' | 'dark' | null {
  try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : null } catch { return null }
}
const choice = ref<'light' | 'dark' | null>(stored())
function apply() {
  const el = document.documentElement
  if (choice.value) el.setAttribute('data-theme', choice.value); else el.removeAttribute('data-theme')
}
function isDark(): boolean {
  if (choice.value) return choice.value === 'dark'
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches } catch { return false }
}
const dark = ref(isDark())
function toggle() {
  choice.value = dark.value ? 'light' : 'dark'
  dark.value = choice.value === 'dark'
  try { localStorage.setItem(KEY, choice.value) } catch { /* private mode: the choice lasts for this session only */ }
  apply()
}
apply()
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
      <RouterLink to="/texts">Тексти</RouterLink>
      <RouterLink to="/songs">Пісні</RouterLink>
      <RouterLink to="/phrases">Сполучення</RouterLink>
      <RouterLink to="/plast">Пласт</RouterLink>
      <RouterLink to="/sophia">Софія</RouterLink>
      <RouterLink to="/map">Мапа</RouterLink>
      <RouterLink to="/atlas">Атлас</RouterLink>
      <RouterLink to="/corpus">Корпус</RouterLink>
      <RouterLink to="/report">Звіт</RouterLink>
      <RouterLink to="/method">Метод</RouterLink>
    </nav>
    <button type="button" class="themebtn" :aria-pressed="dark" @click="toggle">{{ dark ? '☀ Світла' : '☾ Темна' }}</button>
  </header>
  <p v-if="isFixture" class="fixture" role="status">Показано <strong>фікстуру</strong>: вигадані числа й приклади для розробки інтерфейсу (деривації, епохи й мітки обчислено реальним кодом). Справжні дані замінять <code>public/data</code>.</p>
  <p v-if="error" class="fixture err" role="alert">Не вдалося завантажити дані: {{ error }}</p>
  <p v-if="loadFailures.size" class="fixture err" role="alert">Не вдалося завантажити дані, спробуйте ще раз. <button type="button" class="themebtn" @click="retryFailed">Спробувати ще раз</button></p>
  <div v-if="loading" class="loadbar sans small" role="progressbar" aria-label="Завантаження даних" :aria-valuenow="Math.round(progress.frac * 100)" aria-valuemin="0" aria-valuemax="100">
    <span>{{ progress.phase }}… {{ progress.note }} · {{ Math.round(progress.frac * 100) }}%</span><i :style="{ width: progress.frac * 100 + '%' }" />
  </div>
  <main id="main"><RouterView :key="retryEpoch" /></main>
  <footer class="foot">
    Похідні дані некомерційні, з тією самою ліцензією (CC BY-NC-SA): ВЕСУМ і Brown-UK — CC BY-NC-SA 4.0, TOROT — CC BY-NC-SA 3.0, LanguageTool — LGPL.
    <RouterLink to="/corpus">Ліцензії</RouterLink> · <RouterLink to="/method">Як це працює</RouterLink>
  </footer>
</template>
