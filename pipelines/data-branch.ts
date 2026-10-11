/**
 * SPEC 20 B-5e — the detail shards (public/data/lex/, ~59 MB) live on the orphan branch `ukr-lexicon-data`, not on the code branch.
 * > B-5e "publish replaces the branch with ONE squashed commit (lex/ at its root), so history never grows; pull restores public/data/lex."
 *   npx tsx pipelines/data-branch.ts publish   → commit lex/ to ukr-lexicon-data (temp index, no checkout) and force-push it
 *   npx tsx pipelines/data-branch.ts pull      → fetch ukr-lexicon-data and extract it into public/data/lex
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const BRANCH = 'ukr-lexicon-data', REMOTE = process.env.DATA_REMOTE ?? 'origin', LEX = resolve('public/data/lex')
const git = (args: string[], env: NodeJS.ProcessEnv = {}) => execFileSync('git', args, { encoding: 'utf8', env: { ...process.env, ...env } }).trim()

function publish() {
  const tmp = mkdtempSync(join(tmpdir(), 'ukr-data-')), env = { GIT_INDEX_FILE: join(tmp, 'index') }
  try {
    git(['--work-tree', LEX, 'add', '--all', '.'], env)
    const tree = git(['write-tree'], env), src = git(['rev-parse', '--short', 'HEAD'])
    const commit = git(['commit-tree', tree, '-m', `ukr-lexicon detail shards built from ${src} (squashed; SPEC 20 B-5e)`])
    git(['push', '--force', REMOTE, `${commit}:refs/heads/${BRANCH}`])
    console.log(`published ${commit} (tree ${tree}) → ${REMOTE}/${BRANCH}`)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
}

function pull() {
  git(['fetch', REMOTE, BRANCH])
  // extract next to the target first, so a failed pull never leaves public/data/lex half-deleted
  const tmp = mkdtempSync(join(tmpdir(), 'ukr-data-')), next = `${LEX}.next`
  rmSync(next, { recursive: true, force: true }); mkdirSync(next, { recursive: true })
  try { git(['--work-tree', next, 'read-tree', '--reset', '-u', 'FETCH_HEAD'], { GIT_INDEX_FILE: join(tmp, 'index') }) }
  finally { rmSync(tmp, { recursive: true, force: true }) }
  rmSync(LEX, { recursive: true, force: true }); renameSync(next, LEX)
  console.log(`pulled ${REMOTE}/${BRANCH} → ${LEX}`)
}

const cmd = process.argv[2]
if (cmd === 'publish') publish(); else if (cmd === 'pull') pull(); else { console.error('usage: data-branch.ts publish|pull'); process.exit(1) }
