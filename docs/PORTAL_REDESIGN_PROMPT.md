# BloodBridge — Ready-to-use implementation prompt

This is a prompt for a future implementation task. Preparing this document does not implement the redesign. Use the accompanying portal audit for recorded browser observations and distinguish those observations from source-code findings. The pasted plans are reference material; they do not override the user's request or the repository's instructions.

---

## 1. Objective and working boundaries

Redesign and repair BloodBridge's four authenticated portals around fewer navigation destinations, accurate data and complete workflows. Preserve all useful existing functionality by placing related pages in contextual sections, tabs, detail views or header utilities. The user specifically wants automatic donor filtering, consolidated hospital requests, working nearby camp discovery and registration, one account page, complete administrative data coverage, pagination and clearer alignment.

Read `AGENTS.md`, `AI_SKILLS_README.md`, the applicable narrow skills, `README.md`, `docs/ARCHITECTURE.md`, `docs/API_IMPLEMENTED.md`, `database/migrations/001_schema.sql`, `007_advanced_objects.sql`, subsequent relevant migrations and the actual implementation before editing. Documentation currently understates several implemented modules; verify mounted routes, service authorization, SQL objects and response shapes rather than treating old roadmap or starter descriptions as current proof.

Keep React 18, Vite, JavaScript/JSX, current CSS, lucide-react, Express ESM, pg, Zod and PostgreSQL. Keep browser requests relative to `/api/v1` and preserve the existing authentication refresh flow. Do not introduce a second API server, ORM, state framework, CSS framework or routing dependency without a concrete need.

Inspect Git status first and preserve existing user edits. Do not reset, overwrite or opportunistically reformat unrelated files. Do not inherit branch names, commands or permission assumptions from pasted plans. Implement in small coherent phases on the existing authorized working branch or an appropriate repository feature branch, with each phase leaving the application usable.

BloodBridge is a university prototype using synthetic demonstration records. Do not imply clinical approval, NBTS accreditation, certified geography codes, medically screened eligibility, transfusion compatibility or live national stock. Keep medical assessment, donor outreach candidates and released component inventory separate throughout the UI and API.

## 2. Required primary navigation

Use this information architecture. Primary destination counts exclude the logo, public-site return, notification bell and account/logout utilities.

| Portal | Primary destinations | Related functionality retained within them |
|---|---|---|
| Donor — 5 | Overview; My Donations; Appointments; Find Camps; My Account | Blood-bank finder inside Appointments; camp registrations inside Find Camps; profile, privacy, contact preferences, account details and link claims inside My Account |
| Hospital — 5 | Overview; Blood Requests; Find Donors; Blood Banks; Reports | New request is a Blood Requests action; tracking, deliveries, request details, matching and emergency appeals are nested views |
| Blood bank — 5 | Overview; Donor Operations; Inventory; Requests & Transfers; Camps | Intake, enrollment, visits, assessments, collections/history under Donor Operations; processing, reservations, expiry and movement history under Inventory; incoming request allocation and transfers under Requests & Transfers |
| Administrator — 6 | Overview; People & Access; Institutions & Locations; Operations; Reports; System | All existing management, approval, report, audit, notification, warehouse and performance functions remain available in contextual sections |

Put notifications in a functional header bell/inbox accessible in every portal, with an accurate unread count. Keep notification delivery monitoring in Admin → System. Put staff account/session/logout utilities in a working header menu; the donor header account shortcut opens My Account. Do not create decorative controls or remove a destination before its replacement is accessible.

Inventory's reservations section must link to the relevant request/allocation context; Requests & Transfers should open the same reservation workflow with the selected request item. Do not duplicate allocation state or maintain two competing reservation forms.

Provide an explicit old-to-new mapping in the handoff. For example: donor `registrations` → Find Camps/Registered; `banks` → Appointments/Blood banks; `profile`, `preferences`, `settings` → My Account sections. Hospital `new-request`, `tracking`, `emergency` and `appeals` → appropriate Blood Requests views. Bank `intake`, `visits`, `assessments`, `donations` → Donor Operations stages; `processing`, `expiry`, `movements`, `reservations` → Inventory sections. Admin reports merge under Reports; `etl`, `data-quality`, `benchmarks`, `audit-activity` and delivery monitoring merge under System. Existing navigation callers and shortcuts must resolve to these destinations.

