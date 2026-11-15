import { Appointment, ClinicalNote, DiagnosticReport, Doctor, Patient, Prescription, VisitRecord } from '../models/index.js';
import { writeAuditLog } from '../utils/audit.js';
import { createPublicId } from '../utils/identifiers.js';
import { getPagination, paginatedResponse } from '../utils/pagination.js';

const visitFields = ['chiefComplaint', 'symptoms', 'clinicalObservations', 'vitalSigns', 'assessmentNotes', 'treatmentPlan', 'followUpDate', 'additionalNotes'];
const noteFields = ['chiefComplaint', 'historyOfPresentIllness', 'examinationFindings', 'clinicalObservations', 'assessment', 'treatmentPlan', 'followUpInstructions'];
const reportFields = ['reportName', 'testCategory', 'laboratory', 'reportDate', 'description', 'reportNotes', 'fileMetadata'];

function clinicalError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

function pick(source, fields) {
  return Object.fromEntries(Object.entries(source).filter(([key]) => fields.includes(key)));
}

async function clinicianDoctor(req) {
  return Doctor.findOne({ userId: req.user._id, isActive: true });
}

async function ensurePatientAccess(req, patientId, doctorId) {
  if (req.user.role === 'admin') return null;
  const doctor = await clinicianDoctor(req);
  if (!doctor) throw clinicalError('Clinician profile is unavailable', 403);
  if (doctorId && String(doctorId) !== String(doctor._id)) throw clinicalError('You may access only your assigned clinical records', 403);
  const assigned = await Appointment.exists({ patientId, doctorId: doctor._id });
  if (!assigned) throw clinicalError('You may access only patients assigned to you', 403);
  return doctor;
}

async function getVisitForClinician(req, visitId) {
  const visit = await VisitRecord.findById(visitId);
  if (!visit) throw clinicalError('Visit record not found', 404);
  await ensurePatientAccess(req, visit.patientId, visit.doctorId);
  return visit;
}

async function getAppointmentForVisit(appointmentId, patientId) {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw clinicalError('Appointment not found', 404);
  if (String(appointment.patientId) !== String(patientId)) throw clinicalError('Appointment does not belong to the patient', 400);
  if (['cancelled', 'no_show'].includes(appointment.status)) throw clinicalError('A cancelled or missed appointment cannot have a visit record', 400);
  return appointment;
}

function dateFilter(query, field) {
  const filter = {};
  if (query.from || query.to) {
    filter[field] = {};
    if (query.from) filter[field].$gte = new Date(query.from);
    if (query.to) {
      const end = new Date(query.to);
      end.setUTCHours(23, 59, 59, 999);
      filter[field].$lte = end;
    }
  }
  return filter;
}

export async function createVisit(req, res, next) {
  try {
    const appointment = await getAppointmentForVisit(req.body.appointmentId, req.body.patientId);
    await ensurePatientAccess(req, appointment.patientId, appointment.doctorId);
    const patient = await Patient.findById(appointment.patientId);
    if (!patient) throw clinicalError('Patient not found', 404);
    const visit = await VisitRecord.create({
      ...pick(req.body, visitFields),
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentId: appointment._id,
      visitId: createPublicId('VIS'),
      createdBy: req.user._id,
      visitDate: req.body.visitDate || new Date(),
    });
    await writeAuditLog({ userId: req.user._id, action: 'create', entityType: 'VisitRecord', entityId: visit._id });
    res.status(201).json({ success: true, visit });
  } catch (error) {
    if (error.code === 11000) error.statusCode = 409;
    next(error);
  }
}

export async function listVisits(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { ...dateFilter(req.query, 'visitDate') };
    if (req.query.patientId) filter.patientId = req.query.patientId;
    if (req.query.appointmentId) filter.appointmentId = req.query.appointmentId;
    if (req.user.role === 'clinician') {
      const doctor = await clinicianDoctor(req);
      if (!doctor) return res.json({ success: true, ...paginatedResponse({ page, limit, total: 0, data: [] }) });
      filter.doctorId = doctor._id;
    }
    if (filter.patientId) await ensurePatientAccess(req, filter.patientId);
    const [data, total] = await Promise.all([
      VisitRecord.find(filter).populate('patientId', 'patientId name').populate('doctorId', 'doctorId name specialization').populate('appointmentId', 'appointmentId appointmentDate startTime endTime').sort({ visitDate: -1 }).skip(skip).limit(limit),
      VisitRecord.countDocuments(filter),
    ]);
    res.json({ success: true, ...paginatedResponse({ page, limit, total, data }) });
  } catch (error) {
    next(error);
  }
}

