import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  appointmentReportSummary, appointmentTrends, appointmentsByDepartment, appointmentsByDoctor,
  billingReportSummary, billingRevenueTrends, billingInvoiceStatus, billingPaymentMethods,
  dashboardSummary, clinicianDashboard,
} from '../controllers/reportController.js';

const router = Router();
router.use(authenticate);
const reportReaders = authorizeRoles('admin', 'front_desk', 'clinician');
const billingReaders = authorizeRoles('admin', 'front_desk');

router.get('/reports/appointments/summary', reportReaders, appointmentReportSummary);
router.get('/reports/appointments/trends', reportReaders, appointmentTrends);
router.get('/reports/appointments/by-department', reportReaders, appointmentsByDepartment);
router.get('/reports/appointments/by-doctor', reportReaders, appointmentsByDoctor);
router.get('/reports/billing/summary', billingReaders, billingReportSummary);
router.get('/reports/billing/revenue-trends', billingReaders, billingRevenueTrends);
router.get('/reports/billing/invoice-status', billingReaders, billingInvoiceStatus);
router.get('/reports/billing/payment-methods', billingReaders, billingPaymentMethods);
router.get('/dashboard/summary', reportReaders, dashboardSummary);
router.get('/dashboard/clinician', authorizeRoles('clinician'), clinicianDashboard);

export default router;