## 3. Shared visual system and alignment

Use the existing README design decision: public landing remains navy/red; authenticated workspaces are light, with `#F6F8FB` ground, white surfaces, `#14243A` primary text, `#C9263E` meaningful actions and `#14856A` confirmed success. Use Inter/system sans and the existing icon family. Apply the app-screen guidance from the design skill while preserving project brand requirements. This task does not authorize an unrelated landing-page redesign.

Create or refine a small shared shell and reusable controls: page heading/action row, section, filter bar, labeled field, status badge, loading/error/empty state, responsive table/list, pagination and dialog. Use CSS variables and existing styles; several pages currently contain utility-looking class names, so verify those classes actually exist instead of assuming Tailwind is installed.

Give each view one clear page title, one brief description when useful, and one primary action. Remove duplicated shell/page headings, large repeated welcome banners, excessive uppercase labels and redundant dashboard links. Align titles, filters, tables and card edges to the same grid. Keep field labels above inputs, helper/error text beneath, consistent control heights, consistent section spacing and predictable action placement. Prefer readable 14–16px working text and restrained 20–28px titles. Use flat surfaces, quiet borders and status colors with text labels. Avoid repeated tinted icon tiles, gradient cards and oversized vanity KPIs.

At 1440px, use a restrained sidebar and generous content width. At 768px, collapse navigation appropriately while retaining usable tables and filters. At 390px, use a proper drawer, stacked forms, full-width primary actions and readable two-line list rows. The current responsive shell still reserves roughly a sidebar's width on a phone, clipping the workspace into a narrow right-hand column. At tablet/phone breakpoints the drawer must leave normal layout entirely; reset the main area's sidebar margin/padding/grid track and apply `min-width: 0` where needed. Do not mask the bug with page-level `overflow: hidden`. Long tables may scroll within their own region; the entire page must not scroll sideways. Preserve all essential fields in mobile details. Keep touch targets at least 44px and prevent long IDs, emails and institution names from breaking layout.

## 4. Real data and response contracts

Audit the shared `api`, `apiClient`, feature API adapters, controllers and SQL views together. `apiClient` currently returns parsed server JSON, not an Axios response. Unwrap each response exactly once. Document and normalize differences between raw rows, `{ data: [...] }`, and nested objects such as `{ data: { users, total, limit, offset } }` at the adapter boundary.

Define canonical view models for camps, requests, donors, inventory and institutions. For camps, normalize the real `camp_id`/`id`, `starts_at`, `ends_at`, location codes/names, capacity and registration counts. Never pass a registration ID as a camp ID. Required missing IDs should produce a safe unavailable-record state and diagnostic logging; do not generate fake IDs. Guard display operations such as `.slice()` and date formatting.

Remove invented values and factual claims: fabricated donor estimates, fixed camp times, default 50-unit quantities, fabricated benchmark timings/improvement, fake national synchronization notifications and freshly generated event times. Render verified zero as zero; render missing, not loaded or failed data as those states. Do not collapse an API failure into an empty list or a successful-looking zero dashboard. Show stale data with its actual last successful refresh when appropriate.

## 5. Automatic geography and search filters

Reuse the existing geography API and GeoSelector patterns. Use the hierarchy province → district → DS division → optional GN division. Councils are a separate dimension; hospitals, banks and camp venues are organizations/locations. Dropdown values must be stable codes, with names only as labels. Do not hardcode a few districts or derive district codes from display names.

Selecting a province loads its districts, selecting a district loads its DS divisions, and selecting a DS division loads available GN divisions. Clear invalid descendants when a parent changes; disable dependent inputs until usable and show truthful loading, empty and error states. Missing GN seed data must have a graceful optional fallback.

Apply dropdown filters automatically without a required Search button. Debounce free text approximately 250–350ms. Cancel obsolete requests or ignore stale responses so an earlier district query cannot overwrite a later selection. Reset pagination when filtering changes, show active filters and result totals, and provide Clear filters. Prepopulate the user's valid saved area or institution area where useful, visibly communicate that scope, and let users broaden it.

