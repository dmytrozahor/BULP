/** SPEC 63 NAV-1: «тексти корпусу … не завжди спрацьовує, треба інколи перезавантажувати сторінку» */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createMemoryHistory, createRouter } from 'vue-router'
import { RELOAD_KEY, RELOAD_WINDOW_MS, isChunkError, recoverFromChunkError } from '../src/lib/chunkReload.ts'
import { isLinkClick, leavesNav } from '../src/lib/navMenu.ts'
import { fetchTokens, loadTokens } from '../src/lib/witnessText.ts'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const mem = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m } }

describe('NAV-1 dropdown event handling', () => {
  it('a null focus / click target never closes the menu (Safari does not focus a clicked link), a target outside the nav does', () => {
    expect(leavesNav(false, false)).toBe(false)
    expect(leavesNav(true, true)).toBe(false)
    expect(leavesNav(false, true)).toBe(true)
  })
  it('a click on a link inside the nav closes menu and sheet itself (same-route click never fires the route watcher)', () => {
    expect(isLinkClick({ closest: s => (s === 'a[href]' ? {} : null) })).toBe(true)
    expect(isLinkClick({ closest: () => null })).toBe(false)
    expect(isLinkClick(null)).toBe(false)
    const src = rd('src/components/NavMenu.vue')
    expect(src).toContain('@click="onNavClick"')
    expect(src).toContain(':hidden="open !== g.id"')          // hidden, never v-if: the link is not unmounted between mousedown and click
    expect(src).not.toMatch(/@mousedown|v-if="open ===/)
  })
})

describe('NAV-1 router chunk-load recovery', () => {
  it('recognises the dynamic-import failures of Chromium, Firefox and Safari, nothing else', () => {
    for (const m of ['Failed to fetch dynamically imported module: https://x/assets/TextsView-abc.js', 'error loading dynamically imported module', 'Importing a module script failed.', 'Loading chunk 7 failed.'])
      expect(isChunkError(new TypeError(m)), m).toBe(true)
    expect(isChunkError(new Error('boom'))).toBe(false)
    expect(isChunkError(undefined)).toBe(false)
  })
  it('reloads once to the target URL, then the guard blocks a second reload inside the window (no loop)', () => {
    const store = mem(), go = vi.fn(), err = new TypeError('Failed to fetch dynamically imported module')
    expect(recoverFromChunkError(err, 'https://h/BULP/#/texts', { store, go, now: () => 1000 })).toBe(true)
    expect(go).toHaveBeenCalledWith('https://h/BULP/#/texts')
    expect(store.m.get(RELOAD_KEY)).toBe('1000')
    expect(recoverFromChunkError(err, 'https://h/BULP/#/texts', { store, go, now: () => 1000 + RELOAD_WINDOW_MS - 1 })).toBe(false)
    expect(go).toHaveBeenCalledTimes(1)
    expect(recoverFromChunkError(err, 'https://h/BULP/#/texts', { store, go, now: () => 1000 + RELOAD_WINDOW_MS + 1 })).toBe(true)   // a later deploy may reload again
  })
  it('a non-chunk error never reloads; a throwing storage does not break the handler', () => {
    const go = vi.fn()
    expect(recoverFromChunkError(new Error('x'), 'u', { store: mem(), go })).toBe(false)
    const bad = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(recoverFromChunkError(new TypeError('Failed to fetch dynamically imported module'), 'u', { store: bad, go })).toBe(true)
    expect(go).toHaveBeenCalledTimes(1)
  })
  it('integration: vue-router rejects a navigation whose lazy chunk is gone and hands router.onError the target', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { render: () => null } }, { path: '/texts', component: () => Promise.reject(new TypeError('Failed to fetch dynamically imported module')) }] })
    await router.push('/'); const go = vi.fn(); const store = mem()
    router.onError((e, to) => { recoverFromChunkError(e, to.fullPath, { store, go }) })
    await router.push('/texts').catch(() => {})
    expect(router.currentRoute.value.fullPath).toBe('/')     // the click did nothing: the symptom
    expect(go).toHaveBeenCalledWith('/texts')                  // the fix: one reload to the wanted URL
    expect(rd('src/main.ts')).toContain('installChunkRecovery(router)')
  })
})

describe('NAV-1 texts: failure is a visible state', () => {
  afterEach(() => vi.unstubAllGlobals())
  const stub = (status: number, body: unknown = {}) => vi.stubGlobal('fetch', vi.fn(async () => ({ ok: status < 400, status, json: async () => body })))
  it('404 = no text (null); 5xx and a network error throw so the view can offer a retry; loadTokens keeps its old null contract', async () => {
    stub(404); expect(await fetchTokens('a')).toBeNull()
    stub(200, { tokens: [['Се', 'l1', 0]] }); expect(await fetchTokens('a')).toHaveLength(1)
    stub(503); await expect(fetchTokens('a')).rejects.toThrow(/503/); expect(await loadTokens('a')).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') })); await expect(fetchTokens('a')).rejects.toThrow()
  })
  it('TextsView has the loading / failed list state, the failed text state with retry and reload, and drops stale answers by id', () => {
    const v = rd('src/views/TextsView.vue')
    expect(v).toContain('data-testid="texts-list-failed"'); expect(v).toContain('@click="loadList"')
    expect(v).toContain('data-testid="texts-text-failed"'); expect(v).toContain('@click="tokTry++"'); expect(v).toContain('@click="reloadApp"')
    expect(v).toContain("toks.value = 'error'")
    expect(v).toMatch(/if \(id === cur\.value\?\.id\) toks\.value = t/)
  })
})
