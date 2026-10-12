/**
 * Saint Sophia of Kyiv graffiti — metadata + IIIF links catalogue (SPEC 60 NW-6; W5; research/16 §R2.1).
 *
 * > "Public JSON REST API (Django REST Framework), base https://saintsophia.dh.gu.se/api/ ; no key needed … Bulk export is a portal feature:
 * >  its JS pages through inscription/?depth=2 following `next`." — research/16 R2.1
 * > "Image licence field `type_of_license` = \"CC BY-NC\" on every image row sampled … Licence of TEXT/transcription data and a \"cite as\"
 * >  statement: not found in API or bundle [U] — ask director (J. Westin)." — research/16 R2.1
 *
 * Therefore this stage stores ONLY descriptive metadata and the IIIF crop link of each inscription: transcriptions, translations and comments are
 * deliberately not read into the output until the text licence is confirmed (SPEC 60 NW-6, P-4.4). IIIF Image API syntax
 * `{base}/{region}/{size}/{rotation}/{quality}.{format}` — the API field `inscription_iiif_url` already ends in `/{region}/`, so a thumbnail is `${iiif}400,/0/default.jpg`
 * (checked 2026-10-12: HTTP 200 image/jpeg).
 *
 * Usage: `npx tsx pipelines/ingest-sophia.ts` → data/raw/sophia/NNN.json (cache, 300 per page, ≥ 1.1 s apart) → public/data/sophia.json.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'

export const API = 'https://saintsophia.dh.gu.se/api/inscriptions/inscription/'
export const PORTAL = 'https://saintsophia.dh.gu.se/'
const UA = { 'user-agent': 'ukr-lexicon-research/0.1 (non-commercial; dmytrozah.dev)' }

export interface SophiaItem {
  id: number; title: string; panel: string; room?: string
  type?: string; lang?: string; script?: string; from?: number; to?: number
  iiif?: string; viewer: string; author?: string
}
export interface SophiaCatalogue {
  generated: string; source: string; api: string; count: number
  licence: { images: string; text: string }
  attribution: string
  items: SophiaItem[]
}

type Txt = { text?: string } | null | undefined
/** Pure: one API row (depth=2) → catalogue item. No transcription/translation/comment fields are read. */
export function toItem(r: any): SophiaItem | undefined {
  if (!r || r.published === false || typeof r.id !== 'number') return undefined
  const panel = r.panel?.title ? String(r.panel.title) : ''
  const t = (x: Txt) => x?.text || undefined
  const author = Array.isArray(r.author) ? r.author.map((a: any) => [a.firstname, a.lastname].filter(Boolean).join(' ')).filter(Boolean).join(', ') : ''
  return {
    id: r.id, title: String(r.title ?? ''), panel, ...(r.panel?.room ? { room: String(r.panel.room) } : {}),
    ...(t(r.type_of_inscription) ? { type: t(r.type_of_inscription) } : {}), ...(t(r.language) ? { lang: t(r.language) } : {}), ...(t(r.writing_system) ? { script: t(r.writing_system) } : {}),
    ...(typeof r.min_year === 'number' ? { from: r.min_year } : {}), ...(typeof r.max_year === 'number' ? { to: r.max_year } : {}),
    ...(r.inscription_iiif_url ? { iiif: String(r.inscription_iiif_url) } : {}),
    viewer: `${PORTAL}viewer/?q=${encodeURIComponent(panel)}/${r.id}`, ...(author ? { author } : {}),
  }
}

export function catalogue(pages: any[][], generated = new Date().toISOString().slice(0, 10)): SophiaCatalogue {
  const items = pages.flat().map(toItem).filter((x): x is SophiaItem => !!x).sort((a, b) => a.id - b.id)
  return {
    generated, source: PORTAL, api: API, count: items.length,
    licence: { images: 'CC BY-NC (type_of_license of the portal image rows, research/16 R2.1)', text: 'не підтверджено — транскрипції не збережено (SPEC 60 NW-6)' },
    attribution: 'Saint Sophia\'s Inscriptions, University of Gothenburg & НЗ «Софія Київська»; Корпус графіті — В. Корнієнко',
    items,
  }
}

async function main() {
  const dir = 'data/raw/sophia'
  mkdirSync(dir, { recursive: true })
  const LIMIT = 300
  for (let off = 0, n = 0, total = Infinity; off < total; off += LIMIT, n++) {
    const f = `${dir}/${String(n).padStart(3, '0')}.json`
    if (!existsSync(f)) {
      const res = await fetch(`${API}?depth=2&limit=${LIMIT}&offset=${off}`, { headers: UA })
      if (!res.ok) throw new Error(`sophia ${res.status} at offset ${off}`)
      writeFileSync(f, Buffer.from(await res.arrayBuffer()))
      console.log(`✓ offset ${off}`)
      await new Promise(r => setTimeout(r, 1100))
    }
    total = JSON.parse(readFileSync(f, 'utf8')).count
  }
  const pages = readdirSync(dir).filter(n => /^\d{3}\.json$/.test(n)).sort().map(n => JSON.parse(readFileSync(`${dir}/${n}`, 'utf8')).results as any[])
  const cat = catalogue(pages)
  mkdirSync('public/data', { recursive: true })
  writeFileSync('public/data/sophia.json', JSON.stringify(cat))
  console.log(`sophia: ${cat.count} inscriptions → public/data/sophia.json`)
}
if (process.argv[1]?.endsWith('ingest-sophia.ts')) await main()
