# BloodBridge — Sri Lanka Real-World Gap Analysis & National Reality Check

**Document Version:** 1.0  
**Audit Date:** 21 October 2026  
**Status:** Academic Architectural Reference & Pre-Handoff Design Gate  
**Compliance Standard:** Sri Lanka National Blood Transfusion Service (NBTS) operational context & Personal Data Protection Act (PDPA No. 9 of 2022 / 2025 Amendment / 2026 Gazette)

---

## 1. Executive Summary & Critical Boundaries

BloodBridge is an **academic synthetic-data software prototype** developed for the Advanced Database Management Systems (ADBMS) curriculum. It is:
1. **NOT a clinical blood transfusion decision-support system** or medical diagnostic device.
2. **NOT an official NBTS software deployment** (NBTS operates the national **BBMS** — Blood Bank Management System).
3. **Strictly populated with synthetic records**: No real patient, donor, or live hospital stock data may ever be stored or processed.

### Essential Conceptual Distinctions
- **Donor Availability $\neq$ Donor Eligibility**: An individual expressing readiness to donate does not possess medical clearance. Clearance is an in-person, clinician-administered screening process.
- **Potential Match $\neq$ Clinically Suitable Donor**: Algorithmic geographic/blood-type filtering is an outreach tool, never a clinical compatibility determination.
- **Simulated Release $\neq$ Transfusion Cross-Match Clearance**: Component unit release verifies laboratory screening markers; cross-match compatibility is strictly determined by transfusion physicians and immunohematology reference laboratories.

> [!IMPORTANT]
> **University Team Size Policy Alert**: The university coursework brief permits a maximum of **five (5) contributors**. The current project architecture defines **six (6) team modules (M1–M6)**. Formal written approval from the module lecturer must be secured before final submission to confirm that a six-member configuration is permitted.

---

## 2. Official National Evidence & Source Register

All operational context is benchmarked against current official publications of the Sri Lankan Ministry of Health and the National Blood Transfusion Service:

