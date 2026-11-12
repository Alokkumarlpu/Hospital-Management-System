import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: { type: String, enum: ['cash', 'card', 'bank_transfer', 'insurance', 'online'], required: true },
    transactionReference: { type: String, required: true, unique: true, trim: true },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
    paymentDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
paymentSchema.index({ transactionReference: 1 }, { unique: true });
paymentSchema.index({ paymentStatus: 1, paymentDate: -1 });
paymentSchema.index({ invoiceId: 1, paymentDate: -1 });
export default mongoose.model('Payment', paymentSchema);
