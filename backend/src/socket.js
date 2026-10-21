import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

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

  // Authentication & room assignment middleware
  io.use((socket, next) => {
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
      socket.user = decoded;
      return next();
    } catch (_err) {
      // Allow unauthenticated connection fallback with socket.user = null
      socket.user = null;
      return next();
    }
  });

  io.on('connection', (socket) => {
    // Every client joins the public broadcasts channel
    socket.join('public');
    socket.join('camps');

    if (socket.user) {
      const { role, hospitalId, bloodBankId, clusterId } = socket.user;

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

      // Allow client to subscribe to specific camp room
      socket.on('join:camp', (campId) => {
        if (campId) socket.join(`camp:${campId}`);
      });

      socket.on('leave:camp', (campId) => {
        if (campId) socket.leave(`camp:${campId}`);
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