export async function getVisit(req, res, next) {
  try {
    const visit = await getVisitForClinician(req, req.params.id);
    await visit.populate([{ path: 'patientId', select: 'patientId name dateOfBirth gender' }, { path: 'doctorId', select: 'doctorId name specialization' }, { path: 'appointmentId', select: 'appointmentId appointmentDate startTime endTime status' }]);
    await writeAuditLog({ userId: req.user._id, action: 'access', entityType: 'VisitRecord', entityId: visit._id, req });
    res.json({ success: true, visit });
  } catch (error) {
    next(error);
  }
}

export async function updateVisit(req, res, next) {
  try {
    const visit = await getVisitForClinician(req, req.params.id);
    if (visit.lockedAt) throw clinicalError('This visit record is locked and cannot be modified', 409);
    Object.assign(visit, pick(req.body, visitFields), { updatedBy: req.user._id });
    await visit.save();
    await writeAuditLog({ userId: req.user._id, action: 'update', entityType: 'VisitRecord', entityId: visit._id, metadata: { fields: Object.keys(pick(req.body, visitFields)) } });
    res.json({ success: true, visit });
  } catch (error) {
    next(error);
  }
}

export async function completeVisit(req, res, next) {
    try {
      const appointment = await Appointment.findById(req.params.appointmentId);
      if (!appointment) throw clinicalError('Appointment not found', 404);
      if (req.user.role !== 'clinician') throw clinicalError('Only the assigned clinician can complete this visit', 403);
      const doctor = await clinicianDoctor(req);
      if (!doctor || String(appointment.doctorId) !== String(doctor._id)) throw clinicalError('You may complete only your assigned appointments', 403);
      if (appointment.status === 'completed') throw clinicalError('This appointment is already completed', 409);
      if (appointment.status !== 'in_progress') throw clinicalError('Start the consultation before completing the visit', 409);

      const visit = await VisitRecord.findOne({ appointmentId: appointment._id, doctorId: doctor._id });
      if (!visit) throw clinicalError('Save the clinical consultation before completing the visit', 400);
      if (visit.lockedAt) throw clinicalError('This visit is already finalized', 409);

      const lockedAt = new Date();
      visit.lockedAt = lockedAt;
      visit.updatedBy = req.user._id;
      await visit.save();
      await Promise.all([
        ClinicalNote.updateMany({ visitRecordId: visit._id, lockedAt: null }, { $set: { lockedAt } }),
        Prescription.updateMany({ visitRecordId: visit._id, lockedAt: null }, { $set: { lockedAt } }),
        DiagnosticReport.updateMany({ visitRecordId: visit._id }, { $set: { lockedAt } }),
      ]);

      const completedAppointment = await Appointment.findOneAndUpdate(
        { _id: appointment._id, status: 'in_progress' },
        { $set: { status: 'completed' } },
        { returnDocument: 'after' },
      );
      if (!completedAppointment) throw clinicalError('The appointment changed before completion. Refresh and try again.', 409);
      await writeAuditLog({ userId: req.user._id, action: 'complete', entityType: 'VisitRecord', entityId: visit._id, metadata: { appointmentId: appointment._id } });
      res.json({ success: true, appointment: completedAppointment, visit });
    } catch (error) {
      next(error);
    }
  }

async function listNotes(req, res, next) {
  try {
    const filter = {};
    if (req.params.visitId) {
      const visit = await getVisitForClinician(req, req.params.visitId);
      filter.visitRecordId = visit._id;
    }
    if (req.params.patientId) {
      await ensurePatientAccess(req, req.params.patientId);
      filter.patientId = req.params.patientId;
    }
    if (req.user.role === 'clinician') filter.doctorId = (await clinicianDoctor(req))._id;
    const notes = await ClinicalNote.find(filter).sort({ createdAt: -1 }).populate('createdBy', 'name').populate('updatedBy', 'name');
    if (notes.length) await writeAuditLog({ userId: req.user._id, action: 'access', entityType: 'ClinicalNote', entityId: notes[0]._id, metadata: { count: notes.length }, req });
    res.json({ success: true, notes });
  } catch (error) {
    next(error);
  }
}

