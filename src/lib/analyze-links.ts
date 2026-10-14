import { key } from '../../core/text.ts'
import { formTo, wordTo } from './nav.ts'

/**
 * SPEC 63 NV-2: where a form shown by «Аналіз слова» leads. /w/:lemma if it is a lemma of the lexicon, /f/:form?lemma= if the lexicon attests the spelling,
 * /lw/:lemma if only the light card (rare VESUM lemma) exists, else /f/:form (the form page derives what it can; BL-16: never a dead end).
 */
export interface LinkCtx {
  lemmas: { has(l: string): boolean }
  /** lemma/form/paradigm index (searchIdx.map): normalised key → hits */
  hits: { get(k: string): { lemma: string; via: string }[] | undefined }
  light?: ReadonlySet<string>
}
export const analyzeTarget = (form: string, ctx: LinkCtx): string => {
  if (ctx.lemmas.has(form)) return wordTo(form)
  const h = ctx.hits.get(key(form))?.[0]
  if (h) return h.via === 'lemma' ? wordTo(h.lemma) : formTo(form, h.lemma)
  if (ctx.light?.has(form)) return `/lw/${encodeURIComponent(form)}`
  return formTo(form)
}
