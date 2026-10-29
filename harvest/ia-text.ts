/**
 * SPEC 63 HV-n: shared archive.org helpers for harvest/archive.ts and harvest/linguists.ts.
 * The OCR text file of an item is NOT always `<id>_djvu.txt` (8 672 of 10 000 archive-ukr items were 404 for that reason); its real name is in `https://archive.org/metadata/<id>` files[].
 * Neutral research User-Agent WITHOUT an e-mail address; downloads go through `curl -4` (IPv6 to the item servers dnNNN.*.archive.org hangs); pacing >= 1 s; 403/429 stop, 503 backs off then stops.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { sleep, type Harvest } from './lib.ts'

export const IA_UA = 'BULP-research/1.0 (non-commercial linguistic corpus research; archive.org OCR of public-domain prints)'
export interface IaFile { name: string; size?: string | number; format?: string }

/** the OCR text file of an item from its /metadata `files`: the largest DjVuTXT / `*_djvu.txt` (an item may hold several scans), else the largest plain «Text» `*.txt`, else null (no text file at all) */
export function pickTextFile(files: IaFile[]): string | null {
  const big = (c: IaFile[]) => [...c].sort((a, b) => Number(b.size ?? 0) - Number(a.size ?? 0))[0]?.name ?? null
  const djvu = big(files.filter(f => f.format === 'DjVuTXT' || /_djvu\.txt$/i.test(f.name)))
  if (djvu) return djvu
  return big(files.filter(f => f.format === 'Text' && /\.txt$/i.test(f.name) && !/_meta\.txt$/i.test(f.name)))
}

/** resolve the text file name of an item: {status of /metadata, file or null} */
export async function resolveTextFile(h: Harvest, id: string): Promise<{ status: number; file: string | null }> {
  const meta = await h.get(`https://archive.org/metadata/${encodeURIComponent(id)}`, { headers: { 'user-agent': IA_UA } })
  if (meta.status !== 200) { meta.res.body?.cancel().catch(() => {}); return { status: meta.status, file: null } }
  const j = (await meta.res.json()) as { files?: IaFile[] }
  return { status: 200, file: pickTextFile(j.files ?? []) }
}

/** polite `curl -4` download, >= minDelayMs after the previous call; 403/429 stop; 503 backs off (60 s, 120 s, 240 s) then stops; other failure = status 0 (retried on the next run) */
export async function curlGet(h: Harvest, url: string, minDelayMs = 1500): Promise<{ status: number; buf: Buffer }> {
  const tmp = `${tmpdir()}/ia-${process.pid}.dl`
  try {
    for (let k = 0; ; k++) {
      await sleep(Math.max(minDelayMs, 1000))
      let status = 0
      try {
        const code = execFileSync('curl', ['-4', '-sL', '--max-time', '600', '--retry', '3', '--retry-delay', '20', '-A', IA_UA, '-o', tmp, '-w', '%{http_code}', url], { encoding: 'utf8' }).trim()
        status = Number(code)
      } catch (e) { h.log(`curl failed (${(e as Error).message.slice(0, 100)}) for ${url}; the item is retried on the next run`); return { status: 0, buf: Buffer.alloc(0) } }
      if (status === 403 || status === 429) h.stop(`HTTP ${status} for ${url}`)
      if (status === 503) {
        if (k >= 3) h.stop(`HTTP 503 for ${url} after 3 backoffs`)
        h.log(`HTTP 503 for ${url}; backoff ${60 * 2 ** k} s`); await sleep(60_000 * 2 ** k); continue
      }
      return { status, buf: status === 200 ? readFileSync(tmp) : Buffer.alloc(0) }
    }
  } finally { rmSync(tmp, { force: true }) }
}

/** the latest index line per id (index.jsonl is append-only: a retried item has a later line) */
export function latestById<T extends { id: string }>(lines: string[]): Map<string, T> {
  const m = new Map<string, T>()
  for (const l of lines) { if (!l) continue; try { const it = JSON.parse(l) as T; m.set(it.id, it) } catch { /* torn line */ } }
  return m
}
/** ids to re-visit in «retry 404s» mode: the latest line is status 404 and has not been retried already (`retried404` marks a second 404, so a re-run is idempotent) */
export function retryCandidates(lines: string[]): { id: string; line: Record<string, unknown> }[] {
  const out: { id: string; line: Record<string, unknown> }[] = []
  for (const [id, it] of latestById<{ id: string; status: number; retried404?: boolean }>(lines)) if (it.status === 404 && !it.retried404) out.push({ id, line: it as unknown as Record<string, unknown> })
  return out
}
