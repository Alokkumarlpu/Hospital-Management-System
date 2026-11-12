import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { User, Session } from '../models/index.js';
import { authCookieOptions, createAuthToken, hashToken } from '../utils/auth.js';

function safeUser(user) {
  return user.toSafeObject ? user.toSafeObject() : user;
}

function sendSession(res, user, status = 200) {
  const { token, jti } = createAuthToken(user._id);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return Session.create({ userId: user._id, jti, tokenHash: hashToken(token), expiresAt }).then(() => {
    res.cookie(env.cookieName, token, authCookieOptions());
    res.status(status).json({ success: true, user: safeUser(user) });
  });
}

export async function register(req, res, next) {
  try {
    const { name, email, password, phone } = req.body;
    const existing = await User.exists({ email });
    if (existing) {
      res.status(409).json({ success: false, message: 'An account with this email already exists' });
      return;
    }
    const role = req.user?.role === 'admin' && req.body.role ? req.body.role : 'front_desk';
    const user = await User.create({ name, email, password, phone, role });
    await sendSession(res, user, 201);
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const user = await User.findOne({ email: req.body.email }).select('+password');
    const valid = user && user.isActive && await bcrypt.compare(req.body.password, user.password);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }
    await sendSession(res, user);
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    if (req.auth?.session) {
      await Session.updateOne({ _id: req.auth.session._id }, { $set: { revokedAt: new Date() } });
    }
    res.clearCookie(env.cookieName, authCookieOptions());
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res) {
  res.json({ success: true, user: safeUser(req.user) });
}

export async function changePassword(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('+password');
    const valid = await bcrypt.compare(req.body.currentPassword, user.password);
    if (!valid) {
      res.status(400).json({ success: false, message: 'Current password is incorrect' });
      return;
    }
    user.password = req.body.newPassword;
    await user.save();
    await Session.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
    res.clearCookie(env.cookieName, authCookieOptions());
    res.json({ success: true, message: 'Password changed successfully. Please log in again.' });
  } catch (error) {
    next(error);
  }
}
