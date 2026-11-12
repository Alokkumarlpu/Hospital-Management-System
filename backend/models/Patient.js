import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    firstName: { type: String, trim: true, maxlength: 60 },
    lastName: { type: String, trim: true, maxlength: 60 },
    dateOfBirth: { type: Date, required: true, validate: { validator: (value) => value <= new Date(), message: 'Date of birth cannot be in the future' } },
    gender: { type: String, enum: ['male', 'female', 'non_binary', 'other', 'prefer_not_to_say'], required: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    address: { type: String, trim: true, maxlength: 500 },
    emergencyContact: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'], default: 'unknown' },
    registeredAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
patientSchema.index({ patientId: 1 }, { unique: true });
patientSchema.index({ name: 'text', phone: 1, email: 1 });
export default mongoose.model('Patient', patientSchema);
