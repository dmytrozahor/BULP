/**
 * SPEC 63 RS-2: code fingerprints of the build stages, derived from pipelines/build.ts itself so that no hand-kept file list can go stale.
 *
 * build.ts marks its stages with comment lines:
 *   // #stage <name>   …   // #end        a stage's own code (the argument of cache.run / cache.item)
 *   // #tail           …   // #endtail    (or to the end of the file) output code that runs after the last cached stage: not part of any key
 * Everything else is "glue" (helpers, the statements between stages). A stage is keyed by the glue it can REACH, not by all of it:
 *   · only statements that run before the stage (earlier siblings in every enclosing block) and the top-level declarations of the file (hoisting) are candidates;
 *   · a declaration (const / function / class) counts when the stage, or a statement already counted, mentions a name it declares; any other statement counts when it mentions
 *     a name that is needed (it may mutate it); type-only declarations and imports are erased at run time and never count.
 * Before this was scoped (RS-2 fix, chain10: 0 of 4336 tokenisation entries reused) every stage hashed ALL the glue, so every stage depended on the whole 88-module closure of the build
 * and an edit to the link code invalidated the per-witness tokenisation.
 *
 * fingerprint(stage) = sha256( stage block text, the reachable glue statements, hash of the transitive relative-import closure of every module whose imported name any of them mentions ).
 * Line endings are normalised (core.autocrlf). Import statements are not code; type-only imports (`import type`, inline `type X`) are not dependencies.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import ts from 'typescript'
import type { CodeDetail, CodeIndex } from './stage-cache.ts'
import { SymbolGraph } from './symbol-graph.ts'

const norm = (s: string) => s.replace(/\r\n/g, '\n')
const h = (s: string) => createHash('sha256').update(s).digest('hex')
const IMPORT = /^import\b[\s\S]*?\bfrom\s+'([^']+)'/gm
const IDENT = /[A-Za-z_$][\w$]*/g
const idents = (s: string) => new Set(s.match(IDENT) ?? [])

/** one glue statement: what it declares (declarations only) and the identifiers its text mentions */
export interface Chunk { label: string; text: string; declares?: Set<string>; refs: Set<string> }

export interface ParsedSource {
  blocks: Map<string, string>
  /** all non-tail, non-stage text (kept for tests and tooling) */
  glue: string
  imports: Map<string, string>
  /** IN-6: local name → [module file, imported name | 'default' | '*'] for every runtime import (the symbol-level fingerprint asks for exactly these) */
  importSyms: Map<string, [string, string]>
  /** the glue statements a stage can see (before it, plus the hoisted top level), in source order */
  candidates(stage: string): Chunk[]
}

