/**
 * SPEC 63 BQ-2..BQ-4: pure logic of the issue pipeline (no network, no fs).
 * Parses the GitHub issue forms (book.yml, book-list.yml, proposal.yml), validates them, finds duplicates,
 * builds the triage comment, parses the owner's row commands and the approved-queue lines.
 */

export interface BookFields {
  title: string; author: string; years: string; epoch: string; language: string; region: string; school: string
  genre: string; tags: string; links: string[]; licence: string; licenceDetail: string
}
export type Level = 'error' | 'warn' | 'info'
export interface Finding { level: Level; code: string; msg: string }
export type RowStatus = 'ok' | 'warn' | 'invalid' | 'duplicate'
export type IngestMode = 'fulltext' | 'vocab-only'
export interface TriageRow { n: number; book: BookFields; status: RowStatus; findings: Finding[]; mode: IngestMode }
export type IssueKind = 'book' | 'list' | 'proposal' | 'other'

export const LABELS = { book: 'book', list: 'list', proposal: 'proposal', needs: 'needs-approval', approved: 'approved', rejected: 'rejected' } as const

/** «### Label / Мітка» sections of an issue-form body → map keyed by the lower-cased English part of the label. */
export function parseSections(body: string): Record<string, string> {
  const out: Record<string, string> = {}
  const parts = body.replace(/\r\n/g, '\n').split(/^### +/m).slice(1)
  for (const p of parts) {
    const nl = p.indexOf('\n')
    const head = (nl < 0 ? p : p.slice(0, nl)).trim()
    let val = nl < 0 ? '' : p.slice(nl + 1).trim()
    if (/^_?No response_?$/i.test(val)) val = ''
    out[head.split(' / ')[0]!.trim().toLowerCase()] = val
  }
  return out
}

/** Dropdown answers are «English / Українська»; keep the English part without the bracketed years. */
const en = (s: string) => s.split(' / ')[0]!.trim().replace(/\s*\([^)]*\)\s*$/, '').trim()
const isNoAnswer = (s: string) => /^(don't know|не знаю|unknown|невідомо|)$/i.test(s.trim())

export function kindOf(labels: string[]): IssueKind {
  if (labels.includes(LABELS.list)) return 'list'
  if (labels.includes(LABELS.book)) return 'book'
  if (labels.includes(LABELS.proposal)) return 'proposal'
  return 'other'
}

export function urlsIn(s: string): string[] {
  return [...s.matchAll(/https?:\/\/[^\s<>"')\]]+/g)].map(m => m[0].replace(/[.,;]+$/, ''))
}

export function parseBook(body: string): BookFields {
  const s = parseSections(body)
  const g = (k: string) => (s[k] ?? '').trim()
  const epoch = g('epoch (after shevelov)'), lang = en(g('language'))
  return {
    title: g('title'), author: g('author'), years: g('year or year range'), epoch: isNoAnswer(epoch) ? '' : en(epoch),
    language: lang === 'other' ? '' : lang, region: g('region'), school: g('school'), genre: g('genre'), tags: g('tags'),
    links: urlsIn(g('link to the text or scan')), licence: g('licence'), licenceDetail: g('licence details (optional)'),
  }
}

function splitCsv(line: string): string[] {
  const out: string[] = []
  let cur = '', q = false
  for (const ch of line) {
    if (ch === '"') q = !q
    else if (ch === ',' && !q) { out.push(cur.trim()); cur = '' }
    else cur += ch
  }
  out.push(cur.trim())
  return out
}

/** Rows of a list issue: «|»-separated lines (header optional) or CSV; empty cells inherit the shared defaults. */
export function parseList(body: string): { name: string; rows: BookFields[] } {
  const s = parseSections(body)
  const d = (k: string) => (s[k] ?? '').trim()
  const def = { epoch: isNoAnswer(d('default epoch')) ? '' : en(d('default epoch')), language: en(d('default language')), region: d('default region'), school: d('default school / centre') || d('default school'), licence: d('default licence') }
  const raw = d('books').replace(/^```\w*\n?|```$/gm, '')
  const rows: BookFields[] = []
  for (const line of raw.split('\n').map(l => l.trim()).filter(Boolean)) {
    if (/^[-\s|:]+$/.test(line)) continue
    const cells = line.includes('|') ? line.split('|').map(c => c.trim()) : splitCsv(line)
    if (cells[0]?.toLowerCase() === 'title' && /year/i.test(cells[2] ?? '')) continue   // header
    const c = (i: number) => (cells[i] ?? '').trim()
    const e = c(4) || def.epoch
    rows.push({
      title: c(0), author: c(1), years: c(2), links: urlsIn(c(3)), epoch: isNoAnswer(e) ? '' : en(e), language: en(c(5)) || def.language,
      region: c(6) || def.region, school: c(7) || def.school, genre: c(8), licence: c(9) || def.licence, tags: c(10), licenceDetail: '',
    })
  }
  return { name: d('list name'), rows }
}

export type LicenceKind = 'public-domain' | 'cc-free' | 'cc-restricted' | 'copyright' | 'unknown'
export function licenceKind(licence: string, detail = ''): LicenceKind {
  const t = `${licence} ${detail}`.toLowerCase()
  if (/under copyright|авторським правом|©|all rights reserved/.test(t)) return 'copyright'
  if (/public domain|суспільне надбання|cc0|\bpd\b/.test(t)) return 'public-domain'
  if (/\bcc\b|creative commons|\bcc-by/.test(t)) return /\b(sa|nc|nd)\b|by-?sa|by-?nc|by-?nd|share-?alike/.test(t) ? 'cc-restricted' : 'cc-free'
  return 'unknown'
}
/** Copyrighted, share-alike, non-commercial or unclear works are vocabulary-only (BQ-3). */
export function ingestMode(licence: string, detail = ''): IngestMode {
  const k = licenceKind(licence, detail)
  return k === 'public-domain' || k === 'cc-free' ? 'fulltext' : 'vocab-only'
}

/** A year or range the source states; «unknown» is allowed but flagged (undated works are not ingested). */
export function parseYears(s: string): { from: number; to: number } | 'unknown' | null {
  const t = s.trim()
  if (/^(unknown|невідомо)$/i.test(t)) return 'unknown'
  const m = /^(\d{3,4})(?:\s*[-–—]\s*(\d{3,4}))?$/.exec(t)
  if (!m) return null
  const from = +m[1]!, to = m[2] ? +m[2] : from
  return to < from ? null : { from, to }
}

export interface Known { urls: Set<string>; titles: Set<string> }
export const normUrl = (u: string) => u.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[#?].*$/, '').replace(/\/+$/, '')
export const normTitle = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
export function hostOf(u: string): string { try { return new URL(u).host } catch { return '' } }

/** All URLs and quoted titles in the text of core/sources.ts, pipelines/manifest.ts, the queue and the harvest indexes. */
export function knownFrom(texts: string[]): Known {
  const urls = new Set<string>(), titles = new Set<string>()
  for (const t of texts) {
    for (const u of urlsIn(t)) urls.add(normUrl(u))
    for (const m of t.matchAll(/\btitle:\s*(['"`])((?:(?!\1).)+)\1/g)) titles.add(normTitle(m[2]!))
    for (const m of t.matchAll(/"title":\s*"((?:[^"\\]|\\.)+)"/g)) titles.add(normTitle(m[1]!))
  }
  titles.delete('')
  return { urls, titles }
}

export interface Probe { linkStatus?: Record<string, number | 'error'>; robotsBlocked?: string[] }
export function validateBook(b: BookFields, known: Known, probe: Probe = {}): Finding[] {
  const f: Finding[] = []
  const add = (level: Level, code: string, msg: string) => f.push({ level, code, msg })
  if (!b.title) add('error', 'no-title', 'title is missing')
  const y = parseYears(b.years)
  if (y === null) add('error', 'bad-year', `year «${b.years || '(empty)'}» is not a year or a range like 1380-1400; the date must be stated by the source, never guessed`)
  else if (y === 'unknown') add('warn', 'undated', 'no date: an undated work is not ingested (a made-up date would corrupt first attestations)')
  else if (y.from < 600 || y.to > new Date().getFullYear()) add('error', 'year-range', `year ${b.years} is outside 600..now`)
  if (!b.links.length) add('error', 'no-link', 'no link to the text or scan')
  const lk = licenceKind(b.licence, b.licenceDetail)
  if (!b.licence) add('error', 'no-licence', 'licence is missing')
  else if (lk === 'unknown') add('warn', 'licence-unclear', 'licence unclear: the owner decides; until stated the work can only be vocabulary')
  else if (lk === 'copyright' || lk === 'cc-restricted') add('info', 'vocab-only', `licence «${b.licence}»: vocabulary only, no quoted text`)
  for (const u of b.links) {
    if (known.urls.has(normUrl(u))) add('error', 'duplicate-url', `already in the corpus or queue: ${u}`)
    const st = probe.linkStatus?.[u]
    if (st === 'error') add('warn', 'link-dead', `the link did not answer: ${u}`)
    else if (typeof st === 'number' && st >= 400) add('warn', 'link-status', `the link answers ${st}: ${u}`)
  }
  if (b.title && known.titles.has(normTitle(b.title))) add('error', 'duplicate-title', `a source titled «${b.title}» already exists`)
  for (const h of probe.robotsBlocked ?? []) if (b.links.some(u => hostOf(u) === h)) add('warn', 'robots', `robots.txt of ${h} disallows crawling: ask the owner before harvesting`)
  return f
}

export function rowStatus(f: Finding[]): RowStatus {
  if (f.some(x => x.code.startsWith('duplicate'))) return 'duplicate'
  if (f.some(x => x.level === 'error')) return 'invalid'
  return f.some(x => x.level === 'warn') ? 'warn' : 'ok'
}

export function triageBooks(books: BookFields[], known: Known, probe: Probe = {}): TriageRow[] {
  const seen = new Set<string>()
  return books.map((book, i) => {
    const findings = validateBook(book, known, probe)
    for (const u of book.links) {
      const n = normUrl(u)
      if (seen.has(n)) findings.push({ level: 'error', code: 'duplicate-url', msg: `listed twice in this issue: ${u}` })
      seen.add(n)
    }
    return { n: i + 1, book, findings, status: rowStatus(findings), mode: ingestMode(book.licence, book.licenceDetail) }
  })
}

export const BOT_MARK = '<!-- bq-triage -->'
const cell = (s: string) => s.replace(/\|/g, '/').replace(/\n/g, ' ')

export function triageComment(kind: IssueKind, rows: TriageRow[], extra: Finding[] = []): string {
  const L = [BOT_MARK, '**Triage (SPEC 63 BQ-2).** Nothing is ingested until the owner adds the label `approved`.', '']
  if (kind === 'book' && rows[0]) {
    const r = rows[0]
    L.push(`Status: **${r.status}**; proposed ingest: **${r.mode}**${r.mode === 'vocab-only' ? ' (licence)' : ''}.`, '')
    for (const x of r.findings) L.push(`- ${x.level}: ${x.msg}`)
    if (!r.findings.length) L.push('- no findings')
  } else if (kind === 'list') {
    L.push('| # | title | years | status | ingest | findings |', '|---|---|---|---|---|---|')
    for (const r of rows) L.push(`| ${r.n} | ${cell(r.book.title)} | ${cell(r.book.years)} | ${r.status} | ${r.mode} | ${cell(r.findings.map(x => x.msg).join('; ') || '-')} |`)
    for (const x of extra) L.push('', `${x.level}: ${x.msg}`)
    L.push('', 'Owner: add `approved` for the whole list (clean rows are queued), or reply «approve 1,3,5» / «reject 2 reason» for single rows.')
  } else {
    L.push("Proposal: needs the owner's reading. A word-card correction may become a mismatch-ledger item (MM-n), a spec addition a draft SPEC item; a rule or claim without a citation gets `rejected` or a request for the source.")
    for (const x of extra) L.push(`- ${x.level}: ${x.msg}`)
  }
  L.push('', 'Owner: add the label `approved` to queue it, or `rejected` and a comment giving the reason.')
  return L.join('\n')
}

// ── BQ-3: owner row commands and the approved queue ─────────────────────────────────────────────────
export interface RowCmd { action: 'approve' | 'reject'; rows: number[]; reason: string }
export function parseRowCommands(text: string): RowCmd[] {
  const out: RowCmd[] = []
  for (const line of text.split('\n')) {
    const m = /^\s*(approve|reject)\s+(\d+(?:\s*[-,]\s*\d+)*)(?:\s*[:—-]?\s+(\S.*))?$/i.exec(line.trim())
    if (!m) continue
    const rows: number[] = []
    for (const part of m[2]!.split(',').map(x => x.trim()).filter(Boolean)) {
      const r = /^(\d+)\s*-\s*(\d+)$/.exec(part)
      if (r) for (let i = +r[1]!; i <= Math.min(+r[2]!, +r[1]! + 500); i++) rows.push(i)
      else if (/^\d+$/.test(part)) rows.push(+part)
    }
    if (rows.length) out.push({ action: m[1]!.toLowerCase() as 'approve' | 'reject', rows, reason: (m[3] ?? '').trim() })
  }
  return out
}

export interface RowState { approved: number[]; rejected: Record<string, string> }
export const STATE_RE = /<!-- bq-rows: (\{.*?\}) -->/
export function readState(commentBody: string | undefined): RowState {
  const m = commentBody ? STATE_RE.exec(commentBody) : null
  if (!m) return { approved: [], rejected: {} }
  try { const s = JSON.parse(m[1]!) as Partial<RowState>; return { approved: s.approved ?? [], rejected: s.rejected ?? {} } } catch { return { approved: [], rejected: {} } }
}
export const stateComment = (s: RowState) => `<!-- bq-rows: ${JSON.stringify(s)} -->\nRow decisions (SPEC 63 BQ-3): approved ${s.approved.join(',') || '-'}; rejected ${Object.keys(s.rejected).join(',') || '-'}.`
export function applyRowCommands(s: RowState, cmds: RowCmd[], total: number): { state: RowState; ignored: string[] } {
  const approved = new Set(s.approved), rejected = { ...s.rejected }, ignored: string[] = []
  for (const c of cmds) for (const n of c.rows) {
    if (n < 1 || n > total) ignored.push(`row ${n} does not exist`)
    else if (c.action === 'approve') { approved.add(n); delete rejected[n] }
    else if (!c.reason) ignored.push(`reject ${n}: a reason is required (BQ-4)`)
    else { rejected[n] = c.reason; approved.delete(n) }
  }
  return { state: { approved: [...approved].sort((a, b) => a - b), rejected }, ignored }
}
export const allResolved = (s: RowState, total: number) => s.approved.length + Object.keys(s.rejected).length >= total

export interface QueueItem {
  issue: number; issueUrl: string; row: number; title: string; author: string; years: string; epoch: string; language: string; region: string; school: string
  genre: string; tags: string; links: string[]; licence: string; mode: IngestMode; approvedAt: string
  /** P-1.1: every metadata field above is sourced to this issue. */
  cite: string
}
export function queueItem(issue: number, issueUrl: string, row: number, b: BookFields, now: string): QueueItem {
  return { issue, issueUrl, row, title: b.title, author: b.author, years: b.years, epoch: b.epoch, language: b.language, region: b.region, school: b.school, genre: b.genre, tags: b.tags, links: b.links, licence: [b.licence, b.licenceDetail].filter(Boolean).join('; '), mode: ingestMode(b.licence, b.licenceDetail), approvedAt: now, cite: issueUrl }
}
/** Appends only items whose (issue,row) is not queued yet: idempotent. */
export function appendQueue(existing: string, items: QueueItem[]): { text: string; added: QueueItem[] } {
  const have = new Set(existing.split('\n').filter(Boolean).map(l => { try { const o = JSON.parse(l) as QueueItem; return `${o.issue}#${o.row}` } catch { return '' } }))
  const added = items.filter(i => !have.has(`${i.issue}#${i.row}`))
  const base = existing && !existing.endsWith('\n') ? existing + '\n' : existing
  return { text: base + added.map(i => JSON.stringify(i) + '\n').join(''), added }
}

// ── BQ-4: rejection needs a reason ──────────────────────────────────────────────────────────────────
export interface Cmt { author: string; body: string; at: string; bot?: boolean }
/** The reason is the latest comment by the owner that is not a bot comment; a «reject:» prefix is stripped; under 5 characters is no reason. */
export function rejectionReason(comments: Cmt[], owner: string): string | null {
  for (const c of [...comments].reverse()) {
    if (c.bot || c.author.toLowerCase() !== owner.toLowerCase() || c.body.includes(BOT_MARK)) continue
    const t = c.body.trim().replace(/^reject(ed)?\b\s*[:—-]?\s*/i, '').trim()
    if (t.length >= 5) return t
  }
  return null
}
