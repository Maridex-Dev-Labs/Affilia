#!/usr/bin/env bash
set -e
pnpm --filter ./apps/frontend build
pnpm --filter ./apps/admin build
