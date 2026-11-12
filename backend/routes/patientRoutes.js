import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireFrontDesk, authorizeRoles } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createPatient, getPatient, listPatients, updatePatient, updatePatientStatus } from '../controllers/patientController.js';
import { patientIdValidator, patientUpdateValidators, patientValidators } from '../validators/patientValidators.js';

const router = Router();

router.use(authenticate);
router.post('/', requireFrontDesk, patientValidators, validateRequest, createPatient);
router.get('/', authorizeRoles('admin', 'front_desk', 'clinician'), listPatients);
router.get('/:id', authorizeRoles('admin', 'front_desk', 'clinician'), patientIdValidator, validateRequest, getPatient);
router.put('/:id', requireFrontDesk, patientIdValidator, patientUpdateValidators, validateRequest, updatePatient);
router.patch('/:id/status', requireFrontDesk, [...patientIdValidator, body('isActive').isBoolean().withMessage('isActive must be boolean').toBoolean()], validateRequest, updatePatientStatus);

export default router;