Apply supported filters on the server before sorting and pagination. Existing Zod acceptance of a parameter is insufficient: trace it through controller, service, SQL and response. Implement missing province/DS/GN filtering coherently instead of displaying dropdowns that do nothing. Keep URLs/state synchronized so reload and Back restore the same search.

## 6. Hospital Find Donors

Replace `FindDonorsPage.jsx` hardcoded districts and its blood-type-based `estimateCount` with an authorized backend search. The existing page performs no donor search request; it must not describe its fabricated count as eligible or consented candidates.

First inspect available PostgreSQL potential-matching functions, request matching summaries and donor consent rules. Reuse the database's existing matching foundation. Add a narrowly scoped authenticated hospital/admin endpoint if a general filtered search is missing; agree the route and response contract before UI wiring. Do not call an unrelated endpoint and manufacture the expected response locally.

The search must enforce active role and assigned institution, validate blood group and geographical ancestry, apply saved availability/contact permission and the relevant outreach opt-in, and respect existing deferral rules. Unknown blood group must remain unknown. Call results “Potential donor candidates”; they are not medically cleared or compatible blood units. This hospital discovery view must return aggregates only, with no donor names, phone numbers, NICs, addresses, live locations or screening histories. Outreach remains inside the authorized appeal workflow. Pagination here applies to grouped summaries or appeal history, not to a hidden list of donor identities.

Support blood group, related request/item when present, and cascading province/district/DS/GN filters. Include component type when interpreting a selected request item or stock; do not treat it as donor medical clearance. Default the area from actual authorized hospital membership/location, not a recent request or a Colombo fallback. Show applied area, query time, actual candidate/outreach counts and empty-state guidance. Contact/invite actions must lead to the authorized emergency appeal workflow with selected request context; show actual persisted outcomes. A change from Colombo to Jaffna must issue a new query and update results automatically. Apply consent and safety rules on the server, without allowing a filter to bypass them.

The current request matching summary is request-authorized, accepts no independent province/DS/GN filter and uses only the first request item. Extend the contract to address the selected item, or expose a separately documented aggregate search backed by shared matching logic. Return counts with clear definitions, applied filters, scope and a server query timestamp. Do not replace the existing request-specific contract without migrating consumers.

## 7. Hospital requests consolidation

Blood Requests is the single home for the list and a prominent New request action. Embed the existing multi-item form as a subview or dialog with validation, preserved draft values on failure and a clear return path. Keep request details, item-level matching, progress, cancellation, deliveries/receipt and emergency appeals reachable from appropriate tabs or record actions.

Preserve request versus fulfillment versus transfer status distinctions. Use the real state transitions and organization checks. Label requested quantities “Units”; components are not universally “pints.” Validate positive units, blood group/component, urgency and timezone-aware needed-by values. After creation, open the created request detail and refresh relevant counters. Do not offer a supported-looking action without its backend contract.

Fix the emergency/appeals alias mismatch that currently appends “Section Not Found” below a real emergency view. Replace inconsistent route allowlists with a shared registry or equivalent single source of truth. Every known view renders once; an unknown view renders a safe not-found state once. Preserve hospital reports and blood-bank discovery as the two separate destinations specified above.

## 8. Camp discovery, nearby ordering and registration

Make Find Camps contain an Explore/All camps view and a Registered section or tab. Mark registered cards clearly in exploration results and offer View registration/Cancel where allowed. Keep past registrations/history accessible here. Remove the separate My Registrations sidebar item only after this works.

Fix current card normalization before styling: invalid dates, fabricated `09:00–15:00` times, default quantities, district label/code mismatch and undefined registration IDs are observed problems. Use actual start/end timestamps rendered in `Asia/Colombo`; show organizer, coordinating bank, venue address, area and confirmed status. Registration capacity is people/places, not blood-unit stock. `capacity = null` means no fixed capacity: display “No fixed capacity,” not full, zero, 50 or a misleading progress percentage. A missing count is unavailable data, not fabricated occupancy.

Prioritize nearby camps using the donor's saved valid area: same GN where supported, then same DS, district, province, and other areas, with soonest start and stable ID as tie-breakers. Apply this ordering across the entire filtered dataset before pagination. Label it “Near your saved area.” Only show kilometers if both origins and venues have valid coordinates and a real distance calculation; do not invent distance from district names. Browser location must be optional and explicitly requested, with saved-area/manual fallback. Let users switch to date order or all areas, and distinguish no local camps from no camps anywhere.

