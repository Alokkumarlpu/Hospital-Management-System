import mongoose from 'mongoose';

const visitRecordSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    visitDate: { type: Date, required: true, default: Date.now },
    clinicalNotes: { type: String, required: true, trim: true, maxlength: 10000 },
    followUpDate: { type: Date },
  },
  { timestamps: true },
);
visitRecordSchema.index({ patientId: 1, visitDate: -1 });
export default mongoose.model('VisitRecord', visitRecordSchema);
