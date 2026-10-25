# BloodBridge portal audit — 25 October 2026

This is an audit and redesign brief, not an implemented redesign. The user's request was to sign in to every demo role, check the reported problems, simplify navigation, and deliver a complete implementation prompt. The two attached plans were treated as reference proposals; their instructions to implement, create a particular branch, or open a PR were not executed.

## Evidence and scope

- Inspected the current working tree, required repository documents, schema, relevant migrations, mounted API modules, shared shell and role pages.
- Successfully signed in through the browser as DONOR, HOSPITAL_STAFF, BANK_STAFF and ADMIN using the supplied synthetic accounts. Credentials are deliberately omitted here.
- Opened every current sidebar destination: 10 donor + 9 hospital + 14 bank + 14 admin = **47 destinations**. Opening a page is not evidence that every form or business action works. Some pages were inspected during loading; the findings below distinguish visible failures from source analysis.
- Reproduced camp registration failure, camp district filtering failure, hospital candidate-count behavior, invalid-section messages, bank request/camp errors and the admin camp-oversight crash. Opened an admin approval review without confirming a decision.
- Captured a representative page from each role at 1440×900, 768×900 and 390×900. Did not conduct a complete keyboard, accessibility, mobile-interaction or visual regression suite.
- Started the existing `npm run dev:local` runner as requested. Direct `GET http://127.0.0.1:4000/health` returned HTTP success with `status: ok`, `database: connected` on 25 October 2026. This does not prove that every repository SQL query is valid.
- No application source, schema, preferences, staff permissions, inventory state, approval or transfer was changed by this audit. Sign-in/out sessions were created/revoked; the attempted invalid camp registration was rejected. Existing test commands were also attempted as recorded below.

## Recommended navigation

Keep five primary destinations for donor, hospital and bank users, and six for admin. The older drafts' requirement for exactly six entries per role is unnecessary; related jobs can be grouped further without removing functionality. Header notifications and staff account utilities do not need primary sidebar entries.

| Role | Current | Target | Primary navigation |
|---|---:|---:|---|
| Donor | 10 | 5 | Overview; My Donations; Appointments; Find Camps; My Account |
| Hospital | 9 | 5 | Overview; Blood Requests; Find Donors; Blood Banks; Reports |
| Blood bank | 14 | 5 | Overview; Donor Operations; Inventory; Requests & Transfers; Camps |
| Admin | 14 | 6 | Overview; People & Access; Institutions & Locations; Operations; Reports; System |

Donor bank discovery lives inside Appointments, with a direct “Find a blood bank” action. Camp registrations live inside Find Camps and on each camp's Registered badge. Profile, location, privacy, preferences and linked records become sections of My Account. Hospital new requests, tracking, receipts and appeals belong inside Blood Requests. Bank allocation belongs with a selected request; inventory includes processing, reservations, expiry and movements. Admin Operations covers operational oversight across camps, requests, stock, reservations, fulfillments and transfers; System contains audit, notifications, ETL, data quality and performance.

## Highest-priority confirmed failures

