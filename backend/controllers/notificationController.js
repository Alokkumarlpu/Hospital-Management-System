import { Notification } from '../models/index.js';

export async function listNotifications(req, res, next) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipientUserId: req.user._id }).sort({ createdAt: -1 }).limit(100),
      Notification.countDocuments({ recipientUserId: req.user._id, readAt: null }),
    ]);
    res.json({ success: true, notifications, unreadCount });
  } catch (error) { next(error); }
}

export async function markNotificationRead(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientUserId: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true },
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, notification });
  } catch (error) { next(error); }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await Notification.updateMany({ recipientUserId: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ success: true, updated: result.modifiedCount });
  } catch (error) { next(error); }
}