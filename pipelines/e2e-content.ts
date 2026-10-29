/**
 * SPEC 63 CP-10 part 2 — content checks for `npm run e2e:cards`: the page is not only opened, its CONTENT is verified on the deployed site.
 * (a) person page Шевченко: portrait with a licence line (or the honest empty line), works timeline, a person-mention link in a KWIC of a card;
 * (b) corpus text view Грінченко «Під хмарним небом» 1893: «засьпіваєш» → заспівати with the сь+labial chip, «сьпіваютьця» → співатися;
 * (c) annotator: отношеніє contact class (MM-36), «то їсть» бути / їсти (MM-38), «видів-го» го → він (MM-42), «шо» / «ше» reduction chip (MM-43).
 * Each check has an id (printed in analysis/card-parity-live.md); a FAIL is recorded in SPEC 63 CP-10 as a CP-10.n item with this evidence.
 */
import { readFileSync, readdirSync } from 'node:fs'
import type { Browser, Page } from 'playwright'

export interface Check { id: string; name: string; ok: boolean; evidence: string }
const decode = (h: string | null) => { try { return decodeURIComponent(h ?? '') } catch { return h ?? '' } }
async function withPage<T>(browser: Browser, fn: (p: Page) => Promise<T>): Promise<T> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }), page = await ctx.newPage()
  await page.addInitScript('window.__name = (f) => f')
  try { return await fn(page) } finally { await ctx.close() }
}
const openAll = async (page: Page) => {
  for (const t of await page.$$('[role="tab"]')) { await t.click().catch(() => {}); await page.waitForTimeout(300) }
  for (const b of await page.$$('button.ptoggle[aria-expanded="false"]')) await b.click().catch(() => {})
  await page.waitForTimeout(1200)
}
const squash = (s: string) => s.replace(/\s+/g, ' ').trim()

