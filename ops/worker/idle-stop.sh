#!/bin/bash
# BULP worker idle-stop (owner 2026-10-17: stop the machine when it is not in use, after every build and after the site shows it).
# Run by cron every 5 min. The instance is stopped (InstanceInitiatedShutdownBehavior=stop, disk kept) only when ALL of these hold, and held for 30 min in a row:
#   1. no work process: build, ingest, chain, tests, OCR, local harvesters, git push/pull, npm, CDN upload
#   2. every git worktree and local branch is pushed (contained in some origin branch); no tracked uncommitted change in any worktree (data/raw/kaikki/SOURCES.txt, harvest/__pycache__ ignored); no tracked change under public/data or analysis
#      a worktree dirty/unpushed whose last commit and dirty-file mtimes are all older than BULP_WT_MAX_AGE_S (env.sh, default 24 h) is abandoned: warning, does not block
#   3. nothing unpublished on the CDN: data/work/cdn-upload.json is a COMPLETED upload whose buildId is the live pointer in origin/mvp:src/data/data-version.json
#      (the orphan data branch is no longer used)
#   4. the GitHub Actions runs of origin/mvp head have all completed and none failed, at least one succeeded (JSON parsed with node, not grep)
#   5. no SSH session of the owner or an agent, uptime >= 30 min
# After the timer expires every condition is CHECKED AGAIN immediately before `shutdown`; any change aborts the stop.
# It looks only at THIS box. The harvester instance (3.70.112.140) is separate: its processes, disks and git state are deliberately ignored.
# Kill switch: touch ~/.no-idle-stop   |   DRY=1 bash ~/idle-stop.sh: decides and prints, never touches the timer, never stops
# Log: $BULP_LOGS/idle-stop.log (cron appends stdout). Owner notification: notify.sh (GitHub issue, label worker) on stop and on a failed Actions run; see ops/worker/README.md.
# Test hooks (tests/ops-worker.test.ts): IDLE_STATE IDLE_UPTIME_S IDLE_PROCS IDLE_SSH_COUNT IDLE_RUNS_FILE IDLE_NOFETCH IDLE_CDN_FILE IDLE_SHUTDOWN_CMD LIMIT NOTIFY_OFFLINE
here=$(dirname "$(readlink -f "$0")"); . "$here/env.sh"
set -u
STATE=${IDLE_STATE:-$HOME/.idle-since}; LIMIT=${LIMIT:-1800}; REPO_SLUG=${REPO_SLUG:-dmytrozahor/BULP}; DRY=${DRY:-0}
WT_MAX_AGE_S=${BULP_WT_MAX_AGE_S:-86400}
cdn_file=${IDLE_CDN_FILE:-$BULP_REPO/data/work/cdn-upload.json}
now=$(date +%s); ts=$(date -Is)
reasons=(); sha=
r() { reasons+=("$*"); }

