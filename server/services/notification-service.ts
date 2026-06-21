import express from 'express';
import { NotificationModel } from '../db.js';
import { nanoid } from 'nanoid';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Retrieve all notifications
router.get('/list', async (req: AuthRequest, res) => {
  try {
    const notifications = await NotificationModel.find({ tenantId: req.user?.tenantId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(notifications);
  } catch (err: any) {
    console.error('Error in /notifications/list route:', err.message);
    // Return a graceful empty array fallback to prevent polling or connection errors from breaking the UI
    res.json([]);
  }
});

// Mark single notification as read
router.put('/:id/read', async (req: AuthRequest, res) => {
  try {
    const notification = await NotificationModel.findOneAndUpdate(
      { id: req.params.id, tenantId: req.user?.tenantId },
      { $set: { read: true } },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(notification);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update notification' });
  }
});

// Mark all as read
router.put('/read-all', async (req: AuthRequest, res) => {
  try {
    await NotificationModel.updateMany(
      { tenantId: req.user?.tenantId, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to mark all as read' });
  }
});

// Clear all notifications
router.delete('/clear-all', async (req: AuthRequest, res) => {
  try {
    await NotificationModel.deleteMany({ tenantId: req.user?.tenantId });
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to clear notifications' });
  }
});

// Helper function to create a notification
export async function createNotification(
  tenantId: string,
  title: string,
  message: string,
  type: 'sale' | 'low_stock' | 'payment' | 'expense' | 'purchase' | 'customer' | 'general'
) {
  try {
    const n = new NotificationModel({
      id: nanoid(),
      tenantId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    });
    await n.save();
    return n;
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

export default router;
