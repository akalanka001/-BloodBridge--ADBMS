import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/server.js';
import { pool } from '../src/db.js';

describe('Camp portal contracts and concurrent registrations (isolated synthetic fixtures)', () => {
  const tag = `portal-camp-${randomUUID()}`;
  const userIds = [], donorIds = [], locationIds = [], campIds = [];
  let bankId, organizerId, staffToken, donorToken, otherDonorToken, thirdDonorToken, staffId, area, otherArea;
  let localCamp, farCamp, lastPlaceCamp, historyCamp, draftCamp;
  const tokenFor = user => jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET || 'dev_jwt_secret_must_be_set_in_production_min32chars', { expiresIn: '10m' });
  const auth = token => ({ Authorization: `Bearer ${token}` });

  async function createCamp(title, locationId, capacity = null, days = 30, status = 'APPROVED') {
    const { rows } = await pool.query(`INSERT INTO donation_camps (title, organizer_id, blood_bank_id, location_id, proposed_by, approved_by, starts_at, ends_at, capacity, status)
      VALUES ($1, $2, $3, $4, $5, $5, now() + $6 * interval '1 day', now() + $6 * interval '1 day' + interval '5 hours', $7, $8) RETURNING id`, [title, organizerId, bankId, locationId, staffId, days, capacity, status]);
    campIds.push(rows[0].id);
    return rows[0].id;
  }

  before(async () => {
    const { rows: places } = await pool.query(`SELECT dist.code AS district_code, dist.province_code, gn.ds_code, gn.code AS gn_code
      FROM districts dist JOIN gn_divisions gn ON gn.district_code = dist.code ORDER BY dist.code, gn.code LIMIT 1`);
    assert.ok(places[0], 'Test requires existing synthetic GN reference data');
    area = places[0];
    const { rows: farther } = await pool.query('SELECT code AS district_code, province_code FROM districts WHERE province_code <> $1 ORDER BY code LIMIT 1', [area.province_code]);
    otherArea = farther[0];
    for (const place of [area, otherArea]) {
      const { rows } = await pool.query('INSERT INTO locations (district_code, ds_code, gn_code, town) VALUES ($1, $2, $3, $4) RETURNING id', [place.district_code, place.ds_code || null, place.gn_code || null, tag]);
      locationIds.push(rows[0].id);
    }
    for (const role of ['BANK_STAFF', 'DONOR', 'DONOR', 'DONOR']) {
      const { rows } = await pool.query('INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, role', [tag, `${randomUUID()}@portal-camp.test`, 'synthetic-test-hash', role]);
      const user = rows[0]; userIds.push(user.id);
      if (role === 'BANK_STAFF') { staffId = user.id; staffToken = tokenFor(user); }
      else {
        const result = await pool.query('INSERT INTO donors (user_id, full_name, district_code, ds_code, gn_code) VALUES ($1,$2,$3,$4,$5) RETURNING id', [user.id, tag, area.district_code, area.ds_code, area.gn_code]);
        donorIds.push(result.rows[0].id);
        if (!donorToken) donorToken = tokenFor(user); else if (!otherDonorToken) otherDonorToken = tokenFor(user); else thirdDonorToken = tokenFor(user);
      }
    }
    const bank = await pool.query('INSERT INTO blood_banks (name, location_id, is_verified) VALUES ($1,$2,true) RETURNING id', [tag, locationIds[0]]);
    bankId = Number(bank.rows[0].id);
    await pool.query('INSERT INTO staff_memberships (user_id, blood_bank_id) VALUES ($1,$2)', [staffId, bankId]);
    const organizer = await pool.query('INSERT INTO camp_organizers (name, email, phone, is_verified) VALUES ($1,$2,$3,true) RETURNING id', [tag, 'private-organizer@example.test', 'synthetic-private-contact']);
    organizerId = organizer.rows[0].id;
    // More than the old cap, with the nearest camp deliberately later by date.
    for (let i = 0; i < 125; i++) await createCamp(`${tag} far ${String(i).padStart(3, '0')}`, locationIds[1], null, 10);
    farCamp = campIds[0];
    localCamp = await createCamp(`${tag} nearest needle`, locationIds[0], null, 40);
    lastPlaceCamp = await createCamp(`${tag} last place`, locationIds[0], 1, 20);
    historyCamp = await createCamp(`${tag} attendance`, locationIds[0], null, 25);
    draftCamp = await createCamp(`${tag} private draft`, locationIds[0], null, 35, 'DRAFT');
  });

  after(async () => {
    // Only records created by this suite are removed; shared demo fixtures remain.
    if (campIds.length) {
      await pool.query('DELETE FROM camp_registrations WHERE camp_id = ANY($1::uuid[])', [campIds]);
      await pool.query('DELETE FROM donation_camps WHERE id = ANY($1::uuid[])', [campIds]);
    }
    if (userIds.length) {
      await pool.query('DELETE FROM audit_logs WHERE actor_id = ANY($1::uuid[])', [userIds]);
      await pool.query('DELETE FROM staff_memberships WHERE user_id = ANY($1::uuid[])', [userIds]);
    }
    if (donorIds.length) { await pool.query('DELETE FROM donor_consents WHERE donor_id = ANY($1::uuid[])', [donorIds]); await pool.query('DELETE FROM donors WHERE id = ANY($1::uuid[])', [donorIds]); }
    if (organizerId) await pool.query('DELETE FROM camp_organizers WHERE id = $1', [organizerId]);
    if (bankId) await pool.query('DELETE FROM blood_banks WHERE id = $1', [bankId]);
    if (locationIds.length) await pool.query('DELETE FROM locations WHERE id = ANY($1::bigint[])', [locationIds]);
    if (userIds.length) await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
    await pool.end();
  });

  it('keeps public details safe and drafts restricted to authorized management', async () => {
    const publicRes = await request(app).get(`/api/v1/camps/${localCamp}`);
    assert.equal(publicRes.status, 200, JSON.stringify(publicRes.body));
    assert.equal(publicRes.body.data.camp_id, localCamp);
    assert.equal(publicRes.body.data.capacity, null);
    for (const field of ['organizer_phone', 'organizer_email', 'proposed_by', 'approved_by', 'proposed_by_name', 'cancelled_at']) assert.equal(field in publicRes.body.data, false, `Public field leak: ${field}`);
    assert.equal((await request(app).get(`/api/v1/camps/${draftCamp}`)).status, 404);
    assert.equal((await request(app).get(`/api/v1/camps/managed/${draftCamp}`)).status, 401);
    assert.equal((await request(app).get(`/api/v1/camps/managed/${draftCamp}`).set(auth(donorToken))).status, 403);
    assert.equal((await request(app).get(`/api/v1/camps/managed/${draftCamp}`).set(auth(staffToken))).body.data.status, 'DRAFT');
  });

  it('filters all geography levels before counting, sorting and pagination beyond 100 rows', async () => {
    const first = await request(app).get('/api/v1/camps/discovery').query({ search: tag, sort: 'nearby', limit: 1 }).set(auth(donorToken));
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(first.body.pagination.total, 129 - 1); // 128 approved fixtures
    assert.equal(first.body.data[0].nearby_rank, 0);
    assert.notEqual(first.body.data[0].camp_id, farCamp);
    const local = await request(app).get('/api/v1/camps').query({ search: tag, provinceCode: area.province_code, districtCode: area.district_code, dsCode: area.ds_code, gnCode: area.gn_code, limit: 100 });
    assert.equal(local.status, 200, JSON.stringify(local.body));
    assert.equal(local.body.pagination.total, 3);
    const needle = await request(app).get('/api/v1/camps').query({ search: `${tag} nearest needle` });
    assert.equal(needle.body.data[0].camp_id, localCamp);
    const last = await request(app).get('/api/v1/camps').query({ search: tag, offset: 125, limit: 10 });
    assert.equal(last.body.data.length, 3);
    assert.equal(last.body.pagination.total, 128);
    const invalid = await request(app).get('/api/v1/camps').query({ provinceCode: otherArea.province_code, districtCode: area.district_code });
    assert.equal(invalid.status, 400);
    assert.equal((await request(app).get('/api/v1/camps').query({ limit: 1000 })).status, 400);
  });

  it('persists status, preserves the registration ID on cancellation/reactivation and rejects duplicates', async () => {
    const registration = await request(app).post(`/api/v1/camps/${localCamp}/registrations`).set(auth(donorToken));
    assert.equal(registration.status, 201, JSON.stringify(registration.body));
    const id = registration.body.data.id;
    const duplicate = await request(app).post(`/api/v1/camps/${localCamp}/registrations`).set(auth(donorToken));
    assert.equal(duplicate.status, 409);
    assert.match(duplicate.body.error, /Already registered/);
    const detail = await request(app).get(`/api/v1/camps/discovery/${localCamp}`).set(auth(donorToken));
    assert.equal(detail.body.data.registration_status, 'REGISTERED');
    assert.equal(detail.body.data.registered_count, 1);
    const ledger = await request(app).get('/api/v1/camps/registrations/me').query({ period: 'upcoming' }).set(auth(donorToken));
    assert.ok(ledger.body.data.some(camp => camp.camp_id === localCamp));
    assert.equal((await request(app).delete(`/api/v1/camps/${localCamp}/registrations`).set(auth(donorToken))).status, 200);
    const again = await request(app).post(`/api/v1/camps/${localCamp}/registrations`).set(auth(donorToken));
    assert.equal(again.status, 201, JSON.stringify(again.body));
    assert.equal(again.body.data.id, id);
    const count = await pool.query('SELECT count(*)::int AS count FROM camp_registrations WHERE camp_id=$1 AND donor_id=$2', [localCamp, donorIds[0]]);
    assert.equal(count.rows[0].count, 1);
  });

  it('serializes two independent last-place registration requests without overbooking', async () => {
    const results = await Promise.all([otherDonorToken, thirdDonorToken].map(token => request(app).post(`/api/v1/camps/${lastPlaceCamp}/registrations`).set(auth(token))));
    assert.deepEqual(results.map(res => res.status).sort(), [201, 409], JSON.stringify(results.map(res => res.body)));
    assert.match(results.find(res => res.status === 409).body.error, /full/);
    const { rows } = await pool.query("SELECT count(*)::int AS count FROM camp_registrations WHERE camp_id=$1 AND status='REGISTERED'", [lastPlaceCamp]);
    assert.equal(rows[0].count, 1);
    // A cancelled existing row cannot bypass capacity when competing to return.
    const winnerIndex = results[0].status === 201 ? 1 : 2;
    const loserIndex = winnerIndex === 1 ? 2 : 1;
    await pool.query("INSERT INTO camp_registrations (camp_id, donor_id, status) VALUES ($1,$2,'CANCELLED')", [lastPlaceCamp, donorIds[loserIndex]]);
    const loserToken = loserIndex === 1 ? otherDonorToken : thirdDonorToken;
    assert.equal((await request(app).post(`/api/v1/camps/${lastPlaceCamp}/registrations`).set(auth(loserToken))).status, 409);
    const state = await pool.query('SELECT status FROM camp_registrations WHERE camp_id=$1 AND donor_id=$2', [lastPlaceCamp, donorIds[loserIndex]]);
    assert.equal(state.rows[0].status, 'CANCELLED');
  });

  it('preserves attended/no-show history and rejects closed camp registration', async () => {
    await pool.query("INSERT INTO camp_registrations (camp_id, donor_id, status, attendance_notes) VALUES ($1,$2,'ATTENDED','Synthetic attendance evidence')", [historyCamp, donorIds[0]]);
    const response = await request(app).post(`/api/v1/camps/${historyCamp}/registrations`).set(auth(donorToken));
    assert.equal(response.status, 409); assert.match(response.body.error, /Attendance history/);
    assert.equal((await request(app).post(`/api/v1/camps/${draftCamp}/registrations`).set(auth(donorToken))).status, 409);
    const { rows } = await pool.query('SELECT status, attendance_notes FROM camp_registrations WHERE camp_id=$1 AND donor_id=$2', [historyCamp, donorIds[0]]);
    assert.equal(rows[0].status, 'ATTENDED'); assert.equal(rows[0].attendance_notes, 'Synthetic attendance evidence');
  });
});
