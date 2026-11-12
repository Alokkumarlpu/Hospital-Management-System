import crypto from 'node:crypto';
import { Appointment, Doctor, DoctorSchedule } from '../models/index.js';
import { dayNameForDate, rangesOverlap } from './time.js';

export const activeAppointmentStatuses = ['scheduled', 'confirmed', 'checked_in', 'in_progress'];

export async function withDoctorBookingLock(doctorId, work) {
  const lockId = crypto.randomUUID();
  const now = new Date();
  const lockUntil = new Date(now.getTime() + 15_000);
  const doctor = await Doctor.findOneAndUpdate(
    {
      _id: doctorId,
      isActive: true,
      $or: [{ bookingLockUntil: null }, { bookingLockUntil: { $exists: false } }, { bookingLockUntil: { $lt: now } }],
    },
    { $set: { bookingLockId: lockId, bookingLockUntil: lockUntil } },
    { returnDocument: 'after' },
  );
  if (!doctor) {
    const error = new Error('Doctor is busy processing another booking');
    error.statusCode = 409;
    throw error;
  }
  try {
    return await work(doctor);
  } finally {
    await Doctor.updateOne({ _id: doctorId, bookingLockId: lockId }, { $set: { bookingLockId: null, bookingLockUntil: null } });
  }
}

export async function findAppointmentConflict({ doctorId, patientId, appointmentDate, startTime, endTime, excludeId }) {
  const base = {
    appointmentDate,
    status: { $in: activeAppointmentStatuses },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
    ...(excludeId && { _id: { $ne: excludeId } }),
  };
  const doctorConflict = await Appointment.findOne({ ...base, doctorId });
  if (doctorConflict) return { type: 'doctor', appointment: doctorConflict };
  const patientConflict = await Appointment.findOne({ ...base, patientId });
  return patientConflict ? { type: 'patient', appointment: patientConflict } : null;
}

export async function findScheduleForAppointment({ doctorId, appointmentDate, startTime, endTime }) {
  const schedules = await DoctorSchedule.find({ doctorId, workingDay: dayNameForDate(appointmentDate), isAvailable: true, isActive: true });
  return schedules.find((schedule) => {
    if (!rangesOverlap(schedule.startTime, schedule.endTime, startTime, endTime)) return false;
    const withinSchedule = schedule.startTime <= startTime && schedule.endTime >= endTime;
    const duringBreak = schedule.breakStartTime && schedule.breakEndTime && rangesOverlap(schedule.breakStartTime, schedule.breakEndTime, startTime, endTime);
    return withinSchedule && !duringBreak;
  });
}
