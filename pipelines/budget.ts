/**
 * SPEC 63 PF-2 — measure the transfer budgets on the BUILT site (dist/): bytes fetched (gzip, what GitHub Pages sends) for
 *   home      = index.html + the entry chunk graph + the home route's chunks + CSS + boot.json + the first lemma page
 *   card      = the word-card route chunks + CSS + the card's data shards (core/parts.ts cardData)
 *   keystroke = the prefix shards a typed query reads + the core cards of its first results (+ sociolect.json on the first keystroke), measured by running the app's own
 *               searchRemote() / coreOf() over a fetch that reads dist/ and counts bytes — no browser, no network.
 * `npx tsx pipelines/budget.ts [dist]` prints them; tests/budget.test.ts asserts the budgets.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { gzipSync } from 'node:zlib'
import { BOOT_DATA, BUDGET, cardData, lemmaPageUrl } from '../core/parts.ts'
import { unpackCore } from '../core/pack.ts'
import { bucketOf } from '../core/shard.ts'
import { heteronymKey } from '../core/heteronyms.ts'

export const gz = (file: string): number => gzipSync(readFileSync(file), { level: 6 }).length
const rel = (dist: string, href: string) => normalize(join(dist, href.replace(/^\.?\//, '')))

/** static `import … from "./x.js"` / `import "./x.js"` of a Vite chunk (dynamic `import("…")` is not followed) */
export function staticImports(js: string, from: string): string[] {
  const out: string[] = []
  for (const m of js.matchAll(/(?:^|[;{}\s])(?:import|export)\s*(?:[^"'()]*?\bfrom\s*)?["'](\.[^"']+\.js)["']/g)) out.push(normalize(join(from, '..', m[1]!)))
  return out
}
export function chunkGraph(entries: string[]): Set<string> {
  const seen = new Set<string>(), todo = [...entries]
  for (let f = todo.pop(); f; f = todo.pop()) {
    if (seen.has(f) || !existsSync(f)) continue
    seen.add(f); todo.push(...staticImports(readFileSync(f, 'utf8'), f))
  }
  return seen
}
const base = (f: string) => f.replace(/^.*[\\/]/, '').replace(/(\.vue_vue_type_script_setup_true_lang)?-[A-Za-z0-9_-]{8}\.js$/, '')
/** CSS files that belong to a set of chunks: `<chunk base>-<hash>.css` */
export function cssOf(dist: string, chunks: Iterable<string>): string[] {
  const css = existsSync(join(dist, 'assets')) ? readdirSync(join(dist, 'assets')).filter(f => f.endsWith('.css')) : []
  const bases = new Set([...chunks].map(base))
  return css.filter(f => bases.has(f.replace(/-[A-Za-z0-9_-]{8}\.css$/, ''))).map(f => join(dist, 'assets', f))
}
const routeChunk = (dist: string, name: string) => {
  const f = readdirSync(join(dist, 'assets')).find(x => x.startsWith(name + '-') && x.endsWith('.js'))
  if (!f) throw new Error(`no route chunk ${name} in ${dist}/assets`)
  return join(dist, 'assets', f)
}
/** index.html → entry script, modulepreloads and stylesheets of the document itself */
export function documentFiles(dist: string): { html: string; js: string[]; css: string[] } {
  const html = readFileSync(join(dist, 'index.html'), 'utf8')
  const js = [...html.matchAll(/<script[^>]+src="([^"]+)"/g), ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]*href="([^"]+)"/g)].map(m => rel(dist, m[1]!)).filter(f => f.endsWith('.js'))
  const css = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*href="(\.?\/?assets\/[^"]+)"/g)].map(m => rel(dist, m[1]!))
  return { html: join(dist, 'index.html'), js, css }
}
const sum = (files: Iterable<string>) => [...new Set(files)].reduce((n, f) => n + gz(f), 0)

export interface Measure { bytes: number; files: { file: string; gz: number }[] }
const measure = (files: Iterable<string>): Measure => { const fs = [...new Set(files)]; return { bytes: sum(fs), files: fs.map(file => ({ file, gz: gz(file) })).sort((a, b) => b.gz - a.gz) } }

/** the code of a route: its chunk + static graph (+ the document's own entry graph) + the CSS of all of them */
function codeOf(dist: string, route: string): string[] {
  const d = documentFiles(dist), chunks = chunkGraph([...d.js, routeChunk(dist, route)])
  return [d.html, ...chunks, ...d.css, ...cssOf(dist, chunks)]
}

const homeFiles = (dist: string) => [...codeOf(dist, 'SearchView'), ...BOOT_DATA.map(f => join(dist, 'data', f)), join(dist, 'data', lemmaPageUrl(1).replace(/^\.\/data\//, ''))]
export function measureHome(dist: string): Measure { return measure(homeFiles(dist)) }

/** the card route as a visitor reaches it from the home page: `bytes` = what the card adds to the home page's files (route chunks + CSS + shards; the shared entry graph and boot.json are already there),
 *  `cold` = a deep link /w/<lemma> as a FIRST load (entry graph + card route + boot + shards) */
export function measureCard(dist: string, lemma: string): Measure & { cold: number } {
  const cd = JSON.parse(readFileSync(join(dist, 'data', 'cd', `${bucketOf(lemma)}.json`), 'utf8')), c = unpackCore(cd).find(x => x.lemma === lemma)
  if (!c) throw new Error(`${lemma}: no core card in dist`)
  const w = (c.first.value as { witness?: string })?.witness
  const files = cardData(lemma, typeof w === 'string' ? w : undefined, heteronymKey(lemma)).map(f => join(dist, 'data', f)).filter(f => existsSync(f))
  const home = new Set(homeFiles(dist)), all = [...codeOf(dist, 'WordView'), ...files, join(dist, 'data', 'boot.json'), join(dist, 'data', 'lm', 'presence.json')].filter(f => existsSync(f))   // CP-10.7: the presence index is fetched with the first sidecar
  const m = measure(all.filter(f => !home.has(f)))
  return { ...m, cold: sum(all) }
}

/** the app's own search over a fetch that reads dist/ (counts gzip bytes per file, once: the browser cache and the service worker serve repeats) */
export async function measureKeystroke(dist: string, query: string, rows = 10): Promise<Measure & { results: number }> {
  const seen = new Map<string, number>(), real = globalThis.fetch
  globalThis.fetch = (async (u: string) => {
    const f = join(dist, String(u).replace(/^\.\//, ''))
    if (!existsSync(f)) return { ok: false, json: async () => null } as Response
    if (!seen.has(f)) seen.set(f, gz(f))
    return { ok: true, json: async () => JSON.parse(readFileSync(f, 'utf8')) } as Response
  }) as typeof fetch
  try {
    const { searchRemote, coreOf, ixReady } = await import('../src/lib/parts.ts')
    const { queryKeys } = await import('../src/lib/search.ts')
    await ixReady()
    const r = await searchRemote(query, queryKeys)
    for (const x of r.lemmas.slice(0, rows)) { coreOf(x.lemma) }   // the rows on screen read their core cards (reactive peek starts the fetch)
    await new Promise(res => setTimeout(res, 50))
    const sociolect = join(dist, 'data', 'sociolect.json')   // plastSearch() reads it on the first keystroke
    if (existsSync(sociolect)) seen.set(sociolect, gz(sociolect))
    const files = [...seen].map(([file, g]) => ({ file, gz: g })).sort((a, b) => b.gz - a.gz)
    return { bytes: files.reduce((n, f) => n + f.gz, 0), files, results: r.lemmas.length }
  } finally { globalThis.fetch = real }
}

export const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`
if (process.argv[1]?.endsWith('budget.ts')) {
  const dist = process.argv[2] ?? 'dist'
  const home = measureHome(dist), card = measureCard(dist, process.argv[3] ?? 'князь'), key = await measureKeystroke(dist, process.argv[4] ?? 'кня')
  console.log(`home      ${kb(home.bytes)} (budget ${kb(BUDGET.firstLoad)})`)
  console.log(`card      ${kb(card.bytes)} on top of the home page (budget ${kb(BUDGET.card)}); deep link ${kb(card.cold)} (budget ${kb(BUDGET.firstLoad)}): ` + card.files.slice(0, 12).map(f => `${f.file.replace(/^.*[\\/]/, '')} ${kb(f.gz)}`).join(' · '))
  console.log('home files: ' + home.files.slice(0, 10).map(f => `${f.file.replace(/^.*[\\/]/, '')} ${kb(f.gz)}`).join(' · '))
  console.log(`keystroke ${kb(key.bytes)} (budget ${kb(BUDGET.keystroke)}), ${key.results} results`)
}
