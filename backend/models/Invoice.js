import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema(
  {
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'BillableService' },
    description: { type: String, required: true, trim: true },
    category: { type: String, trim: true, maxlength: 100 },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0.01 },
    amount: { type: Number, required: true, min: 0.01 },
  },
  { _id: false },
);
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, trim: true, uppercase: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    visitRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'VisitRecord' },
    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    lineItems: { type: [lineItemSchema], required: true, validate: [(items) => items.length > 0, 'At least one line item is required'] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0.01 },
    amountPaid: { type: Number, default: 0, min: 0 },
    outstandingBalance: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['draft', 'unpaid', 'partially_paid', 'paid', 'cancelled', 'overdue'], default: 'unpaid' },
    generationType: { type: String, enum: ['automatic', 'manual'], default: 'manual' },
    generationStatus: { type: String, enum: ['auto_generated', 'pending_review', 'failed', 'approved'], default: 'approved' },
    generationError: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  },
  { timestamps: true },
);
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ appointmentId: 1 }, { unique: true, sparse: true });
invoiceSchema.index({ status: 1, createdAt: -1 });
invoiceSchema.index({ patientId: 1, invoiceDate: -1 });
invoiceSchema.index({ dueDate: 1, status: 1 });
export default mongoose.model('Invoice', invoiceSchema);
