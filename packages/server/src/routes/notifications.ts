import { Router, Request, Response } from 'express';
import { getFirestore } from '../firebase.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

// Note: Auth middleware is applied at the router level in index.ts
// All routes here expect req.user to be populated

// Get all notifications for user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const db = getFirestore();
    
    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    res.json({ notifications });
  } catch (error) {
    console.error('[Notifications] Get error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Create a new notification
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { type, title, message, data } = req.body;
    
    if (!type || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const db = getFirestore();
    const docRef = await db.collection('notifications').add({
      userId,
      type,
      title,
      message,
      data: data || null,
      read: false,
      createdAt: new Date(),
    });
    
    res.json({ id: docRef.id, success: true });
  } catch (error) {
    console.error('[Notifications] Create error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Mark notification as read
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const db = getFirestore();
    
    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data()?.userId !== userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await docRef.update({ read: true });
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Notifications] Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const db = getFirestore();
    
    const batch = db.batch();
    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();
    
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });
    
    await batch.commit();
    
    res.json({ success: true, count: snapshot.size });
  } catch (error) {
    console.error('[Notifications] Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Delete a notification
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const db = getFirestore();
    
    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data()?.userId !== userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await docRef.delete();
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Notifications] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Delete all notifications
router.delete('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const db = getFirestore();
    
    const batch = db.batch();
    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .get();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    res.json({ success: true, count: snapshot.size });
  } catch (error) {
    console.error('[Notifications] Clear all error:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

export default router;
