# ops/worker: the AWS build worker's scripts

The worker (`ubuntu@3.67.10.75`, repo `~/BULP`) used to hold its scripts only in its home directory. They live here now (SPEC 63 RS-3) and `install.sh` links them into `~`.
The harvester box (`3.70.112.140`) is a separate instance: nothing here looks at it or stops it.

| script | job |
|---|---|
| `env.sh` | the ONE shared environment, sourced by every script: `NODE_OPTIONS` (48 GB heap, `BULP_HEAP_MB` overrides), `UV_BIN`, `TESSDATA_PREFIX`, `BULP_REPO` (`~/BULP`), `BULP_LOGS` (`~/logs`) |
| `chain.sh` | build and publish: `ff, reparse, build, unlinked, vitest, vuetsc, vitebuild, budget, upload, commit, rebase, push` |
| `reparse.sh` | chain step before the build: reruns the parsers that are not part of `build:data` (sum-scan СУМ-11/20, parse-se-dicts) when their code or inputs changed |
| `ingest.sh` | harvested sources into the corpus; a failed source fails the run (named, non-zero) |
| `post.sh` | after ingest: build, unlinked, tests, budget (no publishing); resumable through `~/logs/done/*` |
| `idle-stop.sh` | cron every 5 min: stops the instance when nothing is left to do (below) |
| `notify.sh` | tells the owner (below) |
| `rs2-warm.sh` | two warm verification builds with `BUILD_CACHE_VERIFY=1`; restores `public/data` afterwards |
| `import-status.sh`, `worker-status.sh` | read-only status |
| `install.sh` | symlinks the scripts into `~` and installs the idle-stop cron line (idempotent). `install-idle-cron.sh` is the old name for `install.sh --cron-only` |

Replaces `chain8/9/10.sh`, `cdn-tail.sh`, `cdn2.sh` (each had its own heap setting and markers; rs2-warm ran with 16 GB and ran out of memory).

## chain.sh

```
bash ~/chain.sh                       # new run, publishes
bash ~/chain.sh --no-publish          # stops after `budget`: nothing uploaded, committed, pushed (verification)
bash ~/chain.sh --from vitest         # resume the LATEST run at that step (earlier steps count as done)
bash ~/chain.sh --run <id> [--from s] # resume a specific run
bash ~/chain.sh --list
```

Each run has `~/logs/runs/<runId>/` with `status`, `steps.log`, `done/<step>` markers and `<step>.a<N>.out|.err|.time` (an attempt counter: nothing is overwritten;
`.time` has the peak memory). The first failing step stops the run, its tails go to `status` (mirrored in `~/logs/chain.status`), the owner is notified and the exit code is the step's.
`ff` never cleans: `public/data`, `data/work`, `data/raw` stay; generated tracked files that block the fast-forward are stashed and restored.
`upload` starts a fresh build id on its first attempt (`--new`) and resumes the half-done upload on retries. `commit` refuses a pointer that is not the last COMPLETED upload in `data/work/cdn-upload.json`.
A `--no-publish` run leaves a modified `public/data`, which keeps idle-stop from stopping the machine until it is published or restored.

## idle-stop.sh

Stops the instance (`shutdown -h +1`, disk kept) only when ALL of this holds for 30 minutes in a row, and rechecks all of it immediately before `shutdown`:

1. no work process (build, ingest, chain, tests, OCR, local harvesters, git, npm, CDN upload);
2. every worktree and every local branch is contained in an `origin` branch; no tracked change under `public/data` or `analysis`;
3. CDN-aware: `data/work/cdn-upload.json` is a completed upload and its `buildId` equals the pointer in `origin/mvp:src/data/data-version.json` (no cdn-upload.json: not idle);
4. the Actions runs of `origin/mvp`'s head are all completed, none failed, at least one succeeded (JSON parsed with node);
5. no SSH session, uptime at least 30 min.

`DRY=1 bash ~/idle-stop.sh` lists every reason it is busy (or says what it would do) and never touches the timer. Kill switch: `touch ~/.no-idle-stop`. Log: `~/logs/idle-stop.log`.

## How the owner learns what happened

`notify.sh` always appends to `~/logs/notify.log` and, when the git credential helper on the worker has a token (it does, the worker pushes with it), opens an issue labelled `worker`
in `dmytrozahor/BULP` (same title at most once per 6 h). It fires when: the chain fails at a step, an ingest source fails, the Actions run for the head failed, and just before the instance is stopped.
GitHub's notification mail is the signal; without a token only the log carries it. After a stop the instance shows as stopped in the EC2 console.

## Install / update

```
git -C ~/BULP fetch && git -C ~/BULP merge --ff-only origin/mvp
bash ~/BULP/ops/worker/install.sh
DRY=1 bash ~/idle-stop.sh
```

Tests: `tests/ops-worker.test.ts` runs idle-stop and chain against a throw-away git origin with stub `npm`/`npx` (needs bash; skipped without it).
