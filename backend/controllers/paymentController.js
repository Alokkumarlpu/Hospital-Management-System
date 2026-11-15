import { Appointment, Doctor, Invoice, Payment } from '../models/index.js';
import { writeAuditLog } from '../utils/audit.js';
import { createPublicId } from '../utils/identifiers.js';
import { getPagination, paginatedResponse } from '../utils/pagination.js';
import { invoiceStatus, roundMoney, withOptionalTransaction } from '../utils/billing.js';

function paymentError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

async function ensurePaymentAccess(req, patientId, appointmentId) {
  if (['admin', 'front_desk'].includes(req.user.role)) return;
  const doctor = await Doctor.findOne({ userId: req.user._id, isActive: true });
  if (!doctor || !(await Appointment.exists(appointmentId ? { _id: appointmentId, patientId, doctorId: doctor._id } : { patientId, doctorId: doctor._id }))) {
    throw paymentError('You may view billing only for assigned patients', 403);
  }
}

function idempotencyKey(req, field = 'idempotencyKey') {
  return req.get('Idempotency-Key') || req.body[field];
}

export async function createPayment(req, res, next) {
  try {
    const amount = roundMoney(req.body.amount);
    const key = idempotencyKey(req);
    if (!Number.isFinite(amount) || amount <= 0) throw paymentError('Payment amount must be greater than zero');
    if (!key || key.length < 8 || key.length > 200) throw paymentError('An idempotency key of 8 to 200 characters is required');
    if (await Payment.exists({ idempotencyKey: key })) throw paymentError('This payment request has already been processed', 409);
    const invoice = await Invoice.findById(req.body.invoiceId);
    if (!invoice) throw paymentError('Invoice not found', 404);
    if (['cancelled', 'paid'].includes(invoice.status)) throw paymentError('This invoice cannot receive payments', 409);
    const simulation = req.body.simulateStatus || 'successful';
    if (!['successful', 'failed'].includes(simulation)) throw paymentError('Simulation status must be successful or failed');
    const paymentData = { paymentId: createPublicId('PAY'), invoiceId: invoice._id, patientId: invoice.patientId, amount, paymentMethod: req.body.paymentMethod, transactionReference: createPublicId('TXN'), idempotencyKey: key, paymentStatus: simulation, processedBy: req.user._id, notes: req.body.notes };
    if (simulation === 'failed') {
      const payment = await Payment.create(paymentData);
      await writeAuditLog({ userId: req.user._id, action: 'payment_failed', entityType: 'Payment', entityId: payment._id, metadata: { invoiceId: invoice._id, amount } });
      return res.status(201).json({ success: true, payment, invoice });
    }
    const result = await withOptionalTransaction(async (session) => {
      const filter = { _id: invoice._id, status: { $in: ['unpaid', 'partially_paid', 'overdue'] }, $expr: { $lte: [{ $add: ['$amountPaid', amount] }, '$totalAmount'] } };
      let current;
      if (session) {
        current = await Invoice.findOne(filter).session(session);
      } else {
        current = await Invoice.findOneAndUpdate(filter, { $inc: { amountPaid: amount } }, { returnDocument: 'after' });
      }
      if (!current) throw paymentError('Payment exceeds the outstanding invoice balance or invoice is unavailable', 409);
      if (session) current.amountPaid = roundMoney(current.amountPaid + amount);
      current.outstandingBalance = roundMoney(current.totalAmount - current.amountPaid);
      current.status = invoiceStatus(current);
      current.updatedBy = req.user._id;
      if (session) {
        await current.save({ session });
      } else {
        await Invoice.findByIdAndUpdate(current._id, { $set: { outstandingBalance: current.outstandingBalance, status: current.status, updatedBy: req.user._id } });
      }
      const payment = new Payment(paymentData);
      try {
        await payment.save(session ? { session } : undefined);
      } catch (error) {
        if (!session) {
          const compensated = await Invoice.findOneAndUpdate({ _id: current._id, amountPaid: { $gte: amount } }, { $inc: { amountPaid: -amount } }, { returnDocument: 'after' });
          if (compensated) {
            await Invoice.findByIdAndUpdate(compensated._id, { $set: { outstandingBalance: roundMoney(compensated.totalAmount - compensated.amountPaid), status: invoiceStatus(compensated) } });
          }
        }
        throw error;
      }
      return { payment, invoice: current };
    });
    await writeAuditLog({ userId: req.user._id, action: 'payment_successful', entityType: 'Payment', entityId: result.payment._id, metadata: { invoiceId: invoice._id, amount } });
    res.status(201).json({ success: true, payment: result.payment, invoice: result.invoice });
  } catch (error) {
    if (error.code === 11000) { error.statusCode = 409; error.message = 'Duplicate payment request'; }
    next(error);
  }
}

