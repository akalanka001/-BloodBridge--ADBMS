# BloodBridge — Database-First Monorepo Starter

> **Status:** A runnable **academic development starter**, not a completed blood-bank information system or clinically approved product. Uses synthetic/reference records only. Never use it for real patient matching, donor eligibility, inventory release, or transfusion decisions.

BloodBridge connects donors, authorized hospitals, blood banks, and community donation camps in Sri Lanka. The system uses an operational PostgreSQL database and a separate data-warehouse database for educational demonstrations of advanced database management concepts.

**Deadline:** finish the university demo by **Friday 23 October 2026**, before Saturday 24 October. **Team:** six developers (check approval: the supplied university brief limits groups to five).

## 1. Which design are we using?

We explored different designs; they were **alternatives**, not separate systems:

- **Concept A — Modern Healthcare:** dark navy-and-red landing hero, welcoming visual storytelling, subtle pulse/float animations.
- **Concept B — Blood-Bank Finder:** white/red search-first landing, mapping and location filters.
- **Later responsive design reference:** clean white dashboards for donors, hospitals, blood banks, admin, and camp management.

**FINAL DESIGN DECISION: one shared brand/design system.** Keep Concept A for the **main landing page**, incorporate Concept B's **search functionality inside the camp/blood-bank finder**, and use the **same light dashboard components** for all signed-in roles. The previous SVGs remain optional visual assets, not a second frontend codebase.

| Design rule | Final choice |
|---|---|
| Primary red | `#C9263E` |
| Primary navy | `#14243A` |
| Page background | `#F6F8FB` |
| Positive status | `#14856A` |
| Fonts | Inter / system sans |
| Desktop | Header + grid dashboard, large content area |
| Mobile | Collapsible nav, single-column cards, large touch targets |
| Animation | Subtle float/heartbeat/pulse, honor `prefers-reduced-motion` |
| Target sizes | 390px phone, 768px tablet, 1440px desktop |

Open `design/responsive_reference.html` to review **seven detailed page mocks**. The actual React implementation in `frontend/` intentionally starts smaller and uses the **same design tokens**. Its dashboard modules are starter layouts awaiting integration, not duplicates of the earlier designs.

## 2. Repository layout (ONE Git repository, THREE main application folders)

```text
BloodBridge_Starter/
├── README.md                 # You are here: project manual
├── .env.example              # Copy to .env; do not commit .env
├── compose.yaml              # Runs PostgreSQL + API + Vite frontend
├── package.json              # npm run dev starts the whole stack
│
├── frontend/                 # React + Vite + responsive UI
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js         # /api -> Express proxy (inside Docker network)
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── styles.css
│
├── backend/                  # Express REST API
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── server.js          # API setup, healthcheck, errors
│   │   ├── db.js              # pg pool and transaction helper
│   │   ├── middleware/auth.js
│   │   └── routes/            # auth, locations, donors, camps, requests, inventory
│   └── scripts/seed-demo-staff.js
│
├── database/                 # All PostgreSQL changes go here (not in frontend!)
│   ├── init/00-bootstrap.sh   # Fresh Docker volume initializes both databases
│   ├── migrations/
│   │   ├── 001_table_creation.sql
│   │   ├── 002_advanced_database_concepts.sql
│   │   ├── 003_insert_data.sql
│   │   └── 009_verify_advanced_objects.sql
│   ├── migrations_archive/   # Preserved legacy incremental migration history
│   ├── warehouse/004_warehouse.sql
│   └── experiments/          # Benchmarks; never run as startup migrations
│
├── design/                   # Responsive preview + visual references
├── docs/
│   ├── API_IMPLEMENTED.md    # API that truly exists in starter
│   ├── openapi-starter.yaml  # OpenAPI 3.0 for implemented routes
│   ├── PLANNED_OPENAPI.yaml  # Previous API roadmap; NOT all implemented
│   ├── ARCHITECTURE.md
│   ├── DATABASE_WORKFLOW.md
│   ├── TEAM_HANDOFF.md
│   ├── ERD_REVISED.mmd
│   └── ADDITIONS_ONLY.md
└── scripts/
    ├── smoke-check.js
    └── reset-warning.js
```

**Why separate folders?** Frontend handles components and browser calls; backend handles authentication, authorization and REST endpoints; database owns SQL schemas, migrations, functions, procedures, triggers, indexes, and benchmark experiments. Keeping them in **one monorepo** lets all six members work in parallel, makes Docker orchestration easy, and keeps a single GitHub project and README.

