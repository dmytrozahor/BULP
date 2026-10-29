/**
 * SPEC 63 CP-10 — LIVE end-to-end card check (not SSR, not in the default vitest run). `npm run e2e:cards`.
 * Opens a seeded sample of cards (10 per kind + fixed owner examples) on the deployed site in Chromium, sequentially, and records per block of the
 * CP-8 parity matrix: data | empty (honest «немає даних») | MISSING | LOADING (stuck > 10 s) , plus console / network errors, transfer size and time to the first render.
 * Writes analysis/card-parity-live.md and <out>/results.json + one full-page screenshot per card.
 * Env: E2E_BASE (default https://dmytrozahor.github.io/BULP/), E2E_OUT (screenshots dir), E2E_SEED (default 10), E2E_N (cards per kind, default 10), E2E_ONLY (comma kinds; the word `content` selects the person / text / annotator content checks of e2e-content.ts, which also run when E2E_ONLY is unset).
 */
import { readFileSync, mkdirSync, existsSync } from 'node:fs'
import { writeJsonAtomic } from './robust.ts'
import { join } from 'node:path'
import { chromium, type Page } from 'playwright'
import { BLOCKS, MATRIX, KIND_ROUTE, type BlockId, type KindId } from '../src/lib/cardParity.ts'
import { unlinkedName, unlinkedTop, unlinkedManifestName } from '../core/unlinked.ts'
import { uvAttested, uvShard, type UvGroup } from '../core/uv.ts'
import { key } from '../core/text.ts'
import { personChecks, textChecks, annotateChecks, contentReport, type Check } from './e2e-content.ts'

const BASE = process.env.E2E_BASE ?? 'https://dmytrozahor.github.io/BULP/'
const OUT = process.env.E2E_OUT ?? join(process.env.TEMP ?? '/tmp', 'bulp-e2e-cards')
const SEED = Number(process.env.E2E_SEED ?? 10), N = Number(process.env.E2E_N ?? 10)
const ONLY = process.env.E2E_ONLY?.split(',')
const ptr = JSON.parse(readFileSync('src/data/data-version.json', 'utf8')) as { base: string; buildId: string }
const CDN = `${ptr.base}/data/${ptr.buildId}`
const rd = (p: string) => JSON.parse(readFileSync(`public/data/${p}`, 'utf8'))
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const R = rng(SEED)
const pick = <T,>(a: T[], n: number): T[] => { const s = new Set<number>(), out: T[] = []; while (out.length < Math.min(n, a.length)) { const i = Math.floor(R() * a.length); if (!s.has(i)) { s.add(i); out.push(a[i]!) } } return out }
const cdn = async (p: string): Promise<unknown | null> => { try { const r = await fetch(`${CDN}/${p}.json`); return r.ok ? await r.json() : null } catch { return null } }

