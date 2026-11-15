import { Router } from 'express';
import { createUser, getAllUsers, getUserById, updateUser, updateUserStatus } from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { idValidator } from '../validators/authValidators.js';
import { updateUserValidators } from '../validators/userValidators.js';
import { registrationValidators } from '../validators/authValidators.js';
import { body } from 'express-validator';

const router = Router();

router.use(authenticate, requireAdmin);
router.get('/', getAllUsers);
router.post('/', [...registrationValidators, body('role').isIn(['admin', 'front_desk', 'clinician']).withMessage('A valid role is required')], validateRequest, createUser);
router.get('/:id', idValidator, validateRequest, getUserById);
router.put('/:id', idValidator, updateUserValidators, validateRequest, updateUser);
router.patch('/:id/status', [...idValidator, body('isActive').isBoolean().withMessage('isActive must be boolean').toBoolean()], validateRequest, updateUserStatus);

export default router;
