import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  completeVisit, createNote, createPrescription, createReport, createVisit, getPrescription, getReport, getVisit, listNotes, listPrescriptions, listReports, listVisits, patientHistory, updateNote, updatePrescription, updateReportStatus, updateVisit,
} from '../controllers/clinicalController.js';
import {
  noteUpdateValidators, noteValidators, patientHistoryValidator, prescriptionValidators, reportStatusValidator, reportValidators, visitIdValidator, visitUpdateValidators, visitValidators,
} from '../validators/clinicalValidators.js';
import { body, param } from 'express-validator';

const router = Router();
const clinicalReaders = authorizeRoles('admin', 'clinician');
const clinicianOnly = authorizeRoles('clinician');

router.use(authenticate);

router.get('/history', clinicalReaders, patientHistoryValidator, validateRequest, patientHistory);

router.post('/visits', clinicianOnly, visitValidators, validateRequest, createVisit);
router.get('/visits', clinicalReaders, listVisits);
router.get('/visits/patient/:patientId', clinicalReaders, [param('patientId').isMongoId()], validateRequest, (req, res, next) => { req.query.patientId = req.params.patientId; listVisits(req, res, next); });
router.get('/visits/appointment/:appointmentId', clinicalReaders, [param('appointmentId').isMongoId()], validateRequest, (req, res, next) => { req.query.appointmentId = req.params.appointmentId; listVisits(req, res, next); });
router.post('/appointments/:appointmentId/complete', clinicianOnly, [param('appointmentId').isMongoId().withMessage('Valid appointment ID is required')], validateRequest, completeVisit);
router.get('/visits/:id', clinicalReaders, visitIdValidator, validateRequest, getVisit);
router.put('/visits/:id', clinicianOnly, [...visitIdValidator, ...visitUpdateValidators], validateRequest, updateVisit);

router.post('/clinical-notes', clinicianOnly, noteValidators, validateRequest, createNote);
router.get('/clinical-notes/visit/:visitId', clinicalReaders, [param('visitId').isMongoId()], validateRequest, (req, res, next) => { req.params.visitId = req.params.visitId; listNotes(req, res, next); });
router.get('/clinical-notes/patient/:patientId', clinicalReaders, [param('patientId').isMongoId()], validateRequest, (req, res, next) => { listNotes(req, res, next); });
router.put('/clinical-notes/:id', clinicianOnly, [param('id').isMongoId(), ...noteUpdateValidators], validateRequest, updateNote);

router.post('/prescriptions', clinicianOnly, prescriptionValidators, validateRequest, createPrescription);
router.get('/prescriptions', clinicalReaders, listPrescriptions);
router.get('/prescriptions/patient/:patientId', clinicalReaders, [param('patientId').isMongoId()], validateRequest, (req, res, next) => { req.query.patientId = req.params.patientId; listPrescriptions(req, res, next); });
router.get('/prescriptions/visit/:visitId', clinicalReaders, [param('visitId').isMongoId()], validateRequest, (req, res, next) => { req.query.visitRecordId = req.params.visitId; listPrescriptions(req, res, next); });
router.get('/prescriptions/:id', clinicalReaders, [param('id').isMongoId()], validateRequest, getPrescription);
router.put('/prescriptions/:id', clinicianOnly, [param('id').isMongoId(), body('medicines').optional().isArray({ min: 1, max: 50 }), body('status').optional().isIn(['active', 'completed', 'cancelled'])], validateRequest, updatePrescription);

router.post('/diagnostic-reports', clinicianOnly, reportValidators, validateRequest, createReport);
router.get('/diagnostic-reports', clinicalReaders, listReports);
router.get('/diagnostic-reports/patient/:patientId', clinicalReaders, [param('patientId').isMongoId()], validateRequest, (req, res, next) => { req.query.patientId = req.params.patientId; listReports(req, res, next); });
router.get('/diagnostic-reports/visit/:visitId', clinicalReaders, [param('visitId').isMongoId()], validateRequest, (req, res, next) => { req.query.visitRecordId = req.params.visitId; listReports(req, res, next); });
router.get('/diagnostic-reports/:id', clinicalReaders, [param('id').isMongoId()], validateRequest, getReport);
router.patch('/diagnostic-reports/:id/status', clinicianOnly, reportStatusValidator, validateRequest, updateReportStatus);

export default router;