export async function listPayments(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (req.query.invoiceId) filter.invoiceId = req.query.invoiceId;
    if (req.query.patientId) { filter.patientId = req.query.patientId; }
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
    if (req.user.role === 'clinician') {
      if (req.query.invoiceId) {
        const invoice = await Invoice.findById(req.query.invoiceId);
        if (!invoice) throw paymentError('Invoice not found', 404);
        await ensurePaymentAccess(req, invoice.patientId, invoice.appointmentId);
      }
      const doctor = await Doctor.findOne({ userId: req.user._id, isActive: true });
      const patientIds = doctor ? await Appointment.find({ doctorId: doctor._id }).distinct('patientId') : [];
      filter.patientId = req.query.patientId ? filter.patientId : { $in: patientIds };
      if (req.query.patientId) await ensurePaymentAccess(req, req.query.patientId);
    }
    const [data, total] = await Promise.all([
      Payment.find(filter).sort({ paymentDate: -1 }).skip(skip).limit(limit).populate('invoiceId', 'invoiceNumber totalAmount status').populate('patientId', 'patientId name').populate('processedBy', 'name'),
      Payment.countDocuments(filter),
    ]);
    res.json({ success: true, ...paginatedResponse({ page, limit, total, data }) });
  } catch (error) { next(error); }
}

export async function getPayment(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.id).populate('invoiceId').populate('patientId', 'patientId name').populate('processedBy', 'name');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    await ensurePaymentAccess(req, payment.patientId._id, payment.invoiceId.appointmentId);
    res.json({ success: true, payment });
  } catch (error) { next(error); }
}

export async function refundPayment(req, res, next) {
  try {
    const amount = roundMoney(req.body.amount);
    const key = idempotencyKey(req, 'refundIdempotencyKey');
    if (!Number.isFinite(amount) || amount <= 0) throw paymentError('Refund amount must be greater than zero');
    if (!key || key.length < 8 || key.length > 200) throw paymentError('A refund idempotency key of 8 to 200 characters is required');
    const payment = await Payment.findById(req.params.id);
    if (!payment) throw paymentError('Payment not found', 404);
    const invoice = await Invoice.findById(payment.invoiceId);
    if (!invoice) throw paymentError('Invoice not found', 404);
    if (payment.paymentStatus !== 'successful') throw paymentError('Only successful payments can be refunded', 409);
    if (payment.refunds.some((refund) => refund.idempotencyKey === key)) throw paymentError('This refund request has already been processed', 409);
    if (roundMoney(payment.amount - payment.refundedAmount) < amount) throw paymentError('Refund exceeds the refundable payment amount', 409);
    const result = await withOptionalTransaction(async (session) => {
      const refund = { amount, reason: req.body.reason, authorizedBy: req.user._id, idempotencyKey: key, refundedAt: new Date() };
      const paymentQuery = Payment.findOneAndUpdate(
        { _id: payment._id, paymentStatus: 'successful', 'refunds.idempotencyKey': { $ne: key }, $expr: { $lte: [{ $add: ['$refundedAmount', amount] }, '$amount'] } },
        { $inc: { refundedAmount: amount }, $push: { refunds: refund } },
        { returnDocument: 'after', session: session || undefined },
      );
      const updatedPayment = await paymentQuery;
      if (!updatedPayment) throw paymentError('Payment is no longer refundable', 409);
      const invoiceQuery = Invoice.findOneAndUpdate(
        { _id: invoice._id, amountPaid: { $gte: amount } },
        { $inc: { amountPaid: -amount, outstandingBalance: amount } },
        { returnDocument: 'after', session: session || undefined },
      );
      const updatedInvoice = await invoiceQuery;
      if (!updatedInvoice) {
        if (!session) await Payment.findByIdAndUpdate(payment._id, { $inc: { refundedAmount: -amount }, $pull: { refunds: { idempotencyKey: key } }, session: undefined });
        throw paymentError('Invoice balance could not be updated for this refund', 409);
      }
      const nextPaymentStatus = updatedPayment.refundedAmount >= updatedPayment.amount ? 'refunded' : 'successful';
      const nextInvoiceStatus = invoiceStatus(updatedInvoice);
      const nextOutstanding = roundMoney(updatedInvoice.totalAmount - updatedInvoice.amountPaid);
      if (session) {
        updatedPayment.paymentStatus = nextPaymentStatus;
        await updatedPayment.save({ session });
        updatedInvoice.status = nextInvoiceStatus;
        updatedInvoice.outstandingBalance = nextOutstanding;
        await updatedInvoice.save({ session });
      } else {
        await Payment.findOneAndUpdate({ _id: updatedPayment._id, refundedAmount: updatedPayment.refundedAmount }, { $set: { paymentStatus: nextPaymentStatus } });
        await Invoice.findOneAndUpdate({ _id: updatedInvoice._id, amountPaid: updatedInvoice.amountPaid }, { $set: { status: nextInvoiceStatus, outstandingBalance: nextOutstanding } });
        updatedPayment.paymentStatus = nextPaymentStatus;
        updatedInvoice.status = nextInvoiceStatus;
        updatedInvoice.outstandingBalance = nextOutstanding;
      }
      return { payment: updatedPayment, invoice: updatedInvoice };
    });
    await writeAuditLog({ userId: req.user._id, action: 'refund', entityType: 'Payment', entityId: result.payment._id, metadata: { invoiceId: invoice._id, amount, reason: req.body.reason } });
    res.json({ success: true, payment: result.payment, invoice: result.invoice });
  } catch (error) {
    if (error.code === 11000) { error.statusCode = 409; error.message = 'Duplicate refund request'; }
    next(error);
  }
}
