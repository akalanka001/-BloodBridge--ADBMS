-- ============================================================================
-- BloodBridge Database Refactoring: Advanced Database Concepts & Business Objects
-- File: 002_advanced_database_concepts.sql
-- Module: Views, Materialized Views, Stored Procedures, Functions & Triggers
-- Target: PostgreSQL 16+
-- ============================================================================
-- Academic & Architectural Note:
-- Every object below represents an Advanced Database Management System (ADBMS)
-- concept mapped to real operational workflows within the BloodBridge system.
-- Comments preceding each object document the concept type, the backend API
-- routes, the frontend interfaces, and the business rationale.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: NORMAL VIEWS (Stored SQL Queries / Real-time OLTP Aggregates)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_available_blood_stock
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/blood-units/available (backend/src/routes/blood-units.js)
--   - Frontend Interface: Hospital & Bank Portals (Inventory overview cards, stock grids)
--   - Workflow: Computes real-time available stock of released and non-expired
--     blood component units per blood bank, group, and component type.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_available_blood_stock AS
SELECT bu.blood_bank_id, bb.name AS blood_bank_name,
       bu.blood_type_code, bu.component_code, count(*)::bigint AS available_units,
       min(bu.expires_at) AS earliest_expiry
FROM blood_units bu
JOIN blood_banks bb ON bb.id = bu.blood_bank_id
WHERE bu.release_status = 'RELEASED'
  AND bu.inventory_status = 'IN_STOCK'
  AND bu.expires_at > now()
GROUP BY bu.blood_bank_id, bb.name, bu.blood_type_code, bu.component_code;

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_public_donation_camps
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/camps/public (backend/src/routes/camps.js)
--   - Frontend Interface: Public Landing Page & Camp Finder (/camps, CampFinder.jsx)
--   - Workflow: Safely exposes approved upcoming donation drives to the public.
--     Intentionally excludes donor identities, medical records, and private contacts.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_public_donation_camps AS
SELECT c.id AS camp_id, c.title, c.description, c.starts_at, c.ends_at,
       c.capacity, c.public_contact,
       b.name AS coordinating_blood_bank,
       l.town, l.address_line AS venue_address,
       l.latitude AS venue_latitude, l.longitude AS venue_longitude,
       l.district_code, di.name AS district_name, l.ds_code,
       med.storage_path AS poster_url
FROM donation_camps c
JOIN blood_banks b ON b.id = c.blood_bank_id
JOIN locations l ON l.id = c.location_id
JOIN districts di ON di.code = l.district_code
LEFT JOIN LATERAL (
  SELECT ma.storage_path
  FROM camp_media cm
  JOIN media_assets ma ON ma.id = cm.media_id
  WHERE cm.camp_id = c.id
  ORDER BY cm.is_primary DESC, cm.display_order ASC
  LIMIT 1
) med ON TRUE
WHERE c.status = 'APPROVED' AND c.ends_at > now();

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_request_fulfillment_progress
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/requests/progress (backend/src/routes/requests.js)
--   - Frontend Interface: Hospital Staff Dashboard & Bank Coordination Dashboard
--   - Workflow: Computes total requested, actively reserved, and fulfilled units
--     for each hospital request, avoiding multiplication traps via correlated scalar queries.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_request_fulfillment_progress AS
SELECT br.id AS request_id, br.hospital_id, br.status,
       sum(ri.units_requested)::bigint AS requested_units,
       sum((SELECT count(*) FROM inventory_reservations r
            WHERE r.request_item_id = ri.id AND r.status = 'ACTIVE'))::bigint AS reserved_units,
       sum((SELECT count(*) FROM inventory_reservations r
            WHERE r.request_item_id = ri.id AND r.status = 'FULFILLED'))::bigint AS fulfilled_units
FROM blood_requests br
JOIN request_items ri ON ri.request_id = br.id
GROUP BY br.id, br.hospital_id, br.status;

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_camp_registration_summary
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/camps/:id/summary (backend/src/routes/camps.js)
--   - Frontend Interface: Camp Coordinator Dashboard (Attendance tracking cards)
--   - Workflow: Aggregates registration states (REGISTERED, ATTENDED, NO_SHOW)
--     using SQL FILTER clauses for quick capacity audits.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_camp_registration_summary AS
SELECT c.id AS camp_id, c.title,
       count(cr.id) FILTER (WHERE cr.status = 'REGISTERED') AS registered,
       count(cr.id) FILTER (WHERE cr.status = 'ATTENDED') AS attended,
       count(cr.id) FILTER (WHERE cr.status = 'NO_SHOW') AS no_show
FROM donation_camps c
LEFT JOIN camp_registrations cr ON cr.camp_id = c.id
GROUP BY c.id, c.title;

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_verified_institutions
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/institutions (backend/src/routes/locations.js)
--   - Frontend Interface: Admin Institution Management (/admin/institutions)
--   - Workflow: Unifies hospitals and blood banks with their verification status,
--     district codes, and contact numbers for directory searches.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_verified_institutions AS
SELECT 'hospital' AS institution_type, h.id, h.name, h.contact_phone,
       h.is_verified, l.district_code, l.ds_code, l.town
FROM hospitals h
JOIN locations l ON l.id = h.location_id
UNION ALL
SELECT 'bank' AS institution_type, b.id, b.name, b.contact_phone,
       b.is_verified, l.district_code, l.ds_code, l.town
FROM blood_banks b
JOIN locations l ON l.id = b.location_id;

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_blood_bank_cluster_stock
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/clusters/:id/stock (backend/src/routes/transfers.js)
--   - Frontend Interface: Regional NBTS Cluster Management & Emergency Dispatch
--   - Workflow: Groups released inventory by administrative blood bank cluster,
--     identifying regional surplus and shortage pockets.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_blood_bank_cluster_stock AS
SELECT c.id AS cluster_id,
       c.cluster_code,
       c.name AS cluster_name,
       bu.blood_type_code,
       bu.component_code,
       count(bu.id)::bigint AS available_units,
       min(bu.expires_at) AS earliest_expiry
FROM blood_bank_clusters c
JOIN blood_banks bb ON bb.cluster_id = c.id
JOIN blood_units bu ON bu.blood_bank_id = bb.id
WHERE bu.release_status = 'RELEASED'
  AND bu.inventory_status = 'IN_STOCK'
  AND bu.expires_at > now()
GROUP BY c.id, c.cluster_code, c.name, bu.blood_type_code, bu.component_code;

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_transfers_in_transit
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/transfers/in-transit (backend/src/routes/transfers.js)
--   - Frontend Interface: Inter-Bank Cold Chain Logistics Dashboard
--   - Workflow: Tracks custody of active blood transfers currently on the road,
--     joining origin and destination facilities with unit batch counts.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_transfers_in_transit AS
SELECT t.id AS transfer_id,
       t.transfer_code,
       sb.name AS source_bank_name,
       tb.name AS target_bank_name,
       t.status,
       t.dispatched_at,
       count(tu.blood_unit_id)::bigint AS units_count
FROM blood_bank_transfers t
JOIN blood_banks sb ON sb.id = t.source_bank_id
JOIN blood_banks tb ON tb.id = t.target_bank_id
LEFT JOIN transfer_units tu ON tu.transfer_id = t.id
WHERE t.status = 'IN_TRANSIT'
GROUP BY t.id, t.transfer_code, sb.name, tb.name, t.status, t.dispatched_at;

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_donor_intake_lookup
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/donors/lookup (backend/src/routes/donors.js)
--   - Frontend Interface: Bank Reception & Camp Check-in Intake Portal
--   - Workflow: Enables phlebotomy staff to search for donors by NIC, phone, or name,
--     displaying past donation date, deferral status, and linked user credentials.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_donor_intake_lookup AS
SELECT d.id AS donor_id,
       COALESCE(d.full_name, u.full_name) AS full_name,
       COALESCE(d.phone, u.phone) AS phone,
       COALESCE(d.email, u.email) AS email,
       d.blood_type_code,
       d.district_code,
       d.ds_code,
       d.registration_origin,
       d.available_for_contact,
       d.camp_notifications_opt_in,
       d.user_id,
       (d.user_id IS NOT NULL) AS is_online_account,
       recent.last_donation_date,
       assess.latest_assessment_status,
       assess.deferral_until
FROM donors d
LEFT JOIN users u ON u.id = d.user_id
LEFT JOIN LATERAL (
  SELECT max(don.collected_at) AS last_donation_date
  FROM donations don
  WHERE don.donor_id = d.id
) recent ON true
LEFT JOIN LATERAL (
  SELECT da.status AS latest_assessment_status, da.deferral_until
  FROM donor_assessments da
  WHERE da.donor_id = d.id
  ORDER BY da.assessed_at DESC
  LIMIT 1
) assess ON true;

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_verified_donation_history
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/donor/history (backend/src/routes/donor-portal.js)
--   - Frontend Interface: Donor Portal "My Donations" Timeline (DonorHistory.jsx)
--   - Workflow: Formats phlebotomy records with human-readable Sri Lanka timestamps,
--     facility names, and processed status for donor transparency.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_verified_donation_history AS
SELECT dn.id,
       dn.id AS donation_id,
       dn.donor_id,
       dn.collected_at,
       dn.collected_volume_ml,
       dn.process_status,
       bb.id AS blood_bank_id,
       bb.name AS blood_bank_name,
       c.id AS camp_id,
       c.title AS camp_title,
       COALESCE(bb.name, c.title, 'National Blood Bank Network') AS location_name,
       to_char(dn.collected_at, 'DD Mon YYYY') AS formatted_date,
       to_char(dn.collected_at, 'HH24:MI') AS formatted_time
FROM donations dn
LEFT JOIN blood_banks bb ON bb.id = dn.blood_bank_id
LEFT JOIN donation_camps c ON c.id = dn.camp_id
WHERE dn.process_status <> 'REJECTED'
ORDER BY dn.collected_at DESC;

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_donor_dashboard_summary
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/donor/dashboard (backend/src/routes/donor-portal.js)
--   - Frontend Interface: Donor Dashboard Overview (DonorPortal.jsx)
--   - Workflow: Single high-performance composite view combining profile,
--     contact consents, donation metrics, active invitations, and next review date.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_donor_dashboard_summary AS
SELECT d.id AS donor_id,
       d.user_id,
       COALESCE(u.full_name, d.full_name) AS full_name,
       COALESCE(u.email, d.email) AS email,
       COALESCE(u.phone, d.phone) AS phone,
       d.birth_date,
       d.weight_kg,
       d.blood_type_code,
       d.district_code,
       dist.name AS district_name,
       d.ds_code,
       ds.name AS ds_name,
       d.gn_code,
       d.town,
       d.available_for_contact,
       d.camp_notifications_opt_in,
       COALESCE(cons.sms_alerts, FALSE) AS sms_alerts,
       COALESCE(cons.email_alerts, FALSE) AS email_alerts,
       COALESCE(cons.in_app_alerts, TRUE) AS in_app_alerts,
       COALESCE(cons.newsletter_opt_in, FALSE) AS newsletter_opt_in,
       COALESCE(stats.total_donations, 0)::INT AS total_donations,
       stats.last_donation_date,
       COALESCE(inv.unread_invitations_count, 0)::INT AS unread_invitations_count
