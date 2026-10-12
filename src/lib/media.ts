/**
 * MV-1 / MV-2 (SPEC 60, U-9): media views and affiliation links.
 * research/16 R2.1 [Q]: IIIF base `https://img.dh.gu.se/saintsophia/static/inscriptions/iiif/{uuid}.tif/` with crop `pct:x,y,w,h/`;
 * image licence CC BY-NC on every sampled image row; the licence of the inscription TEXT is unconfirmed, so no transcription is ever shown here.
 * research/17 R3 [Q]: YouTube is used by embed iframe only (per-video ids), never by downloading audio.
 */
export type MediaKind = 'iiif' | 'youtube' | 'image'
export interface WitnessMedia { kind: MediaKind; url: string; attribution: string; licence: string; title?: string }

export interface SophiaItem { id: number; title: string; panel: string; room: string; type: string; from: number; to: number; iiif: string; viewer: string; author?: string }
export interface SophiaData { generated: string; source: string; count: number; licence: { images: string; text: string }; attribution: string; items: SophiaItem[] }

export const SOPHIA_ATTRIBUTION = 'Saint Sophia, University of Gothenburg — CC BY-NC'
export const SOPHIA_PORTAL = 'https://saintsophia.dh.gu.se/'

/** IIIF Image API URL for a crop base ending in `pct:x,y,w,h/`: size `!N,N` fits inside N×N and is valid in IIIF 2 and 3. */
export function iiifImageUrl(base: string, maxPx = 800): string {
  const b = base.endsWith('/') ? base : base + '/'
  return `${b}!${maxPx},${maxPx}/0/default.jpg`
}
/** the whole panel photograph (region `full`) from a crop base */
export function iiifFullUrl(base: string, maxPx = 1600): string {
  const m = /^(.*\.tif)\//.exec(base)
  return m ? `${m[1]}/full/!${maxPx},${maxPx}/0/default.jpg` : iiifImageUrl(base, maxPx)
}
export const iiifInfoUrl = (base: string): string => { const m = /^(.*\.tif)\//.exec(base); return (m ? m[1] : base.replace(/\/$/, '')) + '/info.json' }

export const YT_ID = /^[A-Za-z0-9_-]{11}$/
/** accepts a bare id or a youtu.be / youtube.com watch|embed URL; undefined when no valid 11-char id is found */
export function youtubeId(s: string): string | undefined {
  if (YT_ID.test(s)) return s
  try {
    const u = new URL(s)
    const id = u.hostname.endsWith('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v') ?? /\/embed\/([^/?]+)/.exec(u.pathname)?.[1] ?? ''
    return YT_ID.test(id) ? id : undefined
  } catch { return undefined }
}
/** privacy-enhanced embed host: no cookies until the viewer plays */
export const youtubeEmbedUrl = (id: string): string | undefined => { const v = youtubeId(id); return v ? `https://www.youtube-nocookie.com/embed/${v}?rel=0` : undefined }
export const youtubeWatchUrl = (id: string): string | undefined => { const v = youtubeId(id); return v ? `https://www.youtube.com/watch?v=${v}` : undefined }

/** only http(s) image URLs are rendered (no data:/javascript:) */
export const safeHttp = (u: string): boolean => /^https?:\/\//i.test(u)

/** witness id of a Sophia inscription witness: `sophia-123`, `sophia:123`, `sophia_123` (NW-6 naming is not fixed yet) */
export const sophiaIdOf = (w: string): number | undefined => { const m = /^sophia[-:_](\d+)$/.exec(w); return m ? Number(m[1]) : undefined }
export function mediaOfSophia(it: SophiaItem): WitnessMedia {
  return { kind: 'iiif', url: it.iiif, attribution: SOPHIA_ATTRIBUTION, licence: 'CC BY-NC', title: `Графіті ${it.title}, панель ${it.panel}` }
}

/** Sophia browse: filter by date overlap (years, inclusive) + free text over title/panel/type; sorted by start year then id */
export function filterSophia(items: SophiaItem[], q: { from?: number; to?: number; text?: string; type?: string }): SophiaItem[] {
  const t = (q.text ?? '').trim().toLowerCase()
  return items.filter(i =>
    (q.from === undefined || i.to >= q.from) && (q.to === undefined || i.from <= q.to) &&
    (!q.type || i.type === q.type) &&
    (!t || `${i.title} ${i.panel} ${i.room} ${i.type}`.toLowerCase().includes(t)))
    .sort((a, b) => a.from - b.from || a.id - b.id)
}

/** MV-2: affiliation projects (label «джерело/проєкт») */
export interface Affiliation { id: 'sophia' | 'polyphony' | 'wikisource' | 'izbornyk'; label: string; url: string; host: RegExp }
export const AFFILIATIONS: Affiliation[] = [
  { id: 'sophia', label: 'Софія Київська — графіті (Ґетеборзький університет)', url: SOPHIA_PORTAL, host: /(^|\.)dh\.gu\.se$/ },
  { id: 'polyphony', label: 'Polyphony Project', url: 'https://polyphonyproject.com/', host: /(^|\.)polyphonyproject\.com$/ },
  { id: 'wikisource', label: 'Вікіджерела', url: 'https://uk.wikisource.org/', host: /(^|\.)wikisource\.org$/ },
  { id: 'izbornyk', label: 'Ізборник', url: 'http://izbornyk.org.ua/', host: /(^|\.)izbornyk\.org\.ua$/ },
]
/** affiliations matching any of the given URLs / witness ids (by host; `sophia-N` ids map to the Sophia portal) */
export function affiliationsFor(...refs: (string | undefined)[]): Affiliation[] {
  const out = new Set<Affiliation>()
  for (const r of refs) {
    if (!r) continue
    if (sophiaIdOf(r) !== undefined) out.add(AFFILIATIONS[0]!)
    try { const h = new URL(r).hostname; for (const a of AFFILIATIONS) if (a.host.test(h)) out.add(a) } catch { /* not a URL */ }
  }
  return AFFILIATIONS.filter(a => out.has(a))
}
