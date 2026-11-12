import { Patient } from '../models/index.js';
import { writeAuditLog } from '../utils/audit.js';
import { createPublicId } from '../utils/identifiers.js';
import { escapeRegex, getPagination, paginatedResponse } from '../utils/pagination.js';

const editableFields = ['name', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'phone', 'email', 'address', 'emergencyContact', 'bloodGroup'];

function safePatient(patient, includeSensitive = true) {
  const data = patient.toObject ? patient.toObject() : patient;
  if (!includeSensitive) {
    delete data.emergencyContact;
    delete data.address;
  }
  return data;
}

function patientUpdates(body) {
  return Object.fromEntries(Object.entries(body).filter(([key]) => editableFields.includes(key)));
}

export async function createPatient(req, res, next) {
  try {
    const patient = await Patient.create({ ...patientUpdates(req.body), patientId: createPublicId('PAT'), registeredAt: new Date() });
    await writeAuditLog({ userId: req.user._id, action: 'create', entityType: 'Patient', entityId: patient._id });
    res.status(201).json({ success: true, patient: safePatient(patient) });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = 'A patient with this identifier already exists';
    }
    next(error);
  }
}

export async function listPatients(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const search = escapeRegex(req.query.search?.trim() || '');
    const filter = search
      ? { $or: [{ name: { $regex: search, $options: 'i' } }, { patientId: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
      : {};
    if (req.query.isActive === 'true' || req.query.isActive === 'false') filter.isActive = req.query.isActive === 'true';
    const [patients, total] = await Promise.all([
      Patient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Patient.countDocuments(filter),
    ]);
    const includeSensitive = ['admin', 'front_desk'].includes(req.user.role);
    res.json({ success: true, ...paginatedResponse({ page, limit, total, data: patients.map((patient) => safePatient(patient, includeSensitive)) }) });
  } catch (error) {
    next(error);
  }
}

export async function getPatient(req, res, next) {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found' });
      return;
    }
    res.json({ success: true, patient: safePatient(patient, ['admin', 'front_desk'].includes(req.user.role)) });
  } catch (error) {
    next(error);
  }
}

export async function updatePatient(req, res, next) {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, patientUpdates(req.body), { returnDocument: 'after', runValidators: true });
    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found' });
      return;
    }
    await writeAuditLog({ userId: req.user._id, action: 'update', entityType: 'Patient', entityId: patient._id, metadata: { fields: Object.keys(patientUpdates(req.body)) } });
    res.json({ success: true, patient: safePatient(patient) });
  } catch (error) {
    next(error);
  }
}

export async function updatePatientStatus(req, res, next) {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { returnDocument: 'after', runValidators: true });
    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found' });
      return;
    }
    await writeAuditLog({ userId: req.user._id, action: req.body.isActive ? 'activate' : 'deactivate', entityType: 'Patient', entityId: patient._id });
    res.json({ success: true, patient: safePatient(patient) });
  } catch (error) {
    next(error);
  }
}
