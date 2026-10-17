/** MD: lazy loader for public/data/modern.json and reactive badge lookup (empty until the file arrives or when it is absent). */
import { shallowRef } from 'vue'
import { fetchJson } from './fetchJson.ts'
import { modernBadges, type ModernFile } from '../../core/modern.ts'

export const modernFile = shallowRef<ModernFile>()
let started = false
export function loadModern(): void {
  if (started) return
  started = true
  fetchJson('./data/modern.json').then(j => { const f = j as ModernFile | null; if (f && f.format === 1) modernFile.value = f }).catch(() => { started = false })   // absent = optional data; a failure is shown (DataNotice) and the next read tries again
}
export function modernOf(word: string) { loadModern(); const f = modernFile.value; return f ? modernBadges(word, f) : [] }
