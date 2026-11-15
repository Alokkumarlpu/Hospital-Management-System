import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    documentId: { type: String, required: true, trim: true, uppercase: true },
    documentType: { type: String, enum: ['prescription', 'diagnostic_report', 'visit_summary', 'invoice'], required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    visitRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'VisitRecord' },
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
    diagnosticReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'DiagnosticReport' },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    storageKey: { type: String, required: true, trim: true },
    mimeType: { type: String, default: 'application/pdf' },
    fileSize: { type: Number, required: true, min: 1 },
    version: { type: Number, default: 1, min: 1 },
    generationStatus: { type: String, enum: ['generated', 'failed'], default: 'generated' },
    status: { type: String, enum: ['draft', 'processing', 'finalized', 'released', 'pending', 'rejected', 'archived'], default: 'pending' },
    availability: {
      patient: { type: Boolean, default: false },
      frontDesk: { type: Boolean, default: true },
    },
    generatedAt: { type: Date, default: Date.now },
    releasedAt: { type: Date },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    errorMessage: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

documentSchema.index({ documentId: 1 }, { unique: true });
documentSchema.index({ documentType: 1, patientId: 1, createdAt: -1 });
documentSchema.index({ prescriptionId: 1 }, { unique: true, sparse: true });
documentSchema.index({ diagnosticReportId: 1 }, { unique: true, sparse: true });
documentSchema.index({ invoiceId: 1 }, { unique: true, sparse: true });
documentSchema.index({ visitRecordId: 1, documentType: 1 }, { unique: true });

export default mongoose.model('Document', documentSchema);