interface Item { kind: KindId | 'person' | 'persons' | 'owner'; route: string; label: string; expect?: KindId; dialect?: string }
async function sample(): Promise<Item[]> {
  const items: Item[] = []
  const enc = (s: string) => encodeURIComponent(s)
  const lex = rd('lexicon.json').cards as unknown[][], ci = rd('cardindex.json'), tor = rd('torot.json'), ph = rd('phrases.json')
  const lemmas = new Set(lex.map(c => c[0] as string))
  const lemmaOf = (c: unknown[]) => c[0] as string
  const forms: string[] = []
  for (const c of pick(lex, 400)) for (const f of (c[3] as unknown[] ?? [])) { const s = Array.isArray(f) ? f[0] : null; if (typeof s === 'string' && s !== c[0] && !lemmas.has(s) && !/[\s/]/.test(s)) { forms.push(s); break } }
  const add = (kind: KindId, a: string[], route: (s: string) => string) => { for (const s of a) items.push({ kind, route: route(s), label: s }) }
  add('word', pick(lex, N).map(lemmaOf), s => `/w/${enc(s)}`)
  add('form', pick(forms, N), s => `/f/${enc(s)}`)
  add('light', pick(ci.lw as string[], N), s => `/lw/${enc(s)}`)
  add('dict', pick(ci.ld as string[], N), s => `/lw/${enc(s)}`)
  add('archaic', pick((ci.ar as string[][]).map(x => x[0]!), N), s => `/ar/${enc(s)}`)
  add('name', pick((tor.names as { id: string }[]).map(x => x.id), N), s => `/name/${enc(s)}`)
  add('orv', pick((tor.orv as { id: string }[]).map(x => x.id), N), s => `/orv/${enc(s)}`)
  add('phrase', pick(ph.attestedIds as string[], N), s => `/p/${enc(s)}`)
  // uv / att: groups from seeded CDN shards
  const uv: string[] = [], att: string[] = []
  for (let tries = 0; tries < 12 && (uv.length < N || att.length < N); tries++) {
    const sh = await cdn(`uv/g/${Math.floor(R() * 512)}`) as Record<string, UvGroup> | null; if (!sh) continue
    for (const [k, g] of Object.entries(sh)) (uvAttested(g) ? att : uv).push(k)
  }
  add('uv', pick(uv, N), s => `/uv/${enc(s)}`); add('att', pick(att, N), s => `/uv/${enc(s)}`)
  // unlinked spellings: /f/<spelling> that the unlinked index knows (leaf keys of seeded two-letter tops)
  const un: string[] = []
  for (const top of ['ко', 'за', 'на', 'по', 'ві', 'мо', 'зе', 'ли'].sort(() => R() - 0.5)) {
    if (un.length >= N) break
    const m = await cdn(`unlinked/${unlinkedManifestName(unlinkedTop(top))}`) as { leaves?: [string, number][] } | null; const leaf = m?.leaves?.[Math.floor(R() * (m.leaves.length || 1))]?.[0]
    const sh = leaf ? await cdn(`unlinked/${unlinkedName(leaf)}`) as Record<string, unknown> | null : null
    if (sh) un.push(...pick(Object.keys(sh), 2))
  }
  add('unlinked', pick(un, N), s => `/f/${enc(s)}`)
  // owner examples: resolve the card route by the data (lexicon lemma, else light / dictionary-only / archaic card, else a form)
  const lw = new Set<string>(ci.lw), ld = new Set<string>(ci.ld), ar = new Set<string>((ci.ar as string[][]).flatMap(x => x))
  const owner = ['слово', 'вода', 'слинути', 'линути', 'засьпіваєш', 'їсть', 'Полісся', 'народ', 'сердце', 'кÿнь', 'вÿс', 'го', 'шо', 'отношеніє', 'тоненький', 'між', 'керувати']
  for (const w of owner) {
    const k = w.toLowerCase()
    const route = lemmas.has(w) || lemmas.has(k) ? `/w/${enc(lemmas.has(w) ? w : k)}` : lw.has(w) || ld.has(w) ? `/lw/${enc(w)}` : ar.has(w) ? `/ar/${enc(w)}` : `/f/${enc(w)}`
    items.push({ kind: 'owner', route, label: w })
  }
  items.push({ kind: 'owner', route: `/w/${enc(lemmas.has('Полісся') ? 'Полісся' : 'полісся')}`, label: 'Полісся + говір поліський', dialect: 'Поліськ' })
  items.push({ kind: 'owner', route: `/w/${enc('вода')}`, label: 'вода + говір поліський', dialect: 'Поліськ' })
  items.push({ kind: 'persons', route: `/annotate`, label: 'annotator (отношеніє)' })
  const persons = rd('persons/index.json').rows as { id: string; name: string }[]
  const sh = persons.find(p => /Шевченко/.test(p.name))
  if (sh) items.push({ kind: 'person', route: `/person/${enc(sh.id)}`, label: `Шевченко (${sh.id})` })
  items.push({ kind: 'persons', route: '/persons', label: '/persons list' })
  return ONLY ? items.filter(i => ONLY.includes(i.kind)) : items
}

