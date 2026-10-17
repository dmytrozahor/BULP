/**
 * SPEC 63 PF-7 — the data directories under public/data that live on the CDN (S3 + CloudFront), not on GitHub Pages.
 * Shared by the app (src/lib/dataUrl.ts routes their URLs) and the upload script (pipelines/data-cdn.ts). Everything else under public/data (boot.json, lexicon.json, phr/, …) is small, committed and served by Pages.
 */
export const CDN_DIRS = ['lex', 'texts', 'cv', 'uv', 'unlinked', 'ix', 'dx', 'cd', 'lm', 'wit', 'pg', 'tc', 'sum'] as const
export type CdnDir = (typeof CDN_DIRS)[number]

/** The committed version pointer (src/data/data-version.json): where the big data lives and which build matches this app. */
export interface DataVersion { format: 1; /** https://<distribution>.cloudfront.net, no trailing slash */ base: string; /** '' = no CDN build yet: everything is read from ./data (dev, tests) */ buildId: string }

/** `<yyyymmddHHMM>-<short sha>` (UTC): sorts by time, names the code commit the data was built from */
export const buildIdOf = (d: Date, sha: string): string => `${d.toISOString().replace(/[-:T]/g, '').slice(0, 12)}-${sha.slice(0, 7)}`
export const BUILD_ID_RE = /^\d{12}-[0-9a-f]{7}$/

/**
 * `./data/<dir>/…` → `<base>/data/<buildId>/<dir>/…` when <dir> is a CDN dir and the pointer names a build; any other URL is returned as is.
 * `local` (dev with no env override) keeps everything on ./data.
 */
export function resolveDataUrl(url: string, v: DataVersion | undefined, local = false): string {
  if (local || !v || !v.buildId || !v.base) return url
  const m = /^\.\/data\/([^/]+)\/(.+)$/.exec(url)
  if (!m || !(CDN_DIRS as readonly string[]).includes(m[1]!)) return url
  return `${v.base.replace(/\/+$/, '')}/data/${v.buildId}/${m[1]}/${m[2]}`
}
