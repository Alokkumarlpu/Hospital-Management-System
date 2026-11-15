import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User, Session, Patient, Doctor } from '../models/index.js';
import { createPublicId } from '../utils/identifiers.js';
import { writeAuditLog } from '../utils/audit.js';
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
    const role = req.user?.role === 'admin' && req.body.role
      ? req.body.role
      : req.body.role === 'clinician'
        ? 'clinician'
        : 'front_desk';
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
      await writeAuditLog({
        userId: user?._id,
        action: 'login_failed',
        entityType: 'Authentication',
        entityId: user?._id,
        description: 'Failed login attempt',
        req,
      });
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }
    await writeAuditLog({ userId: user._id, action: 'login', entityType: 'Authentication', entityId: user._id, description: 'Successful login', req });
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
    await writeAuditLog({ userId: req.user._id, action: 'logout', entityType: 'Authentication', entityId: req.user._id, description: 'User logged out', req });
    res.clearCookie(env.cookieName, authCookieOptions());
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res) {
  res.json({ success: true, user: safeUser(req.user) });
}

export async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    const patientClauses = [{ userId: user._id }];
    if (user.patientId && mongoose.isValidObjectId(user.patientId)) patientClauses.push({ _id: user.patientId });
    const patient = user.role === 'patient'
      ? await Patient.findOne({ isActive: true, $or: patientClauses })
      : null;
    const doctor = user.role === 'clinician'
      ? await Doctor.findOne({ userId: user._id, isActive: true }).populate('departmentId', 'departmentName')
      : null;
    const profile = patient || doctor || user;
    const fields = [user.name, user.email, user.phone, user.dateOfBirth, user.gender, user.address, user.city, user.state, user.country, user.postalCode];
    const completion = Math.round((fields.filter(Boolean).length / fields.length) * 100);
    res.json({ success: true, user: safeUser(user), profile, profileType: patient ? 'patient' : doctor ? 'doctor' : 'staff', completion });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const allowed = ['name', 'phone', 'alternatePhone', 'salutation', 'dateOfBirth', 'gender', 'address', 'city', 'state', 'country', 'postalCode', 'profilePhotoUrl'];
    const user = await User.findById(req.user._id);
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });
    await user.save();
    if (user.role === 'patient') {
      await Patient.findOneAndUpdate(
        { $or: [{ userId: user._id }, { _id: user.patientId }] },
        { $set: { name: user.name, phone: user.phone, address: user.address, email: user.email } },
      );
    }
    await writeAuditLog({ userId: user._id, action: 'update', entityType: 'UserProfile', entityId: user._id, description: 'Updated personal profile details', req });
    res.json({ success: true, user: safeUser(user) });
  } catch (error) {
    next(error);
  }
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

export async function registerPatient(req, res, next) {
  try {
    const { name, email, password, phone, dateOfBirth, gender, address, inviteToken } = req.body;
    if (await User.exists({ email })) {
      res.status(409).json({ success: false, message: 'An account with this email already exists' });
      return;
    }

    let patient;
    if (inviteToken) {
      const tokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex');
      patient = await Patient.findOne({
        invitationTokenHash: tokenHash,
        invitationExpiresAt: { $gt: new Date() },
        userId: null,
        isActive: true,
      }).select('+invitationTokenHash +invitationExpiresAt');
      if (!patient) {
        res.status(400).json({ success: false, message: 'The invitation is invalid or has expired' });
        return;
      }
    } else {
      patient = await Patient.create({ patientId: createPublicId('PAT'), name, dateOfBirth, gender, phone, email, address });
    }

    const user = await User.create({ name, email, password, phone, role: 'patient', patientId: patient._id });
    patient.userId = user._id;
    patient.name = name;
    patient.dateOfBirth = dateOfBirth;
    patient.gender = gender;
    patient.phone = phone;
    patient.email = email;
    patient.address = address;
    patient.invitationTokenHash = undefined;
    patient.invitationExpiresAt = undefined;
    await patient.save();
    await sendSession(res, user, 201);
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = 'This patient record or email is already linked to an account';
    }
    next(error);
  }
}
