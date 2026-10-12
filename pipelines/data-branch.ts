/**
 * SPEC 20 B-5e/B-5f — the detail shards (public/data/lex/, ~59 MB) and the running-text shards (public/data/texts/, ~19 MB) live on the orphan branch
 * `ukr-lexicon-data`, not on the code branch.
 * > B-5e "publish replaces the branch with ONE squashed commit, so history never grows; pull restores the shards."
 * Layout since B-5f: the branch root holds `lex/` and `texts/` (before: lex/'s files directly at the root).
 *   npx tsx pipelines/data-branch.ts publish   → commit lex/ + texts/ to ukr-lexicon-data (temp index, no checkout) and force-push it
 *   npx tsx pipelines/data-branch.ts pull      → fetch ukr-lexicon-data and extract lex/ and texts/ into public/data
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const BRANCH = 'ukr-lexicon-data', REMOTE = process.env.DATA_REMOTE ?? 'origin', DATA = resolve('public/data'), DIRS = ['lex', 'texts']
const git = (args: string[], env: NodeJS.ProcessEnv = {}) => execFileSync('git', args, { encoding: 'utf8', env: { ...process.env, ...env } }).trim()

function publish() {
  const tmp = mkdtempSync(join(tmpdir(), 'ukr-data-')), env = { GIT_INDEX_FILE: join(tmp, 'index') }
  try {
    const present = DIRS.filter(d => existsSync(join(DATA, d)))
    if (present.length < DIRS.length) throw new Error(`missing ${DIRS.filter(d => !present.includes(d)).join(', ')} under public/data (run build:data / data:texts first)`)
    git(['--work-tree', DATA, 'add', '--all', '--force', ...DIRS], env)
    const tree = git(['write-tree'], env), src = git(['rev-parse', '--short', 'HEAD'])
    const commit = git(['commit-tree', tree, '-m', `ukr-lexicon data shards (lex/, texts/) built from ${src} (squashed; SPEC 20 B-5e/f)`])
    git(['push', '--force', REMOTE, `${commit}:refs/heads/${BRANCH}`])
    console.log(`published ${commit} (tree ${tree}) → ${REMOTE}/${BRANCH}`)
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

const cmd = process.argv[2]
if (cmd === 'publish') publish(); else if (cmd === 'pull') pull(); else { console.error('usage: data-branch.ts publish|pull'); process.exit(1) }
