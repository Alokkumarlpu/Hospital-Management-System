import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { env } from '../config/env.js';
import { Session, User } from '../models/index.js';

jest.setTimeout(30000);
const suite = env.mongoUri ? describe : describe.skip;

function testDatabaseUri() {
  const uri = new URL(env.mongoUri);
  uri.pathname = `/hms_phase7_test_${Date.now()}`;
  return uri.toString();
}

async function login(email) {
  const response = await request(app).post('/api/auth/login').send({ email, password: 'DevelopmentOnly123!' });
  expect(response.status).toBe(200);
  return response.headers['set-cookie'][0];
}

suite('phase 7 reporting and audit API', () => {
  let adminCookie;
  let frontDeskCookie;

  beforeAll(async () => {
    await mongoose.connect(testDatabaseUri());
    await User.create([
      { name: 'Phase 7 Admin', email: 'phase7-admin@example.test', password: 'DevelopmentOnly123!', role: 'admin' },
      { name: 'Phase 7 Front Desk', email: 'phase7-frontdesk@example.test', password: 'DevelopmentOnly123!', role: 'front_desk' },
    ]);
    adminCookie = await login('phase7-admin@example.test');
    frontDeskCookie = await login('phase7-frontdesk@example.test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await Session.deleteMany({});
    await mongoose.disconnect();
  });

  test('restricts audit history to administrators and scopes dashboard access', async () => {
    const denied = await request(app).get('/api/audit-logs').set('Cookie', frontDeskCookie);
    expect(denied.status).toBe(403);

    const audit = await request(app).get('/api/audit-logs?limit=5').set('Cookie', adminCookie);
    expect(audit.status).toBe(200);
    expect(audit.body.pagination).toBeDefined();

    const dashboard = await request(app).get('/api/dashboard/summary').set('Cookie', frontDeskCookie);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.dashboard.role).toBe('front_desk');
    expect(dashboard.body.dashboard.billing).toBeDefined();
  });

  test('validates report date ranges', async () => {
    const response = await request(app).get('/api/reports/appointments/summary?from=2026-02-02&to=2026-02-01').set('Cookie', adminCookie);
    expect(response.status).toBe(400);
  });
});
