---
name: bloodbridge-testing
description: Use for BloodBridge unit, API integration, SQL object verification, concurrency/security testing, Docker smoke tests, benchmark proof and release readiness.
---

# BloodBridge testing and quality gates

## First read
`README.md`, `scripts/smoke-check.js`, `backend/package.json`, `docs/API_IMPLEMENTED.md`, `database/migrations/009_verify_advanced_objects.sql`, `database/experiments/*`.

## Test matrix
- Schema: PK/FK, unique, 3NF assumptions, cross-district DS rejection, nonnegative quantities, camp date bounds.
- Views/functions/procedure/triggers: valid and rejected inputs, rows returned, inventory movement audit, capacity race.
- API: registration/auth, role and institution boundaries, Zod validation, malformed UUID, duplicate registration, nonexistent camp, expired unit.
- Transactions: two concurrent attempts to reserve one synthetic unit; exactly one winner, rollback of losing attempt, accurate final stock and audit.
- UI: keyboard access, error/loading states, responsive 390/768/1440, reduced-motion, no public donor details.
- Analytics: ETL counts and repeated-run idempotency, no PII, measured `EXPLAIN (ANALYZE, BUFFERS)` for real synthetic datasets.

## Standard commands and honest reporting
- Root: `docker compose config`, `npm run dev` (Docker Desktop, `.env` required); check `http://localhost:4000/health`.
- Backend: `docker compose exec -T api npm test` (or `npm --prefix backend test` with dependencies installed).
- Frontend: `docker compose exec -T web npm run build` (or `npm --prefix frontend run build`).
- SQL: `npm run db:check`; verify against running Postgres, **do not run experimental benchmarks as boot migrations**.
- If tests are absent, add them. If Docker/test runner unavailable, mark checks **NOT RUN** and provide commands for teammate; never claim passed.

## Definition of done
Write `TEST_REPORT.md` per module: environment, commands, real outputs, passing/failing assertions, observed SQL plans and timestamps, known unresolved issues. Include at least one negative/security case, not only happy path.
