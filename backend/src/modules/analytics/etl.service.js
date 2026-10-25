import { pool } from '../../db.js';
import { queryWarehouse, warehousePool } from '../../warehouseDb.js';

export class EtlService {
  /**
   * Executes the OLAP ETL pipeline from operational DB to warehouse DB.
   * @param {Object} options
   * @param {string} options.jobName - Name of the job, defaults to 'DAILY_OLAP_ETL'
   * @param {string} options.loadMode - 'FULL' or 'INCREMENTAL'
   * @param {string} options.requestedBy - Identity or username of requester
   * @param {string} [options.fromDate] - Optional start date filter
   * @param {string} [options.toDate] - Optional end date filter
   */
  async runEtl(options = {}) {
    const jobName = options.jobName || 'DAILY_OLAP_ETL';
    const loadMode = options.loadMode || 'INCREMENTAL';
    const requestedBy = options.requestedBy || 'SYSTEM';

    await queryWarehouse('SELECT 1'); // Ensure warehouse DB exists & initialized

    // 1. Get watermark timestamp if INCREMENTAL
    let watermark = null;
    if (loadMode === 'INCREMENTAL') {
      const { rows: lastRun } = await queryWarehouse(`
        SELECT max(watermark_timestamp) AS last_watermark
        FROM etl_runs
        WHERE status = 'SUCCESS'
      `);
      if (lastRun[0]?.last_watermark) {
        watermark = new Date(lastRun[0].last_watermark);
      }
    }

    // 2. Insert run record into etl_runs
    const { rows: runRows } = await queryWarehouse(`
      INSERT INTO etl_runs (job_name, load_mode, requested_by, started_at, status)
      VALUES ($1, $2, $3, now(), 'RUNNING')
      RETURNING id
    `, [jobName, loadMode, requestedBy]);
    const runId = runRows[0].id;

    let totalRowsLoaded = 0;
    const errors = [];
    const stepCounts = {};

    try {
      // Step A: Synchronize Dimensions (District, Blood Type, Component, Institution)
      stepCounts.dimensions = await this.syncDimensions(runId, errors);

      // Step B: Extract & Load Donations Fact
      stepCounts.donations = await this.syncDonations(watermark, runId, errors);

      // Step C: Extract & Load Request Items Fact
      stepCounts.requestItems = await this.syncRequestItems(watermark, runId, errors);

      // Step D: Extract & Load Camp Registrations Fact
      stepCounts.campRegistrations = await this.syncCampRegistrations(watermark, runId, errors);

      // Step E: Extract & Load Inventory Snapshot Fact
      stepCounts.inventorySnapshots = await this.syncInventorySnapshots(runId, errors);

      // Step F: Extract & Load Transfers Fact
      stepCounts.transfers = await this.syncTransfers(watermark, runId, errors);

      totalRowsLoaded = Object.values(stepCounts).reduce((acc, c) => acc + c, 0);

      // Step G: Refresh Materialized View
      try {
        await queryWarehouse('REFRESH MATERIALIZED VIEW mv_warehouse_demand_aggregates;');
      } catch (mvErr) {
        // If concurrently fails or first time, try standard refresh
        try {
          await queryWarehouse('REFRESH MATERIALIZED VIEW mv_warehouse_demand_aggregates;');
        } catch {}
      }

      // Step H: Update etl_runs as SUCCESS
      await queryWarehouse(`
        UPDATE etl_runs
        SET finished_at = now(),
            status = 'SUCCESS',
            rows_loaded = $1,
            error_count = $2,
            watermark_timestamp = now(),
            details = $3
        WHERE id = $4
      `, [totalRowsLoaded, errors.length, JSON.stringify(stepCounts), runId]);

      return {
        runId,
        status: 'SUCCESS',
        jobName,
        loadMode,
        requestedBy,
        rowsLoaded: totalRowsLoaded,
        stepCounts,
        errorCount: errors.length,
        finishedAt: new Date().toISOString(),
      };
    } catch (fatalErr) {
      // Mark run as FAILED
      await queryWarehouse(`
        UPDATE etl_runs
        SET finished_at = now(),
            status = 'FAILED',
            rows_loaded = $1,
            error_count = $2,
            details = $3
        WHERE id = $4
      `, [totalRowsLoaded, errors.length + 1, JSON.stringify({ error: fatalErr.message, stepCounts }), runId]);

      throw fatalErr;
    }
  }

