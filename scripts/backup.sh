#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required."
  exit 1
fi

mkdir -p backups
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="backups/affilia-${STAMP}.sql"

echo "Creating database backup at ${TARGET}"
pg_dump --clean --if-exists --no-owner --no-privileges "$DATABASE_URL" > "$TARGET"
echo "Backup complete."
