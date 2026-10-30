/**
 * `npm run data:presence` — SPEC 63 CP-10.7: writes public/data/lm/presence.json (core/presence.ts), the list of which optional sidecar shards exist, so the client
 * does not request (and log a 404 for) a bucket that is not there. Run LAST in every data chain (build:data, data:unlinked): it describes what is on disk now.
 * Atomic (RS-1), idempotent; a missing index only costs the client its 404s.
 */
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { PRESENCE_DIRS, PRESENCE_FILE, encodeBuckets, encodeNames, type PresenceDir, type PresenceIndex } from '../core/presence.ts'
import { writeJsonAtomic } from './robust.ts'

const subdirs = (p: string) => existsSync(p) ? readdirSync(p).filter(f => statSync(join(p, f)).isDirectory()) : []
/** scan the data root: which of the indexed directories hold which files */
export function scanPresence(root: string): PresenceIndex {
  const dirs: Record<string, PresenceDir> = {}
  const list = PRESENCE_DIRS.flatMap(d => d.endsWith('/*') ? subdirs(join(root, d.slice(0, -2))).map(s => `${d.slice(0, -2)}/${s}`) : [d])
  for (const d of list) {
    const p = join(root, d); if (!existsSync(p) || !statSync(p).isDirectory()) continue
    const files = readdirSync(p).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)), nums = files.filter(f => /^\d+$/.test(f)), named = files.filter(f => !/^\d+$/.test(f))
    if (!files.length) continue
    if (nums.length && !named.length) { const ns = nums.map(Number); dirs[d] = encodeBuckets(ns, Math.max(...ns) + 1) }  
    else { const e = encodeNames(files); if (e) dirs[d] = e }
  }
  return { format: 1, dirs }
}

if (process.argv[1]?.endsWith('build-presence.ts')) {
const root = resolve(process.env.PARTS_DATA ?? 'public/data')
const ix = scanPresence(root), text = JSON.stringify(ix)
mkdirSync(resolve(root, 'lm'), { recursive: true })
writeJsonAtomic(resolve(root, PRESENCE_FILE), text)
console.log(`presence: ${Object.keys(ix.dirs).length} directories indexed, ${text.length} bytes`)
}