/** (a) */
export async function personChecks(browser: Browser, base: string): Promise<Check[]> {
  const out: Check[] = []
  const persons = (JSON.parse(readFileSync('public/data/persons/index.json', 'utf8')) as { rows: { id: string; name: string }[] }).rows
  const sh = persons.find(p => /Шевченко/.test(p.name))
  if (!sh) return [{ id: 'person.found', name: 'Шевченко is in persons/index.json', ok: false, evidence: 'no row' }]
  await withPage(browser, async page => {
    await page.goto(`${base}#/person/${encodeURIComponent(sh.id)}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="works"] li,[data-testid="person-absent"]', { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(1500)
    const h1 = squash((await page.textContent('h1').catch(() => '')) ?? '')
    const portrait = await page.$('[data-testid="portrait"]'), none = await page.$('[data-testid="no-portrait"]')
    if (portrait) {
      const cap = squash(await portrait.$eval('figcaption', e => e.textContent ?? '').catch(() => '')), w = await portrait.$eval('img', e => (e as HTMLImageElement).naturalWidth).catch(() => 0)
      out.push({ id: 'person.portrait', name: 'Шевченко: portrait loads and has a licence line', ok: w > 0 && /Public domain|CC[ -]|PD/i.test(cap) && /Commons/.test(cap), evidence: `img naturalWidth ${w}; figcaption «${cap.slice(0, 200)}»` })
    } else {
      const t = none ? squash((await none.textContent()) ?? '') : ''
      out.push({ id: 'person.portrait', name: 'Шевченко: the honest empty portrait line', ok: !!none && /перевірено/.test(t), evidence: t.slice(0, 200) || 'neither data-testid=portrait nor no-portrait on the page' })
    }
    const works = await page.$$eval('[data-testid="works"] li', es => es.map(e => (e.textContent ?? '').trim().slice(0, 80)))
    out.push({ id: 'person.works', name: 'Шевченко: works timeline is not empty', ok: works.length > 0, evidence: `h1 «${h1}», ${works.length} items; first: ${works[0] ?? '-'}` })
  })
  // the mentions sidecar names the witnesses where he is a high-confidence mention (build-time, persons/mentions/m<N>.json); the words that stand next to such a mention have it in the
  // context of a KWIC line, so a word card of one of those lemmas must show the name as a dotted link to /person/<id>; the candidates come from the witness texts, the check is on the live page
  const ptr = JSON.parse(readFileSync('src/data/data-version.json', 'utf8')) as { base: string; buildId: string }
  const lemmas = new Set<string>((JSON.parse(readFileSync('public/data/lexicon.json', 'utf8')).cards as unknown[][]).map(c => c[0] as string))
  const recs: [string, { loc: string; f: string }][] = []
  for (const f of readdirSync('public/data/persons/mentions')) {
    const j = JSON.parse(readFileSync(`public/data/persons/mentions/${f}`, 'utf8')) as Record<string, { p: string; loc: string; f: string; why: string }[]>
    for (const [w, l] of Object.entries(j)) for (const m of l) if (m.p === sh.id && m.why === 'повне ім’я') recs.push([w, m])
  }
  const cands: string[] = [], deadline = Date.now() + 240000
  for (const [w, m] of recs) {
    if (cands.length >= 12 || Date.now() > deadline) break
    try {
      const r = await fetch(`${ptr.base}/data/${ptr.buildId}/texts/${encodeURIComponent(w)}.json`); if (!r.ok) continue
      const toks = (await r.json()).tokens as string[][], i = toks.findIndex(t => t[0] === m.f.split(' ')[0] && t[1] === m.loc); if (i < 0) continue
      for (const t of [...toks.slice(Math.max(0, i - 5), i), ...toks.slice(i + 2, i + 7)]) { const x = (t[0] ?? '').toLowerCase(); if (lemmas.has(x) && x.length > 3 && !cands.includes(x)) cands.push(x) }
    } catch { /* next witness */ }
  }
  const tried: string[] = []; let found: string | undefined
  await withPage(browser, async page => {
    for (const lemma of cands) {
      if (Date.now() > deadline + 120000) break
      await page.goto(`${base}#/w/${encodeURIComponent(lemma)}`, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('h1', { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(1500); await openAll(page)
      const links = await page.$$eval('.pmention', es => es.map(e => ({ t: e.textContent ?? '', h: e.getAttribute('href') ?? '', title: e.getAttribute('title') ?? '', inKwic: !!e.closest('.kwic,[id$="-kw"]') })))
      tried.push(`${lemma}: ${links.length}`)
      const hit = links.find(l => l.inKwic && /#\/person\//.test(l.h) && l.title)
      if (hit) { found = `/w/${lemma}: «${hit.t}» → ${decode(hit.h)}; title «${hit.title.slice(0, 120)}»`; break }
    }
  }).catch(e => tried.push('error ' + String(e).slice(0, 80)))
  out.push({ id: 'person.mention', name: 'a KWIC of a card shows a dotted person-mention link to /person/<id>', ok: !!found, evidence: found ?? `${recs.length} full-name mentions in the sidecar; none of ${cands.length} neighbour-word cards showed a link in its KWIC (${tried.join('; ')})` })
  return out
}

/** (b) */
export async function textChecks(browser: Browser, base: string): Promise<Check[]> {
  const out: Check[] = [], id = 'chaichenko1893', loc = 'Під хмарним небом, с. 3'
  await withPage(browser, async page => {
    await page.goto(`${base}#/texts?w=${id}&loc=${encodeURIComponent(loc)}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.reader .tok', { timeout: 40000 }).catch(() => {}); await page.waitForTimeout(2500)
    const tok = (raw: string) => page.$$eval('.reader .tok', (es, r) => es.filter(e => (e.textContent ?? '').trim() === r).map(e => ({ href: e.getAttribute('href') ?? '', title: e.getAttribute('title') ?? '', cls: e.className })), raw)
    const a = await tok('засьпіваєш'), b = await tok('сьпіваютьця')
    const ev = (ts: typeof a) => ts.length ? ts.map(t => `href ${decode(t.href)}; class «${t.cls}»; title «${t.title.slice(0, 200)}»`).join(' | ') : 'token not on the page'
    out.push({ id: 'text.zaspivaesh.link', name: '«засьпіваєш» (Грінченко 1893) links to заспівати', ok: a.some(t => /заспівати/.test(decode(t.href)) || /лема «заспівати»/.test(t.title)), evidence: ev(a) })
    out.push({ id: 'text.zaspivaesh.chip', name: '«засьпіваєш» carries the сь+labial chip (асимілятивна м’якість, ORTH-ZHEL-SOFT)', ok: a.some(t => /асимілятив|ORTH-ZHEL-SOFT/.test(t.title)), evidence: ev(a) })
    out.push({ id: 'text.spivajutcja.link', name: '«сьпіваютьця» links to співатися', ok: b.some(t => /співатися/.test(decode(t.href)) || /лема «співатися»/.test(t.title)), evidence: ev(b) })
  })
  return out
}

/** (c) */
export async function annotateChecks(browser: Browser, base: string): Promise<Check[]> {
  const out: Check[] = []
  await withPage(browser, async page => {
    await page.goto(`${base}#/annotate`, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('textarea', { timeout: 30000 })
    await page.fill('textarea', 'Отношеніє до людей. То їсть добрий хліб. Видів-го вчора, шо ше скажеш')
    await page.waitForSelector('.ann .w', { timeout: 40000 }).catch(() => {}); await page.waitForTimeout(3000)
    const card = async (t: string) => {
      const el = page.locator('.ann .w').filter({ hasText: new RegExp('^\\s*' + t + '(реконстр\\.)?\\s*$') }).first(); if (!(await el.count())) return null
      await el.hover(); await page.waitForTimeout(600)
      return { href: decode(await el.getAttribute('href')), cls: (await el.getAttribute('class')) ?? '', text: squash(await page.$eval('aside[aria-label="Підсумок"] section.card', e => e.textContent ?? '').catch(() => '')) }
    }
    const find = (m: RegExp, s: string) => s.match(m)?.[0].slice(0, 200) ?? ''
    const o = await card('Отношеніє'), ji = await card('їсть'), vg = await card('Видів-го'), sho = await card('шо'), she = await card('ше')
    out.push({ id: 'ann.otnoshenije', name: 'отношеніє gets a contact class (суржик / язичіє / ЦС-книжна, MM-36)', ok: !!o && /суржик|язичі|церковнослов|ЦС/.test(o.text), evidence: o ? `class «${o.cls}»; ${find(/контактне.{0,160}|язичіє.{0,160}|церковнослов.{0,160}/, o.text) || 'no contact label: ' + o.text.slice(0, 200)}` : 'token not annotated' })
    out.push({ id: 'ann.jist.copula', name: '«то їсть» → бути (через «єсть»), їсти kept as the alternative (MM-38)', ok: !!ji && /\/w\/бути/.test(ji.href) && /єсть/.test(ji.text) && /їсти/.test(ji.text), evidence: ji ? `href ${ji.href}; ${find(/ікавізм.{0,200}/, ji.text) || 'no ikavism chip: ' + ji.text.slice(0, 200)}` : 'token not annotated' })
    out.push({ id: 'ann.vydivgo', name: '«видів-го»: го is read as він (через «його»), the stem видів is kept (MM-42)', ok: !!vg && /він/.test(vg.text) && /\/w\/вид/.test(vg.href), evidence: vg ? `href ${vg.href}; ${find(/енклітична форма.{0,200}/, vg.text) || 'no enclitic reading: ' + vg.text.slice(0, 200)}` : 'token not annotated' })
    out.push({ id: 'ann.sho', name: '«шо» gets the reduction chip (розмовна редукція, MM-43)', ok: !!sho && /розмовна редукція/.test(sho.text), evidence: sho ? find(/розмовна редукція.{0,160}/, sho.text) || sho.text.slice(0, 200) : 'token not annotated' })
    out.push({ id: 'ann.she', name: '«ше» gets the reduction chip (розмовна редукція, MM-43)', ok: !!she && /розмовна редукція/.test(she.text), evidence: she ? find(/розмовна редукція.{0,160}/, she.text) || she.text.slice(0, 200) : 'token not annotated' })
  })
  return out
}

export function contentReport(cs: Check[]): string {
  if (!cs.length) return ''
  const o = ['', '## Content checks (CP-10: the page content is verified, not only opened)', '', '| check | result | evidence |', '|---|---|---|']
  for (const c of cs) o.push(`| ${c.name} (\`${c.id}\`) | ${c.ok ? 'PASS' : '**FAIL**'} | ${c.evidence.replace(/\|/g, '/').replace(/\n/g, ' ')} |`)
  o.push('')
  return o.join('\n')
}
