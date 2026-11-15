import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import { env } from '../config/env.js';
import { Department, Patient, Session, User } from '../models/index.js';

const suite = env.mongoUri ? describe : describe.skip;
let adminCookie;
let frontDeskCookie;
let clinicianCookie;
let patientId;
let invoiceId;
let total;

function testDatabaseUri() {
  const uri = new URL(env.mongoUri);
  uri.pathname = `/hms_phase6_test_${Date.now()}`;
  return uri.toString();
}

async function login(email) {
  const response = await request(app).post('/api/auth/login').send({ email, password: 'DevelopmentOnly123!' });
  expect(response.status).toBe(200);
  return response.headers['set-cookie'][0];
}

suite('billing and simulated payments', () => {
  beforeAll(async () => {
    await mongoose.connect(testDatabaseUri());
    const users = await User.create([
      { name: 'Billing Admin', email: 'billing-admin@example.test', password: 'DevelopmentOnly123!', role: 'admin' },
      { name: 'Billing Front Desk', email: 'billing-frontdesk@example.test', password: 'DevelopmentOnly123!', role: 'front_desk' },
      { name: 'Billing Clinician', email: 'billing-clinician@example.test', password: 'DevelopmentOnly123!', role: 'clinician' },
    ]);
    [adminCookie, frontDeskCookie, clinicianCookie] = await Promise.all(users.map((user) => login(user.email)));
    await Department.create({ departmentName: 'Billing Department', departmentCode: 'BILL' });
    const patient = await Patient.create({ name: 'Billing Patient', patientId: 'BILL-PAT', dateOfBirth: '1988-01-01', gender: 'male', phone: '+1 555 0400' });
    patientId = patient._id;
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await Session.deleteMany({});
    await mongoose.disconnect();
  });

  test('creates an invoice and calculates totals on the backend', async () => {
    const response = await request(app).post('/api/invoices').set('Cookie', frontDeskCookie).send({
      patientId,
      dueDate: '2099-01-01',
      discount: 10,
      tax: 20,
      lineItems: [
        { description: 'Consultation', category: 'Service', quantity: 2, unitPrice: 100, amount: 1 },
        { description: 'Lab fee', category: 'Diagnostic', quantity: 1, unitPrice: 50, amount: 99999 },
      ],
    });
    expect(response.status).toBe(201);
    expect(response.body.invoice.subtotal).toBe(250);
    expect(response.body.invoice.totalAmount).toBe(260);
    expect(response.body.invoice.outstandingBalance).toBe(260);
    invoiceId = response.body.invoice._id;
    total = response.body.invoice.totalAmount;
  });

  test('records successful, failed, duplicate, and over-limit payments safely', async () => {
    const successful = await request(app).post('/api/payments').set('Cookie', frontDeskCookie).send({ invoiceId, amount: 100, paymentMethod: 'cash', idempotencyKey: 'payment-key-001', simulateStatus: 'successful' });
    expect(successful.status).toBe(201);
    expect(successful.body.invoice.amountPaid).toBe(100);
    const failed = await request(app).post('/api/payments').set('Cookie', frontDeskCookie).send({ invoiceId, amount: 50, paymentMethod: 'upi', idempotencyKey: 'payment-key-002', simulateStatus: 'failed' });
    expect(failed.status).toBe(201);
    expect(failed.body.invoice.amountPaid).toBe(100);
    const duplicate = await request(app).post('/api/payments').set('Cookie', frontDeskCookie).send({ invoiceId, amount: 100, paymentMethod: 'cash', idempotencyKey: 'payment-key-001', simulateStatus: 'successful' });
    expect(duplicate.status).toBe(409);
    const tooMuch = await request(app).post('/api/payments').set('Cookie', frontDeskCookie).send({ invoiceId, amount: total, paymentMethod: 'cash', idempotencyKey: 'payment-key-003', simulateStatus: 'successful' });
    expect(tooMuch.status).toBe(409);
    const completed = await request(app).post('/api/payments').set('Cookie', frontDeskCookie).send({ invoiceId, amount: 160, paymentMethod: 'card', idempotencyKey: 'payment-key-004', simulateStatus: 'successful' });
    expect(completed.status).toBe(201);
    expect(completed.body.invoice.status).toBe('paid');
  });

  test('refunds preserve history and restore the invoice balance', async () => {
    const payments = await request(app).get(`/api/payments/invoice/${invoiceId}`).set('Cookie', frontDeskCookie);
    const payment = payments.body.data.find((item) => item.paymentStatus === 'successful' && item.amount === 160);
    const refund = await request(app).post(`/api/payments/${payment._id}/refund`).set('Cookie', frontDeskCookie).send({ amount: 60, reason: 'Synthetic refund', refundIdempotencyKey: 'refund-key-001' });
    expect(refund.status).toBe(200);
    expect(refund.body.invoice.amountPaid).toBe(200);
    const duplicate = await request(app).post(`/api/payments/${payment._id}/refund`).set('Cookie', frontDeskCookie).send({ amount: 60, reason: 'Synthetic refund', refundIdempotencyKey: 'refund-key-001' });
    expect(duplicate.status).toBe(409);
  });

  test('concurrent successful payments cannot exceed the invoice balance', async () => {
    const created = await request(app).post('/api/invoices').set('Cookie', frontDeskCookie).send({ patientId, dueDate: '2099-01-01', lineItems: [{ description: 'Concurrent service', quantity: 1, unitPrice: 250 }] });
    const concurrentInvoiceId = created.body.invoice._id;
    const results = await Promise.all([
      request(app).post('/api/payments').set('Cookie', frontDeskCookie).send({ invoiceId: concurrentInvoiceId, amount: 200, paymentMethod: 'cash', idempotencyKey: 'payment-key-concurrent-1' }),
      request(app).post('/api/payments').set('Cookie', frontDeskCookie).send({ invoiceId: concurrentInvoiceId, amount: 200, paymentMethod: 'cash', idempotencyKey: 'payment-key-concurrent-2' }),
    ]);
    expect(results.filter((result) => result.status === 201)).toHaveLength(1);
    expect(results.filter((result) => result.status === 409)).toHaveLength(1);
  });

  test('clinicians cannot create payments and managers can view billing dashboard', async () => {
    const denied = await request(app).post('/api/payments').set('Cookie', clinicianCookie).send({ invoiceId, amount: 1, paymentMethod: 'cash', idempotencyKey: 'payment-key-005' });
    expect(denied.status).toBe(403);
    const dashboard = await request(app).get('/api/billing/dashboard').set('Cookie', adminCookie);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.dashboard.totalInvoices).toBe(2);
  });
});
