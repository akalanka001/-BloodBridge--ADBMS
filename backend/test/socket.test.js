import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { io as ClientIO } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { initSocketServer, broadcastEmergencyRequest, broadcastCampCapacity, broadcastTransferStatus } from '../src/socket.js';

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

  await t.test('cleanup test server', async () => {
    await new Promise((resolve) => server.close(resolve));
  });
});
