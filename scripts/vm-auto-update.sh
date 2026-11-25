#!/usr/bin/env bash
# Updates this Mailman server to the newest release, if there is one.
# Meant for root's crontab (Docker needs root), e.g. every night at 03:17:
#   17 3 * * * /home/<you>/MailMan/scripts/vm-auto-update.sh >> /var/log/mailman-update.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

# Run git as the checkout's owner, so root never takes over its files
owner=$(stat -c %U .)
as_owner() { if [ "$(id -un)" = "$owner" ]; then "$@"; else sudo -u "$owner" "$@"; fi; }

as_owner git fetch --quiet origin main
if [ "$(as_owner git rev-parse HEAD)" = "$(as_owner git rev-parse origin/main)" ]; then
  exit 0
fi
as_owner git merge --ff-only --quiet origin/main
docker compose up -d --build
docker image prune -f > /dev/null
echo "$(date -Is) updated to $(as_owner git log -1 --format=%h)"
