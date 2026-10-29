/** SPEC 63 RS-3: the AWS worker scripts (ops/worker/). They run against a throw-away git origin + clone; processes, GitHub and the CDN are replaced by the documented test hooks. */
import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const posix = (p: string) => p.replace(/\\/g, '/')
const W = posix(resolve('ops/worker'))
const hasBash = spawnSync('bash', ['-c', 'command -v git node >/dev/null']).status === 0
const d = hasBash ? describe : describe.skip

interface Box { root: string; home: string; repo: string; logs: string; runs: string; state: string; sh(cmd: string, env?: Record<string, string>): { rc: number; out: string } }
const git = (cwd: string, ...a: string[]) => { const r = spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...a], { cwd, encoding: 'utf8' }); if (r.status !== 0) throw new Error(a.join(' ') + ': ' + r.stderr); return r.stdout.trim() }
const ok = JSON.stringify({ workflow_runs: [{ name: 'Deploy', status: 'completed', conclusion: 'success' }, { name: 'Other', status: 'completed', conclusion: 'skipped' }] })

function box(): Box {
  const root = posix(mkdtempSync(join(tmpdir(), 'ops-worker-')))
  const home = `${root}/home`, repo = `${root}/BULP`, origin = `${root}/origin.git`, logs = `${home}/logs`, runs = `${root}/runs.json`, state = `${root}/state`
  mkdirSync(home); mkdirSync(`${repo}/src/data`, { recursive: true }); mkdirSync(`${repo}/public/data`, { recursive: true }); mkdirSync(`${repo}/data/work`, { recursive: true })
  git(root, 'init', '-q', '--bare', origin)
  git(repo, 'init', '-q', '-b', 'mvp'); git(repo, 'remote', 'add', 'origin', origin)
  writeFileSync(`${repo}/src/data/data-version.json`, JSON.stringify({ format: 1, buildId: 'B1' })); writeFileSync(`${repo}/public/data/x.json`, '{}'); writeFileSync(`${repo}/.gitignore`, 'data/work\nnode_modules\n')
  git(repo, 'add', '-A'); git(repo, 'commit', '-q', '-m', 'init'); git(repo, 'push', '-q', 'origin', 'mvp'); git(repo, 'fetch', '-q', 'origin')
  writeFileSync(`${repo}/data/work/cdn-upload.json`, JSON.stringify({ buildId: 'B1', startedAt: 'x', done: true })); writeFileSync(runs, ok)
  const base: Record<string, string> = { HOME: home, BULP_REPO: repo, BULP_LOGS: logs, IDLE_STATE: state, IDLE_UPTIME_S: '99999', IDLE_PROCS: 'true', IDLE_SSH_COUNT: '0', IDLE_RUNS_FILE: runs, NOTIFY_OFFLINE: '1' }
  return { root, home, repo, logs, runs, state, sh(cmd, env = {}) { const r = spawnSync('bash', ['-c', cmd], { encoding: 'utf8', env: { ...process.env, ...base, ...env } }); return { rc: r.status ?? -1, out: (r.stdout ?? '') + (r.stderr ?? '') } } }
}

