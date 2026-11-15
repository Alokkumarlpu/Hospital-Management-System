import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles, requireFrontDesk, requirePatient } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { availableSlots } from '../controllers/appointmentController.js';
import {
  bookAppointment, cancelMyAppointment, createPatientInvite, dashboard, getMyAppointment, invoices, listDepartments, listDoctors, listMyAppointments, markAllNotificationsRead, markNotificationRead, notifications, payInvoice, payments, prescriptions, profile, records, reports, rescheduleMyAppointment, updateProfile,
} from '../controllers/patientPortalController.js';
import { patientAppointmentValidators, patientAvailabilityValidators, patientIdParam } from '../validators/patientPortalValidators.js';
import { paymentCreateValidators } from '../validators/billingValidators.js';

const router = Router();
router.use(authenticate);

router.post('/invites', requireFrontDesk, [body('patientId').isMongoId().withMessage('Valid patient ID is required')], validateRequest, createPatientInvite);
router.use(requirePatient);
router.get('/dashboard', dashboard);
router.get('/profile', profile);
router.put('/profile', [body('name').optional().trim().isLength({ min: 2, max: 120 }), body('phone').optional().trim().isLength({ min: 7, max: 30 }), body('email').optional().isEmail().normalizeEmail(), body('address').optional().trim().isLength({ max: 500 })], validateRequest, updateProfile);
router.get('/doctors', listDoctors);
router.get('/departments', listDepartments);
router.get('/available-slots', patientAvailabilityValidators, validateRequest, availableSlots);
router.post('/appointments', patientAppointmentValidators, validateRequest, bookAppointment);
router.get('/appointments', listMyAppointments);
router.get('/appointments/:id', patientIdParam, validateRequest, getMyAppointment);
router.patch('/appointments/:id/cancel', [...patientIdParam, body('cancellationReason').trim().isLength({ min: 2, max: 500 })], validateRequest, cancelMyAppointment);
router.patch('/appointments/:id/reschedule', [...patientIdParam, ...patientAppointmentValidators], validateRequest, rescheduleMyAppointment);
router.get('/records', records);
router.get('/prescriptions', prescriptions);
router.get('/reports', reports);
router.get('/invoices', invoices);
router.get('/payments', payments);
router.post('/payments', paymentCreateValidators, validateRequest, payInvoice);
router.get('/notifications', notifications);
router.patch('/notifications/read-all', markAllNotificationsRead);
router.patch('/notifications/:id/read', patientIdParam, validateRequest, markNotificationRead);

export default router;
