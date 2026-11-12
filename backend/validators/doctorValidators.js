import { body, param } from 'express-validator';

const phone = body('phone').optional().trim().matches(/^[+0-9() .-]{7,30}$/).withMessage('Invalid phone number');

export const doctorValidators = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  phone,
  body('specialization').trim().isLength({ min: 2, max: 120 }).withMessage('Specialization is required'),
  body('departmentId').isMongoId().withMessage('Valid department is required'),
  body('userId').optional().isMongoId().withMessage('Linked user ID must be valid'),
  body('qualification').trim().isLength({ min: 2, max: 200 }).withMessage('Qualification is required'),
  body('experience').isFloat({ min: 0, max: 80 }).withMessage('Experience must be between 0 and 80'),
  body('consultationFee').isFloat({ min: 0 }).withMessage('Consultation fee cannot be negative'),
];

export const doctorUpdateValidators = doctorValidators.map((validator) => validator.optional());
export const doctorIdValidator = [param('id').isMongoId().withMessage('Valid doctor ID is required')];
