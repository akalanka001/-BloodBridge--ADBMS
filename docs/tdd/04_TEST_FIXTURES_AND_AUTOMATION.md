# Repeatable synthetic fixtures, automation, concurrency, and evidence

## Test technology already installed in `dev`
- Backend: built-in `node:test` with `node:assert`, `supertest`, and `pg`. Frontend: `Vitest`, `@testing-library/react`, jsdom.
- Existing files: `backend/test/auth.test.js`, `backend/test/validation.test.js`, `backend/test/database-integration.test.js`, `frontend/src/App.test.jsx`.
- Add new files by feature owner, for example `backend/test/m4-inventory.test.js`; never wipe old tests.

## Fixture strategy
- **Do not use real donor/patient names or lab results.** Use `example.test` and UUIDs with unique per-test prefixes.
- Each test seeds one verified bank, one distinct bank, one hospital, corresponding staff memberships, two donors, one request with items, optional component unit and camp.
- Keep fixtures isolated by unique identifiers. Database tests can run inside `BEGIN`/`ROLLBACK` when using a single connection; API tests need seeded **committed** fixtures for other connections.
- For API/parallel tests use a dedicated disposable database or schema per test worker; clean by fixture ids, avoid global `TRUNCATE ... CASCADE` on shared dev.
- Create helper functions: `seedInstitution(client)`, `seedDonor(client)`, `seedRequest(client)`, `seedReleasedUnit(client)`, `seedCamp(client,{capacity})`, `tokenFor(userId,role)`, `cleanFixture(id)`.
- Time-dependent tests use now+future intervals and time-zone-aware string formats. For camp check-in allowed only during event window, seed event around now or set deterministic clock in a disposable environment.

## A real RED test should look like this
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/server.js';

test('M4: unauthenticated donation creation returns 401', async () => {
  const response = await request(app).post('/api/v1/donations').send({});
  assert.equal(response.status, 401);
});
```
On the starter, this **fails** because the route is missing (404), which is the intended RED proof; it must become GREEN after mounting the authenticated route. This alone does not cover the success case: build and assert the DB state with synthetic fixtures as the next RED tests.

## DB transaction test behavior
```js
await client.query('BEGIN');
try {
  // seed disposable records; issue stored procedure and assert affected DB rows
} finally {
  await client.query('ROLLBACK');
}
```
If testing a constraint exception within a transaction, use a savepoint or end the transaction before additional queries:
```sql
SAVEPOINT before_invalid;
-- invalid INSERT raises expected SQLSTATE 23503
ROLLBACK TO SAVEPOINT before_invalid;
```
For race tests, use **two separate pg clients** and committed fixtures. Set short `statement_timeout`/`lock_timeout` in test sessions so deadlocks or hangs fail visibly. Independently assert only one committed allocation/seat.

## UI behavior tests
- Mock only network edges, not the component's own business logic.
- Verify form labels, disabled states, inline errors, request payloads, navigation and empty/error/loading.
- Test keyboard Tab order, dialog focus trapping and min tap target, plus Playwright at 390/768/1440px if available.
- The existing project uses hash routes. Reuse hash route naming in tests until team approves switching routers.

## Test evidence sheet
For each test store: ID, exact command, commit SHA, database version, input synthetic fixture, expected vs actual, result, screenshot/log, reviewer, fix commit. For query plan tests capture `EXPLAIN (ANALYZE, BUFFERS)` with actual row counts and timings; never invent speedups.

## Shared release gate
- All P0 cases for each merged feature are REAL assertions and passing.
- DB catalogue/object presence tests plus behavior tests pass.
- Role and institution authorization tests pass at API and DB boundaries.
- Concurrent stock reservation and concurrent camp-capacity tests pass with two connections.
- `npm run test:backend`, `npm run test:frontend`, `npm run build`, and `npm run ci:check` pass in correct environment.
- PR includes screenshots at 390px, 768px, 1440px; unit and form errors; no console crash.
