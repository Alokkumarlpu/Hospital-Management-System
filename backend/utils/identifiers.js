import crypto from 'node:crypto';

export function createPublicId(prefix) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${suffix}`;
}
