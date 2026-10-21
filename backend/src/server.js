import express from 'express';
import { ZodError } from 'zod';
import { pool } from './db.js';
import authRoutes from './routes/auth.js';
import locationRoutes from './routes/locations.js';
import donorRoutes from './routes/donors.js';
import campRoutes from './routes/camps.js';
import requestRoutes from './routes/requests.js';
import inventoryRoutes from './routes/inventory.js';

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
  status: 'academic starter',
  note: 'Only routes listed in docs/API_IMPLEMENTED.md are operational',
}));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/donors', donorRoutes);
app.use('/api/v1/camps', campRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.issues.map(({ path, message }) => ({ field: path.join('.'), message })) });
  }
  if (err.code === '23505') return res.status(409).json({ error: 'Duplicate record' });
  if (['23503','23514','22007','22P02'].includes(err.code)) return res.status(400).json({ error: 'Invalid or conflicting data/state' });
  if (err.code === '42501') return res.status(403).json({ error: 'Permission denied' });
  console.error('API failure:', err);
  res.status(500).json({ error: 'Internal server error' });
});
const port = Number(process.env.PORT || 4000);
const server = app.listen(port, '0.0.0.0', () => console.log(`BloodBridge API listening on :${port}`));
process.on('SIGTERM', () => server.close(() => pool.end()));
