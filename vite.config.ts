import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: { alias: { '@core': fileURLToPath(new URL('./core', import.meta.url)) } },
  test: { include: ['tests/**/*.test.ts'] },
})