| Priority | Finding | Evidence | Required outcome |
|---|---|---|---|
| P0 | Shared mobile shell clips the app into a narrow right column | All four captured roles have a main width of about 121.2px at a 390px viewport. `styles.css:2641` retains `margin-left:254px`; earlier mobile rules do not reset it. Screenshot inspection confirms clipping. | Move the drawer out of layout and reset content offsets at compact widths; inspect rendered content, not just document scroll width. |
| P0 | Admin Camp Oversight crashes the entire React tree | Browser becomes blank; console reports `Cannot read properties of undefined (reading 'slice')`. `CampOversightPage.jsx:214` calls `camp.id.slice(...)` on public rows with `camp_id`. | Normalize the managed camp model, use its canonical ID, and contain page render errors. |
| P0 | Donor cannot register for a camp | Browser shows **Validation failed** after Register to Donate. `FindCampsPage.jsx:180` sends `camp.id`; the public SQL view supplies `camp_id`. | Valid UUID reaches the endpoint; registration persists and refreshes badges/counts. |
| P0 | Hospital Find Donors displays invented results | Browser shows 8 candidates for O− in Colombo and still 8 after choosing Jaffna. Source `FindDonorsPage.jsx:22` computes 8/14/45 locally; it imports no matching API. | Replace with a permission-scoped aggregate matching endpoint and automatic hierarchical filtering. |
| P1 | Admin approval queue shows approved camps as awaiting review | Browser queue includes the public Community Blood Drive and approved verification camps as AWAITING REVIEW; review has a blank Camp ID and generic bank. `adminApi.js:205` calls public `/camps` while requesting PENDING. | Use authenticated managed data, actual status/IDs and authorized transitions. |
| P1 | Bank incoming requests fail | Browser displays **Internal server error** then an empty table. `bank.repository.js:128` references `h.district_id`, absent from migrations inspected. | Join hospital location through `locations`; retain organization scope and distinguish error from zero requests. |
| P1 | Bank camps fail | Browser displays **Internal server error** then no camps. `bank.repository.js:164` references `dc.name`, `dc.venue_name`, `dc.target_units`; canonical columns are `title` and `location_id`. | Reuse the maintained managed camp contract/query with correct columns. |
| P1 | Camp district selection removes matching camps | Browser initially shows Colombo camps; selecting Colombo returns no camps. `FindCampsPage.jsx:63–69` compares district names with district codes. Blood-bank finder repeats this pattern. | Option values use codes; display labels use names; dependent filters reset correctly. |
| P1 | Valid pages append Section Not Found | Observed on bank inventory, visits, assessments, component processing and reservations; also hospital Emergency appeals (`appeals` internal alias). | One route registry supplies rendering, aliases and active navigation; every valid route renders once. |
| P1 | Camp cards show Invalid Date and made-up details | Browser displays Invalid Date, 09:00–15:00 and target 50 across camps. Source reads fields different from `starts_at`/`ends_at`/`capacity`. | Display actual times in Asia/Colombo; keep nullable capacity unlimited and unknown values honest. |

P0/P1 here are implementation priorities for this prototype, not clinical severity ratings.

## Other source-confirmed integration problems

