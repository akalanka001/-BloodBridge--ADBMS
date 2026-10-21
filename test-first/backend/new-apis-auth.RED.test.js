// Copy ONLY to the chosen feature branch after confirming route ownership.
// REAL RED CONTRACT TESTS: These tests should initially FAIL with 404 on the
// dev starter, then pass with 401/200 when protected new routes are mounted.
// Requirements: existing backend node:test + supertest; import app from server.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../../backend/src/server.js';

// This standalone pack path is relative to this document package. When copying
// into repo backend/test/ replace import with: '../src/server.js'
const cases = [
  ['M1 geo GN list', 'get', '/api/v1/locations/gn-divisions?dsCode=MAH', 200],
  ['M1 admin institutions', 'post', '/api/v1/admin/institutions', 401],
  ['M4 donation creation', 'post', '/api/v1/donations', 401],
  ['M4 fulfillment creation', 'post', '/api/v1/fulfillments', 401],
  ['M5 camp check-in', 'post', '/api/v1/camps/11111111-1111-1111-1111-111111111111/checkins', 401],
  ['M6 admin analytics', 'get', '/api/v1/analytics/summary', 401],
];
for (const [name, method, url, expected] of cases) {
  test(`${name}: route correctly exists and guards data`, async () => {
    const res = await request(app)[method](url).send({});
    assert.equal(res.status, expected);
  });
}