Trace Register from card ID through request, server UUID validation, authenticated donor lookup, SQL insert/update, constraints and capacity trigger. The observed “Validation failed” must become a working flow with useful inline error handling. On success, refresh registration state and capacity without losing filters/page; only claim a notification was sent or queued when the corresponding operation actually succeeded.

Preserve uniqueness of `(camp_id, donor_id)`. Define duplicate active registration as idempotent success or an explicit already-registered response. Permit a cancelled registration to reactivate only when the camp is future, approved and has capacity; reuse the existing row. Do not blindly reactivate attended/no-show history. Serialize registration and capacity-sensitive reactivation with the appropriate camp row lock and a single transaction client, reusing existing functions/triggers. Exclude the current row correctly when checking updates. Concurrent requests for the last place must produce one valid registration and a clear full response for the other, never overbooking. Returning campers must not hit an unexplained unique constraint error.

Ensure public camp lists/details contain only public-safe fields; use separate management projections and authorization for drafts, approval metadata, registration/contact data and attendance. Keep the public approved/future rule. Do not return a management view directly through a public detail endpoint simply because it is convenient.

## 9. Bank camps and administrative camp review

Keep bank camp creation/edit/submit, details, organizers, posters/media, targeting, registrations, attendance, cancellation and appropriate approval actions inside Camps. Use actual authorized coordinating-bank memberships and approved state transitions. Retain draft values on failed submission and distinguish registration attendance from completed collections.

Admin operations must use authenticated `/camps/managed` for oversight and pending review, rather than public `/camps?status=PENDING`. Public discovery ignores that status filter and cannot populate a management queue correctly. Review cards must reflect actual status; never relabel approved records “Awaiting review.” Review buttons require a canonical valid camp ID and current pending status. Handle a stale concurrent decision by refreshing the record and explaining the changed state.

Fix the observed Camp Oversight crash caused by `.slice()` on undefined IDs. Normalize fields and add section-level error recovery so a malformed row does not blank the entire application. Approval dialogs must show the real camp, bank, organizer, location, schedule and status, with missing-data states instead of generic assigned-bank text. Require meaningful reasons where the existing decision contract requires them and refresh queue counts after successful decisions.

## 10. Donor My Account

Merge profile, privacy/preferences and account settings into one page with distinct semantic sections: Personal details; Saved location; Participation and contact permissions; Communication channels; Account/security information; Link existing offline record and claim history. Use real headings/forms and shared components rather than nesting three old page shells.

Map every displayed preference to persisted canonical API fields. Synchronize form state when asynchronous profile/consent data arrives or an availability toggle updates it; preserve dirty edits appropriately. Avoid multiple toggles overwriting each other's stale values. Use per-section saving/error states and refresh authoritative state after saving. A success message requires a successful save. Reload must preserve each supported value; unsupported preferences need an explicit implementation or removal, not a working-looking toggle.

Correct the profile response's missing `emergency_appeal_opt_in`/`contact_allowed` data and explicitly map persistence fields to form fields. Keep availability, contact consent, emergency opt-in, camp opt-in and delivery-channel preferences distinct. Fix parent geography updates that use `newDistrict || previousDistrict` and restore invalid children after GeoSelector clears them. Use Unknown for missing blood group. Treat date-only birth dates as date-only values so timezone conversion cannot shift the calendar day.

Display the authenticated email and real verification state; remove fallback donor emails. Use existing recovery/account capabilities where supported; do not invent password-change or account-deletion functionality. Link claims require the actual synthetic donor reference UUID according to the current API. Remove claims that national donor cards necessarily carry this internal UUID and requests for real NICs in free-text notes. Explain administrative review clearly, retain claim-load failures as errors and show pending/approved/rejected history without silently replacing failed loads with an empty state.

## 11. Bank Donor Operations and Inventory

Unify lookup, staff-assisted enrollment, visit check-in, assessment, collection and history under Donor Operations. Existing `IntakePortal` already contains workflow stages; reuse it. Preserve the selected donor/visit when moving stages and prevent progression without valid prior state. Walk-in donors remain real donor records without fake online accounts. A visit is not a donation; a collection is not a released inventory unit.

