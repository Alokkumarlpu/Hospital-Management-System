import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles, requireAdmin } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createSchedule, deactivateSchedule, getSchedule, listSchedules, updateSchedule } from '../controllers/scheduleController.js';
import { scheduleIdValidator, scheduleUpdateValidators, scheduleValidators } from '../validators/scheduleValidators.js';
import { body } from 'express-validator';

const router = Router();

router.use(authenticate);
router.post('/', requireAdmin, scheduleValidators, validateRequest, createSchedule);
router.get('/', authorizeRoles('admin', 'front_desk', 'clinician'), listSchedules);
router.get('/:id', authorizeRoles('admin', 'front_desk', 'clinician'), scheduleIdValidator, validateRequest, getSchedule);
router.put('/:id', requireAdmin, scheduleIdValidator, scheduleUpdateValidators, validateRequest, updateSchedule);
router.delete('/:id', requireAdmin, scheduleIdValidator, validateRequest, deactivateSchedule);

export default router;