FROM donors d
LEFT JOIN users u ON u.id = d.user_id
LEFT JOIN districts dist ON dist.code = d.district_code
LEFT JOIN ds_divisions ds ON ds.code = d.ds_code AND ds.district_code = d.district_code
LEFT JOIN donor_consents cons ON cons.donor_id = d.id
LEFT JOIN LATERAL (
  SELECT count(*)::INT AS total_donations,
         max(collected_at) AS last_donation_date
  FROM donations
  WHERE donor_id = d.id AND process_status <> 'REJECTED'
) stats ON true
LEFT JOIN LATERAL (
  SELECT count(*)::INT AS unread_invitations_count
  FROM donor_invitations
  WHERE donor_id = d.id AND status = 'PENDING' AND expires_at >= now()
) inv ON true;

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_hospital_dashboard_kpis
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/hospital/dashboard/kpis (backend/src/routes/hospital.js)
--   - Frontend Interface: Hospital Portal Overview (HospitalOverview.jsx)
--   - Workflow: Computes live genuine hospital metrics: active blood orders,
--     critical requests, fulfilled orders this month, and active emergency appeals.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_hospital_dashboard_kpis AS
SELECT h.id AS hospital_id,
       h.name AS hospital_name,
       COUNT(DISTINCT br.id) FILTER (WHERE br.status IN ('OPEN', 'PARTIALLY_FILLED'))::INTEGER AS active_requests,
       COUNT(DISTINCT br.id) FILTER (WHERE br.status IN ('OPEN', 'PARTIALLY_FILLED') AND br.urgency = 'CRITICAL')::INTEGER AS critical_priority,
       COUNT(DISTINCT br.id) FILTER (WHERE br.status = 'FULFILLED' AND br.created_at >= date_trunc('month', CURRENT_DATE))::INTEGER AS fulfilled_this_month,
       COUNT(DISTINCT ea.id) FILTER (WHERE ea.status IN ('ACTIVE', 'APPROVED'))::INTEGER AS active_appeals,
       COUNT(DISTINCT br.id)::INTEGER AS total_requests
FROM hospitals h
LEFT JOIN blood_requests br ON br.hospital_id = h.id
LEFT JOIN emergency_appeals ea ON ea.hospital_id = h.id
GROUP BY h.id, h.name;

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_hospital_requests_overview
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/hospital/requests (backend/src/routes/hospital.js)
--   - Frontend Interface: Hospital Request Management Table (HospitalRequestsList.jsx)
--   - Workflow: Aggregates line items into a nested JSON array alongside request
--     fulfillment status, preventing N+1 queries from the backend.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_hospital_requests_overview AS
SELECT br.id,
       br.hospital_id,
       h.name AS hospital_name,
       loc.district_code AS hospital_district,
       br.urgency,
       br.status,
       br.needed_by,
       br.notes,
       br.created_at,
       br.created_by,
       u.full_name AS requester_name,
       COALESCE(SUM(ri.units_requested), 0)::INTEGER AS total_requested_units,
       COALESCE(
         (SELECT count(*)::int
          FROM inventory_reservations r
          JOIN request_items r_it ON r_it.id = r.request_item_id
          WHERE r_it.request_id = br.id AND r.status = 'ACTIVE'), 0
       ) AS total_reserved_units,
       COALESCE(
         (SELECT count(*)::int
          FROM inventory_reservations r
          JOIN request_items r_it ON r_it.id = r.request_item_id
          WHERE r_it.request_id = br.id AND r.status = 'FULFILLED'), 0
       ) AS total_fulfilled_units,
       COALESCE(
         (SELECT json_agg(json_build_object(
           'itemId', ri_sub.id,
           'bloodTypeCode', ri_sub.blood_type_code,
           'componentCode', ri_sub.component_code,
           'unitsRequested', ri_sub.units_requested,
           'reservedUnits', (
             SELECT count(*)::int FROM inventory_reservations res
             WHERE res.request_item_id = ri_sub.id AND res.status = 'ACTIVE'
           ),
           'fulfilledUnits', (
             SELECT count(*)::int FROM inventory_reservations res
             WHERE res.request_item_id = ri_sub.id AND res.status = 'FULFILLED'
           )
         ))
         FROM request_items ri_sub
         WHERE ri_sub.request_id = br.id), '[]'::json
       ) AS items_json
FROM blood_requests br
JOIN hospitals h ON h.id = br.hospital_id
LEFT JOIN locations loc ON loc.id = h.location_id
LEFT JOIN users u ON u.id = br.created_by
LEFT JOIN request_items ri ON ri.request_id = br.id
GROUP BY br.id, br.hospital_id, h.name, loc.district_code, br.urgency, br.status, br.needed_by, br.notes, br.created_at, br.created_by, u.full_name;

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_blood_bank_dashboard_kpis
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/bank/dashboard/kpis (backend/src/routes/bank-portal.js)
--   - Frontend Interface: Bank Staff Portal Overview (BankOverview.jsx)
--   - Workflow: Computes real-time KPIs scoped to the staff member's assigned blood bank
--     (available stock, units expiring in 7 days, today's collections, in-transit transfers).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_blood_bank_dashboard_kpis AS
SELECT
  bb.id AS blood_bank_id,
  bb.name AS blood_bank_name,
  COALESCE((
    SELECT count(*)::int
    FROM blood_units bu
    WHERE bu.blood_bank_id = bb.id
      AND bu.release_status = 'RELEASED'
      AND bu.inventory_status = 'IN_STOCK'
      AND bu.expires_at > now()
  ), 0)::int AS available_units,
  COALESCE((
    SELECT count(*)::int
    FROM blood_units bu
    WHERE bu.blood_bank_id = bb.id
      AND bu.release_status = 'RELEASED'
      AND bu.inventory_status = 'IN_STOCK'
      AND bu.expires_at > now()
      AND bu.expires_at <= now() + interval '7 days'
  ), 0)::int AS expiring_soon,
  COALESCE((
    SELECT count(*)::int
    FROM blood_requests br
    WHERE br.status IN ('OPEN', 'PARTIALLY_FILLED')
  ), 0)::int AS incoming_requests,
  COALESCE((
    SELECT count(*)::int
    FROM donations d
    WHERE d.blood_bank_id = bb.id
      AND d.collected_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Colombo')
  ), 0)::int AS today_collections,
  COALESCE((
    SELECT count(*)::int
    FROM blood_bank_transfers bbt
    WHERE (bbt.source_bank_id = bb.id OR bbt.target_bank_id = bb.id)
      AND bbt.status = 'IN_TRANSIT'
  ), 0)::int AS in_transit_transfers,
  COALESCE((
    SELECT count(*)::int
    FROM donation_camps dc
    WHERE dc.blood_bank_id = bb.id
      AND dc.status = 'APPROVED'
      AND dc.starts_at > now()
  ), 0)::int AS upcoming_camps
FROM blood_banks bb;

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_blood_bank_inventory_units
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/bank/inventory (backend/src/routes/bank-portal.js)
--   - Frontend Interface: Bank Staff Stock Management Table (StockManagement.jsx)
--   - Workflow: Granular listing of all blood units with computed days/hours
--     remaining before expiry to prioritize oldest valid stock (FEFO principle).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_blood_bank_inventory_units AS
SELECT
  bu.id,
  bu.donation_id,
  bu.blood_bank_id,
  bb.name AS blood_bank_name,
  bu.blood_type_code,
  bu.component_code,
  bu.volume_ml,
  bu.release_status,
  bu.inventory_status,
  bu.collected_at,
  bu.expires_at,
  bu.released_by,
  u.full_name AS released_by_name,
  bu.released_at,
  bu.created_at,
  CASE
    WHEN bu.expires_at <= now() THEN 0
    ELSE CEIL(EXTRACT(EPOCH FROM (bu.expires_at - now())) / 86400.0)::int
  END AS days_left,
  ROUND(EXTRACT(EPOCH FROM (bu.expires_at - now())) / 3600.0, 1) AS hours_left
FROM blood_units bu
JOIN blood_banks bb ON bb.id = bu.blood_bank_id
LEFT JOIN users u ON u.id = bu.released_by;

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_inventory_movements_detail
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/bank/audit-movements (backend/src/routes/bank-portal.js)
--   - Frontend Interface: Stock Custody Audit Log (InventoryAuditTrail.jsx)
--   - Workflow: Joins unit movements with actor user profiles and blood bank names
--     for transparent verification of status changes (IN_STOCK -> RESERVED -> ISSUED).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_inventory_movements_detail AS
SELECT
  im.id,
  im.blood_unit_id,
  bu.blood_bank_id,
  bb.name AS blood_bank_name,
  bu.blood_type_code,
  bu.component_code,
  im.from_status,
  im.to_status,
  im.action,
  im.acted_by,
  u.full_name AS actor_name,
  im.acted_at
FROM inventory_movements im
JOIN blood_units bu ON bu.id = im.blood_unit_id
JOIN blood_banks bb ON bb.id = bu.blood_bank_id
LEFT JOIN users u ON u.id = im.acted_by;

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_camp_management_detail
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/camps/management (backend/src/routes/camps.js)
--   - Frontend Interface: Admin & Staff Camp Management Table (CampsAdminView.jsx)
--   - Workflow: Enriches camp records with organizer details, full address cascades,
--     approver names, registration metrics, and primary flyer media.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_camp_management_detail AS
SELECT
  c.id AS camp_id,
  c.title,
  c.description,
  c.status,
  c.starts_at,
  c.ends_at,
  c.capacity,
  c.public_contact,
  c.blood_bank_id,
  bb.name AS blood_bank_name,
  c.organizer_id,
  co.name AS organizer_name,
  co.phone AS organizer_phone,
  co.email AS organizer_email,
  c.location_id,
  loc.district_code,
  dist.name AS district_name,
  dist.province_code,
  pr.name AS province_name,
  loc.ds_code,
  ds.name AS ds_name,
  loc.town,
  loc.address_line AS venue_address,
  loc.latitude,
  loc.longitude,
  c.proposed_by,
  u_prop.full_name AS proposed_by_name,
  c.approved_by,
  u_appr.full_name AS approved_by_name,
  c.cancellation_reason,
  c.cancelled_at,
  c.created_at,
  COALESCE(reg.registered_count, 0)::int AS registered_count,
  COALESCE(reg.attended_count, 0)::int AS attended_count,
  COALESCE(reg.no_show_count, 0)::int AS no_show_count,
  med.media_id AS primary_media_id,
  med.storage_path AS primary_poster_url,
  med.alt_text AS primary_poster_alt
FROM donation_camps c
JOIN blood_banks bb ON bb.id = c.blood_bank_id
JOIN camp_organizers co ON co.id = c.organizer_id
JOIN locations loc ON loc.id = c.location_id
LEFT JOIN districts dist ON dist.code = loc.district_code
LEFT JOIN provinces pr ON pr.code = dist.province_code
LEFT JOIN ds_divisions ds ON ds.code = loc.ds_code AND ds.district_code = loc.district_code
LEFT JOIN users u_prop ON u_prop.id = c.proposed_by
LEFT JOIN users u_appr ON u_appr.id = c.approved_by
LEFT JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE cr.status = 'REGISTERED') AS registered_count,
    count(*) FILTER (WHERE cr.status = 'ATTENDED') AS attended_count,
    count(*) FILTER (WHERE cr.status = 'NO_SHOW') AS no_show_count
  FROM camp_registrations cr
  WHERE cr.camp_id = c.id
) reg ON TRUE
LEFT JOIN LATERAL (
  SELECT cm.media_id, ma.storage_path, ma.alt_text
  FROM camp_media cm
  JOIN media_assets ma ON ma.id = cm.media_id
  WHERE cm.camp_id = c.id
  ORDER BY cm.is_primary DESC, cm.display_order ASC
  LIMIT 1
) med ON TRUE;

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_donor_camp_registrations
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/donor/camp-registrations (backend/src/routes/donor-portal.js)
--   - Frontend Interface: Donor Portal "My Registered Camps" Card List
--   - Workflow: Shows authenticated donors the upcoming mobile drives they
--     have registered for, including venue and coordinating bank information.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_donor_camp_registrations AS
SELECT
  cr.id AS registration_id,
  cr.camp_id,
  cr.donor_id,
  d.user_id,
  cr.status AS registration_status,
  cr.registered_at,
  cr.checked_in_at,
  cr.attendance_notes,
  c.title AS camp_title,
  c.description AS camp_description,
  c.starts_at,
  c.ends_at,
  c.capacity,
  c.status AS camp_status,
  c.public_contact,
  bb.name AS coordinating_blood_bank,
  co.name AS organizer_name,
  loc.town,
  loc.address_line AS venue_address,
  dist.name AS district_name,
  med.storage_path AS poster_url
