import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { env } from '../config/env.js';
import { Appointment, Department, Doctor, DoctorSchedule, Patient, Session, User } from '../models/index.js';

jest.setTimeout(30000);

const suite = env.mongoUri ? describe : describe.skip;
let adminCookie;
let frontDeskCookie;
let clinicianCookie;
let patientId;
let doctorId;
let departmentId;
let appointmentId;
let appointmentDate;
let workingDay;

function testDatabaseUri() {
  const uri = new URL(env.mongoUri);
  uri.pathname = `/hms_phase4_test_${Date.now()}`;
  return uri.toString();
}

function futureDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 2);
  return date.toISOString().slice(0, 10);
}

async function login(email) {
  const response = await request(app).post('/api/auth/login').send({ email, password: 'DevelopmentOnly123!' });
  expect(response.status).toBe(200);
  return response.headers['set-cookie'][0];
}

suite('doctor schedules and appointments', () => {
  beforeAll(async () => {
    await mongoose.connect(testDatabaseUri());
    appointmentDate = futureDate();
    workingDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(`${appointmentDate}T00:00:00.000Z`).getUTCDay()];
    const users = await User.create([
      { name: 'Scheduling Admin', email: 'schedule-admin@example.test', password: 'DevelopmentOnly123!', role: 'admin' },
      { name: 'Scheduling Front Desk', email: 'schedule-frontdesk@example.test', password: 'DevelopmentOnly123!', role: 'front_desk' },
      { name: 'Scheduling Clinician', email: 'schedule-clinician@example.test', password: 'DevelopmentOnly123!', role: 'clinician' },
    ]);
    adminCookie = await login(users[0].email);
    frontDeskCookie = await login(users[1].email);
    clinicianCookie = await login(users[2].email);
    const department = await Department.create({ departmentName: 'Scheduling Department', departmentCode: 'SCHED' });
    departmentId = department._id;
    const patient = await Patient.create({ name: 'Scheduling Patient', patientId: 'SCHED-PAT', dateOfBirth: '1990-01-01', gender: 'male', phone: '+1 555 0200' });
    patientId = patient._id;
    const doctor = await Doctor.create({ doctorId: 'SCHED-DOC', userId: users[2]._id, name: 'Scheduling Doctor', specialization: 'General Medicine', departmentId, qualification: 'MD', experience: 5, consultationFee: 80, phone: '+1 555 0201', email: 'schedule-doctor@example.test' });
    doctorId = doctor._id;
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await Session.deleteMany({});
    await mongoose.disconnect();
  });

  test('admin creates valid schedules and invalid/overlapping schedules are rejected', async () => {
    const created = await request(app).post('/api/doctor-schedules').set('Cookie', adminCookie).send({ doctorId, workingDay, startTime: '09:00', endTime: '12:00', slotDuration: 30, breakStartTime: '10:00', breakEndTime: '10:30' });
    expect(created.status).toBe(201);
    const invalid = await request(app).post('/api/doctor-schedules').set('Cookie', adminCookie).send({ doctorId, workingDay, startTime: '13:00', endTime: '12:00', slotDuration: 30 });
    expect(invalid.status).toBe(400);
    const overlap = await request(app).post('/api/doctor-schedules').set('Cookie', adminCookie).send({ doctorId, workingDay, startTime: '11:00', endTime: '13:00', slotDuration: 30 });
    expect(overlap.status).toBe(409);
    const clinicianSchedules = await request(app).get(`/api/doctor-schedules?doctorId=${doctorId}`).set('Cookie', clinicianCookie);
    expect(clinicianSchedules.status).toBe(200);
    expect(clinicianSchedules.body.schedules).toHaveLength(1);
  });

  test('front desk books valid appointments and backend rejects invalid windows', async () => {
    const created = await request(app).post('/api/appointments').set('Cookie', frontDeskCookie).send({ patientId, doctorId, departmentId, appointmentDate, startTime: '09:00', endTime: '09:30', appointmentType: 'consultation', reason: 'Synthetic appointment' });
    expect(created.status).toBe(201);
    appointmentId = created.body.appointment._id;

    const overlap = await request(app).post('/api/appointments').set('Cookie', frontDeskCookie).send({ patientId, doctorId, departmentId, appointmentDate, startTime: '09:15', endTime: '09:45', reason: 'Overlapping appointment' });
    expect(overlap.status).toBe(409);
    const breakBooking = await request(app).post('/api/appointments').set('Cookie', frontDeskCookie).send({ patientId, doctorId, departmentId, appointmentDate, startTime: '10:00', endTime: '10:30', reason: 'Break appointment' });
    expect(breakBooking.status).toBe(400);
    const outsideSchedule = await request(app).post('/api/appointments').set('Cookie', frontDeskCookie).send({ patientId, doctorId, departmentId, appointmentDate, startTime: '13:00', endTime: '13:30', reason: 'Outside appointment' });
    expect(outsideSchedule.status).toBe(400);
    const availability = await request(app).get(`/api/appointments/available-slots?doctorId=${doctorId}&departmentId=${departmentId}&date=${appointmentDate}`).set('Cookie', frontDeskCookie);
    expect(availability.status).toBe(200);
    expect(availability.body.slots.some((slot) => slot.startTime === '09:00')).toBe(false);
    expect(availability.body.slots.some((slot) => slot.startTime === '10:00')).toBe(false);
  });

  test('status transitions, cancellation, and slot reuse work', async () => {
    const confirmed = await request(app).patch(`/api/appointments/${appointmentId}/status`).set('Cookie', frontDeskCookie).send({ status: 'confirmed' });
    expect(confirmed.status).toBe(200);
    const checkedIn = await request(app).patch(`/api/appointments/${appointmentId}/status`).set('Cookie', frontDeskCookie).send({ status: 'checked_in' });
    expect(checkedIn.status).toBe(200);
    const started = await request(app).patch(`/api/appointments/${appointmentId}/status`).set('Cookie', clinicianCookie).send({ status: 'in_progress' });
    expect(started.status).toBe(200);
    const completed = await request(app).patch(`/api/appointments/${appointmentId}/status`).set('Cookie', clinicianCookie).send({ status: 'completed' });
    expect(completed.status).toBe(200);
    const invalidReschedule = await request(app).patch(`/api/appointments/${appointmentId}/reschedule`).set('Cookie', frontDeskCookie).send({ appointmentDate, startTime: '11:00', endTime: '11:30' });
    expect(invalidReschedule.status).toBe(409);

    const cancellable = await request(app).post('/api/appointments').set('Cookie', frontDeskCookie).send({ patientId, doctorId, departmentId, appointmentDate, startTime: '11:00', endTime: '11:30', reason: 'Cancellable appointment' });
    expect(cancellable.status).toBe(201);
    const cancelled = await request(app).patch(`/api/appointments/${cancellable.body.appointment._id}/cancel`).set('Cookie', frontDeskCookie).send({ cancellationReason: 'Synthetic cancellation' });
    expect(cancelled.status).toBe(200);
    const reused = await request(app).post('/api/appointments').set('Cookie', frontDeskCookie).send({ patientId, doctorId, departmentId, appointmentDate, startTime: '11:00', endTime: '11:30', reason: 'Reused slot' });
    expect(reused.status).toBe(201);
  });

  test('concurrent bookings allow only one conflicting appointment', async () => {
    const payload = { patientId, doctorId, departmentId, appointmentDate, startTime: '11:30', endTime: '12:00', reason: 'Concurrent booking' };
    const results = await Promise.all([request(app).post('/api/appointments').set('Cookie', frontDeskCookie).send(payload), request(app).post('/api/appointments').set('Cookie', frontDeskCookie).send(payload)]);
    expect(results.filter((result) => result.status === 201)).toHaveLength(1);
    expect(results.filter((result) => result.status === 409)).toHaveLength(1);
    expect(await Appointment.countDocuments({ doctorId, appointmentDate, startTime: '11:30', status: { $ne: 'cancelled' } })).toBe(1);
  });
});