| Source Authority | Official Portal / URL | Evidenced National Reality (Source Fact) | BloodBridge Academic Design Translation |
|---|---|---|---|
| **NBTS About Us & Cluster System** | [nbts.health.gov.lk/about-us](https://nbts.health.gov.lk/about-us/)<br>[nbts.health.gov.lk/cluster-system](https://nbts.health.gov.lk/cluster-system/) | Operates a hub-and-spoke cluster network with **24 clusters** and **over 108 hospital blood banks**. Cluster centres process components and coordinate inter-bank transfers. | `blood_bank_clusters` entity; blood banks mapped to clusters; inter-bank transfer tracking with distinct transit statuses. |
| **NBTS Health Information Unit (HIU)** | [nbts.health.gov.lk/health-information-unit](https://nbts.health.gov.lk/health-information-unit/) | Nationally deploys **BBMS** (Blood Bank Management System) covering donor registration to issue; centrally monitors daily stock; operates *Raktha* mobile appointment service. | Academic prototype must clearly state BBMS already exists; simulate inter-bank custody and inventory management using synthetic demonstration seeds. |
| **NBTS Donor Criteria & Deferral** | [nbts.health.gov.lk/donate-blood](https://nbts.health.gov.lk/donate-blood/) | Strict eligibility: age 18–60 (up to 65 for regular donors), minimum weight 50 kg, hemoglobin $\ge$ 12.5 g/dL, minimum 4-month donation interval, health assessment and risk screening. | `donor_assessments` and `donor_deferrals` tables; algorithm respects 4-month donation interval; never infers medical fitness without staff assessment entry. |
| **NBTS Mobile Campaigns** | [nbts.health.gov.lk/mobile](https://nbts.health.gov.lk/mobile/) | Mobile blood donation campaigns are organized by community groups but coordinated, approved, and staffed by designated regional blood banks. Subject to venue inspection and rescheduling. | `donation_camps` require bank assignment and staff approval procedure (`sp_approve_donation_camp`); registration capacity locking. |
| **National Immunohematology Reference Lab** | [nbts.health.gov.lk/national-immunohematology-reference-laboratory](https://nbts.health.gov.lk/national-immunohematology-reference-laboratory/) | Complex compatibility involves reference antibody screening, rare blood grouping, and specialist transfusion physician approval. | System prohibits automated clinical matching; records clinician authorization markers on fulfillment instead of inferring biological compatibility. |
| **NBTS Haemovigilance Unit** | [nbts.health.gov.lk/haemovigilance-unit](https://nbts.health.gov.lk/haemovigilance-unit/) | Monitors adverse transfusion reactions and adverse donation events; tracks near misses and quality incidents. | Academic tracking of component unit status (`QUARANTINED`, `DISCARDED`) and immutable audit trails via triggers; no connection to national haemovigilance database. |
| **Sri Lanka Data Protection Authority (DPA)** | [dpa.gov.lk/guidelines.php](https://www.dpa.gov.lk/guidelines.php) | **Personal Data Protection Act (PDPA) No. 9 of 2022**, amended 2025, with gazetted enforcement in 2026. Health and biological data are **Special Categories of Personal Data** requiring explicit consent, purpose limitation, and strict confidentiality. | Separation of donor public profiles from private medical assessments; contact preferences require consent; public pages display zero PII or individual donor identities. |

---

## 3. Real-World Scenario Gap Analysis (LK-01 to LK-15)

The table below contrasts the actual Sri Lankan healthcare reality with the current codebase baseline and specifies the required pre-handoff database and contract designs:

| ID | Scenario | Official Source Reality (SOURCE FACT) | Current Codebase State (`dev`) | Proposed Academic Design | Owner | Priority | Safety & Verification |
|---|---|---|---|---|---|---|---|
| **LK-01** | **Cluster centre coordinates peripheral banks** | 24 regional clusters with a lead teaching/provincial hospital blood bank coordinating collection and distribution to peripheral units. | Flat `blood_banks` table; no cluster hierarchy or inter-bank association. | Add `blood_bank_clusters` table; link `blood_banks.cluster_id`; scope staff queries to bank/cluster. | **M1** | **P0** | Multi-tenant RBAC: bank staff cannot access records of unrelated clusters. |
| **LK-02** | **Inter-bank blood transfers** | Peripheral blood bank running low on Platelets requests units from Cluster Centre; units are packed, cold-chain transported, and received. | No transfer entities. Only direct hospital requests exist. | Add `blood_bank_transfers` & `transfer_units` tables. Statuses: `REQUESTED`, `DISPATCHED`, `IN_TRANSIT`, `RECEIVED`, `CANCELLED`. In-transit units removed from available stock. | **M4 + M3** | **P0** | Atomic double-entry custody update; neither bank double-counts in-transit units. |
| **LK-03** | **Mobile donation camps** | Community organizers propose camps; regional blood bank inspects venue, approves date, assigns staff team, and enforces capacity. | Basic `donation_camps` table exists with `sp_approve_donation_camp` procedure and `trg_check_camp_registration`. | Retain existing procedures; add `organizer_contacts`, venue facilities checklist, and real-time Socket.io seat count updates. | **M5 + M4** | **P0** | Two-client concurrent registration race test (`SH-021`) ensures capacity is never breached. |
| **LK-04** | **Donor consent vs. medical eligibility** | An individual registers willingness to donate, but medical officer assesses hemoglobin, medical history, and risk factors on camp day. | `donors` table stores blood type, contact consent, and last donation date directly. | Separate `donor_consents` (public/donor portal) from `donor_assessments` (medical staff only). Algorithm checks 4-month interval without declaring medical fitness. | **M2** | **P0** | PDPA compliance: medical screening results never exposed to donor or public web pages. |
| **LK-05** | **Whole blood collection & component separation** | A single donation is processed into Packed Red Cells (PRC), Fresh Frozen Plasma (FFP), and Platelets (PLT), each with distinct shelf-lives. | `blood_units` table exists, but collection-to-unit lineage is loosely modeled. | Add `donations` table linked to $1..n$ `blood_units`. Statuses: `TESTING_PENDING`, `QUARANTINED`, `RELEASED`, `RESERVED`, `IN_TRANSIT`, `ISSUED`, `EXPIRED`, `DISCARDED`. | **M4** | **P0** | Shelf-life invariants enforced (PRC: 35/42 days, PLT: 5 days, FFP: 1 year). |
| **LK-06** | **Hospital emergency request progress** | Hospital places emergency request for 5 units of O- PRC; blood bank reserves 3, dispatches 3; hospital confirms receipt. | `blood_requests` table exists; status jumps directly from OPEN to FULFILLED. | Add `request_items` (multi-line), `request_reservations`, and `request_fulfillments`. Progress calculates: `requested_units`, `reserved_units`, `dispatched_units`, `received_units`. | **M3 + M4** | **P0** | Status becomes `PARTIALLY_FILLED` until actual hospital receipt confirms `FULFILLED`. |
| **LK-07** | **Two staff reserving same scarce unit** | Multiple hospitals simultaneously request scarce Bombay phenotype or O-negative units from the regional bank. | Basic `fn_reserve_blood_unit` PL/pgSQL function with `FOR UPDATE` lock. | Retain `fn_reserve_blood_unit` with partial unique index on active reservations; emit Socket.io inventory alert upon reservation. | **M4** | **P0** | Two independent DB client sessions in automated concurrency test (`SH-020`); exactly one succeeds. |
| **LK-08** | **Expiring, quarantined, or discarded blood** | Components nearing expiry or testing reactive for TTI (HIV, HBV, HCV, Syphilis, Malaria) must be quarantined immediately. | `v_available_blood_stock` excludes non-AVAILABLE units, but quarantine workflow is manual. | Introduce `QUARANTINED` status; automate FEFO (First-Expired, First-Out) view ordering; audit reason in `blood_unit_status_logs`. | **M4** | **P0** | Safety invariant: Quarantined/expired units mathematically excluded from matching & reservation. |
| **LK-09** | **Daily stock review & demand trends** | Regional Directors and National Blood Centre conduct daily stock meetings to forecast shortages across provinces. | Single analytical view exists; no formal dimensional star schema or automated ETL. | Implement star schema (`database/warehouse/004_warehouse.sql`): `fact_inventory_snapshot`, `fact_requests`, `dim_date`, `dim_bank`, `dim_component`. Idempotent ETL script. | **M6** | **P0** | ETL reconciles 100% of OLTP records at declared day/bank/component grain. |
| **LK-10** | **Donor center appointment vs. mobile camp** | Donors can book fixed-site appointments at Colombo National Blood Centre or attend a weekend mobile camp. | Only donation camps are modeled. | Add fixed-site blood bank appointments entity (`donor_appointments`). | **M2 + M5** | **P1** | Capacity-bounded appointment slots; opt-in reminders via transactional outbox. |
| **LK-11** | **Adverse events & near-miss audit** | Haemovigilance tracking of vasovagal donor reactions, cold-chain temperature breaches, or labeling discrepancies. | General `audit_logs` table. | Dedicated `quality_incidents` table recording incident category, unit ID, severity, corrective action, and investigating officer. | **M4 + M1** | **P1** | Restricted to Quality Officers and Admins; synthetic data only. |
| **LK-12** | **Donor notifications & camp reminders** | Urgent appeal sent to eligible B-negative donors in Gampaha district for an emergency camp. | No message delivery infrastructure. | Implement **Transactional Outbox** pattern (`event_outbox` table); worker dispatches notifications and Socket.io broadcasts. | **M2 + M5** | **P1** | PDPA compliance: notifications respect `contact_allowed = true` and `camp_notification_opt_in = true`. |
| **LK-13** | **Patient compatibility decision** | Cross-matching and antibody screening conducted in hospital laboratory prior to transfusion issue. | No patient or cross-match entities (intentionally kept out of scope). | Retain academic boundary: Hospital request records patient anonymous ID, urgency, and clinical officer attestation; never automate clinical cross-match. | **M3 + M4** | **P0 Safety** | System records clinician sign-off; does not claim automated biological compatibility. |
| **LK-14** | **Historical trends & database performance** | ADBMS syllabus requires demonstrating index performance, file clustering, partitioning, and execution plan analysis. | Baseline migration has sample B-Tree and partial indexes; no measured buffer benchmarks. | Add `database/experiments/008_advanced_experiments.sql`: Partitioning by year/month, CLUSTER on location/date, Hash index comparison, EXPLAIN ANALYZE BUFFERS. | **M6 + M1** | **P0 Academic** | Benchmarks measure execution times on synthetic 10k/100k datasets without fabricating figures. |
| **LK-15** | **Public dashboard transparency** | Public visitors view blood group stock levels and upcoming donation camps without accessing confidential data. | Public routes exist for locations and approved camps. | Ensure public view queries pre-aggregated data (`v_public_donation_camps`, `v_aggregate_stock_summary`); zero PII or individual donor records exposed. | **M1 + M6** | **P0 Safety** | Penetration test ensures unauthenticated requests cannot traverse to donor rosters or patient identifiers. |

---

## 4. Architectural Safety Invariants

1. **Transaction Atomicity Invariant**: Every multi-entity business operation (camp approval + log, blood unit reservation + audit, inter-bank dispatch + inventory lock) must execute inside a single client transaction boundary (`inTransaction(work)`).
2. **Custody Conservation Invariant**: At all points in time:
   $$\text{Total Units} = \text{Available} + \text{Reserved} + \text{In Transit} + \text{Issued} + \text{Quarantined} + \text{Discarded} + \text{Expired}$$
   No blood unit may simultaneously exist in two custody states or at two distinct blood banks.
3. **Data Protection Invariant (PDPA)**:
   - Donor names, national identity numbers (NIC), phone numbers, and home addresses must never appear in public API payloads.
   - Medical deferral reasons must be restricted strictly to authorized Medical Officers at the managing blood bank.

---

## 5. Verification Sign-Off Checklist Before Six-Member Handoff

- [x] All 15 Sri Lankan scenarios mapped to specific ADBMS module owners.
- [x] Distinction between official NBTS reality (BBMS) and synthetic university prototype documented.
- [x] Medical safety rules prohibiting automated clinical cross-matching enforced.
- [x] Personal Data Protection Act (PDPA 2022/2026) privacy constraints specified.
- [x] Six-member group size limitation flagged for formal lecturer approval.
