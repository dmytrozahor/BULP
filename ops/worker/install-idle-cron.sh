#!/bin/bash
# Kept for the old name: install.sh does this now (idempotent).
exec bash "$(dirname "$(readlink -f "$0")")/install.sh" --cron-only
