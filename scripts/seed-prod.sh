#!/usr/bin/env bash
set -euo pipefail

echo "Provisioning bootstrap super admin from environment."
node scripts/create-admin-user.mjs
