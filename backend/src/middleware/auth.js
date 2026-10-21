import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

export async function authenticate(req, res, next) {
  try {
    const token = /^Bearer (.+)$/i.exec(req.header('Authorization') || '')?.[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof payload.sub !== 'string') return res.status(401).json({ error: 'Invalid token' });
    const result = await pool.query(
      'SELECT id, role, full_name, email FROM users WHERE id=$1 AND is_active=true',
      [payload.sub],
    );
    if (!result.rows[0]) return res.status(401).json({ error: 'Account not active' });
    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(err);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
