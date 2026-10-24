import http from 'node:http';
import express from 'express';
import { ZodError } from 'zod';
import { pool } from './db.js';
import { ApiError } from './infrastructure/errors.js';
import { initSocketServer } from './socket.js';

import authRoutes from './modules/identity/identity.routes.js';
import locationRoutes from './modules/geography/geography.routes.js';
import donorRoutes from './modules/donors/donors.routes.js';
import donorIntakeRoutes from './modules/donor-intake/intake.routes.js';
import requestRoutes from './modules/requests/requests.routes.js';
import hospitalRoutes from './modules/hospital/hospital.routes.js';
import fulfillmentRoutes from './modules/fulfillments/fulfillments.routes.js';
import appealsRoutes from './modules/emergency-appeals/appeals.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import bankRoutes from './modules/bank/bank.routes.js';
import transferRoutes from './modules/transfers/transfers.routes.js';
import campRoutes from './modules/camps/camps.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '150kb' }));

app.get('/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT now() AS db_time');
    res.json({ status: 'ok', database: 'connected', dbTime: rows[0].db_time });
  } catch (_error) {
    res.status(503).json({ status: 'unavailable', database: 'disconnected' });
  }
});

app.get('/api/v1', (_req, res) => res.json({
  application: 'BloodBridge',
  status: 'academic prototype',
  version: '2.0.0',
  modules: [
    'identity', 'geography', 'donors', 'donor-intake',
    'requests', 'inventory', 'transfers', 'camps', 'analytics', 'admin',
  ],
  note: 'API routes verified under docs/API_IMPLEMENTED.md and docs/API_CONTRACT_V2.yaml',
}));

// Domain Feature Modules
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/donors', donorRoutes);
app.use('/api/v1/donor-intake', donorIntakeRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/hospital', hospitalRoutes);
app.use('/api/v1/fulfillments', fulfillmentRoutes);
app.use('/api/v1/emergency-appeals', appealsRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/bank', bankRoutes);
app.use('/api/v1/transfers', transferRoutes);
app.use('/api/v1/camps', campRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/admin', adminRoutes);

// Catch-all for undefined routes
app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found' }));

// Centralized Error Handling
app.use((err, _req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
    });
  }
  if (err.code === '23505') return res.status(409).json({ error: 'Duplicate record' });
  if (['23503', '23514', '22007', '22P02'].includes(err.code)) {
    return res.status(400).json({ error: 'Invalid or conflicting data/state' });
  }
  if (err.code === '42501') return res.status(403).json({ error: 'Permission denied' });
  console.error('API failure:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);
const io = initSocketServer(server);

export { app, server, io };
export default app;

const isMain = process.argv[1] && process.argv[1].endsWith('server.js');
if (isMain && process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT || 4000);
  server.listen(port, '0.0.0.0', () => console.log(`BloodBridge API & Socket.io listening on :${port}`));
  process.on('SIGTERM', () => server.close(() => pool.end()));
}
