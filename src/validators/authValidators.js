import { body } from 'express-validator';

export const signupValidator = [
  body('firstName').notEmpty().withMessage('First name required'),
  body('lastName').notEmpty().withMessage('Last name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be ≥ 8 chars'),
];

export const loginValidator = [
  body('email').isEmail(),
  body('password').notEmpty(),
];