  /**
   * Synchronizes reference dimensions from operational DB into warehouse DB
   */
  async syncDimensions(runId, errors) {
    let count = 0;

    // 1. dim_district
    const { rows: operationalDistricts } = await pool.query(`
      SELECT d.code, d.name, p.name AS province_name
      FROM districts d
      JOIN provinces p ON p.code = d.province_code
    `);
    for (const d of operationalDistricts) {
      await queryWarehouse(`
        INSERT INTO dim_district (district_code, district_name, province_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (district_code) DO UPDATE
        SET district_name = EXCLUDED.district_name,
            province_name = EXCLUDED.province_name
      `, [d.code, d.name, d.province_name]);
      count++;
    }

    // 2. dim_blood_type
    const { rows: operationalBloodTypes } = await pool.query(
      'SELECT code FROM blood_types'
    );
    for (const bt of operationalBloodTypes) {
      await queryWarehouse(`
        INSERT INTO dim_blood_type (blood_type_code)
        VALUES ($1)
        ON CONFLICT (blood_type_code) DO NOTHING
      `, [bt.code]);
      count++;
    }

    // 3. dim_component
    const { rows: operationalComponents } = await pool.query(
      'SELECT code FROM component_types'
    );
    for (const c of operationalComponents) {
      await queryWarehouse(`
        INSERT INTO dim_component (component_code)
        VALUES ($1)
        ON CONFLICT (component_code) DO NOTHING
      `, [c.code]);
      count++;
    }

    // 4. dim_institution (Hospitals & Blood Banks)
    const { rows: operationalHospitals } = await pool.query(`
      SELECT h.id, h.name, h.is_verified, l.district_code
      FROM hospitals h
      JOIN locations l ON l.id = h.location_id
    `);
    for (const h of operationalHospitals) {
      const { rows: distKey } = await queryWarehouse(
        'SELECT district_key FROM dim_district WHERE district_code = $1',
        [h.district_code]
      );
      await queryWarehouse(`
        INSERT INTO dim_institution (source_institution_id, institution_type, institution_name, district_key, is_verified)
        VALUES ($1, 'HOSPITAL', $2, $3, $4)
        ON CONFLICT (source_institution_id, institution_type) DO UPDATE
        SET institution_name = EXCLUDED.institution_name,
            district_key = EXCLUDED.district_key,
            is_verified = EXCLUDED.is_verified
      `, [h.id, h.name, distKey[0]?.district_key || null, h.is_verified]);
      count++;
    }

    const { rows: operationalBanks } = await pool.query(`
      SELECT bb.id, bb.name, bb.is_verified, l.district_code
      FROM blood_banks bb
      JOIN locations l ON l.id = bb.location_id
    `);
    for (const b of operationalBanks) {
      const { rows: distKey } = await queryWarehouse(
        'SELECT district_key FROM dim_district WHERE district_code = $1',
        [b.district_code]
      );
      await queryWarehouse(`
        INSERT INTO dim_institution (source_institution_id, institution_type, institution_name, district_key, is_verified)
        VALUES ($1, 'BLOOD_BANK', $2, $3, $4)
        ON CONFLICT (source_institution_id, institution_type) DO UPDATE
        SET institution_name = EXCLUDED.institution_name,
            district_key = EXCLUDED.district_key,
            is_verified = EXCLUDED.is_verified
      `, [b.id, b.name, distKey[0]?.district_key || null, b.is_verified]);
      count++;
    }

    return count;
  }

