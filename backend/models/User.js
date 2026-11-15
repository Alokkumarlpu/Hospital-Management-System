import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['admin', 'front_desk', 'clinician', 'patient'], required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', unique: true, sparse: true },
    phone: { type: String, trim: true },
    salutation: { type: String, trim: true, maxlength: 20 },
    alternatePhone: { type: String, trim: true, maxlength: 30 },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'non_binary', 'other', 'prefer_not_to_say'] },
    address: { type: String, trim: true, maxlength: 500 },
    city: { type: String, trim: true, maxlength: 80 },
    state: { type: String, trim: true, maxlength: 80 },
    country: { type: String, trim: true, maxlength: 80 },
    postalCode: { type: String, trim: true, maxlength: 20 },
    profilePhotoUrl: { type: String, trim: true, maxlength: 500000 },
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
