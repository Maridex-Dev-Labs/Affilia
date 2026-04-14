#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required."
  exit 1
fi

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/restore.sh <backup.sql>"
  exit 1
fi

SOURCE_FILE="$1"

if [[ ! -f "$SOURCE_FILE" ]]; then
  echo "Backup file not found: $SOURCE_FILE"
  exit 1
fi

echo "Restoring database from ${SOURCE_FILE}"
psql "$DATABASE_URL" -f "$SOURCE_FILE"
echo "Restore complete."
