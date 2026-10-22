import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

let io = null;

const JWT_SECRET = process.env.JWT_SECRET || 'bloodbridge_dev_secret_key_change_me_to_random_32_characters_minimum';

/**
 * Initializes the Socket.io real-time server attached to the Node HTTP server.
 * Supports room-based isolation for clusters, blood banks, hospitals, and public channels.
 */
export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // Authentication & live PostgreSQL membership verification
  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      // Unauthenticated socket (public visitor browsing camp counters or aggregate stock)
      socket.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.sub || decoded.id;
      const isUuid = typeof userId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

      let dbUser = null;
      if (isUuid) {
        const { rows } = await pool.query(
          `SELECT u.id, u.role, u.is_active,
                  sm.hospital_id, sm.blood_bank_id,
                  bb.cluster_id
           FROM users u
           LEFT JOIN staff_memberships sm ON sm.user_id = u.id AND sm.is_active = true
           LEFT JOIN blood_banks bb ON bb.id = sm.blood_bank_id
           WHERE u.id = $1`,
          [userId],
        );
        if (rows[0] && rows[0].is_active) {
          dbUser = rows[0];
        }
      }

      if (dbUser) {
        socket.user = {
          id: dbUser.id,
          role: dbUser.role,
          hospitalId: dbUser.hospital_id ? Number(dbUser.hospital_id) : null,
          bloodBankId: dbUser.blood_bank_id ? Number(dbUser.blood_bank_id) : null,
          clusterId: dbUser.cluster_id ? Number(dbUser.cluster_id) : null,
        };
      } else if (process.env.NODE_ENV !== 'production' && decoded.role && !isUuid) {
        // Fallback strictly disabled in production (process.env.NODE_ENV === 'production')
        socket.user = {
          id: decoded.id || decoded.sub,
          role: decoded.role,
          hospitalId: decoded.hospitalId ? Number(decoded.hospitalId) : null,
          bloodBankId: decoded.bloodBankId ? Number(decoded.bloodBankId) : null,
          clusterId: decoded.clusterId ? Number(decoded.clusterId) : null,
        };
      } else {
        socket.user = null;
      }
      return next();
    } catch (_err) {
      socket.user = null;
      return next();
    }
  });

  io.on('connection', (socket) => {
    // Every client joins the public broadcasts channel
    socket.join('public');
    socket.join('camps');

    if (socket.user) {
      const { id, role, hospitalId, bloodBankId, clusterId } = socket.user;

      if (id) {
        socket.join(`user:${id}`);
      }
      if (role) {
        socket.join(`role:${role.toLowerCase()}`);
      }
      if (hospitalId) {
        socket.join(`hospital:${hospitalId}`);
      }
      if (bloodBankId) {
        socket.join(`bank:${bloodBankId}`);
      }
      if (clusterId) {
        socket.join(`cluster:${clusterId}`);
      }
      if (role === 'ADMIN') {
        socket.join('role:admin');
      }

      // Allow client to subscribe to specific camp room
      socket.on('join:camp', (campId) => {
        if (campId) socket.join(`camp:${campId}`);
      });

      socket.on('leave:camp', (campId) => {
        if (campId) socket.leave(`camp:${campId}`);
      });

      // Active reverification to handle revoked institutional memberships
      socket.on('session:verify', async (callback) => {
        if (!socket.user?.id) {
          if (typeof callback === 'function') callback({ valid: false, error: 'Unauthenticated' });
          return;
        }
        try {
          const userId = socket.user.id;
          const isUuid = typeof userId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

          if (!isUuid) {
            if (process.env.NODE_ENV !== 'production') {
              if (typeof callback === 'function') callback({ valid: true });
              return;
            }
            if (typeof callback === 'function') callback({ valid: false, error: 'Invalid user identifier' });
            return;
          }

          const { rows } = await pool.query(
            `SELECT u.id, u.role, u.is_active,
                    sm.hospital_id, sm.blood_bank_id,
                    bb.cluster_id
             FROM users u
             LEFT JOIN staff_memberships sm ON sm.user_id = u.id AND sm.is_active = true
             LEFT JOIN blood_banks bb ON bb.id = sm.blood_bank_id
             WHERE u.id = $1`,
            [userId],
          );
          const currentUser = rows[0];
          if (!currentUser || !currentUser.is_active) {
            // Revoked: evict from all private rooms
            socket.rooms.forEach((r) => {
              if (r !== socket.id && r !== 'public' && r !== 'camps') {
                socket.leave(r);
              }
            });
            socket.user = null;
            socket.emit('session:revoked', { reason: 'Account deactivated or user not found' });
            if (typeof callback === 'function') callback({ valid: false, revoked: true, reason: 'Account deactivated' });
            return;
          }

          const currentBankId = currentUser.blood_bank_id ? Number(currentUser.blood_bank_id) : null;
          const currentHospitalId = currentUser.hospital_id ? Number(currentUser.hospital_id) : null;
          const currentClusterId = currentUser.cluster_id ? Number(currentUser.cluster_id) : null;

          const isStaffRole = socket.user.role === 'BANK_STAFF' || socket.user.role === 'HOSPITAL_STAFF';
          const hadBankMembership = Boolean(socket.user.bloodBankId);
          const hadHospitalMembership = Boolean(socket.user.hospitalId);
          const membershipRevoked =
            (hadBankMembership && !currentBankId) ||
            (hadHospitalMembership && !currentHospitalId) ||
            (isStaffRole && !currentBankId && !currentHospitalId);

          if (membershipRevoked) {
            // Evict from institutional rooms
            if (socket.user.bloodBankId) socket.leave(`bank:${socket.user.bloodBankId}`);
            if (socket.user.clusterId) socket.leave(`cluster:${socket.user.clusterId}`);
            if (socket.user.hospitalId) socket.leave(`hospital:${socket.user.hospitalId}`);
            if (socket.user.role) socket.leave(`role:${socket.user.role.toLowerCase()}`);

            socket.user.bloodBankId = null;
            socket.user.hospitalId = null;
            socket.user.clusterId = null;

            socket.emit('session:revoked', { reason: 'Institutional membership revoked' });
            if (typeof callback === 'function') {
              callback({ valid: false, revoked: true, reason: 'Institutional membership revoked' });
            }
            return;
          }

          // If membership moved to a different bank/hospital
          if (socket.user.bloodBankId && socket.user.bloodBankId !== currentBankId) {
            socket.leave(`bank:${socket.user.bloodBankId}`);
            if (currentBankId) socket.join(`bank:${currentBankId}`);
            socket.user.bloodBankId = currentBankId;
          }
          if (socket.user.clusterId && socket.user.clusterId !== currentClusterId) {
            socket.leave(`cluster:${socket.user.clusterId}`);
            if (currentClusterId) socket.join(`cluster:${currentClusterId}`);
            socket.user.clusterId = currentClusterId;
          }
          if (socket.user.hospitalId && socket.user.hospitalId !== currentHospitalId) {
            socket.leave(`hospital:${socket.user.hospitalId}`);
            if (currentHospitalId) socket.join(`hospital:${currentHospitalId}`);
            socket.user.hospitalId = currentHospitalId;
          }

          if (typeof callback === 'function') callback({ valid: true });
        } catch (err) {
          if (typeof callback === 'function') callback({ valid: false, error: err.message });
        }
      });
    }

    socket.on('ping:echo', (data) => {
      socket.emit('pong:echo', { ...data, timestamp: new Date().toISOString() });
    });
  });

  return io;
}

