---
name: bloodbridge-team-delivery
description: Use for dividing BloodBridge implementation among six students, choosing Git branches, coordinating schema/API changes, PR handoff, sprint tasks and Friday submission.
---

# Six-person sprint orchestration and handoff

## First read
`docs/TEAM_HANDOFF.md`, `README.md`, `AGENTS.md`, `docs/API_IMPLEMENTED.md`, `docs/ARCHITECTURE.md`. Academic brief reportedly limits teams to five; lecturer must approve six.

## Assignment map
- M1: database schema/ERD, SQL migrations, advanced concept experiments and review.
- M2: authentication, geography, donor profiles and preference endpoints/UI.
- M3: hospital requests and donor matching queries, hospital responsive screens.
- M4: component unit inventory, atomic reservation and fulfillment, stock UI/security tests.
- M5: organizers, camps, geography targeting, approval workflow and camp UI.
- M6: shared UI components, data warehouse ETL, dashboard analytics and demo integration.

## Collaboration protocol
1. Agree and freeze `001_schema.sql` + implemented API contracts; M1 approves any incremental `010_...`+ migrations.
2. Everyone works in one repository with branch `feature/m1-database` etc. Identify files owned by each member and avoid parallel edits of `frontend/src/App.jsx` by extracting components/modules first.
3. PR template: scope, SQL migration, API contract diff, screenshots/width tests, commands actually run, unresolved blockers, reviewer.
4. Do short daily integration: no direct pushes to main, one reviewer, merge only with `npm run dev` healthy, critical SQL/API tests.
5. Prioritize **P0**: DB model, login, hospital request, bank inventory reservation, approved public camp registration. **P1**: analytics/experiments and complete dashboards. **P2**: GN full list, map radius/PostGIS, SMS and animations.
6. Freeze features by Friday afternoon; execute demo scenario and submit report, SQL traces, ERD, architecture and screenshots.

## Acceptance
Each member provides a runnable branch and evidence. Team can demonstrate donor sign-up, approved camp, hospital request, single winning reservation, trigger audit, regular/materialized views and measured query optimization.
