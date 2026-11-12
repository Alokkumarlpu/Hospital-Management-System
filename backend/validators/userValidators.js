import { body } from 'express-validator';

export const updateUserValidators = [
  body('name').optional().trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2 to 120 characters'),
  body('email').optional().trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 30 }).withMessage('Phone is too long'),
  body('role').optional().isIn(['admin', 'front_desk', 'clinician']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean').toBoolean(),
];
