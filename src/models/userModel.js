import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  firstName : { type: String, required: true },
  lastName  : { type: String, required: true },
  email     : { type: String, required: true, unique: true, lowercase: true },
  password  : { type: String, required: true, minlength: 8, select: false },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
});

// Hash password before save
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare passwords
userSchema.methods.correctPassword = function (candidate, userPass) {
  return bcrypt.compare(candidate, userPass);
};

// Create a reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken   = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 min
  return resetToken;
};

export default mongoose.model('User', userSchema);
