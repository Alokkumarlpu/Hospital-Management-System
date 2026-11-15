import crypto from 'node:crypto';
import { Appointment, Department, Doctor, Invoice, Patient, Payment, Prescription, DiagnosticReport, VisitRecord, ClinicalNote, User } from '../models/index.js';
import { createAppointment, availableSlots, cancelAppointment, rescheduleAppointment } from './appointmentController.js';
import { createPayment } from './paymentController.js';
import { writeAuditLog } from '../utils/audit.js';

function portalError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

export async function getPatient(req) {
  const patient = await Patient.findOne({ _id: req.user.patientId, userId: req.user._id, isActive: true });
  if (!patient) throw portalError('Your patient profile is unavailable', 403);
  return patient;
}

export async function dashboard(req, res, next) {
  try {
    const patient = await getPatient(req);
    const now = new Date();
    const [appointments, completed, pending, prescriptions, invoiceTotals, recentRecords] = await Promise.all([
      Appointment.find({ patientId: patient._id, appointmentDate: { $gte: now }, status: { $nin: ['cancelled', 'no_show'] } })
        .sort({ appointmentDate: 1, startTime: 1 }).limit(1).populate('doctorId', 'name specialization').populate('departmentId', 'departmentName'),
      Appointment.countDocuments({ patientId: patient._id, status: 'completed' }),
      Appointment.countDocuments({ patientId: patient._id, status: { $in: ['scheduled', 'confirmed'] } }),
      Prescription.countDocuments({ patientId: patient._id, status: 'active' }),
      Invoice.aggregate([{ $match: { patientId: patient._id, status: { $ne: 'cancelled' } } }, { $group: { _id: null, outstanding: { $sum: '$outstandingBalance' } } }]),
      VisitRecord.find({ patientId: patient._id, lockedAt: { $ne: null } }).sort({ visitDate: -1 }).limit(5).populate('doctorId', 'name specialization'),
    ]);
    res.json({
      success: true,
      patient,
      summary: { upcoming: pending, completed, pending, prescriptions, outstandingBalance: invoiceTotals[0]?.outstanding || 0 },
      upcomingAppointment: appointments[0] || null,
      recentRecords,
    });
  } catch (error) { next(error); }
}

export async function profile(req, res, next) {
  try { res.json({ success: true, patient: await getPatient(req) }); } catch (error) { next(error); }
}

export async function updateProfile(req, res, next) {
  try {
    const patient = await getPatient(req);
    const allowed = ['name', 'phone', 'address', 'email'];
    for (const field of allowed) if (req.body[field] !== undefined) patient[field] = req.body[field];
    await patient.save();
    await User.findByIdAndUpdate(req.user._id, { name: patient.name, phone: patient.phone });
    await writeAuditLog({ userId: req.user._id, action: 'update', entityType: 'Patient', entityId: patient._id, metadata: { fields: allowed.filter((field) => req.body[field] !== undefined) }, req });
    res.json({ success: true, patient });
  } catch (error) { next(error); }
}

export async function listDoctors(req, res, next) {
  try {
    const filter = { isActive: true };
    if (req.query.departmentId) filter.departmentId = req.query.departmentId;
    if (req.query.search) filter.$or = [{ name: { $regex: req.query.search, $options: 'i' } }, { specialization: { $regex: req.query.search, $options: 'i' } }];
    const doctors = await Doctor.find(filter).select('doctorId name specialization qualification experience consultationFee departmentId').populate('departmentId', 'departmentName departmentCode').sort({ name: 1 });
    res.json({ success: true, doctors });
  } catch (error) { next(error); }
}

export async function listDepartments(req, res, next) {
  try { res.json({ success: true, departments: await Department.find({ isActive: true }).sort({ departmentName: 1 }) }); } catch (error) { next(error); }
}

export async function bookAppointment(req, res, next) {
  try {
    const patient = await getPatient(req);
    req.body.patientId = patient._id;
    return createAppointment(req, res, next);
  } catch (error) { next(error); }
}

async function assertAppointmentOwnership(req, id) {
  const patient = await getPatient(req);
  const appointment = await Appointment.findOne({ _id: id, patientId: patient._id });
  if (!appointment) throw portalError('Appointment not found', 404);
  return appointment;
}

