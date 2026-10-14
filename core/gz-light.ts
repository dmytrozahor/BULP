/**
 * SPEC 63 GZ-1: a token that IS a VESUM form of a modern word must never stay a bare, unlinked word.
 * Cause (measured, analysis/galician-extraction.md): FX-3 («one lemma = one POS class», pipelines/build.ts) drops the token types of the losing class of a homonym id
 * (noun мати «матері» vs verb мати, noun раз «разу» vs adverb раз, noun ніж «ножем» vs conjunction ніж). A dropped type is rightly not counted as a strict link of the
 * kept card, but it also got no light-card reference, so the reader showed a plain word although VESUM lists it. The same holds for every unresolved type whose own spelling is a VESUM form.
 * Fix: such tokens reference a light card /lw/:lemma (VESUM lemma + tags, count, first example); the strict link count is unchanged.
 */
import { key } from './text.ts'
import type { VesumHit } from './types.ts'

const tier = (tags: string) => /:(bad|err|subst|slang|vulg|obsc)\b/.test(':' + tags) ? 2 : /:(arch|alt|short)\b/.test(':' + tags) ? 1 : 0
/** The VESUM analysis a light card cites for a spelling: unflagged before flagged, common noun before proper name/abbreviation, lowercase lemma first. */
export function bestHit(hits: readonly VesumHit[]): VesumHit | undefined {
  const sc = (h: VesumHit) => tier(h.tags) * 4 + (/:(prop|abbr|lname|fname|pname)\b/.test(':' + h.tags) ? 2 : 0) + (h.lemma === h.lemma.toLowerCase() ? 0 : 1)
  return [...hits].sort((a, b) => sc(a) - sc(b))[0]
}

export interface GzLightResult { refs: Map<string, string[]>; lemmas: [string, string, number, string][]; tokens: number }
/**
 * `ws`: witnesses (lang, tokens); `ids[wi][ti]` = lemma index of a linked token (-1 unlinked); `have(wid, ti)` = the token already has a ref.
 * Only 'uk' witnesses (modern letters): an Old East Slavic spelling that happens to equal a modern form is not evidence (TOROT/Stanza routes decide there).
 * `lemmaKnown(lemma)` = a light entry for the lemma already exists (its count is increased, the example kept).
 */
export function vesumFormLight(
  ws: { id: string; lang: string; noFreq?: boolean; tokens: { raw: string; loc: string }[] }[], ids: Int32Array[], have: (wid: string, ti: number) => boolean,
  hits: ReadonlyMap<string, VesumHit[]>, existing: Map<string, [string, string, number, string]> = new Map(),
): GzLightResult {
  const refs = new Map<string, string[]>(), add = new Map<string, [string, string, number, string]>()
  let tokens = 0
  ws.forEach((w, wi) => {
    if (w.lang !== 'uk' || w.noFreq) return
    const r: string[] = []; let any = false
    w.tokens.forEach((t, ti) => {
      r.push('')
      if (ids[wi]![ti]! >= 0 || have(w.id, ti)) return
      const h = bestHit(hits.get(key(t.raw)) ?? []); if (!h) return
      r[ti] = 'l:' + h.lemma; any = true; tokens++
      const e = existing.get(h.lemma) ?? add.get(h.lemma)
      if (e) e[2]++; else add.set(h.lemma, [h.lemma, h.tags, 1, `${w.id}|${t.loc}|${t.raw}`])
    })
    if (any) refs.set(w.id, r)
  })
  return { refs, lemmas: [...add.values()], tokens }
}
