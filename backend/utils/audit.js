import { AuditLog } from '../models/index.js';

const secretKeys = /password|token|secret|credential|authorization/i;

function safeMetadata(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(safeMetadata);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !secretKeys.test(key))
      .map(([key, item]) => [key, typeof item === 'object' ? safeMetadata(item) : item]),
  );
}

export async function writeAuditLog({
  userId, action, entityType, entityId, description, metadata = {}, req,
}) {
  return AuditLog.create({
    userId,
    action,
    entityType,
    entityId,
    description,
    metadata: safeMetadata(metadata),
    ipAddress: req?.ip,
    requestId: req?.id || req?.get('x-request-id'),
  });
}