procs() {
  if [ -n "${IDLE_PROCS:-}" ]; then eval "$IDLE_PROCS"; return; fi
  local pat='pipelines/|chain\.sh|post\.sh|ingest\.sh|rs2-warm|resume-hplt|vitest|vite build|vue-tsc|tesseract|worker-ocr|pdftoppm|ddjvu|harvest/|hplt\.py|data-cdn|aws s3|git (push|pull|rebase|fetch|commit|clone)|npm (run|exec|ci|install)|tsx '
  pgrep -af "$pat" | grep -v -e idle-stop -e pgrep | grep -v "^$$ "
}
# stdin = GitHub actions/runs JSON; prints "ok" or the reason
actions_verdict() { node -e '
  let t = ""; process.stdin.on("data", d => t += d).on("end", () => {
    let j; try { j = JSON.parse(t) } catch { console.log("Actions answer is not JSON"); return }
    const rs = j.workflow_runs || [], nm = x => x.map(r => r.name || r.id).join(", ")
    if (!rs.length) return console.log("no Actions run yet for the head commit")
    const open = rs.filter(r => r.status !== "completed"); if (open.length) return console.log(open.length + " Actions run(s) not completed: " + nm(open))
    const bad = rs.filter(r => !["success", "skipped", "neutral"].includes(r.conclusion)); if (bad.length) return console.log("FAILED Actions run(s): " + nm(bad) + " (" + bad.map(r => r.conclusion).join(", ") + ")")
    if (!rs.some(r => r.conclusion === "success")) return console.log("no Actions run concluded with success")
    console.log("ok")
  })'; }
cdn_verdict() {   # $1 = live pointer buildId; prints "ok" or the reason
  [ -f "$cdn_file" ] || { echo "no $cdn_file: cannot confirm that the live data is the last upload"; return; }
  node -e '
    const [file, live] = process.argv.slice(1); let s = null; try { s = JSON.parse(require("fs").readFileSync(file, "utf8")) } catch {}
    if (!s) console.log("cdn-upload.json unreadable")
    else if (s.startedAt && !s.done) console.log("CDN upload " + s.buildId + " is in progress (not completed)")
    else if (!s.done) console.log("cdn-upload.json records no completed upload")
    else if (s.buildId !== live) console.log("last uploaded build " + s.buildId + " is not the live pointer " + (live || "(none)") + ": the upload is not published (commit and push the pointer)")
    else console.log("ok")' "$cdn_file" "$1"; }

check() {   # fills `reasons`; re-runnable
  reasons=()
  [ -f ~/.no-idle-stop ] && r "kill switch ~/.no-idle-stop"
  local up=${IDLE_UPTIME_S:-$(cut -d. -f1 /proc/uptime)}; [ "$up" -lt 1800 ] && r "uptime ${up}s < 1800"
  local p; p=$(procs | head -3); [ -n "$p" ] && r "work processes: $(echo "$p" | cut -c1-80 | tr '\n' ';')"
  local s=${IDLE_SSH_COUNT:-$(pgrep -fc 'sshd: ubuntu@' || true)}; [ "${s:-0}" -gt 0 ] && r "ssh sessions: $s"
  cd "$BULP_REPO" 2>/dev/null || { r "no repo $BULP_REPO"; return; }
  if [ "${IDLE_NOFETCH:-0}" != 1 ]; then git fetch -q origin 2>/dev/null || { r "git fetch failed"; return; }; fi
  git rev-parse -q --verify origin/mvp >/dev/null || { r "no origin/mvp"; return; }
  sha=$(git rev-parse origin/mvp)
  local wt h d b dirty n t newest age stale stale_tips=" "
  while read -r wt; do
    h=$(git -C "$wt" rev-parse HEAD 2>/dev/null) || continue
    # tracked uncommitted changes (an agent is mid-work); untracked files and the known-ignorable paths do not count
    dirty=$(git -C "$wt" status --porcelain --untracked-files=no -- . ':!data/raw/kaikki/SOURCES.txt' ':!harvest/__pycache__' 2>/dev/null)
    newest=$(git -C "$wt" log -1 --format=%ct 2>/dev/null); newest=${newest:-0}
    if [ -n "$dirty" ]; then   # activity = newest mtime of the dirty files (or the last commit)
      while read -r n; do t=$(stat -c %Y "$wt/$n" 2>/dev/null) && [ "$t" -gt "$newest" ] && newest=$t; done < <(printf '%s\n' "$dirty" | cut -c4-)
    fi
    age=$((now - newest)); stale=0; [ "$age" -gt "$WT_MAX_AGE_S" ] && stale=1
    if [ -n "$dirty" ] || [ -z "$(git branch -r --contains "$h" 2>/dev/null)" ]; then
      if [ "$stale" = 1 ]; then
        echo "WARNING: worktree $wt is stale (${age}s > ${WT_MAX_AGE_S}s) with $([ -n "$dirty" ] && echo 'uncommitted changes' || echo 'unpushed commits'): not blocking the stop" >&2
        stale_tips+="$h "; continue
      fi
    fi
    [ -n "$dirty" ] && r "uncommitted changes in $wt"
    [ -n "$(git branch -r --contains "$h" 2>/dev/null)" ] || r "unpushed commits in worktree $wt"
    d=$(git -C "$wt" status --porcelain -- public/data analysis 2>/dev/null | head -1); [ -n "$d" ] && r "unpublished data in $wt: $d"
  done < <(git worktree list --porcelain | sed -n 's/^worktree //p')
  while read -r b; do
    case "$stale_tips" in *" $b "*) continue ;; esac
    [ -n "$(git branch -r --contains "$b" 2>/dev/null)" ] || r "a local branch (tip ${b:0:8}) is not pushed"
  done < <(git for-each-ref --format='%(objectname)' refs/heads)
  local live; live=$(git show origin/mvp:src/data/data-version.json 2>/dev/null | node -e 'let t="";process.stdin.on("data",d=>t+=d).on("end",()=>{try{console.log(JSON.parse(t).buildId||"")}catch{console.log("")}})')
  local c; c=$(cdn_verdict "$live"); [ "$c" != ok ] && r "$c"
  local runs v
  if [ -n "${IDLE_RUNS_FILE:-}" ]; then runs=$(cat "$IDLE_RUNS_FILE" 2>/dev/null) || { r "cannot read $IDLE_RUNS_FILE"; return; }
  else
    local tok; tok=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null | sed -n 's/^password=//p')
    runs=$(curl -fsS ${tok:+-H "Authorization: Bearer $tok"} -H 'Accept: application/vnd.github+json' "https://api.github.com/repos/$REPO_SLUG/actions/runs?head_sha=$sha&per_page=50" 2>/dev/null) || { r "GitHub API failed"; return; }
  fi
  v=$(printf '%s' "$runs" | actions_verdict); [ "$v" != ok ] && r "$v for ${sha:0:8}"
  return 0
}

