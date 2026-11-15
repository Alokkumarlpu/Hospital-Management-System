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

export const patientRegistrationValidators = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2 to 120 characters'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1 }).withMessage('Password must include upper, lower, and numeric characters'),
  body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
  body('phone').trim().matches(/^[+]?[\d\s().-]{7,30}$/).withMessage('A valid phone number is required'),
  body('dateOfBirth').isISO8601().withMessage('A valid date of birth is required'),
  body('gender').isIn(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say']).withMessage('A valid gender is required'),
  body('address').optional().trim().isLength({ max: 500 }).withMessage('Address is too long'),
  body('inviteToken').optional().isString().isLength({ min: 32, max: 200 }).withMessage('Invalid invitation token'),
];

export const idValidator = [param('id').isMongoId().withMessage('Valid user ID is required')];
