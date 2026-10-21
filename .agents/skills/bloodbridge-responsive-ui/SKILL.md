---
name: bloodbridge-responsive-ui
description: Use for React pages, consistent BloodBridge healthcare design system, donor/hospital/blood-bank/admin dashboards, camp finder, forms, animation and mobile responsiveness.
---

# BloodBridge frontend and UX

## First read
`README.md` design decision, `design/responsive_reference.html`, `design/landing-a-desktop.svg`, `design/landing-a-mobile.svg`, `frontend/src/App.jsx`, `frontend/src/styles.css`, `frontend/vite.config.js`, `docs/API_IMPLEMENTED.md`.

## Final design (avoid creating a second visual system)
- Public landing: navy `#14243A` + red `#C9263E`, animated donation visuals, accessible CTAs, responsive search entry points.
- Logged-in dashboards: light background `#F6F8FB`, white cards, red for meaningful actions, green `#14856A` for confirmed success. Keep typography consistent (Inter or system sans).
- Camp finder: reuse search/filter interactions of previously proposed Concept B; it is a **module**, not a new landing design.
- Design/reference HTML and SVG are visual references; they are not functional React implementations. Do not present them as built routes.

## Screens to deliver
- Public: landing, donor guide, verified camp search with district/DS filters.
- Donor: register/login, profile & contact preferences, camp registration/history.
- Hospital staff: create request (multi-item), status and match candidates (clearly potential only).
- Bank staff: blood-unit inventory and expiry/availability, requests, reservation, camp creation/approval.
- Admin: institutional approvals, summaries, database-performance evidence and analytics.

## Workflow
1. Inspect existing React state and API calls before introducing routers/state libraries; avoid unnecessary dependencies during deadline sprint.
2. Confirm API is implemented (`docs/API_IMPLEMENTED.md`), or create explicit mock mode with clearly marked synthetic values. No fake 'live blood availability' or fabricated hospital counts.
3. Build small reusable components: navigation, form field with helper/error, card, status badge, empty/loading/error states, confirmation dialog, responsive data table.
4. Use true mobile layout, not a scaled desktop screenshot: at **390px** one column, accessible navigation, 44px+ tap targets; at **768px** tablet; at **1440px** full dashboards. Prevent horizontal scrolling and overflow.
5. Validate a11y: semantic labels, input messages, focus visibility, contrast, keyboard interactions and `prefers-reduced-motion` support for pulse/float animations.
6. Test real frontend build, API flows, and disconnected/error states. Keep private donor details hidden from public pages.

## Acceptance
Responsive captures and functional flows on 390/768/1440 widths; styling matches one design system; screens state exactly where backend functionality remains a mock.
