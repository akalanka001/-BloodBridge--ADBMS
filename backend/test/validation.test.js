import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/server.js';

describe('Input Validation & Error Handling', () => {
  it('returns 404 for non-existent routes', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint');
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'Endpoint not found' });
  });

  it('rejects donor registration with missing required fields (400)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-donor')
      .send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Validation failed');
    assert.ok(Array.isArray(res.body.details));
    const fields = res.body.details.map(d => d.field);
    assert.ok(fields.includes('fullName'));
    assert.ok(fields.includes('email'));
    assert.ok(fields.includes('password'));
    assert.ok(fields.includes('districtCode'));
  });

  it('rejects donor registration with password shorter than 10 characters (400)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-donor')
      .send({
        fullName: 'Test Donor',
        email: 'donor@example.test',
        password: 'short',
        districtCode: 'CO',
      });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Validation failed');
    const pwdIssue = res.body.details.find(d => d.field === 'password');
    assert.ok(pwdIssue, 'Must flag password length');
  });

  it('rejects donor registration with invalid email format (400)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-donor')
      .send({
        fullName: 'Test Donor',
        email: 'invalid-email-address',
        password: 'valid-long-password-123',
        districtCode: 'CO',
      });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Validation failed');
    const emailIssue = res.body.details.find(d => d.field === 'email');
    assert.ok(emailIssue, 'Must flag invalid email format');
  });

  it('rejects donor registration with invalid blood type code (400)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-donor')
      .send({
        fullName: 'Test Donor',
        email: 'donor2@example.test',
        password: 'valid-long-password-123',
        districtCode: 'CO',
        bloodTypeCode: 'INVALID_TYPE',
      });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Validation failed');
    const bloodTypeIssue = res.body.details.find(d => d.field === 'bloodTypeCode');
    assert.ok(bloodTypeIssue, 'Must flag invalid blood type code');
  });

  it('rejects login with missing email or password (400)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Validation failed');
  });

  it('rejects DS-divisions query without required districtCode (400)', async () => {
    const res = await request(app).get('/api/v1/locations/ds-divisions');
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'districtCode is required' });
  });

  it('verifies /api/v1 status metadata is public and operational', async () => {
    const res = await request(app).get('/api/v1');
    assert.equal(res.status, 200);
    assert.equal(res.body.application, 'BloodBridge');
  });
});
