import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/server.js';
import { pool } from '../src/db.js';
import { requireInstitution } from '../src/middleware/requireInstitution.js';

describe('Member 1 — Auth, RBAC, Sessions & Geography (M1-A04..A17)', () => {
  const testTimestamp = Date.now();
  const testEmail = `donor_${testTimestamp}@example.com`;
  let donorAccessToken = '';
  let donorRefreshToken = '';
  let adminAccessToken = '';
  let testUserId = '';

  // Setup: Get or create an admin user token
  it('prepares an admin user for invitation and authorization tests', async () => {
    const adminEmail = `admin_m1_${testTimestamp}@example.com`;
    const hashed = await bcrypt.hash('AdminPass123!', 10);
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'ADMIN')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id, email, role`,
      ['Test Admin', adminEmail, hashed],
    );

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: 'AdminPass123!' });

    assert.equal(loginRes.status, 200);
    assert.ok(loginRes.body.token);
    adminAccessToken = loginRes.body.token;
  });

  // M1-A05: Register valid donor
  it('M1-A05: registers valid donor with age >= 18 and weight >= 50 kg', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-donor')
      .send({
        fullName: 'Kamal Perera',
        email: testEmail,
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        phone: '0771234567',
        birthDate: '1998-05-15', // >= 18 years
        weightKg: 65.5, // >= 50 kg
        districtCode: 'CO',
        dsCode: 'MAH',
        gnCode: '529',
        town: 'Maharagama',
        bloodTypeCode: 'O+',
        availableForContact: true,
        campNotificationsOptIn: true,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.message, 'Donor account created');
    assert.equal(res.body.user.email, testEmail.toLowerCase());
    testUserId = res.body.user.id;
  });

  // Donor eligibility checks: Age and Weight rejection
  it('rejects donor registration when age is under 18 years old', async () => {
    const underageDate = new Date();
    underageDate.setFullYear(underageDate.getFullYear() - 16); // 16 years old
    const birthDateStr = underageDate.toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/v1/auth/register-donor')
      .send({
        fullName: 'Underage Youth',
        email: `underage_${testTimestamp}@example.com`,
        password: 'SecurePassword123!',
        birthDate: birthDateStr,
        weightKg: 55,
        districtCode: 'CO',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /Validation failed/i);
    assert.ok(res.body.details.some((d) => d.message.includes('18 years of age')));
  });

  it('rejects donor registration when weight is below 50 kg', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-donor')
      .send({
        fullName: 'Lightweight Candidate',
        email: `lightweight_${testTimestamp}@example.com`,
        password: 'SecurePassword123!',
        birthDate: '2000-01-01',
        weightKg: 45.0, // < 50 kg
        districtCode: 'CO',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /Validation failed/i);
    assert.ok(res.body.details.some((d) => d.message.includes('50 kg')));
  });

  // M1-A06: Duplicate email case-insensitive
  it('M1-A06: rejects duplicate email registration case-insensitively (409)', async () => {
    const uppercaseEmail = testEmail.toUpperCase();
    const res = await request(app)
      .post('/api/v1/auth/register-donor')
      .send({
        fullName: 'Duplicate Kamal',
        email: uppercaseEmail,
        password: 'SecurePassword123!',
        birthDate: '1995-02-10',
        weightKg: 60,
        districtCode: 'CO',
      });

    assert.equal(res.status, 409);
    assert.match(res.body.error, /account with this email already exists|Duplicate/i);
  });

  // M1-A07: Passwords hashed / no plaintext in DB
  it('M1-A07: verifies passwords are stored as bcrypt hashes and never in plaintext', async () => {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [testUserId]);
    assert.ok(rows[0]);
    assert.notEqual(rows[0].password_hash, 'SecurePassword123!');
    assert.match(rows[0].password_hash, /^\$2[aby]\$\d{2}\$/);
  });

  // M1-A08: Valid login
  it('M1-A08: logs in successfully with case-insensitive email and returns rotating session tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail.toUpperCase(), // Case insensitive
        password: 'SecurePassword123!',
      });

    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.ok(res.body.refreshToken);
    assert.equal(res.body.user.email, testEmail.toLowerCase());
    donorAccessToken = res.body.token;
    donorRefreshToken = res.body.refreshToken;
  });

  // M1-A09: Invalid or expired token
  it('M1-A09: rejects invalid or expired access token on protected /me (401)', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.tampered.token');

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Invalid or expired token');
  });

  // Authenticated /me returns comprehensive user & donor details
  it('returns current user profile and donor eligibility details on /auth/me', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${donorAccessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, testEmail.toLowerCase());
    assert.equal(res.body.user.role, 'DONOR');
    assert.ok(res.body.user.donor);
    assert.equal(res.body.user.donor.district_code, 'CO');
    assert.equal(res.body.user.donor.blood_type_code, 'O+');
  });

  // Refresh token rotation
  it('rotates refresh token and returns fresh access token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: donorRefreshToken });

    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.ok(res.body.refreshToken);
    assert.notEqual(res.body.refreshToken, donorRefreshToken);

    // Old refresh token must now be invalid
    const retryRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: donorRefreshToken });

    assert.equal(retryRes.status, 401);

    // Update current valid refresh token
    donorRefreshToken = res.body.refreshToken;
  });

  // M1-A13: Session logout and revocation
  it('M1-A13: revokes session on logout so subsequent refresh fails', async () => {
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: donorRefreshToken });

    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: donorRefreshToken });

    assert.equal(refreshRes.status, 401);
  });

  // M1-A14: Account deactivation
  it('M1-A14: blocks login and access when account is deactivated', async () => {
    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [testUserId]);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'SecurePassword123!' });

    assert.equal(loginRes.status, 401);

    // Reactivate for test cleanup
    await pool.query('UPDATE users SET is_active = true WHERE id = $1', [testUserId]);
  });

  // M1-A10: Staff invite role assignment protected (Admin only)
  it('M1-A10: allows Admin to create staff invitation, but blocks non-admin (403)', async () => {
    // Ensure a blood bank exists for invitation
    let inviteBankId;
    const bbRow = await pool.query('SELECT id FROM blood_banks LIMIT 1');
    if (bbRow.rows.length > 0) {
      inviteBankId = bbRow.rows[0].id;
    } else {
      const loc = await pool.query(`
        INSERT INTO locations (district_code, ds_code, town)
        VALUES ('CO', 'COL', 'Colombo')
        RETURNING id
      `);
      const createdBank = await pool.query(`
        INSERT INTO blood_banks (name, location_id, is_verified)
        VALUES ('Test Invite Bank M1', $1, true)
        RETURNING id
      `, [loc.rows[0].id]);
      inviteBankId = createdBank.rows[0].id;
    }

    // Non-admin attempt
    const donorInvite = await request(app)
      .post('/api/v1/auth/invite-staff')
      .set('Authorization', `Bearer ${donorAccessToken}`)
      .send({
        email: `staff_${testTimestamp}@example.com`,
        role: 'BANK_STAFF',
        bloodBankId: inviteBankId,
      });

    assert.equal(donorInvite.status, 403);

    // Admin attempt
    const staffEmail = `bank_staff_${testTimestamp}@example.com`;
    const adminInvite = await request(app)
      .post('/api/v1/auth/invite-staff')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        email: staffEmail,
        role: 'BANK_STAFF',
        bloodBankId: inviteBankId,
      });

    assert.equal(adminInvite.status, 201);
    assert.ok(adminInvite.body.invitationToken);

    // Accept staff invitation
    const acceptRes = await request(app)
      .post('/api/v1/auth/accept-invite')
      .send({
        token: adminInvite.body.invitationToken,
        fullName: 'Verified Staff Member',
        password: 'StaffPassword123!',
        confirmPassword: 'StaffPassword123!',
      });

    assert.equal(acceptRes.status, 201);
    assert.equal(acceptRes.body.user.role, 'BANK_STAFF');

    // Trying to accept again fails (single-use)
    const reuseRes = await request(app)
      .post('/api/v1/auth/accept-invite')
      .send({
        token: adminInvite.body.invitationToken,
        fullName: 'Another Staff',
        password: 'StaffPassword123!',
      });

    assert.equal(reuseRes.status, 400);
  });

  // M1-A11: Password reset token one-time and expiry
  it('M1-A11: issues password reset token, allows single-use reset, and invalidates on second use', async () => {
    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: testEmail });

    assert.equal(forgotRes.status, 200);
    assert.ok(forgotRes.body.resetToken);
    const resetToken = forgotRes.body.resetToken;

    // Reset password
    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: resetToken,
        password: 'NewBrandPassword123!',
        confirmPassword: 'NewBrandPassword123!',
      });

    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.success, true);

    // Second use must fail
    const replayRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: resetToken,
        password: 'AnotherPassword123!',
      });

    assert.equal(replayRes.status, 400);

    // Sign in with new password
    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'NewBrandPassword123!' });

    assert.equal(newLogin.status, 200);
  });

  // M1-A12: Email verification token one-time
  it('M1-A12: verifies email using one-time verification token', async () => {
    // Generate fresh token
    const testReg = await request(app)
      .post('/api/v1/auth/register-donor')
      .send({
        fullName: 'Verify Test',
        email: `verify_${testTimestamp}@example.com`,
        password: 'SecurePassword123!',
        districtCode: 'CO',
        weightKg: 55,
        birthDate: '1999-01-01',
      });

    assert.equal(testReg.status, 201);
    assert.ok(testReg.body.verificationToken);

    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: testReg.body.verificationToken });

    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.success, true);

    // Reuse fails
    const reuseVerify = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: testReg.body.verificationToken });

    assert.equal(reuseVerify.status, 400);
  });

  // M1-A15: requireInstitution middleware checks
  it('M1-A15: requireInstitution middleware blocks staff from accessing another institution', async () => {
    let status = null;
    let errorSent = null;
    let nextCalled = false;

    const mockRes = {
      status(code) { status = code; return this; },
      json(data) { errorSent = data; return this; },
    };
    const mockNext = () => { nextCalled = true; };

    // Fake user who is staff at blood bank 1
    const mockReq = {
      user: { id: testUserId, role: 'BANK_STAFF' },
      params: { bankId: '9999' }, // different bank
    };

    const middleware = requireInstitution('BLOOD_BANK');
    await middleware(mockReq, mockRes, mockNext);

    assert.equal(status, 403);
    assert.ok(errorSent.error.includes('unauthorized') || errorSent.error.includes('membership'));
    assert.equal(nextCalled, false);
  });

  // M1-A16: Geography referential hierarchy
  it('M1-A16: enforces province -> district -> DS -> GN hierarchical cascading', async () => {
    // 1. Provinces
    const provRes = await request(app).get('/api/v1/locations/provinces');
    assert.equal(provRes.status, 200);
    assert.ok(provRes.body.data.some((p) => p.code === 'WP'));

    // 2. Districts of Western Province
    const distRes = await request(app).get('/api/v1/locations/districts?provinceCode=WP');
    assert.equal(distRes.status, 200);
    const codes = distRes.body.data.map((d) => d.code);
    assert.ok(codes.includes('CO'));
    assert.ok(codes.includes('GA'));
    assert.ok(codes.includes('KA'));

    // 3. DS Divisions of Colombo
    const dsRes = await request(app).get('/api/v1/locations/ds-divisions?districtCode=CO&provinceCode=WP');
    assert.equal(dsRes.status, 200);
    const dsCodes = dsRes.body.data.map((d) => d.code);
    assert.ok(dsCodes.includes('MAH'));

    // 4. Mismatch: DS query with mismatched district and province returns 400
    const mismatchRes = await request(app).get('/api/v1/locations/ds-divisions?districtCode=CO&provinceCode=CP');
    assert.equal(mismatchRes.status, 400);

    // 5. GN Divisions for Maharagama
    const gnRes = await request(app).get('/api/v1/locations/gn-divisions?districtCode=CO&dsCode=MAH');
    assert.equal(gnRes.status, 200);
    assert.ok(gnRes.body.data.some((g) => g.code === '529'));

    // 6. Incomplete / unseeded GN returns empty array gracefully without inventing values
    const emptyGnRes = await request(app).get('/api/v1/locations/gn-divisions?districtCode=GA&dsCode=NEG');
    assert.equal(emptyGnRes.status, 200);
    assert.deepEqual(emptyGnRes.body.data, []);

    // 7. Invalid DS division for district returns 400
    const invalidDsRes = await request(app).get('/api/v1/locations/gn-divisions?districtCode=CO&dsCode=NEG');
    assert.equal(invalidDsRes.status, 400);
  });
});
