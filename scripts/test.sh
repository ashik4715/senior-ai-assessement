#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export APP_NOW="${APP_NOW:-2026-11-11T15:00:00Z}"
export DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://postgres:postgres@localhost:5432/atri}"
export SEED_PATH="$ROOT/seed.json"

echo "Running backend tests..."
cd "$ROOT/backend"
python -m pytest -q

echo "Running frontend e2e tests..."
cd "$ROOT/frontend"
npx playwright test
