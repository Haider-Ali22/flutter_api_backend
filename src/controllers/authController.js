import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { createSendToken } from '../utils/token.js';
import sendEmail from '../utils/email.js';
import { validationResult } from 'express-validator';

/* ---------- SIGNUP ---------- */
export const signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { firstName, lastName, email, password } = req.body;

    // Check for existing email
    if (await User.findOne({ email }))
      return res.status(409).json({ message: 'Email already registered' });

    const newUser = await User.create({ firstName, lastName, email, password });
    createSendToken(newUser, 201, res);
  } catch (err) { next(err); }
};

/* ---------- LOGIN ---------- */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password)))
      return res.status(401).json({ message: 'Incorrect email or password' });

    createSendToken(user, 200, res);
  } catch (err) { next(err); }
};

/* ---------- PROTECTED ROUTE MIDDLEWARE ---------- */
export const protect = async (req, _res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer'))
      token = req.headers.authorization.split(' ')[1];
    if (!token) throw { statusCode: 401, message: 'Not logged in' };

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) throw { statusCode: 401, message: 'User no longer exists' };

    req.user = currentUser;
    next();
  } catch (err) { next(err); }
};

/* ---------- CHANGE PASSWORD ---------- */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!(await user.correctPassword(currentPassword, user.password)))
      return res.status(401).json({ message: 'Current password wrong' });

    user.password = newPassword;
    await user.save();
    createSendToken(user, 200, res);
  } catch (err) { next(err); }
};

/* ---------- FORGOT PASSWORD ---------- */
export const forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: 'No user with that email' });

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Password reset (valid 10 min)',
      text: `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}`,
    });

    res.status(200).json({ message: 'Token sent to email' });
  } catch (err) { next(err); }
};

/* ---------- RESET PASSWORD ---------- */
export const resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'Token invalid or expired' });

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    createSendToken(user, 200, res);
  } catch (err) { next(err); }
};
