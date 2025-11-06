import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { signupValidator, loginValidator } from '../validators/authValidators.js';

const router = Router();

router.post('/signup',  signupValidator, auth.signup);
router.post('/login',   loginValidator, auth.login);
router.patch('/change-password', auth.protect, auth.changePassword);
router.post('/forgot-password',  auth.forgotPassword);
router.patch('/reset-password/:token', auth.resetPassword);

// Example profile route
router.get('/profile', auth.protect, (req, res) =>
  res.json({ firstName: req.user.firstName, lastName: req.user.lastName, email: req.user.email })
);

export default router;
