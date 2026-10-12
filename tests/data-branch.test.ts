/**
 * SPEC 60 W5 — "Data-branch publish must never force-push": the command sequence of publishWith() (injected git runner).
 */
import { describe, it, expect } from 'vitest'
import { publishWith } from '../pipelines/data-branch.ts'

const O = { remote: 'origin', branch: 'ukr-lexicon-data', data: '/x/public/data', dirs: ['lex', 'texts'] }
function fake(opts: { tip?: string; tipTree?: string; tree?: string }) {
  const calls: string[][] = []
  const run = (args: string[]) => {
    calls.push(args)
    if (args[0] === 'fetch') { if (!opts.tip) throw new Error("couldn't find remote ref"); return '' }
    if (args[0] === 'rev-parse' && args[1] === 'FETCH_HEAD') return opts.tip!
    if (args[0] === 'rev-parse' && args[1]!.endsWith('^{tree}')) return opts.tipTree ?? 'oldtree'
    if (args[0] === 'rev-parse') return 'abc1234'
    if (args.includes('write-tree')) return opts.tree ?? 'newtree'
    if (args[0] === 'commit-tree') return 'newcommit'
    return ''
  }
  return { calls, run }
}

describe('W5 data:publish is a fast-forward, never a force-push', () => {
  it('fetches first, commits on top of the fetched tip (-p), pushes without force', () => {
    const { calls, run } = fake({ tip: 'tip123' })
    expect(publishWith(run, '/tmp/idx', O)).toBe('newcommit')
    const names = calls.map(c => c.find(a => !a.startsWith('--') && !a.includes('/')) ?? c[0])
    expect(calls[0]).toEqual(['fetch', 'origin', 'ukr-lexicon-data'])
    const ct = calls.find(c => c[0] === 'commit-tree')!
    expect(ct.slice(0, 4)).toEqual(['commit-tree', 'newtree', '-p', 'tip123'])
    const push = calls.find(c => c[0] === 'push')!
    expect(push).toEqual(['push', 'origin', 'newcommit:refs/heads/ukr-lexicon-data'])
    expect(calls.indexOf(push)).toBeGreaterThan(calls.indexOf(ct)); expect(names.length).toBeGreaterThan(3)
  })
  it('no force flag and no "+" refspec in any push', () => {
    for (const f of [{ tip: 'tip123' }, {}]) {
      const { calls, run } = fake(f)
      publishWith(run, '/tmp/idx', O)
      for (const p of calls.filter(c => c[0] === 'push')) expect(p.some(a => /^(--force|-f|--force-with-lease.*|\+.*)$/.test(a))).toBe(false)
    }
  })
  it('branch missing on the remote → first commit is a root commit (no -p)', () => {
    const { calls, run } = fake({})
    expect(publishWith(run, '/tmp/idx', O)).toBe('newcommit')
    expect(calls.find(c => c[0] === 'commit-tree')).not.toContain('-p')
  })
  it('unchanged tree → nothing is committed or pushed', () => {
    const { calls, run } = fake({ tip: 'tip123', tipTree: 'same', tree: 'same' })
    expect(publishWith(run, '/tmp/idx', O)).toBeUndefined()
    expect(calls.some(c => c[0] === 'commit-tree' || c[0] === 'push')).toBe(false)
  })
  it('the tree is built from a temp index (work-tree public/data, dirs lex + texts)', () => {
    const { calls, run } = fake({ tip: 't' })
    publishWith(run, '/tmp/idx', O)
    expect(calls.find(c => c.includes('add'))).toEqual(['--work-tree', '/x/public/data', 'add', '--all', '--force', 'lex', 'texts'])
  })
})
