import { Router } from 'express';
import { changePassword, getMe, getProfile, login, logout, register, registerPatient, updateProfile } from '../controllers/authController.js';
import { authenticate, optionalAuthenticate } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { loginValidators, passwordValidators, patientRegistrationValidators, registrationValidators } from '../validators/authValidators.js';

const router = Router();

router.post('/register', optionalAuthenticate, registrationValidators, validateRequest, register);
router.post('/patient/register', patientRegistrationValidators, validateRequest, registerPatient);
router.post('/login', loginValidators, validateRequest, login);
router.post('/logout', optionalAuthenticate, logout);
router.get('/me', authenticate, getMe);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, passwordValidators, validateRequest, changePassword);

export default router;
