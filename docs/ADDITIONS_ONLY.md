# NEW FEATURES & REAL-WORLD CORRECTIONS — separate change register

Compare this list against the ORIGINAL BloodBridge donor / hospital / bank / admin system and the attached first class diagram. These are additions or changes, not all required by Friday.

| New area | Original design | Revised design | Database tables / changes | Priority by Friday | UI impact |
|---|---|---|---|---|---|
| Admin geography | Location had city, district, province, coordinates | Official province → district → DS; GN optional; councils separate | `provinces`, `districts`, `ds_divisions`, `locations` | P0 (no nationwide GN) | Dependent select fields on donor/camp screens |
| Camp proposals | No entity for camps | Bank staff can propose camp for named community organizer | `camp_organizers`, `donation_camps` | P0 | Post a camp form |
| Verified publication | No camp approval | DRAFT → PENDING → APPROVED/REJECTED | status, approved_by, `blood_bank_id` | P0 | Blood bank approval queue, verified badge |
| Area-based camp discovery | No area-based event discovery | Filter approved upcoming camps by venue district/DS | `locations` indexed district, DS | P0 | Landing events + mobile filters |
| Camp interest | No registrations | Donor registers interest once; attendance != donation | `camp_registrations` | P0 | Camp card registration |
| Camp targeting | No notifications by area | Target districts/DS; only opted-in donor audiences | `camp_target_areas`, `donors.camp_notifications_opt_in` | P1 | Location preferences / future alert controls |
| Advanced geographic precision | Basic coordinates | Optional real radius search and official GN reference | future GN tables; PostGIS | P2 | Map radius slider, interactive map |
| Unit-level stock | Aggregate quantity/expiry | Each donation produces traceable component units | `blood_units`, `component_types` | P0 | Bank stock dashboard by group/component |
| Release vs inventory state | One generic status | Separate simulated release/quarantine and reserved/issued | `release_status`, `inventory_status` | P0 | Explicit statuses and verification banner |
| Hospital request line items | Single component/quantity | One request can include several components/groups | `request_items` | P0 | Request creation wizard |
| Concurrency-safe reservation | No unit reservation | Exactly one active reservation per unit, atomic workflow | `inventory_reservations`, unique partial index | P0 | Bank reservation flow |
| Fulfillment traceability | Abstract unitsSupplied | Link every fulfilled unit/reservation | `fulfillments`, `fulfillment_units` | P0 | Fulfillment status and history |
| Organizational authorization | `User.role` only | Bind staff to hospital or bank | `staff_memberships` | P0 | Role-based dashboard access |
| Inventory movement audit | No movement ledger | Log transitions and staff actors | `inventory_movements`, `audit_logs` | P1 | Unit detail history |
| Warehouse camp metrics | Donation/demand analytics only | Registration and area trends | `fact_camp_registrations` | P1 | Admin camp analysis |
| Mobile responsive view | Desktop-minded / standalone SVG concepts | Dedicated mobile flows, accessible controls, no horizontal page overflow | No DB table | P0 | All six page families |

## Deferred beyond Friday (do not claim as implemented)
- Nationwide verified DS/GN dataset and boundary polygons; Municipal/Urban/Pradeshiya Sabha coverage.
- Actual geospatial donor alert radius via PostGIS, external map API, SMS/push provider, and opt-out delivery management.
- Organizer-managed accounts, camp QR check-in, full appointment booking and capacity enforcement under concurrent registrations.
- Real laboratory screening, clinical compatibility/crossmatch, barcode/ISBT 128 implementation, cold chain and regulatory workflows.
- Real patient identity or health records: not needed for this university demonstration.

## Decision to freeze by end of Tuesday
1. A camp is proposed by authenticated bank staff for an organizer; bank staff can submit and an authorized bank reviewer confirms. Community organizer self-registration is future scope.
2. Camp publication uses assigned collecting bank, *not* hospital as the mandatory parent.
3. A donor can filter by district; DS optional. Donor location is approximate; no raw home coordinate in public responses.
4. Donor match search returns candidates only; matching does not authorize a donation or a transfusion.
5. No fictional data is displayed as verified real blood stocks or actual event schedules.
