#!/usr/bin/env bash
# SPEC 63 HV-1/RS-1 (bash twin of launch.ps1): start every background harvester detached. Re-running is safe: a live PID is left alone,
# stopped ones resume from their index.jsonl; DONE ones are skipped. Env: HARVEST_NODE, HARVEST_UV. Usage: bash harvest/launch.sh [name ...]
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="$HOME/.local/bin:$PATH"
NODE="${HARVEST_NODE:-$(command -v node)}"
UV="${HARVEST_UV:-$(command -v uv || true)}"
TSX="$ROOT/node_modules/tsx/dist/cli.mjs"
OUT="$ROOT/data/raw/harvest"
mkdir -p "$OUT"
"$NODE" "$TSX" harvest/decisions.ts >/dev/null 2>&1 || true
JOBS=(
  "faust-lukash|node|harvest/faust.ts"
  "hrushevsky|node|harvest/hrushevsky.ts"
  "archive-hrushevsky|node|harvest/archive.ts archive-hrushevsky"
  "wikisource-uk|node|harvest/wiki.ts wikisource-uk"
  "archive-ukr|node|harvest/archive.ts archive-ukr"
  "archive-rusyn|node|harvest/archive.ts archive-rusyn"
  "archive-kuban|node|harvest/archive.ts archive-kuban"
  "archive-novhorod-siversk|node|harvest/archive.ts archive-novhorod-siversk"
  "wikipedia-uk|node|harvest/wiki.ts wikipedia-uk"
  "wikipedia-rue|node|harvest/wiki.ts wikipedia-rue"
  "wiktionary-uk|node|harvest/wiki.ts wiktionary-uk"
  "gramoty|node|harvest/gramoty.ts"
  "poets|node|harvest/poets.ts"
  "r2u|node|harvest/r2u.ts"
  "hv4|node|harvest/hv4.ts"
  "hv5|node|harvest/hv5.ts"
  "archive-hv5-gaps|node|harvest/archive.ts archive-hv5-gaps"
  "archive-ayuzr|node|harvest/archive.ts archive-ayuzr"
  "archive-hv5-authors|node|harvest/archive.ts archive-hv5-authors"
  "hv5-orig|node|harvest/hv5-orig.ts"
  "hplt|uv|run --with pyarrow python -I harvest/hplt.py 1 299"
)
PIDF="$OUT/pids.json"
# pids.json is a flat {"name": pid} map; read it with node, write it atomically (tmp + rename)
pid_of() { [ -f "$PIDF" ] && "$NODE" -e 'try{const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8").replace(/^﻿/,""));if(j[process.argv[2]])console.log(j[process.argv[2]])}catch{}' "$PIDF" "$1"; }
set_pid() { "$NODE" -e 'const fs=require("fs");const f=process.argv[1];let j={};try{j=JSON.parse(fs.readFileSync(f,"utf8").replace(/^﻿/,""))}catch{};j[process.argv[2]]=+process.argv[3];fs.writeFileSync(f+".tmp",JSON.stringify(j,null,2));fs.renameSync(f+".tmp",f)' "$PIDF" "$1" "$2"; }
want() { [ $# -eq 0 ] && return 0; for x in "$@"; do [ "$x" = "$NAME" ] && return 0; done; return 1; }
for job in "${JOBS[@]}"; do
  IFS='|' read -r NAME KIND ARGS <<<"$job"
  want "$@" || continue
  old="$(pid_of "$NAME")"
  if [ -n "$old" ] && kill -0 "$old" 2>/dev/null && tr '\0' ' ' <"/proc/$old/cmdline" 2>/dev/null | grep -q 'harvest/'; then echo "$NAME already running (PID $old)"; continue; fi
  dir="$OUT/$NAME"; mkdir -p "$dir"
  if [ -f "$dir/STOPPED.json" ]; then
    if grep -q '"DONE"' "$dir/STOPPED.json"; then echo "$NAME is DONE"; continue; fi
    # a 403/429 ban is not retried at once (relaunching would hammer the site): wait COOLDOWN_H hours (default 6), then resume; the reason is kept in STOPPED.prev.json
    if grep -Eq 'HTTP (403|429)' "$dir/STOPPED.json"; then
      age=$(( $(date +%s) - $(stat -c %Y "$dir/STOPPED.json" 2>/dev/null || echo 0) ))
      if [ "$age" -lt $(( ${COOLDOWN_H:-6} * 3600 )) ]; then echo "$NAME banned (see STOPPED.json), cooling down, skipped"; continue; fi
    fi
    mv -f "$dir/STOPPED.json" "$dir/STOPPED.prev.json"
  fi
  if [ "$KIND" = uv ]; then
    [ -n "$UV" ] || { echo "$NAME: uv not found, skipped"; continue; }
    # shellcheck disable=SC2086
    nohup setsid "$UV" $ARGS >>"$dir/log.txt" 2>&1 </dev/null &
  else
    # shellcheck disable=SC2086
    nohup setsid "$NODE" "$TSX" $ARGS >>"$dir/log.txt" 2>&1 </dev/null &
  fi
  p=$!
  set_pid "$NAME" "$p"
  echo "$NAME started, PID $p, log $dir/log.txt"
  sleep 2
done
