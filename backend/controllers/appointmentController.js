import { Appointment, Department, Doctor, Patient, DoctorSchedule } from '../models/index.js';
import { writeAuditLog } from '../utils/audit.js';
import { activeAppointmentStatuses, findAppointmentConflict, findScheduleForAppointment, withDoctorBookingLock } from '../utils/appointment.js';
import { createPublicId } from '../utils/identifiers.js';
import { escapeRegex, getPagination, paginatedResponse } from '../utils/pagination.js';
import { combineDateAndTime, dateOnlyToUtc, dayNameForDate, isTimeRangeValid, rangesOverlap, timeToMinutes } from '../utils/time.js';

const appointmentStatuses = ['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'];
const editableFields = ['reason', 'appointmentType'];

function dateFromRequest(value) {
  const date = dateOnlyToUtc(value);
  if (!date) {
    const error = new Error('Appointment date must use a valid YYYY-MM-DD date');
    error.statusCode = 400;
    throw error;
  }
  return date;
}

async function validateBookingReferences({ patientId, doctorId, departmentId }) {
  const [patient, doctor, department] = await Promise.all([
    Patient.findOne({ _id: patientId, isActive: true }),
    Doctor.findOne({ _id: doctorId, isActive: true }),
    Department.findOne({ _id: departmentId, isActive: true }),
  ]);
  if (!patient) throw Object.assign(new Error('An active patient is required'), { statusCode: 400 });
  if (!doctor) throw Object.assign(new Error('An active doctor is required'), { statusCode: 400 });
  if (!department) throw Object.assign(new Error('An active department is required'), { statusCode: 400 });
  if (String(doctor.departmentId) !== String(department._id)) throw Object.assign(new Error('Doctor does not belong to the selected department'), { statusCode: 400 });
  return { patient, doctor, department };
}

function validateTimeRange(startTime, endTime) {
  if (!isTimeRangeValid(startTime, endTime)) throw Object.assign(new Error('Appointment end time must be after start time'), { statusCode: 400 });
}

function ensureNotPast(date, startTime) {
  if (combineDateAndTime(date, startTime) <= new Date()) throw Object.assign(new Error('Appointments cannot be booked in the past'), { statusCode: 400 });
}

async function validateBookingWindow({ doctorId, appointmentDate, startTime, endTime }) {
  const schedule = await findScheduleForAppointment({ doctorId, appointmentDate, startTime, endTime });
  if (!schedule) throw Object.assign(new Error('Appointment is outside the doctor schedule or break time'), { statusCode: 400 });
  return schedule;
}

function appointmentPayload(body) {
  return {
    patientId: body.patientId,
    doctorId: body.doctorId,
    departmentId: body.departmentId,
    appointmentDate: dateFromRequest(body.appointmentDate),
    startTime: body.startTime,
    endTime: body.endTime,
    appointmentType: body.appointmentType || 'consultation',
    reason: body.reason,
  };
}

export async function createAppointment(req, res, next) {
  try {
    const payload = appointmentPayload(req.body);
    validateTimeRange(payload.startTime, payload.endTime);
    ensureNotPast(payload.appointmentDate, payload.startTime);
    await validateBookingReferences(payload);
    await withDoctorBookingLock(payload.doctorId, async () => {
      await validateBookingWindow(payload);
      const conflict = await findAppointmentConflict(payload);
      if (conflict) throw Object.assign(new Error(conflict.type === 'patient' ? 'Patient already has an overlapping appointment' : 'Doctor is not available for this time'), { statusCode: 409 });
      const appointment = await Appointment.create({ ...payload, appointmentId: createPublicId('APT'), slotKey: `${payload.appointmentDate.toISOString().slice(0, 10)}-${payload.startTime}`, createdBy: req.user._id });
      await writeAuditLog({ userId: req.user._id, action: 'create', entityType: 'Appointment', entityId: appointment._id, metadata: { appointmentDate: payload.appointmentDate, startTime: payload.startTime, endTime: payload.endTime } });
      res.status(201).json({ success: true, appointment });
    });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = 'Appointment time is no longer available';
    }
    next(error);
  }
}