  /**
   * Syncs donations fact table
   */
  async syncDonations(watermark, runId, errors) {
    let count = 0;
    const query = `
      SELECT d.id AS donation_id,
             d.collected_at,
             l.district_code,
             d.blood_bank_id,
             dn.blood_type_code
      FROM donations d
      JOIN blood_banks bb ON bb.id = d.blood_bank_id
      JOIN locations l ON l.id = bb.location_id
      LEFT JOIN donors dn ON dn.id = d.donor_id
      ${watermark ? 'WHERE d.created_at >= $1 OR d.collected_at >= $1' : ''}
    `;
    const params = watermark ? [watermark] : [];
    const { rows } = await pool.query(query, params);

    if (!watermark) {
      const { rows: currentOltpIds } = await pool.query('SELECT id FROM donations');
      const validIds = currentOltpIds.map((r) => r.id);
      if (validIds.length > 0) {
        await queryWarehouse(
          'DELETE FROM fact_donations WHERE NOT (source_donation_id = ANY($1::uuid[]))',
          [validIds]
        );
      } else {
        await queryWarehouse('DELETE FROM fact_donations');
      }
    }

    for (const row of rows) {
      try {
        const dateKey = parseInt(row.collected_at.toISOString().slice(0, 10).replace(/-/g, ''), 10);
        const { rows: distRow } = await queryWarehouse(
          'SELECT district_key FROM dim_district WHERE district_code = $1',
          [row.district_code]
        );
        const { rows: instRow } = await queryWarehouse(
          'SELECT institution_key FROM dim_institution WHERE source_institution_id = $1 AND institution_type = \'BLOOD_BANK\'',
          [row.blood_bank_id]
        );
        const { rows: typeRow } = row.blood_type_code
          ? await queryWarehouse('SELECT type_key FROM dim_blood_type WHERE blood_type_code = $1', [row.blood_type_code])
          : { rows: [] };

        if (!distRow[0]?.district_key) continue;

        await queryWarehouse(`
          INSERT INTO fact_donations (source_donation_id, date_key, district_key, institution_key, type_key, donation_count)
          VALUES ($1, $2, $3, $4, $5, 1)
          ON CONFLICT (source_donation_id) DO UPDATE
          SET date_key = EXCLUDED.date_key,
              district_key = EXCLUDED.district_key,
              institution_key = EXCLUDED.institution_key,
              type_key = EXCLUDED.type_key
        `, [
          row.donation_id,
          dateKey,
          distRow[0].district_key,
          instRow[0]?.institution_key || null,
          typeRow[0]?.type_key || null,
        ]);
        count++;
      } catch (err) {
        errors.push({ source: 'donations', id: row.donation_id, error: err.message });
        await this.logError(runId, 'donations', row.donation_id, err.message);
      }
    }
    return count;
  }

