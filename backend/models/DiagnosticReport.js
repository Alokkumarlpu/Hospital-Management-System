import mongoose from 'mongoose';

const diagnosticReportSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true, trim: true, uppercase: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    visitRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'VisitRecord', required: true },
    reportName: { type: String, required: true, trim: true, maxlength: 200 },
    testCategory: { type: String, trim: true, maxlength: 100 },
    laboratory: { type: String, trim: true, maxlength: 200 },
    status: { type: String, enum: ['requested', 'pending', 'completed', 'verified', 'released', 'cancelled'], default: 'requested' },
    reportDate: { type: Date, required: true, default: Date.now },
    description: { type: String, trim: true, maxlength: 5000 },
    reportNotes: { type: String, trim: true, maxlength: 5000 },
    findings: { type: String, trim: true, maxlength: 10000 },
    observations: { type: String, trim: true, maxlength: 10000 },
    doctorNotes: { type: String, trim: true, maxlength: 10000 },
    results: [{
      parameterName: { type: String, required: true, trim: true, maxlength: 200 },
      resultValue: { type: mongoose.Schema.Types.Mixed, required: true },
      unit: { type: String, trim: true, maxlength: 50 },
      referenceRange: { type: String, trim: true, maxlength: 100 },
      resultStatus: { type: String, trim: true, maxlength: 50 },
    }],
    version: { type: Number, default: 1, min: 1 },
    fileMetadata: {
      fileName: { type: String, trim: true },
      mimeType: { type: String, trim: true },
      storageKey: { type: String, trim: true },
      sizeBytes: { type: Number, min: 0 },
    },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lockedAt: { type: Date, default: null },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  },
  { timestamps: true },
);
diagnosticReportSchema.index({ reportId: 1 }, { unique: true });
diagnosticReportSchema.index({ patientId: 1, reportDate: -1 });
diagnosticReportSchema.index({ visitRecordId: 1 });
diagnosticReportSchema.index({ patientId: 1, appointmentId: 1, doctorId: 1 });
export default mongoose.model('DiagnosticReport', diagnosticReportSchema);