// ---- block detectors: panel DOM ids (any prefix), titles, testids / classes ---------------------------------------------------------------------------
interface Det { ids?: string[]; title?: RegExp; sel?: string }
const DET: Record<BlockId, Det> = {
  chips: { sel: '.usage-chips,.loanchip,[data-testid^="labels-"],#h-lab,#t-lab' }, kwic: { ids: ['h-kw', 'f-kw', 't-kw'], title: /Свідчення корпусу/, sel: '[data-testid="oq-badge"],.kwic' },
  witnesses: { ids: ['h-wit', 'f-wit', 'cp-wit', 't-wit', 'lw-wit', 'ar-wit', 'tc-wit'], sel: '#cp-wit,section[aria-label="Пам’ятки"]' }, epochs: { ids: ['h-ep', 'f-ep'], sel: '.epar' }, derivation: { ids: ['h-chain', 'f-der', 't-der'], title: /Кандидати за правилами/ },
  dialect: { ids: ['h-dia', 'f-dia', 't-dia'], sel: '.dialect-block' }, map: { ids: ['h-map', 'f-reg', 't-reg'] }, stats: { ids: ['h-st', 'f-st', 't-st'] },
  stress: { sel: '[data-testid="cp-stress"],.wordhead .hl-line' }, etymology: { ids: ['h-ety', 'h-cog'], sel: '#h-ety' }, senses: { ids: ['h-sn', 't-sn'], sel: '.senses' },
  phrasemes: { ids: ['h-phr'], sel: '#h-phr' }, loan: { sel: '[data-testid="loan-adapt"],.loan-adapt' }, derivatives: { ids: ['h-der'], title: /Похідн/ },
  ipa: { ids: ['h-ipa', 't-ipa'], sel: '.ipa-row' }, labels: { ids: ['h-lab', 't-lab'], sel: '[data-testid^="labels-"]' }, senseTimeline: { sel: '[data-testid^="se-"]' },
  overview: { sel: '[data-testid="overview"]' }, pronunciation: { sel: '[data-testid="ov-pronunciation"]' }, origin: { sel: '[data-testid="ov-origin"],[data-testid="ov-origin-none"]' },
  paradigm: { ids: ['h-par'], sel: '[data-testid^="ov-paradigm"]' }, regions: { sel: '[data-testid="region-bars"],[data-testid="ov-regions"],[data-testid="ov-noregion"]' },
  ruFlag: { sel: '[data-testid="ru-first-note"],.rubadge,.ru-badge,[data-testid="oq-badge"]' }, featureChips: { sel: '#cp-rules,[data-testid="card-rules"]' },
  variantFamily: { sel: '#cp-rules,[data-testid="card-rules"],[data-testid="variant-family"]' }, contactForm: { sel: '#cp-rules,[data-testid="card-rules"],[data-testid="form-contact"]' },
  switches: { sel: '[data-testid="ov-spelling"],[data-testid="ov-spelling-none"]' }, synonyms: { sel: '[data-testid="ov-synant"],[data-testid^="synant-"]' },
  wiktPhraseology: { sel: '[data-testid="ov-phraseology"],[data-testid^="phrw-"]' },
}
const EMPTY = /немає|не встановлено|невідом|відсутн|не знайдено|нічого/i
export type State = 'data' | 'empty' | 'MISSING' | 'LOADING' | 'cond'
/** blocks that are rendered only when the data exists at all (a loan adaptation for a loanword, the RU flag for a Russian-edition citation): absence is not a defect */
const COND: BlockId[] = ['loan', 'ruFlag', 'epochs']   // epochs: WordView omits the epoch panel for an uninflected word (kind === 'uninflected')
interface Result { item: Item; ok: boolean; states: Record<string, State>; consoleErrors: string[]; failed: string[]; notFound: string[]; bytes: number; firstRenderMs: number | null; loadingStuck: string[]; shot: string; h1: string; err?: string }