  /**
   * Syncs request items fact table
   */
  async syncRequestItems(watermark, runId, errors) {
    let count = 0;
    const query = `
      SELECT ri.id AS request_item_id,
             ri.blood_type_code,
             ri.component_code,
             ri.units_requested,
             br.created_at,
             br.urgency,
             br.hospital_id,
             l.district_code,
             coalesce((
               SELECT count(*)::int
               FROM inventory_reservations ir
               WHERE ir.request_item_id = ri.id AND ir.status = 'FULFILLED'
             ), 0) AS units_fulfilled
      FROM request_items ri
      JOIN blood_requests br ON br.id = ri.request_id
      JOIN hospitals h ON h.id = br.hospital_id
      JOIN locations l ON l.id = h.location_id
      ${watermark ? 'WHERE br.created_at >= $1' : ''}
    `;
    const params = watermark ? [watermark] : [];
    const { rows } = await pool.query(query, params);

    if (!watermark) {
      const { rows: currentOltpIds } = await pool.query('SELECT id FROM request_items');
      const validIds = currentOltpIds.map((r) => r.id);
      if (validIds.length > 0) {
        await queryWarehouse(
          'DELETE FROM fact_request_items WHERE NOT (source_request_item_id = ANY($1::uuid[]))',
          [validIds]
        );
      } else {
        await queryWarehouse('DELETE FROM fact_request_items');
      }
    }

    for (const row of rows) {
      try {
        const dateKey = parseInt(row.created_at.toISOString().slice(0, 10).replace(/-/g, ''), 10);
        const { rows: distRow } = await queryWarehouse(
          'SELECT district_key FROM dim_district WHERE district_code = $1',
          [row.district_code]
        );
        const { rows: instRow } = await queryWarehouse(
          'SELECT institution_key FROM dim_institution WHERE source_institution_id = $1 AND institution_type = \'HOSPITAL\'',
          [row.hospital_id]
        );
        const { rows: typeRow } = await queryWarehouse(
          'SELECT type_key FROM dim_blood_type WHERE blood_type_code = $1',
          [row.blood_type_code]
        );
        const { rows: compRow } = await queryWarehouse(
          'SELECT component_key FROM dim_component WHERE component_code = $1',
          [row.component_code]
        );

        if (!distRow[0]?.district_key || !typeRow[0]?.type_key || !compRow[0]?.component_key) continue;

        await queryWarehouse(`
          INSERT INTO fact_request_items (
            source_request_item_id, date_key, district_key, institution_key,
            type_key, component_key, urgency, requested_units, fulfilled_units
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (source_request_item_id) DO UPDATE
          SET date_key = EXCLUDED.date_key,
              district_key = EXCLUDED.district_key,
              institution_key = EXCLUDED.institution_key,
              type_key = EXCLUDED.type_key,
              component_key = EXCLUDED.component_key,
              urgency = EXCLUDED.urgency,
              requested_units = EXCLUDED.requested_units,
              fulfilled_units = EXCLUDED.fulfilled_units
        `, [
          row.request_item_id,
          dateKey,
          distRow[0].district_key,
          instRow[0]?.institution_key || null,
          typeRow[0].type_key,
          compRow[0].component_key,
          row.urgency || 'ROUTINE',
          row.units_requested,
          row.units_fulfilled,
        ]);
        count++;
      } catch (err) {
        errors.push({ source: 'request_items', id: row.request_item_id, error: err.message });
        await this.logError(runId, 'request_items', row.request_item_id, err.message);
      }
    }
    return count;
  }

  /**
   * Syncs camp registrations fact table
   */
  async syncCampRegistrations(watermark, runId, errors) {
    let count = 0;
    const query = `
      SELECT cr.id AS registration_id,
             cr.registered_at,
             cr.status,
             l.district_code
      FROM camp_registrations cr
      JOIN donation_camps c ON c.id = cr.camp_id
      JOIN locations l ON l.id = c.location_id
      ${watermark ? 'WHERE cr.registered_at >= $1' : ''}
    `;
    const params = watermark ? [watermark] : [];
    const { rows } = await pool.query(query, params);

    if (!watermark) {
      const { rows: currentOltpIds } = await pool.query('SELECT id FROM camp_registrations');
      const validIds = currentOltpIds.map((r) => r.id);
      if (validIds.length > 0) {
        await queryWarehouse(
          'DELETE FROM fact_camp_registrations WHERE NOT (source_registration_id = ANY($1::uuid[]))',
          [validIds]
        );
      } else {
        await queryWarehouse('DELETE FROM fact_camp_registrations');
      }
    }

    for (const row of rows) {
      try {
        const dateKey = parseInt(row.registered_at.toISOString().slice(0, 10).replace(/-/g, ''), 10);
        const { rows: distRow } = await queryWarehouse(
          'SELECT district_key FROM dim_district WHERE district_code = $1',
          [row.district_code]
        );
        if (!distRow[0]?.district_key) continue;

        const attendedCount = row.status === 'ATTENDED' ? 1 : 0;

        await queryWarehouse(`
          INSERT INTO fact_camp_registrations (source_registration_id, date_key, district_key, registered_count, attended_count)
          VALUES ($1, $2, $3, 1, $4)
          ON CONFLICT (source_registration_id) DO UPDATE
          SET date_key = EXCLUDED.date_key,
              district_key = EXCLUDED.district_key,
              attended_count = EXCLUDED.attended_count
        `, [
          row.registration_id,
          dateKey,
          distRow[0].district_key,
          attendedCount,
        ]);
        count++;
      } catch (err) {
        errors.push({ source: 'camp_registrations', id: row.registration_id, error: err.message });
        await this.logError(runId, 'camp_registrations', row.registration_id, err.message);
      }
    }
    return count;
  }

