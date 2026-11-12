import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, required: true, trim: true, uppercase: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    appointmentDate: { type: Date, required: true },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    slotKey: { type: String, required: true, select: false },
    appointmentType: { type: String, enum: ['consultation', 'follow_up'], default: 'consultation' },
    status: { type: String, enum: ['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'], default: 'scheduled' },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cancellationReason: { type: String, trim: true, maxlength: 500 },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: { type: Date },
  },
  { timestamps: true },
);
appointmentSchema.index({ appointmentId: 1 }, { unique: true });
appointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, slotKey: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['scheduled', 'confirmed', 'checked_in', 'in_progress'] } } },
);
appointmentSchema.index({ doctorId: 1, appointmentDate: 1, startTime: 1, endTime: 1, status: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
export default mongoose.model('Appointment', appointmentSchema);