/**
 * Returns the active Socket.io instance if initialized.
 */
export function getIO() {
  return io;
}

/**
 * Broadcasts an emergency hospital blood request in real-time to blood banks.
 */
export function broadcastEmergencyRequest(requestData) {
  if (!io) return;
  const targetRoom = requestData.clusterId ? `cluster:${requestData.clusterId}` : 'role:bank_staff';
  io.to(targetRoom).to('role:admin').emit('emergency:broadcast', {
    type: 'EMERGENCY_REQUEST',
    requestId: requestData.id || requestData.requestId,
    hospitalName: requestData.hospitalName,
    urgency: requestData.urgency || 'CRITICAL',
    bloodTypeCode: requestData.bloodTypeCode,
    componentCode: requestData.componentCode,
    unitsRequested: requestData.unitsRequested,
    neededBy: requestData.neededBy,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcasts updated camp registration and capacity metrics.
 */
export function broadcastCampCapacity(campData) {
  if (!io) return;
  const payload = {
    campId: campData.id || campData.campId,
    registeredCount: Number(campData.registeredCount || campData.registeredDonors || 0),
    maxCapacity: Number(campData.maxCapacity || campData.targetUnits || 0),
    status: campData.status,
    timestamp: new Date().toISOString(),
  };

  io.to('camps').to(`camp:${payload.campId}`).emit('camp:capacity_update', payload);
}

/**
 * Broadcasts inter-bank blood unit transfer status changes.
 */
export function broadcastTransferStatus(transferData) {
  if (!io) return;
  const payload = {
    transferId: transferData.id || transferData.transferId,
    sourceBankId: transferData.sourceBankId,
    targetBankId: transferData.targetBankId,
    status: transferData.status,
    unitsCount: transferData.unitsCount,
    timestamp: new Date().toISOString(),
  };

  if (transferData.sourceBankId) io.to(`bank:${transferData.sourceBankId}`).emit('transfer:status_update', payload);
  if (transferData.targetBankId) io.to(`bank:${transferData.targetBankId}`).emit('transfer:status_update', payload);
  io.to('role:admin').emit('transfer:status_update', payload);
}

/**
 * Broadcasts low stock warnings to cluster blood banks and admin.
 */
export function broadcastLowStockAlert(stockData) {
  if (!io) return;
  const payload = {
    bloodBankId: stockData.bloodBankId,
    bloodBankName: stockData.bloodBankName,
    bloodTypeCode: stockData.bloodTypeCode,
    componentCode: stockData.componentCode,
    availableUnits: stockData.availableUnits,
    threshold: stockData.threshold,
    timestamp: new Date().toISOString(),
  };

  if (stockData.bloodBankId) io.to(`bank:${stockData.bloodBankId}`).emit('stock:low_alert', payload);
  io.to('role:admin').emit('stock:low_alert', payload);
}
