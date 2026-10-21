#!/bin/bash
# chain.sh -- ONE generic, resumable build-and-publish chain (replaces chain8/9/10, cdn-tail, cdn2).
#
#   ff -> build -> unlinked -> vitest -> vuetsc -> vitebuild -> budget -> upload -> commit -> rebase -> push
#
#   bash chain.sh                      new run (run id = UTC timestamp), publishes
#   bash chain.sh --no-publish         same, but stops after `budget`: nothing uploaded, committed or pushed (verification run)
#   bash chain.sh --from <step>        resume the LATEST run at <step> (steps before it count as done; markers from <step> on are cleared)
#   bash chain.sh --run <id> [--from s] resume a specific run; without --from it continues after the last step that has a marker
#   bash chain.sh --list               steps, then the runs
#
# Per run: $BULP_LOGS/runs/<runId>/{status, steps.log, done/<step>, <step>.a<N>.out|.err|.time}. Output files are NEVER overwritten (attempt counter N).
# Stops at the first failing step: status says FAILED + tails, notify.sh tells the owner, exit code = the step's. $BULP_LOGS/chain.status mirrors the latest status.
# Keeps public/data, data/work and data/raw: ff never cleans; if local generated changes block the fast-forward they are stashed and restored.
# The upload step starts a FRESH build id on its first attempt in a run (--new) and RESUMES the in-progress upload on retries (data/work/cdn-upload.json).
STEPS=(ff build unlinked vitest vuetsc vitebuild budget upload commit rebase push)
PUBLISH_STEPS=" upload commit rebase push "
here=$(dirname "$(readlink -f "$0")"); . "$here/env.sh"
publish=1; from=; run=
while [ $# -gt 0 ]; do case $1 in
  --no-publish) publish=0 ;;
  --from) from=${2:?--from needs a step}; shift ;;
  --run) run=${2:?--run needs an id}; shift ;;
  --list) echo "steps: ${STEPS[*]}"; ls -1 "$BULP_LOGS/runs" 2>/dev/null; exit 0 ;;
  *) echo "unknown argument $1 (see the header of chain.sh)" >&2; exit 2 ;;
esac; shift; done
in_steps() { local s; for s in "${STEPS[@]}"; do [ "$s" = "$1" ] && return 0; done; return 1; }
[ -z "$from" ] || in_steps "$from" || { echo "unknown step '$from' (steps: ${STEPS[*]})" >&2; exit 2; }
cd "$BULP_REPO" || { echo "no $BULP_REPO" >&2; exit 1; }
if command -v flock >/dev/null; then exec 9>"$BULP_LOGS/chain.lock"; flock -n 9 || { echo "another chain.sh is running (lock $BULP_LOGS/chain.lock)" >&2; exit 3; }; fi

if [ -z "$run" ]; then
  if [ -n "$from" ]; then run=$(ls -1 "$BULP_LOGS/runs" 2>/dev/null | sort | tail -1); fi
  [ -n "$run" ] || run=$(date -u +%Y%m%dT%H%M%SZ)
fi
R=$BULP_LOGS/runs/$run; M=$R/done; S=$R/status; mkdir -p "$M"
echo $([ $publish = 1 ] && echo publish || echo no-publish) > "$R/mode"
status() { echo "$*" > "$S"; cp "$S" "$BULP_LOGS/chain.status" 2>/dev/null; }
log() { echo "$(date -Is) $*" | tee -a "$R/steps.log"; }

if [ -n "$from" ]; then   # steps before --from count as done, steps from it on are redone
  seen=0; for s in "${STEPS[@]}"; do [ "$s" = "$from" ] && seen=1; if [ $seen = 1 ]; then rm -f "$M/$s"; else touch "$M/$s"; fi; done
fi

