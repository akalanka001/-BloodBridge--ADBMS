# BloodBridge — UI Navigation & Page Control Matrix

**Document Version:** 2.0  
**Audit Date:** 21 October 2026  
**Architecture:** React 18, Vite 6, Hash Routing (`#/role/...`), Pure CSS Design Tokens, Socket.io Client  
**Design Standards:** Navy & Crimson public landing (`#0a192f`, `#b71c1c`), Clean daylight dashboards (`#f8fafc`), High contrast accessibility (WCAG AA).

---

## 1. Role-Based Navigation Routing Map

```
PUBLIC VISITOR:
  #/home ──────────> #/camps ──────────> #/camps/:id ──────────> #/login (or #/register)

AUTHENTICATED DONOR:
  #/donor/dashboard ─┬──> #/donor/profile (Area picker, contact & emergency appeal consent)
                     ├──> #/donor/history (Past synthetic donation records)
                     └──> #/donor/camps (My registered camps, cancel registration)

HOSPITAL MEDICAL STAFF:
  #/hospital/requests ──┬──> #/hospital/requests/new (Multi-item line builder, urgency selector)
                        └──> #/hospital/requests/:id (Progress tracker: requested vs reserved vs received)

BLOOD BANK LABORATORY STAFF:
  #/bank/inventory ─────┬──> #/bank/units (Component release, quarantine & expiry filters)
                        ├──> #/bank/transfers (Inter-bank transfer dispatch & receipt wizard)
                        ├──> #/bank/requests (Cluster requests, reservation picker)
                        └──> #/bank/camps/manage (Camp review, approval, attendance check-in)

SYSTEM ADMINISTRATOR:
  #/admin/dashboard ────┬──> #/admin/institutions (Hospitals, Blood Banks, Cluster mapping)
                        ├──> #/admin/staff (Membership assignment & revocation)
                        ├──> #/admin/analytics (Star schema OLAP reports, demand forecasts)
                        └──> #/admin/benchmarks (PostgreSQL EXPLAIN ANALYZE live comparisons)
```

---

## 2. Interactive Page Matrix & Control Specifications

| Logical Hash Route | Role Allowed | Primary Controls & Inputs | Async Loading State | Empty / Zero State | Error State | Real-Time Socket.io Subscriptions |
|---|---|---|---|---|---|---|
| `#/` or `#/home` | Public | • Search camps by District/Town<br>• Blood group availability preview<br>• "Become a Donor" CTA | Skeleton cards with shimmering pulse | "No urgent appeals in your area." | "Unable to load real-time figures. Showing offline cache." | `camps`: updates public camp counters.<br>`stock:low_alert`: updates urgent appeals. |
| `#/camps` | Public | • District dropdown (auto-cascading)<br>• Date range picker<br>• Camp card with remaining seats counter | Grid skeleton with pulsing badges | "No scheduled camps match the selected filters." | Alert banner with retry button | `camp:capacity_update`: decrements remaining seat count live without refresh. |
| `#/camps/:id` | Public / Donor | • Camp details & coordinates<br>• Coordinating Blood Bank badge<br>• "Register to Donate" button | Spinner overlay | "Camp not found or has been completed." | 404 message or permission barrier | `camp:${campId}`: live counter of registered donors. |
| `#/login` | Public | • Email input<br>• Password input<br>• Role redirect detector | Submit button disabled with spinner | N/A | Inline red banner: "Invalid credentials or account inactive" | None |
| `#/register` | Public | • Full Name, Email, Phone<br>• Password (min 10 chars meter)<br>• Province ➔ District ➔ DS Division cascading dropdowns | Form submission spinner | N/A | Validation summary under affected inputs; 409 conflict modal | None |
| `#/donor/dashboard` | DONOR | • Eligibility status countdown (120-day interval)<br>• Contact preference toggle<br>• Emergency appeal toggle | Metric skeleton tiles | "Welcome! Complete your profile to get matched." | Banner: "Unable to load donor details." | None |
| `#/donor/profile` | DONOR | • Residence Area selector (District / DS / optional GN)<br>• Contact consent toggle<br>• Camp notification opt-in toggle | Saving indicator on toggle | N/A | Reverts toggle state and displays toast error | None |
| `#/hospital/requests` | HOSPITAL_STAFF | • Requests table (Urgency, Needed-by, Status)<br>• Filter by Status (OPEN, PARTIALLY_FILLED, FULFILLED)<br>• "New Request" button | Shimmering table rows | "No blood requests placed yet. Click New Request." | Error notification card | `emergency:broadcast`: shows active broadcasts. |
| `#/hospital/requests/new` | HOSPITAL_STAFF | • Urgency radio (Routine, Urgent, Critical)<br>• Needed-by future datetime-local picker<br>• Multi-line item repeater: Blood Type, Component, Units<br>• Notes textarea | Submitting button lock | N/A | Line-item validation errors (units > 0, future date mandatory) | None |
| `#/hospital/requests/:id` | HOSPITAL_STAFF | • Progress meter: Requested vs Reserved vs Received<br>• Attached blood units list<br>• "Confirm Receipt" button<br>• "Cancel Request" button | Radial progress spinner | N/A | 403 Forbidden if not assigned to requesting hospital | None |
| `#/bank/inventory` | BANK_STAFF | • Blood Type & Component grid<br>• Expiry alerts (< 5 days, expired)<br>• Release status filter (QUARANTINED, RELEASED)<br>• "Process Unit Release" modal | Grid loader | "No units currently in stock for selected criteria." | Error toast | `stock:low_alert`: triggers badge animation when threshold breached. |
| `#/bank/transfers` | BANK_STAFF | • Transfer code search<br>• "Create Inter-Bank Transfer" button<br>• "Dispatch Units" action<br>• "Receive Units" action | List skeleton | "No inter-bank transfers active." | Action conflict toast (e.g. unit not released) | `transfer:status_update`: updates transfer stage in real time across source/target banks. |
| `#/admin/analytics` | ADMIN | • Time grain selector (Daily, Weekly, Monthly)<br>• Cluster and District drilldowns<br>• Demand vs Fulfillment bar charts | Chart loading shimmer | "No analytical snapshots recorded for date range." | Database query failure banner | None |
| `#/admin/benchmarks` | ADMIN | • "Run Benchmark" button (B-Tree vs Hash, CLUSTER analysis)<br>• Execution time (ms) chart<br>• Buffers hit vs read metrics | Benchmarking progress bar | "Select a benchmark scenario and click Run." | Query timeout error | None |

---

## 3. UI Design Tokens & Theme Principles

1. **Brand Colors**:
   - Primary Crimson: `#b71c1c` (accent, badges, urgent indicators)
   - Deep Navy: `#0a192f` (landing navbar, hero gradients, headers)
   - Slate Surfaces: `#f8fafc` (card backgrounds, form controls)
   - Dark Slate Text: `#0f172a` (high contrast readable copy)
   - Success Emerald: `#059669` (passed assessments, fulfilled status)
   - Warning Amber: `#d97706` (quarantine, impending expiry)
2. **Form Accessibility Rules**:
   - Every input has an explicit associated `<label>`.
   - Error messages are rendered with `aria-live="polite"` and clear red borders.
   - Cascading dropdowns (Province ➔ District ➔ DS ➔ GN) automatically reset child selections when parent values change to prevent orphan geographical codes.
3. **Data Protection & Privacy Rules**:
   - Public pages display only aggregate figures (e.g. "45 units available in Colombo Cluster") and never individual donor names or phone numbers.
   - Medical assessment notes and deferral reasons are strictly hidden from donor portals and public endpoints.
