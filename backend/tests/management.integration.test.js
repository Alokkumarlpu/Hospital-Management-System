import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { env } from '../config/env.js';
import { Department, Doctor, Patient, Session, User } from '../models/index.js';

jest.setTimeout(30000);

const suite = env.mongoUri ? describe : describe.skip;
let adminCookie;
let frontDeskCookie;
let clinicianCookie;
let departmentId;
let patientId;
let doctorId;

function testDatabaseUri() {
  const uri = new URL(env.mongoUri);
  uri.pathname = `/hms_phase3_test_${Date.now()}`;
  return uri.toString();
}

async function login(email) {
  const response = await request(app).post('/api/auth/login').send({ email, password: 'DevelopmentOnly123!' });
  expect(response.status).toBe(200);
  return response.headers['set-cookie'][0];
}

suite('patient, doctor, and department management API', () => {
  beforeAll(async () => {
    await mongoose.connect(testDatabaseUri());
    await User.create([
      { name: 'Phase 3 Admin', email: 'phase3-admin@example.test', password: 'DevelopmentOnly123!', role: 'admin' },
      { name: 'Phase 3 Front Desk', email: 'phase3-frontdesk@example.test', password: 'DevelopmentOnly123!', role: 'front_desk' },
      { name: 'Phase 3 Clinician', email: 'phase3-clinician@example.test', password: 'DevelopmentOnly123!', role: 'clinician' },
    ]);
    adminCookie = await login('phase3-admin@example.test');
    frontDeskCookie = await login('phase3-frontdesk@example.test');
    clinicianCookie = await login('phase3-clinician@example.test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await Session.deleteMany({});
    await mongoose.disconnect();
  });

  test('admin creates a department and duplicate names are rejected', async () => {
    const response = await request(app).post('/api/departments').set('Cookie', adminCookie).send({
      departmentName: 'Phase 3 Cardiology',
      departmentCode: 'P3CARD',
      description: 'Synthetic test department',
    });
    expect(response.status).toBe(201);
    departmentId = response.body.department._id;

    const duplicate = await request(app).post('/api/departments').set('Cookie', adminCookie).send({
      departmentName: 'Phase 3 Cardiology',
      departmentCode: 'P3CARD2',
    });
    expect(duplicate.status).toBe(409);
  });

  test('front desk can register and search patients, while clinicians receive limited records', async () => {
    const created = await request(app).post('/api/patients').set('Cookie', frontDeskCookie).send({
      name: 'Synthetic Phase Three Patient',
      dateOfBirth: '1990-01-01',
      gender: 'female',
      phone: '+1 555 0100',
      email: 'phase3-patient@example.test',
      address: 'Synthetic address',
      emergencyContact: { name: 'Synthetic Contact', relationship: 'friend', phone: '+1 555 0101' },
    });
    expect(created.status).toBe(201);
    patientId = created.body.patient._id;

    const search = await request(app).get('/api/patients?search=Synthetic%20Phase%20Three');
    expect(search.status).toBe(401);

    const clinicianSearch = await request(app).get('/api/patients?search=Synthetic%20Phase%20Three').set('Cookie', clinicianCookie);
    expect(clinicianSearch.status).toBe(200);
    expect(clinicianSearch.body.data).toHaveLength(1);
    expect(clinicianSearch.body.data[0].emergencyContact).toBeUndefined();

    const unauthorizedCreate = await request(app).post('/api/patients').set('Cookie', clinicianCookie).send({
      name: 'Unauthorized Patient',
      dateOfBirth: '1990-01-01',
      gender: 'male',
      phone: '+1 555 0102',
    });
    expect(unauthorizedCreate.status).toBe(403);
  });

  test('admin creates a doctor, validates active departments, and protects department deactivation', async () => {
    const created = await request(app).post('/api/doctors').set('Cookie', adminCookie).send({
      name: 'Synthetic Doctor',
      email: 'phase3-doctor@example.test',
      phone: '+1 555 0103',
      specialization: 'Cardiology',
      departmentId,
      qualification: 'MD',
      experience: 8,
      consultationFee: 100,
    });
    expect(created.status).toBe(201);
    doctorId = created.body.doctor._id;

    const forbidden = await request(app).post('/api/doctors').set('Cookie', frontDeskCookie).send({
      name: 'Forbidden Doctor',
      email: 'forbidden-doctor@example.test',
      specialization: 'Cardiology',
      departmentId,
      qualification: 'MD',
      experience: 1,
      consultationFee: 50,
    });
    expect(forbidden.status).toBe(403);

    const deactivate = await request(app).patch(`/api/departments/${departmentId}/status`).set('Cookie', adminCookie).send({ isActive: false });
    expect(deactivate.status).toBe(409);
  });

  test('front desk updates and deactivates patients, and admin can deactivate doctors', async () => {
    const updated = await request(app).put(`/api/patients/${patientId}`).set('Cookie', frontDeskCookie).send({ phone: '+1 555 0199' });
    expect(updated.status).toBe(200);
    expect(updated.body.patient.phone).toBe('+1 555 0199');

    const patientStatus = await request(app).patch(`/api/patients/${patientId}/status`).set('Cookie', frontDeskCookie).send({ isActive: false });
    expect(patientStatus.status).toBe(200);
    expect(patientStatus.body.patient.isActive).toBe(false);

    const doctorStatus = await request(app).patch(`/api/doctors/${doctorId}/status`).set('Cookie', adminCookie).send({ isActive: false });
    expect(doctorStatus.status).toBe(200);

    const departmentStatus = await request(app).patch(`/api/departments/${departmentId}/status`).set('Cookie', adminCookie).send({ isActive: false });
    expect(departmentStatus.status).toBe(200);
  });
});
