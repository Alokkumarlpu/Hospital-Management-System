import { body, param } from 'express-validator';

const phone = body('phone').optional().trim().matches(/^[+0-9() .-]{7,30}$/).withMessage('Invalid phone number');

export const patientValidators = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2 to 120 characters'),
  body('firstName').optional().trim().isLength({ min: 1, max: 60 }).withMessage('Invalid first name'),
  body('lastName').optional().trim().isLength({ min: 1, max: 60 }).withMessage('Invalid last name'),
  body('dateOfBirth').isISO8601().withMessage('A valid date of birth is required').custom((value) => new Date(value) <= new Date()).withMessage('Date of birth cannot be in the future'),
  body('gender').isIn(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say']).withMessage('Invalid gender'),
  phone,
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Invalid email').normalizeEmail(),
  body('bloodGroup').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).withMessage('Invalid blood group'),
  body('emergencyContact.phone').optional().trim().matches(/^[+0-9() .-]{7,30}$/).withMessage('Invalid emergency contact phone'),
];

export const patientUpdateValidators = [
  body('name').optional().trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2 to 120 characters'),
  body('firstName').optional().trim().isLength({ min: 1, max: 60 }).withMessage('Invalid first name'),
  body('lastName').optional().trim().isLength({ min: 1, max: 60 }).withMessage('Invalid last name'),
  body('dateOfBirth').optional().isISO8601().withMessage('Invalid date of birth'),
  body('gender').optional().isIn(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say']).withMessage('Invalid gender'),
  phone,
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Invalid email').normalizeEmail(),
  body('bloodGroup').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).withMessage('Invalid blood group'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean').toBoolean(),
];

export const patientIdValidator = [param('id').isMongoId().withMessage('Valid patient ID is required')];
