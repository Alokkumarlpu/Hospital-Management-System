import mongoose from 'mongoose';

const clinicalNoteSchema = new mongoose.Schema(
  {
    visitRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'VisitRecord', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    chiefComplaint: { type: String, trim: true, maxlength: 200 },
    historyOfPresentIllness: { type: String, trim: true, maxlength: 10000 },
    examinationFindings: { type: String, trim: true, maxlength: 10000 },
    clinicalObservations: { type: String, trim: true, maxlength: 10000 },
    assessment: { type: String, trim: true, maxlength: 10000 },
    treatmentPlan: { type: String, trim: true, maxlength: 10000 },
    followUpInstructions: { type: String, trim: true, maxlength: 5000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lockedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

clinicalNoteSchema.index({ visitRecordId: 1, createdAt: -1 });
clinicalNoteSchema.index({ patientId: 1, createdAt: -1 });

export default mongoose.model('ClinicalNote', clinicalNoteSchema);
