# BloodBridge — Implemented API (starter, v0.1)

**Base URL:** http://localhost:4000/api/v1 (from host), or `/api/v1` through the Vite frontend proxy (recommended).
**Transport:** JSON. **Authentication:** `Authorization: Bearer <JWT>` for private routes. Date-times must include UTC/offset (`2026-11-07T09:00:00+05:30`).
**Important:** The older `PLANNED_OPENAPI.yaml` is a roadmap; it includes additional operations not implemented in this starter. This file is the actual route list.

| Method | Route | Role | Notes |
|---|---|---|---|
| GET | `/health` (not under `/api/v1`) | Public | Returns DB connectivity; 503 if DB unavailable |
| GET | `/api/v1` | Public | Service identity and status |
| POST | `/auth/register-donor` | Public | Creates `users` + `donors` in **one transaction**; validates age >= 18 & weight >= 50 kg; 201 |
| POST | `/auth/login` | Public | Authenticates email case-insensitively; creates active session; returns JWT and rotating refresh token |
| POST | `/auth/refresh` | Public | Rotates hashed refresh token and issues fresh short-lived access token |
| POST | `/auth/logout` | Public | Revokes session token in database |
| GET | `/auth/me` | Logged-in | Returns full user profile, role, email status, and donor/membership details |
| GET | `/auth/memberships` | Logged-in | Returns assigned hospital / blood bank institutional memberships |
| POST | `/auth/forgot-password` | Public | Dispatches single-use hashed password reset token (1 hr expiry) |
| POST | `/auth/reset-password` | Public | Verifies token, updates password hash, and revokes prior active sessions |
| POST | `/auth/verify-email` | Public | Verifies single-use email token and marks account verified |
| POST | `/auth/invite-staff` | Admin | Grants specific role & hospital/blood bank association; generates invitation token |
| POST | `/auth/accept-invite` | Public | Redeems invitation token and registers authorized staff account |
| GET | `/locations/provinces` | Public | Sri Lanka provinces (all 9 seeded) |
| GET | `/locations/districts?provinceCode=WP` | Public | Sri Lanka districts (all 25 seeded), optional provinceCode filter |
| GET | `/locations/ds-divisions?districtCode=CO` | Public | DS divisions for district; validates province scoping if provided |
| GET | `/locations/gn-divisions?districtCode=CO&dsCode=MAH` | Public | Verified sample GN divisions; returns `{ data: [] }` gracefully when unseeded |
| GET | `/donors/me` | Donor | Profile + donation count |
| PATCH | `/donors/me/preferences` | Donor | Availability and camp opt-in |
| GET | `/camps?districtCode=CO` | Public | Reads `v_public_donation_camps`; only approved future camps |
| GET | `/camps/:id` | Public | Public view only |
| POST | `/camps` | Bank staff | Draft associated with staff's bank |
| POST | `/camps/:id/submit` | Bank staff | Draft -> pending |
| POST | `/camps/:id/approve` | Bank staff | Calls PostgreSQL `sp_approve_donation_camp` in a transaction |
| POST | `/camps/:id/registrations` | Donor | Trigger checks capacity and approval |
| GET | `/requests` | Hospital staff | Requests at assigned hospital(s) |
| POST | `/requests` | Hospital staff | Transactionally inserts header and multiple line items |
| GET | `/inventory/summary` | Hospital/bank/admin | Reads `v_available_blood_stock`, bank staff scoped to assigned bank(s) |
| POST | `/inventory/reservations` | Bank staff | Calls transaction-safe `fn_reserve_blood_unit`, trigger writes movement |
| POST | `/donor-intake/lookup` | Bank staff | Privacy-preserving keyed HMAC donor search (NIC, phone, name) |
| POST | `/donor-intake/walk-ins` | Bank staff | Staff-assisted walk-in donor enrollment without online credentials; explicit opt-in consent |
| POST | `/donor-intake/visits` | Bank staff | Register in-person donor visit (CHECKED_IN) tied to staff's assigned bank |
| POST | `/donor-intake/visits/:id/assessment` | Bank staff | Record clinical assessment (PASSED, DEFERRED) with medical staff authorization |
| POST | `/donor-intake/collections` | Bank staff | Atomic donation collection locked to passed visit; prevents duplicate collections |
| POST | `/donors/me/link-claims` | Donor | Submit identity claim linking offline walk-in record to verified online account |
| GET | `/admin/donor-link-claims` | Admin | List pending identity link claims requiring administrative review |
| POST | `/admin/donor-link-claims/:id/approve` | Admin | Atomically reconcile online account with walk-in donor record preserving history |
| POST | `/admin/donor-link-claims/:id/reject` | Admin | Reject invalid or fraudulent claim with logged audit reason |
| POST | `/transfers/:id/dispatch` | Bank staff | All-or-nothing atomic unit validation and dispatch by authorized source-bank staff |
| POST | `/transfers/:id/receive` | Bank staff | Acknowledge receipt with condition notes (3-arg `sp_receive_blood_transfer`) by destination staff |

## Example requests

### 1. Create a donor account

```bash
curl -X POST http://localhost:4000/api/v1/auth/register-donor \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Demo Donor","email":"donor@example.test","password":"choose-a-long-demo-password","districtCode":"CO","dsCode":"MAH","bloodTypeCode":null,"availableForContact":false,"campNotificationsOptIn":true}'
```

Login:

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"donor@example.test","password":"choose-a-long-demo-password"}'
```

Use the returned JWT as `Authorization: Bearer ...` for subsequent calls.

### 2. Create a blood request (hospital staff only)

`POST /api/v1/requests`

```json
{
  "hospitalId": 1,
  "urgency": "URGENT",
  "neededBy": "2026-11-21T09:00:00+05:30",
  "notes": "Academic sample only",
  "items": [
    {"bloodTypeCode": "O-", "componentCode": "RBC", "unitsRequested": 2}
  ]
}
```

Hospital IDs are returned by the optional fixture script. A staff member can create requests only for their institution.

### 3. Create a donation camp (bank staff only)

`POST /api/v1/camps`:

```json
{
  "title": "DEMO University Donation Camp",
  "organizerId": 1,
  "bloodBankId": 1,
  "locationId": 1,
  "startsAt": "2026-11-21T09:00:00+05:30",
  "endsAt": "2026-11-21T14:00:00+05:30",
  "capacity": 80,
  "publicContact": "Demo organizer contact"
}
```

IDs here are examples; use the IDs from your own database. Staff calls `POST /camps/:id/submit` then `POST /camps/:id/approve` (coordinating bank only).

### 4. Reserve one released unit (bank staff only)

`POST /api/v1/inventory/reservations`:

```json
{"requestItemId":"<actual-uuid>","bloodUnitId":"<actual-uuid>"}
```

The database ensures the unit is **released, in stock, unexpired, same exact blood type and component, authorized bank staff**, and not already reserved. No transfusion compatibility or donor eligibility decision is made by the application.

## Errors and access

- `400`: validation or constraints fail, `401`: invalid or absent JWT, `403`: wrong role/institution, `404`: not found, `409`: duplicates or invalid state, `500`: unexpected error.
- Authentication is checked against active users at each request. Sensitive institution operations must additionally check an active staff membership.
- No public disclosure of personal donor data, donation history, or blood-unit identifiers.
- **Not implemented:** stock release workflow, full fulfillment, GN master-data import, notifications/SMS, advanced admin dashboards, automated ETL, scheduled campaigns, real clinical validation. These remain team tasks.
