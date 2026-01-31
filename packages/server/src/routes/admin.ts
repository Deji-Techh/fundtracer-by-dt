import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getFirestore } from '../firebase.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
const SALT_ROUNDS = 12;

// Simple UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Create default superadmin on first run
export async function createDefaultAdmin(): Promise<void> {
  const db = getFirestore();
  
  try {
    // Check if any admin exists
    const adminsQuery = await db.collection('adminUsers').limit(1).get();
    
    if (adminsQuery.empty) {
      console.log('[ADMIN] Creating default superadmin account...');
      
      const uid = generateUUID();
      const passwordHash = await bcrypt.hash('fundtracer_2026', SALT_ROUNDS);
      
      await db.collection('adminUsers').doc(uid).set({
        uid,
        username: 'fundtracer_admin',
        email: 'admin@fundtracer.xyz',
        passwordHash,
        role: 'superadmin',
        permissions: ['*'], // All permissions
        isActive: true,
        createdAt: Date.now(),
        lastLogin: null
      });
      
      console.log('[ADMIN] Default superadmin created successfully');
      console.log('[ADMIN] Username: fundtracer_admin');
      console.log('[ADMIN] Password: fundtracer_2026');
    }
  } catch (error) {
    console.error('[ADMIN] Failed to create default admin:', error);
  }
}