export async function createNote(req, res, next) {
  try {
    const visit = await getVisitForClinician(req, req.body.visitRecordId);
    const note = await ClinicalNote.create({ ...pick(req.body, noteFields), visitRecordId: visit._id, patientId: visit.patientId, doctorId: visit.doctorId, createdBy: req.user._id });
    await writeAuditLog({ userId: req.user._id, action: 'create', entityType: 'ClinicalNote', entityId: note._id });
    res.status(201).json({ success: true, note });
  } catch (error) {
    next(error);
  }
}

export { listNotes };

export async function updateNote(req, res, next) {
  try {
    const note = await ClinicalNote.findById(req.params.id);
    if (!note) throw clinicalError('Clinical note not found', 404);
    await ensurePatientAccess(req, note.patientId, note.doctorId);
    if (note.lockedAt) throw clinicalError('This clinical note is locked and cannot be modified', 409);
    Object.assign(note, pick(req.body, noteFields), { updatedBy: req.user._id });
    await note.save();
    await writeAuditLog({ userId: req.user._id, action: 'update', entityType: 'ClinicalNote', entityId: note._id, metadata: { fields: Object.keys(pick(req.body, noteFields)) } });
    res.json({ success: true, note });
  } catch (error) {
    next(error);
  }
}

async function getVisitForRecord(req, visitId) {
  return getVisitForClinician(req, visitId);
}

export async function createPrescription(req, res, next) {
  try {
    const visit = await getVisitForRecord(req, req.body.visitRecordId);
    const prescription = await Prescription.create({ prescriptionId: createPublicId('RX'), patientId: visit.patientId, doctorId: visit.doctorId, visitRecordId: visit._id, medicines: req.body.medicines, createdBy: req.user._id });
    await writeAuditLog({ userId: req.user._id, action: 'create', entityType: 'Prescription', entityId: prescription._id });
    res.status(201).json({ success: true, prescription });
  } catch (error) {
    next(error);
  }
}

export async function listPrescriptions(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (req.query.patientId) { filter.patientId = req.query.patientId; await ensurePatientAccess(req, req.query.patientId); }
    if (req.query.visitRecordId) { filter.visitRecordId = req.query.visitRecordId; await getVisitForRecord(req, req.query.visitRecordId); }
    if (req.user.role === 'clinician') filter.doctorId = (await clinicianDoctor(req))._id;
    const [data, total] = await Promise.all([Prescription.find(filter).sort({ prescribedDate: -1 }).skip(skip).limit(limit).populate('patientId', 'patientId name').populate('doctorId', 'doctorId name').populate('visitRecordId', 'visitId visitDate'), Prescription.countDocuments(filter)]);
    res.json({ success: true, ...paginatedResponse({ page, limit, total, data }) });
  } catch (error) {
    next(error);
  }
}

export async function getPrescription(req, res, next) {
  try {
    const prescription = await Prescription.findById(req.params.id).populate('patientId', 'patientId name').populate('doctorId', 'doctorId name specialization').populate('visitRecordId');
    if (!prescription) throw clinicalError('Prescription not found', 404);
    await ensurePatientAccess(req, prescription.patientId._id || prescription.patientId, prescription.doctorId._id || prescription.doctorId);
    res.json({ success: true, prescription });
  } catch (error) {
    next(error);
  }
}

export async function updatePrescription(req, res, next) {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) throw clinicalError('Prescription not found', 404);
    await ensurePatientAccess(req, prescription.patientId, prescription.doctorId);
    if (prescription.lockedAt) throw clinicalError('This prescription is locked and cannot be modified', 409);
    if (req.body.medicines) prescription.medicines = req.body.medicines;
    if (req.body.status) prescription.status = req.body.status;
    prescription.updatedBy = req.user._id;
    await prescription.save();
    await writeAuditLog({ userId: req.user._id, action: 'update', entityType: 'Prescription', entityId: prescription._id, metadata: { fields: Object.keys(req.body).filter((key) => ['medicines', 'status'].includes(key)) } });
    res.json({ success: true, prescription });
  } catch (error) {
    next(error);
  }
}

export async function createReport(req, res, next) {
  try {
    const visit = await getVisitForRecord(req, req.body.visitRecordId);
    if (req.body.status === 'completed' && !req.body.description && !req.body.reportNotes && !(req.body.fileMetadata && Object.keys(req.body.fileMetadata).length)) {
      throw clinicalError('A completed diagnostic report requires report notes, a description, or an attachment');
    }
    const report = await DiagnosticReport.create({ ...pick(req.body, reportFields), reportId: createPublicId('RPT'), patientId: visit.patientId, doctorId: visit.doctorId, visitRecordId: visit._id, uploadedBy: req.user._id });
    await writeAuditLog({ userId: req.user._id, action: 'create', entityType: 'DiagnosticReport', entityId: report._id });
    res.status(201).json({ success: true, report });
  } catch (error) {
    next(error);
  }
}

