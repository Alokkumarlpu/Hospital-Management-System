import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    doctorId: { type: String, required: true, trim: true, uppercase: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    qualification: { type: String, required: true, trim: true },
    experience: { type: Number, required: true, min: 0, max: 80 },
    consultationFee: { type: Number, required: true, min: 0 },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    isActive: { type: Boolean, default: true },
    bookingLockId: { type: String, default: null, select: false },
    bookingLockUntil: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);
doctorSchema.index({ doctorId: 1 }, { unique: true });
doctorSchema.index({ name: 'text', specialization: 'text', departmentId: 1 });
export default mongoose.model('Doctor', doctorSchema);
