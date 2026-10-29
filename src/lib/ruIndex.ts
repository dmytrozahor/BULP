/**
 * SPEC 63 MM-36: client side of the Russian-headword index (lm/ru/<bucket>.json, core/ru-head.ts). `ruLookups` plugs into AnnotateData.ru, so the annotator, «Аналіз слова» (which the search page embeds)
 * and the word card use the same classifier (core/word-rules.ts wordRules → core/ru-contact.ts classifyRu). A shard that is still loading reads as «no headword» and the arrival re-runs the reader.
 */
import { DIALECT_LEX } from '../../core/dialect-lex.ts'
import { key } from '../../core/text.ts'
import { ruHitsOf, type RuHeadFile } from '../../core/ru-head.ts'
import type { RuLookups } from '../../core/ru-contact.ts'
import { lmPeek } from './parts.ts'

const DIALECT_KEYS = new Set(DIALECT_LEX.flatMap(e => e.w.map(key)))
export const ruLookups: Pick<RuLookups, 'ruHead' | 'isDialect'> = {
  ruHead: k => ruHitsOf(lmPeek<RuHeadFile>('ru', k)?.entries, k),
  isDialect: k => DIALECT_KEYS.has(k),
}