pointer_id() { node -e "console.log(JSON.parse(require('fs').readFileSync('src/data/data-version.json','utf8')).buildId||'')"; }
st_ff() {
  git fetch origin mvp || return 1
  git merge --ff-only origin/mvp && return 0
  echo "fast-forward blocked by local changes: stashing tracked generated files only (untracked and ignored data stay)"
  git stash push -q -m "chain-$run" -- public/data analysis src/data || return 1
  git merge --ff-only origin/mvp || { echo "ff still fails; your changes are in the stash 'chain-$run'"; return 1; }
  local ref; ref=$(git stash list | sed -n "s/^\(stash@{[0-9]*}\): .*chain-$run\$/\1/p" | head -1)
  [ -z "$ref" ] || git stash pop -q "$ref" || { echo "stash pop conflicted; the changes stay in the stash 'chain-$run'"; return 1; }
}
st_build() { npm run build:data; }
st_unlinked() { npm run data:unlinked; }
st_vitest() { npx vitest run --maxWorkers="${VITEST_WORKERS:-16}"; }
st_vuetsc() { npx vue-tsc --noEmit; }
st_vitebuild() { npx vite build; }
st_budget() { npx tsx pipelines/budget.ts dist; }
st_upload() { if [ "$ATTEMPT" = 1 ]; then npx tsx pipelines/data-cdn.ts upload --new; else npx tsx pipelines/data-cdn.ts upload; fi; }
st_commit() {
  local id up; id=$(pointer_id); [ -n "$id" ] || { echo "pointer has no buildId"; return 1; }
  up=$(node -e "const s=JSON.parse(require('fs').readFileSync('data/work/cdn-upload.json','utf8'));console.log(s.done?s.buildId:'')" 2>/dev/null)
  [ "$up" = "$id" ] || { echo "pointer $id is not the last COMPLETED upload ('$up'): refusing to commit"; return 1; }
  git add public/data analysis src/data/data-version.json
  git diff --cached --quiet && { echo "nothing to commit"; return 0; }
  git commit -q -m "ukr-lexicon: data build $id uploaded (verified), pointer src/data/data-version.json switched (worker run $run)"
}
st_rebase() { git pull --rebase --autostash origin mvp; }
st_push() { git push origin HEAD:mvp; }

export -f pointer_id st_ff st_build st_unlinked st_vitest st_vuetsc st_vitebuild st_budget st_upload st_commit st_rebase st_push
export run publish BULP_REPO BULP_LOGS
t_start=$(date +%s)
for s in "${STEPS[@]}"; do
  [ $publish = 0 ] && [[ "$PUBLISH_STEPS" == *" $s "* ]] && { log "skip $s (--no-publish)"; continue; }
  [ -f "$M/$s" ] && { log "skip $s (done in this run)"; continue; }
  n=1; while [ -e "$R/$s.a$n.out" ]; do n=$((n+1)); done; export ATTEMPT=$n
  status "RUNNING $s (attempt $n) since $(date +%T), run $run"
  t0=$(date +%s)
  if [ -x /usr/bin/time ]; then /usr/bin/time -v -o "$R/$s.a$n.time" bash -c "st_$s" > "$R/$s.a$n.out" 2> "$R/$s.a$n.err"; rc=$?
  else bash -c "st_$s" > "$R/$s.a$n.out" 2> "$R/$s.a$n.err"; rc=$?; fi
  peak=$(awk '/Maximum resident/ {print $NF}' "$R/$s.a$n.time" 2>/dev/null)
  log "$s attempt=$n rc=$rc secs=$(( $(date +%s) - t0 )) peakKB=${peak:-?}"
  if [ $rc -ne 0 ]; then
    { echo "FAILED $s rc=$rc attempt=$n run=$run $(date +%T)"; echo "resume: bash chain.sh --run $run --from $s"; echo "--- stdout tail"; tail -n 25 "$R/$s.a$n.out"; echo "--- stderr tail"; tail -n 30 "$R/$s.a$n.err"; } > "$S"
    cp "$S" "$BULP_LOGS/chain.status"
    bash "$here/notify.sh" "BULP worker: build chain FAILED at $s (run $run)" "$(head -c 3500 "$S")" >/dev/null 2>&1
    exit $rc
  fi
  touch "$M/$s"
done
# a published run must leave no tracked change (idle-stop treats a dirty tree as work): commit covers public/data, analysis, src/data; anything else regenerated is reported here
if [ $publish = 1 ]; then dirt=$(git status --porcelain --untracked-files=no | head -5 | tr '
' ' '); [ -z "$dirt" ] || log "WARNING tracked tree not clean after publish: $dirt"; fi
status "SUCCESS run $run $([ $publish = 1 ] && echo published || echo '(verification only, nothing published)') $(date +%T) head=$(git rev-parse --short HEAD) build=$(pointer_id) secs=$(( $(date +%s) - t_start ))"