async function probe(page: Page): Promise<{ states: Record<string, State>; stuck: string[]; h1: string }> {
  return page.evaluate(([det, empty]) => {
    const em = new RegExp(empty as string, 'i'), D = det as Record<string, { ids?: string[]; title?: string; sel?: string }>
    const states: Record<string, string> = {}
    const stateOf = (el: Element): string => {
      const sec = el.closest('section.panel') ?? el, sum = sec.querySelector('.psum'); const body = (sec as HTMLElement).innerText ?? ''
      if (/завантаження/i.test(body.replace(/\s+/g, ' ')) && body.length < 400) return 'LOADING'
      if (sum?.classList.contains('unk')) return 'empty'
      const t = (el as HTMLElement).textContent ?? ''
      if (t.trim().length < 3) return 'empty'
      if (t.length < 260 && em.test(t)) return 'empty'
      return 'data'
    }
    for (const [b, d] of Object.entries(D)) {
      const els: Element[] = []
      for (const id of d.ids ?? []) { const e = document.getElementById(id); if (e) els.push(e) }
      if (d.title) { const re = new RegExp(d.title); document.querySelectorAll('.ptitle,h2.small,section.card > strong').forEach(e => { if (re.test(e.textContent ?? '')) els.push(e) }) }
      if (d.sel) document.querySelectorAll(d.sel).forEach(e => els.push(e))
      if (!els.length) { states[b] = 'MISSING'; continue }
      const ss = els.map(stateOf); states[b] = ss.includes('data') ? 'data' : ss.includes('LOADING') ? 'LOADING' : 'empty'
    }
    const stuck = Array.from(document.querySelectorAll('[data-testid$="loading"]')).map(e => e.getAttribute('data-testid') ?? '')
    document.querySelectorAll('main *').forEach(e => { if (e.children.length === 0 && /^\s*завантаження…?\s*$/i.test(e.textContent ?? '')) stuck.push('«завантаження…»') })
    return { states, stuck, h1: (document.querySelector('h1')?.textContent ?? '').trim().slice(0, 80) }
  }, [Object.fromEntries(Object.entries(DET).map(([k, v]) => [k, { ...v, title: v.title?.source }])), EMPTY.source] as const) as Promise<{ states: Record<string, State>; stuck: string[]; h1: string }>
}