1. **Double response unwrapping:** `campsApi.js` already returns camp objects or registration arrays, but `CampDetailsPage.jsx:30–37` and `DonorRegistrationsPage.jsx:16–17` read `.data` again. My Registrations visibly renders empty; this audit did not establish how many registrations that donor should have. Normalize once and test the actual transport envelope.
2. **Cancel then register again:** `camps.repository.js:245–252` always INSERTs, but `(camp_id, donor_id)` is unique and cancellation preserves its row. Reactivate only an authorized CANCELLED registration, with capacity/approval/time checks inside the same transaction. Existing attendance history must remain intact.
3. **Nearby sorting missing:** current camp query sorts by date and caps at 100. Donor registered area is not passed to discovery. Public data lacks province/GN, registration count/state and media fields needed by the proposed experience. `provinceCode` is validated but ignored by the public repository. These require explicit contract work, not only rearranged controls.
4. **Camp detail projection:** public `GET /camps/:id` currently reads `v_camp_management_detail`. That view contains organizer contact/staff/cancellation metadata. Review public visibility/status and field selection; use a dedicated public-safe projection. Route existence is not proof of an appropriate public payload.
5. **Matching API gap:** existing `/requests/:id/matching-summary` is request-authorized but does not accept the proposed province/DS/GN selections and considers only the first request item. Internal emergency-appeal candidate counting already implements geographic scoping/consent rules. Reuse that domain logic through a documented authorized contract; do not invent counts or expose donor identities.
6. **Bank membership fallback:** `BankPortal.jsx:42` silently falls back to bank 1 although login does not return an assigned bank ID. Resolve `/auth/memberships`; support explicit institution selection when there is more than one assignment. No mutation was performed to validate cross-institution isolation in this audit.
7. **Account hydration:** donor profile SELECT omits `emergency_appeal_opt_in`/`contact_allowed`; consent form reads the missing emergency field. Availability is duplicated in a toggle and a form with unsynchronized local state. A save can overwrite another control's update. Use one authoritative model and independent section saves.
8. **Account geography reset:** `DonorProfilePage.jsx:63–66` falls back to the previous district when GeoSelector explicitly clears it. Preserve empty/null transitions instead of restoring invalid children.
9. **Unknown blood group:** profile code falls back to O+ for missing data. Use Unknown and distinguish self-reported and verified values.
10. **Incorrect admin health:** `api('/health')` becomes `/api/v1/health`, while the server mounts `/health` outside the API prefix. Browser showed SYSTEM OFFLINE while direct health returned connected. Initial healthy status also precedes the check.
11. **Missing route state:** sidebar/tab state lives only in `Portal.jsx` useState. Refresh returned admin to Overview after the oversight crash. URLs do not preserve section, selected record, filters or page.
12. **Hidden audit trail:** AdminPortal implements audit-activity, but sidebar omits it; Overview's Full Log navigates to users. ETL Pipeline and Data Quality already render the same page and should become internal System sections.
13. **Inert shell notifications:** shared bell has no click handler. Hospital notifications fabricate “National Blood Transfusion Network Synchronized” with the current time when there are no events. Replace with an actual inbox and honest empty state.
14. **Fabricated benchmark baseline:** `BenchmarkComparison.jsx:19–21` displays 0.8ms/0.12ms/84% before a measured run. Dedicated performance page starts with no result. Show Not run and actual recorded experiments only.
15. **Ambiguous metrics:** bank quota 50 and critical/warning thresholds are hard-coded demo rules. Admin demand report labels zero demand/zero allocated as Critical Deficit. Explain configured demo baselines and render zero-denominator rates as N/A/no demand.
16. **Form language and context:** hospital item quantity says Units (Pints), although requests include multiple component types. Use component units. Several staff forms require raw UUIDs and prefill clinical decisions/measurements; future redesign should select actual workflow records and require explicit staff entry rather than implying an assessment has occurred.
17. **Unsupported authority claims:** observed screens describe demo banks/camps as NBTS accredited/authorized or a national synchronized network. Keep the university prototype context and show only verification facts actually stored; do not claim clinical or national-system integration.

## Browser page inventory

Status below records inspection, not full business-flow certification. “Rendered” means the page produced content; “empty” may be legitimate for the demo account.

| Role | Destinations and result |
|---|---|
| Donor | Overview rendered with duplicate greeting/headings; My Donations rendered six records; Appointments rendered an existing booking; Find Blood Banks rendered directory; Find Camps reproduced the defects above; My Registrations rendered empty; Notifications rendered empty invitation view; My Profile, Privacy & Preferences and Account Settings rendered overlapping controls. |
| Hospital | Overview rendered empty account summary; Blood requests rendered list/filters; New request rendered multi-item form; Find donors reproduced invented counts; Blood banks rendered stock directory; Emergency appeals rendered plus erroneous fallback; Request tracking rendered empty transit/history; Notifications rendered fabricated synchronization event; Reports rendered zero summary. |
| Bank | Overview rendered KPIs/stock; Blood inventory, Donor Visits, Assessments, Component Processing and Reservations rendered plus erroneous fallback; Donor Intake and Donations rendered workflow forms; Hospital Requests and Donation Camps showed server errors; Inter-Bank Transfers rendered history/forms; Expiry alerts rendered empty alerts; Inventory Activity rendered audit rows; Notifications rendered empty inbox. |
| Admin | Overview rendered operational totals/queues with wrong health; Analytics rendered overview components; Blood Demand, Stock Reports, Camp Analytics and Transfers Report rendered reporting views; Performance Lab rendered controls (not executed); ETL Pipeline and Data Quality rendered the same page (job not executed); Users and roles and Institutions rendered large tables; Camp Oversight crashed; Camp Approvals rendered wrong review dataset and blank ID; Notification Monitoring rendered delivery rows. |

