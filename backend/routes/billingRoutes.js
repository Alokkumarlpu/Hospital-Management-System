import { Router } from 'express';
import { param } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles, requireFrontDesk } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { billingDashboard } from '../controllers/billingController.js';
import { cancelInvoice, billingReports, createInvoice, getInvoice, listInvoices, outstandingInvoices, updateInvoice } from '../controllers/invoiceController.js';
import { createPayment, getPayment, listPayments, refundPayment } from '../controllers/paymentController.js';
import {
  cancelInvoiceValidators, invoiceCreateValidators, invoiceIdValidator, invoiceQueryValidators, invoiceUpdateValidators, paymentCreateValidators, paymentIdValidator, paymentQueryValidators, refundValidators,
} from '../validators/billingValidators.js';

const router = Router();
const readers = authorizeRoles('admin', 'front_desk', 'clinician');
const financialManagers = authorizeRoles('admin', 'front_desk');

router.use(authenticate);

router.get('/billing/dashboard', financialManagers, billingDashboard);
router.get('/billing/reports', financialManagers, invoiceQueryValidators, validateRequest, billingReports);
router.get('/billing/outstanding', financialManagers, invoiceQueryValidators, validateRequest, outstandingInvoices);

router.post('/invoices', requireFrontDesk, invoiceCreateValidators, validateRequest, createInvoice);
router.get('/invoices', readers, invoiceQueryValidators, validateRequest, listInvoices);
router.get('/invoices/patient/:patientId', readers, [param('patientId').isMongoId().withMessage('Invalid patient ID'), ...invoiceQueryValidators], validateRequest, (req, res, next) => { req.query.patientId = req.params.patientId; listInvoices(req, res, next); });
router.get('/invoices/:id', readers, invoiceIdValidator, validateRequest, getInvoice);
router.put('/invoices/:id', requireFrontDesk, invoiceUpdateValidators, validateRequest, updateInvoice);
router.patch('/invoices/:id/cancel', requireFrontDesk, cancelInvoiceValidators, validateRequest, cancelInvoice);

router.post('/payments', requireFrontDesk, paymentCreateValidators, validateRequest, createPayment);
router.get('/payments', readers, paymentQueryValidators, validateRequest, listPayments);
router.get('/payments/invoice/:invoiceId', readers, [param('invoiceId').isMongoId().withMessage('Invalid invoice ID'), ...paymentQueryValidators], validateRequest, (req, res, next) => { req.query.invoiceId = req.params.invoiceId; listPayments(req, res, next); });
router.get('/payments/patient/:patientId', readers, [param('patientId').isMongoId().withMessage('Invalid patient ID'), ...paymentQueryValidators], validateRequest, (req, res, next) => { req.query.patientId = req.params.patientId; listPayments(req, res, next); });
router.get('/payments/:id', readers, paymentIdValidator, validateRequest, getPayment);
router.post('/payments/:id/refund', financialManagers, refundValidators, validateRequest, refundPayment);

export default router;
