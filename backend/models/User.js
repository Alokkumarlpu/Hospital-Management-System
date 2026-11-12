import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['admin', 'front_desk', 'clinician'], required: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
userSchema.index({ email: 1 }, { unique: true });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return;
  }
  const bcrypt = await import('bcryptjs');
  this.password = await bcrypt.default.hash(this.password, 12);
});

userSchema.methods.toSafeObject = function toSafeObject() {
  const user = this.toObject();
  delete user.password;
  return user;
};

export default mongoose.model('User', userSchema);
