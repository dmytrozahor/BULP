/** SPEC 63 CP-10.7 client: the presence index (core/presence.ts, lm/presence.json) lets fetchJson answer «absent» for a sidecar bucket the build did not write, with no request and no console 404. Missing / unreadable index = unknown = fetch as before. */
import { PRESENCE_DIRS, PRESENCE_URL, presenceOf, type PresenceDir, type PresenceIndex } from '../../core/presence.ts'
import { dataUrl } from './dataUrl.ts'

const INDEXED = new RegExp(`^\./data/(${PRESENCE_DIRS.map(d => d.replace(/\/\*$/, '/[^/]+')).join('|')})/[^/]+\.json$`)
let index: Promise<PresenceIndex | null> | undefined
/** only the sidecar directories are looked up; the index file itself and every other URL are not */
export const isIndexed = (url: string): boolean => url !== PRESENCE_URL && INDEXED.test(url)
const WAIT_MS = 2500
/** loaded once; a failed load is final for this page (null) */
export function loadPresence(): Promise<PresenceIndex | null> {
  if (!index) index = fetch(dataUrl(PRESENCE_URL)).then(r => (r.ok ? r.json() : null)).then(j => (j && (j as PresenceIndex).format === 1 && (j as PresenceIndex).dirs ? j as PresenceIndex : null)).catch(() => null)
  return index
}
/** false = the build has no such file (do not request it); true / undefined = request it */
export async function knownAbsent(url: string): Promise<boolean> {
  if (!isIndexed(url)) return false
  const ix = await Promise.race([loadPresence(), new Promise<null>(r => setTimeout(() => r(null), WAIT_MS))])
  const m = /^\.\/data\/(.+)\/[^/]+\.json$/.exec(url), ref = m && ix ? ix.dirs[m[1]!] : undefined
  if (ref?.f) {   // a long directory lives in its own file, loaded once on its first lookup; a failed load = unknown
    const d = await Promise.race([loadSide(m![1]!, ref.f), new Promise<null>(r => setTimeout(() => r(null), WAIT_MS))])
    return !!d && presenceOf({ format: 1, dirs: { [m![1]!]: d } }, url) === false
  }
  return presenceOf(ix, url) === false
}
const side = new Map<string, Promise<PresenceDir | null>>()
function loadSide(dir: string, file: string): Promise<PresenceDir | null> {
  let p = side.get(dir)
  if (!p) side.set(dir, p = fetch(dataUrl(`./data/${file}`)).then(r => (r.ok ? r.json() : null)).then(j => (j && typeof j === 'object' ? j as PresenceDir : null)).catch(() => null))
  return p
}
/** tests: forget the loaded index (or install one) */
export function resetPresence(ix?: PresenceIndex | null): void { side.clear(); index = ix === undefined ? undefined : Promise.resolve(ix) }