**Do not** put SQL inside React components, duplicate domain queries in every API handler, or split the code into three unrelated Git repositories this week.

## 3. Requirements

- **Docker Desktop** with Docker Compose v2 (on Windows: Docker Desktop running; use WSL2 if available).
- **Node.js 20 or 22 + npm** installed on your laptop only to run the root `npm run dev` convenience script. You can skip local Node by using `docker compose up --build` directly.
- Git (recommended); VS Code (optional).
- Internet on the **first build** to download Docker images and npm packages.
- Ports **5173** (frontend), **4000** (backend), **5433** (host PostgreSQL) should be free.

All services, dependencies, and database initialization run inside Docker. **You do not need to separately install PostgreSQL, Node modules, or Vite on the host.**

## 4. One-command startup

From the repository root:

### Step 1 — Make your private development environment file (ONE TIME)

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
notepad .env
```

**macOS / Linux / Git Bash:**

```bash
cp .env.example .env
```

Open `.env` and replace the example `POSTGRES_PASSWORD` and `JWT_SECRET` with **different long random secrets**. The `.env` file is Git-ignored. Keep them for local dev only.

### Step 2 — Start EVERYTHING using one command

```bash
npm run dev
```

**Equivalent command without local npm:**

```bash
docker compose up --build
```

This starts **PostgreSQL + the Express API + the React/Vite frontend** together. On the **first run of an empty Docker database volume**, `database/init/00-bootstrap.sh` automatically:

1. Creates and applies the **26-table operational schema** (`001_schema.sql`).
2. Loads **synthetic location reference codes** and blood-group/component types (`002_seed_reference.sql`).
3. Installs **regular views, functions, stored procedure, triggers, materialized view and indexes** (`007_advanced_objects.sql`).
4. Creates the **bloodbridge_warehouse** database with its basic dimension/fact tables (`004_warehouse.sql`).
5. Waits for PostgreSQL health before starting the API. Vite waits for an API health response.

**Important:** Initialization SQL runs **only when `db_data` is empty**. Editing a migration file does not rerun it automatically when the database has already initialized. See Section 9.

### Alternative: Running WITHOUT Docker (Local PostgreSQL or Supabase)

If you do not have Docker installed, you can run BloodBridge directly on your laptop with **Local PostgreSQL** or **Supabase (Cloud PostgreSQL)**:

1. Install dependencies:
   ```bash
   npm --prefix backend install
   npm --prefix frontend install
   ```
2. Configure `.env`:
   - **For Local PostgreSQL (pgAdmin / native Postgres):**
     ```ini
     PGHOST=localhost
     PGPORT=5432
     PGUSER=postgres
     PGPASSWORD=your_postgres_password
     PGDATABASE=bloodbridge
     JWT_SECRET=your_jwt_secret_at_least_32_characters
     ```
   - **For Supabase Cloud PostgreSQL:**
     ```ini
     DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
     JWT_SECRET=your_jwt_secret_at_least_32_characters
     ```
3. Set up database tables, views, procedures & triggers automatically:
   ```bash
   npm run db:setup
   ```
4. (Optional) Seed fictional demo accounts & sample camp:
   ```bash
   npm run db:seed
   ```
5. Start backend and frontend services:
   - **Terminal 1:** `npm run dev:backend` (API listens on http://localhost:4000)
   - **Terminal 2:** `npm run dev:frontend` (React web opens on http://localhost:5173)

See [`docs/TEAM_DEVELOPMENT_GUIDELINES.md`](docs/TEAM_DEVELOPMENT_GUIDELINES.md) for full instructions.

### Step 3 — Open the system

| Service | URL / connection |
|---|---|
| React frontend | http://localhost:5173 |
| Express API | http://localhost:4000/api/v1 |
| API health | http://localhost:4000/health |
| Public provinces | http://localhost:4000/api/v1/locations/provinces |
| Public verified camps | http://localhost:4000/api/v1/camps |
| PostgreSQL (pgAdmin, DBeaver) | `localhost:5433`, db `bloodbridge`, username from `.env` |
| Warehouse in same server | `localhost:5433`, db `bloodbridge_warehouse` |

Port 5433 is intentionally used **only on the host** to reduce conflicts with another local PostgreSQL installation; inside Docker the database still listens on **5432**. Frontend fetches relative `/api/v1/*` URLs, and **Vite proxies them to `http://api:4000`**, so no frontend database credentials or browser CORS setup is required.

### Step 4 — Stop

Use `Ctrl+C` in the terminal running the stack (containers will stop), or from another terminal:

```bash
npm run stop
```

To run everything in the background:

```bash
npm run start
```

To follow service logs:

```bash
npm run logs
```

Your PostgreSQL records are saved in the named Docker volume `db_data` and persist across normal restarts.

## 5. Create OPTIONAL demo staff and an approved camp

The base initialization creates reference tables **without inventing real hospitals, staff, or blood inventory**. To test role-specific login and to see a clearly labeled sample camp, run **once after the system is up**:

```bash
docker compose exec -e DEMO_PASSWORD=ChooseAnIndependentDemoPassword123 api node scripts/seed-demo-staff.js
```

This creates fictional records:

| Role | Demo email |
|---|---|
| Administrator | `demo-admin@bloodbridge.test` |
| Hospital staff | `demo-hospital@bloodbridge.test` |
| Blood bank staff | `demo-bank@bloodbridge.test` |

Use the supplied `DEMO_PASSWORD` to log in. This optional script also prints the demo `hospitalId`, `bloodBankId`, `organizerId`, `locationId`, and `campId`, and creates an approved **DEMO Community Donation Camp** for testing. The camp is fake and clearly labeled. Rerunning preserves existing demo users' passwords and their original camp.

**Security:** These accounts are for local development, not public deployment. Do not use real donors, hospital staff, patient information, or genuine blood inventory in the demo database.

## 6. What works now, and what doesn't

### Implemented in the starter

- The entire 3-service stack starts with **one command** (subject to dependencies available on your machine).
- PostgreSQL OLTP database, separate warehouse database and reference data are installed on first boot.
- SQL **views, functions, triggers, stored procedure, partial/composite indexes and transaction functions** are installed from the provided advanced-SQL migration.
- Health check, province/district/DS lookup, donor registration/login, donor preferences, approved camp discovery, camp creation/approval/registration, hospital request creation/listing, stock summary, and an atomic reservation route.
- Frontend: working landing and camp finder (real API), donor sign-up/login, donor preference toggles (once logged in), and consistent responsive **preview layouts** for hospital, blood bank and admin pages.

### Not finished (six-member team must implement)

- Full hospital create-request form, item-matching list, multi-step request tracker, and actual fulfillment workflow.
- Full blood-bank inventory CRUD/collection/screening/release (should be simulated safely for the mini-project).
- Real donor matching candidate search, donor request/invitation workflow, SMS/email notifications.
- Camp creation/approval frontend forms (API exists, UI to be connected), exact venue map and GN lookup.
- Operational dashboard KPIs, admin management UI, audit log UI, ETL jobs, automated warehouse refresh.
- Benchmark tests on large **synthetic** datasets, partitioning experiments, database user privilege hardening and final university report.

Review **`docs/API_IMPLEMENTED.md`** for actual functioning endpoints and **`docs/PLANNED_OPENAPI.yaml`** for proposed future contracts. The old OpenAPI plan must be updated to match implemented responses before treating it as authoritative.

## 7. Database-first development rules

1. **Agree on the final ERD and column names before building forms.** Source of truth is `database/migrations/001_schema.sql` plus approved incremental migrations.
2. Every schema change is a **new migration file**, for example `010_add_camp_notifications.sql` — never silently edit old executed migrations in shared environments.
3. Protect inventory with **transactions and row locks**. Use existing `fn_reserve_blood_unit` rather than implementing a second reservation algorithm in JavaScript.
4. **Views** power public camp and stock summary endpoints. **Functions/procedures** must be called from the API to demonstrate database logic. Inventory status-change triggers record movement; do not duplicate that logging in Express.
5. **Query performance**: document sequential scan vs B-Tree/composite/partial/hash index and actual `EXPLAIN (ANALYZE, BUFFERS)` outputs in the final report. Use synthetic sample sizes; never claim invented timing results.
6. **Geography**: province → district → DS → optional GN. Municipal/Urban Councils are a separate dimension; hospitals and bank facilities belong to institutions, not the administrative hierarchy. Current reference codes are **demo codes**, not official national codes.
7. **Sensitive data**: no exposed donor lists to the public, no patient details in the warehouse, role + organization checks on every private API call, parameterized SQL only.
8. **Compliance**: BloodBridge is a prototype and cannot determine donation eligibility, clinical compatibility, or release of real blood components.

`database/experiments/` contains non-startup benchmark/advanced topic scripts. Do not automatically run expensive synthetic benchmark data generation on every startup.

## 8. Backend & frontend collaboration

The frontend **does not** connect directly to PostgreSQL. All browser requests travel through the API:

```text
Browser (React/Vite :5173)
   └─ /api/v1/* (Vite proxy)
       └─ Express API :4000
           ├─ pg pool → PostgreSQL OLTP (db:5432)
           │  ├─ Tables, constraints, indexes
           │  ├─ Views and functions
           │  ├─ Stored procedures and triggers
           │  └─ Transactions / row locking
           └─ [future ETL job] → bloodbridge_warehouse
```

Development teams should agree on request/response JSON first. Keep all dates as timezone-aware ISO 8601 on the wire and render in `Asia/Colombo` in the UI. Use mobile layouts with stacked cards, not scaled-down desktop tables. See `docs/ARCHITECTURE.md` and `docs/TEAM_HANDOFF.md`.

## 9. Migrations, verification, and resets

### Inspect SQL objects

```bash
npm run db:check
```

This is a **catalog inspection**, not proof that business processes behave correctly. Run integration tests (including a two-client race for one blood unit).

### Connect with PostgreSQL

```bash
npm run db:psql
```

These two convenience commands assume the default `POSTGRES_USER=bloodbridge` and `POSTGRES_DB=bloodbridge`. If you changed either in `.env`, use `docker compose exec db sh` and run `psql` with your chosen names inside the container.

### Apply NEW migrations after first startup (Automatic runner)

```bash
npm run db:migrate
```

The migration runner (`scripts/migrate.js`) tracks executed migrations in a `schema_migrations` table, baselines existing installations, and applies pending versioned SQL migrations in transactional order.

Alternatively, to manually execute an individual SQL file directly inside PostgreSQL:

```bash
docker compose exec -T db psql -U bloodbridge -d bloodbridge -v ON_ERROR_STOP=1 -f /workspace/database/migrations/010_your_new_migration.sql
```

Use your own database/user values if changed. Always test on a local disposable database before committing schema changes. Store backups before upgrading a real database.

### Fully reset local synthetic data (DANGEROUS)

```bash
docker compose down -v
npm run dev
```

`-v` **deletes all local Docker database volumes**. Only use for this disposable academic demo. Never run on databases holding real or important records.

## 10. Automated testing and quality commands

The project includes an automated test and verification suite:

```bash
# Run all tests (backend + frontend)
npm run test

# Run backend unit and PostgreSQL integration tests
npm run test:backend

# Run frontend Vitest component tests
npm run test:frontend

# Check code syntax across scripts and backend
npm run lint

# Build frontend production bundle
npm run build

# Run end-to-end smoke check against active Docker stack
npm run test:smoke

# Complete local CI check (lint + test + build + smoke)
npm run ci:check
```

Review `docs/DATABASE_WORKFLOW.md` for transactions, views, and stored procedure demos.

## 11. Git workflow, CI/CD, and collaboration rules

### Integration branch: `dev`

- The shared working integration branch is **`dev`** (do not use `main` or merge unrelated histories).
- Always branch feature work from `origin/dev`:
  ```bash
  git fetch origin
  git checkout -b feature/your-feature-name origin/dev
  ```
- Make focused commits with Conventional Commit messages (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
- Open Pull Requests targeting **`dev`**. Never force-push or commit directly to `dev`.

### Continuous Integration (CI)

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs automatically on every push or PR to `dev`:
1. **Frontend Validation:** `npm ci`, Vitest component tests, Vite production build.
2. **Backend Validation:** `npm ci`, authentication and input validation test suites (`npm run test:unit`).
3. **PostgreSQL Integration:** Runs against an isolated `postgres:16-alpine` service container, applies migrations (`001`, `002`, `007`, `010`), verifies object existence (`009`), and executes 8+ behavioral assertions (`npm run test:db`).
4. **Docker Integration:** Builds application images, runs `docker compose up --build -d --wait`, executes `scripts/smoke-check.js`, and captures logs on failure.

### Continuous Delivery (CD)

On successful commits to `dev`, `.github/workflows/cd.yml`:
- Builds production-ready Docker images for backend and frontend.
- Publishes tagged images to GitHub Container Registry (`ghcr.io`):
  - `ghcr.io/<owner>/<repo>/backend:dev`
  - `ghcr.io/<owner>/<repo>/frontend:dev`
- Embedded secrets and private database records are never included in images.

### Pull request checklist

- CI checks pass.
- At least one team member code review approval.
- Follows `.github/PULL_REQUEST_TEMPLATE.md`.
- No `.env` or credentials committed.

## 12. Six-person sprint breakdown (20–23 October 2026)

| Owner | Database/API/Frontend responsibility | Friday evidence |
|---|---|---|
| 1 — Database lead | ERD, normalization, migrations, indexes, catalog checks | `EXPLAIN ANALYZE` + SQL and ERD |
| 2 — Donors/geography | Auth, location hierarchy, donor registration and search | API tests + responsive donor screens |
| 3 — Hospitals | Scoped blood requests, items, matching logic | Request UI + safe scoped SQL |
| 4 — Blood bank | Component inventory, reservations, fulfillment | Atomic reservation test + status audit |
| 5 — Donation camps | Organizer, draft/approval, area filters, camp registration | Approved camp displayed, registration trigger |
| 6 — Integration & analytics | UI design system, responsiveness, warehouse ETL, report coordination | 390px/768px/1440px previews, analytical SQL |

**20 Oct**: settle ERD/API naming and boot the stack. **21 Oct**: connect first end-to-end donor/camp/request endpoints. **22 Oct**: finish stock transactions and camp approval. **23 Oct**: freeze features by afternoon; integrate, benchmark, test and document.

**Assignment warning:** The supplied ADBMS mini-project brief states **at most five group members**. Get explicit lecturer permission if your submission includes six.

## 13. Troubleshooting (Windows-friendly)

| Symptom | Fix |
|---|---|
| `docker: command not found` | Install Docker Desktop and ensure it is running; restart terminal. |
| `npm is not recognized` | Install Node.js or run `docker compose up --build` instead. |
| `open //./pipe/docker_engine ...` | Start Docker Desktop and wait until the engine is running. |
| Browser at localhost:5173 refuses connection | Check `docker compose ps` and `docker compose logs web`; check first-time build finishes. |
| API returns 503 | Check `docker compose logs db` and `docker compose logs api`. Database may still be bootstrapping. |
| Port already allocated | Free 5173/4000/5433 or change host side of mapping in `compose.yaml`. |
| No camp events on landing | Expected on unseeded database; use optional demo staff/camp seed, or create/approve a camp. |
| SQL view/function not found | Ensure you started with an empty database volume or applied migration `007_advanced_objects.sql` manually. |
| Changes to schema seem ignored | Docker init runs once; create/apply a new migration, or reset a disposable volume deliberately. |
| UI can't reach API | Use http://localhost:5173 from host; Vite proxy requires Compose service `api` in Docker network. |
| File watch doesn't update on Windows | Vite polling is already enabled; restart Docker Desktop if bind mounts stop updating. |
| Login for staff doesn't work | Staff accounts are **not** auto-created. Run the optional synthetic seed script and check its output. |

## 13. References and deliverables

- `docs/ERD_REVISED.mmd` — revised educational ER diagram, review with your team.
- `docs/ADDITIONS_ONLY.md` — separately tracked new donation-camp, Sri Lankan geography, inventory and authorization features.
- `docs/API_IMPLEMENTED.md` — functioning starter API with example requests.
- `docs/openapi-starter.yaml` — import into Swagger Editor for **implemented** starter routes (not the broader roadmap).
- `docs/PLANNED_OPENAPI.yaml` — previous broader API design, aspirational until implemented.
- `design/responsive_reference.html` — complete desktop/mobile visual reference for landing + role dashboards + camp finder + camp creation.
- `database/migrations/007_advanced_objects.sql` — views, stored procedures, functions, triggers, materialized view.
- `database/experiments/` — additional index, physical file organization and analytical-query experiment templates.

**Definition of done for the university demo:** Running app; functioning auth and role checks; at least one complete end-to-end request/reservation or camp flow; reproducible schema and demo data; executed stored SQL objects; transaction rollback test; real measured index benchmark; documentation (ERD, relational mapping, table structure, security, hosting, problems/solutions); responsive screens; and clearly labeled **synthetic data**.