d('RS-3 idle-stop decides from fixtures (DRY=1 never stops or touches the timer)', () => {
  it('RS-3 everything pushed, uploaded and deployed: ALL CLEAR; DRY does not start the timer', () => {
    const b = box(), r = b.sh(`DRY=1 bash ${W}/idle-stop.sh`)
    expect(r.out).toContain('ALL CLEAR'); expect(r.out).toContain('timer would start'); expect(existsSync(b.state)).toBe(false)
  })
  it('RS-3 busy: a work process, an ssh session, a young uptime and the kill switch each hold the machine', () => {
    const b = box()
    expect(b.sh(`DRY=1 bash ${W}/idle-stop.sh`, { IDLE_PROCS: 'echo "4242 npm run build:data"' }).out).toMatch(/BUSY[\s\S]*work processes: 4242 npm run build:data/)
    expect(b.sh(`DRY=1 bash ${W}/idle-stop.sh`, { IDLE_SSH_COUNT: '2' }).out).toContain('ssh sessions: 2')
    expect(b.sh(`DRY=1 bash ${W}/idle-stop.sh`, { IDLE_UPTIME_S: '60' }).out).toContain('uptime 60s < 1800')
    writeFileSync(`${b.home}/.no-idle-stop`, ''); expect(b.sh(`DRY=1 bash ${W}/idle-stop.sh`).out).toContain('kill switch')
  })
  it('RS-3 busy: unpushed commit, unpublished public/data, an unpushed local branch', () => {
    const b = box()
    writeFileSync(`${b.repo}/public/data/x.json`, '{"changed":1}')
    expect(b.sh(`DRY=1 bash ${W}/idle-stop.sh`).out).toContain('unpublished data in')
    git(b.repo, 'commit', '-q', '-am', 'local only')
    const o = b.sh(`DRY=1 bash ${W}/idle-stop.sh`).out
    expect(o).toContain('unpushed commits in worktree'); expect(o).toContain('a local branch')
  })
  it('RS-3 worktrees: a dirty one is busy, a clean pushed one is idle, a stale dirty one only warns', () => {
    const b = box(), wt = `${b.root}/wt-agent`, f = `${wt}/src/data/data-version.json`
    git(b.repo, 'worktree', 'add', '-q', '-b', 'agent', wt, 'origin/mvp')
    git(wt, 'push', '-q', 'origin', 'agent'); git(b.repo, 'fetch', '-q', 'origin')
    expect(b.sh(`DRY=1 bash ${W}/idle-stop.sh`).out).toContain('ALL CLEAR')   // clean and pushed
    writeFileSync(f, JSON.stringify({ format: 1, buildId: 'B1', x: 1 }))
    const busy = b.sh(`DRY=1 bash ${W}/idle-stop.sh`).out
    expect(busy).toContain('BUSY'); expect(busy).toContain(`uncommitted changes in ${wt}`)
    git(wt, 'checkout', 'src/data/data-version.json'); writeFileSync(`${wt}/untracked.txt`, 'x')
    expect(b.sh(`DRY=1 bash ${W}/idle-stop.sh`).out).toContain('ALL CLEAR')   // untracked files do not count
    // an abandoned worktree: last commit older than the max age and the dirty file untouched for days
    const old = '2020-01-01T00:00:00'
    spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', 'commit', '-q', '--allow-empty', '-m', 'old'], { cwd: wt, env: { ...process.env, GIT_COMMITTER_DATE: old, GIT_AUTHOR_DATE: old } })
    git(wt, 'push', '-q', 'origin', 'agent'); git(b.repo, 'fetch', '-q', 'origin')
    writeFileSync(f, JSON.stringify({ format: 1, buildId: 'B1', x: 2 })); spawnSync('touch', ['-d', '2020-01-02', f])
    const s = b.sh(`DRY=1 bash ${W}/idle-stop.sh`).out
    expect(s).toMatch(/WARNING: worktree .*wt-agent is stale/); expect(s).toContain('ALL CLEAR'); expect(s).not.toContain('uncommitted changes in')
  })
  it('RS-3 CDN-aware: a completed upload that is not the live pointer, an upload in progress and an unreadable record all hold the machine', () => {
    const b = box(), cdn = `${b.repo}/data/work/cdn-upload.json`
    writeFileSync(cdn, JSON.stringify({ buildId: 'B2', startedAt: 'x', done: true }))
    expect(b.sh(`DRY=1 bash ${W}/idle-stop.sh`).out).toContain('last uploaded build B2 is not the live pointer B1')
    writeFileSync(cdn, JSON.stringify({ buildId: 'B1', startedAt: 'x' }))
    expect(b.sh(`DRY=1 bash ${W}/idle-stop.sh`).out).toContain('is in progress')
    writeFileSync(cdn, '{broken')
    expect(b.sh(`DRY=1 bash ${W}/idle-stop.sh`).out).toContain('unreadable')
  })
  it('RS-3 Actions runs are parsed as JSON: running, failed and absent runs each hold the machine; a failure is named', () => {
    const b = box(), run = (j: unknown) => { writeFileSync(b.runs, typeof j === 'string' ? j : JSON.stringify(j)); return b.sh(`DRY=1 bash ${W}/idle-stop.sh`).out }
    expect(run({ workflow_runs: [{ name: 'Deploy', status: 'in_progress', conclusion: null }] })).toContain('1 Actions run(s) not completed: Deploy')
    expect(run({ workflow_runs: [{ name: 'Deploy', status: 'completed', conclusion: 'failure' }] })).toContain('FAILED Actions run(s): Deploy (failure)')
    expect(run({ workflow_runs: [] })).toContain('no Actions run yet')
    expect(run('<html>')).toContain('not JSON')
    expect(run({ workflow_runs: [{ name: 'a', status: 'completed', conclusion: 'skipped' }] })).toContain('no Actions run concluded with success')
  })
  it('RS-3 the timer: clear starts it, 30 min later it stops; the recheck right before shutdown cancels the stop when work appeared', () => {
    const b = box()
    expect(b.sh(`bash ${W}/idle-stop.sh`).out).toContain('timer started'); expect(existsSync(b.state)).toBe(true)
    expect(b.sh(`bash ${W}/idle-stop.sh`).out).toMatch(/ALL CLEAR, idle \d+s of 1800s/)
    writeFileSync(b.state, String(Math.floor(Date.now() / 1000) - 2000))
    const stop = b.sh(`bash ${W}/idle-stop.sh`, { IDLE_SHUTDOWN_CMD: 'echo SHUTDOWN-CALLED' })
    expect(stop.out).toContain('SHUTDOWN-CALLED'); expect(existsSync(b.state)).toBe(false)
    expect(readFileSync(`${b.logs}/notify.log`, 'utf8')).toContain('BULP worker stopped')
    // work appears only after the first check: IDLE_PROCS answers "clear" once, then "busy"
    writeFileSync(b.state, String(Math.floor(Date.now() / 1000) - 2000))
    const flag = `${b.home}/seen`
    const re = b.sh(`bash ${W}/idle-stop.sh`, { IDLE_SHUTDOWN_CMD: 'echo SHUTDOWN-CALLED', IDLE_PROCS: `if [ -f ${flag} ]; then echo 77 vite build; else touch ${flag}; fi` })
    expect(re.out).toContain('recheck before shutdown found work'); expect(re.out).not.toContain('SHUTDOWN-CALLED')
  })
})

