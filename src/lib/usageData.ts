/** UL-1: lazy, cached loader for public/data/usage.json and a reactive lemma → usage-claims lookup (empty until the file arrives or when it is absent). */
import { shallowRef } from 'vue'
import { usageClaims, type UsageFile } from '../../core/usage.ts'

const file = shallowRef<UsageFile>()
let started = false
export function loadUsage(): void {
  if (started) return
  started = true
  fetch('./data/usage.json').then(r => (r.ok ? r.json() : undefined)).then(j => { if (j && j.format === 1) file.value = j as UsageFile }).catch(() => { /* optional data */ })
}
/** Usage claims of a lemma (reactive through `file`). */
export function usageOf(lemma: string) {
  loadUsage()
  const f = file.value, rows = f?.lemmas[lemma]
  return rows && f ? usageClaims(lemma, rows, f.vesumLoc, f.wikt.retrieved) : []
}
export const usageFile = file
