/**
 * SPEC 63 OQ — OCR quality gate (owner 2026-10-21, «даль перша фіксація з невичитаного OCR»: first attestation 1092 from «Архангельське Євангеліє 1092 (OCR)», archive.org, not proofread).
 * Unproofread OCR of pre-1700 Cyrillic is very noisy, so it must not set a first attestation, an `oldest` form or an epoch claim.
 *
 * Score of a witness (measured on the live build, 945 OCR witnesses with ≥ 1500 tokens):  S = L × (1 − H)
 *   L = share of word tokens that the build linked to a VESUM lemma (any route: TOROT lemma, Stanza lemma, derived token, direct) — the share that resolves to a real word;
 *   H = hapax-type rate = word TYPES occurring once ÷ tokens — OCR noise makes many one-off garbage spellings (junk glyph tokens are already dropped by the tokenizer: mixed-script and digit tokens measured 0.000).
 * Measured medians of S: OCR < 1700: 0.34 · proofread < 1700: 0.43 · OCR 1700–1850: 0.29 · proofread 1700–1850: 0.55 · OCR ≥ 1850: 0.55 · proofread ≥ 1850: 0.67.
 * Bands (OCR witnesses only; a proofread witness is always `ok`):
 *   garbage  S < 0.15            — near-garbage: no first attestation, no epoch claim, and not even KWIC;
 *   low      S < 0.45 (date < 1800) or S < 0.30 (date ≥ 1800) — «OCR низької якості»: no first attestation / oldest form / epoch claim, kept as KWIC with a badge;
 *   ok       otherwise (modern OCR of normal quality still ranks last among witness types, build-annotate.ts WT).
 * The thresholds are the proofread median for old print (0.45 ≈ the proofread < 1800 median) and a looser 0.30 for later print (the 10th percentile of OCR ≥ 1850 is 0.27, so ~12 % of modern OCR is flagged): ours, stated, not from a source.
 * Preferred edition: an OCR witness whose work has a proofread edition in the corpus (TOROT, Wikisource, izbornyk) never ranks, whatever its score.
 */
export type OqBand = 'ok' | 'low' | 'garbage'
export const OQ_GARBAGE = 0.15
export const OQ_LOW_OLD = 0.45   // witnesses dated before 1800
export const OQ_LOW_NEW = 0.30
export const OQ_OLD_BEFORE = 1800

/** OCR witness id → proofread edition(s) of the same work already in the corpus (matched by title and date; TOROT, Wikisource later_ed). */
export const PROOFREAD_EDITION: Record<string, string[]> = {
  hv_ia_arch1092: ['arch'], hv_ia_hypatian_codex: ['kievchr', 'gvl'], hv_ia_gramat0slovenska: ['hv_ws_68448'],
  hv_ia_enejida_1798: ['hv_ws_23660'], hv_ia_eneyida1798: ['hv_ws_23660'], hv_ia_hrammatyka1818: ['hv_ws_40481'], hv_ia_hrammatyka1822: ['hv_ws_41318'],
}

export interface OqStats { tokens: number; linked: number; hapaxTypes: number }
export const ocrScore = (s: OqStats): number => (s.tokens > 0 ? (s.linked / s.tokens) * (1 - s.hapaxTypes / s.tokens) : 0)

export interface OqResult { score: number; band: OqBand; /** proofread edition ids present in the corpus */ preferred?: string[]; /** excluded from first attestation / oldest / epoch claims */ excluded: boolean; reason?: string }
export function ocrQuality(w: { id: string; witnessType: string; date: [number, number] }, s: OqStats, corpusIds: ReadonlySet<string>): OqResult {
  if (w.witnessType !== 'ocr') return { score: ocrScore(s), band: 'ok', excluded: false }
  const score = ocrScore(s), preferred = (PROOFREAD_EDITION[w.id] ?? []).filter(id => corpusIds.has(id))
  const band: OqBand = score < OQ_GARBAGE ? 'garbage' : score < (w.date[1] < OQ_OLD_BEFORE ? OQ_LOW_OLD : OQ_LOW_NEW) ? 'low' : 'ok'
  const excluded = band !== 'ok' || preferred.length > 0
  return { score: +score.toFixed(3), band, ...(preferred.length ? { preferred } : {}), excluded,
    ...(excluded ? { reason: preferred.length ? `є вичитане видання: ${preferred.join(', ')}` : `OCR низької якості (S = ${score.toFixed(2)})` } : {}) }
}
/** the compact flag stored on a witness record; absent = nothing to say */
export const oqFlag = (r: OqResult): { score: number; band: Exclude<OqBand, 'ok'>; preferred?: string[] } | undefined =>
  r.band === 'ok' && !r.preferred ? undefined : { score: r.score, band: (r.band === 'ok' ? 'low' : r.band) as Exclude<OqBand, 'ok'>, ...(r.preferred ? { preferred: r.preferred } : {}) }
