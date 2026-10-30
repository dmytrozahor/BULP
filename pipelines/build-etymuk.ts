/**
 * BUILD step SPEC 63 GG-11 (open-source part): etymologies from the «Етимологія» sections of uk.wiktionary → data/work/etymology-ukwikt.json ({ lemma: UkEtym }, not committed;
 * writeEtymology merges it into public/data/etymology.json, build-parts shards that into lm/etymology/). Source: the official dump (data/raw/ukwikt-dump/, SOURCES.txt), CC BY-SA 4.0.
 * One streaming pass collects the Ukrainian «Етимологія» sections and the template pages (ns 10: «Шаблон:етимологія:<слово>», «Шаблон:lang-xx» …, which hold the article text and the
 * language labels); the sections are expanded after the pass. Crash tolerance (SPEC 63 RS-1): the result is cached by the input's size, written atomically; a rerun reuses it.
 */
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { basename, resolve } from 'node:path'
import { etymSections, ukEtymOf, type UkCount, type UkEtym } from '../core/etymuk.ts'
import { dumpFile, xmlRecords } from './build-synphr.ts'
import { readJson, writeJsonAtomic } from './robust.ts'

export interface UkEtymStage { v: 1; bytes: number; dump: string; date: string; counts: UkCount; templates: number; entries: Record<string, UkEtym> }
const TPL_PREFIX = 'Шаблон:'

export async function stageUkEtym(file: string): Promise<UkEtymStage> {
  const child = file.endsWith('.bz2') ? spawn('bzip2', ['-dc', file], { stdio: ['ignore', 'pipe', 'inherit'] }) : undefined
  const input = child ? child.stdout : createReadStream(file, { encoding: 'utf8' })
  const tpl = new Map<string, string>(), pages: { title: string; sections: string[]; rev?: number; ts?: string }[] = []
  for await (const r of xmlRecords(input)) {
    if (r.redirect) continue
    if (r.ns === '10') {
      const n = r.title.slice(TPL_PREFIX.length)
      if (/^(?:етимологія|lang)/i.test(n) || n === 'праслов' || r.text.length <= 200) tpl.set(n, r.text)
    } else if (r.ns === '0' && r.text.includes('тимологія')) {
      const sections = etymSections(r.text)
      if (sections.length) pages.push({ title: r.title, sections, rev: r.rev, ts: r.ts })
    }
  }
  if (child) await new Promise<void>((res, rej) => child.on('close', c => (c === 0 || c === null ? res() : rej(new Error(`bzip2 exited ${c}`)))))
  const look = (n: string) => tpl.get(n) ?? tpl.get(n.charAt(0).toUpperCase() + n.slice(1)) ?? tpl.get(n.charAt(0).toLowerCase() + n.slice(1))
  const counts: UkCount = { pages: 0, sections: 0, ok: 0, empty: 0, stub: 0, pointer: 0 }, entries: Record<string, UkEtym> = {}
  for (const p of pages) { const e = ukEtymOf(p.sections, look, { rev: p.rev, ts: p.ts }, counts); if (e) entries[p.title] = e }
  const m = /(\d{8})/.exec(basename(file))
  return { v: 1, bytes: statSync(file).size, dump: basename(file), date: m ? `${m[1]!.slice(0, 4)}-${m[1]!.slice(4, 6)}-${m[1]!.slice(6)}` : '', counts, templates: tpl.size, entries }
}

/** the whole step; `raw` = root of data/raw (input), `work` = root of data/work (cache + output). Absent dump → undefined (the card simply has no uk.wiktionary block). */
export async function writeUkEtym(raw: string, work: string): Promise<UkEtymStage | undefined> {
  const dump = dumpFile(raw); if (!dump) return undefined
  mkdirSync(resolve(work, 'data/work'), { recursive: true })
  const out = resolve(work, 'data/work/etymology-ukwikt.json')
  let s: UkEtymStage | undefined
  if (existsSync(out)) { try { const c = readJson<UkEtymStage>(out); if (c.v === 1 && c.bytes === statSync(dump).size) s = c } catch { /* torn: rebuilt */ } }
  if (!s) { s = await stageUkEtym(dump); writeJsonAtomic(out, JSON.stringify(s)) }
  return s
}
