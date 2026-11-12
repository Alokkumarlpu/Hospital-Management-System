import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function assertJwtConfigured() {
  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
}

export function createAuthToken(userId) {
  assertJwtConfigured();
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub: userId.toString(), jti }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  return { token, jti };
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  };
}
