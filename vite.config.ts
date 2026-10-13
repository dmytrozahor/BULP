import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: { alias: { '@core': fileURLToPath(new URL('./core', import.meta.url)) } },
  // real-data tests read ~2k shards + the 13 MB core; the default 5 s timed out on the CI runner (run 38476803356)
  test: { include: ['tests/**/*.test.ts'], testTimeout: 60_000 },
})
