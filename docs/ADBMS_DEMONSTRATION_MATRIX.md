# BloodBridge — Academic ADBMS Demonstration & Syllabus Concept Matrix

**Course:** Advanced Database Management Systems (ADBMS)  
**Target Submission:** Friday, 23 October 2026  
**Scope:** Exhaustive mapping of all advanced relational concepts implemented in PostgreSQL 16 with exact SQL objects, business operations, test cases, queries, and team learning protocols.

---

## 1. Syllabus Concept Mapping Summary

| No. | ADBMS Concept | SQL Object / Mechanism | Business Operation | Test Case ID | Implementing Member |
|---|---|---|---|---|---|
| **01** | **Relational Normalization (3NF/BCNF)** | `provinces`, `districts`, `ds_divisions`, `gn_divisions`, `locations` | Eliminates geographical update anomalies; separating local councils from administrative hierarchy. | `M1-001`, `M1-002` | **Member 1** |
| **02** | **Complex Integrity Constraints (PK, FK, CHECK)** | `fk_location_ds_same_district`, `ck_location_coordinate_pair`, `blood_units_inventory_status_check` | Rejects mismatched DS/District pairs, invalid coordinates, or negative blood unit counts. | `SH-013`, `SH-014` | **Member 1** |
| **03** | **Relational Joins & Set Operations** | Inner, Left, Lateral joins across `donations`, `donors`, `blood_banks`, `users` | Compiles public camp listings with coordinating blood bank and venue details. | `M1-026`, `M5-010` | **Member 1 + M5** |
| **04** | **SQL Views (Operational Projections)** | `v_available_blood_stock`, `v_public_donation_camps`, `v_transfers_in_transit` | Live stock visibility and public camp schedules while projecting out sensitive PII. | `SH-001`, `M4-010` | **Member 4 + M5** |
| **05** | **User-Defined Functions (PL/pgSQL & SQL)** | `fn_available_unit_count`, `fn_match_potential_donors` | Calculates real-time bank inventory and matches consented, non-deferred donors within 120-day interval. | `SH-008`, `M2-007` | **Member 2 + M4** |
| **06** | **Stored Procedures with Invariants** | `sp_approve_donation_camp`, `sp_dispatch_blood_transfer`, `sp_receive_blood_transfer` | Enforces staff assignment verification, atomic camp approval, and inter-bank custody movements. | `M5-001`, `M4-025` | **Member 4 + M5** |
| **07** | **Database Triggers (Before & After)** | `trg_check_camp_registration`, `trg_log_blood_unit_status` | Enforces camp capacity limits before insert; creates an immutable audit trail upon unit status change. | `SH-021`, `SH-023` | **Member 4 + M5** |
| **08** | **Transactions, ACID & Rollback** | Named client transactions with `BEGIN`, `COMMIT`, `ROLLBACK` in `inTransaction()` | Ensures multi-line hospital request or unit reservation rolls back completely on any error. | `SH-019`, `SH-023` | **Shared / All** |
| **09** | **Concurrency Control & Row Locking** | `SELECT ... FOR UPDATE` row locks, partial unique index | Prevents double-allocation of the same blood unit when two clients reserve simultaneously. | `SH-020`, `LK-07` | **Member 4** |
| **10** | **B-Tree & Composite Indexes** | `idx_donors_available_geo` on `(blood_type_code, district_code, ds_code)` | High-speed spatial/phenotype candidate matching for emergency donor outreach. | `SH-026`, `M2-011` | **Member 2** |
| **11** | **Partial & Expression Indexes** | `uq_blood_unit_active_reservation`, `idx_camps_public_time` | Guarantees at most one active reservation per blood unit; speeds public camp queries. | `SH-016`, `M4-015` | **Member 4** |
| **12** | **Hash Indexes vs. B-Tree Experiments** | Scratch table benchmarks (`database/experiments/003_benchmarks.sql`) | Measures exact point lookup performance and page buffer reads on synthetic datasets. | `SH-026`, `M6-030` | **Member 6** |
| **13** | **Physical File Organization & CLUSTER** | `CLUSTER blood_units USING idx_units_available` | Physically reorders table pages on disk to optimize range scans on blood unit expiry dates. | `M6-032` | **Member 6** |
| **14** | **Execution Plan Analysis (EXPLAIN BUFFERS)** | `EXPLAIN (ANALYZE, BUFFERS)` on stock aggregate views | Demonstrates Index Scan vs Sequential Scan and Shared Hit/Read buffer efficiency. | `M6-035` | **Member 6** |
| **15** | **Common Table Expressions (CTEs) & Window Functions** | `v_request_fulfillment_progress`, running sum analytics | Aggregates multi-item request fulfillment progress without join-multiplication. | `M3-012`, `M6-015` | **Member 3 + M6** |
| **16** | **Table Partitioning (Declarative)** | Partitioning `audit_logs` or `fact_inventory_snapshot` by date/year | Accelerates analytical queries on historical logs and demonstrates partition pruning. | `M6-020` | **Member 6** |
| **17** | **Data Warehouse (Star Schema & ETL)** | `database/warehouse/004_warehouse.sql` (`fact_requests`, `dim_bank`, `dim_date`) | Provides multi-dimensional OLAP reporting with an idempotent OLTP-to-OLAP ETL script. | `M6-001`, `LK-09` | **Member 6** |

