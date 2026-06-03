import { getFirestore } from '../firebase.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { Response } from 'express';

export async function checkRoomAccess(
  req: AuthenticatedRequest,
  res: Response,
  roomId: string,
  requiredRole?: 'owner' | 'admin'
): Promise<{ allowed: boolean; role?: string }> {
  const userId = req.user?.uid;
  if (!userId) return { allowed: false };

  const db = getFirestore();
  const memberDoc = await db.collection('investigation_rooms').doc(roomId)
    .collection('members').doc(userId).get();

  if (!memberDoc.exists) return { allowed: false };

  const role = memberDoc.data()?.role;
  if (requiredRole === 'owner' && role !== 'owner') return { allowed: false };
  if (requiredRole === 'admin' && role !== 'owner' && role !== 'admin') return { allowed: false };

  return { allowed: true, role };
}

export async function checkRoomLimit(userId: string): Promise<{ allowed: boolean; current: number; max: number }> {
  const db = getFirestore();
  const roomsSnapshot = await db.collection('investigation_rooms')
    .where('createdBy', '==', userId).count().get();
  const current = roomsSnapshot.data().count;
  return { allowed: true, current, max: Infinity };
}

export async function checkMemberLimit(roomId: string): Promise<{ allowed: boolean; current: number; max: number }> {
  const db = getFirestore();
  const membersSnapshot = await db.collection('investigation_rooms').doc(roomId)
    .collection('members').count().get();
  const current = membersSnapshot.data().count;
  return { allowed: true, current, max: Infinity };
}
