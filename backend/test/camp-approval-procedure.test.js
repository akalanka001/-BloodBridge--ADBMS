import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/db.js';

describe('Pending migration 021 camp approval authorization (rolled back)', () => {
  it('permits real admin/coordinating staff actors and denies foreign, inactive, unverified and invalid-state approvals', async () => {
    const client = await pool.connect();
    const definitionQuery = "SELECT pg_get_functiondef('sp_approve_donation_camp(uuid,uuid)'::regprocedure) AS definition";
    const before = (await client.query(definitionQuery)).rows[0].definition;
    try {
      await client.query('BEGIN');
      let migration;
      try {
        migration = await readFile(new URL('../../database/migrations/021_camp_approval_authorization.sql', import.meta.url), 'utf8');
      } catch {
        migration = await readFile(new URL('../../database/migrations_archive/021_camp_approval_authorization.sql', import.meta.url), 'utf8');
      }
      await client.query(migration.replace(/^\s*(?:BEGIN|COMMIT);\s*$/gm, ''));
      const tag = `approval-proof-${randomUUID()}`;
      const district = (await client.query('SELECT code FROM districts ORDER BY code LIMIT 1')).rows[0].code;
      const locationId = (await client.query('INSERT INTO locations (district_code,town) VALUES ($1,$2) RETURNING id', [district, tag])).rows[0].id;
      const bankId = (await client.query('INSERT INTO blood_banks (name,location_id,is_verified) VALUES ($1,$2,true) RETURNING id', [tag, locationId])).rows[0].id;
      const otherBankId = (await client.query('INSERT INTO blood_banks (name,location_id,is_verified) VALUES ($1,$2,true) RETURNING id', [`${tag}-other`, locationId])).rows[0].id;
      const organizerId = (await client.query('INSERT INTO camp_organizers (name) VALUES ($1) RETURNING id', [tag])).rows[0].id;
      async function user(role, active = true, bank = null) {
        const id = (await client.query('INSERT INTO users (full_name,email,password_hash,role,is_active) VALUES ($1,$2,$3,$4,$5) RETURNING id', [tag, `${randomUUID()}@approval-proof.test`, 'synthetic', role, active])).rows[0].id;
        if (bank) await client.query('INSERT INTO staff_memberships (user_id,blood_bank_id) VALUES ($1,$2)', [id, bank]);
        return id;
      }
      const admin = await user('ADMIN'), bankStaff = await user('BANK_STAFF', true, bankId), foreignStaff = await user('BANK_STAFF', true, otherBankId);
      const inactiveAdmin = await user('ADMIN', false), inactiveStaff = await user('BANK_STAFF', false, bankId);
      async function camp(status = 'PENDING', future = true) {
        return (await client.query(`INSERT INTO donation_camps (title,organizer_id,blood_bank_id,location_id,starts_at,ends_at,status)
          VALUES ($1,$2,$3,$4,now()+$5*interval '1 day',now()+$5*interval '1 day'+interval '2 hours',$6) RETURNING id`, [tag, organizerId, bankId, locationId, future ? 20 : -20, status])).rows[0].id;
      }
      async function deny(id, actor, code) {
        await client.query('SAVEPOINT denied_approval');
        await assert.rejects(client.query('CALL sp_approve_donation_camp($1,$2)', [id, actor]), error => error.code === code);
        await client.query('ROLLBACK TO SAVEPOINT denied_approval');
      }
      const adminCamp = await camp();
      await client.query('CALL sp_approve_donation_camp($1,$2)', [adminCamp, admin]);
      const approved = (await client.query('SELECT status,approved_by FROM donation_camps WHERE id=$1', [adminCamp])).rows[0];
      assert.equal(approved.status, 'APPROVED'); assert.equal(approved.approved_by, admin);
      const audit = await client.query("SELECT actor_id FROM audit_logs WHERE entity_id=$1 AND action='APPROVE'", [adminCamp]);
      assert.equal(audit.rowCount, 1); assert.equal(audit.rows[0].actor_id, admin);
      const staffCamp = await camp();
      await client.query('CALL sp_approve_donation_camp($1,$2)', [staffCamp, bankStaff]);
      assert.equal((await client.query('SELECT approved_by FROM donation_camps WHERE id=$1', [staffCamp])).rows[0].approved_by, bankStaff);
      const deniedCamp = await camp();
      await deny(deniedCamp, foreignStaff, '42501');
      await deny(deniedCamp, inactiveAdmin, '42501');
      await deny(deniedCamp, inactiveStaff, '42501');
      await client.query('UPDATE blood_banks SET is_verified=false WHERE id=$1', [bankId]);
      await deny(deniedCamp, admin, '42501');
      await client.query('UPDATE blood_banks SET is_verified=true WHERE id=$1', [bankId]);
      await deny(await camp('REJECTED'), admin, '23514');
      await deny(await camp('DRAFT'), admin, '23514');
      await deny(await camp('PENDING', false), admin, '23514');
      await deny(adminCamp, admin, '23514');
      await deny(randomUUID(), admin, 'P0002');
      assert.equal((await client.query('SELECT status FROM donation_camps WHERE id=$1', [deniedCamp])).rows[0].status, 'PENDING');
    } finally {
      await client.query('ROLLBACK');
      const after = (await client.query(definitionQuery)).rows[0].definition;
      assert.equal(after, before, 'Shared procedure definition must be unchanged after rollback');
      client.release();
      await pool.end();
    }
  });
});