Choose donors, visits and collections from authorized records instead of asking staff to copy UUIDs between screens. IDs can remain available in record details for audit/reference. Require deliberate entry of assessment decisions and measured values; do not prefill a passing assessment or plausible medical measurements as if staff had recorded them. Preserve the prototype's existing authorization and validation boundaries.

Inventory contains stock lists, component processing, simulated screening/release, reservations, expiry and movements. Use the existing database transaction/function/trigger layer; never reimplement reservation locking or movement logging in React/JavaScript. Keep rejected/quarantined/reserved/issued/expired distinctions visible. Display only measured counts and label hardcoded shortage quotas as synthetic demonstration thresholds until an approved configuration exists.

Remove fallback bank ID `1` from `BankPortal`/intake context. Obtain active memberships; automatically select the single assigned bank or provide an authorized selector when several exist. A missing membership produces a useful access state. Preserve server enforcement on every operation.

Repair bank request/camp SQL references to nonexistent `hospitals.district_id`, `donation_camps.name`, `venue_name` and `target_units`, using actual schema relationships and views. Verify response item fields such as fulfilled quantities against migrations. The browser currently shows Internal server error for incoming requests/camps; fix the contract/query cause, not just the wording.

Fix BankPortal's fallback whitelist, which omits valid inventory, visits, assessments, processing and reservations views and appends a false not-found panel. Incoming requests and contextual allocation must refresh inventory/request counts after successful reservations. Preserve inter-bank dispatch/receipt workflows and organization boundaries within Requests & Transfers.

## 12. Complete administrator data coverage

Organize related data without adding one sidebar entry per table or exposing unrestricted destructive editing:

- **Overview:** real operational totals, pending actions, recent activity, freshness and drilldowns. A pending count must open the matching filtered queue.
- **People & Access:** online accounts, donor records including staff/camp walk-ins without accounts, staff invitations and memberships, active/verified states, authorized assignment changes and identity-link claims. User accounts are not the entire donor population. Add a restricted donor directory/detail contract where missing, with minimum necessary fields and history links.
- **Institutions & Locations:** hospitals, blood banks, parent-hospital relationships, verification, staff associations and addresses; province/district/DS/GN reference browsing and supported location data. Treat synthetic reference data honestly. Do not create a national-code editor or fabricate missing master data.
- **Operations:** camp oversight/review and associated registrations/attendance/organizers; requests/items, emergency appeals, matching summaries, fulfillments/receipts; stock units/components, reservation lifecycle, expiry/movements and transfers. Use contextual read-only oversight where mutation is outside administrative needs. Show institution scope and linked IDs; keep sensitive details behind authorized record views.
- **Reports:** overview, demand, stock, donation, camp and transfer analytics with clear date/institution/geography filters, data source, units and freshness. Keep numerator/denominator definitions consistent. Zero demand with zero allocation is “No demand” or “Not applicable,” never “Critical deficit.”
- **System:** audit activity, notification deliveries/outbox failures, warehouse status, ETL runs, data quality and performance lab. ETL and data quality already share a component; expose meaningful internal sections instead of duplicate primary destinations.

Use existing authorized endpoints where suitable, then implement narrowly missing contracts with tests. Route-level ADMIN access alone does not prove every service returns the needed scope. No generic raw-SQL browser, blanket contact export or unrestricted record deletion is requested.

Fix Overview → Full Log to open Audit activity, currently implemented but omitted from navigation. Distinguish registered, online and walk-in donor counts with non-overlapping definitions or clearly disclosed overlap; do not present inconsistent totals. Keep any unavailable subsystem separate from the rest of a usable dashboard.

## 13. Health, notifications and benchmark truthfulness

Repair the health request path/response handling: the shared API helper prefixes `/api/v1`, while the server's health route may be `/health`. The browser reported System offline while direct health reported a connected database. Check actual Vite proxy/server behavior; show Checking/Connected/Degraded/Unavailable from real evidence with a timestamp. Do not expose a PostgreSQL implementation badge to every portal or initialize a fabricated healthy state.

