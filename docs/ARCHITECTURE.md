# Architecture & Design Decision Record

## ADR-001: One repository, domain-driven modular layers
The repository is organized into `frontend/`, `backend/`, and `database/` with Docker Compose and local-runner support.

### Backend Feature-Based Modular Architecture
Express backend (`backend/src/`) is decomposed into domain modules:
```
backend/src/
├── infrastructure/         # Shared infrastructure
│   ├── db.js               # PostgreSQL pool & transaction runner
│   ├── auth.js             # JWT verification & role authorization
│   ├── errors.js           # Standardized ApiError hierarchy
│   ├── outbox.js           # Transactional event outbox logger & processor
│   └── socket.js           # Real-time WebSocket event broadcaster
├── modules/
│   ├── identity/           # /api/v1/auth (registration, login, JWT)
│   ├── geography/          # /api/v1/locations (provinces, districts, DS/GN)
│   ├── donors/             # /api/v1/donors (profile, consents, claims)
│   ├── donor-intake/       # /api/v1/donor-intake (walk-ins, visits, assessments, donations)
│   ├── requests/           # /api/v1/requests (multi-item emergency blood requests)
│   ├── inventory/          # /api/v1/inventory (v_available_blood_stock, reservations)
│   ├── transfers/          # /api/v1/transfers (inter-bank transfer dispatch & receipt)
│   ├── camps/              # /api/v1/camps (camp proposals, approvals, registrations)
│   ├── analytics/          # /api/v1/analytics (operational facts & stock distribution)
│   └── admin/              # /api/v1/admin (donor account claim reviews)
└── server.js               # HTTP and Socket.IO server entrypoint
```
Each domain module contains:
- `*.validation.js`: Zod schema validation
- `*.repository.js`: Parameterized SQL execution & database transactions
- `*.service.js`: Domain business logic & event triggers
- `*.controller.js`: Express request/response mapping
- `*.routes.js`: Route definitions with authentication and role middleware

### Frontend Modular Architecture
The React application (`frontend/src/`) is structured into distinct architectural layers:
```
frontend/src/
├── app/                    # Root App coordinator and global routing
├── layouts/                # Shared layout templates (MainLayout)
├── features/               # Feature-specific components, pages, and forms
│   ├── public/             # Hero, Features, Home landing
│   ├── camps/              # CampCard, CampsPage (search & district filter)
│   ├── auth/               # RegisterPage, LoginPage
│   └── portal/             # Portal wrapper, role dashboards, intake forms
├── components/
│   ├── ui/                 # IconTile, Badge, Heading, SectionTitle
│   └── navigation/         # Navbar (mobile responsive), Footer
├── lib/                    # Shared API client and navigation helpers
├── hooks/                  # Custom React hooks (session, locations)
├── styles/                 # BloodBridge design system CSS tokens
├── test/                   # Vitest unit and integration test specs
└── socket.js               # Client Socket.io integration with auto-auth
```

---

## ADR-002: Hybrid Donor Registration Model (Dual Enrollment)
In accordance with Sri Lankan National Blood Transfusion Service (NBTS) operating reality, BloodBridge supports two distinct donor enrollment paths:

### Path A: Online Donor Self-Registration
- New donor registers voluntarily through the web application.
- Password is cryptographically hashed with bcrypt (12 rounds).
- Blood group may be initially marked as unverified or unknown.
- Explicit contact and camp notification consent is stored and tracked in `donor_consents`.
- Can submit an account claim (`POST /api/v1/donors/me/link-claims`) to link an existing offline staff-created record.

### Path B: Staff-Assisted Walk-in Intake
- Visitors attending a hospital blood bank or mobile donation camp may not possess an online account.
- Authorized staff search existing donor records using a privacy-preserving normalized hash (`national_id_hash` via SHA-256).
- If no existing record exists, staff enroll the visitor with `donors.user_id = NULL` and `registration_origin = 'STAFF_WALKIN'` or `'CAMP_WALKIN'`.
- **Zero fake emails or default passwords**: Walk-in donors are never assigned synthetic user accounts.
- Staff check in the donor via `donor_visits` (`purpose = 'DONATION'`).
- Invariant: A visit does **not** create a donation.
- A clinical assessment (`donor_assessments`) must be recorded (`status = 'PASSED'`).
- Once assessed, collection is recorded in `donations`, transitioning visit status to `COLLECTION_COMPLETED`.
- Blood units derived from collection remain `QUARANTINED` until laboratory screening releases them.

### Account Claim and Linking Workflow
- When a previously enrolled walk-in donor registers an online account, they submit an account claim (`donor_account_claims`).
- Procedure `sp_approve_donor_account_claim` locks both donor and user records, validates that neither is already linked, atomically updates `donors.user_id`, marks the claim `APPROVED`, logs an audit entry, and emits a `DONOR_ACCOUNT_LINKED` outbox event.
- All historical donations remain attached to the same permanent donor UUID.

---

## ADR-003: Database-First PostgreSQL Core
- OLTP database: PostgreSQL 16/18 `bloodbridge`.
- OLAP warehouse: `bloodbridge_warehouse` star schema for analytics.
- Concurrency and integrity are enforced via PostgreSQL procedures, triggers, views, and constraints:
  - `sp_dispatch_blood_transfer`: Validates source bank authority, unit statuses, and updates custody atomically.
  - `sp_receive_blood_transfer`: Enforces target bank receipt authority, transitions units to target stock.
  - `fn_reserve_blood_unit`: Atomic row-level locking (`FOR UPDATE`) preventing double-allocation of units.
  - `trg_log_blood_unit_status`: Automatically audits all stock movements to `inventory_movements`.
  - `trg_log_donor_consent_change`: Automatically tracks all consent modifications in `donor_consent_history`.
  - `fn_match_potential_donors`: Algorithmic outreach candidate query excluding deferred candidates and donors with `contact_allowed = false`.

---

## ADR-004: Socket.io Real-Time Synchronization
- Authentication: Handshake authenticates JWT Bearer tokens matching the database user session.
- Private Rooms: Dynamic room joining based on verified user roles and institution IDs (`role:BANK_STAFF`, `role:HOSPITAL_STAFF`, `bank:<id>`, `hospital:<id>`).
- Channels:
  - `emergency:broadcast`: Urgent/critical blood requests emitted to blood banks.
  - `camp:capacity_update`: Real-time registration counters synchronized across connected browser clients.
  - `transfer:status_update`: Real-time custody updates for inter-bank movements.
