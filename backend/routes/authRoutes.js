import { Router } from 'express';
import { changePassword, getMe, login, logout, register } from '../controllers/authController.js';
import { authenticate, optionalAuthenticate } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { loginValidators, passwordValidators, registrationValidators } from '../validators/authValidators.js';

const router = Router();

router.post('/register', optionalAuthenticate, registrationValidators, validateRequest, register);
router.post('/login', loginValidators, validateRequest, login);
router.post('/logout', optionalAuthenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, passwordValidators, validateRequest, changePassword);

export default router;