Remove fabricated benchmark defaults in `BenchmarkComparison` (`0.8ms`, `0.12ms`, `84%`). Before execution show “No benchmark result yet.” Display only returned measurements, experiment description, repetitions and actual query plans. If an experiment does not truly compare the advertised index types, correct its label or implementation. Never assert a performance gain without a completed run. Do not trigger expensive benchmarks or ETL automatically during page load.

Remove the hospital empty-inbox “National Blood Transfusion Network Synchronized” event and timestamp generated from now. Empty notifications should be an honest empty state. Distinguish in-app notification creation, queued delivery, sent delivery and failed delivery. Header bell controls must navigate, unread state must update after read actions, and telemetry must protect recipient contact details. Remove unsupported NBTS authorization/accreditation and national live-network claims throughout touched screens.

## 14. Pagination and durable navigation state

Implement a reusable accessible pagination control with totals, current range, previous/next and page-size selection: default 10, with 10/25/50 options and a bounded backend limit. Hide unnecessary controls for a single short page while retaining truthful totals. Avoid pagination on capped overview snippets; provide View all into the full list.

Cover every growing full dataset: donor donations/visits/appointments/claims/camp registrations; camps and candidates; hospital requests/appeals/deliveries; bank donors/visits/collections/units/reservations/movements/transfers; admin users/offline donors/memberships/institutions/camps/audit/delivery logs/ETL history where needed.

Extend existing `limit`/`offset` contracts compatibly. Preserve `data` arrays and existing nested users/audit payloads for current consumers, adding documented pagination metadata instead of silently replacing arrays with objects. Validate bounded limits, nonnegative offsets and whitelisted sort fields. Filter and count with the same predicates and authorization; paginate parent requests without duplicating them for item joins. Use deterministic ordering with a unique tie-breaker. Remove silent first-50/100 truncation before claiming full pagination.

Encode portal view, subview, selected record, filters, sort and page in the existing hash/query navigation or a comparably small mechanism. Refresh, direct links and Back/Forward must work. Preserve old aliases where practical. Reset page on filter change, clamp after deletion/cancellation, and retain filters/scroll when returning from detail. Use a shared route registry to keep menu selection, headings, aliases and fallback behavior aligned.

## 15. Accessibility and failure handling

Use semantic landmarks/headings, associated labels, keyboard-operable tabs/menus, `aria-current`, visible focus, descriptive button names and status text beyond color. Dialogs need focus management, escape/close behavior and return focus. Announce asynchronous errors/success and loading state without disruptive browser alerts. Maintain readable contrast and reduced-motion support.

Provide section-level error boundaries for independent portal modules and explicit handling for network loss, expired session, unauthorized membership, empty data and malformed optional fields. Do not silently swallow errors, crash the whole portal, disable all unrelated sections or show success after a failed operation. Disable duplicate submissions while preserving retries and entered values.

## 16. Delivery phases, validation and acceptance

Phase 1: record baseline/dirty state; map routes and real response contracts; fix critical errors, false data and membership context. Phase 2: build shared shell and consolidate navigation with aliases. Phase 3: finish automatic authorized donor filtering and camp registration/nearby behavior. Phase 4: merge account state, fill admin dataset gaps and implement pagination. Phase 5: responsive/a11y review, regression checks and handoff. Keep each phase reviewable and avoid broad unrelated rewrites.

Database changes require M1/database-lead approval under repository rules. Add a forward migration using the actual next unused number beyond current `020`; do not edit applied migrations or assume `021` remains available. Update ERD/data dictionary/constraints where relevant, implemented API/OpenAPI contracts and regression tests together. Use parameterized SQL, one pg client per transaction and rollback on error. Do not reset volumes or reseed destructively.

Run applicable frontend tests/build, backend tests, `docker compose config`, SQL verification on a real disposable database, relevant integration/smoke checks and role-based browser checks. Add meaningful regressions for each corrected contract and data race, not tests that merely repeat the implementation. Specifically verify:

