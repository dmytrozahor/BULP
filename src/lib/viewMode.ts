/**
 * SPEC 63 UI-3: «граф / список» view mode. Graph is the default; a per-panel choice and a global default are remembered per viewer in
 * localStorage. Every storage access is wrapped: private windows / blocked storage / SSR render the default and never throw.
 */
import { ref, type Ref } from 'vue'
export type ViewMode = 'graph' | 'list'
export const VIEW_KEY = 'ukr-lex.view'
const ok = (v: unknown): v is ViewMode => v === 'graph' || v === 'list'
const store = (): Storage | undefined => { try { return globalThis.localStorage ?? undefined } catch { return undefined } }
const get = (k: string, st = store()): ViewMode | undefined => { try { const v = st?.getItem(k); return ok(v) ? v : undefined } catch { return undefined } }
const put = (k: string, v: ViewMode | null, st = store()) => { try { if (v) st?.setItem(k, v); else st?.removeItem(k) } catch { /* blocked storage: the choice lives for this page only */ } }

/** the global default (shared by every panel on the page) */
export const defaultMode: Ref<ViewMode> = ref(get(VIEW_KEY) ?? 'graph')
const overrides = new Map<string, Ref<ViewMode | undefined>>()
const own = (panel: string) => { let r = overrides.get(panel); if (!r) { r = ref(get(`${VIEW_KEY}.${panel}`)); overrides.set(panel, r) } return r }

export function useViewMode(panel: string) {
  const o = own(panel)
  return {
    /** effective mode: this panel's own choice, else the global default */
    mode: (): ViewMode => o.value ?? defaultMode.value,
    set(m: ViewMode) { o.value = m; put(`${VIEW_KEY}.${panel}`, m) },
    /** make `m` the default for every panel and drop this panel's own override */
    setDefault(m: ViewMode) { defaultMode.value = m; put(VIEW_KEY, m); o.value = undefined; put(`${VIEW_KEY}.${panel}`, null) },
    isOwn: () => o.value !== undefined,
  }
}
/** test hook: forget in-memory state and re-read storage */
export function resetViewModes(st?: Storage) { overrides.clear(); defaultMode.value = get(VIEW_KEY, st) ?? 'graph' }