export async function listAppointments(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (req.user.role === 'clinician') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) return res.json({ success: true, ...paginatedResponse({ page, limit, total: 0, data: [] }) });
      filter.doctorId = doctor._id;
    }

    for (const key of ['doctorId', 'patientId', 'departmentId', 'status']) if (req.query[key]) filter[key] = req.query[key];
    if (req.query.date) filter.appointmentDate = dateFromRequest(req.query.date);
    if (req.query.search) {
      const search = escapeRegex(req.query.search.trim());
      const patients = await Patient.find({ $or: [{ name: { $regex: search, $options: 'i' } }, { patientId: { $regex: search, $options: 'i' } }] }).select('_id');
      filter.$or = [{ appointmentId: { $regex: search, $options: 'i' } }, { patientId: { $in: patients.map((patient) => patient._id) } }];
    }
    const [appointments, total] = await Promise.all([
      Appointment.find(filter).populate('patientId', 'patientId name phone').populate('doctorId', 'doctorId name specialization').populate('departmentId', 'departmentName departmentCode').sort({ appointmentDate: 1, startTime: 1 }).skip(skip).limit(limit),
      Appointment.countDocuments(filter),
    ]);
    res.json({ success: true, ...paginatedResponse({ page, limit, total, data: appointments }) });
  } catch (error) {
    next(error);
  }
}

export async function appointmentSummary(req, res, next) {
  try {
    const filter = {};
    if (req.user.role === 'clinician') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) return res.json({ success: true, summary: { total: 0, today: 0, upcoming: 0, completed: 0, cancelled: 0 } });
      filter.doctorId = doctor._id;
    }
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrow = new Date(todayStart);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const [total, today, upcoming, completed, cancelled] = await Promise.all([
      Appointment.countDocuments(filter),
      Appointment.countDocuments({ ...filter, appointmentDate: todayStart }),
      Appointment.countDocuments({ ...filter, appointmentDate: { $gte: tomorrow }, status: { $in: activeAppointmentStatuses } }),
      Appointment.countDocuments({ ...filter, status: 'completed' }),
      Appointment.countDocuments({ ...filter, status: 'cancelled' }),
    ]);
    res.json({ success: true, summary: { total, today, upcoming, completed, cancelled } });
  } catch (error) {
    next(error);
  }
}

export async function getAppointment(req, res, next) {
  try {
    const appointment = await Appointment.findById(req.params.id).populate('patientId').populate('doctorId', 'doctorId name specialization userId').populate('departmentId', 'departmentName departmentCode').populate('createdBy', 'name email');
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (req.user.role === 'clinician' && String(appointment.doctorId.userId) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'You may view only assigned appointments' });
    res.json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
}

export async function updateAppointment(req, res, next) {
  try {
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => editableFields.includes(key)));
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after', runValidators: true });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    await writeAuditLog({ userId: req.user._id, action: 'update', entityType: 'Appointment', entityId: appointment._id, metadata: { fields: Object.keys(updates) } });
    res.json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
}

const transitions = {
  scheduled: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
};

function canChangeStatus(role, current, next) {
  if (role === 'admin') return true;
  if (role === 'front_desk') return ['confirmed', 'checked_in', 'cancelled', 'no_show'].includes(next);
  if (role === 'clinician') return ['in_progress', 'completed'].includes(next);
  return false;
}

export async function updateAppointmentStatus(req, res, next) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (req.user.role === 'clinician') {
      const doctor = await Doctor.findOne({ _id: appointment.doctorId, userId: req.user._id });
      if (!doctor) return res.status(403).json({ success: false, message: 'You may update only assigned appointments' });
    }
    const previousStatus = appointment.status;
    const nextStatus = req.body.status;
    if (!appointmentStatuses.includes(nextStatus) || !transitions[appointment.status].includes(nextStatus) || !canChangeStatus(req.user.role, appointment.status, nextStatus)) {
      return res.status(409).json({ success: false, message: `Invalid status transition from ${appointment.status} to ${nextStatus}` });
    }
    appointment.status = nextStatus;
    await appointment.save();
    await writeAuditLog({ userId: req.user._id, action: 'status_change', entityType: 'Appointment', entityId: appointment._id, metadata: { from: previousStatus, to: nextStatus } });
    res.json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
}