d('RS-3 chain.sh is resumable, per-run, stops at the first failure', () => {
  function stubs(b: Box) {   // npm/npx stand-ins: log every call, fail the one that matches $STUB_FAIL
    const bin = `${b.home}/bin`; mkdirSync(bin)
    for (const n of ['npm', 'npx']) { writeFileSync(`${bin}/${n}`, `#!/bin/bash\necho "${n} $*" >> ${b.home}/calls.log\nif [ -n "$STUB_FAIL" ] && [[ "$*" == *"$STUB_FAIL"* ]]; then echo "boom $*" >&2; exit 7; fi\nexit 0\n`); chmodSync(`${bin}/${n}`, 0o755) }
    return bin
  }
  it('RS-3 a failing step stops the run with its tails in status; --from resumes the same run without redoing finished steps; outputs are never overwritten', () => {
    const b = box(), bin = stubs(b), env = { PATH: `${bin}:${process.env['PATH']}`, STUB_FAIL: 'vitest' }
    const r1 = b.sh(`bash ${W}/chain.sh --no-publish`, env); expect(r1.rc, r1.out).toBe(7)
    const run = readdirSync(`${b.logs}/runs`)[0]!, R = `${b.logs}/runs/${run}`
    expect(readFileSync(`${R}/status`, 'utf8')).toMatch(/FAILED vitest rc=7[\s\S]*boom/); expect(existsSync(`${R}/done/build`)).toBe(true); expect(existsSync(`${R}/done/vitest`)).toBe(false)
    expect(readFileSync(`${b.logs}/chain.status`, 'utf8')).toContain('FAILED vitest')
    const r2 = b.sh(`bash ${W}/chain.sh --no-publish --from vitest`, { ...env, STUB_FAIL: '' }); expect(r2.rc, r2.out).toBe(0)
    expect(readFileSync(`${R}/status`, 'utf8')).toContain('SUCCESS'); expect(readFileSync(`${R}/status`, 'utf8')).toContain('nothing published')
    expect(readdirSync(R)).toEqual(expect.arrayContaining(['vitest.a1.err', 'vitest.a2.out']))
    const calls = readFileSync(`${b.home}/calls.log`, 'utf8').split('\n')
    expect(calls.filter(c => c.includes('build:data')).length).toBe(1)   // build was not redone
    expect(calls.filter(c => c.includes('vitest')).length).toBe(2)
    expect(calls.some(c => c.includes('data-cdn'))).toBe(false)           // --no-publish never uploads
  })
  it('GG-18 the reparse step reruns sum-scan / parse-se-dicts that build:data does not run: only when the signature changed, never when the scans are absent', () => {
    const b = box(), bin = stubs(b), env = { PATH: `${bin}:${process.env['PATH']}`, BOOKS: `${b.home}/books`, SE_HARVEST: 'data/raw/harvest/se-dicts' }
    for (const f of ['core/sum-article.ts', 'core/sum11-parse.ts', 'core/xref.ts', 'pipelines/sum-scan.ts', 'pipelines/sum-import.ts', 'core/sum-import.ts']) { mkdirSync(dirname(`${b.repo}/${f}`), { recursive: true }); writeFileSync(`${b.repo}/${f}`, 'x') }
    mkdirSync(`${b.home}/books/sum11`, { recursive: true }); writeFileSync(`${b.home}/books/sum11/sum11_t01.djvu`, 'abc')
    mkdirSync(`${b.repo}/data/raw/harvest/se-dicts`, { recursive: true }); writeFileSync(`${b.repo}/data/raw/harvest/se-dicts/index.jsonl`, '')
    const calls = () => (existsSync(`${b.home}/calls.log`) ? readFileSync(`${b.home}/calls.log`, 'utf8') : '')
    expect(b.sh(`bash ${W}/reparse.sh`, env).rc).toBe(0)
    expect(calls()).toContain('sum-scan.ts sum11'); expect(calls()).not.toContain('sum-scan.ts sum20'); expect(calls()).toContain('parse-se-dicts.ts')
    const scans = () => calls().split(String.fromCharCode(10)).filter(c => c.includes('sum-scan.ts')).length
    const n = scans()
    b.sh(`bash ${W}/reparse.sh`, env); expect(scans()).toBe(n)   // marker holds: not rerun
    writeFileSync(`${b.repo}/pipelines/sum-scan.ts`, 'VER 5')   // a parser change (VER bump) changes the signature
    b.sh(`bash ${W}/reparse.sh`, env); expect(scans()).toBe(n + 1)
    // a failing parser fails the step and leaves no marker
    writeFileSync(`${b.repo}/pipelines/sum-scan.ts`, 'VER 6'); expect(b.sh(`bash ${W}/reparse.sh`, { ...env, STUB_FAIL: 'sum-scan' }).rc).not.toBe(0)
    expect(readFileSync(`${W}/chain.sh`, 'utf8')).toContain('STEPS=(ff reparse build ')
  })
  it('RS-3 publish mode: the upload starts a fresh build id (--new); the commit refuses a pointer that is not the last completed upload', () => {
    const b = box(), bin = stubs(b), env = { PATH: `${bin}:${process.env['PATH']}` }
    const r = b.sh(`bash ${W}/chain.sh --from upload`, env)   // no earlier run: starts a new one at upload; B1 is the completed upload and nothing changed, rebase/push go to the local origin
    expect(readFileSync(`${b.home}/calls.log`, 'utf8')).toContain('data-cdn.ts upload --new')
    expect(r.rc, r.out).toBe(0)
    writeFileSync(`${b.repo}/data/work/cdn-upload.json`, JSON.stringify({ buildId: 'B0', startedAt: 'x', done: true }))
    const bad = b.sh(`bash ${W}/chain.sh --from commit`, env); expect(bad.rc).not.toBe(0)
    const run = readdirSync(`${b.logs}/runs`).sort().pop()!
    expect(readFileSync(`${b.logs}/runs/${run}/status`, 'utf8')).toContain('refusing to commit')
  })
})

