/**
 * Lazily loaded public data sets (fetched once, on first use; reactive so that components re-render on arrival).
 * - heteronyms.json (HT-1): stress candidates from ukrainian-word-stress — `method: dictionary`, `status: unknown`, never merged as verified readings.
 * - loanlabels.json (LW-2): Wiktionary donor labels (CC BY-SA 4.0), passed to analyzeLoan as the `labels` lookup.
 * - songs.json (NW-7): song metadata, ≤ 2 quoted lines per authored song, YouTube by id only.
 */
import { shallowRef } from 'vue'
import { D, claim, type Claim } from '../../core/evidence.ts'
import { heteronymKey } from '../../core/heteronyms.ts'
import type { Donor, DonorLabel, LabelLookup } from '../../core/loanwords.ts'

const once = <T>(name: string, set: (v: T) => void): (() => void) => {
  let p: Promise<void> | undefined
  return () => { p ??= fetch(`./data/${name}.json`).then(r => { if (!r.ok) throw new Error(`${name}.json: HTTP ${r.status}`); return r.json() as Promise<T> }).then(set).catch(() => { p = undefined }) }
}

// ── heteronym candidates ────────────────────────────────────────────────────────────────────
export interface HeteronymCandidates { method: 'dictionary'; status: 'unknown'; source: string; note: string; forms: Record<string, string[]> }
const het = shallowRef<HeteronymCandidates>()
const loadHet = once<HeteronymCandidates>('heteronyms', v => { het.value = v })
export interface DictCandidate { form: string; stresses: string[]; source: string; note: string; method: 'dictionary'; status: 'unknown' }
/** pure: stress candidates for a spelling from the data (≥ 2 stresses); unverified, P-1.7 */
export function candidatesIn(d: HeteronymCandidates | undefined, form: string): DictCandidate | undefined {
  const s = d?.forms[heteronymKey(form)]
  return d && s && s.length > 1 ? { form, stresses: s, source: d.source, note: d.note, method: 'dictionary', status: 'unknown' } : undefined
}
/** reactive: triggers the lazy load, re-evaluated by the computed that called it when the file arrives */
export function dictCandidates(form: string): DictCandidate | undefined { loadHet(); return candidatesIn(het.value, form) }

// ── Wiktionary donor labels ─────────────────────────────────────────────────────────────────
export interface LoanLabelData { retrieved: string; licence: string; attribution: string; labels: Record<string, [string, string]>; multi?: Record<string, [string, string][]> }
const loan = shallowRef<LoanLabelData>()
const loadLoan = once<LoanLabelData>('loanlabels', v => { loan.value = v })
const DONORS_UK: Record<string, string> = { pl: 'пол.', fr: 'фр.', en: 'англ.', de: 'нім.', ru: 'рос.', la: 'лат.', grc: 'грец.', cu: 'цсл.', tr: 'тур.', it: 'італ.', nl: 'нід.', hu: 'угор.' }
/** pure: build the lookup from the data (tests call this without fetch) */
export function makeLabelLookup(d: LoanLabelData | undefined): LabelLookup {
  return lemma => {
    const e = d?.labels[lemma]
    if (!d || !e) return undefined
    const others = (d.multi?.[lemma] ?? []).map(m => m[0]).filter(x => x !== e[0])
    const path = `${DONORS_UK[e[0]] ?? e[0]} (мітка Вікісловника)` + (others.length ? `; також у категоріях: ${others.map(x => DONORS_UK[x] ?? x).join(', ')}` : '')
    return claim<DonorLabel>({ donor: e[0] as Donor, path },
      D('WKEN', `https://en.wiktionary.org/wiki/${encodeURIComponent(lemma)}`, e[1], `${d.licence}; ${d.attribution}`))
  }
}
/** reactive `labels` lookup for analyzeLoan: empty until loanlabels.json arrives, then re-evaluated by every computed that called it */
export const loanLabels: LabelLookup = lemma => { loadLoan(); return makeLabelLookup(loan.value)(lemma) as Claim<DonorLabel> | undefined }

// ── songs ───────────────────────────────────────────────────────────────────────────────────
export interface SongMedia { kind: 'youtube'; id: string; url: string; title: string; uploader?: string; role?: string; verified?: string }
export interface SongEvidence { source: string; locator: string; quote: string; kind: 'Q' | 'P' | 'D'; note?: string }
export interface Song {
  id: string; title: string; kind: 'folk' | 'authored' | 'arrangement'; genre: string; region?: string
  earliest?: { date: string; what: string; check: string }; authorship?: string; licence: string; witness?: string
  quotes: { text: string; evidence: SongEvidence }[]; media: SongMedia[]; note?: string; evidence: SongEvidence[]
}
export interface SongsData { generated: string; policy: string; songs: Song[] }
const songs = shallowRef<SongsData>()
const loadSongsOnce = once<SongsData>('songs', v => { songs.value = v })
export function useSongs() { loadSongsOnce(); return songs }
export const KIND_SONG_UK: Record<Song['kind'], string> = { folk: 'народна', authored: 'авторська', arrangement: 'обробка / аранжування' }
/** the song whose corpus witness id is `w` (KWIC → song link); undefined when none */
export const songOfWitness = (d: SongsData | undefined, w: string): Song | undefined => d?.songs.find(s => s.witness === w)
/** ≤ 2 lines of a quotation (NW-7 lyrics policy) */
export const songLines = (t: string): string[] => t.split(/\s*\/\s*|\n/).filter(Boolean).slice(0, 2)
