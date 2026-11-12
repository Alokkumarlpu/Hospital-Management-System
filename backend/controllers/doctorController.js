import { Doctor, Department, User } from '../models/index.js';
import { writeAuditLog } from '../utils/audit.js';
import { createPublicId } from '../utils/identifiers.js';
import { escapeRegex, getPagination, paginatedResponse } from '../utils/pagination.js';

const editableFields = ['name', 'userId', 'email', 'phone', 'specialization', 'departmentId', 'qualification', 'experience', 'consultationFee'];

function safeDoctor(doctor, limited = false) {
  const data = doctor.toObject ? doctor.toObject() : doctor;
  if (limited) {
    return { _id: data._id, doctorId: data.doctorId, name: data.name, specialization: data.specialization, departmentId: data.departmentId, qualification: data.qualification, isActive: data.isActive };
  }
  return data;
}

function doctorUpdates(body) {
  return Object.fromEntries(Object.entries(body).filter(([key]) => editableFields.includes(key)));
}

async function ensureActiveDepartment(departmentId) {
  const department = await Department.findOne({ _id: departmentId, isActive: true });
  if (!department) {
    const error = new Error('An active department is required');
    error.statusCode = 400;
    throw error;
  }
}

async function ensureLinkedUser(userId) {
  if (!userId) return;
  const user = await User.findOne({ _id: userId, isActive: true, role: 'clinician' });
  if (!user) {
    const error = new Error('Linked user must be an active clinician account');
    error.statusCode = 400;
    throw error;
  }
}

export async function createDoctor(req, res, next) {
  try {
    await ensureActiveDepartment(req.body.departmentId);
    await ensureLinkedUser(req.body.userId);
    const doctor = await Doctor.create({ ...doctorUpdates(req.body), doctorId: createPublicId('DOC') });
    await writeAuditLog({ userId: req.user._id, action: 'create', entityType: 'Doctor', entityId: doctor._id });
    res.status(201).json({ success: true, doctor: safeDoctor(doctor) });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = 'Doctor ID or linked user account already exists';
    }
    next(error);
  }
}

export async function listDoctors(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const search = escapeRegex(req.query.search?.trim() || '');
    const filter = search ? { $or: [{ name: { $regex: search, $options: 'i' } }, { specialization: { $regex: search, $options: 'i' } }] } : {};
    if (req.query.departmentId) filter.departmentId = req.query.departmentId;
    if (req.query.isActive === 'true' || req.query.isActive === 'false') filter.isActive = req.query.isActive === 'true';
    const [doctors, total] = await Promise.all([
      Doctor.find(filter).populate('departmentId', 'departmentName departmentCode').sort({ name: 1 }).skip(skip).limit(limit),
      Doctor.countDocuments(filter),
    ]);
    res.json({ success: true, ...paginatedResponse({ page, limit, total, data: doctors.map((doctor) => safeDoctor(doctor, req.user.role === 'clinician')) }) });
  } catch (error) {
    next(error);
  }
}

export async function getDoctor(req, res, next) {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('departmentId', 'departmentName departmentCode');
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }
    const limited = req.user.role === 'clinician' && String(doctor.userId) !== String(req.user._id);
    res.json({ success: true, doctor: safeDoctor(doctor, limited) });
  } catch (error) {
    next(error);
  }
}

export async function updateDoctor(req, res, next) {
  try {
    const updates = doctorUpdates(req.body);
    if (updates.departmentId) await ensureActiveDepartment(updates.departmentId);
    if (updates.userId) await ensureLinkedUser(updates.userId);
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after', runValidators: true }).populate('departmentId', 'departmentName departmentCode');
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }
    await writeAuditLog({ userId: req.user._id, action: 'update', entityType: 'Doctor', entityId: doctor._id, metadata: { fields: Object.keys(updates) } });
    res.json({ success: true, doctor: safeDoctor(doctor) });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = 'Doctor ID or linked user account already exists';
    }
    next(error);
  }
}

export async function updateDoctorStatus(req, res, next) {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { returnDocument: 'after', runValidators: true });
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }
    await writeAuditLog({ userId: req.user._id, action: req.body.isActive ? 'activate' : 'deactivate', entityType: 'Doctor', entityId: doctor._id });
    res.json({ success: true, doctor: safeDoctor(doctor) });
  } catch (error) {
    next(error);
  }
}
