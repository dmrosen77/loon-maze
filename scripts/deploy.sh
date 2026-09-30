#!/usr/bin/env bash
# Deploys Loon Maze to its Proxmox container:
#   - builds the game and puts it in /var/www/loon-maze, keeping the previous
#     version as /var/www/loon-maze.prev (to roll back, swap them);
#   - updates the world high score server in /opt/loon-maze-scores and
#     restarts it. Scores live in /var/lib/loon-maze and aren't touched.
#
# Run from your Mac:  npm run deploy
# Needs the `proxmox` SSH alias in ~/.ssh/config (key login to the Proxmox
# host); override with PROXMOX_HOST=... or CONTAINER=... if they change.
# The nginx /api/ setup is one-time; see server/nginx-api.conf.
set -euo pipefail
cd "$(dirname "$0")/.."

PROXMOX_HOST="${PROXMOX_HOST:-proxmox}"
CONTAINER="${CONTAINER:-116}"
in_container() { ssh -o BatchMode=yes "$PROXMOX_HOST" "pct exec $CONTAINER -- sh -c '$1'"; }
# macOS tar otherwise adds hidden "._" metadata files and extended attributes.
export COPYFILE_DISABLE=1
pack() { tar --no-xattrs --no-mac-metadata -czf - "$@"; }

echo "Building..."
npm run build --silent

echo "Deploying the game to /var/www/loon-maze..."
pack -C dist . | in_container '
  set -e
  rm -rf /var/www/loon-maze.next && mkdir -p /var/www/loon-maze.next
  tar xzf - --no-same-owner -C /var/www/loon-maze.next
  chown -R www-data:www-data /var/www/loon-maze.next
  rm -rf /var/www/loon-maze.prev
  if [ -d /var/www/loon-maze ]; then mv /var/www/loon-maze /var/www/loon-maze.prev; fi
  mv /var/www/loon-maze.next /var/www/loon-maze
'

echo "Deploying the score server to /opt/loon-maze-scores..."
pack package.json src/config.js server/scores-server.js server/scoresFile.js server/remove-score.js server/loon-maze-scores.service | in_container '
  set -e
  id loon-scores >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin loon-scores
  mkdir -p /var/lib/loon-maze && chown loon-scores:loon-scores /var/lib/loon-maze && chmod 750 /var/lib/loon-maze
  rm -rf /opt/loon-maze-scores.next && mkdir -p /opt/loon-maze-scores.next
  tar xzf - --no-same-owner -C /opt/loon-maze-scores.next
  rm -rf /opt/loon-maze-scores && mv /opt/loon-maze-scores.next /opt/loon-maze-scores
  cp /opt/loon-maze-scores/server/loon-maze-scores.service /etc/systemd/system/loon-maze-scores.service
  systemctl daemon-reload
  systemctl enable --quiet loon-maze-scores
  systemctl restart loon-maze-scores
  sleep 1
  systemctl is-active --quiet loon-maze-scores
'

echo "Checking..."
in_container 'curl -fsS http://127.0.0.1:3010/api/scores >/dev/null && echo "  score server: OK"'
echo "Done."
