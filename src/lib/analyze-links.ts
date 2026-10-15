import { key } from '../../core/text.ts'
import { formTo, wordTo } from './nav.ts'

/**
 * SPEC 63 NV-2 / NV-3: where a form shown by «Аналіз слова» leads. /w/:lemma if it is a lemma of the lexicon, /f/:form?lemma= if the lexicon attests the spelling
 * or its paradigm, /lw/:lemma if only the light card (rare VESUM lemma) exists. Anything else goes to the SPELLING page /f/:form (kind 'spelling'), which
 * shows the unlinked-spelling record (core/unlinked.ts) — never a dead end (BL-16), and never labelled «сторінка слова» because no lemma stands behind it.
 */
export interface LinkCtx {
  lemmas: { has(l: string): boolean }
  /** lemma/form/paradigm index (searchIdx.map): normalised key → hits */
  hits: { get(k: string): { lemma: string; via: string }[] | undefined }
  light?: ReadonlySet<string>
  /** SPEC 63 CV-2: key → card hits of the non-lexicon cards (core/cv.ts cardMap): light, CV, archaic */
  cards?: { get(k: string): { kind: 'lw' | 'ar'; id: string }[] | undefined }
}
export interface AnalyzeLink { to: string; kind: 'word' | 'spelling' }
export const analyzeLink = (form: string, ctx: LinkCtx): AnalyzeLink => {
  if (ctx.lemmas.has(form)) return { to: wordTo(form), kind: 'word' }
  const h = ctx.hits.get(key(form))?.[0]
  if (h) return { to: h.via === 'lemma' ? wordTo(h.lemma) : formTo(form, h.lemma), kind: 'word' }
  if (ctx.light?.has(form)) return { to: `/lw/${encodeURIComponent(form)}`, kind: 'word' }
  const c = ctx.cards?.get(key(form))?.[0]
  if (c) return { to: `/${c.kind}/${encodeURIComponent(c.id)}`, kind: 'word' }
  return { to: formTo(form), kind: 'spelling' }
}
export const analyzeTarget = (form: string, ctx: LinkCtx): string => analyzeLink(form, ctx).to
