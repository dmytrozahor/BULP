/**
 * SPEC 63 PS-6: portraits from Wikidata P18 -> Wikimedia Commons, free licences only (owner: «і з фотографіями»).
 * Resumable: data/seed/persons-portraits.json is written atomically after every person and records negatives too (a person is asked once; `--redo` asks again).
 * Matching is confident-only (core/persons.ts confidentMatch: human, name fits, BOTH birth and death years equal ours, exactly one candidate); the licence gate is licenceOk.
 * Wikimedia policy: neutral research User-Agent with the project URL (no personal address), one request at a time, >= 1 s apart.
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildPersons, confidentMatch, licenceOk, type AuthorIn, type Portrait, type PortraitCheck, type WdCand, type WitnessIn } from '../core/persons.ts'
import { readJson, writeJsonAtomic } from './robust.ts'

const UA = 'BULP-corpus-research/1.0 (https://github.com/dmytrozahor/BULP; Ukrainian lexicon research)'
const SEED = resolve('data/seed/persons-portraits.json')
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
async function api(base: string, params: Record<string, string>): Promise<any> {
  const u = `${base}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`
  for (let a = 0; a < 4; a++) {
    await sleep(1100)
    const r = await fetch(u, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })
    if (r.ok) return r.json()
    if (r.status === 429 || r.status >= 500) { await sleep(5000 * (a + 1)); continue }
    throw new Error(`${base}: HTTP ${r.status}`)
  }
  throw new Error(`${base}: gave up`)
}
const yearOf = (c: any, p: string): number | null => { const t = c?.[p]?.[0]?.mainsnak?.datavalue?.value?.time; const m = typeof t === 'string' && t.match(/^[+-](\d{4})/); return m ? +m[1]! : null }
const strip = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim()

async function candidates(name: string): Promise<WdCand[]> {
  const out: WdCand[] = []
  for (const lang of ['uk', 'en']) {
    const s = await api('https://www.wikidata.org/w/api.php', { action: 'wbsearchentities', search: name, language: lang, uselang: 'uk', type: 'item', limit: '8' })
    for (const x of s.search ?? []) if (!out.some(o => o.qid === x.id)) out.push({ qid: x.id, labels: [], b: null, d: null, human: false })
    if (out.length) break
  }
  if (!out.length) return []
  const e = await api('https://www.wikidata.org/w/api.php', { action: 'wbgetentities', ids: out.map(o => o.qid).join('|'), props: 'labels|aliases|claims', languages: 'uk|en|ru' })
  for (const c of out) {
    const en = e.entities?.[c.qid]; if (!en) continue
    c.labels = [...Object.values(en.labels ?? {}).map((l: any) => l.value), ...Object.values(en.aliases ?? {}).flat().map((l: any) => l.value)] as string[]
    c.human = !!en.claims?.P31?.some((s: any) => s.mainsnak?.datavalue?.value?.id === 'Q5')
    c.b = yearOf(en.claims, 'P569'); c.d = yearOf(en.claims, 'P570'); c.image = en.claims?.P18?.[0]?.mainsnak?.datavalue?.value
  }
  return out
}
async function commons(file: string): Promise<{ licence: string; author: string; page: string } | null> {
  const r = await api('https://commons.wikimedia.org/w/api.php', { action: 'query', titles: `File:${file}`, prop: 'imageinfo', iiprop: 'extmetadata|url' })
  const ii = Object.values(r.query?.pages ?? {}).map((p: any) => p.imageinfo?.[0]).find(Boolean) as any
  if (!ii) return null
  const m = ii.extmetadata ?? {}
  return { licence: String(m.LicenseShortName?.value ?? ''), author: strip(String(m.Artist?.value ?? '')) || 'автор не вказаний на Commons', page: ii.descriptionurl }
}

async function main() {
  const corpus = readJson<{ authors: AuthorIn[]; witnesses: WitnessIn[] }>(resolve('public/data/corpus.json'))
  const seed: Record<string, Portrait | PortraitCheck> = existsSync(SEED) ? readJson(SEED) : {}
  const redo = process.argv.includes('--redo'), max = +(process.argv.find(a => a.startsWith('--max='))?.slice(6) ?? 1e9)
  const { persons } = buildPersons(corpus.authors, corpus.witnesses, { generated: '' })
  const today = new Date().toISOString().slice(0, 10)
  let done = 0
  for (const p of persons) {
    if (p.kind !== 'person' || done >= max) continue
    if (!redo && p.authorIds.some(a => seed[a])) continue
    let res: Portrait | PortraitCheck
    try {
      const m = confidentMatch({ name: p.name, b: p.birth, d: p.death }, p.birth !== null && p.death !== null ? await candidates(p.name) : [])
      if (!m.hit) res = { none: true, why: m.why as Exclude<typeof m.why, 'ok'>, checked: today }
      else if (!m.hit.image) res = { none: true, why: 'no-free-image', checked: today, qid: m.hit.qid }
      else {
        const c = await commons(m.hit.image)
        if (!c || !licenceOk(c.licence)) res = { none: true, why: 'no-free-image', checked: today, qid: m.hit.qid }
        else { const f = m.hit.image.replace(/ /g, '_'), md5 = createHash('md5').update(f).digest('hex'); res = { file: m.hit.image, h: `${md5[0]}/${md5.slice(0, 2)}`, licence: c.licence, author: c.author, page: c.page, qid: m.hit.qid, checked: today } }
      }
    } catch (e) { console.error(`${p.id}: ${(e as Error).message} (left for the next run)`); continue }
    seed[p.id] = res; done++
    writeJsonAtomic(SEED, JSON.stringify(seed, null, 1))
    if (done % 25 === 0) console.log(`${done} asked; with portrait ${Object.values(seed).filter(x => 'file' in x).length}`)
  }
  console.log(`done: ${done} asked this run; ${Object.values(seed).filter(x => 'file' in x).length} portraits, ${Object.values(seed).filter(x => 'none' in x).length} checked without`)
}
main()
