import jwt from 'jsonwebtoken';

export const signToken = id => jwt.sign({ id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN,
});

export const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  user.password = undefined;               // hide password
  res.status(statusCode).json({ token, user });
};
