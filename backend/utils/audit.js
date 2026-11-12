import { AuditLog } from '../models/index.js';

export async function writeAuditLog({ userId, action, entityType, entityId, metadata = {} }) {
  return AuditLog.create({ userId, action, entityType, entityId, metadata });
}
