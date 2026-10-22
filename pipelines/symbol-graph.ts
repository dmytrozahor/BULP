/**
 * SPEC 63 IN-6: symbol-level code fingerprints.
 *
 * RS-2 hashed the whole text of every module in the import closure of a stage, so touching one helper in core/ocr-quality.ts changed the key of every stage that imports anything from that
 * file (in practice: all of them, "cache miss archaic: code fingerprint changed"). Here a stage is keyed by the declarations it can actually REACH:
 *   request (module, exported name)  →  the declaration that exports it  →  every identifier its text mentions that is a top-level declaration of the same module (→ recursively) or an import
 *   (→ a request to the module it comes from).
 * Per module the fingerprint is the hash of the reached declarations plus every top-level statement that is not a declaration (they run when the module is loaded and may mutate anything).
 * Conservative on purpose: identifiers are matched by name, so a property called like a declaration counts as a use; `import * as ns`, `export * as ns`, side-effect imports, dynamic `import('./x')`,
 * non-TypeScript files and files that fail to parse are taken WHOLE; type-only imports, interfaces and type aliases are erased at run time and never count (as in RS-2).
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import ts from 'typescript'

const h = (s: string) => createHash('sha256').update(s).digest('hex')
const norm = (s: string) => s.replace(/\r\n/g, '\n')
const IDENT = /[A-Za-z_$][\w$]*/g

interface Stmt { text: string; refs: Set<string> }
interface Mod {
  file: string; text: string
  /** false: not parseable TypeScript / not TypeScript: the whole file is one unit */
  parsed: boolean
  decls: Map<string, Stmt[]>
  top: Stmt[]
  exportsLocal: Map<string, string>
  reexports: Map<string, [string, string]>
  stars: string[]
  imports: Map<string, [string, string]>
  /** modules loaded for their effect or dynamically: taken whole */
  whole: string[]
}

const RESOLVE_EXT = ['', '.ts', '.js']
function resolveSpec(from: string, spec: string): string { const base = resolve(dirname(from), spec); for (const e of RESOLVE_EXT) if (e && existsSync(base + e)) return base + e; return base }

export class SymbolGraph {
  private mods = new Map<string, Mod>()
  constructor(private root: string) {}

