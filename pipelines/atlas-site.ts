/**
 * SPEC 63 AT-3 (RS-1: atomic, idempotent): data/atlas/aum2-maps.json + aum2-areal.json + AUM_ROWS → public/atlas/aum2.json for the /atlas page.
 * Compact on purpose (PF-2): per map the locator, the questionnaire quote (≤ 2 lines), the 6 widest variants, the named regions and the rules.
 * Usage: tsx pipelines/atlas-site.ts
 */
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs'
import { AUM_ROWS, AUM_VOL2 } from '../core/atlas-rules.ts'
import type { AtlasMap, MapAreal } from '../core/atlas.ts'

const maps = (JSON.parse(readFileSync('data/atlas/aum2-maps.json', 'utf8')) as { maps: AtlasMap[] }).maps
const areal = Object.fromEntries((JSON.parse(readFileSync('data/atlas/aum2-areal.json', 'utf8')) as { maps: MapAreal[] }).maps.map(a => [a.n, a]))
const out = {
  volume: 2, title: AUM_VOL2, note: 'Витяг з власного скану власника; форми — OCR запису атласу (знаки наголосу й м’якості можуть бути спотворені); мапи не републікуються.',
  maps: maps.map(m => ({
    n: m.n, page: m.page, quote: m.quote, q: m.programQuestion, nVariants: m.variants.length, regions: areal[m.n]?.namedRegions ?? [],
    variants: [...m.variants].sort((a, b) => b.points.length - a.points.length).slice(0, 6).map(v => ({ f: v.form, k: v.points.length, s: v.symbol })),
    rules: AUM_ROWS.filter(r => r.map === m.n).map(r => `${r.id}:SW`),
  })),
}
const json = JSON.stringify(out) + '\n', dst = 'public/atlas/aum2.json'
mkdirSync('public/atlas', { recursive: true })
if (existsSync(dst) && readFileSync(dst, 'utf8').replace(/\r\n/g, '\n') === json) console.log('unchanged', dst)
else { writeFileSync(dst + '.tmp', json); renameSync(dst + '.tmp', dst); console.log('wrote', dst, json.length, 'bytes') }
