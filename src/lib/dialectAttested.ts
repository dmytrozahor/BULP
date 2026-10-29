/**
 * SPEC 63 OV-13: a dialect spelling of the LEMMA that a source prints beats the rule output («засвідчено: …» against «за правилом (…)»).
 * Pure, no data imports: the caller passes the reflex table (core/ikavism.ts DIALECT_REFLEXES, loaded lazily) so the first-load bundle does not grow.
 * Аркушин (LB-11): the book's dialect transcription is never stored (© policy, core/arkushyn-parse.ts), so a transcription cannot be an attested form here;
 * `arkushynSrc` is the label for a headword spelling that differs from the standard lemma, should such rows be stored (volume + page are the stored `т.N с.N`).
 */
import type { Evidence } from '../../core/evidence.ts'
export interface Reflex { std: string; form: string; regions: string[]; kind: string; evidence: Evidence }
export interface AttestedForm { form: string; dialect: string; src: string; ev?: Evidence }
const SRC: Record<string, string> = { WUK: 'uk.wikipedia', ENC: 'ЕУМ', SHEV: 'Шевельов', WPUK: 'uk.wikipedia' }
export const arkushynSrc = (vol: number, page: number) => `Аркушин, т. ${vol}, с. ${page}`
/** the first printed dialect spelling of `lemma` for dialect `d` (orthography/chancery spellings are not a living dialect form and are skipped) */
export function attestedFormOf(lemma: string, d: string, reflexes: Reflex[]): AttestedForm | undefined {
  const x = reflexes.find(r => r.kind === 'dialect' && r.std.toLowerCase() === lemma.toLowerCase() && r.regions.includes(d))
  return x ? { form: x.form, dialect: d, src: `засвідчено: ${SRC[x.evidence.source] ?? x.evidence.source}`, ev: x.evidence } : undefined
}
