import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import { listAuditLogs } from '../controllers/reportController.js';

const router = Router();
router.get('/', authenticate, requireAdmin, listAuditLogs);
export default router;
