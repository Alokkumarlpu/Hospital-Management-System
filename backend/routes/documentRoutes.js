import { Router } from 'express';
import { param } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { downloadDocument, generateDocument, getDocument, listDocuments } from '../controllers/documentController.js';

const router = Router();
router.use(authenticate);
router.get('/documents', authorizeRoles('admin', 'front_desk', 'clinician', 'patient'), listDocuments);
router.get('/documents/:id', authorizeRoles('admin', 'front_desk', 'clinician', 'patient'), [param('id').isMongoId()], validateRequest, getDocument);
router.get('/documents/:id/download', authorizeRoles('admin', 'front_desk', 'clinician', 'patient'), [param('id').isMongoId()], validateRequest, downloadDocument);
router.post('/documents/:type/:id/generate', authorizeRoles('admin', 'front_desk', 'clinician'), [param('id').isMongoId()], validateRequest, generateDocument);
export default router;