  load(file: string): Mod {
    let m = this.mods.get(file); if (m) return m
    const raw = existsSync(file) ? norm(readFileSync(file, 'utf8')) : undefined
    m = { file, text: raw ?? '', parsed: false, decls: new Map(), top: [], exportsLocal: new Map(), reexports: new Map(), stars: [], imports: new Map(), whole: [] }
    this.mods.set(file, m)
    if (raw === undefined || !file.endsWith('.ts')) return m
    const sf = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    const mk = (n: ts.Node): Stmt => { const text = raw.slice(n.getStart(sf), n.end); return { text, refs: new Set(text.match(IDENT) ?? []) } }
    const isRel = (e: ts.Expression | undefined): e is ts.StringLiteral => !!e && ts.isStringLiteral(e) && e.text.startsWith('.')
    const hasMod = (n: ts.Node, k: ts.SyntaxKind) => ts.canHaveModifiers(n) && !!ts.getModifiers(n)?.some(x => x.kind === k)
    const decl = (name: string, s: Stmt, exported: boolean, dflt: boolean) => { (m!.decls.get(name) ?? m!.decls.set(name, []).get(name)!).push(s); if (dflt) m!.exportsLocal.set('default', name); else if (exported) m!.exportsLocal.set(name, name) }
    const bind = (n: ts.BindingName, out: string[]) => { if (ts.isIdentifier(n)) out.push(n.text); else for (const e of n.elements) if (ts.isBindingElement(e)) bind(e.name, out) }
    try {
      for (const st of sf.statements) {
        if (ts.isImportDeclaration(st)) {
          if (!isRel(st.moduleSpecifier)) continue
          const target = resolveSpec(file, st.moduleSpecifier.text), c = st.importClause
          if (!c) { m.whole.push(target); continue }
          if (c.isTypeOnly) continue
          if (c.name) m.imports.set(c.name.text, [target, 'default'])
          const nb = c.namedBindings
          if (nb && ts.isNamespaceImport(nb)) m.imports.set(nb.name.text, [target, '*'])
          else if (nb) for (const e of nb.elements) if (!e.isTypeOnly) m.imports.set(e.name.text, [target, (e.propertyName ?? e.name).text])
        } else if (ts.isExportDeclaration(st)) {
          if (st.isTypeOnly) continue
          if (isRel(st.moduleSpecifier)) {
            const target = resolveSpec(file, st.moduleSpecifier.text), ec = st.exportClause
            if (!ec) m.stars.push(target)
            else if (ts.isNamespaceExport(ec)) m.reexports.set(ec.name.text, [target, '*'])
            else for (const e of ec.elements) if (!e.isTypeOnly) m.reexports.set(e.name.text, [target, (e.propertyName ?? e.name).text])
          } else if (st.exportClause && ts.isNamedExports(st.exportClause)) for (const e of st.exportClause.elements) if (!e.isTypeOnly) m.exportsLocal.set(e.name.text, (e.propertyName ?? e.name).text)
        } else if (ts.isExportAssignment(st)) decl('default', mk(st), false, false), m.exportsLocal.set('default', 'default')
        else if (ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) continue
        else if (ts.isVariableStatement(st)) {
          const names: string[] = []; for (const d of st.declarationList.declarations) bind(d.name, names)
          const s = mk(st); for (const n of names) decl(n, s, hasMod(st, ts.SyntaxKind.ExportKeyword), false)
        } else if (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) {
          if (hasMod(st, ts.SyntaxKind.DeclareKeyword)) continue
          const dflt = hasMod(st, ts.SyntaxKind.DefaultKeyword), name = st.name?.text ?? (dflt ? 'default' : '')
          if (!name) { m.top.push(mk(st)); continue }
          decl(name, mk(st), hasMod(st, ts.SyntaxKind.ExportKeyword), dflt)
        } else m.top.push(mk(st))
      }
      const dyn = (n: ts.Node) => { if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && isRel(n.arguments[0])) m!.whole.push(resolveSpec(file, (n.arguments[0] as ts.StringLiteral).text)); ts.forEachChild(n, dyn) }
      dyn(sf)
      m.parsed = true
    } catch { m.parsed = false }
    return m
  }

  /**
   * Fingerprint parts for the requests [absolute module, exported name | '*'] (the names a stage mentions): one [relative path, hash] per reached module, sorted.
   * `Reach` is explicit so tests can inspect which declarations were taken.
   */
  parts(requests: Iterable<[string, string]>): [string, string][] { return this.reach(requests).hashes }
  reach(requests: Iterable<[string, string]>): { hashes: [string, string][]; decls: Map<string, Set<string>> } {
    const seen = new Set<string>(), inc = new Map<string, Set<Stmt>>(), topDone = new Set<string>(), wholeMods = new Set<string>()
    const incl = (file: string) => inc.get(file) ?? inc.set(file, new Set()).get(file)!
    const todo: [string, string][] = [...requests]
    const useRefs = (m: Mod, refs: Set<string>) => {
      for (const r of refs) {
        if (m.decls.has(r)) { const ss = m.decls.get(r)!; for (const s of ss) if (!incl(m.file).has(s)) { incl(m.file).add(s); useRefs(m, s.refs) } }
        const im = m.imports.get(r); if (im) todo.push(im)
      }
    }
    const touchTop = (m: Mod) => {
      if (topDone.has(m.file)) return; topDone.add(m.file)
      for (const t of m.top) { incl(m.file).add(t); useRefs(m, t.refs) }
      for (const w of m.whole) todo.push([w, '*'])
    }
    while (todo.length) {
      const [file, name] = todo.pop()!, k = file + '#' + name
      if (seen.has(k)) continue; seen.add(k)
      const m = this.load(file)
      if (!m.parsed) { wholeMods.add(file); continue }
      touchTop(m)
      if (name === '*') {
        for (const [n, ss] of m.decls) for (const s of ss) if (!incl(file).has(s)) { incl(file).add(s); useRefs(m, s.refs); void n }
        for (const [, t] of m.reexports) todo.push(t)
        for (const s of m.stars) todo.push([s, '*'])
        continue
      }
      const local = m.exportsLocal.get(name)
      if (local !== undefined) { const ss = m.decls.get(local); if (ss) for (const s of ss) if (!incl(file).has(s)) { incl(file).add(s); useRefs(m, s.refs) }; const im = m.imports.get(local); if (!ss && im) todo.push(im) }
      else if (m.reexports.has(name)) todo.push(m.reexports.get(name)!)
      else for (const s of m.stars) todo.push([s, name])
    }
    const out: [string, string][] = [], decls = new Map<string, Set<string>>()
    for (const f of new Set([...inc.keys(), ...wholeMods])) {
      const rel = relative(this.root, f).replace(/\\/g, '/'), m = this.load(f)
      if (wholeMods.has(f) || !m.parsed) { out.push([rel, m.parsed || existsSync(f) ? h(m.text) : 'absent']); continue }
      const set = inc.get(f)!
      out.push([rel, h(JSON.stringify([...set].sort((a, b) => m.text.indexOf(a.text) - m.text.indexOf(b.text)).map(s => s.text)))])
      decls.set(rel, new Set([...m.decls].filter(([, ss]) => ss.some(s => set.has(s))).map(([n]) => n)))
    }
    out.sort((a, b) => (a[0] < b[0] ? -1 : 1))
    return { hashes: out, decls }
  }
}
