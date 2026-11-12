import { Doctor, DoctorSchedule } from '../models/index.js';
import { writeAuditLog } from '../utils/audit.js';
import { withDoctorBookingLock } from '../utils/appointment.js';
import { isTimeRangeValid, rangesOverlap } from '../utils/time.js';

const editableFields = ['workingDay', 'startTime', 'endTime', 'slotDuration', 'breakStartTime', 'breakEndTime', 'isAvailable', 'isActive'];

function scheduleUpdates(body) {
  return Object.fromEntries(Object.entries(body).filter(([key]) => editableFields.includes(key)));
}

function validateScheduleTimes(schedule) {
  if (!isTimeRangeValid(schedule.startTime, schedule.endTime)) {
    const error = new Error('Schedule end time must be after start time');
    error.statusCode = 400;
    throw error;
  }
  if ((schedule.breakStartTime || schedule.breakEndTime) && (!schedule.breakStartTime || !schedule.breakEndTime || !isTimeRangeValid(schedule.breakStartTime, schedule.breakEndTime) || schedule.breakStartTime < schedule.startTime || schedule.breakEndTime > schedule.endTime)) {
    const error = new Error('Break must be a valid range inside working hours');
    error.statusCode = 400;
    throw error;
  }
}

async function ensureNoOverlap({ doctorId, workingDay, startTime, endTime, excludeId }) {
  const schedules = await DoctorSchedule.find({ doctorId, workingDay, isActive: true, ...(excludeId && { _id: { $ne: excludeId } }) });
  if (schedules.some((schedule) => rangesOverlap(schedule.startTime, schedule.endTime, startTime, endTime))) {
    const error = new Error('Doctor schedules cannot overlap');
    error.statusCode = 409;
    throw error;
  }
}

async function ensureActiveDoctor(doctorId) {
  const doctor = await Doctor.findOne({ _id: doctorId, isActive: true });
  if (!doctor) {
    const error = new Error('An active doctor is required');
    error.statusCode = 400;
    throw error;
  }
  return doctor;
}

export async function createSchedule(req, res, next) {
  try {
    const { doctorId, workingDay, startTime, endTime } = req.body;
    await ensureActiveDoctor(doctorId);
    validateScheduleTimes(req.body);
    await withDoctorBookingLock(doctorId, async () => {
      await ensureNoOverlap({ doctorId, workingDay, startTime, endTime });
      const schedule = await DoctorSchedule.create(req.body);
      await writeAuditLog({ userId: req.user._id, action: 'create', entityType: 'DoctorSchedule', entityId: schedule._id });
      res.status(201).json({ success: true, schedule });
    });
  } catch (error) {
    next(error);
  }
}

export async function listSchedules(req, res, next) {
  try {
    let doctorId = req.query.doctorId;
    if (req.user.role === 'clinician') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) {
        res.json({ success: true, schedules: [] });
        return;
      }
      if (doctorId && String(doctor._id) !== doctorId) {
        res.status(403).json({ success: false, message: 'Clinicians may view only their own schedules' });
        return;
      }
      doctorId = doctor._id;
    }
    const filter = doctorId ? { doctorId } : {};
    const schedules = await DoctorSchedule.find(filter).populate('doctorId', 'doctorId name specialization').sort({ doctorId: 1, workingDay: 1, startTime: 1 });
    res.json({ success: true, schedules });
  } catch (error) {
    next(error);
  }
}

export async function getSchedule(req, res, next) {
  try {
    const schedule = await DoctorSchedule.findById(req.params.id).populate('doctorId', 'doctorId name userId');
    if (!schedule) {
      res.status(404).json({ success: false, message: 'Schedule not found' });
      return;
    }
    if (req.user.role === 'clinician' && String(schedule.doctorId.userId) !== String(req.user._id)) {
      res.status(403).json({ success: false, message: 'Clinicians may view only their own schedules' });
      return;
    }
    res.json({ success: true, schedule });
  } catch (error) {
    next(error);
  }
}

export async function updateSchedule(req, res, next) {
  try {
    const current = await DoctorSchedule.findById(req.params.id);
    if (!current) {
      res.status(404).json({ success: false, message: 'Schedule not found' });
      return;
    }
    const updates = scheduleUpdates(req.body);
    const nextSchedule = { ...current.toObject(), ...updates };
    validateScheduleTimes(nextSchedule);
    await ensureActiveDoctor(current.doctorId);
    await withDoctorBookingLock(current.doctorId, async () => {
      await ensureNoOverlap({ doctorId: current.doctorId, workingDay: nextSchedule.workingDay, startTime: nextSchedule.startTime, endTime: nextSchedule.endTime, excludeId: current._id });
      const schedule = await DoctorSchedule.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after', runValidators: true });
      await writeAuditLog({ userId: req.user._id, action: 'update', entityType: 'DoctorSchedule', entityId: schedule._id, metadata: { fields: Object.keys(updates) } });
      res.json({ success: true, schedule });
    });
  } catch (error) {
    next(error);
  }
}

export async function deactivateSchedule(req, res, next) {
  try {
    const schedule = await DoctorSchedule.findByIdAndUpdate(req.params.id, { isAvailable: false, isActive: false }, { returnDocument: 'after' });
    if (!schedule) {
      res.status(404).json({ success: false, message: 'Schedule not found' });
      return;
    }
    await writeAuditLog({ userId: req.user._id, action: 'deactivate', entityType: 'DoctorSchedule', entityId: schedule._id });
    res.json({ success: true, schedule });
  } catch (error) {
    next(error);
  }
}
