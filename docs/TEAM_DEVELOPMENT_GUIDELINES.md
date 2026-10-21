# BloodBridge — Team Development & Engineering Guidelines

This guide defines the standards, workflows, testing procedures, and folder structures that all team members must follow when contributing to BloodBridge.

---

## 0. Development Environment Options: Choose Your Setup

BloodBridge supports three local development modes so every team member can contribute, regardless of whether they have Docker Desktop or use Windows/macOS/Linux:

| Setup Mode | When to use | What you need installed |
|---|---|---|
| **Option A: Docker Compose** | Recommended if you already have Docker Desktop | Docker Desktop, Node.js 20 or 22 |
| **Option B: Local PostgreSQL** | For teammates with pgAdmin or native PostgreSQL | PostgreSQL 16 (or 15), Node.js 20 or 22 |
| **Option C: Supabase (Cloud DB)** | Easiest zero-install DB for laptops without Docker | Free Supabase account, Node.js 20 or 22 |

---

### 📦 Setup Instructions

#### Step 1: Clone the repository & create your `.env` file
```bash
git clone https://github.com/akalanka001/-BloodBridge--ADBMS.git
cd -BloodBridge--ADBMS
git checkout dev
cp .env.example .env
```

#### Step 2: Configure `.env` for your chosen option

##### 👉 If using Option A (Docker Compose):
In `.env`:
```ini
POSTGRES_USER=bloodbridge
POSTGRES_DB=bloodbridge
POSTGRES_PASSWORD=choose_a_strong_password_123
JWT_SECRET=your_jwt_secret_at_least_32_characters_long
```
Start everything with:
```bash
npm run dev
```

##### 👉 If using Option B (Local PostgreSQL / pgAdmin on laptop):
In `.env`:
```ini
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_actual_local_postgres_password
PGDATABASE=bloodbridge
JWT_SECRET=your_jwt_secret_at_least_32_characters_long
```
Initialize the database and start the app:
```bash
# 1. Install dependencies
npm --prefix backend install
npm --prefix frontend install

# 2. Automatically create database and run all migrations:
npm run db:setup

# 3. (Optional) Seed demo accounts:
npm run db:seed

# 4. Start backend (Terminal 1) and frontend (Terminal 2):
npm run dev:backend
npm run dev:frontend
```

##### 👉 If using Option C (Supabase Cloud PostgreSQL):
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **Project Settings** ➔ **Database** ➔ **Connection String** ➔ **URI**.
3. In `.env`, set:
```ini
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
JWT_SECRET=your_jwt_secret_at_least_32_characters_long
```
Initialize the database and start the app:
```bash
# 1. Install dependencies
npm --prefix backend install
npm --prefix frontend install

# 2. Run all migrations into your Supabase database:
npm run db:setup

# 3. (Optional) Seed demo accounts:
npm run db:seed

# 4. Start backend and frontend:
npm run dev:backend
npm run dev:frontend
```

> **Note for Supabase:** BloodBridge automatically detects `supabase.co` or `sslmode=require` and applies SSL encryption (`rejectUnauthorized: false`), ensuring seamless connectivity without connection errors.

---

## 1. Git & Branching Conventions

### Integration Branch: `dev`
- **`dev`** is our active working integration branch.
- **Never branch from or target `main` directly.** The repository integration history is anchored on `dev`.
- Do not commit directly to `dev`. Every change must go through a short-lived feature branch and a reviewed Pull Request.

### Branch Naming Format
Use the format: `<type>/<module-or-ticket>-<short-description>`

| Branch Pattern | Purpose | Example |
|---|---|---|
| `feature/m<N>-<name>` | Team member feature implementation | `feature/m2-donor-search`<br>`feature/m3-hospital-request-form`<br>`feature/m4-blood-inventory-crud`<br>`feature/m5-camp-approvals`<br>`feature/m6-analytics-charts` |
| `fix/<description>` | Bug fixes | `fix/camp-capacity-trigger`<br>`fix/donor-token-expiry` |
| `chore/<description>` | Dependencies, DevOps, refactoring | `chore/ci-cd-and-quality`<br>`chore/update-seed-fixtures` |
| `test/<description>` | Additional test coverage | `test/concurrency-reservations` |
| `docs/<description>` | Documentation updates | `docs/erd-revision-v2` |

### Step-by-Step Branching Workflow
```bash
# 1. Fetch latest remote branches
git fetch origin

# 2. Create and switch to your feature branch from origin/dev
git checkout -b feature/m3-hospital-requests origin/dev

# 3. Work on your code, commit with Conventional Commits
git commit -m "feat(requests): add hospital blood request creation form and api"

# 4. Push to remote
git push -u origin feature/m3-hospital-requests

# 5. Open a Pull Request targeting 'dev'
```

---

## 2. Testing Checklist (What Every Teammate Must Run)