d('RS-3 the scripts are consistent', () => {
  it('RS-3 every script parses, sources the ONE shared env.sh and sets no heap of its own', () => {
    for (const f of readdirSync('ops/worker').filter(x => x.endsWith('.sh'))) {
      expect(spawnSync('bash', ['-n', `${W}/${f}`]).status, f).toBe(0)
      const t = readFileSync(`ops/worker/${f}`, 'utf8')
      if (f === 'env.sh' || f === 'install-idle-cron.sh') continue
      expect(t, f).toContain('env.sh')
      expect(t.split('\n').filter(l => !l.trim().startsWith('#') && /max-old-space-size/.test(l)), f).toEqual([])
    }
    const env = readFileSync('ops/worker/env.sh', 'utf8')
    for (const k of ['NODE_OPTIONS=', 'UV_BIN', 'TESSDATA_PREFIX', 'BULP_REPO', 'BULP_LOGS']) expect(env).toContain(k)
  })
  it('RS-3 ingest.sh fails the run (named, non-zero) when a source fails; post.sh does not delete the done markers', () => {
    const ing = readFileSync('ops/worker/ingest.sh', 'utf8'), post = readFileSync('ops/worker/post.sh', 'utf8')
    expect(ing).toContain('ingest FAILED'); expect(ing).toMatch(/exit 1/); expect(ing).toContain('failed+=')
    expect(post.split('\n').filter(l => /^\s*rm -f.*done/.test(l))).toEqual([])
  })
})
