import { Appointment, Doctor, Invoice, Patient, VisitRecord } from '../models/index.js';
import { writeAuditLog } from '../utils/audit.js';
import { calculateInvoiceTotals, invoiceStatus, roundMoney } from '../utils/billing.js';
import { createPublicId } from '../utils/identifiers.js';
import { escapeRegex, getPagination, paginatedResponse } from '../utils/pagination.js';

function billingError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

async function ensureBillingAccess(req, patientId, appointmentId) {
  if (['admin', 'front_desk'].includes(req.user.role)) return;
  const doctor = await Doctor.findOne({ userId: req.user._id, isActive: true });
  if (!doctor) throw billingError('Clinician profile is unavailable', 403);
  const assigned = await Appointment.exists(appointmentId
    ? { _id: appointmentId, patientId, doctorId: doctor._id }
    : { patientId, doctorId: doctor._id });
  if (!assigned) throw billingError('You may view billing only for assigned patients', 403);
}

export async function refreshOverdueStatuses() {
  await Invoice.updateMany(
    { status: { $in: ['unpaid', 'partially_paid'] }, dueDate: { $lt: new Date() } },
    { $set: { status: 'overdue' } },
  );
}

async function validateReferences({ patientId, appointmentId, visitRecordId }) {
  const patient = await Patient.findOne({ _id: patientId, isActive: true });
  if (!patient) throw billingError('An active patient is required', 400);
  let appointment;
  if (appointmentId) {
    appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw billingError('Appointment not found', 404);
    if (String(appointment.patientId) !== String(patientId)) throw billingError('Appointment does not belong to the patient');
  }
  if (visitRecordId) {
    const visit = await VisitRecord.findById(visitRecordId);
    if (!visit) throw billingError('Visit record not found', 404);
    if (String(visit.patientId) !== String(patientId)) throw billingError('Visit does not belong to the patient');
  }
  return patient;
}

function invoicePayload(body, existing = {}) {
  const totals = calculateInvoiceTotals(body.lineItems || existing.lineItems, body.discount ?? existing.discount ?? 0, body.tax ?? existing.tax ?? 0);
  const dueDate = new Date(body.dueDate || existing.dueDate);
  if (Number.isNaN(dueDate.getTime())) throw billingError('A valid due date is required');
  return { ...totals, dueDate };
}

export async function createInvoice(req, res, next) {
  try {
    await validateReferences(req.body);
    const payload = invoicePayload(req.body);
    const invoice = new Invoice({
      ...payload,
      invoiceNumber: createPublicId('INV'),
      patientId: req.body.patientId,
      appointmentId: req.body.appointmentId || undefined,
      visitRecordId: req.body.visitRecordId || undefined,
      invoiceDate: req.body.invoiceDate || new Date(),
      amountPaid: 0,
      outstandingBalance: payload.totalAmount,
      status: 'unpaid',
      createdBy: req.user._id,
    });
    await invoice.save();
    await writeAuditLog({ userId: req.user._id, action: 'create', entityType: 'Invoice', entityId: invoice._id, metadata: { totalAmount: invoice.totalAmount } });
    res.status(201).json({ success: true, invoice });
  } catch (error) {
    if (error.code === 11000) { error.statusCode = 409; error.message = 'An invoice already exists for this appointment or identifier'; }
    next(error);
  }
}

async function clinicianPatientIds(req) {
  if (req.user.role !== 'clinician') return null;
  const doctor = await Doctor.findOne({ userId: req.user._id, isActive: true });
  if (!doctor) return [];
  const appointments = await Appointment.find({ doctorId: doctor._id }).distinct('patientId');
  return appointments;
}

