import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Session, User } from '../models/index.js';

function getToken(req) {
  const cookieToken = req.cookies?.[env.cookieName];
  if (cookieToken) return cookieToken;
  const header = req.get('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
}

export async function authenticate(req, res, next) {
  const token = getToken(req);
  if (!token || !env.jwtSecret) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await Session.findOne({
      jti: payload.jti,
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).select('+tokenHash');
    if (!session) {
      res.status(401).json({ success: false, message: 'Session is invalid or expired' });
      return;
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Account is inactive or unavailable' });
      return;
    }
    req.user = user;
    req.auth = { token, payload, session };
    next();
  } catch (error) {
    const message = error.name === 'TokenExpiredError' ? 'Authentication token expired' : 'Invalid authentication token';
    res.status(401).json({ success: false, message });
  }
}

export function optionalAuthenticate(req, res, next) {
  if (!getToken(req)) {
    next();
    return;
  }
  authenticate(req, res, next);
}
