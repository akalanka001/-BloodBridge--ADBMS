---
name: bloodbridge-geography-camps
description: Use for Sri Lanka location hierarchy, donor area selection, blood donation camps, organizers, approval/registration workflows, district filters, and opt-in notifications.
---

# Sri Lankan geography and donation camp workflows

## First read
`database/migrations/001_schema.sql` (geography and camp tables), `007_advanced_objects.sql` (camp view, procedure, registration trigger), `backend/src/routes/locations.js`, `backend/src/routes/camps.js`, `docs/ADDITIONS_ONLY.md`, `design/responsive_reference.html`.

## Geographic model
- Province → District → Divisional Secretariat division (DS) → optional Grama Niladhari division (GN). **Urban Councils/Municipal Councils/Pradeshiya Sabhas** are separate local authorities, not ancestor nodes in this hierarchy.
- Hospital and blood-bank facilities, and camp venues, have a `locations` record. Blood bank cluster organization is separate from administrative location.
- User-facing selectors cascade `provinceCode` → `districtCode` → `dsCode`; optional GN is **not implemented** in the starter. Existing demo codes are partial/fictional; do not claim a complete Sri Lanka dataset or invent authoritative codes.
- Prefer district/DS filtering first. Radius search requires verified coordinates and explicit donor location consent; do not promise it from plain district code.

## Camp workflow
1. Bank staff creates `DRAFT` camp with organizer, coordinating blood bank, venue, start/end and capacity.
2. Submit `DRAFT` → `PENDING`; bank approval procedure `sp_approve_donation_camp` verifies coordinating bank authorization/verification.
3. Only `APPROVED` upcoming camps appear through `v_public_donation_camps`.
4. Donor can register interest once; DB trigger guards future approval and capacity under concurrency. Registration is NOT completed donation or medical clearance.
5. Support cancellation, rescheduling and accessible location/time display once the core workflow is stable; notify only opted-in users and avoid leaking precise donor locations.
6. Search and responsive camp cards show organizing bank, venue, date/time in `Asia/Colombo` presentation; save timestamps in `TIMESTAMPTZ`.

## Acceptance
Test cascading filters, unauthorized approval, future-only public listing, max capacity under parallel registration, duplicate sign-up, opt-out, cancellation status and keyboard/mobile form accessibility.
