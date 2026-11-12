import mongoose from 'mongoose';

const doctorScheduleSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    workingDay: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], required: true },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    slotDuration: { type: Number, required: true, min: 5, max: 240 },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true },
);
doctorScheduleSchema.index({ doctorId: 1, workingDay: 1, startTime: 1 }, { unique: true });
export default mongoose.model('DoctorSchedule', doctorScheduleSchema);
