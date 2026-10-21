# Test-first policy: do not implement first and 'add tests later'

## Quality gate 0 — agree contracts (whole team)
- One approved ERD, table dictionary, migration ownership and API request/response contracts.
- Write test IDs and requirements first, identify ambiguous expected statuses (400 vs 409) and decide one convention in OpenAPI.
- P0 is the demo blocker. P1 extends coverage when time permits; P2 is optional lab/automation.
- Existing tests are preserved. Never delete or weaken a legitimate failing test just to reach green.

## RED — automated assertion written before business logic
1. Begin from `origin/dev`, on **your own feature branch**.
2. Select your member's P0 cases (IDs in your handoff), implement real `node:test` + Supertest / SQL + `pg` tests and Vitest interaction tests.
3. Execute tests and save the expected failure showing the missing API/database behavior, not a syntax/configuration failure.
4. Avoid a mock that asserts only the mock. Assert state in PostgreSQL after API calls and on-screen behavior after interactions.

## GREEN — minimum implementation that makes RED tests pass
1. Add additive migrations (never edit 001/002/007 if already applied).
2. Implement SQL function/procedure/trigger/constraint with real transaction semantics.
3. Implement scoped Express route(s) calling the function/procedure with parameterized queries.
4. Implement responsive page/form/nav that calls the actual API.
5. Re-run targeted test IDs, SQL assertions, frontend tests, and `npm run build`.

## REFACTOR — improve safely without changing behavior
- Refactor into `backend/src/routes/` and `frontend/src/pages/` and shared services, preserving original one-command startup.
- Add failure/retry, malformed input, isolation tests, accessible labels and loading/empty/error states.
- Run full checks. PR only if P0 tests green, docs updated and second reviewer approves SQL.

## Existing dev commands — execute from repository root
```bash
npm run dev                   # Compose 3-service stack (requires .env & Docker)
npm run test:backend          # node:test, includes PostgreSQL integration requiring reachable DB
npm run test:frontend         # Vitest
npm run build                 # Vite build
npm run lint                  # JS basic syntax checks
npm run db:migrate            # Check environment: migration runner runs on target DB
npm run ci:check              # Includes smoke checks: stack must already be running
```
If using local `npm run dev:local`, configure PGHOST/PGPORT or DATABASE_URL appropriately. **Never run the TDD suite against your shared academic/demo database.**

## A useful PR cannot claim coverage merely because test.todo exists
`test.todo()` is an inventory: CI usually counts it as pending. The acceptance criterion for every implemented P0 test ID is a real assertion that verifies behavior. Test cases that cannot be automated should include a repeatable manual procedure and screenshots with IDs.

## Cross-discipline rules
- Every feature requires at least one DB assertion, one API assertion, one frontend interaction test, and one negative/security test.
- Every critical transaction requires success, rollback and two-connection concurrency tests.
- Test separate race clients **after fixture COMMIT**; an uncommitted fixture isn't visible to another connection.
- After a failed SQL statement in a transaction, issue `ROLLBACK` or `ROLLBACK TO SAVEPOINT` before further queries.
- Test fast-changing/clock-dependent logic with relative times or frozen clocks, not hard-coded dates.
- Test object presence **AND** behavior; schema catalog inspection alone is insufficient.
- Never model matching/contact interest as clinical clearance; use synthetic data only.
