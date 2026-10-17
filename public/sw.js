/* SPEC 63 PF-2 service worker: shards the visitor has already seen stay available (offline, and instant on repeat visits).
 *  - ./assets/* (content-hashed by Vite): cache first, never revalidated;
 *  - ./data/* (JSON shards): stale-while-revalidate — answer from the cache at once, refresh it in the background; boot.json and ix/index.json go to the network first so a new data release is picked up;
 *  - navigations (index.html): network first, cache as the offline fallback.
 * The data cache is capped (oldest entries go first) so a long session on a weak phone cannot fill the storage. */
const VERSION = 'lex-v1'
const ASSETS = VERSION + '-assets', DATA = VERSION + '-data', PAGES = VERSION + '-pages'
const DATA_MAX = 1500

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (!k.startsWith(VERSION)) await caches.delete(k)
    await self.clients.claim()
  })())
})

const trim = async (name, max) => {
  const c = await caches.open(name), keys = await c.keys()
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i])
}
const networkFirst = async (req, name) => {
  const c = await caches.open(name)
  try { const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r } catch (err) { const hit = await c.match(req); if (hit) return hit; throw err }
}
const swr = async (req, name, max) => {
  const c = await caches.open(name), hit = await c.match(req)
  const net = fetch(req).then(r => { if (r.ok) { c.put(req, r.clone()); trim(name, max) } return r }).catch(() => undefined)
  return hit ?? (await net) ?? Response.error()
}
const cacheFirst = async (req, name) => {
  const c = await caches.open(name), hit = await c.match(req)
  if (hit) return hit
  const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r
}

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // SPEC 63 PF-7: the big data is on the CDN under /data/<buildId>/…; the path is versioned, so a cached shard never goes stale: cache first
  if (url.origin !== self.location.origin) { if (/^\/data\/\d{12}-[0-9a-f]{7}\/[a-z]+\/.+\.json$/.test(url.pathname)) e.respondWith(cacheFirst(req, DATA).then(r => { trim(DATA, DATA_MAX); return r })); return }
  const path = url.pathname
  if (/\/assets\//.test(path)) e.respondWith(cacheFirst(req, ASSETS))
  else if (/\/data\/(boot\.json|ix\/index\.json)$/.test(path)) e.respondWith(networkFirst(req, DATA))
  else if (/\/data\/.+\.json$/.test(path)) e.respondWith(swr(req, DATA, DATA_MAX))
  else if (req.mode === 'navigate') e.respondWith(networkFirst(req, PAGES))
})