export async function listMyAppointments(req, res, next) {
  try {
    const patient = await getPatient(req);
    req.query.patientId = patient._id.toString();
    return (await import('./appointmentController.js')).listAppointments(req, res, next);
  } catch (error) { next(error); }
}

export async function getMyAppointment(req, res, next) {
  try {
    await assertAppointmentOwnership(req, req.params.id);
    return (await import('./appointmentController.js')).getAppointment(req, res, next);
  } catch (error) { next(error); }
}

export async function cancelMyAppointment(req, res, next) {
  try {
    await assertAppointmentOwnership(req, req.params.id);
    return cancelAppointment(req, res, next);
  } catch (error) { next(error); }
}

export async function rescheduleMyAppointment(req, res, next) {
  try {
    await assertAppointmentOwnership(req, req.params.id);
    return rescheduleAppointment(req, res, next);
  } catch (error) { next(error); }
}

async function patientRecords(req, Model, populate) {
  const patient = await getPatient(req);
  return Model.find({ patientId: patient._id, lockedAt: { $ne: null } }).sort({ createdAt: -1 }).populate(populate);
}

export async function records(req, res, next) {
  try {
    const [visits, notes] = await Promise.all([
      patientRecords(req, VisitRecord, { path: 'doctorId', select: 'name specialization' }),
      patientRecords(req, ClinicalNote, { path: 'doctorId', select: 'name' }),
    ]);
    await writeAuditLog({ userId: req.user._id, action: 'access', entityType: 'PatientRecords', entityId: req.user.patientId, req });
    res.json({ success: true, visits, notes });
  } catch (error) { next(error); }
}

export async function prescriptions(req, res, next) {
  try { res.json({ success: true, prescriptions: await patientRecords(req, Prescription, [{ path: 'doctorId', select: 'name specialization' }, { path: 'visitRecordId', select: 'visitId visitDate' }]) }); } catch (error) { next(error); }
}

export async function reports(req, res, next) {
  try { res.json({ success: true, reports: await patientRecords(req, DiagnosticReport, [{ path: 'doctorId', select: 'name specialization' }, { path: 'visitRecordId', select: 'visitId visitDate' }]) }); } catch (error) { next(error); }
}

export async function invoices(req, res, next) {
  try { const patient = await getPatient(req); res.json({ success: true, invoices: await Invoice.find({ patientId: patient._id, status: { $ne: 'cancelled' } }).sort({ invoiceDate: -1 }).populate('appointmentId', 'appointmentId appointmentDate') }); } catch (error) { next(error); }
}

export async function payments(req, res, next) {
  try { const patient = await getPatient(req); res.json({ success: true, payments: await Payment.find({ patientId: patient._id }).sort({ paymentDate: -1 }).populate('invoiceId', 'invoiceNumber totalAmount status') }); } catch (error) { next(error); }
}

export async function notifications(req, res, next) {
  try {
    await getPatient(req);
    res.json({
      success: true,
      available: false,
      notifications: [],
      message: 'Notifications are not configured for this installation.',
    });
  } catch (error) { next(error); }
}

export async function payInvoice(req, res, next) {
  try {
    const patient = await getPatient(req);
    const invoice = await Invoice.findOne({ _id: req.body.invoiceId, patientId: patient._id });
    if (!invoice) throw portalError('Invoice not found', 404);
    return createPayment(req, res, next);
  } catch (error) { next(error); }
}

export async function createPatientInvite(req, res, next) {
  try {
    const patient = await Patient.findOne({ _id: req.body.patientId, isActive: true });
    if (!patient) throw portalError('Active patient not found', 404);
    if (patient.userId) throw portalError('This patient already has an account', 409);
    const token = crypto.randomBytes(32).toString('hex');
    patient.invitationTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    patient.invitationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await patient.save();
    res.status(201).json({ success: true, message: 'Invitation created. Share this token with the patient through a verified channel.', invitationToken: token, expiresAt: patient.invitationExpiresAt });
  } catch (error) { next(error); }
}
