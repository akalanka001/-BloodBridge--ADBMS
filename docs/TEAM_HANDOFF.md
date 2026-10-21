# Six-member handoff — must finish before Saturday 24 Oct 2026

University brief says **maximum five group members**; check lecturer approval before final submission for six.

## Owners

| Member | Database ownership | Backend ownership | Frontend and test output |
|---|---|---|---|
| 1 | Schema/ERD, indexing, views, SQL migrations | Review transaction boundaries | Integration review, DB experiments + report |
| 2 | Donor, geography, eligibility data design | Auth, location, donor APIs | Donor sign-up, profile, responsive preferences |
| 3 | Requests, items, match queries | Request and matching APIs | Hospital request form/tracker + permissions tests |
| 4 | Blood units, stock, reservation, audit trigger | Inventory/fulfillment endpoints | Bank dashboard + two-client reservation test |
| 5 | Organizers, camps, target geography, registration trigger | Camp CRUD, approvals via procedure | Camp form/finder + approval test |
| 6 | Warehouse facts/dimensions, materialized views | ETL and analytics | Shared UI styling/admin analytics/report merge |

## Integration rules
- **One database owner** approves any migration; add `010...`, `011...` rather than editing `001...` after execution.
- API paths are in `docs/API_IMPLEMENTED.md`. Existing broader openapi plan is not yet an implemented contract.
- Feature owners expose real API responses and error cases before final UI polish.
- All commits must work with `npm run dev` from a clean checkout (first build needs network).
- Do not add fake inventory stats that look like confirmed live supply.

## Suggested milestones
- **20 Oct:** repo boots, DB and interfaces agreed, first migration frozen.
- **21 Oct:** donor, geography, camp and request routes connect; staff fixtures tested.
- **22 Oct:** reservation, fulfillment, approvals and SQL trigger/function demos.
- **23 Oct:** merge freeze by afternoon, synthetic QA, index benchmarks, report, final live demo.

## Minimum team demo script
1. Show database tables/constraints and ERD.
2. Register donor through React; verify `users` + `donors` rows.
3. Approve synthetic camp through SQL procedure/API; see public camp filter.
4. Create hospital request with one or more component items.
5. Reserve one released unit in a transaction; try a second reservation and show failure/rollback.
6. Show trigger-audited movement row.
7. Show view/function/materialized-view queries and measured index plans.
8. Show desktop/mobile UI at 1440/768/390 widths.
