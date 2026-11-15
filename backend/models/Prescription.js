import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema(
  {
    medicineName: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    dosageUnit: { type: String, trim: true, maxlength: 30 },
    frequency: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    route: { type: String, trim: true, maxlength: 100 },
    instructions: { type: String, trim: true },
    quantity: { type: Number, min: 0 },
  },
  { _id: false },
);
const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionId: { type: String, required: true, trim: true, uppercase: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    visitRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'VisitRecord', required: true },
    medicines: { type: [medicineSchema], required: true, validate: [(items) => items.length > 0, 'At least one medicine is required'] },
    diagnosisOrAssessment: { type: String, trim: true, maxlength: 5000 },
    instructions: { type: String, trim: true, maxlength: 5000 },
    followUpDate: { type: Date },
    version: { type: Number, default: 1, min: 1 },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
    prescribedDate: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lockedAt: { type: Date, default: null },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  },
  { timestamps: true },
);
prescriptionSchema.index({ prescriptionId: 1 }, { unique: true });
prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ visitRecordId: 1 });
prescriptionSchema.index({ patientId: 1, appointmentId: 1, doctorId: 1 });
export default mongoose.model('Prescription', prescriptionSchema);
