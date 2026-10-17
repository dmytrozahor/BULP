/** SL: lazy loader for public/data/sociolect.json and reactive badge / literary-status lookups (empty until the file arrives or when it is absent). */
import { shallowRef } from 'vue'
import { fetchJson } from './fetchJson.ts'
import { dialectClaims, literaryStatus, sociolectBadges, type PlastEntry, type SociolectFile } from '../../core/sociolect.ts'
import { key } from '../../core/text.ts'

export const sociolectFile = shallowRef<SociolectFile>()
let started = false
export function loadSociolect(): void {
  if (started) return
  started = true
  fetchJson('./data/sociolect.json').then(j => { const f = j as SociolectFile | null; if (f && f.format === 1) sociolectFile.value = f }).catch(() => { started = false })   // absent = optional data; a failure is shown (DataNotice) and the next read tries again
}
export function socBadgesOf(word: string) { loadSociolect(); const f = sociolectFile.value; return f ? sociolectBadges(word, f) : [] }
export function dialectOf(word: string) { loadSociolect(); const f = sociolectFile.value; return f ? dialectClaims(word, f) : [] }
export function literaryOf(word: string) { loadSociolect(); const f = sociolectFile.value; return f ? literaryStatus(word, f) : null }
/** search (user 2026-10-15: «why can't i find вишкіл, впр which are in plast lexicon?»): Plast entries whose headword or quoted gloss
 *  matches the query, case- and stress-insensitive (key()); headword hits first. Each hit keeps its own source id for the /source card. */
/** every Plast entry with its source id, alphabetical — the /plast page (user: «add another page of plast vocabulary») */
export function plastAll(): (PlastEntry & { src: string; byGloss: boolean })[] {
  loadSociolect(); const f = sociolectFile.value
  return f ? f.plast.entries.map(e => ({ ...e, src: e.s ?? f.plast.source, byGloss: false })).sort((a, b) => key(a.w).localeCompare(key(b.w), 'uk')) : []
}
export function plastSearch(q: string, max = 30): (PlastEntry & { src: string; byGloss: boolean })[] {
  loadSociolect(); const f = sociolectFile.value, k = key(q.trim())
  if (!f || k.length < 2) return []
  const out: (PlastEntry & { src: string; byGloss: boolean })[] = []
  for (const e of f.plast.entries) {
    const w = key(e.w), head = w === k || (k.length >= 3 && w.includes(k)), gloss = k.length >= 3 && key(e.g).includes(k)
    if (head || gloss) out.push({ ...e, src: e.s ?? f.plast.source, byGloss: !head })
  }
  return out.sort((a, b) => Number(a.byGloss) - Number(b.byGloss)).slice(0, max)
}
