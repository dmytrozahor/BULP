/**
 * SPEC 63 BQ-2..BQ-4: thin GitHub glue around core/bq.ts. Runs on Node 24 type stripping (no npm ci needed) with GITHUB_TOKEN only.
 *   node pipelines/bq.ts labels     create/update the labels of .github/labels.json (idempotent)
 *   node pipelines/bq.ts triage     BQ-2: triage open issues labelled book/list/proposal that carry no needs-approval/approved/rejected
 *   node pipelines/bq.ts decide     BQ-3/BQ-4: reacts to the event in GITHUB_EVENT_PATH (label approved/rejected, owner comment)
 * Never prints the token. The approved queue is harvest/queue.jsonl (appended by the workflow's commit; see README).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import {
  LABELS, kindOf, parseBook, parseList, triageBooks, triageComment, knownFrom, hostOf, parseRowCommands, readState, stateComment,
  applyRowCommands, allResolved, queueItem, appendQueue, rejectionReason, BOT_MARK, STATE_RE,
  type BookFields, type Cmt, type Finding, type TriageRow,
} from '../core/bq.ts'

const REPO = process.env.GITHUB_REPOSITORY ?? 'dmytrozahor/BULP'
const TOKEN = process.env.GITHUB_TOKEN ?? ''
const OWNER = REPO.split('/')[0]!
export const QUEUE = 'harvest/queue.jsonl'

async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(`https://api.github.com${path}`, {
    method, headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'bulp-bq' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!r.ok && r.status !== 404 && r.status !== 422) throw new Error(`${method} ${path} -> ${r.status} ${(await r.text()).slice(0, 200)}`)
  return (r.status === 204 ? {} : await r.json().catch(() => ({}))) as T
}

// ── labels ──────────────────────────────────────────────────────────────────────────────────────────
async function labels() {
  const want = JSON.parse(readFileSync('.github/labels.json', 'utf8')) as { name: string; color: string; description: string }[]
  for (const l of want) {
    const r = await api<{ message?: string }>('POST', `/repos/${REPO}/labels`, l)
    if (r.message) {   // exists (422): update
      await api('PATCH', `/repos/${REPO}/labels/${encodeURIComponent(l.name)}`, { new_name: l.name, color: l.color, description: l.description })
      console.log(`updated ${l.name}`)
    } else console.log(`created ${l.name}`)
  }
}

// ── shared issue helpers ────────────────────────────────────────────────────────────────────────────
interface Issue { number: number; title: string; body: string | null; html_url: string; state: string; labels: { name: string }[]; pull_request?: unknown }
const names = (i: Issue) => i.labels.map(l => l.name)
const comment = (n: number, body: string) => api('POST', `/repos/${REPO}/issues/${n}/comments`, { body })
const addLabel = (n: number, l: string) => api('POST', `/repos/${REPO}/issues/${n}/labels`, { labels: [l] })
const dropLabel = (n: number, l: string) => api('DELETE', `/repos/${REPO}/issues/${n}/labels/${encodeURIComponent(l)}`)

async function comments(n: number): Promise<(Cmt & { id: number })[]> {
  const r = await api<{ id: number; user: { login: string; type: string }; body: string; created_at: string }[]>('GET', `/repos/${REPO}/issues/${n}/comments?per_page=100`)
  return r.map(c => ({ id: c.id, author: c.user.login, body: c.body, at: c.created_at, bot: c.user.type === 'Bot' }))
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const e of readdirSync(dir, { withFileTypes: true })) { const p = `${dir}/${e.name}`; if (e.isDirectory()) walk(p, out); else if (/index\.jsonl$/.test(e.name)) out.push(p) }
  return out
}
/** Known URLs/titles; `skipIssue` leaves out that issue's own queue lines so an approval does not collide with itself. */
function known(skipIssue = 0) {
  const files = ['core/sources.ts', 'pipelines/manifest.ts', ...walk('data/raw/harvest')]
  const texts = files.filter(existsSync).map(f => readFileSync(f, 'utf8'))
  if (existsSync(QUEUE)) texts.push(readFileSync(QUEUE, 'utf8').split('\n').filter(l => { try { return JSON.parse(l).issue !== skipIssue } catch { return false } }).join('\n'))
  return knownFrom(texts)
}

