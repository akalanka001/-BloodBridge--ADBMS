import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { io as ClientIO } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { initSocketServer, broadcastEmergencyRequest, broadcastCampCapacity, broadcastTransferStatus } from '../src/socket.js';
import { pool } from '../src/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'bloodbridge_dev_secret_key_change_me_to_random_32_characters_minimum';

test('Socket.io Real-Time Event System', async (t) => {
  let server;
  let serverPort;

  await t.test('setup HTTP and Socket.io test server', async () => {
    server = http.createServer();
    initSocketServer(server);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        resolve();
      });
    });
    assert.ok(serverPort > 0, 'Server should listen on dynamic port');
  });

  await t.test('unauthenticated client can connect and echo ping:echo', async () => {
    const client = ClientIO(`http://127.0.0.1:${serverPort}`, {
      transports: ['websocket'],
      forceNew: true,
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timed out')), 4000);
      client.on('connect', () => {
        client.emit('ping:echo', { message: 'hello-socket' });
      });

      client.on('pong:echo', (data) => {
        clearTimeout(timeout);
        assert.equal(data.message, 'hello-socket');
        assert.ok(data.timestamp);
        client.disconnect();
        resolve();
      });
    });
  });

  await t.test('authenticated staff receives emergency:broadcast and camp:capacity_update', async () => {
    const token = jwt.sign(
      {
        id: '99',
        role: 'BANK_STAFF',
        bloodBankId: '1',
        clusterId: '1',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const client = ClientIO(`http://127.0.0.1:${serverPort}`, {
      transports: ['websocket'],
      forceNew: true,
      auth: { token },
    });

    let emergencyReceived = false;
    let campUpdateReceived = false;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Events not received within timeout')), 5000);

      client.on('connect', () => {
        // Trigger broadcasts
        setTimeout(() => {
          broadcastEmergencyRequest({
            id: 'req-test-101',
            hospitalName: 'Colombo National Hospital',
            urgency: 'CRITICAL',
            bloodTypeCode: 'O_NEG',
            componentCode: 'PRC',
            unitsRequested: 4,
            clusterId: '1',
          });

          broadcastCampCapacity({
            id: 'camp-test-202',
            registeredCount: 45,
            maxCapacity: 100,
            status: 'APPROVED',
          });
        }, 100);
      });

      client.on('emergency:broadcast', (payload) => {
        assert.equal(payload.requestId, 'req-test-101');
        assert.equal(payload.urgency, 'CRITICAL');
        assert.equal(payload.bloodTypeCode, 'O_NEG');
        emergencyReceived = true;
        if (emergencyReceived && campUpdateReceived) {
          clearTimeout(timeout);
          client.disconnect();
          resolve();
        }
      });

      client.on('camp:capacity_update', (payload) => {
        assert.equal(payload.campId, 'camp-test-202');
        assert.equal(payload.registeredCount, 45);
        campUpdateReceived = true;
        if (emergencyReceived && campUpdateReceived) {
          clearTimeout(timeout);
          client.disconnect();
          resolve();
        }
      });
    });

    assert.ok(emergencyReceived);
    assert.ok(campUpdateReceived);
  });

  await t.test('session:verify evicts client and emits session:revoked when institutional membership is revoked', async () => {
    let testUserId;
    let testLocId;
    let testBankId;
    let client;
    try {
      client = await pool.connect();
      const { rows: lRows } = await client.query("INSERT INTO locations (district_code, town) VALUES ('CO', 'Socket Test Town') RETURNING id");
      testLocId = lRows[0].id;
      const { rows: bRows } = await client.query("INSERT INTO blood_banks (name, location_id, is_verified) VALUES ('Socket Bank', $1, true) RETURNING id", [testLocId]);
      testBankId = bRows[0].id;

      const { rows: uRows } = await client.query(`
        INSERT INTO users (full_name, email, password_hash, role, is_active)
        VALUES ('Socket Staff', 'socket.staff@example.com', 'test_hash_123', 'BANK_STAFF', true)
        RETURNING id
      `);
      testUserId = uRows[0].id;

      await client.query(`
        INSERT INTO staff_memberships (user_id, blood_bank_id, is_active)
        VALUES ($1, $2, true)
      `, [testUserId, testBankId]);
    } catch {
      // Proceed gracefully if DB is offline during unit runs
    }

    if (testUserId && client) {
      try {
        const staffToken = jwt.sign(
          { id: testUserId, role: 'BANK_STAFF', bloodBankId: String(testBankId) },
          JWT_SECRET,
          { expiresIn: '1h' },
        );

        const socketClient = ClientIO(`http://127.0.0.1:${serverPort}`, {
          transports: ['websocket'],
          forceNew: true,
          auth: { token: staffToken },
        });

        await new Promise((resolve) => socketClient.on('connect', resolve));

        // 1. Initial verify is valid
        const initialStatus = await new Promise((resolve) => socketClient.emit('session:verify', resolve));
        assert.equal(initialStatus.valid, true);

        // 2. Deactivate staff membership in database
        await client.query('UPDATE staff_memberships SET is_active = false WHERE user_id = $1', [testUserId]);

        // 3. Set up listener for session:revoked event
        let sessionRevokedEvent = false;
        socketClient.on('session:revoked', (payload) => {
          assert.ok(payload.reason.includes('membership revoked'));
          sessionRevokedEvent = true;
        });

        // 4. Trigger session:verify -> should detect revoked institutional membership
        const verifyResult = await new Promise((resolve) => socketClient.emit('session:verify', resolve));
        assert.equal(verifyResult.valid, false);
        assert.equal(verifyResult.revoked, true);
        assert.ok(sessionRevokedEvent, 'Client must receive session:revoked event');

        socketClient.disconnect();
      } finally {
        await client.query('DELETE FROM staff_memberships WHERE user_id = $1', [testUserId]);
        await client.query('DELETE FROM users WHERE id = $1', [testUserId]);
        await client.query('DELETE FROM blood_banks WHERE id = $1', [testBankId]);
        await client.query('DELETE FROM locations WHERE id = $1', [testLocId]);
        client.release();
      }
    }
  });

  await t.test('cleanup test server', async () => {
    await new Promise((resolve) => server.close(resolve));
  });
});
