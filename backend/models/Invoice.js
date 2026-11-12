import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    lineItems: { type: [lineItemSchema], required: true, validate: [(items) => items.length > 0, 'At least one line item is required'] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: ['unpaid', 'partially_paid', 'paid', 'refunded'], default: 'unpaid' },
  },
  { timestamps: true },
);
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ paymentStatus: 1, createdAt: -1 });
export default mongoose.model('Invoice', invoiceSchema);
