#!/usr/bin/env bash
set -e
export PATH="/opt/homebrew/opt/python@3.12/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export APP_NOW="${APP_NOW:-2026-11-11T15:00:00Z}"
export DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://postgres:postgres@localhost:5432/atri}"
export SEED_PATH="$ROOT/seed.json"

echo "Running backend tests..."
cd "$ROOT/backend"
if command -v python3.12 >/dev/null 2>&1; then PY=python3.12; elif command -v python3 >/dev/null 2>&1; then PY=python3; else PY=python; fi
$PY -m pytest -q

echo "Running frontend e2e tests..."
cd "$ROOT/frontend"
npx playwright test