/** split a build file into stage blocks / glue and map every imported local name to its resolved module file */
export function parseSource(file: string, text = norm(readFileSync(file, 'utf8'))): ParsedSource {
  const blocks = new Map<string, string>(), glue: string[] = [], stageAt = new Map<string, [number, number]>(), tails: [number, number][] = []
  let state: 'glue' | 'tail' | 'stage' = 'glue', back: 'glue' | 'tail' = 'glue', cur = '', buf: string[] = [], off = 0, from = 0
  for (const line of text.split('\n')) {
    const t = line.trim(), start = off; off += line.length + 1
    let m: RegExpMatchArray | null
    if ((m = t.match(/^\/\/ #stage (\S+)\s*$/))) { if (state === 'stage') throw new Error(`${file}: #stage ${m[1]} inside #stage ${cur}`); back = state; state = 'stage'; cur = m[1]!; if (blocks.has(cur)) throw new Error(`${file}: duplicate #stage ${cur}`); buf = []; from = start; continue }
    if (t === '// #end') { if (state !== 'stage') throw new Error(`${file}: #end outside a stage`); blocks.set(cur, buf.join('\n')); stageAt.set(cur, [from, off]); state = back; continue }
    if (t === '// #tail') { if (state === 'stage') throw new Error(`${file}: #tail inside #stage ${cur}`); state = 'tail'; from = start; continue }
    if (t === '// #endtail') { if (state === 'tail') tails.push([from, off]); state = 'glue'; continue }
    if (state === 'stage') buf.push(line); else if (state === 'glue') glue.push(line)
  }
  if (state === 'stage') throw new Error(`${file}: #stage ${cur} is not closed`)
  if (state === 'tail') tails.push([from, text.length + 1])
  const imports = new Map<string, string>(), importSyms = new Map<string, [string, string]>()
  for (const m of text.matchAll(IMPORT)) {
    const spec = m[1]!; if (!spec.startsWith('.')) continue
    const clause = m[0].slice('import'.length, m[0].lastIndexOf('from'))
    if (/^\s*type\b/.test(clause)) continue   // `import type {…}`: erased at run time, no code dependency
    const target = resolve(dirname(file), spec)
    for (const part of clause.replace(/[{}]/g, ',').split(',')) {
      const n = part.trim(); if (!n || /^type\s/.test(n)) continue   // inline `type X`: erased too
      const local = n.includes(' as ') ? n.split(' as ')[1]!.trim() : n.startsWith('* as ') ? n.slice(5).trim() : n
      if (/^[\w$]+$/.test(local)) {
        imports.set(local, target)
        const braced = clause.includes('{') && clause.slice(clause.indexOf('{'), clause.indexOf('}')).includes(n)
        importSyms.set(local, [target, n.startsWith('* as ') ? '*' : !braced ? 'default' : n.includes(' as ') ? n.split(' as ')[0]!.trim() : n])
      }
    }
  }
  const strip = (s: string) => s.replace(IMPORT, '')
  let sf: ts.SourceFile | undefined
  const dropped = [...stageAt.values(), ...tails].sort((a, b) => a[0] - b[0])
  const inDropped = (p: number) => dropped.some(([a, b]) => p >= a && p < b)
  /** the statement's text without stage blocks and tail code that sit inside it */
  const clean = (a: number, b: number) => { let out = '', at = a; for (const [x, y] of dropped) if (y > a && x < b) { out += text.slice(at, Math.max(at, x)); at = Math.max(at, y) } return out + text.slice(at, b) }
  const bind = (n: ts.BindingName, out: string[]) => { if (ts.isIdentifier(n)) out.push(n.text); else for (const e of n.elements) if (ts.isBindingElement(e)) bind(e.name, out) }
  const chunkOf = (s: ts.Statement): Chunk | undefined => {
    if (ts.isImportDeclaration(s) || ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s)) return undefined   // erased at run time
    const a = s.getStart(sf), t = strip(clean(a, s.end)).trim(); if (!t || inDropped(a)) return undefined
    let declares: string[] | undefined
    if (ts.isVariableStatement(s)) { declares = []; for (const d of s.declarationList.declarations) bind(d.name, declares) }
    else if (ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s) || ts.isEnumDeclaration(s)) declares = s.name ? [s.name.text] : []
    return { label: declares?.length ? declares.join(',') : t.replace(/\s+/g, ' ').slice(0, 48), text: t, ...(declares ? { declares: new Set(declares) } : {}), refs: idents(t) }
  }
  const candidates = (stage: string): Chunk[] => {
    const at = stageAt.get(stage); if (!at) throw new Error(`${file}: no "// #stage ${stage}" block`)
    sf ??= ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    const pos = at[0], out: Chunk[] = []
    const add = (s: ts.Statement) => { const c = chunkOf(s); if (c) out.push(c) }
    const inside = (n: ts.Node) => n.getStart(sf) <= pos && pos < n.end
    // statements before the stage in every enclosing block; at the top level also the ones after it (function declarations are hoisted)
    const walk = (stmts: readonly ts.Statement[], top: boolean) => {
      for (const s of stmts) {
        if (s.end <= pos) add(s)
        else if (inside(s)) descend(s)
        else if (top) add(s)
      }
    }
    const descend = (n: ts.Node) => ts.forEachChild(n, ch => {
      if (ch.end <= pos || ch.getStart(sf) > pos) return
      if (ts.isBlock(ch)) walk(ch.statements, false); else descend(ch)
    })
    walk(sf.statements, true)
    return out
  }
  return { blocks: new Map([...blocks].map(([k, v]) => [k, strip(v)])), glue: strip(glue.join('\n')), imports, importSyms, candidates }
}

function readNorm(f: string): string | undefined { return existsSync(f) ? norm(readFileSync(f, 'utf8')) : undefined }
/** every relative module reachable from `entry` through import/export-from (type-only ones excluded), sorted by path, with the hash of its normalised text */
export function importClosure(entries: Iterable<string>, root: string): [string, string][] {
  const seen = new Map<string, string>(), todo = [...entries]
  while (todo.length) {
    const f = todo.pop()!; if (seen.has(f)) continue
    const text = readNorm(f); seen.set(f, text === undefined ? 'absent' : h(text)); if (text === undefined || !f.endsWith('.ts')) continue
    for (const m of text.matchAll(/(?:^|\n)\s*(?:import|export)\b([^;'"]*?)\bfrom\s+['"](\.[^'"]+)['"]/g)) if (!/^\s*type\b/.test(m[1]!)) todo.push(resolve(dirname(f), m[2]!))
    for (const m of text.matchAll(/(?:^|\n)\s*import\s+['"](\.[^'"]+)['"]/g)) todo.push(resolve(dirname(f), m[1]!))
  }
  return [...seen].map(([f, s]) => [relative(root, f).replace(/\\/g, '/'), s] as [string, string]).sort((a, b) => (a[0] < b[0] ? -1 : 1))
}

export class SourceIndex implements CodeIndex {
  private parsed: ParsedSource
  private memo = new Map<string, string>()
  private detailMemo = new Map<string, CodeDetail>()
  constructor(private file: string, private root = dirname(dirname(file))) { this.parsed = parseSource(file) }
  /** compute every fingerprint now (before the read tracker is installed, so the source reads are not recorded as build inputs) */
  warm(): this { for (const s of this.stages()) { this.fingerprint(s); this.detail(s) } return this }
  /** stage names found in the source */
  stages(): string[] { return [...this.parsed.blocks.keys()] }
  /** modules a set of mentioned names refers to through the file's imports */
  modulesOf(names: Iterable<string>): Set<string> {
    const out = new Set<string>()
    for (const n of names) { const m = this.parsed.imports.get(n); if (m) out.add(m) }
    return out
  }
  /** the glue statements a stage reaches (see the header), in source order */
  reach(stage: string): { chunks: Chunk[]; names: Set<string> } {
    const block = this.parsed.blocks.get(stage); if (block === undefined) throw new Error(`${this.file}: no "// #stage ${stage}" block`)
    const cands = this.parsed.candidates(stage), needed = idents(block), inc = new Set<Chunk>()
    for (let grew = true; grew;) {
      grew = false
      for (const c of cands) {
        if (inc.has(c)) continue
        const hit = c.declares ? [...c.declares].some(n => needed.has(n)) : [...c.refs].some(n => needed.has(n))
        if (hit) { inc.add(c); grew = true; for (const r of c.refs) needed.add(r) }
      }
    }
    return { chunks: cands.filter(c => inc.has(c)), names: needed }
  }
  private graph_?: SymbolGraph
  private get graph() { return this.graph_ ??= new SymbolGraph(this.root) }
  /** IN-6: [module, imported name] requests of a set of mentioned names: the declarations they reach are fingerprinted, not whole modules */
  requestsOf(names: Iterable<string>): [string, string][] {
    const out: [string, string][] = []
    for (const n of names) { const s = this.parsed.importSyms.get(n); if (s) out.push(s) }
    return out
  }
  private parts(stage: string) {
    const block = this.parsed.blocks.get(stage)!, { chunks, names } = this.reach(stage)
    return { block, chunks, mods: this.graph.parts(this.requestsOf(names)) }
  }
  /** IN-6: the top-level declarations of each module that a stage's fingerprint covers (tests, tooling) */
  symbols(stage: string): Map<string, Set<string>> { return this.graph.reach(this.requestsOf(this.reach(stage).names)).decls }
  /** modules (relative paths) that make up a stage's fingerprint: closure of what its block and the glue it reaches use */
  files(stage: string): string[] { return this.parts(stage).mods.map(x => x[0]) }
  /** labels of the glue statements in a stage's fingerprint */
  glueOf(stage: string): string[] { return this.reach(stage).chunks.map(c => c.label) }
  fingerprint(stage: string): string {
    let f = this.memo.get(stage); if (f) return f
    const { block, chunks, mods } = this.parts(stage)
    f = h(JSON.stringify([stage, block, chunks.map(c => c.text), mods])); this.memo.set(stage, f); return f
  }
  /** the parts of a fingerprint, so that a later run can say WHICH of them changed */
  detail(stage: string): CodeDetail {
    let d = this.detailMemo.get(stage); if (d) return d   // memoised by warm(): computing it later would read the sources through the read tracker
    const { block, chunks, mods } = this.parts(stage)
    d = { block: h(block), chunks: chunks.map(c => [c.label, h(c.text)] as [string, string]), mods }; this.detailMemo.set(stage, d); return d
  }
}