async function probe(urls: string[]) {
  const linkStatus: Record<string, number | 'error'> = {}, robotsBlocked: string[] = [], hosts = new Set<string>()
  for (const u of urls) {
    try { const r = await fetch(u, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'bulp-bq' } }); linkStatus[u] = r.status } catch { linkStatus[u] = 'error' }
    hosts.add(hostOf(u))
  }
  for (const h of hosts) {
    try {
      const t = await (await fetch(`https://${h}/robots.txt`, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'bulp-bq' } })).text()
      const star = /user-agent:\s*\*([\s\S]*?)(?=user-agent:|$)/i.exec(t)
      if (star && /^\s*disallow:\s*\/\s*$/im.test(star[1]!)) robotsBlocked.push(h)
    } catch { /* no robots.txt */ }
  }
  return { linkStatus, robotsBlocked }
}

function rowsOf(issue: Issue): { kind: ReturnType<typeof kindOf>; books: BookFields[] } {
  const kind = kindOf(names(issue)), body = issue.body ?? ''
  if (kind === 'list') return { kind, books: parseList(body).rows }
  if (kind === 'book') return { kind, books: [parseBook(body)] }
  return { kind, books: [] }
}

// ── BQ-2 ────────────────────────────────────────────────────────────────────────────────────────────
async function triage() {
  const kn = known(), skip = new Set<string>([LABELS.needs, LABELS.approved, LABELS.rejected])
  const seen = new Map<number, Issue>()
  for (const l of [LABELS.book, LABELS.list, LABELS.proposal]) {
    const r = await api<Issue[]>('GET', `/repos/${REPO}/issues?state=open&labels=${l}&per_page=100`)
    for (const i of Array.isArray(r) ? r : []) if (!i.pull_request) seen.set(i.number, i)
  }
  for (const issue of seen.values()) {
    if (names(issue).some(n => skip.has(n))) continue
    const { kind, books } = rowsOf(issue)
    let rows: TriageRow[] = [], extra: Finding[] = []
    if (books.length) rows = triageBooks(books, kn, await probe(books.flatMap(b => b.links)))
    else if (kind === 'list') extra = [{ level: 'error', code: 'no-rows', msg: 'no book rows found' }]
    else if (!(issue.body ?? '').trim()) extra = [{ level: 'warn', code: 'empty', msg: 'empty description' }]
    await comment(issue.number, triageComment(kind, rows, extra))
    await addLabel(issue.number, LABELS.needs)
    console.log(`triaged #${issue.number} (${kind}, ${rows.length} rows)`)
  }
}

// ── BQ-3 / BQ-4 ─────────────────────────────────────────────────────────────────────────────────────
interface Ev { action?: string; label?: { name: string }; issue?: Issue; comment?: { body: string; user: { login: string } }; sender?: { login: string } }

function writeQueue(items: ReturnType<typeof queueItem>[]) {
  const cur = existsSync(QUEUE) ? readFileSync(QUEUE, 'utf8') : ''
  const { text, added } = appendQueue(cur, items)
  if (added.length) { mkdirSync('harvest', { recursive: true }); writeFileSync(QUEUE, text) }
  return added
}