FROM camp_registrations cr
JOIN donors d ON d.id = cr.donor_id
JOIN donation_camps c ON c.id = cr.camp_id
JOIN blood_banks bb ON bb.id = c.blood_bank_id
JOIN camp_organizers co ON co.id = c.organizer_id
JOIN locations loc ON loc.id = c.location_id
JOIN districts dist ON dist.code = loc.district_code
LEFT JOIN LATERAL (
  SELECT ma.storage_path
  FROM camp_media cm
  JOIN media_assets ma ON ma.id = cm.media_id
  WHERE cm.camp_id = c.id
  ORDER BY cm.is_primary DESC, cm.display_order ASC
  LIMIT 1
) med ON TRUE;

-- ----------------------------------------------------------------------------
-- CONCEPT: Regular View
-- NAME: v_notification_inbox
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/notifications (backend/src/routes/notifications.js)
--   - Frontend Interface: User Notification Dropdown & Notification Center
--   - Workflow: Displays personal alerts, camp invitations, and emergency request
--     notifications linked with referenced entity metadata.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_notification_inbox AS
SELECT
  n.id,
  n.recipient_user_id,
  n.camp_id,
  c.title AS camp_title,
  n.request_id,
  n.title,
  n.message,
  n.channel,
  n.priority,
  n.category,
  n.status,
  n.created_at
FROM notifications n
LEFT JOIN donation_camps c ON c.id = n.camp_id;


-- ============================================================================
-- SECTION 2: MATERIALIZED VIEWS (Cached Aggregations / Analytical Snapshots)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CONCEPT: Materialized View
-- NAME: mv_monthly_donation_counts
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/analytics/monthly-donations (backend/src/routes/analytics.js)
--   - Frontend Interface: Admin Analytical Dashboard & Warehouse Reporting Portal
--   - Refresh Strategy: Triggered via periodic worker or administrative command:
--       REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_donation_counts;
--   - Business Rationale: Pre-aggregates monthly donation volumes across districts
--     and blood banks in Asia/Colombo time zone, eliminating expensive scans on OLTP tables.
-- ----------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS mv_monthly_donation_counts CASCADE;

CREATE MATERIALIZED VIEW mv_monthly_donation_counts AS
SELECT date_trunc('month', d.collected_at AT TIME ZONE 'Asia/Colombo')::date
         AS month_start,
       l.district_code, d.blood_bank_id,
       count(*)::bigint AS donation_count
FROM donations d
JOIN blood_banks bb ON bb.id = d.blood_bank_id
JOIN locations l ON l.id = bb.location_id
GROUP BY 1, 2, 3
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_monthly_donations
  ON mv_monthly_donation_counts(month_start, district_code, blood_bank_id);


-- ============================================================================
-- SECTION 3: USER-DEFINED FUNCTIONS (Scalar & Table Functions)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CONCEPT: SQL User-Defined Function (Scalar)
-- NAME: fn_available_unit_count
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/blood-units/count (backend/src/routes/blood-units.js)
--   - Frontend Interface: Quick Stock Check Badge in Bank Portal
--   - Business Rationale: Returns the exact available count of released, unreserved,
--     non-expired blood units for a specific bank, blood type, and component.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_available_unit_count(
    p_blood_bank_id BIGINT, p_blood_type_code TEXT, p_component_code TEXT
) RETURNS BIGINT
LANGUAGE SQL STABLE AS $$
    SELECT count(*) FROM blood_units u
    WHERE u.blood_bank_id = p_blood_bank_id
      AND u.blood_type_code = p_blood_type_code
      AND u.component_code = p_component_code
      AND u.release_status = 'RELEASED'
      AND u.inventory_status = 'IN_STOCK'
      AND u.expires_at > now();
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: SQL User-Defined Function (Table-Valued)
-- NAME: fn_camps_in_district
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/camps/district/:districtCode (backend/src/routes/camps.js)
--   - Frontend Interface: Camp Finder Regional Filter (CampFinder.jsx)
--   - Business Rationale: Encapsulates regional camp filtering in SQL, returning
--     only public parameters without exposing donor contact numbers.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_camps_in_district(p_district_code TEXT)
RETURNS TABLE(camp_id UUID, title TEXT, starts_at TIMESTAMPTZ, town TEXT)
LANGUAGE SQL STABLE AS $$
    SELECT c.camp_id, c.title, c.starts_at, c.town
    FROM v_public_donation_camps c
    WHERE c.district_code = p_district_code
    ORDER BY c.starts_at;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: PL/pgSQL Function (Security Invoker Verification)
