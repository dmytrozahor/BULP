/** MD: lazy loader for public/data/modern.json and reactive badge lookup (empty until the file arrives or when it is absent). */
import { shallowRef } from 'vue'
import { modernBadges, type ModernFile } from '../../core/modern.ts'

export const modernFile = shallowRef<ModernFile>()
let started = false
export function loadModern(): void {
  if (started) return
  started = true
  fetch('./data/modern.json').then(r => (r.ok ? r.json() : undefined)).then(j => { if (j && j.format === 1) modernFile.value = j as ModernFile }).catch(() => { /* optional data */ })
}
export function modernOf(word: string) { loadModern(); const f = modernFile.value; return f ? modernBadges(word, f) : [] }