Before creating a Pull Request or requesting a review, run the following automated checks locally:

| Command | What it does | Required Result |
|---|---|---|
| `npm run lint` | Checks JavaScript syntax across scripts and backend | 0 errors |
| `npm run test` | Runs the entire test suite (backend + frontend) | All tests pass |
| `npm run test:backend` | Runs unit, validation, and database integration tests | All tests pass |
| `npm run test:frontend` | Runs React component tests via Vitest | All tests pass |
| `npm run build` | Tests the frontend production Vite build | Bundle generated without errors |
| `npm run test:smoke` | Runs HTTP smoke tests against the running Docker stack | All 5 endpoints return 200 OK |
| **`npm run ci:check`** | **Runs lint + test + build + smoke check in one command** | **Must pass before pushing!** |

---

## 3. Integration Testing — What We Built & How It Works

### Did we add integration testing?
**YES! We have two dedicated layers of integration testing implemented in this project:**

### Layer 1: PostgreSQL Advanced SQL Integration (`backend/test/database-integration.test.js`)
Tests real transactional SQL execution against a live PostgreSQL 16 database (locally on port `5433` or in CI on port `5432`):
1. **Catalog Verification:** Asserts that required views (`v_public_donation_camps`, `v_available_blood_stock`), procedures (`sp_approve_donation_camp`), functions (`fn_reserve_blood_unit`), and triggers exist.
2. **Foreign Key & Constraint Integrity:** Verifies rejection of invalid geography combinations (`fk_location_ds_same_district`) and coordinate pair violations.
3. **Camp Approval Stored Procedure:** Executes `CALL sp_approve_donation_camp(camp_id, staff_id)` and verifies status transitions to `APPROVED` and audit rows are recorded.
4. **Authorization Security:** Asserts that calling approval procedures with unauthorized staff from a different hospital/blood bank fails with SQLSTATE `42501`.
5. **Trigger Capacity Enforcement:** Verifies that trigger `trg_check_camp_registration` rejects donor registrations exceeding camp capacity (`23514`).
6. **Atomic Blood-Unit Reservation:** Verifies `SELECT fn_reserve_blood_unit(...)` locks rows, sets status to `RESERVED`, and trigger `trg_log_blood_unit_status` automatically logs audit movement rows into `inventory_movements`.
7. **Double Allocation Protection:** Proves that concurrent/duplicate reservations for the same blood unit fail safely.
8. **ACID Transaction Rollback:** Proves that when an application transaction fails and rolls back, stock units revert to `IN_STOCK` with zero orphaned movement records.

### Layer 2: Docker Stack Smoke Integration (`scripts/smoke-check.js`)
Tests end-to-end integration across the three Docker containers:
- Browser/Vite Proxy ➔ Express REST API ➔ PostgreSQL Database.
- Verifies live connectivity for `/health`, `/api/v1`, `/locations/provinces`, `/locations/districts`, and `/camps`.

### How to write new integration tests:
- Add your test to `backend/test/` using Node's test runner (`node:test` and `node:assert`).
- Wrap tests in database transactions (`BEGIN` ... `ROLLBACK`) or clean up synthetic rows after execution so tests remain independent and repeatable.

---

## 4. Repository & Project Folder Structure

```text
BloodBridge/
├── compose.yaml                  # Orchestrates PostgreSQL + Express API + Vite Web
├── package.json                  # Root convenience scripts (test, build, lint, ci:check)
├── README.md                     # Project manual
│
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md  # PR review checklist
│   ├── CODEOWNERS                # Module ownership mapping
│   └── workflows/
│       ├── ci.yml                # CI: Frontend, backend, PostgreSQL 16, Docker smoke
│       └── cd.yml                # CD: Builds & publishes images to GHCR on dev push
│
├── database/                     # Owned by Member 1 (Database Lead)
│   ├── migrations/               # Versioned migrations (001, 002, 007, 010)
│   ├── init/                     # Docker volume bootstrap script (00-bootstrap.sh)
│   ├── warehouse/                # Star-schema analytics (004_warehouse.sql)
│   └── experiments/              # Benchmark templates (EXPLAIN ANALYZE)
│
├── backend/                      # Node.js + Express REST API (Members 2, 3, 4, 5)
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   ├── test/                     # Automated tests
│   │   ├── auth.test.js
│   │   ├── validation.test.js
│   │   └── database-integration.test.js
│   └── src/                      # API source code (Layered Architecture below)
│
├── frontend/                     # React 18 + Vite 6 + Vanilla CSS (Member 6 + Team)
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── src/                      # UI source code (Modular Structure below)
│
└── scripts/
    ├── migrate.js                # Migration runner for existing & new databases
    ├── smoke-check.js            # End-to-end stack smoke check
    └── reset-warning.js          # Safety warning for volume resets
```

---

