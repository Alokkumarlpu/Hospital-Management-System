import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createService, listServices } from '../controllers/serviceController.js';

const router = Router();
router.use(authenticate);
router.get('/services', authorizeRoles('admin', 'front_desk'), listServices);
router.post('/services', authorizeRoles('admin'), [
  body('serviceCode').isString().trim().notEmpty(),
  body('name').isString().trim().notEmpty(),
  body('unitPrice').isFloat({ min: 0.01 }),
], validateRequest, createService);
export default router;
