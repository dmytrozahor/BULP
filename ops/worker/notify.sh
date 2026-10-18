#!/bin/bash
# notify.sh <title> [body]  -- tell the owner. Always appends to $BULP_LOGS/notify.log; then, best effort, opens a GitHub issue in dmytrozahor/BULP
# with the git credential helper's token (no GITHUB_TOKEN variable needed; the worker already pushes with it). A title already notified in the last
# NOTIFY_QUIET_S seconds (default 6 h) is only logged, so a failing cron cannot flood the tracker. NOTIFY_OFFLINE=1 skips the network (tests, dry runs).
. "$(dirname "$(readlink -f "$0")")/env.sh"
title=${1:?title}; body=${2:-}
repo=${NOTIFY_REPO:-dmytrozahor/BULP}; quiet=${NOTIFY_QUIET_S:-21600}
log=$BULP_LOGS/notify.log; stamp=$BULP_LOGS/.notify-$(printf '%s' "$title" | cksum | cut -d' ' -f1)
printf '%s NOTIFY %s\n%s\n' "$(date -Is)" "$title" "$body" >> "$log"
[ "${NOTIFY_OFFLINE:-0}" = 1 ] && exit 0
if [ -f "$stamp" ] && [ $(( $(date +%s) - $(cat "$stamp") )) -lt "$quiet" ]; then echo "$(date -Is) notify: '$title' already sent recently, logged only" >> "$log"; exit 0; fi
tok=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null | sed -n 's/^password=//p')
[ -n "$tok" ] || { echo "$(date -Is) notify: no git credential, logged only (read $log)" >> "$log"; exit 0; }
payload=$(TITLE="$title" BODY="$body" node -e 'console.log(JSON.stringify({title:process.env.TITLE,body:(process.env.BODY||"")+"\n\n(worker "+require("os").hostname()+", "+new Date().toISOString()+")",labels:["worker"]}))')
code=$(curl -sS -o "$BULP_LOGS/.notify-resp" -w '%{http_code}' -X POST -H "Authorization: Bearer $tok" -H 'Accept: application/vnd.github+json' "https://api.github.com/repos/$repo/issues" -d "$payload" 2>>"$log")
if [ "$code" = 201 ]; then date +%s > "$stamp"; echo "$(date -Is) notify: issue created" >> "$log"
else echo "$(date -Is) notify: GitHub answered $code, logged only" >> "$log"; fi
exit 0
