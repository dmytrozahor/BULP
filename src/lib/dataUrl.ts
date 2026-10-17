/**
 * SPEC 63 PF-7 — the one place that decides where a data URL points. The big data (core/data-dirs.ts CDN_DIRS: lex, texts, ix, cd, …) is on S3 + CloudFront under
 * `<base>/data/<buildId>/…`; the pointer src/data/data-version.json is bundled with the app, so a deployed app always asks for the build it was released with.
 * Small committed files (boot.json, lexicon.json, phr/, …) stay on GitHub Pages (`./data/…`).
 * Dev: `VITE_DATA_BASE` unset → read ./data (a local public/data); `cdn` → use the pointer's CDN; an https URL → use that base with the pointer's buildId.
 */
import pointer from '../data/data-version.json'
import { resolveDataUrl, type DataVersion } from '../../core/data-dirs.ts'

const env = (import.meta as { env?: Record<string, string | boolean | undefined> }).env ?? {}
const override = typeof env.VITE_DATA_BASE === 'string' ? env.VITE_DATA_BASE : ''
const version: DataVersion = override.startsWith('http') ? { ...(pointer as DataVersion), base: override } : (pointer as DataVersion)
const local = override === 'local' || (!!env.DEV && !override)

export const dataUrl = (url: string): string => resolveDataUrl(url, version, local)
