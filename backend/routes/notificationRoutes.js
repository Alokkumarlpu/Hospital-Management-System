import { Router } from 'express';
import { param } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../controllers/notificationController.js';

const router = Router();
router.use(authenticate, authorizeRoles('admin', 'front_desk', 'clinician'));
router.get('/notifications', listNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);
router.patch('/notifications/:id/read', [param('id').isMongoId()], validateRequest, markNotificationRead);
export default router;