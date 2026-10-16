#!/usr/bin/env bash
# SPEC 63 HV-1: wait (cheap sleep loop) until the data archive is extracted (marker ~/migrate/DATA_EXTRACTED), then start all harvesters.
# Usage: nohup setsid bash harvest/launch-when-ready.sh >>~/launch-when-ready.log 2>&1 </dev/null &
MARK="${HARVEST_READY_MARKER:-$HOME/migrate/DATA_EXTRACTED}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "$(date -u +%FT%TZ) waiting for $MARK"
while [ ! -e "$MARK" ]; do sleep 60; done
echo "$(date -u +%FT%TZ) marker found, launching"
bash "$ROOT/harvest/launch.sh"
echo "$(date -u +%FT%TZ) launch.sh exit $?"
