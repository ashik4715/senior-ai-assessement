# Decision Record

## 1. Data model
Tables: companies, teams, users, memberships, measurables, scores, rocks, milestones, issues, todos, meetings.
- Issues link to source via `source_measurable_id` + `source_week_start` (nullable). To-Dos link via `source_issue_id`.
- Duplicate-free "Make it an Issue" enforced by a partial unique index on (team_id, source_measurable_id, source_week_start) WHERE solved_at IS NULL, plus transactional insert with conflict handling.
- Timestamps stored in UTC; due dates as dates in company time.

## 2. API design
REST under /api with resource-oriented routes (/teams/{id}/measurables, /issues, /todos, /rocks, /meetings). Auth via seeded user switcher: `X-User-Id` header or login cookie. Roles and team boundaries enforced in dependencies (403 on violation). Inputs validated with Pydantic/manual checks and DB constraints.

## 3. Real-time transport
WebSocket endpoint /ws/meetings/{id} streams full meeting state every second; server owns timer (section_started_at). Clients also poll every 2s as fallback. Late joins fetch GET /meetings/{id} then subscribe. No facilitator handoff.

## 4. Concurrency for Make it an Issue
Partial unique index + insert-then-catch-IntegrityError returning the existing unsolved issue; verified by concurrent test.

## 5. Keeping past meeting summaries unchanged
Summaries are computed on demand from immutable facts: issues.solved_at, todos.created_at, meeting attendee_ids/ratings, and measurable scores by week. Since scores are keyed by (measurable, week) and never rewritten historically, a later edit to a different week or a new score does not alter a past meeting's reviewed week. For full immutability, a production version would snapshot the scorecard into a meeting_summary table at end time; described here as the recommended approach.
```

## Bonus note: 1,000 companies
Index by company_id on all tenant tables, connection pooling, per-company DB schemas or row-level security, horizontal scaling of stateless API, Redis for meeting state, async workers for seed/migrations.