-- NAME: fn_staff_has_institution_access
-- WHERE USED IN SYSTEM:
--   - Backend Middleware: requireInstitutionScope (backend/src/middleware/auth.js)
--   - Workflow: Enforces Multi-Tenant Staff Scoping. Validates whether a user
--     possesses an active membership for a specific hospital or blood bank.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_staff_has_institution_access(
  p_user_id UUID,
  p_institution_type TEXT,
  p_institution_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND role = 'ADMIN' AND is_active) THEN
    RETURN TRUE;
  END IF;

  IF p_institution_type = 'hospital' THEN
    RETURN EXISTS (
      SELECT 1 FROM staff_memberships sm
      JOIN users u ON u.id = sm.user_id
      WHERE sm.user_id = p_user_id AND sm.hospital_id = p_institution_id
        AND sm.is_active AND u.is_active
    );
  ELSIF p_institution_type = 'bank' THEN
    RETURN EXISTS (
      SELECT 1 FROM staff_memberships sm
      JOIN users u ON u.id = sm.user_id
      WHERE sm.user_id = p_user_id AND sm.blood_bank_id = p_institution_id
        AND sm.is_active AND u.is_active
    );
  END IF;

  RETURN FALSE;
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: SQL User-Defined Function (Table-Valued with Lateral Joins)
-- NAME: fn_match_potential_donors
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/matching/potential-donors (backend/src/routes/matching.js)
--   - Frontend Interface: Emergency Request Donor Outreach Panel (RequestDetailsModal.jsx)
--   - Business Rationale: Identifies potential outreach donor candidates matching
--     blood group and geographical hierarchy. Excludes currently deferred donors
--     and enforces minimum donation intervals (120 days).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_match_potential_donors(
  p_blood_type_code TEXT,
  p_district_code TEXT,
  p_ds_code TEXT DEFAULT NULL,
  p_min_interval_days INT DEFAULT 120
)
RETURNS TABLE (
  donor_id UUID,
  district_code TEXT,
  ds_code TEXT,
  blood_type_code TEXT,
  last_donation_at TIMESTAMPTZ,
  days_since_last_donation INT
)
LANGUAGE sql
STABLE
AS $$
  SELECT d.id AS donor_id,
         d.district_code,
         d.ds_code,
         d.blood_type_code,
         recent.last_donation,
         COALESCE(EXTRACT(DAY FROM (now() - recent.last_donation))::int, 9999) AS days_since_last_donation
  FROM donors d
  LEFT JOIN users u ON u.id = d.user_id
  LEFT JOIN LATERAL (
    SELECT max(don.collected_at) AS last_donation
    FROM donations don
    WHERE don.donor_id = d.id
  ) recent ON true
  WHERE d.available_for_contact = TRUE
    AND (u.id IS NULL OR u.is_active = TRUE)
    AND (p_blood_type_code IS NULL OR d.blood_type_code = p_blood_type_code)
    AND (p_district_code IS NULL OR d.district_code = p_district_code)
    AND (p_ds_code IS NULL OR d.ds_code = p_ds_code)
    AND (recent.last_donation IS NULL OR recent.last_donation <= now() - (p_min_interval_days || ' days')::interval)
    AND NOT EXISTS (
      SELECT 1 FROM donor_assessments da
      WHERE da.donor_id = d.id
        AND da.status IN ('PERMANENT_DEFERRAL', 'TEMPORARY_DEFERRAL')
        AND (da.deferral_until IS NULL OR da.deferral_until >= CURRENT_DATE)
    );
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: PL/pgSQL Function (Calculated Business Rule)
-- NAME: fn_donor_next_review_date
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/donor/eligibility-review (backend/src/routes/donor-portal.js)
--   - Frontend Interface: Donor Portal Eligibility Card & Countdown Widget (DonorAccountPage.jsx)
--   - Business Rationale: Evaluates medical deferral status and 120-day interval rules
--     to compute the earliest allowable in-person assessment date.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_donor_next_review_date(p_donor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_last_donation TIMESTAMPTZ;
  v_assessment_status TEXT;
  v_deferral_reason TEXT;
  v_deferral_until DATE;
  v_target_date DATE;
  v_is_deferred BOOLEAN := FALSE;
  v_days_until INT := 0;
  v_result JSONB;
BEGIN
  SELECT max(collected_at)
  INTO v_last_donation
  FROM donations
  WHERE donor_id = p_donor_id
    AND process_status <> 'REJECTED';

  SELECT status, deferral_reason, deferral_until
  INTO v_assessment_status, v_deferral_reason, v_deferral_until
  FROM donor_assessments
  WHERE donor_id = p_donor_id
  ORDER BY assessed_at DESC
  LIMIT 1;

  IF v_assessment_status = 'PERMANENT_DEFERRAL' THEN
    v_is_deferred := TRUE;
    v_target_date := NULL;
    v_days_until := NULL;
  ELSIF v_assessment_status = 'TEMPORARY_DEFERRAL' AND v_deferral_until >= CURRENT_DATE THEN
    v_is_deferred := TRUE;
    v_target_date := v_deferral_until;
    v_days_until := (v_deferral_until - CURRENT_DATE);
  ELSE
    IF v_last_donation IS NOT NULL THEN
      v_target_date := (v_last_donation + INTERVAL '120 days')::DATE;
      IF v_target_date < CURRENT_DATE THEN
        v_target_date := CURRENT_DATE;
        v_days_until := 0;
      ELSE
        v_days_until := (v_target_date - CURRENT_DATE);
      END IF;
    ELSE
      v_target_date := CURRENT_DATE;
      v_days_until := 0;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'earliest_review_date', v_target_date,
    'days_until_review', v_days_until,
    'is_deferred', v_is_deferred,
    'deferral_status', COALESCE(v_assessment_status, 'NONE'),
    'deferral_reason', v_deferral_reason,
    'deferral_until', v_deferral_until,
    'last_donation_date', v_last_donation,
    'clearance_disclaimer', 'Calculated date represents earliest administrative assessment review and does not constitute medical transfusion clearance. Official screening occurs in-person with medical staff.'
  );

  RETURN v_result;
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: PL/pgSQL Function (Composite Match Aggregation)
-- NAME: fn_request_matching_summary
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: GET /api/v1/requests/:id/matching-summary (backend/src/routes/hospital.js)
--   - Frontend Interface: Hospital Request Coordination View (MatchingSummaryModal.jsx)
--   - Business Rationale: Summarizes matching inventory stock across regional banks
--     alongside privacy-safe donor counts in the hospital district.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_request_matching_summary(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_req RECORD;
  v_first_item RECORD;
  v_inventory_facilities BIGINT := 0;
  v_matching_units BIGINT := 0;
  v_potential_donors BIGINT := 0;
  v_total_requested INT := 0;
  v_total_fulfilled INT := 0;
  v_progress_pct INT := 0;
BEGIN
  SELECT br.id, br.hospital_id, br.urgency, br.status, loc.district_code
  INTO v_req
  FROM blood_requests br
  JOIN hospitals h ON h.id = br.hospital_id
  LEFT JOIN locations loc ON loc.id = h.location_id
  WHERE br.id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Request not found');
  END IF;

  SELECT ri.id, ri.blood_type_code, ri.component_code, ri.units_requested
  INTO v_first_item
  FROM request_items ri
  WHERE ri.request_id = p_request_id
  LIMIT 1;

  IF v_first_item.id IS NOT NULL THEN
    SELECT COUNT(DISTINCT bu.blood_bank_id), COUNT(bu.id)
    INTO v_inventory_facilities, v_matching_units
    FROM blood_units bu
    WHERE bu.blood_type_code = v_first_item.blood_type_code
      AND bu.component_code = v_first_item.component_code
      AND bu.release_status = 'RELEASED'
      AND bu.inventory_status = 'IN_STOCK'
      AND bu.expires_at > now();

    SELECT COUNT(d.id)
    INTO v_potential_donors
    FROM donors d
    JOIN donor_consents dc ON dc.donor_id = d.id
    LEFT JOIN LATERAL (
      SELECT da.status, da.deferral_until
      FROM donor_assessments da
      WHERE da.donor_id = d.id
      ORDER BY da.assessed_at DESC
      LIMIT 1
    ) assessment ON TRUE
    WHERE d.blood_type_code = v_first_item.blood_type_code
      AND d.available_for_contact = TRUE
      AND dc.contact_allowed = TRUE
      AND dc.emergency_appeal_opt_in = TRUE
      AND d.district_code = v_req.district_code
      AND COALESCE(assessment.status, 'PASSED') <> 'PERMANENT_DEFERRAL'
      AND NOT (
        assessment.status = 'TEMPORARY_DEFERRAL'
        AND assessment.deferral_until >= CURRENT_DATE
      );
  END IF;

  SELECT COALESCE(SUM(ri.units_requested), 0)::int,
         COALESCE((SELECT count(*)::int FROM inventory_reservations r JOIN request_items r_it ON r_it.id = r.request_item_id WHERE r_it.request_id = p_request_id AND r.status IN ('ACTIVE', 'FULFILLED')), 0)::int
  INTO v_total_requested, v_total_fulfilled
  FROM request_items ri
  WHERE ri.request_id = p_request_id;

  IF v_total_requested > 0 THEN
    v_progress_pct := LEAST(100, ROUND((v_total_fulfilled::numeric / v_total_requested::numeric) * 100));
  ELSE
    v_progress_pct := 0;
  END IF;

  RETURN jsonb_build_object(
    'requestId', p_request_id,
    'bloodTypeCode', v_first_item.blood_type_code,
    'componentCode', v_first_item.component_code,
    'unitsRequested', v_first_item.units_requested,
    'matchingProgress', v_progress_pct,
    'inventoryFacilitiesCount', v_inventory_facilities,
    'matchingStockUnits', v_matching_units,
    'potentialDonorsCount', v_potential_donors,
    'scope', 'Potential outreach only; no compatibility or medical clearance decision is made here'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: Transaction-Safe Function with Row-Level Locking (ACID Concurrency)
-- NAME: fn_reserve_blood_unit
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: POST /api/v1/inventory/reserve (backend/src/routes/inventory.js)
--   - Frontend Interface: Bank Staff Allocation Modal (FulfillRequestModal.jsx)
--   - Business Rationale: Serializes concurrent reservations using SELECT ... FOR UPDATE.
--     Ensures that competing requests cannot allocate the same physical blood unit twice.
--     Updates inventory status to 'RESERVED' and returns the active reservation UUID.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_reserve_blood_unit(
    p_request_item_id UUID, p_blood_unit_id UUID, p_staff_user_id UUID
) RETURNS UUID
LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  v_item RECORD;
  v_unit blood_units%ROWTYPE;
  v_already_reserved BIGINT;
  v_reservation_id UUID;
BEGIN
  SELECT ri.blood_type_code, ri.component_code, ri.units_requested,
         br.status AS request_status
  INTO v_item FROM request_items ri
  JOIN blood_requests br ON br.id = ri.request_id
  WHERE ri.id = p_request_item_id FOR UPDATE OF ri, br;

  IF NOT FOUND OR v_item.request_status NOT IN ('OPEN','PARTIALLY_FILLED') THEN
    RAISE EXCEPTION 'No open request item found' USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO v_already_reserved FROM inventory_reservations r
  WHERE r.request_item_id = p_request_item_id
    AND r.status IN ('ACTIVE', 'FULFILLED');
  IF v_already_reserved >= v_item.units_requested THEN
    RAISE EXCEPTION 'Request item already fully allocated' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_unit FROM blood_units
  WHERE id = p_blood_unit_id FOR UPDATE;
  IF NOT FOUND
     OR v_unit.blood_type_code <> v_item.blood_type_code
     OR v_unit.component_code <> v_item.component_code
     OR v_unit.release_status <> 'RELEASED'
     OR v_unit.inventory_status <> 'IN_STOCK'
     OR v_unit.expires_at <= now() THEN
    RAISE EXCEPTION 'Requested blood component is not available'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM staff_memberships sm JOIN users u ON u.id = sm.user_id
    WHERE sm.user_id = p_staff_user_id AND sm.blood_bank_id = v_unit.blood_bank_id
      AND sm.is_active AND u.is_active AND u.role = 'BANK_STAFF'
  ) THEN
    RAISE EXCEPTION 'Not authorized to reserve stock at this bank'
      USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.actor_id', p_staff_user_id::text, TRUE);
  UPDATE blood_units SET inventory_status = 'RESERVED'
  WHERE id = p_blood_unit_id;

  INSERT INTO inventory_reservations(request_item_id, blood_unit_id, reserved_by)
  VALUES (p_request_item_id, p_blood_unit_id, p_staff_user_id)
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$;


-- ============================================================================
-- SECTION 4: TRIGGER FUNCTIONS & TRIGGERS (Automated Data Integrity & Auditing)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CONCEPT: Trigger Function & Trigger (Constraint Enforcement & Serialization)
-- NAME: fn_trg_check_camp_registration / trg_check_camp_registration
-- TABLE: camp_registrations
-- WHERE USED IN SYSTEM:
--   - Business Trigger on Donor Signup: POST /api/v1/camps/:id/register
--   - Business Rationale: Prevents race condition over-registration by acquiring
--     a row lock on the parent donation_camp record, validating status = 'APPROVED'
--     and enforcing capacity boundaries before accepting new seats.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_check_camp_registration()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_status TEXT;
  v_start TIMESTAMPTZ;
  v_capacity INTEGER;
  v_registered BIGINT;
BEGIN
  IF NEW.status <> 'REGISTERED'
     OR (TG_OP = 'UPDATE' AND OLD.status = 'REGISTERED'
         AND OLD.camp_id = NEW.camp_id) THEN
    RETURN NEW;
  END IF;

  SELECT status, starts_at, capacity
  INTO v_status, v_start, v_capacity
  FROM donation_camps WHERE id = NEW.camp_id FOR UPDATE;

  IF NOT FOUND OR v_status <> 'APPROVED' OR v_start <= now() THEN
    RAISE EXCEPTION 'Camp must be approved and upcoming to accept registrations'
      USING ERRCODE = '23514';
  END IF;

  IF v_capacity IS NOT NULL THEN
    SELECT count(*) INTO v_registered FROM camp_registrations cr
    WHERE cr.camp_id = NEW.camp_id
      AND cr.status = 'REGISTERED' AND cr.id IS DISTINCT FROM NEW.id;
    IF v_registered >= v_capacity THEN
      RAISE EXCEPTION 'Camp registration capacity reached' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_camp_registration ON camp_registrations;
CREATE TRIGGER trg_check_camp_registration
BEFORE INSERT OR UPDATE OF camp_id, status ON camp_registrations
FOR EACH ROW EXECUTE FUNCTION fn_trg_check_camp_registration();

-- ----------------------------------------------------------------------------
-- CONCEPT: Trigger Function & Trigger (Automated Transactional Audit Logging)
-- NAME: fn_trg_log_blood_unit_status / trg_log_blood_unit_status
-- TABLE: blood_units
-- WHERE USED IN SYSTEM:
--   - Business Trigger on Inventory Status Transitions: reservations, transfers, releases.
--   - Business Rationale: Automatically inserts an immutable inventory_movements record
--     whenever blood_units.inventory_status changes, pulling the active actor UUID
--     from current_setting('app.actor_id') within the same database transaction.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_log_blood_unit_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_actor_text TEXT;
  v_actor UUID;
BEGIN
  v_actor_text := current_setting('app.actor_id', TRUE);
  IF v_actor_text IS NOT NULL AND v_actor_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_actor := v_actor_text::uuid;
  END IF;

  INSERT INTO inventory_movements(blood_unit_id, from_status, to_status, action, acted_by)
  VALUES (NEW.id, OLD.inventory_status, NEW.inventory_status, 'STATUS_CHANGE', v_actor);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_blood_unit_status ON blood_units;
CREATE TRIGGER trg_log_blood_unit_status
AFTER UPDATE OF inventory_status ON blood_units
FOR EACH ROW
WHEN (OLD.inventory_status IS DISTINCT FROM NEW.inventory_status)
EXECUTE FUNCTION fn_trg_log_blood_unit_status();

-- ----------------------------------------------------------------------------
-- CONCEPT: Trigger Function & Trigger (Consent Audit History Archival)
-- NAME: fn_audit_donor_consent_change / trg_log_donor_consent_change
-- TABLE: donor_consents
-- WHERE USED IN SYSTEM:
--   - Business Trigger on Donor Privacy Preferences: PATCH /api/v1/donor/consents
--   - Business Rationale: Sri Lanka Data Protection Compliance. Records a permanent
--     audit snapshot in donor_consent_history every time a donor updates contact opt-ins.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_audit_donor_consent_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO donor_consent_history (
    donor_id,
    contact_allowed,
    camp_notification_opt_in,
    emergency_appeal_opt_in,
    sms_alerts,
    email_alerts,
    in_app_alerts,
    newsletter_opt_in,
    recorded_at
  ) VALUES (
    NEW.donor_id,
    NEW.contact_allowed,
    NEW.camp_notification_opt_in,
    NEW.emergency_appeal_opt_in,
    NEW.sms_alerts,
    NEW.email_alerts,
    NEW.in_app_alerts,
    NEW.newsletter_opt_in,
    now()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_donor_consent_change ON donor_consents;
CREATE TRIGGER trg_log_donor_consent_change
AFTER INSERT OR UPDATE ON donor_consents
FOR EACH ROW EXECUTE FUNCTION fn_audit_donor_consent_change();

-- ----------------------------------------------------------------------------
-- CONCEPT: Trigger Function & Trigger (Entity Immutability Enforcement)
-- NAME: fn_prevent_visit_reassignment / trg_prevent_visit_reassignment
-- TABLE: donor_visits
-- WHERE USED IN SYSTEM:
--   - Business Trigger on In-Person Check-ins: POST /api/v1/visits
--   - Business Rationale: Prevents illegal reassignment of check-in visits across
--     different donors or blood banks, ensuring medical screening provenance.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_prevent_visit_reassignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.blood_bank_id IS DISTINCT FROM OLD.blood_bank_id THEN
    RAISE EXCEPTION 'Cannot reassign donor visit % to a different blood bank', OLD.id USING ERRCODE = '23514';
  END IF;
  IF NEW.donor_id IS DISTINCT FROM OLD.donor_id THEN
    RAISE EXCEPTION 'Cannot reassign donor visit % to a different donor', OLD.id USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_visit_reassignment ON donor_visits;
CREATE TRIGGER trg_prevent_visit_reassignment
BEFORE UPDATE OF blood_bank_id, donor_id ON donor_visits
FOR EACH ROW EXECUTE FUNCTION fn_prevent_visit_reassignment();

-- ----------------------------------------------------------------------------
-- CONCEPT: Trigger Function & Trigger (Request Lifecycle State Audit)
-- NAME: fn_audit_blood_request_status / trg_audit_blood_request_status
-- TABLE: blood_requests
-- WHERE USED IN SYSTEM:
--   - Business Trigger on Hospital Orders: status updates (OPEN -> PARTIAL -> FULFILLED)
--   - Business Rationale: Records every status transition in request_status_history
--     with actor identity and timestamp for medical dispute resolution.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_audit_blood_request_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor_text TEXT;
  v_actor UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_actor_text := current_setting('app.actor_id', TRUE);
    IF v_actor_text IS NOT NULL AND v_actor_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_actor := v_actor_text::uuid;
    END IF;

    INSERT INTO request_status_history (request_id, from_status, to_status, changed_by, reason, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, v_actor, 'Status update via operational procedure', now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_blood_request_status ON blood_requests;
CREATE TRIGGER trg_audit_blood_request_status
AFTER UPDATE OF status ON blood_requests
FOR EACH ROW
EXECUTE FUNCTION fn_audit_blood_request_status();


-- ============================================================================
-- SECTION 5: PL/pgSQL STORED PROCEDURES (Atomic Business Operations & Security)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CONCEPT: Stored Procedure
-- NAME: sp_approve_donation_camp
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: POST /api/v1/camps/:id/approve (backend/src/routes/camps.js)
--   - Frontend Interface: Bank Staff & Admin Camp Approval Modal (CampDetailsModal.jsx)
--   - Business Rationale: Verifies that only active BANK_STAFF at the verified
--     coordinating blood bank or ADMIN can approve upcoming PENDING camps.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_approve_donation_camp(p_camp_id UUID, p_staff_user_id UUID)
LANGUAGE plpgsql AS $$
DECLARE
  v_camp donation_camps%ROWTYPE;
BEGIN
  SELECT * INTO v_camp
  FROM donation_camps WHERE id = p_camp_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Camp does not exist' USING ERRCODE = 'P0002';
  END IF;

  IF v_camp.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Only a PENDING camp can be approved' USING ERRCODE = '23514';
  END IF;

  IF v_camp.starts_at <= now() THEN
    RAISE EXCEPTION 'Cannot approve a camp after it begins' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM blood_banks b WHERE b.id = v_camp.blood_bank_id AND b.is_verified
  ) THEN
    RAISE EXCEPTION 'Coordinating blood bank must be verified' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = p_staff_user_id AND u.is_active AND (
      u.role = 'ADMIN' OR (u.role = 'BANK_STAFF' AND EXISTS (
        SELECT 1 FROM staff_memberships sm
        WHERE sm.user_id = u.id AND sm.is_active
          AND sm.blood_bank_id = v_camp.blood_bank_id
      ))
    )
  ) THEN
    RAISE EXCEPTION 'User is not authorized for the verified coordinating bank' USING ERRCODE = '42501';
  END IF;

  UPDATE donation_camps SET status = 'APPROVED', approved_by = p_staff_user_id
  WHERE id = p_camp_id;

  INSERT INTO audit_logs(actor_id, entity_name, entity_id, action)
  VALUES (p_staff_user_id, 'donation_camps', p_camp_id::text, 'APPROVE');
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: Stored Procedure
-- NAME: sp_cancel_donation_camp
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: POST /api/v1/camps/:id/cancel (backend/src/routes/camps.js)
--   - Frontend Interface: Camp Coordinator Action Menu
--   - Business Rationale: Transitions active camp to CANCELLED, logs cancellation
--     reasons, and enqueues transactional outbox notification events for registered donors.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_cancel_donation_camp(
  p_camp_id UUID,
  p_staff_user_id UUID,
  p_reason TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
  v_camp donation_camps%ROWTYPE;
BEGIN
  SELECT * INTO v_camp
  FROM donation_camps WHERE id = p_camp_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Camp % does not exist', p_camp_id USING ERRCODE = 'P0002';
  END IF;

  IF v_camp.status IN ('CANCELLED', 'COMPLETED') THEN
    RAISE EXCEPTION 'Camp % is already % and cannot be cancelled', p_camp_id, v_camp.status USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_staff_user_id AND role = 'ADMIN'
  ) AND NOT EXISTS (
    SELECT 1 FROM staff_memberships sm
    WHERE sm.user_id = p_staff_user_id
      AND sm.blood_bank_id = v_camp.blood_bank_id
      AND sm.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Staff % is not authorized for blood bank %', p_staff_user_id, v_camp.blood_bank_id USING ERRCODE = '42501';
  END IF;

  UPDATE donation_camps
  SET status = 'CANCELLED',
      cancelled_by = p_staff_user_id,
      cancelled_at = now(),
      cancellation_reason = p_reason
  WHERE id = p_camp_id;

  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_staff_user_id, 'donation_camps', p_camp_id::text, 'CANCEL_CAMP');

  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'CAMP_CANCELLED',
    'donation_camps',
    p_camp_id::text,
    jsonb_build_object(
      'campId', p_camp_id,
      'title', v_camp.title,
      'reason', p_reason,
      'cancelledBy', p_staff_user_id
    )
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: Stored Procedure
-- NAME: sp_checkin_camp_donor
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: POST /api/v1/camps/:id/checkin (backend/src/routes/camps.js)
--   - Frontend Interface: Camp Receptionist Tablet / On-Site Check-in Scanner
--   - Business Rationale: Records donor arrival at camp. Handles both pre-registered
--     attendees and spontaneous on-the-spot walk-ins with audit logging.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_checkin_camp_donor(
  p_camp_id UUID,
  p_donor_id UUID,
  p_staff_user_id UUID,
  p_status TEXT,
  p_notes TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
  v_camp donation_camps%ROWTYPE;
  v_reg RECORD;
BEGIN
  SELECT * INTO v_camp
  FROM donation_camps WHERE id = p_camp_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Camp % does not exist', p_camp_id USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_staff_user_id AND role = 'ADMIN'
  ) AND NOT EXISTS (
    SELECT 1 FROM staff_memberships sm
    WHERE sm.user_id = p_staff_user_id
      AND sm.blood_bank_id = v_camp.blood_bank_id
      AND sm.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Staff % is not authorized for blood bank %', p_staff_user_id, v_camp.blood_bank_id USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('ATTENDED', 'NO_SHOW', 'REGISTERED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid attendance status: %', p_status USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_reg
  FROM camp_registrations
  WHERE camp_id = p_camp_id AND donor_id = p_donor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO camp_registrations (
      camp_id, donor_id, status, checked_in_at, checked_in_by, attendance_notes
    )
    VALUES (
      p_camp_id, p_donor_id, p_status,
      CASE WHEN p_status = 'ATTENDED' THEN now() ELSE NULL END,
      p_staff_user_id, p_notes
    );
  ELSE
    UPDATE camp_registrations
    SET status = p_status,
        checked_in_at = CASE WHEN p_status = 'ATTENDED' THEN now() ELSE checked_in_at END,
        checked_in_by = p_staff_user_id,
        attendance_notes = p_notes
    WHERE id = v_reg.id;
  END IF;

  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_staff_user_id, 'camp_registrations', p_camp_id::text || ':' || p_donor_id::text, 'ATTENDANCE_' || p_status);
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: Stored Procedure (Concurrency-Hardened Atomic Dispatch)
-- NAME: sp_dispatch_blood_transfer
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: POST /api/v1/transfers/:id/dispatch (backend/src/routes/transfers.js)
--   - Frontend Interface: Inter-Bank Transfers Portal (TransferDispatchModal.jsx)
--   - Business Rationale: Locks attached units FIRST to prevent race conditions,
--     verifies that all units are RELEASED, IN_STOCK, and non-expired at the source bank,
--     transitions units to IN_TRANSIT, and publishes a transactional outbox event.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_dispatch_blood_transfer(
  p_transfer_id UUID,
  p_actor_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_source_bank_id BIGINT;
  v_status TEXT;
  v_total_units INT;
  v_bad_unit_id UUID;
  v_bad_bank_id BIGINT;
  v_bad_release_status TEXT;
  v_bad_inv_status TEXT;
  v_bad_expiry TIMESTAMPTZ;
BEGIN
  SELECT source_bank_id, status INTO v_source_bank_id, v_status
  FROM blood_bank_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer % not found', p_transfer_id USING ERRCODE = 'P0002';
  END IF;

  IF v_status NOT IN ('REQUESTED', 'APPROVED') THEN
    RAISE EXCEPTION 'Cannot dispatch transfer in status % (must be REQUESTED or APPROVED)', v_status USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_actor_id AND role = 'ADMIN'
  ) AND NOT EXISTS (
    SELECT 1 FROM staff_memberships
    WHERE user_id = p_actor_id AND blood_bank_id = v_source_bank_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Actor % is not authorized to dispatch transfers for source blood bank %',
      p_actor_id, v_source_bank_id USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_total_units
  FROM transfer_units
  WHERE transfer_id = p_transfer_id;

  IF v_total_units = 0 THEN
    RAISE EXCEPTION 'Cannot dispatch transfer % with zero attached units', p_transfer_id USING ERRCODE = '23514';
  END IF;

  -- HARDENING: Lock ALL attached units BEFORE checking eligibility
  PERFORM bu.id
  FROM transfer_units tu
  JOIN blood_units bu ON bu.id = tu.blood_unit_id
  WHERE tu.transfer_id = p_transfer_id
  FOR UPDATE OF bu;

  SELECT bu.id, bu.blood_bank_id, bu.release_status, bu.inventory_status, bu.expires_at
  INTO v_bad_unit_id, v_bad_bank_id, v_bad_release_status, v_bad_inv_status, v_bad_expiry
  FROM transfer_units tu
  JOIN blood_units bu ON bu.id = tu.blood_unit_id
  WHERE tu.transfer_id = p_transfer_id
    AND (
      bu.blood_bank_id <> v_source_bank_id
      OR bu.release_status <> 'RELEASED'
      OR bu.inventory_status <> 'IN_STOCK'
      OR bu.expires_at <= now()
    )
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Unit % attached to transfer % is ineligible for dispatch (bank: %, release: %, status: %, expiry: %)',
      v_bad_unit_id, p_transfer_id, v_bad_bank_id, v_bad_release_status, v_bad_inv_status, v_bad_expiry
      USING ERRCODE = '23514';
  END IF;

  PERFORM set_config('app.actor_id', p_actor_id::text, TRUE);

  UPDATE blood_units bu
  SET inventory_status = 'IN_TRANSIT'
  FROM transfer_units tu
  WHERE tu.transfer_id = p_transfer_id
    AND bu.id = tu.blood_unit_id;

  UPDATE blood_bank_transfers
  SET status = 'IN_TRANSIT',
      dispatched_by = p_actor_id,
      dispatched_at = now()
  WHERE id = p_transfer_id;

  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_actor_id, 'blood_bank_transfers', p_transfer_id::text, 'DISPATCH_TRANSFER');

  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'TRANSFER_DISPATCHED',
    'blood_bank_transfers',
    p_transfer_id::text,
    jsonb_build_object(
      'transferId', p_transfer_id,
      'status', 'IN_TRANSIT',
      'sourceBankId', v_source_bank_id,
      'unitCount', v_total_units,
      'dispatchedBy', p_actor_id
    )
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: Stored Procedure (Concurrency-Hardened Atomic Receipt)
-- NAME: sp_receive_blood_transfer
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: POST /api/v1/transfers/:id/receive (backend/src/routes/transfers.js)
--   - Frontend Interface: Inter-Bank Transfers Portal (ReceiveTransferModal.jsx)
--   - Business Rationale: Verifies receiving staff belongs to target blood bank,
--     verifies transfer is IN_TRANSIT, transfers custody of all units to target bank,
--     returns units to IN_STOCK, and updates transfer status to RECEIVED with notes.
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_receive_blood_transfer(UUID, UUID);

CREATE OR REPLACE PROCEDURE sp_receive_blood_transfer(
  p_transfer_id UUID,
  p_actor_id UUID,
  p_notes TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_source_bank_id BIGINT;
  v_target_bank_id BIGINT;
  v_status TEXT;
  v_total_units INT;
  v_bad_unit_id UUID;
  v_bad_inv_status TEXT;
  v_bad_bank_id BIGINT;
BEGIN
  SELECT source_bank_id, target_bank_id, status INTO v_source_bank_id, v_target_bank_id, v_status
  FROM blood_bank_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer % not found', p_transfer_id USING ERRCODE = 'P0002';
  END IF;

  IF v_status <> 'IN_TRANSIT' THEN
    RAISE EXCEPTION 'Cannot receive transfer in status % (must be IN_TRANSIT)', v_status USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_actor_id AND role = 'ADMIN'
  ) AND NOT EXISTS (
    SELECT 1 FROM staff_memberships
    WHERE user_id = p_actor_id AND blood_bank_id = v_target_bank_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Actor % is not authorized to receive transfers for destination blood bank %',
      p_actor_id, v_target_bank_id USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_total_units
  FROM transfer_units
  WHERE transfer_id = p_transfer_id;

  IF v_total_units = 0 THEN
    RAISE EXCEPTION 'Cannot receive transfer % with zero attached units', p_transfer_id USING ERRCODE = '23514';
  END IF;

  -- HARDENING: Lock ALL attached units FIRST
  PERFORM bu.id
  FROM transfer_units tu
  JOIN blood_units bu ON bu.id = tu.blood_unit_id
  WHERE tu.transfer_id = p_transfer_id
  FOR UPDATE OF bu;

  SELECT bu.id, bu.blood_bank_id, bu.inventory_status
  INTO v_bad_unit_id, v_bad_bank_id, v_bad_inv_status
  FROM transfer_units tu
  JOIN blood_units bu ON bu.id = tu.blood_unit_id
  WHERE tu.transfer_id = p_transfer_id
    AND (
      bu.blood_bank_id <> v_source_bank_id
      OR bu.inventory_status <> 'IN_TRANSIT'
    )
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Unit % attached to transfer % is invalid for receipt (bank: %, status: %, expected bank: %)',
      v_bad_unit_id, p_transfer_id, v_bad_bank_id, v_bad_inv_status, v_source_bank_id
      USING ERRCODE = '23514';
  END IF;

  PERFORM set_config('app.actor_id', p_actor_id::text, TRUE);

  UPDATE blood_units bu
  SET blood_bank_id = v_target_bank_id,
      inventory_status = 'IN_STOCK'
  FROM transfer_units tu
  WHERE tu.transfer_id = p_transfer_id
    AND bu.id = tu.blood_unit_id;

  UPDATE blood_bank_transfers
  SET status = 'RECEIVED',
      received_by = p_actor_id,
      received_at = now(),
      notes = CASE
        WHEN p_notes IS NOT NULL AND p_notes <> ''
        THEN COALESCE(notes || ' | Receipt: ', '') || p_notes
        ELSE notes
      END
  WHERE id = p_transfer_id;

  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_actor_id, 'blood_bank_transfers', p_transfer_id::text, 'RECEIVE_TRANSFER');

  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'TRANSFER_RECEIVED',
    'blood_bank_transfers',
    p_transfer_id::text,
    jsonb_build_object(
      'transferId', p_transfer_id,
      'status', 'RECEIVED',
      'sourceBankId', v_source_bank_id,
      'targetBankId', v_target_bank_id,
      'unitCount', v_total_units,
      'receivedBy', p_actor_id,
      'notes', p_notes
    )
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: Stored Procedure (Donor Identity Reconciliation)
-- NAME: sp_approve_donor_account_claim
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: POST /api/v1/claims/:id/approve (backend/src/routes/claims.js)
--   - Frontend Interface: Admin Identity Management (/admin/claims)
--   - Business Rationale: Safely merges an online user registration with an existing
--     walk-in physical donor record, preserving historical donations and assessments.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_approve_donor_account_claim(
  p_claim_id UUID,
  p_reviewer_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_donor_id UUID;
  v_claim_status TEXT;
  v_existing_donor_user_id UUID;
  v_user_already_linked UUID;
BEGIN
  SELECT user_id, donor_id, status INTO v_user_id, v_donor_id, v_claim_status
  FROM donor_account_claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim % not found', p_claim_id USING ERRCODE = 'P0002';
  END IF;

  IF v_claim_status <> 'PENDING' THEN
    RAISE EXCEPTION 'Cannot approve claim in status % (must be PENDING)', v_claim_status USING ERRCODE = '23514';
  END IF;

  SELECT user_id INTO v_existing_donor_user_id
  FROM donors
  WHERE id = v_donor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target donor % not found', v_donor_id USING ERRCODE = 'P0002';
  END IF;

  IF v_existing_donor_user_id IS NOT NULL AND v_existing_donor_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Donor % is already linked to user %', v_donor_id, v_existing_donor_user_id USING ERRCODE = '23505';
  END IF;

  SELECT id INTO v_user_already_linked
  FROM donors
  WHERE user_id = v_user_id AND id <> v_donor_id;

  IF v_user_already_linked IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM donations WHERE donor_id = v_user_already_linked)
       OR EXISTS (SELECT 1 FROM donor_assessments WHERE donor_id = v_user_already_linked)
       OR EXISTS (SELECT 1 FROM donor_visits WHERE donor_id = v_user_already_linked) THEN
      RAISE EXCEPTION 'User % already has an active donor profile % with clinical history. Cannot merge identities automatically.',
        v_user_id, v_user_already_linked USING ERRCODE = '23514';
    END IF;

    UPDATE camp_registrations cr
    SET donor_id = v_donor_id
    WHERE cr.donor_id = v_user_already_linked
      AND NOT EXISTS (
        SELECT 1 FROM camp_registrations cr2
        WHERE cr2.donor_id = v_donor_id AND cr2.camp_id = cr.camp_id
      );
    DELETE FROM camp_registrations WHERE donor_id = v_user_already_linked;

    UPDATE donor_consents dc_target
    SET contact_allowed = dc_source.contact_allowed,
        camp_notification_opt_in = dc_source.camp_notification_opt_in,
        emergency_appeal_opt_in = dc_source.emergency_appeal_opt_in,
        updated_at = now()
    FROM donor_consents dc_source
    WHERE dc_source.donor_id = v_user_already_linked AND dc_target.donor_id = v_donor_id;

    UPDATE donors
    SET user_id = NULL,
        reconciled_to_donor_id = v_donor_id
    WHERE id = v_user_already_linked;
  END IF;

  UPDATE donors
  SET user_id = v_user_id
  WHERE id = v_donor_id;

  UPDATE donor_account_claims
  SET status = 'APPROVED',
      reviewed_by = p_reviewer_id,
      reviewed_at = now()
  WHERE id = p_claim_id;

  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_reviewer_id, 'donor_account_claims', p_claim_id::text, 'APPROVE_CLAIM');

  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'DONOR_ACCOUNT_LINKED',
    'donors',
    v_donor_id::text,
    jsonb_build_object(
      'claimId', p_claim_id,
      'donorId', v_donor_id,
      'userId', v_user_id,
      'approvedBy', p_reviewer_id
    )
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: Stored Procedure
-- NAME: sp_reject_donor_account_claim
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: POST /api/v1/claims/:id/reject (backend/src/routes/claims.js)
--   - Frontend Interface: Admin Identity Management
--   - Business Rationale: Rejects identity claim with mandatory audit remarks.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_reject_donor_account_claim(
  p_claim_id UUID,
  p_reviewer_id UUID,
  p_rejection_reason TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_claim_status TEXT;
BEGIN
  SELECT status INTO v_claim_status
  FROM donor_account_claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim % not found', p_claim_id USING ERRCODE = 'P0002';
  END IF;

  IF v_claim_status <> 'PENDING' THEN
    RAISE EXCEPTION 'Cannot reject claim in status % (must be PENDING)', v_claim_status USING ERRCODE = '23514';
  END IF;

  UPDATE donor_account_claims
  SET status = 'REJECTED',
      reviewed_by = p_reviewer_id,
      reviewed_at = now(),
      verification_notes = COALESCE(verification_notes || ' | Rejection: ', '') || p_rejection_reason
  WHERE id = p_claim_id;

  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_reviewer_id, 'donor_account_claims', p_claim_id::text, 'REJECT_CLAIM');
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: Stored Procedure (Clinical Assessment Registration)
-- NAME: sp_record_donor_assessment
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: POST /api/v1/donors/assessments (backend/src/routes/donors.js)
--   - Frontend Interface: Medical Staff Screening Station (DonorIntakeScreen.jsx)
--   - Business Rationale: Registers hemoglobin, weight, and blood pressure screening.
--     Enforces medical deferral periods and updates donor visit status.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_record_donor_assessment(
  p_visit_id UUID,
  p_assessed_by UUID,
  p_hemoglobin NUMERIC,
  p_weight NUMERIC,
  p_status TEXT,
  p_deferral_reason TEXT,
  p_deferral_until DATE,
  p_notes TEXT,
  INOUT p_assessment_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_donor_id UUID;
  v_bank_id BIGINT;
  v_visit_status TEXT;
  v_new_visit_status TEXT;
BEGIN
  SELECT donor_id, blood_bank_id, status
  INTO v_donor_id, v_bank_id, v_visit_status
  FROM donor_visits
  WHERE id = p_visit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % not found', p_visit_id USING ERRCODE = 'P0002';
  END IF;

  IF v_visit_status = 'COLLECTION_COMPLETED' THEN
    RAISE EXCEPTION 'Cannot record assessment on visit % that has already completed collection', p_visit_id USING ERRCODE = '23514';
  END IF;

  IF v_bank_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM users WHERE id = p_assessed_by AND role = 'ADMIN'
    ) AND NOT EXISTS (
      SELECT 1 FROM staff_memberships
      WHERE user_id = p_assessed_by AND blood_bank_id = v_bank_id AND is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'Actor % is not authorized to assess donors for blood bank %', p_assessed_by, v_bank_id USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_status IN ('TEMPORARY_DEFERRAL', 'PERMANENT_DEFERRAL') AND (p_deferral_reason IS NULL OR trim(p_deferral_reason) = '') THEN
    RAISE EXCEPTION 'deferral_reason is mandatory when assessment status is %', p_status USING ERRCODE = '23514';
  END IF;

  p_assessment_id := gen_random_uuid();
  INSERT INTO donor_assessments (
    id, visit_id, donor_id, assessed_by, assessed_at,
    hemoglobin_g_dl, weight_kg, status, deferral_reason, deferral_until, notes
  )
  VALUES (
    p_assessment_id, p_visit_id, v_donor_id, p_assessed_by, now(),
    p_hemoglobin, p_weight, p_status, p_deferral_reason, p_deferral_until, p_notes
  );

  v_new_visit_status := CASE WHEN p_status = 'PASSED' THEN 'ASSESSMENT_PENDING' ELSE 'DEFERRED' END;
  UPDATE donor_visits
  SET status = v_new_visit_status
  WHERE id = p_visit_id;

  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_assessed_by, 'donor_assessments', p_assessment_id::text, 'RECORD_ASSESSMENT');
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: Stored Procedure (Phlebotomy Collection Recording)
-- NAME: sp_record_donation_collection
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: POST /api/v1/donations (backend/src/routes/donations.js)
--   - Frontend Interface: Phlebotomy Collection Desk (PhlebotomyConsole.jsx)
--   - Business Rationale: Atomically links phlebotomy draw to a PASSED clinical visit,
--     enforces exactly 1 donation per visit at DB level, and transitions visit status.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_record_donation_collection(
  p_visit_id UUID,
  p_donor_id UUID,
  p_blood_bank_id BIGINT,
  p_camp_id UUID,
  p_blood_type_code TEXT,
  p_collected_volume_ml INT,
  p_collector_id UUID,
  INOUT p_donation_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_visit_donor_id UUID;
  v_visit_bank_id BIGINT;
  v_visit_camp_id UUID;
  v_visit_status TEXT;
  v_latest_assess_status TEXT;
BEGIN
  SELECT donor_id, blood_bank_id, camp_id, status
  INTO v_visit_donor_id, v_visit_bank_id, v_visit_camp_id, v_visit_status
  FROM donor_visits
  WHERE id = p_visit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % not found', p_visit_id USING ERRCODE = 'P0002';
  END IF;

  IF v_visit_status = 'COLLECTION_COMPLETED' THEN
    RAISE EXCEPTION 'Visit % has already completed donation collection', p_visit_id USING ERRCODE = '23514';
  END IF;

  IF v_visit_status IN ('DEFERRED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Cannot record collection for visit % in status %', p_visit_id, v_visit_status USING ERRCODE = '23514';
  END IF;

  IF v_visit_donor_id <> p_donor_id THEN
    RAISE EXCEPTION 'Donor % does not match visit donor %', p_donor_id, v_visit_donor_id USING ERRCODE = '23514';
  END IF;

  IF v_visit_bank_id IS NOT NULL AND v_visit_bank_id <> p_blood_bank_id THEN
    RAISE EXCEPTION 'Blood bank % does not match visit bank %', p_blood_bank_id, v_visit_bank_id USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_collector_id AND role = 'ADMIN'
  ) AND NOT EXISTS (
    SELECT 1 FROM staff_memberships
    WHERE user_id = p_collector_id AND blood_bank_id = p_blood_bank_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Actor % is not authorized to record collections at blood bank %', p_collector_id, p_blood_bank_id USING ERRCODE = '42501';
  END IF;

  SELECT status INTO v_latest_assess_status
  FROM donor_assessments
  WHERE visit_id = p_visit_id AND donor_id = p_donor_id
  ORDER BY assessed_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_latest_assess_status IS NULL OR v_latest_assess_status <> 'PASSED' THEN
    RAISE EXCEPTION 'Cannot record collection: Visit % does not have a passing assessment (status: %)',
      p_visit_id, COALESCE(v_latest_assess_status, 'NONE') USING ERRCODE = '23514';
  END IF;

  p_donation_id := gen_random_uuid();
  INSERT INTO donations (
    id, visit_id, donor_id, blood_bank_id, camp_id,
    collected_at, collected_volume_ml, process_status
  )
  VALUES (
    p_donation_id, p_visit_id, p_donor_id, p_blood_bank_id, p_camp_id,
    now(), p_collected_volume_ml, 'COLLECTED'
  );

  UPDATE donor_visits
  SET status = 'COLLECTION_COMPLETED'
  WHERE id = p_visit_id;

  IF p_blood_type_code IS NOT NULL THEN
    UPDATE donors
    SET blood_type_code = p_blood_type_code
    WHERE id = p_donor_id AND blood_type_code IS NULL;
  END IF;

  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_collector_id, 'donations', p_donation_id::text, 'COLLECT_DONATION');

  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'DONATION_COLLECTED',
    'donations',
    p_donation_id::text,
    jsonb_build_object(
      'donationId', p_donation_id,
      'visitId', p_visit_id,
      'donorId', p_donor_id,
      'bloodBankId', p_blood_bank_id,
      'campId', p_camp_id,
      'bloodTypeCode', p_blood_type_code,
      'collectedVolumeMl', p_collected_volume_ml
    )
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: Stored Procedure (Laboratory Quarantine Release Authority)
-- NAME: sp_release_blood_unit
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: PATCH /api/v1/blood-units/:id/release (backend/src/routes/blood-units.js)
--   - Frontend Interface: Serology Lab & Quality Assurance Screen (QualityReleaseModal.jsx)
--   - Business Rationale: Enforces strict clinical authority. Only authorized lab staff
--     assigned to the specific blood bank can release units from QUARANTINED to RELEASED
--     (or reject to DISCARDED) after serology, NAT, and immunohematology clearance.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_release_blood_unit(
  p_unit_id UUID,
  p_staff_user_id UUID,
  p_release_status TEXT,
  p_notes TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_unit RECORD;
BEGIN
  IF p_release_status NOT IN ('RELEASED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid release status % (must be RELEASED or REJECTED)', p_release_status USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_unit
  FROM blood_units
  WHERE id = p_unit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Blood unit % not found', p_unit_id USING ERRCODE = 'P0002';
  END IF;

  IF v_unit.release_status <> 'QUARANTINED' THEN
    RAISE EXCEPTION 'Unit % is already in release status %', p_unit_id, v_unit.release_status USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM staff_memberships
    WHERE user_id = p_staff_user_id
      AND blood_bank_id = v_unit.blood_bank_id
      AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Staff % is not authorized for clinical release at blood bank %', p_staff_user_id, v_unit.blood_bank_id USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.actor_id', p_staff_user_id::text, TRUE);

  IF p_release_status = 'RELEASED' THEN
    UPDATE blood_units
    SET release_status = 'RELEASED',
        released_by = p_staff_user_id,
        released_at = now()
    WHERE id = p_unit_id;
  ELSE
    UPDATE blood_units
    SET release_status = 'REJECTED',
        inventory_status = 'DISCARDED',
        released_by = p_staff_user_id,
        released_at = now()
    WHERE id = p_unit_id;
  END IF;

  INSERT INTO inventory_movements (blood_unit_id, from_status, to_status, action, acted_by)
  VALUES (p_unit_id, 'QUARANTINED', p_release_status, 'CLINICAL_RELEASE', p_staff_user_id);
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: Stored Procedure (Component Separation & Shelf-Life Calculation)
-- NAME: sp_process_donation_components
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: POST /api/v1/donations/:id/components (backend/src/routes/donations.js)
--   - Frontend Interface: Component Processing Lab Station (ComponentProcessingModal.jsx)
--   - Business Rationale: Breaks whole blood into packed red cells (35 days),
--     platelets (5 days), and fresh frozen plasma (365 days) with automatic expiry computation.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_process_donation_components(
  p_donation_id UUID,
  p_staff_user_id UUID,
  p_components JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_donation RECORD;
  v_comp RECORD;
  v_donor_blood_type TEXT;
  v_unit_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT d.*, don.blood_type_code AS donor_blood_type
  INTO v_donation
  FROM donations d
  JOIN donors don ON don.id = d.donor_id
  WHERE d.id = p_donation_id
  FOR UPDATE OF d;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donation % not found', p_donation_id USING ERRCODE = 'P0002';
  END IF;

  IF v_donation.process_status <> 'COLLECTED' THEN
    RAISE EXCEPTION 'Donation % is in status %, cannot process (must be COLLECTED)',
      p_donation_id, v_donation.process_status USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_staff_user_id AND role = 'ADMIN'
  ) AND NOT EXISTS (
    SELECT 1 FROM staff_memberships
    WHERE user_id = p_staff_user_id AND blood_bank_id = v_donation.blood_bank_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Staff % is not authorized for blood bank %', p_staff_user_id, v_donation.blood_bank_id USING ERRCODE = '42501';
  END IF;

  v_donor_blood_type := v_donation.donor_blood_type;
  IF v_donor_blood_type IS NULL THEN
    RAISE EXCEPTION 'Cannot process donation %: donor blood type is not verified', p_donation_id USING ERRCODE = '23514';
  END IF;

  FOR v_comp IN
    SELECT
      elem->>'componentCode' AS component_code,
      COALESCE((elem->>'volumeMl')::int, 450) AS volume_ml,
      COALESCE((elem->>'daysValid')::int,
        CASE elem->>'componentCode'
          WHEN 'PLATELETS' THEN 5
          WHEN 'RBC' THEN 35
          WHEN 'PLASMA' THEN 365
          ELSE 35
        END
      ) AS days_valid
    FROM jsonb_array_elements(p_components) AS elem
  LOOP
    v_expires_at := v_donation.collected_at + (v_comp.days_valid || ' days')::interval;
    v_unit_id := gen_random_uuid();

    INSERT INTO blood_units (
      id, donation_id, blood_bank_id, blood_type_code, component_code,
      collected_at, expires_at, release_status, inventory_status, volume_ml
    )
    VALUES (
      v_unit_id, p_donation_id, v_donation.blood_bank_id, v_donor_blood_type, v_comp.component_code,
      v_donation.collected_at, v_expires_at, 'QUARANTINED', 'IN_STOCK', v_comp.volume_ml
    );
  END LOOP;

  UPDATE donations
  SET process_status = 'PROCESSED'
  WHERE id = p_donation_id;

  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_staff_user_id, 'donations', p_donation_id::text, 'PROCESS_COMPONENTS');

  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'DONATION_PROCESSED',
    'donations',
    p_donation_id::text,
    jsonb_build_object(
      'donationId', p_donation_id,
      'bloodBankId', v_donation.blood_bank_id,
      'processedBy', p_staff_user_id,
      'components', p_components
    )
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: Stored Procedure (Safe Blood Request Cancellation)
-- NAME: sp_cancel_blood_request
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: POST /api/v1/requests/:id/cancel (backend/src/routes/requests.js)
--   - Frontend Interface: Hospital Request Coordination Table
--   - Business Rationale: Idempotently releases reserved stock back to IN_STOCK,
--     cancels linked emergency appeals, and records status change in history.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_cancel_blood_request(
  p_request_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT 'Cancelled by authorized hospital staff'
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_req RECORD;
  v_res RECORD;
BEGIN
  SELECT id, hospital_id, status
  INTO v_req
  FROM blood_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Blood request not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_req.status = 'FULFILLED' THEN
    RAISE EXCEPTION 'Cannot cancel an already fulfilled blood request' USING ERRCODE = '23514';
  END IF;

  IF v_req.status = 'CANCELLED' THEN
    RETURN;
  END IF;

  PERFORM set_config('app.actor_id', p_user_id::text, TRUE);

  FOR v_res IN
    SELECT ir.id AS res_id, ir.blood_unit_id
    FROM inventory_reservations ir
    JOIN request_items ri ON ri.id = ir.request_item_id
    WHERE ri.request_id = p_request_id AND ir.status = 'ACTIVE'
    FOR UPDATE OF ir
  LOOP
    UPDATE inventory_reservations
    SET status = 'CANCELLED'
    WHERE id = v_res.res_id;

    UPDATE blood_units
    SET inventory_status = 'IN_STOCK'
    WHERE id = v_res.blood_unit_id AND inventory_status = 'RESERVED';
  END LOOP;

  UPDATE blood_requests
  SET status = 'CANCELLED'
  WHERE id = p_request_id;

  UPDATE emergency_appeals
  SET status = 'CANCELLED', updated_at = now()
  WHERE request_id = p_request_id AND status IN ('PENDING_APPROVAL', 'APPROVED', 'ACTIVE');

  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'blood_request:cancelled',
    'blood_requests',
    p_request_id::text,
    jsonb_build_object(
      'requestId', p_request_id,
      'hospitalId', v_req.hospital_id,
      'cancelledBy', p_user_id,
      'reason', p_reason,
      'timestamp', now()
    )
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: Stored Procedure (Hospital Delivery Receipt & Stock Issuance)
-- NAME: sp_receive_blood_fulfillment
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: POST /api/v1/fulfillments/:id/receive (backend/src/routes/hospital.js)
--   - Frontend Interface: Hospital Receiving Pharmacy / Blood Bank Intake Desk
--   - Business Rationale: Hospital verifies physical unit count against dispatch manifest,
--     transitions units from RESERVED to ISSUED, marks reservations FULFILLED,
--     and recalculates the parent blood request fulfillment status.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_receive_blood_fulfillment(
  p_fulfillment_id UUID,
  p_user_id UUID,
  p_received_quantity INTEGER,
  p_condition_notes TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_fulfillment RECORD;
  v_unit_count INTEGER;
  v_requested_units INTEGER;
  v_fulfilled_units INTEGER;
BEGIN
  SELECT f.id, f.request_id, f.status, br.hospital_id
  INTO v_fulfillment
  FROM fulfillments f
  JOIN blood_requests br ON br.id = f.request_id
  WHERE f.id = p_fulfillment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fulfillment not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM staff_memberships sm
    JOIN users u ON u.id = sm.user_id
    WHERE sm.user_id = p_user_id
      AND sm.hospital_id = v_fulfillment.hospital_id
      AND sm.is_active
      AND u.role = 'HOSPITAL_STAFF'
      AND u.is_active
  ) THEN
    RAISE EXCEPTION 'User is not authorized for the receiving hospital' USING ERRCODE = '42501';
  END IF;

  IF v_fulfillment.status <> 'DISPATCHED' THEN
    RAISE EXCEPTION 'Only dispatched fulfillments can be received' USING ERRCODE = '23514';
  END IF;

  SELECT count(*)::INTEGER
  INTO v_unit_count
  FROM fulfillment_units
  WHERE fulfillment_id = p_fulfillment_id;

  IF p_received_quantity IS NULL OR p_received_quantity <> v_unit_count THEN
    RAISE EXCEPTION 'Received quantity must equal the dispatched unit count' USING ERRCODE = '23514';
  END IF;

  PERFORM set_config('app.actor_id', p_user_id::text, TRUE);

  UPDATE inventory_reservations ir
  SET status = 'FULFILLED'
  FROM fulfillment_units fu
  WHERE fu.fulfillment_id = p_fulfillment_id
    AND fu.reservation_id = ir.id
    AND ir.status = 'ACTIVE';

  UPDATE blood_units bu
  SET inventory_status = 'ISSUED'
  FROM fulfillment_units fu
  WHERE fu.fulfillment_id = p_fulfillment_id
    AND fu.blood_unit_id = bu.id
    AND bu.inventory_status = 'RESERVED';

  UPDATE fulfillments
  SET status = 'RECEIVED',
      received_by = p_user_id,
      received_at = now(),
      received_quantity = p_received_quantity,
      condition_notes = NULLIF(trim(p_condition_notes), ''),
      fulfilled_at = now()
  WHERE id = p_fulfillment_id;

  SELECT COALESCE(SUM(ri.units_requested), 0)::INTEGER,
         COALESCE((
           SELECT count(*)::INTEGER
           FROM inventory_reservations ir
           JOIN request_items ri2 ON ri2.id = ir.request_item_id
           WHERE ri2.request_id = v_fulfillment.request_id
             AND ir.status = 'FULFILLED'
         ), 0)
  INTO v_requested_units, v_fulfilled_units
  FROM request_items ri
  WHERE ri.request_id = v_fulfillment.request_id;

  UPDATE blood_requests
  SET status = CASE
    WHEN v_fulfilled_units >= v_requested_units THEN 'FULFILLED'
    WHEN v_fulfilled_units > 0 THEN 'PARTIALLY_FILLED'
    ELSE status
  END
  WHERE id = v_fulfillment.request_id
    AND status <> 'CANCELLED';

  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'blood_fulfillment:received',
    'fulfillments',
    p_fulfillment_id::text,
    jsonb_build_object(
      'fulfillmentId', p_fulfillment_id,
      'requestId', v_fulfillment.request_id,
      'hospitalId', v_fulfillment.hospital_id,
      'receivedQuantity', p_received_quantity,
      'receivedBy', p_user_id,
      'timestamp', now()
    )
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: Stored Procedure (Emergency Appeal Finite State Machine)
-- NAME: sp_transition_emergency_appeal
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: PATCH /api/v1/appeals/:id/transition (backend/src/routes/appeals.js)
--   - Frontend Interface: Emergency Appeal Coordination Command Center
--   - Business Rationale: Governs state machine for acute emergency blood appeals
--     (PENDING_APPROVAL -> APPROVED -> ACTIVE -> FULFILLED / CANCELLED).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_transition_emergency_appeal(
  p_appeal_id UUID,
  p_actor_id UUID,
  p_transition TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_appeal emergency_appeals%ROWTYPE;
  v_next_status TEXT;
BEGIN
  SELECT * INTO v_appeal
  FROM emergency_appeals
  WHERE id = p_appeal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Emergency appeal not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_transition = 'APPROVE' AND v_appeal.status = 'PENDING_APPROVAL' THEN
    v_next_status := 'APPROVED';
  ELSIF p_transition = 'ACTIVATE'
        AND v_appeal.status = 'APPROVED'
        AND v_appeal.expires_at > now() THEN
    v_next_status := 'ACTIVE';
  ELSIF p_transition = 'CANCEL'
        AND v_appeal.status IN ('PENDING_APPROVAL', 'APPROVED', 'ACTIVE') THEN
    v_next_status := 'CANCELLED';
  ELSE
    RAISE EXCEPTION 'Invalid emergency appeal state transition' USING ERRCODE = '23514';
  END IF;

  UPDATE emergency_appeals
  SET status = v_next_status,
      approved_by = CASE WHEN v_next_status = 'APPROVED' THEN p_actor_id ELSE approved_by END,
      approved_at = CASE WHEN v_next_status = 'APPROVED' THEN now() ELSE approved_at END,
      updated_at = now()
  WHERE id = p_appeal_id;

  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_actor_id, 'emergency_appeals', p_appeal_id::text, p_transition);

  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'emergency_appeal:' || lower(p_transition),
    'emergency_appeals',
    p_appeal_id::text,
    jsonb_build_object(
      'appealId', p_appeal_id,
      'status', v_next_status,
      'actorId', p_actor_id,
      'timestamp', now()
    )
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- CONCEPT: Stored Procedure (Security Session Invalidation)
-- NAME: sp_revoke_user_sessions
-- WHERE USED IN SYSTEM:
--   - Backend Controller / Route: POST /api/v1/auth/logout (backend/src/routes/auth.js)
--   - Frontend Interface: User Sign Out / Admin User Deactivation
--   - Business Rationale: Immediately revokes all active hashed refresh token sessions
--     for a user in auth_sessions, preventing replay attacks.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_revoke_user_sessions(
  p_user_id UUID,
  p_reason TEXT DEFAULT 'LOGOUT_ALL'
)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE auth_sessions
  SET revoked_at = now()
  WHERE user_id = p_user_id AND revoked_at IS NULL;
END;
$$;

COMMIT;
