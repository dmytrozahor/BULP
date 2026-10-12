/**
 * U-10 / U-16: the link from a citation to the exact document it came from. Pure; unit-tested in tests/ui.test.ts.
 * The corpus knows one URL per witness (WitnessMeta.url); the locator (стб./абз./с./folio/§/verse) is shown beside the link.
 * Per source kind (URL patterns verified 2026-10-12 against the live sites / cached pages, W2-2):
 *  - Wikisource: the rendered page carries <span class="pagenum ws-pagenum" id="107" data-page-number="107">, so «с. 107» → `#107`; the loc's «Title/Subpage» prefix is the page to open.
 *  - віра.укр: chapter page `/b/arch-gospel/john-cs-ar-1`, verse `<div id="john-cs-ar-1:5">` (research/01 §2), loc «Ін 1:5».
 *  - izbornyk: no stable column anchors (the only ids are footnotes) → browser text fragment `#:~:text=prefix-,node` with the token's exact raw spelling;
 *    it falls back to the page top when the spelling differs, then the printed locator is the guide.
 *  - TOROT XML is browsed on GitHub (the raw URL only downloads); its locator is the sentence-token citation «27.18», shown in the label.
 */
export interface SrcLink { url: string; label: string; exact: boolean }
export interface SrcCtx { left?: string; node?: string; right?: string }

const RAW = /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/
const VIRA = /^(https?:\/\/[^/]+\/b\/[^/#?]+)(?:\/.*)?$/
const VIRA_BOOK: Record<string, string> = { 'Мт': 'matt', 'Мк': 'mark', 'Лк': 'luke', 'Ін': 'john' }
const WS = /^(https?:\/\/[a-z-]+\.wikisource\.org\/wiki\/)/
const enc = (s: string) => encodeURIComponent(s).replace(/-/g, '%2D')
const label = (loc?: string) => loc ? `відкрити джерело (${loc})` : 'відкрити джерело'

/** Wikisource: loc «Хуторна поэзія/Божий Суд, с. 107» = subpage title + printed page. Returns the page to open and the page-number anchor id. */
export function wikisourceLink(url: string, loc?: string): { url: string; page?: string } {
  const m = loc ? /^(.*?),?\s*с\.\s*([^\s,]+)\s*$/.exec(loc) : null
  const title = m?.[1]?.trim(), root = WS.exec(url)?.[1]
  const base = root && title?.includes('/') ? root + encodeURIComponent(title.replace(/ /g, '_')).replace(/%2F/g, '/') : url
  return { url: base, page: m?.[2] }
}

/** віра.укр: loc «Ін 1:5» → /b/arch-gospel/john-cs-ar-1#john-cs-ar-1:5. */
export function viraLink(url: string, loc?: string): string | undefined {
  const m = loc ? /^(\S+)\s+(\d+):(\d+)$/.exec(loc) : null, b = m ? VIRA_BOOK[m[1]!] : undefined, base = VIRA.exec(url)?.[1]
  return m && b && base ? `${base}/${b}-cs-ar-${m[2]}#${b}-cs-ar-${m[2]}:${m[3]}` : undefined
}

export function sourceLink(w: { url?: string } | undefined, loc?: string, ctx?: SrcCtx): SrcLink | undefined {
  const url = w?.url; if (!url) return undefined
  const raw = RAW.exec(url)
  if (raw) return { url: `https://github.com/${raw[1]}/${raw[2]}/blob/${raw[3]}/${raw[4]}`, label: `TOROT, ${loc ?? 'XML'}`, exact: false }
  const node = ctx?.node?.trim(), prefix = ctx?.left?.trim().split(/\s+/).pop()
  const frag = node ? `:~:text=${prefix ? `${enc(prefix)}-,` : ''}${enc(node)}` : ''
  if (WS.test(url)) {
    const ws = wikisourceLink(url, loc)
    if (ws.page) return { url: `${ws.url}#${ws.page}${frag}`, label: label(loc), exact: true }   // «#107:~:text=…» = anchor + highlight
  }
  const vira = viraLink(url, loc)
  if (vira) return { url: vira, label: label(loc), exact: true }
  if (node && /^https?:/.test(url) && !url.includes('#')) return { url: `${url}#${frag}`, label: label(loc), exact: true }
  return { url, label: label(loc), exact: false }
}
