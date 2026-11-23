# Atri AI – Level 10 Meeting

Senior AI-First Software Engineer assessment submission.

## Stack
Next.js 16 + TypeScript + Tailwind + shadcn/ui (frontend), FastAPI + SQLAlchemy (backend), Postgres 16.

## Setup
```bash
docker compose up
```
Frontend: http://localhost:3000, API: http://localhost:8000, docs: http://localhost:8000/docs

Seed data loads automatically on backend startup (`seed.py`, safe to rerun). APP_NOW defaults to 2026-11-11T15:00:00Z; override via env.

Sign in by picking a seeded user on the home page (stored in localStorage and sent as `X-User-Id`).

## Test command
```bash
./scripts/test.sh
```
Runs backend pytest (rules, authorization, concurrency) and Playwright e2e. Requires Postgres running and seed data. Fixture strategy: conftest resets the database from seed.json before each test run via `load_seed()`; clock is APP_NOW (default seed now), not system time. Failure artifact: Playwright trace + screenshot retained on failure (`trace: retain-on-failure`).

## Rules report
```bash
docker compose exec backend python rules_report_cli.py
```
Output committed as `rules_report.json`.

## Assumptions
- Company time zone America/Chicago; weeks Monday–Sunday.
- "Make it an Issue" title format: "<Measurable>, week of <Mon D>".
- Meeting scorecard week = last closed week relative to meeting start time.
- Todos created during a meeting = created_at within [started_at, ended_at].
- Issues solved during a meeting = solved_at within [started_at, ended_at].
- Real-time via 1s polling over a WebSocket endpoint (server owns timer).
- Owners for "Add To-Do" chosen from team's Admins/Team Members (validated server-side).

## Known limitations
- No facilitator handoff; if facilitator disconnects, meeting continues and facilitator can reconnect.
- Score edits use last-write-wins (no optimistic locking) – bonus not implemented.
- No audit trail; bonus not implemented.
- Issue "Make it an Issue" from Rocks/To-Dos not implemented (bonus).
- Meeting page reuses scorecard/issues via duplicated interactive tables.

## AI tools used
Built with Claude/Copilot-style assistance for scaffolding; all code reviewed and tested by author.
```