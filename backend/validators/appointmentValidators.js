import { body, param, query } from 'express-validator';

export const appointmentValidators = [
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('doctorId').isMongoId().withMessage('Valid doctor ID is required'),
  body('departmentId').isMongoId().withMessage('Valid department ID is required'),
  body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
  body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid start time'),
  body('endTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid end time'),
  body('appointmentType').optional().isIn(['consultation', 'follow_up']).withMessage('Invalid appointment type'),
  body('reason').trim().isLength({ min: 2, max: 500 }).withMessage('Reason must be 2 to 500 characters'),
];

export const appointmentUpdateValidators = [
  body('reason').optional().trim().isLength({ min: 2, max: 500 }).withMessage('Reason must be 2 to 500 characters'),
  body('appointmentType').optional().isIn(['consultation', 'follow_up']).withMessage('Invalid appointment type'),
];

export const appointmentIdValidator = [param('id').isMongoId().withMessage('Valid appointment ID is required')];
export const statusValidator = [body('status').isIn(['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show']).withMessage('Invalid appointment status')];
export const cancellationValidator = [body('cancellationReason').trim().isLength({ min: 2, max: 500 }).withMessage('Cancellation reason is required')];
export const availabilityValidators = [
  query('doctorId').isMongoId().withMessage('Valid doctor ID is required'),
  query('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must use YYYY-MM-DD format'),
  query('departmentId').optional().isMongoId().withMessage('Invalid department ID'),
];