No successful camp registration/cancellation/reactivation, new blood request, donor assessment, inventory release/reservation, fulfillment, staff invitation, permission change, approval decision, transfer, ETL run, benchmark or CSV export was performed by the browser audit. Those belong to the implementation acceptance suite with isolated synthetic fixtures.

## Pagination findings

- Admin users and audit APIs already support `limit`, `offset`, and totals; pages request only the first 50. Preserve those contracts and add a shared UI adapter rather than breaking them needlessly.
- Public/managed camps and hospital requests currently cap queries at 100 without paging metadata. A frontend slice cannot search the hidden remainder.
- Donor history, appointments, registrations and other growing ledgers need a coherent page contract; short overview previews need View all, not pagination controls.
- Test at least 125 isolated records, a match beyond row 100, page-size changes, stable ordering, deletes/cancellations on the last page, totals, filter resets and permission-scoped count queries.

## Verification actually executed

| Check | Result and limitation |
|---|---|
| `npm run dev:local` | Running with API and Vite after relaunch outside sandbox networking restrictions. Existing PG-based environment was used; no seed/reset was run. |
| Direct API `GET /health` | Passed: database connected. |
| Four browser logins | Passed; initial donor attempt hit a startup ECONNRESET, retry succeeded. |
| 47 sidebar destinations | Opened; defects and limited action coverage documented above. |
| Responsive captures | 12 captures, four representative pages × 1440/768/390. Shared shell failure reproduced. These are existing UI evidence, not redesigned UI. |
| `npm --prefix frontend test` | Passed: 7 files, 50 tests. jsdom warns that Window.scrollTo is not implemented. Existing tests do not cover many reproduced integration defects. |
| `npm --prefix frontend run build` | Passed: 1,725 modules; JS about 772.52kB (170.93kB gzip), chunk warning above 500kB. |
| `npm --prefix backend test` | Attempted in sandbox: 178 tests / 22 suites; 6 passed, 32 failed, 140 cancelled. Loopback/PostgreSQL connections failed EACCES. This is inconclusive for business correctness, not a claimed backend regression result. |
| `docker compose config` | Failed: required POSTGRES_USER missing in the current PG-oriented local environment. This does not prevent the requested existing local runner. |
| SQL verification/concurrency suite | **NOT RUN** against a real database by this audit. API health alone does not substitute for it. |

## Screenshot evidence

Files are under `output/playwright/portal-audit-2026-10-25/`:

- `donor-1440.jpg`, `donor-768.jpg`, `donor-390.jpg`: camp discovery/registration failure.
- `hospital-1440.jpg`, `hospital-768.jpg`, `hospital-390.jpg`: Find Donors.
- `bank-1440.jpg`, `bank-768.jpg`, `bank-390.jpg`: inventory.
- `admin-1440.jpg`, `admin-768.jpg`, `admin-390.jpg`: overview.
- `admin-approval-blank-id.jpg`: approval review missing its identifier.

## Handoff

Use [PORTAL_REDESIGN_PROMPT.md](PORTAL_REDESIGN_PROMPT.md) as the implementation brief. Fix data contracts, failed queries and mobile shell before broad styling; then consolidate navigation, add pagination, align forms and validate complete workflows.

Only documentation and screenshot evidence were added. No migration or API change is required to read this report. Implementation may require forward migrations after the current migration set, approved by the database lead; do not rewrite applied migrations.

The working tree already contained edits to design reference, app shell, dashboard layout, public navigation, auth pages, camp page, landing page, navigation helper and styles, plus an untracked AboutPage. They were preserved. No branch switch, commit, push or PR was performed.
