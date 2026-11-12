import { body, param } from 'express-validator';

export const registrationValidators = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2 to 120 characters'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone').optional().trim().isLength({ max: 30 }).withMessage('Phone is too long'),
  body('role').optional().isIn(['admin', 'front_desk', 'clinician']).withMessage('Invalid role'),
];

export const loginValidators = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

export const passwordValidators = [
  body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

export const idValidator = [param('id').isMongoId().withMessage('Valid user ID is required')];
