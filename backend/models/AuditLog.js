import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, trim: true, maxlength: 100 },
    entityType: { type: String, required: true, trim: true, maxlength: 100 },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    description: { type: String, trim: true, maxlength: 500 },
    ipAddress: { type: String, trim: true, maxlength: 100 },
    requestId: { type: String, trim: true, maxlength: 200 },
    timestamp: { type: Date, default: Date.now, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
export default mongoose.model('AuditLog', auditLogSchema);
