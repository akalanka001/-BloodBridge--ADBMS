import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/server.js';
import { authenticate, requireRole } from '../src/middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_local_testing_only_32_chars';
process.env.JWT_SECRET = JWT_SECRET;

describe('Authentication & Authorization Middleware', () => {
  it('rejects requests without Authorization header (401)', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { error: 'Authentication required' });
  });

  it('rejects malformed Bearer tokens (401)', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'NotBearer 12345');
    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { error: 'Authentication required' });
  });

  it('rejects tokens signed with an invalid secret (401)', async () => {
    const fakeToken = jwt.sign({}, 'wrong_secret', { subject: '00000000-0000-0000-0000-000000000000' });
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${fakeToken}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Invalid or expired token');
  });

  it('rejects expired tokens (401)', async () => {
    const expiredToken = jwt.sign({}, JWT_SECRET, {
      subject: '00000000-0000-0000-0000-000000000000',
      expiresIn: '-1s',
    });
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Invalid or expired token');
  });

  it('requireRole middleware blocks users with mismatched roles (403)', () => {
    let statusSet = null;
    let jsonSent = null;
    let nextCalled = false;

    const mockReq = { user: { id: '00000000-0000-0000-0000-000000000000', role: 'DONOR' } };
    const mockRes = {
      status(code) {
        statusSet = code;
        return this;
      },
      json(body) {
        jsonSent = body;
        return this;
      },
    };
    const mockNext = () => { nextCalled = true; };

    const bankOnly = requireRole('BANK_STAFF');
    bankOnly(mockReq, mockRes, mockNext);

    assert.equal(statusSet, 403);
    assert.deepEqual(jsonSent, { error: 'Insufficient permissions' });
    assert.equal(nextCalled, false);
  });

  it('requireRole middleware passes when user has allowed role', () => {
    let nextCalled = false;
    const mockReq = { user: { id: '00000000-0000-0000-0000-000000000000', role: 'BANK_STAFF' } };
    const mockRes = {};
    const mockNext = () => { nextCalled = true; };

    const bankOnly = requireRole('BANK_STAFF', 'ADMIN');
    bankOnly(mockReq, mockRes, mockNext);

    assert.equal(nextCalled, true);
  });

  it('requireRole middleware blocks request if user is not authenticated on req', () => {
    let statusSet = null;
    let jsonSent = null;
    let nextCalled = false;

    const mockReq = {};
    const mockRes = {
      status(code) { statusSet = code; return this; },
      json(body) { jsonSent = body; return this; },
    };
    const mockNext = () => { nextCalled = true; };

    const bankOnly = requireRole('BANK_STAFF');
    bankOnly(mockReq, mockRes, mockNext);

    assert.equal(statusSet, 403);
    assert.deepEqual(jsonSent, { error: 'Insufficient permissions' });
    assert.equal(nextCalled, false);
  });
});
