#!/bin/bash
# next.sh: ff, install, ingest (incremental), build --no-cache, then chain.sh (publish) from unlinked; resolves analysis/*.md rebase conflicts with the build's version
NAME=${NEXT_NAME:-next}   # status/log names: ~/logs/$NAME.status|out|run (NEXT_NAME=next5 bash ops/worker/next.sh)
S=~/logs/$NAME.status; L=~/logs/$NAME.out
st() { echo "$(date -Is) $*" > $S; echo "$(date -Is) $*" >> $L; }
fail() { st "FAILED $1"; echo "$(date -Is) BULP $NAME FAILED: $1 (see $L)" >> ~/logs/notify.log; bash ~/BULP/ops/worker/notify.sh "BULP worker: $NAME FAILED: $1 (run $(cat ~/logs/$NAME.run 2>/dev/null))" "$(tail -c 3000 ~/logs/$NAME.out 2>/dev/null; echo; tail -c 1500 ~/logs/runs/$(cat ~/logs/$NAME.run 2>/dev/null)/build.a1.err 2>/dev/null)" >/dev/null 2>&1; exit 1; }
trap 'rm -f ~/.no-idle-stop' EXIT
touch ~/.no-idle-stop
. ~/BULP/ops/worker/env.sh
cd ~/BULP || fail "no ~/BULP"
git checkout -- analysis public/data 2>/dev/null
OLD=$(git rev-parse HEAD)
git fetch -q origin mvp && git merge --ff-only origin/mvp >> $L 2>&1 || fail "git fast-forward"
st "at $(git rev-parse --short HEAD)"
git diff --quiet $OLD HEAD -- package-lock.json || npm ci --no-audit --no-fund >> $L 2>&1 || fail "npm ci"
RUN=$(date -u +%Y%m%dT%H%M%SZ); R=$BULP_LOGS/runs/$RUN; mkdir -p $R/done
echo "$RUN" > ~/logs/$NAME.run
for s in ff; do touch $R/done/$s; done
st "reparse (sum-scan, parse-se-dicts) (run $RUN)"
bash ~/BULP/ops/worker/reparse.sh > $R/reparse.out 2> $R/reparse.err || fail "reparse (see $R/reparse.err)"
touch $R/done/reparse
st "build:data --no-cache (run $RUN)"
echo publish > $R/mode
npm run build:data -- --no-cache > $R/build.a1.out 2> $R/build.a1.err
rc=$?
if [ $rc -ne 0 ]; then
  if grep -qiE 'B-5b|over 262144' $R/build.a1.err $R/build.a1.out; then echo "B-5b shard cap hit: $(grep -hiE 'B-5b|over 262144' $R/build.a1.err $R/build.a1.out | head -2)" >> $S; echo "B-5b shard cap hit (see $R/build.a1.err)" >> ~/logs/notify.log; fi
  fail "build --no-cache rc=$rc (see $R/build.a1.err)"
fi
touch $R/done/build; st "vite build (fresh dist for the budget tests)"; npx vite build >> $R/dist.out 2>&1 || fail "vite build"
st "chain.sh (publish) from unlinked"
bash ops/worker/chain.sh --run $RUN --from unlinked >> $L 2>&1; rc=$?
tries=0
while [ $rc -ne 0 ] && [ $tries -lt 5 ]; do
  tries=$((tries+1))
  if head -1 $BULP_LOGS/runs/$RUN/status | grep -q 'FAILED rebase' && [ -d .git/rebase-merge -o -d .git/rebase-apply ]; then
    bad=$(git diff --name-only --diff-filter=U | grep -vE '^analysis/.*\.md$')
    if [ -n "$bad" ]; then git rebase --abort >> $L 2>&1; fail "rebase conflict outside analysis/*.md, aborted: $(echo $bad | head -c 300)"; fi
    st "resolving analysis/*.md rebase conflicts with the build's version"
    git diff --name-only --diff-filter=U | xargs -r git checkout --theirs -- && git diff --name-only --diff-filter=U | xargs -r git add
    GIT_EDITOR=true git rebase --continue >> $L 2>&1 || { git rebase --abort >> $L 2>&1; fail "rebase --continue failed, aborted"; }
    git stash list | grep -q autostash && { git stash pop >> $L 2>&1 || true; }
    bash ops/worker/chain.sh --run $RUN --from push >> $L 2>&1; rc=$?
  else
    break
  fi
done
[ $rc -eq 0 ] || fail "chain.sh rc=$rc: $(head -1 ~/logs/chain.status)"
st "SUCCESS run $RUN $(head -1 ~/logs/chain.status)"
