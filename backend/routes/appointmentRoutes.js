import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles, requireFrontDesk, requireAdmin } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { appointmentSummary, availableSlots, cancelAppointment, createAppointment, getAppointment, listAppointments, rescheduleAppointment, updateAppointment, updateAppointmentStatus } from '../controllers/appointmentController.js';
import { appointmentIdValidator, appointmentUpdateValidators, appointmentValidators, availabilityValidators, cancellationValidator, statusValidator } from '../validators/appointmentValidators.js';

const router = Router();

router.use(authenticate);
router.get('/available-slots', authorizeRoles('admin', 'front_desk', 'clinician'), availabilityValidators, validateRequest, availableSlots);
router.get('/summary', authorizeRoles('admin', 'front_desk', 'clinician'), appointmentSummary);
router.post('/', requireFrontDesk, appointmentValidators, validateRequest, createAppointment);
router.get('/', authorizeRoles('admin', 'front_desk', 'clinician'), listAppointments);
router.get('/:id', authorizeRoles('admin', 'front_desk', 'clinician'), appointmentIdValidator, validateRequest, getAppointment);
router.put('/:id', requireFrontDesk, appointmentIdValidator, appointmentUpdateValidators, validateRequest, updateAppointment);
router.patch('/:id/status', authorizeRoles('admin', 'front_desk', 'clinician'), [...appointmentIdValidator, ...statusValidator], validateRequest, updateAppointmentStatus);
router.patch('/:id/reschedule', requireFrontDesk, [...appointmentIdValidator, body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'), body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid start time'), body('endTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid end time'), body('doctorId').optional().isMongoId().withMessage('Invalid doctor ID'), body('departmentId').optional().isMongoId().withMessage('Invalid department ID')], validateRequest, rescheduleAppointment);
router.patch('/:id/cancel', requireFrontDesk, [...appointmentIdValidator, ...cancellationValidator], validateRequest, cancelAppointment);

export default router;
