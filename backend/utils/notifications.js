import { Notification } from '../models/index.js';

export async function createNotification({ recipientUserId, type, title, message, link, metadata, deduplicationKey }) {
  if (!recipientUserId) return null;
  if (deduplicationKey) return Notification.findOneAndUpdate(
    { recipientUserId, deduplicationKey },
    { $setOnInsert: { type, title, message, link, metadata } },
    { upsert: true, new: true },
  );
  return Notification.create({ recipientUserId, type, title, message, link, metadata });
}
