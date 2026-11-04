/**
 * SPEC 63 NAV-1: after a deploy the open tab still holds the OLD index, whose lazy route chunks (assets/<Name>-<hash>.js) no longer exist on Pages.
 * vue-router then rejects the navigation with «Failed to fetch dynamically imported module» and the URL never changes: the click «does nothing» until a reload.
 * `router.onError` calls `recoverFromChunkError`: ONE full load of the target URL (fresh index, fresh hashes); a sessionStorage stamp stops a loop when the
 * failure is not a stale deploy (offline, blocked host): then the error is only logged and the page keeps working.
 */
export const RELOAD_KEY = 'lex-chunk-reload'
export const RELOAD_WINDOW_MS = 30_000
const PATTERNS = [/Failed to fetch dynamically imported module/i, /error loading dynamically imported module/i, /Importing a module script failed/i, /Unable to preload CSS/i, /ChunkLoadError/i, /Loading chunk [\w-]+ failed/i]
export const isChunkError = (e: unknown): boolean => {
  const m = e instanceof Error ? `${e.name} ${e.message}` : String(e ?? '')
  return PATTERNS.some(p => p.test(m))
}
export interface ReloadDeps { store?: Pick<Storage, 'getItem' | 'setItem'> | null; now?: () => number; go: (url: string) => void }
/** true = a reload was started; false = not a chunk error, or already tried within the window (no loop) */
export function recoverFromChunkError(err: unknown, targetUrl: string, deps: ReloadDeps): boolean {
  if (!isChunkError(err)) return false
  const now = (deps.now ?? Date.now)()
  try {
    const last = Number(deps.store?.getItem(RELOAD_KEY) ?? 0)
    if (last && now - last < RELOAD_WINDOW_MS) return false
    deps.store?.setItem(RELOAD_KEY, String(now))
  } catch { /* storage blocked: reload once anyway; a loop is impossible without a stamp only if the page keeps failing, and that costs one extra load per click */ }
  deps.go(targetUrl)
  return true
}
/** wiring for the app: the target is the hash URL the visitor asked for */
export function installChunkRecovery(router: { onError: (h: (e: unknown, to: { fullPath: string }) => void) => unknown; options?: { history?: { base?: string } } }): void {
  router.onError((err, to) => {
    let store: Storage | null = null
    try { store = window.sessionStorage } catch { /* blocked */ }
    const base = window.location.href.split('#')[0]!
    const ok = recoverFromChunkError(err, `${base}#${to.fullPath}`, { store, go: u => { window.location.assign(u); if (u.split('#')[0] === base) window.location.reload() } })
    if (!ok) console.error('[nav]', err)
  })
}
