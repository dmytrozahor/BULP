/**
 * SPEC 63 GG-8: what the Corpus page may show of the vocab-only counts. Data built before 2babe592 carries no `vocabV` marker: its wikipedia-uk / wikipedia-rue / wiktionary-uk totals
 * count every article ~46 times (bundle re-read, GG-4), so the total and those three numbers are hidden until a build with `vocabV` >= 2 replaces them. Pure.
 */
export const VOCAB_V = 2
export const VOCAB_INFLATED = ['wikipedia-uk', 'wikipedia-rue', 'wiktionary-uk']
export const VOCAB_PENDING = "оновлюється: попередній підрахунок завищено через помилку імпорту (виправлено, з'явиться в наступній збірці)"
export interface VocabView { total?: number; sources: [string, number][]; pending: string[]; note?: string }
export function vocabView(b: { nVocab?: number; vocabSources?: [string, number][]; vocabV?: number }): VocabView {
  const all = b.vocabSources ?? []
  if ((b.vocabV ?? 0) >= VOCAB_V) return { ...(b.nVocab ? { total: b.nVocab } : {}), sources: all, pending: [] }
  const pending = all.map(s => s[0]).filter(s => VOCAB_INFLATED.includes(s))
  return { sources: all.filter(s => !VOCAB_INFLATED.includes(s[0])), pending, ...(pending.length || b.nVocab ? { note: VOCAB_PENDING } : {}) }
}
