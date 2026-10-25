import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_must_be_set_in_production_min32chars';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1h';
const REFRESH_TOKEN_DAYS = 7;

/**
 * Hash arbitrary sensitive token using SHA-256 for secure DB persistence.
 */
export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generate a cryptographically secure random token string.
 */
export function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Sign a short-lived JWT access token.
 */
export function generateAccessToken(user) {
  return jwt.sign(
    {
      role: user.role,
      email: user.email,
      fullName: user.full_name || user.fullName,
    },
    JWT_SECRET,
    {
      subject: user.id,
      expiresIn: ACCESS_TOKEN_EXPIRY,
    },
  );
}

/**
 * Generate a rotating refresh token pair: raw token for client, hash for database, and expiry.
 */
export function generateRefreshToken() {
  const rawToken = generateRandomToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  return { rawToken, tokenHash, expiresAt };
}
