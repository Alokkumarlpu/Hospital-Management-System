import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles, requireAdmin } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createDoctor, getDoctor, listDoctors, updateDoctor, updateDoctorStatus } from '../controllers/doctorController.js';
import { doctorIdValidator, doctorUpdateValidators, doctorValidators } from '../validators/doctorValidators.js';

const router = Router();

router.use(authenticate);
router.post('/', requireAdmin, doctorValidators, validateRequest, createDoctor);
router.get('/', authorizeRoles('admin', 'front_desk', 'clinician'), listDoctors);
router.get('/:id', authorizeRoles('admin', 'front_desk', 'clinician'), doctorIdValidator, validateRequest, getDoctor);
router.put('/:id', requireAdmin, doctorIdValidator, doctorUpdateValidators, validateRequest, updateDoctor);
router.patch('/:id/status', requireAdmin, [...doctorIdValidator, body('isActive').isBoolean().withMessage('isActive must be boolean').toBoolean()], validateRequest, updateDoctorStatus);

export default router;