async function openCard(browser: import('playwright').Browser, it: Item, shotDir: string, idx: number): Promise<Result> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }), page = await ctx.newPage()
  const res: Result = { item: it, ok: true, states: {}, consoleErrors: [], failed: [], notFound: [], bytes: 0, firstRenderMs: null, loadingStuck: [], shot: '', h1: '' }
  await page.addInitScript('window.__name = (f) => f')
  const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable')
  cdp.on('Network.loadingFinished', (e: { encodedDataLength: number }) => { res.bytes += e.encodedDataLength })
  page.on('console', m => { if (m.type() === 'error' && !/status of 40[34]/.test(m.text())) res.consoleErrors.push(m.text().slice(0, 300)) })
  page.on('pageerror', e => res.consoleErrors.push('pageerror: ' + String(e).slice(0, 300)))
  page.on('requestfailed', r => res.failed.push(`${r.url().slice(0, 160)} ${r.failure()?.errorText ?? ''}`))
  page.on('response', r => { if (r.status() >= 500) res.failed.push(`${r.status()} ${r.url().slice(0, 160)}`); else if (r.status() >= 400) res.notFound.push(`${r.status()} ${r.url().slice(0, 160)}`) })
  const t0 = Date.now()
  try {
    await page.goto(`${BASE}#${it.route}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    try { await page.waitForSelector('h1', { timeout: 30000 }); await page.waitForSelector('[role="tab"],[data-testid="thin-card"],[data-testid="lemma-blocks"]', { timeout: 12000 }).catch(() => {}); res.firstRenderMs = Date.now() - t0 } catch { res.err = 'no h1 within 30 s' }
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    if (it.dialect) {
      try { const lab = (await page.$$eval('select[aria-label^="Говір"] option', os => os.map(o => o.textContent ?? ''))).find(t => /поліськ/i.test(t)) ?? ''; await page.selectOption('select[aria-label^="Говір"]', { label: lab }) } catch (e) { res.consoleErrors.push('dialect switch: ' + String(e).slice(0, 120)) }
    }
    if (it.route === '/annotate') {
      const ta = await page.$('textarea'); if (ta) { await ta.fill('отношеніє'); await page.waitForTimeout(500) }
      const btn = page.getByRole('button', { name: /анотувати|аналіз|розібрати/i }).first(); if (await btn.count()) await btn.click().catch(() => {})
    }
    // visit every tab so each pane is mounted (panes stay mounted once seen)
    const expand = async () => { for (const b of await page.$$('button.ptoggle[aria-expanded="false"]')) await b.click().catch(() => {}) }   // a collapsed panel mounts its body only when opened
    for (const t of await page.$$('[role="tab"]')) { await t.click().catch(() => {}); await page.waitForTimeout(600); await expand(); await page.waitForTimeout(300) }
    // allow data to settle, up to 10 s for the loading markers
    const deadline = Date.now() + 10000; let pr = await probe(page)
    while (pr.stuck.length && Date.now() < deadline) { await page.waitForTimeout(1000); pr = await probe(page) }
    res.states = pr.states; for (const b of COND) if (res.states[b] === 'MISSING') res.states[b] = 'cond'; res.loadingStuck = pr.stuck; res.h1 = pr.h1
    const first = page.getByRole('tab').first(); if (await first.count()) await first.click().catch(() => {})
    res.shot = join(shotDir, `${String(idx).padStart(3, '0')}-${it.kind}-${it.label.replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 40)}.png`)
    await page.screenshot({ path: res.shot, fullPage: true }).catch(() => { res.shot = '' })
  } catch (e) { res.err = String(e).slice(0, 200) }
  res.ok = !res.err && !res.consoleErrors.length && !res.failed.length && !res.loadingStuck.length
  await ctx.close(); return res
}

/** the matrix kind a card is judged against: its own kind, or for an owner example the kind its route resolved to (none when the page says «немає в корпусі») */
const mkind = (r: Result): KindId | null => r.item.kind in MATRIX ? r.item.kind as KindId : r.item.kind !== 'owner' || /немає в корпусі|не знайд/.test(r.h1) ? null : r.item.route.startsWith('/w/') ? 'word' : r.item.route.startsWith('/lw/') ? 'light' : r.item.route.startsWith('/ar/') ? 'archaic' : r.item.route.startsWith('/f/') ? 'form' : null
const pct = (n: number, d: number) => d ? `${Math.round(100 * n / d)}%` : '-'
function report(rs: Result[]): string {
  const kinds = [...new Set(rs.map(r => r.item.kind))], blocks = Object.keys(BLOCKS) as BlockId[]
  const o: string[] = [`# Card parity — LIVE end-to-end (SPEC 63 CP-10)`, '', `Run ${new Date().toISOString()} against ${BASE} (data build ${ptr.buildId}); Chromium via Playwright, one fresh browser context per card (cold cache), sequential, seed ${SEED}, ${N} cards per kind + the owner examples (${rs.length} cards). Re-run: \`npm run e2e:cards\` (script \`pipelines/e2e-cards.ts\`; not part of vitest).`, '', 'Cell states: **data** the block renders with data; **empty** it renders the honest «немає даних …» state; **MISSING** the block is absent from the DOM although the matrix says it is shown / honest-empty; **LOADING** «завантаження…» still on screen after 10 s; **n/a** the matrix says the data cannot exist. A block counts as present if any of its panels / test ids is in the DOM after every tab was opened.', '']
  o.push('## Per-kind summary', '', '| kind | cards | clean | with errors | blocks data | blocks empty | blocks MISSING | median first render, ms | median transfer, KiB |', '|---|---|---|---|---|---|---|---|---|')
  const med = (a: number[]) => a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]! : 0
  for (const k of kinds) {
    const g = rs.filter(r => r.item.kind === k)
    let d = 0, e = 0, x = 0
    for (const r of g) { const mk = mkind(r), m = mk ? MATRIX[mk] : null; for (const b of blocks) { if (m && m[b] === 'na') continue; const s = r.states[b]; if (!s) continue; if (s === 'data') d++; else if (s === 'empty') e++; else if (s === 'MISSING' && m) x++ } }
    o.push(`| ${k} | ${g.length} | ${g.filter(r => r.ok).length} | ${g.filter(r => !r.ok).length} | ${d} | ${e} | ${x} | ${med(g.map(r => r.firstRenderMs ?? 0))} | ${Math.round(med(g.map(r => r.bytes)) / 1024)} |`)
  }
  o.push('', '## Live matrix (rows = blocks, columns = kinds; cell = data/empty/MISSING counts over the sampled cards, n/a from the matrix)', '', `| block | ${kinds.filter(k => k in MATRIX).join(' | ')} |`, `|---|${kinds.filter(k => k in MATRIX).map(() => '---').join('|')}|`)
  for (const b of blocks) o.push(`| \`${b}\` | ${kinds.filter(k => k in MATRIX).map(k => {
    if (MATRIX[k as KindId][b] === 'na') return 'n/a'
    const g = rs.filter(r => r.item.kind === k && r.states[b]); const c = (s: string) => g.filter(r => r.states[b] === s).length
    return `${c('data')}/${c('empty')}/${c('MISSING') ? `**${c('MISSING')}**` : 0}${c('LOADING') ? `/L${c('LOADING')}` : ''}${c('cond') ? `/c${c('cond')}` : ''}`
  }).join(' | ')} |`)
  o.push('', '## Missing blocks (MISSING in the DOM although the matrix lists the block) and errors', '')
  const miss = new Map<string, string[]>()
  for (const r of rs) { const mk = mkind(r), m = mk ? MATRIX[mk] : null; if (!m || r.err) continue; for (const b of blocks) if (m[b] !== 'na' && r.states[b] === 'MISSING') (miss.get(`${mk} × ${b}`) ?? miss.set(`${mk} × ${b}`, []).get(`${mk} × ${b}`)!).push(`${BASE}#${r.item.route}`) }
  if (!miss.size) o.push('No MISSING block on a sampled card of a matrix kind.', ''); else for (const [k, u] of miss) o.push(`- **${k}** — ${u.length} of the sampled cards, e.g. ${u.slice(0, 3).join(' , ')}`)
  o.push('', '### Cards with ERROR (console error, failed request, stuck loading, no render)', '')
  const bad = rs.filter(r => !r.ok)
  if (!bad.length) o.push('None.'); else for (const r of bad) o.push(`- \`${r.item.kind}\` ${BASE}#${r.item.route} — ${[r.err, ...r.consoleErrors.map(x => 'console: ' + x), ...r.failed.map(x => 'net: ' + x), ...r.loadingStuck.map(x => 'stuck: ' + x)].filter(Boolean).slice(0, 4).join(' | ')}`)
  const nf = new Map<string, number>(); for (const r of rs) for (const n of r.notFound) { const k = n.replace(/\/\d+\.json|[%\w-]+\.json/g, m => m.includes('/') ? '/N.json' : 'X.json'); nf.set(k, (nf.get(k) ?? 0) + 1) }
  o.push('', '### HTTP 4xx responses (informational: optional shards answer 404 by design, the client treats it as «no data»)', '')
  if (!nf.size) o.push('None.'); else for (const [k, n] of [...nf].sort((a, b) => b[1] - a[1]).slice(0, 25)) o.push(`- ${n}× ${k}`)
  o.push('', '## Per-card timings (cold deep link)', '', '| kind | card | first render, ms | transfer, KiB | blocks MISSING |', '|---|---|---|---|---|')
  for (const r of rs) o.push(`| ${r.item.kind} | [${r.item.label}](${BASE}#${r.item.route}) | ${r.firstRenderMs ?? 'n/a'} | ${Math.round(r.bytes / 1024)} | ${blocks.filter(b => r.states[b] === 'MISSING' && mkind(r) && MATRIX[mkind(r)!][b] !== 'na').join(', ') || '-'} |`)
  o.push('')
  return o.join('\n')
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const items = await sample(); console.log(`${items.length} cards, out ${OUT}`)
  const browser = await chromium.launch(), rs: Result[] = []
  let i = 0
  for (const it of items) {
    const r = await openCard(browser, it, OUT, ++i); rs.push(r)
    console.log(`${i}/${items.length} ${r.ok ? 'ok ' : 'ERR'} ${it.kind} ${it.label} ${r.firstRenderMs}ms ${Math.round(r.bytes / 1024)}KiB miss=${Object.entries(r.states).filter(([, s]) => s === 'MISSING').map(([b]) => b).join(',')}`)
    writeJsonAtomic(join(OUT, 'results.json'), JSON.stringify(rs, null, 1))
  }
  const checks: Check[] = []
  if (!ONLY || ONLY.includes('content')) {
    for (const f of [personChecks, textChecks, annotateChecks]) { try { checks.push(...await f(browser, BASE)) } catch (e) { checks.push({ id: f.name, name: f.name, ok: false, evidence: 'exception: ' + String(e).slice(0, 200) }) } }
    for (const c of checks) console.log(c.ok ? 'PASS' : 'FAIL', c.id, c.evidence.slice(0, 160))
    writeJsonAtomic(join(OUT, 'checks.json'), JSON.stringify(checks, null, 1))
  }
  await browser.close()
  writeJsonAtomic('analysis/card-parity-live.md', report(rs) + contentReport(checks))
  console.log('analysis/card-parity-live.md written')
}
if (!existsSync('src/data/data-version.json')) throw new Error('run from the repo root')
await main()
