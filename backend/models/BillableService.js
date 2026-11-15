import mongoose from 'mongoose';

const billableServiceSchema = new mongoose.Schema(
  {
    serviceCode: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 500 },
    category: { type: String, trim: true, maxlength: 100 },
    unitPrice: { type: Number, required: true, min: 0.01 },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

billableServiceSchema.index({ serviceCode: 1 }, { unique: true });
billableServiceSchema.index({ active: 1, category: 1 });

export default mongoose.model('BillableService', billableServiceSchema);