async function decide() {
  const ev = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH!, 'utf8')) as Ev
  const issue = ev.issue
  if (!issue || issue.pull_request) return
  const actor = ev.comment?.user.login ?? ev.sender?.login ?? ''
  const n = issue.number
  if (actor.toLowerCase() !== OWNER.toLowerCase()) {
    if (ev.action === 'labeled' && ev.label && [LABELS.approved, LABELS.rejected].includes(ev.label.name as never)) {
      await dropLabel(n, ev.label.name); await comment(n, `Only the owner may add \`${ev.label.name}\` (SPEC 63 BQ-3); the label was removed.`)
    }
    return
  }
  const now = new Date().toISOString()
  const { kind, books } = rowsOf(issue)
  const cs = await comments(n)

  // BQ-4: rejected needs a reason comment; the issue is closed (not planned) with that reason.
  if (names(issue).includes(LABELS.rejected) && issue.state === 'open') {
    const reason = rejectionReason(cs, OWNER)
    if (!reason) { await comment(n, `${BOT_MARK}\nThe label \`rejected\` needs a reason (SPEC 63 BQ-4). Reply with a comment giving it (e.g. «no link», «guessed date», «unclear licence», «duplicate», «not Ukrainian»); the issue will then be closed.`); return }
    await comment(n, `Closed as rejected (SPEC 63 BQ-4). Reason: ${reason}`)
    await api('PATCH', `/repos/${REPO}/issues/${n}`, { state: 'closed', state_reason: 'not_planned' })
    return
  }

  const rowMode = kind === 'list' && ev.comment
  if (rowMode) {   // owner replies «approve 1,3» / «reject 2 reason» on a list
    const cmds = parseRowCommands(ev.comment!.body)
    if (!cmds.length) return
    const stateC = cs.find(c => c.bot && STATE_RE.test(c.body))
    const { state, ignored } = applyRowCommands(readState(stateC?.body), cmds, books.length)
    const body = stateComment(state) + (ignored.length ? `\nIgnored: ${ignored.join('; ')}` : '')
    if (stateC) await api('PATCH', `/repos/${REPO}/issues/comments/${stateC.id}`, { body }); else await comment(n, body)
    const tri = triageBooks(books, known(n))
    const ok = state.approved.filter(r => { const t = tri[r - 1]; return t && (t.status === 'ok' || t.status === 'warn') })
    const bad = state.approved.filter(r => !ok.includes(r) && !queued(n, r))
    if (bad.length) await comment(n, `Rows ${bad.join(',')} have errors or duplicates and were not queued; fix the issue text or reject them.`)
    writeQueue(ok.map(r => queueItem(n, issue.html_url, r, books[r - 1]!, now)))
    if (allResolved(state, books.length)) { await api('PATCH', `/repos/${REPO}/issues/${n}`, { state: 'closed', state_reason: 'completed' }); await comment(n, 'Every row is resolved; closing.') }
    return
  }

  if (ev.action === 'labeled' && ev.label?.name === LABELS.approved) {
    if (kind === 'proposal' || kind === 'other') { await comment(n, `${BOT_MARK}\nApproved. A non-book proposal is acted on by an agent or the owner as a draft SPEC item or mismatch-ledger item (BQ-7); not queued for harvest.`); return }
    const tri = triageBooks(books, known(n))
    const state = readState(cs.find(c => c.bot && STATE_RE.test(c.body))?.body)
    const rows = tri.filter(r => !state.rejected[r.n] && !queued(n, r.n))
    const good = rows.filter(r => r.status === 'ok' || r.status === 'warn')
    const skipped = rows.filter(r => !good.includes(r))
    const added = writeQueue(good.map(r => queueItem(n, issue.html_url, r.n, r.book, now)))
    await comment(n, `${BOT_MARK}\nApproved (SPEC 63 BQ-3). Queued ${added.length} item(s) in \`${QUEUE}\` for \`npm run harvest:ingest\`; metadata is cited to this issue.` + (skipped.length ? `\nNot queued (errors or duplicates): ${skipped.map(r => `#${r.n} ${r.findings.filter(f => f.level === 'error').map(f => f.code).join('/')}`).join('; ')}. Fix the issue text and re-add the label.` : ''))
    if (skipped.length) await dropLabel(n, LABELS.approved)
    return
  }
}
function queued(issue: number, row: number): boolean {
  if (!existsSync(QUEUE)) return false
  return readFileSync(QUEUE, 'utf8').split('\n').some(l => { try { const o = JSON.parse(l); return o.issue === issue && o.row === row } catch { return false } })
}

const cmd = process.argv[2]
const run = { labels, triage, decide }[cmd as 'labels']
if (process.argv[1]?.endsWith('bq.ts')) {
  if (!run) { console.error('usage: node pipelines/bq.ts labels|triage|decide'); process.exit(2) }
  if (!TOKEN) { console.error('GITHUB_TOKEN is not set'); process.exit(2) }
  run().catch(e => { console.error(String(e).replace(TOKEN, '***')); process.exit(1) })
}
