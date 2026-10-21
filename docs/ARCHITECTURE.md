# Architecture & Design Decision Record

## ADR-001: One repository, three application folders
Use `frontend/`, `backend/`, and `database/` under one GitHub repository. Docker Compose orchestrates all three; they are logical components, not separate deployed Git projects. Backend is the only application component with PostgreSQL credentials.

## ADR-002: One visual identity
The first navy/red animated SVG and later white/red pages were exploratory alternatives. The **selected design** is navy animated public landing + white role dashboards using the same red/navy tokens. The white search-first concept belongs in camp/bank discovery, not another homepage. The attached `design/responsive_reference.html` is the detailed seven-view reference. Implementation React starts with the same tokens but doesn't implement all those workflows yet.

## ADR-003: The database is the primary academic deliverable
- OLTP: PostgreSQL `bloodbridge`.
- OLAP: PostgreSQL `bloodbridge_warehouse` (separate database).
- Data movement: future ETL process, not direct writes from UI.
- Migrations: SQL files under `database/migrations`.
- Advanced objects: views, function, procedure, trigger, materialized view, indexes. Benchmarks are **manual experiments** (not startup scripts).
- Inventory truth: individual blood units and release/reservation status, not editable aggregate quantities.

## ADR-004: Donor and camp geography
`province -> district -> DS division -> optional GN division`; optional local-authority mapping is NOT inserted in this administrative chain. Facilities and public camp venues have location records. Initial sample codes are demonstrative, not a complete official location dataset. District filtering is implemented; exact radius/PostGIS and GN master data remain later features.

## ADR-005: Runtime and port mapping
- Browser on host: `localhost:5173`, `/api` proxied inside Compose to `api:4000`.
- API on host: `localhost:4000`.
- PostgreSQL on host: `localhost:5433`, container `db:5432`.
- Docker Compose health dependencies ensure SQL initialization is finished before the API is needed.
- `npm run dev` starts all services, or `docker compose up --build` when host npm is not installed.

## ADR-006: Security and medical responsibility
Role and staff organization membership checks for private APIs; parameterized SQL; safe logs; no public personal donor information; no real blood release or patient compatibility. All demo data must be fabricated. PostgreSQL database roles in the starter use one local development owner for simplicity; implement least-privilege runtime/migrator accounts before any non-local deployment.

## What the starter is not
Not a deployed hospital system, not a verified donor matching clinical tool, and not a fully implemented React/dashboard system. See the implemented API list and readiness checks in README.
