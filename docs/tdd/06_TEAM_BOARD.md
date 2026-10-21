# Work board — six person GitHub feature branches

| Owner | Branch | Owned test cases | Main task | Required sequence |
|---|---|---:|---|---|
| M1 | `feature/m1-core-identity-geography` | 43 | Core Architecture, Identity, Institutions & Geography | Tests first → DB objects → APIs → UI → full regression → PR/dev |
| M2 | `feature/m2-donors-matching` | 41 | Donor Profiles, Availability, Matching & Contact | Tests first → DB objects → APIs → UI → full regression → PR/dev |
| M3 | `feature/m3-hospital-requests` | 40 | Hospital Blood Requests & Request Progress | Tests first → DB objects → APIs → UI → full regression → PR/dev |
| M4 | `feature/m4-inventory-fulfillment` | 55 | Donation Processing, Blood Unit Inventory & Fulfillment | Tests first → DB objects → APIs → UI → full regression → PR/dev |
| M5 | `feature/m5-camps-outreach` | 52 | Donation Camps, Area Targeting, Check-ins & Scheduled Events | Tests first → DB objects → APIs → UI → full regression → PR/dev |
| M6 | `feature/m6-warehouse-analytics` | 42 | Data Warehouse, OLAP, Benchmarking & Integration QA | Tests first → DB objects → APIs → UI → full regression → PR/dev |

## Merge order and dependency slots
1. Catalog/docs-only PR into `dev` (no deliberately red CI tests on dev).
2. M1 foundation PR: migrate schema after reconciliation (existing 010 remains); shared nav and area picker.
3. M2 donor, M3 hospital, M4 inventory, M5 camps, M6 warehouse branch from UPDATED origin/dev after foundation; add independently scoped tests and endpoints.
4. M3↔M4 handoff on requests/reservations/received status; M2↔M5 on consent and camp targeting.
5. M6 warehouse after durable business records exist; do not invent metrics.
6. Friday feature freeze; risk-first merging and final six-person lab.

## Reviewer matrix
- M1 PR: M4 (SQL lifecycle) + M5 (geography).
- M2 PR: M1 (data/privacy) + M5 (consent).
- M3 PR: M1 (SQL) + M4 (fulfillment).
- M4 PR: M1 (SQL) + M3 (request status).
- M5 PR: M1 (SQL) + M2 (targeted donors).
- M6 PR: M1 (warehouse schemas) + M3 (request grain).

**Everyone:** no direct pushes to dev, API specs and user role guards required, every P0 test must go red→green, actual DB demonstrations saved.
