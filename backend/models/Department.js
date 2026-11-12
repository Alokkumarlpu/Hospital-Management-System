import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    departmentName: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    departmentCode: { type: String, required: true, trim: true, uppercase: true, match: /^[A-Z0-9_-]+$/ },
    location: { type: String, trim: true, maxlength: 200 },
    contactNumber: { type: String, trim: true, maxlength: 30 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
departmentSchema.index({ departmentCode: 1 }, { unique: true });
departmentSchema.index({ departmentName: 1 }, { unique: true });
export default mongoose.model('Department', departmentSchema);