export async function listInvoices(req, res, next) {
  try {
    await refreshOverdueStatuses();
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (req.query.patientId) {
      filter.patientId = req.query.patientId;
      await ensureBillingAccess(req, req.query.patientId);
    } else {
      const patientIds = await clinicianPatientIds(req);
      if (patientIds) filter.patientId = { $in: patientIds };
    }
    if (req.query.status) filter.status = req.query.status;
    if (req.query.outstanding === 'true') filter.outstandingBalance = { $gt: 0 };
    if (req.query.from || req.query.to) {
      filter.invoiceDate = {};
      if (req.query.from) filter.invoiceDate.$gte = new Date(req.query.from);
      if (req.query.to) { const to = new Date(req.query.to); to.setUTCHours(23, 59, 59, 999); filter.invoiceDate.$lte = to; }
    }
    if (req.query.search) {
      const search = escapeRegex(req.query.search.trim());
      const patients = await Patient.find({ $or: [{ name: { $regex: search, $options: 'i' } }, { patientId: { $regex: search, $options: 'i' } }] }).select('_id');
      filter.$or = [{ invoiceNumber: { $regex: search, $options: 'i' } }, { patientId: { $in: patients.map((patient) => patient._id) } }];
    }
    const [data, total] = await Promise.all([
      Invoice.find(filter).populate('patientId', 'patientId name phone').populate('appointmentId', 'appointmentId appointmentDate').sort({ invoiceDate: -1 }).skip(skip).limit(limit),
      Invoice.countDocuments(filter),
    ]);
    res.json({ success: true, ...paginatedResponse({ page, limit, total, data }) });
  } catch (error) { next(error); }
}

export async function getInvoice(req, res, next) {
  try {
    await refreshOverdueStatuses();
    const invoice = await Invoice.findById(req.params.id).populate('patientId', 'patientId name phone email').populate('appointmentId').populate('visitRecordId');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    await ensureBillingAccess(req, invoice.patientId._id, invoice.appointmentId?._id);
    res.json({ success: true, invoice });
  } catch (error) { next(error); }
}

export async function updateInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (!['draft', 'unpaid', 'overdue'].includes(invoice.status) || invoice.amountPaid > 0) throw billingError('Only unpaid invoices without payments can be edited', 409);
    const payload = invoicePayload(req.body, invoice);
    Object.assign(invoice, payload, { updatedBy: req.user._id, outstandingBalance: payload.totalAmount });
    await invoice.save();
    await writeAuditLog({ userId: req.user._id, action: 'update', entityType: 'Invoice', entityId: invoice._id, metadata: { fields: Object.keys(req.body) } });
    res.json({ success: true, invoice });
  } catch (error) { next(error); }
}

export async function cancelInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (!['draft', 'unpaid', 'overdue'].includes(invoice.status) || invoice.amountPaid > 0) throw billingError('Invoices with payments cannot be cancelled', 409);
    invoice.status = 'cancelled';
    invoice.updatedBy = req.user._id;
    await invoice.save();
    await writeAuditLog({ userId: req.user._id, action: 'cancel', entityType: 'Invoice', entityId: invoice._id, metadata: { reason: req.body.reason } });
    res.json({ success: true, invoice });
  } catch (error) { next(error); }
}

export async function outstandingInvoices(req, res, next) {
  req.query.outstanding = 'true';
  return listInvoices(req, res, next);
}

export async function billingReports(req, res, next) {
  try {
    await refreshOverdueStatuses();
    const match = { status: { $ne: 'cancelled' } };
    if (req.query.from || req.query.to) {
      match.invoiceDate = {};
      if (req.query.from) match.invoiceDate.$gte = new Date(req.query.from);
      if (req.query.to) { const to = new Date(req.query.to); to.setUTCHours(23, 59, 59, 999); match.invoiceDate.$lte = to; }
    }
    const [summary] = await Invoice.aggregate([{ $match: match }, { $group: { _id: null, totalInvoices: { $sum: 1 }, totalBilled: { $sum: '$totalAmount' }, totalCollected: { $sum: '$amountPaid' }, outstanding: { $sum: '$outstandingBalance' } } }]);
    const byStatus = await Invoice.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } }, { $sort: { _id: 1 } }]);
    res.json({ success: true, report: { totalInvoices: summary?.totalInvoices || 0, totalBilled: roundMoney(summary?.totalBilled || 0), totalCollected: roundMoney(summary?.totalCollected || 0), outstanding: roundMoney(summary?.outstanding || 0), byStatus } });
  } catch (error) { next(error); }
}