export async function cancelAppointment(req, res, next) {
  req.body.status = 'cancelled';
  req.body.cancellationReason = req.body.cancellationReason;
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (!['scheduled', 'confirmed'].includes(appointment.status)) return res.status(409).json({ success: false, message: 'Only scheduled or confirmed appointments can be cancelled' });
    appointment.status = 'cancelled';
    appointment.cancellationReason = req.body.cancellationReason;
    appointment.cancelledBy = req.user._id;
    appointment.cancelledAt = new Date();
    await appointment.save();
    await writeAuditLog({ userId: req.user._id, action: 'cancel', entityType: 'Appointment', entityId: appointment._id, metadata: { cancellationReason: req.body.cancellationReason } });
    res.json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
}

export async function rescheduleAppointment(req, res, next) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (['completed', 'cancelled', 'no_show'].includes(appointment.status)) return res.status(409).json({ success: false, message: 'This appointment cannot be rescheduled' });
    const date = dateFromRequest(req.body.appointmentDate);
    validateTimeRange(req.body.startTime, req.body.endTime);
    ensureNotPast(date, req.body.startTime);
    const doctorId = req.body.doctorId || appointment.doctorId;
    const departmentId = req.body.departmentId || appointment.departmentId;
    await validateBookingReferences({ patientId: appointment.patientId, doctorId, departmentId });
    await withDoctorBookingLock(doctorId, async () => {
      await validateBookingWindow({ doctorId, appointmentDate: date, startTime: req.body.startTime, endTime: req.body.endTime });
      const conflict = await findAppointmentConflict({ doctorId, patientId: appointment.patientId, appointmentDate: date, startTime: req.body.startTime, endTime: req.body.endTime, excludeId: appointment._id });
      if (conflict) throw Object.assign(new Error('The new appointment time is not available'), { statusCode: 409 });
      const original = { appointmentDate: appointment.appointmentDate, startTime: appointment.startTime, endTime: appointment.endTime, doctorId: appointment.doctorId };
      appointment.appointmentDate = date; appointment.startTime = req.body.startTime; appointment.endTime = req.body.endTime; appointment.doctorId = doctorId; appointment.departmentId = departmentId; appointment.slotKey = `${date.toISOString().slice(0, 10)}-${req.body.startTime}`;
      await appointment.save();
      await writeAuditLog({ userId: req.user._id, action: 'reschedule', entityType: 'Appointment', entityId: appointment._id, metadata: { original } });
      res.json({ success: true, appointment });
    });
  } catch (error) {
    next(error);
  }
}

export async function availableSlots(req, res, next) {
  try {
    const date = dateFromRequest(req.query.date);
    const doctor = await Doctor.findOne({ _id: req.query.doctorId, isActive: true });
    if (!doctor) return res.status(404).json({ success: false, message: 'Active doctor not found' });
    if (req.query.departmentId && String(doctor.departmentId) !== req.query.departmentId) return res.status(400).json({ success: false, message: 'Doctor does not belong to department' });
    const schedules = await DoctorSchedule.find({ doctorId: doctor._id, workingDay: dayNameForDate(date), isAvailable: true, isActive: true });
    const appointments = await Appointment.find({ doctorId: doctor._id, appointmentDate: date, status: { $in: activeAppointmentStatuses } });
    const slots = [];
    for (const schedule of schedules) {
      for (let start = timeToMinutes(schedule.startTime); start + schedule.slotDuration <= timeToMinutes(schedule.endTime); start += schedule.slotDuration) {
        const startTime = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
        const end = start + schedule.slotDuration;
        const endTime = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
        if (schedule.breakStartTime && schedule.breakEndTime && rangesOverlap(schedule.breakStartTime, schedule.breakEndTime, startTime, endTime)) continue;
        if (combineDateAndTime(date, startTime) <= new Date()) continue;
        if (appointments.some((appointment) => appointment.startTime < endTime && appointment.endTime > startTime)) continue;
        slots.push({ startTime, endTime });
      }
    }
    res.json({ success: true, date: req.query.date, doctorId: doctor._id, slots });
  } catch (error) {
    next(error);
  }
}
