import { body, param } from 'express-validator';

const time = (field) => body(field).matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage(`${field} must use HH:MM format`);

export const scheduleValidators = [
  body('doctorId').isMongoId().withMessage('Valid doctor ID is required'),
  body('workingDay').isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).withMessage('Invalid working day'),
  time('startTime'),
  time('endTime'),
  body('slotDuration').isInt({ min: 5, max: 240 }).withMessage('Slot duration must be 5 to 240 minutes'),
  body('breakStartTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid break start time'),
  body('breakEndTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid break end time'),
];

export const scheduleUpdateValidators = [
  body('workingDay').optional().isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).withMessage('Invalid working day'),
  time('startTime').optional(),
  time('endTime').optional(),
  body('slotDuration').optional().isInt({ min: 5, max: 240 }).withMessage('Slot duration must be 5 to 240 minutes'),
  body('breakStartTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid break start time'),
  body('breakEndTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid break end time'),
  body('isAvailable').optional().isBoolean().withMessage('isAvailable must be boolean').toBoolean(),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean').toBoolean(),
];

export const scheduleIdValidator = [param('id').isMongoId().withMessage('Valid schedule ID is required')];