## 5. Architectural Structure to Follow

### A. Backend Architecture (Layered 3-Tier)

Teammates working on backend features should organize `backend/src/` into standard architectural layers:

```text
backend/src/
├── controllers/          # HTTP Layer: parses request, validates input, formats response
│   ├── authController.js
│   ├── campController.js
│   ├── donorController.js
│   ├── hospitalController.js
│   └── inventoryController.js
│
├── services/             # Business Logic Layer: calls transactions, coordinates actions
│   ├── campService.js
│   ├── donorService.js
│   ├── requestService.js
│   └── inventoryService.js
│
├── models/               # Data Access Layer: SQL queries, parameterized statements
│   ├── campModel.js
│   ├── donorModel.js
│   ├── requestModel.js
│   └── inventoryModel.js
│
├── middleware/           # Express middleware
│   ├── auth.js           # JWT verification & active user check
│   ├── role.js           # requireRole('BANK_STAFF', ...)
│   └── validate.js       # Zod schema validation middleware
│
├── routes/               # Routing: binds endpoints to controllers
│   ├── auth.js
│   ├── camps.js
│   ├── donors.js
│   ├── inventory.js
│   ├── locations.js
│   └── requests.js
│
├── utils/                # Helper functions (date formatting, crypto, error classes)
├── db.js                 # PostgreSQL Pool and inTransaction() helper
└── server.js             # Express application setup, error handler, route registration
```

#### Layer Responsibilities:
1. **Routes (`routes/*.js`)**: Define endpoints, attach authentication/authorization middleware, and call controller functions.
2. **Controllers (`controllers/*.js`)**: Validate incoming parameters using Zod. Return HTTP response codes (`200`, `201`, `400`, `403`, `404`). Do not write raw SQL here.
3. **Services (`services/*.js`)**: Execute business logic, manage transaction boundaries via `inTransaction()`, call PostgreSQL stored procedures/functions.
4. **Models (`models/*.js`)**: Contain clean, parameterized SQL queries. Never concatenate SQL strings directly.

---

### B. Frontend Architecture (Component & Page Modularity)

Teammates working on frontend components should structure `frontend/src/` as follows:

```text
frontend/src/
├── components/           # Reusable UI building blocks
│   ├── common/           # Navbar, Footer, Badge, Button, IconTile
│   ├── forms/            # Form inputs, select dropdowns, toggles
│   └── cards/            # StatCard, CampCard, RequestCard, InfoCard
│
├── pages/ (or views/)    # Full role-specific views & pages
│   ├── HomePage.jsx
│   ├── CampsPage.jsx     # Camp & blood-bank search
│   ├── DonorPortal.jsx   # Donor preferences, donation history
│   ├── HospitalPortal.jsx# Emergency request creation and tracking
│   ├── BankPortal.jsx    # Component inventory & reservation management
│   ├── AdminPortal.jsx   # Institutional user administration & analytics
│   ├── LoginPage.jsx
│   └── SignUpPage.jsx
│
├── services/             # API client services calling /api/v1/*
│   ├── apiClient.js      # Base fetch client with JWT header injection
│   ├── authService.js
│   ├── campService.js
│   ├── requestService.js
│   └── locationService.js
│
├── hooks/                # Custom React hooks
│   ├── useAuth.js        # Authentication & session persistence
│   └── useDistricts.js   # Sri Lanka geography lookup hook
│
├── styles/               # Styling tokens & CSS
│   ├── variables.css     # Brand tokens (#C9263E red, #14243A navy, #F6F8FB background)
│   └── styles.css        # Responsive layouts (mobile-first stacked cards)
│
├── App.jsx               # Navigation router and portal state
└── main.jsx              # React DOM mounting
```

#### Frontend Guidelines:
- **Design Tokens:** Always use existing project CSS variables: Primary Red (`#C9263E`), Navy (`#14243A`), Background (`#F6F8FB`), Positive (`#14856A`).
- **Responsive Layouts:** Mobile first (390px phone, 768px tablet, 1440px desktop). On phones, use stacked cards rather than wide desktop tables.
- **API Calls:** Use relative paths (e.g., `/api/v1/camps`). Vite automatically proxies requests to `api:4000` inside Docker. Never hardcode `http://localhost:4000` in React code.
- **Zero Secrets:** Never put database passwords, JWT secrets, or sensitive credentials in frontend files.

---

## 6. Database Migration Rules

1. **Never edit an already executed migration file (`001`, `002`, `007`).**
2. When creating a schema change, add a new sequential file:
   `database/migrations/011_add_feature_name.sql`
3. Always wrap migrations in a transactional block:
   ```sql
   BEGIN;
   -- your SQL DDL statements
   COMMIT;
   ```
4. Run `npm run db:migrate` to apply pending migrations.
5. Get approval from Member 1 (Database Lead) before opening the PR.
