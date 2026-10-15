/**
 * SPEC 20 B-5e/B-5f — the detail shards (public/data/lex/, ~59 MB) and the running-text shards (public/data/texts/, ~19 MB) live on the orphan branch
 * `ukr-lexicon-data`, not on the code branch.
 * > B-5e "publish replaces the branch with ONE squashed commit …" — superseded by SPEC 60 W5: "Data-branch publish must never force-push": publish now adds a new commit on top of origin/ukr-lexicon-data and pushes a fast-forward.
 * Layout since B-5f: the branch root holds `lex/` and `texts/` (before: lex/'s files directly at the root).
 *   npx tsx pipelines/data-branch.ts publish   → commit lex/ + texts/ on top of the fetched ukr-lexicon-data tip (temp index, no checkout) and push it (fast-forward)
 *   npx tsx pipelines/data-branch.ts pull      → fetch ukr-lexicon-data and extract lex/ and texts/ into public/data
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const BRANCH = 'ukr-lexicon-data', REMOTE = process.env.DATA_REMOTE ?? 'origin', DATA = resolve('public/data'), DIRS = ['lex', 'texts', 'cv']
const git = (args: string[], env: NodeJS.ProcessEnv = {}) => execFileSync('git', args, { encoding: 'utf8', env: { ...process.env, ...env } }).trim()

type Git = (args: string[], env?: NodeJS.ProcessEnv) => string

/**
 * Non-force publish (SPEC 60 W5: "must never force-push"): fetch the remote branch, build the new tree (a temp index fed from public/data/{lex,texts} —
 * a complete replacement of the tree contents, equivalent to "replace the files in a checkout of the branch"), commit it ON TOP of the fetched tip
 * (`commit-tree -p <tip>`) and push the fast-forward. If the remote branch does not exist yet the first commit is a root commit. An unchanged tree publishes nothing.
 * The sequence is injectable (`run`) so tests can assert that no `--force`/`-f`/`+refspec` is ever used.
 */
export function publishWith(run: Git, indexFile: string, o: { remote: string; branch: string; data: string; dirs: string[] }): string | undefined {
  const env = { GIT_INDEX_FILE: indexFile }
  let tip: string | undefined
  try { run(['fetch', o.remote, o.branch]); tip = run(['rev-parse', 'FETCH_HEAD']) } catch { tip = undefined }   // no remote branch yet → root commit
  run(['--work-tree', o.data, 'add', '--all', '--force', ...o.dirs], env)
  const tree = run(['write-tree'], env), src = run(['rev-parse', '--short', 'HEAD'])
  if (tip && run(['rev-parse', `${tip}^{tree}`]) === tree) return undefined
  const commit = run(['commit-tree', tree, ...(tip ? ['-p', tip] : []), '-m', `ukr-lexicon data shards (lex/, texts/) built from ${src} (W5: fast-forward, no force)`])
  run(['push', o.remote, `${commit}:refs/heads/${o.branch}`])
  return commit
}

function publish() {
  const tmp = mkdtempSync(join(tmpdir(), 'ukr-data-'))
  try {
    const present = DIRS.filter(d => existsSync(join(DATA, d)))
    if (present.length < DIRS.length) throw new Error(`missing ${DIRS.filter(d => !present.includes(d)).join(', ')} under public/data (run build:data / data:texts first)`)
    const commit = publishWith(git, join(tmp, 'index'), { remote: REMOTE, branch: BRANCH, data: DATA, dirs: DIRS })
    console.log(commit ? `published ${commit} → ${REMOTE}/${BRANCH} (fast-forward)` : `${REMOTE}/${BRANCH} already has this tree; nothing to publish`)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
}

function pull() {
  git(['fetch', REMOTE, BRANCH])
  // extract next to the target first, so a failed pull never leaves public/data/{lex,texts} half-deleted
  const tmp = mkdtempSync(join(tmpdir(), 'ukr-data-')), next = `${DATA}/.pull-next`
  rmSync(next, { recursive: true, force: true }); mkdirSync(next, { recursive: true })
  try {
    git(['--work-tree', next, 'read-tree', '--reset', '-u', 'FETCH_HEAD'], { GIT_INDEX_FILE: join(tmp, 'index') })
    if (!existsSync(join(next, 'lex'))) {   // legacy layout (before B-5f): the lex shards sit at the branch root, no texts/ yet
      const legacy = `${DATA}/.pull-legacy`; rmSync(legacy, { recursive: true, force: true }); renameSync(next, legacy); mkdirSync(next); renameSync(legacy, join(next, 'lex'))
      console.warn(`${REMOTE}/${BRANCH} still has the pre-B-5f layout: no texts/ (run data:publish after data:texts)`)
    }
    for (const d of DIRS) if (existsSync(join(next, d))) { rmSync(join(DATA, d), { recursive: true, force: true }); renameSync(join(next, d), join(DATA, d)) }
  } finally { rmSync(tmp, { recursive: true, force: true }); rmSync(next, { recursive: true, force: true }) }
  console.log(`pulled ${REMOTE}/${BRANCH} → ${DATA}/{${DIRS.join(',')}}`)
}

if (process.argv[1]?.endsWith('data-branch.ts')) {
  const cmd = process.argv[2]
  if (cmd === 'publish') publish(); else if (cmd === 'pull') pull(); else { console.error('usage: data-branch.ts publish|pull'); process.exit(1) }
}
