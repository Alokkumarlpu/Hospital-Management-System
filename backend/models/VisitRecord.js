import mongoose from 'mongoose';

const visitRecordSchema = new mongoose.Schema(
  {
    visitId: { type: String, required: true, trim: true, uppercase: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    visitDate: { type: Date, required: true, default: Date.now },
    chiefComplaint: { type: String, trim: true, maxlength: 200 },
    symptoms: { type: String, trim: true, maxlength: 5000 },
    clinicalObservations: { type: String, trim: true, maxlength: 10000 },
    vitalSigns: {
      bloodPressure: { type: String, trim: true, maxlength: 30 },
      pulse: { type: Number, min: 0, max: 300 },
      temperature: { type: Number, min: 20, max: 50 },
      respiratoryRate: { type: Number, min: 0, max: 100 },
      oxygenSaturation: { type: Number, min: 0, max: 100 },
      weight: { type: Number, min: 0, max: 1000 },
    },
    assessmentNotes: { type: String, trim: true, maxlength: 10000 },
    treatmentPlan: { type: String, trim: true, maxlength: 10000 },
    additionalNotes: { type: String, trim: true, maxlength: 10000 },
    followUpDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lockedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
visitRecordSchema.index({ visitId: 1 }, { unique: true });
visitRecordSchema.index({ patientId: 1, visitDate: -1 });
export default mongoose.model('VisitRecord', visitRecordSchema);
