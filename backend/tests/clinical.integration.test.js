import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { env } from '../config/env.js';
import { Department, Doctor, DoctorSchedule, Patient, Session, User } from '../models/index.js';

jest.setTimeout(30000);

const suite = env.mongoUri ? describe : describe.skip;
let adminCookie;
let frontDeskCookie;
let clinicianCookie;
let otherClinicianCookie;
let patientId;
let doctorId;
let appointmentId;
let visitId;
let departmentId;

function testDatabaseUri() {
  const uri = new URL(env.mongoUri);
  uri.pathname = `/hms_phase5_test_${Date.now()}`;
  return uri.toString();
}

function futureDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 3);
  return date.toISOString().slice(0, 10);
}

async function login(email) {
  const response = await request(app).post('/api/auth/login').send({ email, password: 'DevelopmentOnly123!' });
  expect(response.status).toBe(200);
  return response.headers['set-cookie'][0];
}

suite('clinical records', () => {
  beforeAll(async () => {
    await mongoose.connect(testDatabaseUri());
    const date = futureDate();
    const workingDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(`${date}T00:00:00.000Z`).getUTCDay()];
    const users = await User.create([
      { name: 'Clinical Admin', email: 'clinical-admin@example.test', password: 'DevelopmentOnly123!', role: 'admin' },
      { name: 'Clinical Front Desk', email: 'clinical-frontdesk@example.test', password: 'DevelopmentOnly123!', role: 'front_desk' },
      { name: 'Clinical Doctor', email: 'clinical-doctor@example.test', password: 'DevelopmentOnly123!', role: 'clinician' },
      { name: 'Other Doctor', email: 'other-doctor@example.test', password: 'DevelopmentOnly123!', role: 'clinician' },
    ]);
    [adminCookie, frontDeskCookie, clinicianCookie, otherClinicianCookie] = await Promise.all(users.map((user) => login(user.email)));
    const department = await Department.create({ departmentName: 'Clinical Department', departmentCode: 'CLIN' });
    departmentId = department._id;
    const patient = await Patient.create({ name: 'Clinical Patient', patientId: 'CLIN-PAT', dateOfBirth: '1990-01-01', gender: 'female', phone: '+1 555 0300' });
    patientId = patient._id;
    const doctor = await Doctor.create({ doctorId: 'CLIN-DOC', userId: users[2]._id, name: 'Clinical Doctor', specialization: 'Medicine', departmentId, qualification: 'MD', experience: 8, consultationFee: 100, phone: '+1 555 0301', email: 'clinical-doctor-profile@example.test' });
    doctorId = doctor._id;
    await DoctorSchedule.create({ doctorId, workingDay, startTime: '09:00', endTime: '12:00', slotDuration: 30 });
    const appointment = await request(app).post('/api/appointments').set('Cookie', frontDeskCookie).send({ patientId, doctorId, departmentId, appointmentDate: date, startTime: '09:00', endTime: '09:30', reason: 'Synthetic clinical visit' });
    expect(appointment.status).toBe(201);
    appointmentId = appointment.body.appointment._id;
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await Session.deleteMany({});
    await mongoose.disconnect();
  });

  test('clinician creates a linked visit and duplicate is rejected', async () => {
    const created = await request(app).post('/api/visits').set('Cookie', clinicianCookie).send({ patientId, appointmentId, chiefComplaint: 'Synthetic complaint', assessmentNotes: 'Synthetic assessment' });
    expect(created.status).toBe(201);
    expect(created.body.visit.patientId).toBe(String(patientId));
    visitId = created.body.visit._id;
    const duplicate = await request(app).post('/api/visits').set('Cookie', clinicianCookie).send({ patientId, appointmentId });
    expect(duplicate.status).toBe(409);
  });

  test('clinical records can be added and history is linked', async () => {
    const note = await request(app).post('/api/clinical-notes').set('Cookie', clinicianCookie).send({ visitRecordId: visitId, assessment: 'Synthetic note' });
    expect(note.status).toBe(201);
    const prescription = await request(app).post('/api/prescriptions').set('Cookie', clinicianCookie).send({ visitRecordId: visitId, medicines: [{ medicineName: 'Synthetic medicine', dosage: '10 mg', frequency: 'Once daily', duration: '5 days', route: 'oral' }] });
    expect(prescription.status).toBe(201);
    const report = await request(app).post('/api/diagnostic-reports').set('Cookie', clinicianCookie).send({ visitRecordId: visitId, reportName: 'Synthetic report', testCategory: 'Lab' });
    expect(report.status).toBe(201);
    const history = await request(app).get(`/api/history?patientId=${patientId}`).set('Cookie', clinicianCookie);
    expect(history.status).toBe(200);
    expect(history.body.visits).toHaveLength(1);
    expect(history.body.notes).toHaveLength(1);
    expect(history.body.prescriptions).toHaveLength(1);
    expect(history.body.reports).toHaveLength(1);
  });

  test('clinician completes the visit once and locks clinical records', async () => {
    expect((await request(app).patch(`/api/appointments/${appointmentId}/status`).set('Cookie', frontDeskCookie).send({ status: 'confirmed' })).status).toBe(200);
    expect((await request(app).patch(`/api/appointments/${appointmentId}/status`).set('Cookie', frontDeskCookie).send({ status: 'checked_in' })).status).toBe(200);
    expect((await request(app).patch(`/api/appointments/${appointmentId}/status`).set('Cookie', clinicianCookie).send({ status: 'in_progress' })).status).toBe(200);
    const completed = await request(app).post(`/api/appointments/${appointmentId}/complete`).set('Cookie', clinicianCookie);
    expect(completed.status).toBe(200);
    expect(completed.body.appointment.status).toBe('completed');
    const repeated = await request(app).post(`/api/appointments/${appointmentId}/complete`).set('Cookie', clinicianCookie);
    expect(repeated.status).toBe(409);
    const lockedUpdate = await request(app).put(`/api/visits/${visitId}`).set('Cookie', clinicianCookie).send({ assessmentNotes: 'Should not overwrite finalized record' });
    expect(lockedUpdate.status).toBe(409);
  });

  test('front desk and unrelated clinicians cannot access clinical records', async () => {
    expect((await request(app).get(`/api/visits/${visitId}`).set('Cookie', frontDeskCookie)).status).toBe(403);
    expect((await request(app).get(`/api/visits/${visitId}`).set('Cookie', otherClinicianCookie)).status).toBe(403);
    expect((await request(app).get(`/api/history?patientId=${patientId}`).set('Cookie', adminCookie)).status).toBe(200);
  });
});
