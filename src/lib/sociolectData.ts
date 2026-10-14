/** SL: lazy loader for public/data/sociolect.json and reactive badge / literary-status lookups (empty until the file arrives or when it is absent). */
import { shallowRef } from 'vue'
import { dialectClaims, literaryStatus, sociolectBadges, type SociolectFile } from '../../core/sociolect.ts'

export const sociolectFile = shallowRef<SociolectFile>()
let started = false
export function loadSociolect(): void {
  if (started) return
  started = true
  fetch('./data/sociolect.json').then(r => (r.ok ? r.json() : undefined)).then(j => { if (j && j.format === 1) sociolectFile.value = j as SociolectFile }).catch(() => { /* optional data */ })
}
export function socBadgesOf(word: string) { loadSociolect(); const f = sociolectFile.value; return f ? sociolectBadges(word, f) : [] }
export function dialectOf(word: string) { loadSociolect(); const f = sociolectFile.value; return f ? dialectClaims(word, f) : [] }
export function literaryOf(word: string) { loadSociolect(); const f = sociolectFile.value; return f ? literaryStatus(word, f) : null }
