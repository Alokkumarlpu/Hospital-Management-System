import mongoose from 'mongoose';

const refundSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    authorizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    refundedAt: { type: Date, default: Date.now },
    idempotencyKey: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const paymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, required: true, trim: true, uppercase: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'net_banking'], required: true },
    transactionReference: { type: String, required: true, trim: true },
    idempotencyKey: { type: String, required: true, trim: true },
    paymentStatus: { type: String, enum: ['pending', 'successful', 'failed', 'refunded'], default: 'pending' },
    paymentDate: { type: Date, default: Date.now },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true, maxlength: 500 },
    refundedAmount: { type: Number, default: 0, min: 0 },
    refunds: { type: [refundSchema], default: [] },
  },
  { timestamps: true },
);
paymentSchema.index({ paymentId: 1 }, { unique: true });
paymentSchema.index({ transactionReference: 1 }, { unique: true });
paymentSchema.index({ idempotencyKey: 1 }, { unique: true });
paymentSchema.index({ paymentStatus: 1, paymentDate: -1 });
paymentSchema.index({ invoiceId: 1, paymentDate: -1 });
export default mongoose.model('Payment', paymentSchema);
