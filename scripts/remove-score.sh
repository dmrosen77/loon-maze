#!/usr/bin/env bash
# Removes an entry from the world high score table on the Proxmox container:
# every entry with those initials, or only the one with that score too.
# With no arguments (or --list) it just shows the table.
#
#   npm run remove-score -- ZZZ          # all of ZZZ's entries
#   npm run remove-score -- ZZZ 123456   # just that one
#   npm run remove-score                 # show the table
#
# The server keeps the table in memory, so it's stopped while the file is
# edited and started again after. Needs the `proxmox` SSH alias, like deploy.sh.
set -euo pipefail
PROXMOX_HOST="${PROXMOX_HOST:-proxmox}"
CONTAINER="${CONTAINER:-116}"
NAME="${1:---list}"
SCORE="${2:-}"
if ! [[ "$NAME" =~ ^(--list|[A-Za-z0-9]{3})$ && "$SCORE" =~ ^[0-9]*$ ]]; then
  echo "Usage: npm run remove-score -- NAME [SCORE]" >&2
  exit 1
fi
RUN="cd /opt/loon-maze-scores && runuser -u loon-scores -- env DATA_DIR=/var/lib/loon-maze node server/remove-score.js $NAME $SCORE"
if [ "$NAME" = "--list" ]; then
  ssh -o BatchMode=yes "$PROXMOX_HOST" "pct exec $CONTAINER -- sh -c '$RUN'"
else
  ssh -o BatchMode=yes "$PROXMOX_HOST" "pct exec $CONTAINER -- sh -c 'systemctl stop loon-maze-scores; $RUN; status=\$?; systemctl start loon-maze-scores; exit \$status'"
fi