check
if [ ${#reasons[@]} -gt 0 ]; then
  [ "$DRY" = 1 ] || rm -f "$STATE"
  printf '%s BUSY (%s):\n' "$ts" "${#reasons[@]}"; printf '  - %s\n' "${reasons[@]}"
  case "${reasons[*]}" in *"FAILED Actions"*) NOTIFY_QUIET_S=86400 bash "$here/notify.sh" "BULP: GitHub Actions failed for mvp ${sha:0:8}" "The site does not show the latest build. ${reasons[*]}" >/dev/null 2>&1 ;; esac
  exit 0
fi
if [ ! -f "$STATE" ]; then
  if [ "$DRY" = 1 ]; then echo "$ts ALL CLEAR (head ${sha:0:8}); DRY: the timer would start now"; else echo "$now" > "$STATE"; echo "$ts idle: timer started (head ${sha:0:8})"; fi
  exit 0
fi
since=$(cat "$STATE"); idle=$((now - since))
if [ "$idle" -lt "$LIMIT" ]; then echo "$ts ALL CLEAR, idle ${idle}s of ${LIMIT}s"; exit 0; fi
# the timer ran out: recheck EVERYTHING right now, then stop
check
if [ ${#reasons[@]} -gt 0 ]; then
  [ "$DRY" = 1 ] || rm -f "$STATE"
  printf '%s recheck before shutdown found work, NOT stopping:\n' "$ts"; printf '  - %s\n' "${reasons[@]}"; exit 0
fi
echo "$ts IDLE ${idle}s: everything pushed, uploaded and deployed (${sha:0:8}) -> stopping the instance"
if [ "$DRY" = 1 ]; then echo "$ts DRY: would stop the instance now"; exit 0; fi
rm -f "$STATE"
bash "$here/notify.sh" "BULP worker stopped (idle ${idle}s)" "Head ${sha:0:8}; pushed, uploaded and deployed. Start the instance again from the AWS console or CLI when you need it." >/dev/null 2>&1
${IDLE_SHUTDOWN_CMD:-sudo shutdown -h +1} "BULP idle-stop: idle ${idle}s"
