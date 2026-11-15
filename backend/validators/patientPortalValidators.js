import { body, param, query } from 'express-validator';

export const patientAppointmentValidators = [
  body('doctorId').isMongoId().withMessage('Valid doctor ID is required'),
  body('departmentId').isMongoId().withMessage('Valid department ID is required'),
  body('appointmentDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must use YYYY-MM-DD format'),
  body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid start time'),
  body('endTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid end time'),
  body('appointmentType').optional().isIn(['consultation', 'follow_up']).withMessage('Invalid appointment type'),
  body('reason').trim().isLength({ min: 2, max: 500 }).withMessage('Reason must be 2 to 500 characters'),
];

export const patientAvailabilityValidators = [
  query('doctorId').isMongoId().withMessage('Valid doctor ID is required'),
  query('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must use YYYY-MM-DD format'),
  query('departmentId').optional().isMongoId().withMessage('Invalid department ID'),
];

export const patientIdParam = [param('id').isMongoId().withMessage('Valid ID is required')];
