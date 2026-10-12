/**
 * U-10 / U-16: the link from a citation to the exact document it came from. Pure; unit-tested in tests/ui.test.ts.
 * The corpus knows one URL per witness (WitnessMeta.url); the locator (стб./абз./с./folio/§/verse) is shown beside the link.
 * A browser text fragment (`#:~:text=prefix-,node`) scrolls to and highlights the occurrence on HTML editions (izbornyk, Wikisource, віра.укр);
 * it silently falls back to the top of the page when the edition spells the passage differently — then the printed locator is the guide.
 * TOROT XML is browsed on GitHub (the raw URL only downloads); its locator is the sentence-token citation «27.18».
 */
export interface SrcLink { url: string; label: string; exact: boolean }
export interface SrcCtx { left?: string; node?: string; right?: string }

const RAW = /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/
const enc = (s: string) => encodeURIComponent(s).replace(/-/g, '%2D')

export function sourceLink(w: { url?: string } | undefined, loc?: string, ctx?: SrcCtx): SrcLink | undefined {
  const url = w?.url; if (!url) return undefined
  const raw = RAW.exec(url)
  if (raw) return { url: `https://github.com/${raw[1]}/${raw[2]}/blob/${raw[3]}/${raw[4]}`, label: `TOROT, ${loc ?? 'XML'}`, exact: false }
  const node = ctx?.node?.trim()
  if (node && /^https?:/.test(url) && !url.includes('#')) {
    const prefix = ctx?.left?.trim().split(/\s+/).pop()
    return { url: `${url}#:~:text=${prefix ? `${enc(prefix)}-,` : ''}${enc(node)}`, label: loc ? `відкрити джерело (${loc})` : 'відкрити джерело', exact: true }
  }
  return { url, label: loc ? `відкрити джерело (${loc})` : 'відкрити джерело', exact: false }
}
