/** Client data loading (audit C1/C2): 404 = absent, network / 5xx = transient (retried, not cached, reported), retry success recovers. */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchJson, loadFailures, retryFailed, retryEpoch } from '../src/lib/fetchJson.ts'
import { store } from '../src/lib/parts.ts'

const res = (status: number, body: unknown = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response
afterEach(() => { vi.unstubAllGlobals(); loadFailures.clear() })

describe('fetchJson', () => {
  it('404 is absent: null, one request, no failure recorded', async () => {
    const f = vi.fn(async () => res(404)); vi.stubGlobal('fetch', f)
    expect(await fetchJson('/a.json', [0, 0])).toBeNull()
    expect(f).toHaveBeenCalledTimes(1); expect(loadFailures.size).toBe(0)
  })
  it('a network error is retried and recovers', async () => {
    let n = 0; vi.stubGlobal('fetch', vi.fn(async () => { if (++n < 3) throw new TypeError('network'); return res(200, { x: 1 }) }))
    expect(await fetchJson('/a.json', [0, 0])).toEqual({ x: 1 }); expect(n).toBe(3); expect(loadFailures.size).toBe(0)
  })
  it('persistent 5xx throws after the bounded retries and is recorded', async () => {
    const f = vi.fn(async () => res(503)); vi.stubGlobal('fetch', f)
    await expect(fetchJson('/a.json', [0, 0])).rejects.toThrow(/503/)
    expect(f).toHaveBeenCalledTimes(3); expect(loadFailures.has('/a.json')).toBe(true)
  })
  it('a non-transient HTTP error (403) is not retried', async () => {
    const f = vi.fn(async () => res(403)); vi.stubGlobal('fetch', f)
    await expect(fetchJson('/a.json', [0, 0])).rejects.toThrow(); expect(f).toHaveBeenCalledTimes(1)
  })
})

describe('store', () => {
  it('caches a 404 as absent (no refetch)', async () => {
    const f = vi.fn(async () => res(404)); vi.stubGlobal('fetch', f)
    const s = store<number>(n => `/${n}.json`, j => j as number, [0])
    expect(await s.load('a')).toBeUndefined(); expect(await s.load('a')).toBeUndefined()
    expect(f).toHaveBeenCalledTimes(1); expect(s.has('a')).toBe(true); expect(s.peek('a')).toBeUndefined(); expect(loadFailures.size).toBe(0)   // has = settled (ixLoaded)
  })
  it('does not cache a transient failure: reports it, and retryFailed() loads it again', async () => {
    let up = false; const f = vi.fn(async () => { if (!up) throw new TypeError('offline'); return res(200, 7) }); vi.stubGlobal('fetch', f)
    const s = store<number>(n => `/${n}.json`, j => j as number, [0])
    expect(await s.load('a')).toBeUndefined()
    expect(loadFailures.has('/a.json')).toBe(true)
    const calls = f.mock.calls.length
    expect(s.peek('a')).toBeUndefined()                 // a render re-reads: no fetch storm while failed
    expect(f.mock.calls.length).toBe(calls)
    up = true; const e = retryEpoch.value; retryFailed()
    expect(retryEpoch.value).toBe(e + 1); expect(loadFailures.size).toBe(0)
    expect(await s.load('a')).toBe(7); expect(s.peek('a')).toBe(7); expect(s.has('a')).toBe(true)
  })
  it('a transient failure followed by success within the backoff resolves with the value', async () => {
    let n = 0; vi.stubGlobal('fetch', vi.fn(async () => (++n === 1 ? res(500) : res(200, 'ok'))))
    const s = store<string>(x => `/${x}.json`, j => j as string, [0, 0])
    expect(await s.load('a')).toBe('ok')
  })
})
