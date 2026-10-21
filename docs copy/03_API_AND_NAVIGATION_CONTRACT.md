# Shared API and navigation contract (proposed extension to current app)

## What already exists in `dev`
- Existing: auth register/login/me; geography province/district/DS; donor profile/preferences; camp list/detail/create/submit/approve/register; requests list/create; stock summary/reserve.
- New routes below are **proposed**, must be added to the OpenAPI spec and backend routing, not assumed live.
- Existing app navigates with **hash routes** such as `#home`, `#camps`, `#donor`, `#hospital`, `#bank`, `#admin`. The `/hospital/...` page paths in these documents are *logical* route names. Implement as `#/hospital/...` using the current router or migrate to React Router in an agreed shared navigation PR (not six incompatible routers).

## Pages + role access + owner
| Logical page/URL | Role | Owner | Key forms/interactive controls | From navigation |
|---|---|---|---|---|
| `/` | Public | M1 shared shell | Landing CTA, camp preview | Logo/Home |
| `/login`, `/register` | Public | M1 | Credentials / donor registration, area picker | Landing CTA/navbar |
| `/admin/institutions` | ADMIN | M1 | Institute list, verify; staff tab | Admin sidebar |
| `/admin/staff` | ADMIN | M1 | Membership assign/revoke | Admin sidebar |
| `/donor/dashboard` | DONOR | M2 | Profile shortcut, opt-ins | Login redirects |
| `/donor/profile` | DONOR | M2 | Area / contact preferences | Donor sidebar |
| `/donor/history` | DONOR | M2 | Donation filters, paginated rows | Donor sidebar |
| `/donor/invitations` | DONOR | M2 | Accept/decline | Donor sidebar/notifications |
| `/hospital/requests` | HOSPITAL_STAFF | M3 | Status/date search | Hospital sidebar |
| `/hospital/requests/new` | HOSPITAL_STAFF | M3 | Multiple component items, urgency, needed-by | New request button |
| `/hospital/requests/:id` | HOSPITAL_STAFF | M3 | Detail, progress tabs, cancel | Request list |
| `/bank/donations/new` | BANK_STAFF | M4 | Collect, simulated screening | Bank sidebar |
| `/bank/units` | BANK_STAFF | M4 | Type/component/expiry filters; release | Bank sidebar |
| `/bank/requests` | BANK_STAFF | M4 | Reserve picker / fulfillment wizard | Bank sidebar |
| `/bank/fulfillments/:id` | BANK_STAFF | M4 | Attach units / dispatch | Fulfillment list |
| `/hospital/fulfillments/:id/receive` | HOSPITAL_STAFF | M4 and M3 | Receipt confirmation | Request progress |
| `/camps`, `/camps/:id` | Public/donor | M5 | Location/date filters, event details, join | Navbar/Home |
| `/donor/camps/registrations` | DONOR | M5 | My camps/cancel registration | Donor sidebar |
| `/bank/camps`, `/bank/camps/new` | BANK_STAFF | M5 | Camp venue/start/end/capacity/target areas | Bank sidebar |
| `/bank/camps/:id/approval` | BANK_STAFF | M5 | Submit/approve/cancel | Bank camp details |
| `/bank/camps/:id/checkins` | BANK_STAFF | M5 | Check-in and attendance list | Bank camp details |
| `/admin/analytics` | ADMIN | M6 | Demand/donation/camp filters | Admin sidebar |
| `/admin/database-performance` | ADMIN | M6 | Plan comparisons and real times | Admin sidebar |

## Shared routes, data and errors
- Backend base `/api/v1`. Always use `Authorization: Bearer <JWT>` for private routes.
- 200 list/detail; 201 created; 400 validation; 401 missing/invalid token; 403 unauthorized role/institution; 404 missing or inaccessible scoped resource; 409 duplicate/state conflict; 500 unexpected.
- JSON responses: `{data: object|array}` for successful resources where existing code follows it, `{error: string, details?: []}` for errors. Document all exceptions, do not invent different formats per member.
- Form dates ISO 8601 with timezone; displays in `Asia/Colombo`.
- No frontend imports database drivers and no `VITE_` variable contains private secrets.
- Preserve responsive navy/red public pages and light role dashboards, no new unrelated design theme.

## Cross-team shared API agreements
| Contract | Data owner | Consumer | Freeze rule |
|---|---|---|---|
| `locationId`, districtCode, dsCode, gnCode | M1 | M2/M5 | Required geography consistency; child selector resets on parent changes |
| `requestItemId`, requestedUnits, bloodTypeCode, componentCode | M3 | M2/M4 | Matching and reservation refer to same request item |
| `bloodUnitId`, releaseStatus, inventoryStatus | M4 | M3/M6 | No ready-stock claim unless released and unexpired |
| `fulfillmentId`, reserved/issued/received counts | M4 | M3/M6 | Receipt count only when hospital confirms |
| `campId`, active registration, checkin status | M5 | M2/M4/M6 | Registration != attendance != donation |
| Warehouse fact IDs, dates and statuses | M6 | Admin | Grain and idempotency fixed before ETL |

## Proposed page routing map
```
PUBLIC: / -> /camps -> /camps/:id -> /login -> return to camp
DONOR: /login -> /donor/dashboard -> /donor/profile | /donor/history | /donor/invitations | /donor/camps/registrations
HOSPITAL: /login -> /hospital/requests -> /hospital/requests/new -> /hospital/requests/:id -> /hospital/fulfillments/:id/receive
BANK: /login -> /bank/units | /bank/donations/new | /bank/requests | /bank/fulfillments/:id | /bank/camps/new
ADMIN: /login -> /admin/institutions | /admin/staff | /admin/analytics | /admin/database-performance
```

## Component library required
`AuthGuard`, `RoleGuard`, `OrganizationGuard` (backend is authoritative), `LocationSelector`, `AppShell`, `ResponsiveSidebar`, `Breadcrumbs`, `LoadingState`, `EmptyState`, `ErrorState`, `ConfirmationDialog`, `FormField`, `DateTimeField`, `StatusBadge`, `Pagination`, `DataTable`, `MobileCards`. Member 1 owns shell, each module owns pages and related forms.
