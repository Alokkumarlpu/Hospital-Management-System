import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles, requireAdmin } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createDepartment, getDepartment, listDepartments, updateDepartment, updateDepartmentStatus } from '../controllers/departmentController.js';
import { departmentIdValidator, departmentUpdateValidators, departmentValidators } from '../validators/departmentValidators.js';

const router = Router();

router.use(authenticate);
router.post('/', requireAdmin, departmentValidators, validateRequest, createDepartment);
router.get('/', authorizeRoles('admin', 'front_desk', 'clinician'), listDepartments);
router.get('/:id', authorizeRoles('admin', 'front_desk', 'clinician'), departmentIdValidator, validateRequest, getDepartment);
router.put('/:id', requireAdmin, departmentIdValidator, departmentUpdateValidators, validateRequest, updateDepartment);
router.patch('/:id/status', requireAdmin, [...departmentIdValidator, body('isActive').isBoolean().withMessage('isActive must be boolean').toBoolean()], validateRequest, updateDepartmentStatus);

export default router;