export async function listReports(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (req.query.patientId) { filter.patientId = req.query.patientId; await ensurePatientAccess(req, req.query.patientId); }
    if (req.query.visitRecordId) { filter.visitRecordId = req.query.visitRecordId; await getVisitForRecord(req, req.query.visitRecordId); }
    if (req.user.role === 'clinician') filter.doctorId = (await clinicianDoctor(req))._id;
    const [data, total] = await Promise.all([DiagnosticReport.find(filter).sort({ reportDate: -1 }).skip(skip).limit(limit).populate('patientId', 'patientId name').populate('doctorId', 'doctorId name').populate('visitRecordId', 'visitId visitDate'), DiagnosticReport.countDocuments(filter)]);
    res.json({ success: true, ...paginatedResponse({ page, limit, total, data }) });
  } catch (error) {
    next(error);
  }
}

export async function getReport(req, res, next) {
  try {
    const report = await DiagnosticReport.findById(req.params.id).populate('patientId', 'patientId name').populate('doctorId', 'doctorId name specialization').populate('visitRecordId');
    if (!report) throw clinicalError('Diagnostic report not found', 404);
    await ensurePatientAccess(req, report.patientId._id || report.patientId, report.doctorId._id || report.doctorId);
    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
}

export async function updateReportStatus(req, res, next) {
  try {
    const report = await DiagnosticReport.findById(req.params.id);
    if (!report) throw clinicalError('Diagnostic report not found', 404);
    await ensurePatientAccess(req, report.patientId, report.doctorId);
    if (report.lockedAt) throw clinicalError('This diagnostic report is locked and cannot be modified', 409);
    if (req.body.status === 'completed' && !report.description && !report.reportNotes && !(report.fileMetadata && Object.keys(report.fileMetadata).length)) {
      throw clinicalError('A completed diagnostic report requires report notes, a description, or an attachment');
    }
    const previous = report.status;
    report.status = req.body.status;
    await report.save();
    await writeAuditLog({ userId: req.user._id, action: 'status_change', entityType: 'DiagnosticReport', entityId: report._id, metadata: { from: previous, to: report.status } });
    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
}

export async function patientHistory(req, res, next) {
  try {
    const { patientId, type = 'all' } = req.query;
    const patient = await Patient.findById(patientId).select('patientId name dateOfBirth gender bloodGroup phone');
    if (!patient) throw clinicalError('Patient not found', 404);
    const accessDoctor = await ensurePatientAccess(req, patientId);
    const clinicianScope = accessDoctor ? { doctorId: accessDoctor._id } : {};
    const dateFilters = {
      visits: dateFilter(req.query, 'visitDate'),
      notes: dateFilter(req.query, 'createdAt'),
      prescriptions: dateFilter(req.query, 'prescribedDate'),
      reports: dateFilter(req.query, 'reportDate'),
      appointments: dateFilter(req.query, 'appointmentDate'),
    };
    const include = (name) => type === 'all' || type === name;
    const [visits, notes, prescriptions, reports, appointments] = await Promise.all([
      include('visits') ? VisitRecord.find({ patientId, ...clinicianScope, ...dateFilters.visits }).sort({ visitDate: -1 }).populate('doctorId', 'doctorId name specialization') : [],
      include('notes') ? ClinicalNote.find({ patientId, ...clinicianScope, ...dateFilters.notes }).sort({ createdAt: -1 }).populate('doctorId', 'doctorId name') : [],
      include('prescriptions') ? Prescription.find({ patientId, ...clinicianScope, ...dateFilters.prescriptions }).sort({ prescribedDate: -1 }).populate('doctorId', 'doctorId name') : [],
      include('reports') ? DiagnosticReport.find({ patientId, ...clinicianScope, ...dateFilters.reports }).sort({ reportDate: -1 }).populate('doctorId', 'doctorId name') : [],
      include('appointments') ? Appointment.find({ patientId, ...clinicianScope, ...dateFilters.appointments }).sort({ appointmentDate: -1 }) : [],
    ]);
    await writeAuditLog({ userId: req.user._id, action: 'access', entityType: 'PatientHistory', entityId: patient._id, req });
    res.json({ success: true, patient, visits, notes, prescriptions, reports, appointments });
  } catch (error) {
    next(error);
  }
}
