import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_must_be_set_in_production_min32chars';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.header('Authorization') || '';
    const token = /^Bearer (.+)$/i.exec(authHeader)?.[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const secret = process.env.JWT_SECRET || JWT_SECRET;
    const payload = jwt.verify(token, secret);
    if (typeof payload.sub !== 'string') return res.status(401).json({ error: 'Invalid token' });

    const result = await pool.query(
      'SELECT id, role, full_name, email, is_active FROM users WHERE id=$1',
      [payload.sub],
    );

    const user = result.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Account not active' });
    }

    req.user = {
      id: user.id,
      role: user.role,
      fullName: user.full_name,
      email: user.email,
    };
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

export function hasRole(user, ...roles) {
  return Boolean(user && roles.includes(user.role));
}