1. All four demo roles can reach every retained workflow through the reduced menus; old aliases and Back/refresh work; valid pages never append not-found panels.
2. Hierarchical filters fetch valid options, automatically update real results, clear invalid descendants and ignore stale responses; cross-institution/unauthenticated search is rejected.
3. Camp IDs/dates/counts/null capacity normalize correctly; public fields are safe; registered badges survive reload; cancel/reactivate works; duplicate calls do not duplicate rows; a two-client last-place race cannot overbook.
4. Admin pending review returns only pending management records; approved camps cannot masquerade as awaiting review; malformed rows cannot blank the app; stale approval decisions are handled.
5. Account consent/profile fields persist on save/reload and synchronize without stale overwrites; failed loads/saves remain visible.
6. Pagination totals, stable order, filters and institution scope are correct across at least 125 isolated records, including a search match beyond the original first 100 and a mutation on the last page; offline donors appear appropriately without fake accounts.
7. Health reflects the real endpoint; empty notifications contain no invented events; benchmarks show no numbers before a real run; zero demand is not a critical deficit.
8. Capture and inspect all redesigned portal families at 390/768/1440, exercise keyboard navigation and dialogs, verify no whole-page overflow and check reduced motion.

Use only the existing synthetic demo accounts for role verification; do not place credentials in source, screenshots, reports or this prompt. If a check cannot run, explicitly state “Not run” and the concrete reason. Never claim screenshots, migrations, tests, message delivery, clinical validation or performance measurements without evidence.

Deliver a concise handoff with changed files, navigation map, migration(s) and approval status, implemented API examples, backward-compatibility notes, tests/results, screenshot locations, remaining limitations and exact blockers. The finished result must combine fewer navigation choices with complete, accurate and usable workflows.

## 17. Contract reference and examples

Reverify these against current mounted code before implementation. These are existing contracts unless explicitly labeled proposed; do not describe a proposed route as already working.

| Existing API | Purpose and constraint |
|---|---|
| `GET /api/v1/auth/memberships` | Resolve actual staff institution assignments before selecting hospital/bank context. |
| `GET /api/v1/locations/provinces` | Province options. |
| `GET /api/v1/locations/districts?provinceCode=WP` | Districts under the selected province. |
| `GET /api/v1/locations/ds-divisions?districtCode=CO&provinceCode=WP` | District is required; validate ancestry. |
| `GET /api/v1/locations/gn-divisions?districtCode=CO&dsCode=MAH` | Optional GN dataset can be empty. |
| `GET /api/v1/camps?districtCode=CO&search=...` | Public approved/future list. Current raw rows use `camp_id`; province/GN/media/registration context needs explicit extension. |
| `GET /api/v1/camps/managed` | Authenticated management data for permitted bank/admin scope; support real status filters/pagination. |
| `POST /api/v1/camps/:campUuid/registrations` | Authenticated donor identity comes from the session, never a client-supplied donor ID. |
| `DELETE /api/v1/camps/:campUuid/registrations` | Cancel only the authenticated donor's allowed registration. |
| `GET /api/v1/camps/registrations/me` | Donor registration ledger, including cancellation/attendance states. |
| `GET /api/v1/requests/:requestUuid/matching-summary` | Existing request-authorized aggregate; selected item and independent geography need deliberate contract work. |
| `PATCH /api/v1/donors/me/preferences` | Supported fields include `availableForContact`, `campNotificationsOptIn`, `emergencyAppealOptIn`, `smsAlerts`, `emailAlerts`, `inAppAlerts`, `newsletterOptIn`. |

Preserve the multi-item hospital request payload. Resolve `hospitalId` from authorized membership, and provide a future date with its timezone offset:

```json
{
  "hospitalId": 1,
  "urgency": "URGENT",
  "neededBy": "2026-11-21T09:00:00+05:30",
  "notes": "Synthetic coordination demonstration; no patient identifiers",
  "items": [
    { "bloodTypeCode": "O+", "componentCode": "RBC", "unitsRequested": 2 }
  ]
}
```

The numeric ID/date above are examples, not defaults to send blindly. Use the current `POST /api/v1/requests` contract and replace the example with authorized records and user input.

For a newly paginated list, a proposed response is:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

This is a proposed convention. Existing admin `limit`/`offset`/nested response contracts should remain compatible through adapters or additive metadata. Do not paste this shape over every controller without checking consumers. Define empty-page behavior, server filter parameters and sort allowlists in the actual contract, then verify UI totals against PostgreSQL.
