# BloodBridge — Test-Driven Six-Member Delivery Pack

**Source of truth:** live `dev` branch reviewed 2026-10-21; v2 database design package supplied in the earlier conversation. **This package is a planning/test-first handoff, not a merged implementation.**

## Read in this order

1. `docs/01_TEST_FIRST_POLICY.md` — red/green/refactor; exact workflow.
2. `docs/02_SCHEMA_AND_MIGRATION_GATES.md` — existing `010_runtime_privileges.sql` vs unmerged v2 migration, exact resolution.
3. `docs/03_API_AND_NAVIGATION_CONTRACT.md` — owner-scoped APIs, screens, forms, hash routes.
4. `test-cases/MASTER_TEST_CASES.md` — **318 prewritten test scenarios** covering DB, API, frontend and end-to-end behavior.
5. `members/M0X_*.md` — **complete individual handoff** with branch commands, SQL, routes, forms, navigation, tests and PR checklist.
6. `docs/04_TEST_FIXTURES_AND_AUTOMATION.md` — how to turn scenarios into real automated tests safely.
7. `docs/05_ALL_MEMBER_ADVANCED_DB_PRACTICAL.md` — same shared ADBMS viva lab for all 6.
8. `docs/08_FRIDAY_DEMO_GATE.md` — **88-case** Friday demonstration gate from the larger catalog.

## Coverage counts

| Ownership | Planned test cases |
|---|---:|
| Shared / cross-module | 45 |
| Member 1 — Core Architecture, Identity, Institutions & Geography | 43 |
| Member 2 — Donor Profiles, Availability, Matching & Contact | 41 |
| Member 3 — Hospital Blood Requests & Request Progress | 40 |
| Member 4 — Donation Processing, Blood Unit Inventory & Fulfillment | 55 |
| Member 5 — Donation Camps, Area Targeting, Check-ins & Scheduled Events | 52 |
| Member 6 — Data Warehouse, OLAP, Benchmarking & Integration QA | 42 |
| **TOTAL** | **318** |

Priority counts: **P0 183**, **P1 118**, **P2 17**. 'All possible tests' is not finite. This catalog covers the most important **equivalence classes and risk classes**: valid/invalid data, bounds, state machine changes, authenticated roles, cross-institution scope, SQL constraints, rollback, concurrency, time/calendar, empty/loading/error frontend states, accessibility, privacy, repeatability, CI and ETL.

### Existing versus planned
- Existing in `dev`: `001_schema.sql`, `002_seed_reference.sql`, `007_advanced_objects.sql`, `010_runtime_privileges.sql`; Node/Supertest DB tests and Vitest UI tests; GitHub Actions CI.
- **Proposed, not yet merged:** expanded v2 objects and workflows in the separate database v2 package (`gn_divisions`, screenings, receipt procedures, event histories, donor matching function, more views and warehouse ETL).
- **Newly proposed, not in v2:** scheduled job/outbox/event-delivery entities. These are optional P1 and must be separately designed, not presented as existing.

**First task:** review this catalog, approve API and table ownership, commit only the catalog/docs on `test/tdd-test-catalog` into `dev`. Actual failing executable tests belong on each feature branch and must go GREEN before merging.

## Quick start (Git Bash, VS Code)

```bash
git status --short
git fetch origin --prune
git switch -c test/tdd-test-catalog origin/dev
# Copy the catalog/docs into the repo; do not overwrite existing tests.
git add docs/ test-cases/ members/
git commit -m "test: define BloodBridge database-first acceptance cases"
git push -u origin test/tdd-test-catalog
# Open Pull Request base=dev, head=test/tdd-test-catalog
```

On each module branch: copy `test-first/backend` and `test-first/frontend` selectively, implement real behavioral assertions with fixtures, confirm RED, then implement until GREEN. The `test.todo()` files catalogue **planned** tests, not passing tests. Use real expectations for new tests before implementing a feature.

## Deadline guidance
Target Friday 2026-10-23, before Saturday 2026-10-24: P0 high-risk cases first; P1/P2 labs and automation only if time. **Never merge deliberately failing tests into dev.**

**Note:** The university brief apparently lists at most five members; lecturer authorization for six should be confirmed.
