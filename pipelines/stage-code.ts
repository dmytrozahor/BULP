/**
 * SPEC 63 RS-2: code fingerprints of the build stages, derived from pipelines/build.ts itself so that no hand-kept file list can go stale.
 *
 * build.ts marks its stages with comment lines:
 *   // #stage <name>   …   // #end        a stage's own code (the argument of cache.run / cache.item)
 *   // #tail           …   // #endtail    (or to the end of the file) output code that runs after the last cached stage: not part of any key
 * Everything else (the "glue": helpers, the lines between stages) feeds every stage, so it is part of every fingerprint.
 *
 * fingerprint(stage) = sha256( stage block text, glue text, hash of the transitive relative-import closure of every module whose imported name the block or the glue mentions ).
 * Line endings are normalised (core.autocrlf), the import statements themselves are not code.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import type { CodeIndex } from './stage-cache.ts'

const norm = (s: string) => s.replace(/\r\n/g, '\n')
const h = (s: string) => createHash('sha256').update(s).digest('hex')
const IMPORT = /^import\b[\s\S]*?\bfrom\s+'([^']+)'/gm

export interface ParsedSource { blocks: Map<string, string>; glue: string; imports: Map<string, string> }

/** split a build file into stage blocks / glue and map every imported local name to its resolved module file */
export function parseSource(file: string, text = norm(readFileSync(file, 'utf8'))): ParsedSource {
  const blocks = new Map<string, string>(), glue: string[] = []
  let state: 'glue' | 'tail' | 'stage' = 'glue', back: 'glue' | 'tail' = 'glue', cur = '', buf: string[] = []
  for (const line of text.split('\n')) {
    const t = line.trim()
    let m: RegExpMatchArray | null
    if ((m = t.match(/^\/\/ #stage (\S+)\s*$/))) { if (state === 'stage') throw new Error(`${file}: #stage ${m[1]} inside #stage ${cur}`); back = state; state = 'stage'; cur = m[1]!; if (blocks.has(cur)) throw new Error(`${file}: duplicate #stage ${cur}`); buf = []; continue }
    if (t === '// #end') { if (state !== 'stage') throw new Error(`${file}: #end outside a stage`); blocks.set(cur, buf.join('\n')); state = back; continue }
    if (t === '// #tail') { if (state === 'stage') throw new Error(`${file}: #tail inside #stage ${cur}`); state = 'tail'; continue }
    if (t === '// #endtail') { state = 'glue'; continue }
    if (state === 'stage') buf.push(line); else if (state === 'glue') glue.push(line)
  }
  if (state === 'stage') throw new Error(`${file}: #stage ${cur} is not closed`)
  const imports = new Map<string, string>()
  for (const m of text.matchAll(IMPORT)) {
    const spec = m[1]!; if (!spec.startsWith('.')) continue
    const clause = m[0].slice('import'.length, m[0].lastIndexOf('from')).replace(/^\s*type\s+/, '')
    const target = resolve(dirname(file), spec)
    for (const part of clause.replace(/[{}]/g, ',').split(',')) {
      const n = part.trim().replace(/^type\s+/, ''); if (!n) continue
      const local = n.includes(' as ') ? n.split(' as ')[1]!.trim() : n.startsWith('* as ') ? n.slice(5).trim() : n
      if (/^[\w$]+$/.test(local)) imports.set(local, target)
    }
  }
  const strip = (s: string) => s.replace(IMPORT, '')
  return { blocks: new Map([...blocks].map(([k, v]) => [k, strip(v)])), glue: strip(glue.join('\n')), imports }
}

function readNorm(f: string): string | undefined { return existsSync(f) ? norm(readFileSync(f, 'utf8')) : undefined }
/** every relative module reachable from `entry` through import/export-from, sorted by path, with the hash of its normalised text */
export function importClosure(entries: Iterable<string>, root: string): [string, string][] {
  const seen = new Map<string, string>(), todo = [...entries]
  while (todo.length) {
    const f = todo.pop()!; if (seen.has(f)) continue
    const text = readNorm(f); seen.set(f, text === undefined ? 'absent' : h(text)); if (text === undefined || !f.endsWith('.ts')) continue
    for (const m of text.matchAll(/(?:^|\n)\s*(?:import|export)\b[^;'"]*?\bfrom\s+['"](\.[^'"]+)['"]/g)) todo.push(resolve(dirname(f), m[1]!))
    for (const m of text.matchAll(/(?:^|\n)\s*import\s+['"](\.[^'"]+)['"]/g)) todo.push(resolve(dirname(f), m[1]!))
  }
  return [...seen].map(([f, s]) => [relative(root, f).replace(/\\/g, '/'), s] as [string, string]).sort((a, b) => (a[0] < b[0] ? -1 : 1))
}

const esc = (s: string) => s.replace(/[$]/g, '\\$')
export class SourceIndex implements CodeIndex {
  private parsed: ParsedSource
  private memo = new Map<string, string>()
  constructor(private file: string, private root = dirname(dirname(file))) { this.parsed = parseSource(file) }
  /** compute every fingerprint now (before the read tracker is installed, so the source reads are not recorded as build inputs) */
  warm(): this { for (const s of this.stages()) this.fingerprint(s); return this }
  /** stage names found in the source */
  stages(): string[] { return [...this.parsed.blocks.keys()] }
  /** modules a piece of text refers to through its imported names */
  modulesOf(text: string): Set<string> {
    const out = new Set<string>()
    for (const [name, mod] of this.parsed.imports) if (new RegExp(`(?<![\\w$])${esc(name)}(?![\\w$])`).test(text)) out.add(mod)
    return out
  }
  /** modules (relative paths) that make up a stage's fingerprint: closure of what its block and the glue use */
  files(stage: string): string[] {
    const block = this.parsed.blocks.get(stage); if (block === undefined) throw new Error(`${this.file}: no "// #stage ${stage}" block`)
    return importClosure(new Set([...this.modulesOf(block), ...this.modulesOf(this.parsed.glue)]), this.root).map(x => x[0])
  }
  fingerprint(stage: string): string {
    let f = this.memo.get(stage); if (f) return f
    const block = this.parsed.blocks.get(stage); if (block === undefined) throw new Error(`${this.file}: no "// #stage ${stage}" block`)
    const mods = importClosure(new Set([...this.modulesOf(block), ...this.modulesOf(this.parsed.glue)]), this.root)
    f = h(JSON.stringify([stage, block, this.parsed.glue, mods])); this.memo.set(stage, f); return f
  }
}
