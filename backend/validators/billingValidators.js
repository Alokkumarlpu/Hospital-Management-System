import { body, param, query } from 'express-validator';

const id = (field) => param(field).isMongoId().withMessage(`Valid ${field} is required`);
const invoiceId = body('invoiceId').isMongoId().withMessage('Valid invoice ID is required');
const patientId = body('patientId').isMongoId().withMessage('Valid patient ID is required');

export const invoiceCreateValidators = [
  patientId,
  body('appointmentId').optional().isMongoId().withMessage('Invalid appointment ID'),
  body('visitRecordId').optional().isMongoId().withMessage('Invalid visit record ID'),
  body('lineItems').isArray({ min: 1, max: 100 }).withMessage('At least one line item is required'),
  body('lineItems.*.description').trim().isLength({ min: 1, max: 200 }).withMessage('Line item description is required'),
  body('lineItems.*.category').optional().trim().isLength({ max: 100 }).withMessage('Invalid line item category'),
  body('lineItems.*.quantity').isInt({ min: 1, max: 100000 }).withMessage('Quantity must be a positive integer').toInt(),
  body('lineItems.*.unitPrice').isFloat({ gt: 0 }).withMessage('Unit price must be greater than zero').toFloat(),
  body('discount').optional().isFloat({ min: 0 }).withMessage('Invalid discount').toFloat(),
  body('tax').optional().isFloat({ min: 0 }).withMessage('Invalid tax').toFloat(),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date'),
];

export const invoiceUpdateValidators = [
  id('id'),
  body('lineItems').optional().isArray({ min: 1, max: 100 }).withMessage('At least one line item is required'),
  body('lineItems.*.description').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Invalid line item description'),
  body('lineItems.*.category').optional().trim().isLength({ max: 100 }).withMessage('Invalid line item category'),
  body('lineItems.*.quantity').optional().isInt({ min: 1, max: 100000 }).withMessage('Quantity must be a positive integer').toInt(),
  body('lineItems.*.unitPrice').optional().isFloat({ gt: 0 }).withMessage('Unit price must be greater than zero').toFloat(),
  body('discount').optional().isFloat({ min: 0 }).withMessage('Invalid discount').toFloat(),
  body('tax').optional().isFloat({ min: 0 }).withMessage('Invalid tax').toFloat(),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date'),
];

export const invoiceIdValidator = [id('id')];
export const cancelInvoiceValidators = [id('id'), body('reason').trim().isLength({ min: 3, max: 500 }).withMessage('Cancellation reason is required')];

export const paymentCreateValidators = [
  invoiceId,
  body('amount').isFloat({ gt: 0 }).withMessage('Payment amount must be greater than zero').toFloat(),
  body('paymentMethod').isIn(['cash', 'card', 'upi', 'net_banking']).withMessage('Invalid simulated payment method'),
  body('simulateStatus').optional().isIn(['successful', 'failed']).withMessage('Invalid simulation status'),
  body('idempotencyKey').optional().isString().isLength({ min: 8, max: 200 }).withMessage('Invalid idempotency key'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes are too long'),
];

export const paymentIdValidator = [id('id')];
export const refundValidators = [
  id('id'),
  body('amount').isFloat({ gt: 0 }).withMessage('Refund amount must be greater than zero').toFloat(),
  body('reason').trim().isLength({ min: 3, max: 500 }).withMessage('Refund reason is required'),
  body('refundIdempotencyKey').optional().isString().isLength({ min: 8, max: 200 }).withMessage('Invalid refund idempotency key'),
];

export const invoiceQueryValidators = [
  query('patientId').optional().isMongoId().withMessage('Invalid patient ID'),
  query('status').optional().isIn(['draft', 'unpaid', 'partially_paid', 'paid', 'cancelled', 'overdue']).withMessage('Invalid invoice status'),
  query('from').optional().isISO8601().withMessage('Invalid start date'),
  query('to').optional().isISO8601().withMessage('Invalid end date'),
];

export const paymentQueryValidators = [
  query('invoiceId').optional().isMongoId().withMessage('Invalid invoice ID'),
  query('patientId').optional().isMongoId().withMessage('Invalid patient ID'),
  query('paymentStatus').optional().isIn(['pending', 'successful', 'failed', 'refunded']).withMessage('Invalid payment status'),
  query('paymentMethod').optional().isIn(['cash', 'card', 'upi', 'net_banking']).withMessage('Invalid payment method'),
];