// Admin Login
router.post('/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  console.log(`[ADMIN] Login attempt: ${username}`);

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const db = getFirestore();
    
    // Find admin by username
    const adminQuery = await db.collection('adminUsers')
      .where('username', '==', username.toLowerCase())
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    if (adminQuery.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const adminDoc = adminQuery.docs[0];
    const adminData = adminDoc.data();

    // Verify password
    const passwordValid = await bcrypt.compare(password, adminData.passwordHash);
    
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await db.collection('adminUsers').doc(adminData.uid).update({
      lastLogin: Date.now()
    });

    // Generate JWT (24 hour expiry)
    const token = jwt.sign({
      uid: adminData.uid,
      username: adminData.username,
      email: adminData.email,
      role: adminData.role,
      permissions: adminData.permissions,
      type: 'admin'
    }, JWT_SECRET, { expiresIn: '24h' });

    console.log(`[ADMIN] Login successful: ${username} (${adminData.role})`);

    res.json({
      token,
      admin: {
        uid: adminData.uid,
        username: adminData.username,
        email: adminData.email,
        role: adminData.role
      }
    });

  } catch (error) {
    console.error('[ADMIN] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current admin
router.get('/auth/me', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.type !== 'admin') {
    return res.status(401).json({ error: 'Not authenticated as admin' });
  }

  try {
    const db = getFirestore();
    const adminDoc = await db.collection('adminUsers').doc(req.user.uid).get();
    
    if (!adminDoc.exists) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const adminData = adminDoc.data();
    
    res.json({
      uid: adminData?.uid,
      username: adminData?.username,
      email: adminData?.email,
      role: adminData?.role,
      lastLogin: adminData?.lastLogin
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin data' });
  }
});

// Get Dashboard Stats
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    
    // Get all users count
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;
    
    // Get tier breakdown
    let freeUsers = 0, proUsers = 0, maxUsers = 0;
    usersSnapshot.forEach(doc => {
      const tier = doc.data().tier || 'free';
      if (tier === 'free') freeUsers++;
      else if (tier === 'pro') proUsers++;
      else if (tier === 'max') maxUsers++;
    });
    
    // Get verified users
    const verifiedSnapshot = await db.collection('users')
      .where('isVerified', '==', true)
      .get();
    const verifiedUsers = verifiedSnapshot.size;
    
    // Get banned users
    const bannedSnapshot = await db.collection('users')
      .where('bannedAt', '!=', null)
      .get();
    const bannedUsers = bannedSnapshot.size;
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate total analyses (sum of daily usage)
    let totalAnalyses = 0;
    usersSnapshot.forEach(doc => {
      const dailyUsage = doc.data().dailyUsage || {};
      totalAnalyses += Object.values(dailyUsage).reduce((a: number, b: unknown) => a + (typeof b === 'number' ? b : 0), 0);
    });
    
    // Get today's analyses
    const todayAnalyses = usersSnapshot.docs.reduce((sum, doc) => {
      const dailyUsage = doc.data().dailyUsage || {};
      return sum + (dailyUsage[today] || 0);
    }, 0);

    res.json({
      totalUsers,
      freeUsers,
      proUsers,
      maxUsers,
      verifiedUsers,
      bannedUsers,
      totalAnalyses,
      todayAnalyses,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[ADMIN] Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get Users List
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const { page = 1, limit = 50, search = '', tier = '', sort = 'createdAt', order = 'desc' } = req.query;
    
    let query: ReturnType<typeof db.collection> | ReturnType<ReturnType<typeof db.collection>['where']> = db.collection('users');
    
    // Apply filters
    if (tier && tier !== 'all') {
      query = query.where('tier', '==', tier);
    }
    
    // Get all matching users (Firestore doesn't support text search)
    const snapshot = await query.get();
    let users: any[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Text search on username or email
      if (search) {
        const searchLower = (search as string).toLowerCase();
        const username = (data.username || '').toLowerCase();
        const email = (data.email || '').toLowerCase();
        if (!username.includes(searchLower) && !email.includes(searchLower)) {
          return;
        }
      }
      
      users.push({
        uid: data.uid,
        username: data.username,
        email: data.email,
        tier: data.tier || 'free',
        isVerified: data.isVerified || false,
        walletAddress: data.walletAddress || null,
        bannedAt: data.bannedAt || null,
        createdAt: data.createdAt,
        lastLogin: data.lastLogin
      });
    });
    
    // Sort
    users.sort((a, b) => {
      const aVal = a[sort as string] || 0;
      const bVal = b[sort as string] || 0;
      return order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    
    // Paginate
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginatedUsers = users.slice(startIndex, startIndex + Number(limit));
    
    res.json({
      users: paginatedUsers,
      total: users.length,
      page: Number(page),
      totalPages: Math.ceil(users.length / Number(limit))
    });
  } catch (error) {
    console.error('[ADMIN] Users list error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get Single User
router.get('/users/:uid', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(req.params.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const data = userDoc.data();
    
    res.json({
      uid: data?.uid,
      username: data?.username,
      email: data?.email,
      tier: data?.tier || 'free',
      isVerified: data?.isVerified || false,
      walletAddress: data?.walletAddress || null,
      bannedAt: data?.bannedAt || null,
      banReason: data?.banReason || null,
      adminNotes: data?.adminNotes || null,
      createdAt: data?.createdAt,
      lastLogin: data?.lastLogin,
      dailyUsage: data?.dailyUsage || {}
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update User
router.patch('/users/:uid', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const { tier, adminNotes } = req.body;
    
    const updates: any = {};
    if (tier) updates.tier = tier;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    
    await db.collection('users').doc(req.params.uid).update(updates);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Ban User
router.post('/users/:uid/ban', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const { reason } = req.body;
    
    await db.collection('users').doc(req.params.uid).update({
      bannedAt: Date.now(),
      bannedBy: req.user?.uid,
      banReason: reason || 'Violation of terms'
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Unban User
router.post('/users/:uid/unban', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const { FieldValue } = await import('firebase-admin/firestore');
    
    await db.collection('users').doc(req.params.uid).update({
      bannedAt: FieldValue.delete(),
      bannedBy: FieldValue.delete(),
      banReason: FieldValue.delete()
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Create New Admin (Superadmin only)
router.post('/admins', async (req: AuthenticatedRequest, res: Response) => {
  // Check if superadmin
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only superadmins can create admins' });
  }

  try {
    const db = getFirestore();
    const { username, email, password, role } = req.body;
    
    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!['admin', 'moderator'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if username exists
    const existingQuery = await db.collection('adminUsers')
      .where('username', '==', username.toLowerCase())
      .limit(1)
      .get();
    
    if (!existingQuery.empty) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const uid = generateUUID();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    const permissions = role === 'admin' 
      ? ['users.read', 'users.write', 'users.ban', 'analytics.read', 'content.write']
      : ['users.read', 'users.ban', 'analytics.read'];

    await db.collection('adminUsers').doc(uid).set({
      uid,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash,
      role,
      permissions,
      isActive: true,
      createdAt: Date.now(),
      lastLogin: null
    });
    
    res.json({ success: true, uid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

export { router as adminRoutes };