  /**
   * Syncs daily inventory snapshot fact table
   */
  async syncInventorySnapshots(runId, errors) {
    let count = 0;
    const dateKey = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''), 10);

    const { rows: stockBuckets } = await pool.query(`
      SELECT blood_bank_id,
             blood_type_code,
             component_code,
             count(*) FILTER (WHERE release_status = 'RELEASED' AND inventory_status = 'IN_STOCK' AND expires_at > now())::int AS available_units,
             count(*) FILTER (WHERE release_status = 'QUARANTINED')::int AS quarantined_units,
             count(*) FILTER (WHERE inventory_status = 'RESERVED')::int AS reserved_units,
             count(*) FILTER (WHERE release_status = 'RELEASED' AND inventory_status = 'IN_STOCK' AND expires_at > now() AND expires_at <= now() + interval '7 days')::int AS expiring_7d_units,
             count(*) FILTER (WHERE expires_at <= now() AND inventory_status = 'IN_STOCK')::int AS expired_units
      FROM blood_units
      GROUP BY blood_bank_id, blood_type_code, component_code
    `);

    for (const b of stockBuckets) {
      try {
        const { rows: instRow } = await queryWarehouse(
          'SELECT institution_key FROM dim_institution WHERE source_institution_id = $1 AND institution_type = \'BLOOD_BANK\'',
          [b.blood_bank_id]
        );
        const { rows: typeRow } = await queryWarehouse(
          'SELECT type_key FROM dim_blood_type WHERE blood_type_code = $1',
          [b.blood_type_code]
        );
        const { rows: compRow } = await queryWarehouse(
          'SELECT component_key FROM dim_component WHERE component_code = $1',
          [b.component_code]
        );

        if (!instRow[0]?.institution_key || !typeRow[0]?.type_key || !compRow[0]?.component_key) continue;

        await queryWarehouse(`
          INSERT INTO fact_inventory_snapshot (
            date_key, institution_key, type_key, component_key,
            available_units, quarantined_units, reserved_units, expiring_7d_units, expired_units
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (date_key, institution_key, type_key, component_key) DO UPDATE
          SET available_units = EXCLUDED.available_units,
              quarantined_units = EXCLUDED.quarantined_units,
              reserved_units = EXCLUDED.reserved_units,
              expiring_7d_units = EXCLUDED.expiring_7d_units,
              expired_units = EXCLUDED.expired_units,
              snapshot_at = now()
        `, [
          dateKey,
          instRow[0].institution_key,
          typeRow[0].type_key,
          compRow[0].component_key,
          b.available_units,
          b.quarantined_units,
          b.reserved_units,
          b.expiring_7d_units,
          b.expired_units,
        ]);
        count++;
      } catch (err) {
        errors.push({ source: 'inventory_snapshot', bank: b.blood_bank_id, error: err.message });
        await this.logError(runId, 'inventory_snapshot', `${b.blood_bank_id}-${b.blood_type_code}`, err.message);
      }
    }
    return count;
  }

  /**
   * Syncs inter-bank transfers fact table
   */
  async syncTransfers(watermark, runId, errors) {
    let count = 0;
    // Check if blood_bank_transfers table exists in operational DB
    const { rows: tableExists } = await pool.query(`
      SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blood_bank_transfers'
    `);
    if (tableExists.length === 0) return 0;

    const query = `
      SELECT bbt.id AS transfer_id,
             bbt.source_bank_id,
             bbt.target_bank_id,
             bbt.status,
             bbt.created_at,
             extract(epoch FROM (bbt.received_at - bbt.dispatched_at)) / 60 AS transit_duration_minutes,
             coalesce(count(tu.blood_unit_id), 1)::int AS units_count
      FROM blood_bank_transfers bbt
      LEFT JOIN transfer_units tu ON tu.transfer_id = bbt.id
      ${watermark ? 'WHERE bbt.created_at >= $1' : ''}
      GROUP BY bbt.id, bbt.source_bank_id, bbt.target_bank_id, bbt.status, bbt.created_at, bbt.received_at, bbt.dispatched_at
    `;
    const params = watermark ? [watermark] : [];
    const { rows } = await pool.query(query, params);

    if (!watermark) {
      const { rows: currentOltpIds } = await pool.query('SELECT id FROM blood_bank_transfers');
      const validIds = currentOltpIds.map((r) => r.id);
      if (validIds.length > 0) {
        await queryWarehouse(
          'DELETE FROM fact_transfers WHERE NOT (source_transfer_id = ANY($1::uuid[]))',
          [validIds]
        );
      } else {
        await queryWarehouse('DELETE FROM fact_transfers');
      }
    }

    for (const row of rows) {
      try {
        const dateKey = parseInt(row.created_at.toISOString().slice(0, 10).replace(/-/g, ''), 10);
        const { rows: srcInst } = await queryWarehouse(
          'SELECT institution_key FROM dim_institution WHERE source_institution_id = $1 AND institution_type = \'BLOOD_BANK\'',
          [row.source_bank_id]
        );
        const { rows: tgtInst } = await queryWarehouse(
          'SELECT institution_key FROM dim_institution WHERE source_institution_id = $1 AND institution_type = \'BLOOD_BANK\'',
          [row.target_bank_id]
        );

        if (!srcInst[0]?.institution_key || !tgtInst[0]?.institution_key) continue;

        await queryWarehouse(`
          INSERT INTO fact_transfers (
            source_transfer_id, date_key, source_bank_key, target_bank_key,
            units_transferred, status, transit_duration_minutes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (source_transfer_id) DO UPDATE
          SET date_key = EXCLUDED.date_key,
              status = EXCLUDED.status,
              transit_duration_minutes = EXCLUDED.transit_duration_minutes,
              units_transferred = EXCLUDED.units_transferred
        `, [
          row.transfer_id,
          dateKey,
          srcInst[0].institution_key,
          tgtInst[0].institution_key,
          row.units_count,
          row.status,
          row.transit_duration_minutes ? Math.round(row.transit_duration_minutes) : null,
        ]);
        count++;
      } catch (err) {
        errors.push({ source: 'transfers', id: row.transfer_id, error: err.message });
        await this.logError(runId, 'transfers', row.transfer_id, err.message);
      }
    }
    return count;
  }

  async logError(runId, sourceTable, sourceId, errorMessage) {
    try {
      await queryWarehouse(`
        INSERT INTO etl_run_errors (run_id, source_table, source_id, error_message)
        VALUES ($1, $2, $3, $4)
      `, [runId, sourceTable, String(sourceId || ''), errorMessage]);
    } catch {}
  }

  /**
   * Retrieves ETL run history
   */
  async getEtlRuns(limit = 20) {
    await queryWarehouse('SELECT 1');
    const { rows } = await queryWarehouse(`
      SELECT r.id,
             r.job_name,
             r.load_mode,
             r.requested_by,
             r.started_at,
             r.finished_at,
             r.status,
             r.rows_loaded,
             r.error_count,
             r.watermark_timestamp,
             r.details,
             extract(epoch FROM (r.finished_at - r.started_at))::numeric(10,2) AS duration_seconds
      FROM etl_runs r
      ORDER BY r.started_at DESC
      LIMIT $1
    `, [limit]);

    return rows;
  }

  /**
   * Reconciliation audit between OLTP database and Warehouse fact tables
   */
  async getReconciliationAudit() {
    await queryWarehouse('SELECT 1');

    // Operational counts
    const { rows: oltpCounts } = await pool.query(`
      SELECT
        (SELECT count(*) FROM donations)::int AS oltp_donations,
        (SELECT count(*) FROM request_items)::int AS oltp_request_items,
        (SELECT count(*) FROM camp_registrations)::int AS oltp_camp_registrations,
        (SELECT count(*) FROM blood_units WHERE inventory_status = 'IN_STOCK' AND release_status = 'RELEASED')::int AS oltp_available_units
    `);

    // Warehouse counts
    const { rows: whCounts } = await queryWarehouse(`
      SELECT
        (SELECT count(*) FROM fact_donations)::int AS wh_donations,
        (SELECT count(*) FROM fact_request_items)::int AS wh_request_items,
        (SELECT count(*) FROM fact_camp_registrations)::int AS wh_camp_registrations,
        (SELECT coalesce(sum(available_units), 0) FROM fact_inventory_snapshot WHERE date_key = (SELECT max(date_key) FROM fact_inventory_snapshot))::int AS wh_available_units
    `);

    const oltp = oltpCounts[0] || {};
    const wh = whCounts[0] || {};

    const latestRun = (await this.getEtlRuns(1))[0] || null;

    return {
      timestamp: new Date().toISOString(),
      latestEtlRun: latestRun,
      reconciliation: [
        {
          entity: 'Donations',
          operationalCount: oltp.oltp_donations || 0,
          warehouseCount: wh.wh_donations || 0,
          discrepancy: (oltp.oltp_donations || 0) - (wh.wh_donations || 0),
          status: (oltp.oltp_donations || 0) === (wh.wh_donations || 0) ? 'MATCHED' : 'UNSYNCHRONIZED',
        },
        {
          entity: 'Request Items',
          operationalCount: oltp.oltp_request_items || 0,
          warehouseCount: wh.wh_request_items || 0,
          discrepancy: (oltp.oltp_request_items || 0) - (wh.wh_request_items || 0),
          status: (oltp.oltp_request_items || 0) === (wh.wh_request_items || 0) ? 'MATCHED' : 'UNSYNCHRONIZED',
        },
        {
          entity: 'Camp Registrations',
          operationalCount: oltp.oltp_camp_registrations || 0,
          warehouseCount: wh.wh_camp_registrations || 0,
          discrepancy: (oltp.oltp_camp_registrations || 0) - (wh.wh_camp_registrations || 0),
          status: (oltp.oltp_camp_registrations || 0) === (wh.wh_camp_registrations || 0) ? 'MATCHED' : 'UNSYNCHRONIZED',
        },
        {
          entity: 'Available Stock Units',
          operationalCount: oltp.oltp_available_units || 0,
          warehouseCount: wh.wh_available_units || 0,
          discrepancy: (oltp.oltp_available_units || 0) - (wh.wh_available_units || 0),
          status: (oltp.oltp_available_units || 0) === (wh.wh_available_units || 0) ? 'MATCHED' : 'SNAPSHOT_PENDING',
        },
      ],
      dataFreshness: latestRun?.finished_at ? latestRun.finished_at : 'Never run',
      health: (oltp.oltp_donations || 0) === (wh.wh_donations || 0) ? 'HEALTHY' : 'OUT_OF_SYNC',
    };
  }
}

export const etlService = new EtlService();
