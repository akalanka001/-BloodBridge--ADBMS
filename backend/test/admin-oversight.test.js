import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/server.js';
import { pool } from '../src/db.js';
import { listOversight, oversightQueries } from '../src/modules/admin/oversight.service.js';
import { oversightFilterSchema, oversightDatasetSchema } from '../src/modules/admin/admin.validation.js';

after(async () => { await pool.end(); });

test('administrative ledger pagination validates bounds and rejects unknown datasets', () => {
  assert.equal(oversightFilterSchema.safeParse({ limit: 101 }).success, false);
  assert.equal(oversightFilterSchema.safeParse({ offset: -1 }).success, false);
  assert.equal(oversightDatasetSchema.safeParse('users; DROP TABLE donors').success, false);
});

test('ledger search is parameterized, counted before pagination, and keeps a stable unique sort', async () => {
  const calls = [];
  const db = { query: async (sql, values) => {
    calls.push({ sql, values });
    return { rows: calls.length === 1 ? [{ total: 3 }] : [{ id: 'record-3' }] };
  } };
  const search = "O+' OR 1=1 --";
  const result = await listOversight('donors', { search, limit: 1, offset: 2 }, db);
  assert.equal(result.pagination.total, 3);
  assert.equal(result.pagination.page, 3);
  assert.equal(calls[0].values[0], `%${search}%`);
  assert.equal(calls[0].sql.includes(search), false);
  assert.deepEqual(calls[1].values, [`%${search}%`, 1, 2]);
  assert.match(calls[1].sql, /record\.id DESC/);
  assert.doesNotMatch(oversightQueries.donors, /national_id_hash|d\.phone|d\.email|weight_kg|birth_date/);
});

test('all oversight projections execute against the real schema and return bounded data', async () => {
  for (const dataset of Object.keys(oversightQueries)) {
    const result = await listOversight(dataset, { limit: 1, offset: 0 });
    assert.ok(result.data.length <= 1, `${dataset} exceeded limit`);
    assert.ok(result.pagination.total >= result.data.length, `${dataset} invalid total`);
  }
});

test('administrative donor/operations data rejects unauthenticated and donor access', async (t) => {
  const unauth = await request(app).get('/api/v1/admin/donors');
  assert.equal(unauth.status, 401);
  const { rows } = await pool.query("SELECT id FROM users WHERE role = 'DONOR' AND is_active LIMIT 1");
  if (!rows[0]) return t.skip('No active synthetic donor fixture is available');
  const token = jwt.sign({ sub: rows[0].id, role: 'DONOR' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  for (const path of ['/api/v1/admin/donors', '/api/v1/admin/operations/inventory']) {
    const response = await request(app).get(path).set('Authorization', `Bearer ${token}`);
    assert.equal(response.status, 403);
  }
});

test('ADMIN ledger responses have compatible envelopes and validated pagination', async (t) => {
  const { rows } = await pool.query("SELECT id FROM users WHERE role = 'ADMIN' AND is_active LIMIT 1");
  if (!rows[0]) return t.skip('No active synthetic administrator fixture is available');
  const token = jwt.sign({ sub: rows[0].id, role: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const auth = (path) => request(app).get(path).set('Authorization', `Bearer ${token}`);
  const response = await auth('/api/v1/admin/donors?limit=1&offset=0');
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.equal(response.body.pagination.pageSize, 1);
  assert.equal((await auth('/api/v1/admin/donors?limit=999')).status, 400);
  assert.equal((await auth('/api/v1/admin/operations/secrets')).status, 400);
  const institutions = await auth('/api/v1/admin/institutions?limit=1&offset=0');
  assert.equal(institutions.status, 200);
  assert.ok(Array.isArray(institutions.body.data));
  assert.equal(institutions.body.pagination.pageSize, 1);
});
