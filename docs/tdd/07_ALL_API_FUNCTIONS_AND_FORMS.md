# BloodBridge — exact backend handler / API / SQL / connected UI inventory

**Routes marked new in per-member documents are proposed and must be implemented.** Base URL `/api/v1`. No direct PostgreSQL browser access. Roles and institution scope verified server-side.

| Owner | Handler | Endpoint | Role | Input/filter | Database SQL | UI consumer |
|---|---|---|---|---|---|---|
| M1 | `getGnDivisions` | `GET /locations/gn-divisions` | Public | dsCode required | gn_divisions FK through ds_divisions | LocationSelector |
| M1 | `listInstitutions` | `GET /institutions` | Public/Staff safe | type,districtCode,verified | v_verified_institutions (proposed) | InstitutionPicker |
| M1 | `createInstitution` | `POST /admin/institutions` | ADMIN | name,type,locationId,phone | hospitals/blood_banks + audit | NewInstitutionForm |
| M1 | `verifyInstitution` | `PATCH /admin/institutions/:id/verify` | ADMIN | verified:boolean,reason | institution verification update + audit transaction | InstitutionReviewDialog |
| M1 | `listStaff` | `GET /admin/staff` | ADMIN | institutionId,role,page | users + staff_memberships join | StaffTable |
| M1 | `assignStaffMembership` | `POST /admin/staff-memberships` | ADMIN | userId,institutionType,institutionId | staff_memberships unique/check | AssignStaffForm |
| M1 | `revokeStaffMembership` | `PATCH /admin/staff-memberships/:id` | ADMIN | isActive:false | staff_memberships and immediate auth checks | StaffRowActions |
| M1 | `getOwnAccount` | `GET /auth/me` | Authenticated | Bearer token | users active state | AccountMenu |
| M2 | `getDonorProfile` | `GET /donors/me` | DONOR | Bearer token | donors scoped by user id | DonorProfile |
| M2 | `updateDonorProfile` | `PATCH /donors/me` | DONOR | districtCode,dsCode,gnCode,bloodTypeCode self reported | donors + composite geography constraint | DonorProfileForm |
| M2 | `updateContactPreferences` | `PATCH /donors/me/preferences` | DONOR | availableForContact,campNotificationsOptIn | trg_donor_preference_history | DonorPreferenceForm |
| M2 | `getDonationHistory` | `GET /donors/me/donations` | DONOR | page,pageSize | donations ORDER BY collected_at desc | DonationHistory |
| M2 | `getInvitations` | `GET /donors/me/invitations` | DONOR | status,page | donor_matches/contact events scoped | InvitationInbox |
| M2 | `respondInvitation` | `POST /donors/me/invitations/:id/respond` | DONOR | response ACCEPTED/DECLINED | donor_matches transition + donor_contact_events | InvitationDecisionDialog |
| M2 | `getPotentialCandidates` | `GET /donors/candidates` | Authorized BANK/HOSPITAL staff | requestItemId,districtCode,limit | fn_potential_donors plus institution access | CandidateSearch |
| M2 | `invitePotentialDonor` | `POST /requests/:id/invitations` | Authorized staff | donorId,requestItemId | donor_matches/contact event/notifications tx | InviteDonorDialog |
| M3 | `listHospitalRequests` | `GET /requests` | HOSPITAL_STAFF | status,urgency,page,dateFrom,dateTo | v_hospital_request_queue scoped membership | HospitalRequestList |
| M3 | `createHospitalRequest` | `POST /requests` | HOSPITAL_STAFF | hospitalId,urgency,neededBy,items[] | blood_requests + request_items atomic tx | NewBloodRequestForm |
| M3 | `getRequestDetail` | `GET /requests/:id` | HOSPITAL_STAFF scoped | UUID | blood_requests + request_items + membership | RequestDetails |
| M3 | `getRequestProgress` | `GET /requests/:id/progress` | Authorized hospital/bank scoped | UUID | v_request_received_progress | RequestProgressTimeline |
| M3 | `listRequestItems` | `GET /requests/:id/items` | Authorized hospital/bank scoped | UUID | request_items | RequestItemsTable |
| M3 | `getRequestFulfillments` | `GET /requests/:id/fulfillments` | Authorized hospital/bank scoped | UUID | fulfillments + fulfillment_units | RequestFulfillments |
| M3 | `cancelBloodRequest` | `PATCH /requests/:id/cancel` | HOSPITAL_STAFF scoped | reason | sp_cancel_blood_request proposed, coordinated with M4 | CancelRequestDialog |
| M4 | `createDonation` | `POST /donations` | BANK_STAFF assigned bank | donorId,bloodBankId,campId?,collectedAt | donations transaction | DonationCollectionForm |
| M4 | `recordDonationScreening` | `POST /donations/:id/screening` | BANK_STAFF assigned bank | resultStatus,performedAt | donation_screenings audit | ScreeningForm |
| M4 | `createComponentUnit` | `POST /units` | BANK_STAFF assigned bank | donationId,type,component,expiresAt | blood_units lineage/source trigger | NewUnitForm |
| M4 | `releaseComponentUnit` | `POST /units/:id/release` | BANK_STAFF assigned bank | confirmation | sp_release_blood_unit | UnitReleaseDialog |
| M4 | `listInventoryUnits` | `GET /inventory/units` | Assigned bank staff | bloodType,component,status,expiry,page | blood_units filter, partial index | BloodUnitTable |
| M4 | `getInventorySummary` | `GET /inventory/summary` | Scoped staff | bloodBankId allowed | v_available_blood_stock | BankSummaryCards |
| M4 | `getStockShortages` | `GET /inventory/shortages` | Bank staff/ADMIN | bankId,component | v_stock_below_threshold | StockShortageAlerts |
| M4 | `reserveComponentUnit` | `POST /inventory/reservations` | BANK_STAFF | requestItemId,bloodUnitId | fn_reserve_blood_unit explicit transaction | ReserveUnitDialog |
| M4 | `cancelInventoryReservation` | `POST /inventory/reservations/:id/cancel` | BANK_STAFF | reason | sp_cancel_reservation | CancelReservationDialog |
| M4 | `createFulfillment` | `POST /fulfillments` | BANK_STAFF | requestId,bloodBankId | fulfillments PREPARING | CreateFulfillmentForm |
| M4 | `attachUnitToFulfillment` | `POST /fulfillments/:id/units` | BANK_STAFF | reservationId | fn_attach_reserved_unit_to_fulfillment | FulfillmentUnitPicker |
| M4 | `dispatchFulfillment` | `POST /fulfillments/:id/dispatch` | BANK_STAFF | confirmation | sp_dispatch_fulfillment | DispatchDialog |
| M4 | `confirmFulfillmentReceipt` | `POST /fulfillments/:id/receive` | HOSPITAL_STAFF assigned hospital | confirmation | sp_confirm_fulfillment_receipt | HospitalReceiptForm |
| M5 | `listApprovedCamps` | `GET /camps` | Public | districtCode,dsCode,dateFrom | v_public_donation_camps | CampFinder |
| M5 | `getPublicCamp` | `GET /camps/:id` | Public | camp UUID | v_public_donation_camps | CampDetail |
| M5 | `createCampDraft` | `POST /camps` | BANK_STAFF assigned bank | title,organizerId,bankId,locationId,startsAt,endsAt,capacity | donation_camps DRAFT | NewCampWizard |
| M5 | `submitCamp` | `POST /camps/:id/submit` | BANK_STAFF assigned bank | camp UUID | donation_camps DRAFT→PENDING | SubmitCampDialog |
| M5 | `approveCamp` | `POST /camps/:id/approve` | BANK_STAFF assigned verified bank | camp UUID | sp_approve_donation_camp | CampApprovalPanel |
| M5 | `setCampTargets` | `POST /camps/:id/target-areas` | BANK_STAFF assigned bank | districtCode,dsCode?,radiusKm? | camp_target_areas + NULL DS uniqueness | CampTargetAreaPicker |
| M5 | `getCampTargets` | `GET /camps/:id/target-areas` | BANK_STAFF assigned bank | camp UUID | camp_target_areas | CampTargetAreaTable |
| M5 | `registerForCamp` | `POST /camps/:id/registrations` | DONOR | camp UUID | camp_registrations capacity trigger | RegisterCampButton |
| M5 | `listCampRegistrations` | `GET /camps/:id/registrations` | BANK_STAFF assigned bank | page,status | camp_registrations scoped join | CampAttendanceTable |
| M5 | `checkInCampDonor` | `POST /camps/:id/checkins` | BANK_STAFF assigned bank | registrationId | sp_record_camp_checkin | CampCheckinForm |
| M5 | `cancelCamp` | `PATCH /camps/:id/cancel` | BANK_STAFF assigned bank | reason | donation_camps status + audit transaction | CancelCampDialog |
| M5 | `myCampRegistrations` | `GET /donors/me/camps` | DONOR | page,status | camp_registrations donor profile join | MyCampRegistrations |
| M6 | `getAnalyticsSummary` | `GET /analytics/summary` | ADMIN | dateFrom,dateTo,districtCode | warehouse aggregated fact query | AdminOverview |
| M6 | `getDonationTrends` | `GET /analytics/donation-trends` | ADMIN | groupBy,month,districtCode | fact_donations + dims | DonationTrendChart |
| M6 | `getRequestDemand` | `GET /analytics/request-demand` | ADMIN | dateRange,bloodType,component | mv_monthly_request_demand / warehouse facts | RequestDemandChart |
| M6 | `getCampParticipation` | `GET /analytics/camp-participation` | ADMIN | dateRange,districtCode | fact_camp_registrations | CampAnalyticsChart |
| M6 | `getETLStatus` | `GET /analytics/etl-status` | ADMIN | latest | etl_runs | ETLStatusCard |
| M6 | `refreshWarehouseETL` | `POST /analytics/etl/refresh` | ADMIN | approved run trigger | idempotent ETL with lock/job | RefreshETLDialog |
| M6 | `getBenchmarkResults` | `GET /analytics/benchmark-results` | ADMIN | experimentKey allowlist | stored measured EXPLAIN evidence | DBPerformanceComparison |