---

## 2. Detailed Technical Demonstration Protocol

### Demonstration 1: Atomic Inter-Bank Custody Transfer & Row Locking
- **Concept:** Stored Procedures, ACID Transactions, Custody Invariant, `FOR UPDATE` Locking.
- **SQL Objects:** `blood_bank_transfers`, `transfer_units`, `sp_dispatch_blood_transfer`, `sp_receive_blood_transfer`.
- **Query Demonstration:**
  ```sql
  -- Dispatching blood units from Colombo Bank (ID: 1) to Gampaha Bank (ID: 2)
  CALL sp_dispatch_blood_transfer('e6475548-df5f-4b53-9c88-3369fe8be372'::uuid, 'a1111111-1111-1111-1111-111111111111'::uuid);
  ```
- **Verified Behavior:**
  1. Selected blood units transition from `IN_STOCK` to `IN_TRANSIT`.
  2. `v_available_blood_stock` excludes units from both banks while in transit (preventing phantom stock).
  3. Destination receipt procedure updates `blood_bank_id` to bank 2 and restores `IN_STOCK`.
  4. Both operations log immutable records in `inventory_movements` and `event_outbox`.

### Demonstration 2: Two-Client Same-Unit Concurrency Race (`SH-020`)
- **Concept:** Isolation Levels, Row-Level Locking (`FOR UPDATE`), Partial Unique Index.
- **Test Protocol:** Two independent PostgreSQL client connections (`pg.Client`) attempt to invoke `fn_reserve_blood_unit` on the same blood unit ID simultaneously within overlapping transactions.
- **Expected Result:**
  - Exactly one client succeeds (`ACTIVE` reservation recorded).
  - Second client is blocked until lock release and subsequently rejected with check constraint or business rule violation (unit no longer `IN_STOCK`).
  - Zero orphan reservations or double allocations created.

### Demonstration 3: Capacity Locking via Trigger (`trg_check_camp_registration`)
- **Concept:** `BEFORE INSERT` Trigger, Business Invariant Enforcement.
- **Trigger Code:**
  ```sql
  IF v_current_count >= v_capacity THEN
    RAISE EXCEPTION 'Camp registration is full (capacity: %)', v_capacity USING ERRCODE = '23514';
  END IF;
  ```
- **Demonstration:** On a camp with `capacity = 50`, attempting to insert the 51st registration fails immediately with SQLSTATE `23514`.

### Demonstration 4: Physical File Clustering (`CLUSTER`) & Buffer Benchmarking
- **Concept:** Disk block clustering, IO reduction, `EXPLAIN (ANALYZE, BUFFERS)`.
- **Demonstration Command:**
  ```sql
  CLUSTER blood_units USING idx_units_available;
  EXPLAIN (ANALYZE, BUFFERS)
  SELECT * FROM blood_units
  WHERE release_status = 'RELEASED' AND inventory_status = 'IN_STOCK' AND expires_at > now();
  ```
- **Measured Metrics:**
  - `Shared Hit Blocks` vs `Shared Read Blocks`.
  - Execution time reduction (measured on 10,000 synthetic rows).

---

## 3. Team Cross-Training & Defense Protocol

To ensure every member can articulate and defend all 17 ADBMS concepts during the project presentation:
1. **Peer Review Pairing**:
   - Member 1 pairs with Member 6 (Foundation, Geography & Warehouse/Benchmarking).
   - Member 2 pairs with Member 5 (Donors, Matching & Donation Camps).
   - Member 3 pairs with Member 4 (Hospital Requests & Blood Inventory/Transfers).
2. **Weekly Rotation**: During project demonstrations, the lecturer may ask any student to explain stored procedures, index plans, or trigger rollbacks. Each member's task packet includes exact SQL queries and expected terminal outputs.
