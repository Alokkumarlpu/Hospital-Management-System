import { body, param } from 'express-validator';

export const departmentValidators = [
  body('departmentName').trim().isLength({ min: 2, max: 100 }).withMessage('Department name is required'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description is too long'),
  body('departmentCode').trim().matches(/^[A-Za-z0-9_-]+$/).withMessage('Invalid department code'),
  body('location').optional().trim().isLength({ max: 200 }).withMessage('Location is too long'),
  body('contactNumber').optional().trim().matches(/^[+0-9() .-]{7,30}$/).withMessage('Invalid contact number'),
];

export const departmentUpdateValidators = [
  body('departmentName').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Invalid department name'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description is too long'),
  body('departmentCode').optional().trim().matches(/^[A-Za-z0-9_-]+$/).withMessage('Invalid department code'),
  body('location').optional().trim().isLength({ max: 200 }).withMessage('Location is too long'),
  body('contactNumber').optional().trim().matches(/^[+0-9() .-]{7,30}$/).withMessage('Invalid contact number'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean').toBoolean(),
];

export const departmentIdValidator = [param('id').isMongoId().withMessage('Valid department ID is required')];
