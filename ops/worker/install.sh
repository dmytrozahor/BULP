#!/bin/bash
# Install the worker scripts: symlink them into ~ (so ~/idle-stop.sh etc. keep working and always run the repo's version) and install the idle-stop
# cron line idempotently. Safe to rerun. --cron-only skips the links. A real file already at a target is moved to <name>.bak-<time>, never overwritten.
here=$(dirname "$(readlink -f "$0")"); . "$here/env.sh"
mode=${1:-all}
if [ "$mode" != --cron-only ]; then
  for f in env.sh notify.sh chain.sh post.sh ingest.sh idle-stop.sh import-status.sh worker-status.sh rs2-warm.sh install.sh; do
    t=$HOME/$f
    if [ -L "$t" ]; then ln -sfn "$here/$f" "$t"
    else [ -e "$t" ] && mv "$t" "$t.bak-$(date +%Y%m%d%H%M%S)"; ln -s "$here/$f" "$t"; fi
    echo "linked ~/$f -> $here/$f"
  done
fi
line="*/5 * * * * bash $HOME/idle-stop.sh >> $BULP_LOGS/idle-stop.log 2>&1"
{ crontab -l 2>/dev/null | grep -v 'idle-stop' ; echo "$line"; } | crontab -
echo "--- crontab now:"; crontab -l
