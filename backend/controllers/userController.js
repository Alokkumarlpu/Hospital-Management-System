import { User } from '../models/index.js';
import { writeAuditLog } from '../utils/audit.js';

function safeUser(user) {
  return user.toSafeObject();
}

export async function getAllUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, users: users.map(safeUser) });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const { name, email, password, phone, role } = req.body;
    const user = await User.create({ name, email, password, phone, role });
    await writeAuditLog({ userId: req.user._id, action: 'create', entityType: 'User', entityId: user._id, req });
    res.status(201).json({ success: true, user: safeUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = 'An account with this email already exists';
    }
    next(error);
  }
}

export async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    await writeAuditLog({ userId: req.user._id, action: 'update', entityType: 'User', entityId: user._id, metadata: { fields: Object.keys(updates) }, req });
    res.json({ success: true, user: safeUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const allowed = ['name', 'email', 'phone', 'role', 'isActive'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if ('role' in updates && req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Only administrators can change user roles' });
      return;
    }
    const user = await User.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after', runValidators: true });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, user: safeUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = 'An account with this email already exists';
    }
    next(error);
  }
}

export async function updateUserStatus(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { returnDocument: 'after', runValidators: true });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (!user.isActive) {
      const { Session } = await import('../models/index.js');
      await Session.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
    }
    await writeAuditLog({ userId: req.user._id, action: user.isActive ? 'activate' : 'deactivate', entityType: 'User', entityId: user._id, req });
    res.json({ success: true, user: safeUser(user) });
  } catch (error) {
    next(error);
  }
}
