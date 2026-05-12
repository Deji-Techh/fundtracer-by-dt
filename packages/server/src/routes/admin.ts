import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getFirestore } from '../firebase.js';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { getAllLinkedUsers } from '../services/TelegramBot.js';
import { sendEmail } from '../services/EmailService.js';

console.log('[ADMIN] Loading admin routes module - TIMESTAMP: 2026-01-31-v3');

const router = Router();

// SECURITY: JWT_SECRET must be set in environment (checked at runtime, not module load)
const getJwtSecret = () => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET environment variable is not set');
    process.exit(1);
  }
  return JWT_SECRET;
};

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
      const passwordHash = await bcrypt.hash('Ayodeji2008', SALT_ROUNDS);
      
      await db.collection('adminUsers').doc(uid).set({
        uid,
        username: 'fundtracer',
        email: 'admin@fundtracer.xyz',
        passwordHash,
        role: 'superadmin',
        permissions: ['*'],
        isActive: true,
        createdAt: Date.now(),
        lastLogin: null
      });
      
      console.log('[ADMIN] Default superadmin created successfully');
      console.log('[ADMIN] Username: fundtracer');
      console.log('[ADMIN] Password: [REDACTED]');
    }
  } catch (error) {
    console.error('[ADMIN] Failed to create default admin:', error);
  }
}

// Admin Login
router.post('/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  console.log(`[ADMIN] Login attempt v2: ${username}`);
  console.log(`[ADMIN] Request body:`, req.body);
  console.log(`[ADMIN] Headers:`, req.headers['content-type']);

  if (!username || !password) {
    console.log(`[ADMIN] Missing credentials: username=${!!username}, password=${!!password}`);
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const db = getFirestore();
    const searchUsername = username.toLowerCase();
    console.log(`[ADMIN] Searching for username (lowercase): ${searchUsername}`);
    
    // Find admin by username
    const adminQuery = await db.collection('adminUsers')
      .where('username', '==', searchUsername)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    console.log(`[ADMIN] Query result: ${adminQuery.empty ? 'EMPTY' : `Found ${adminQuery.docs.length} docs`}`);
    
    if (adminQuery.empty) {
      // Debug: list all admin users to see what's in the database
      const allAdmins = await db.collection('adminUsers').limit(5).get();
      console.log(`[ADMIN] Total admin users in DB: ${allAdmins.size}`);
      allAdmins.forEach(doc => {
        console.log(`[ADMIN] Existing admin: ${doc.data().username} (isActive: ${doc.data().isActive})`);
      });
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
    }, getJwtSecret(), { expiresIn: '24h' });

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

// Get current admin (protected)
router.get('/auth/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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

// Get Dashboard Stats (protected)
router.get('/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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
    
    // Calculate total analyses - use daily_stats records first
    let totalAnalyses = 0;
    try {
      const dailyStatsSnap = await db.collection('analytics').doc('daily_stats').collection('records')
        .select('analysisCount').get();
      if (!dailyStatsSnap.empty) {
        dailyStatsSnap.forEach(doc => {
          totalAnalyses += doc.data().analysisCount || 0;
        });
      } else {
        // Fallback: count scanHistory items across all users
        const users = await db.collection('users').select().get();
        let scanCount = 0;
        for (const userDoc of users.docs) {
          const scanSnap = await db.collection('scanHistory').doc(userDoc.id).collection('items').get();
          scanCount += scanSnap.size;
          if (scanCount > 50000) break; // safety limit
        }
        totalAnalyses = scanCount;
      }
    } catch { /* fallback */ }
    
    // Get today's analyses
    const todayAnalyses = usersSnapshot.docs.reduce((sum, doc) => {
      const dailyUsage = doc.data().dailyUsage || {};
      return sum + (dailyUsage[today] || 0);
    }, 0);

    // Get Telegram users count
    let telegramUsers = 0;
    try {
      const { getAllLinkedUsers } = await import('../services/TelegramBot.js');
      telegramUsers = getAllLinkedUsers().length;
    } catch { /* telegram bot may not be initialized */ }

    // Get CLI/rewards users count
    let cliUsers = 0;
    try {
      const cliSnapshot = await db.collection('torque_wallets').get();
      cliUsers = cliSnapshot.size;
    } catch { /* collection may not exist */ }

    // Get chat sessions count
    let totalChatSessions = 0;
    try {
      const chatSnapshot = await db.collection('chat_sessions').count().get();
      totalChatSessions = chatSnapshot.data().count || 0;
    } catch { /* fallback */ }

    res.json({
      stats: {
        totalVisitors: totalUsers,
        activeUsers: totalUsers - bannedUsers,
        pohVerifiedUsers: verifiedUsers,
        totalRevenue: 0,
        totalAnalyses,
        freeUsers,
        proUsers,
        maxUsers,
        blacklistedUsers: bannedUsers,
        telegramUsers,
        cliUsers,
        totalChatSessions
      },
      chainUsage: {},
      featureUsage: {},
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[ADMIN] Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get Recent Activity (protected)
router.get('/activity', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    
    // Get recent admin actions from admin_actions collection
    const actionsSnapshot = await db.collection('admin_actions')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    
    const activities = actionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.action || 'unknown',
        userId: data.userId || '',
        userEmail: data.userEmail || '',
        details: data.details || {},
        timestamp: data.timestamp || Date.now()
      };
    });
    
    res.json({ activities });
  } catch (error) {
    console.error('[ADMIN] Activity error:', error);
    // Return empty array if collection doesn't exist or error
    res.json({ activities: [] });
  }
});

// Get Users List
router.get('/users', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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
        displayName: data.displayName,
        email: data.email,
        tier: data.tier || 'free',
        isVerified: data.isVerified || false,
        walletAddress: data.walletAddress || null,
        bannedAt: data.bannedAt || null,
        authProvider: data.authProvider || null,
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
router.get('/users/:uid', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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
      displayName: data?.displayName,
      email: data?.email,
      tier: data?.tier || 'free',
      isVerified: data?.isVerified || false,
      walletAddress: data?.walletAddress || null,
      bannedAt: data?.bannedAt || null,
      banReason: data?.banReason || null,
      adminNotes: data?.adminNotes || null,
      createdAt: data?.createdAt,
      lastLogin: data?.lastLogin,
      dailyUsage: data?.dailyUsage || {},
      authProvider: data?.authProvider || null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update User (protected)
router.patch('/users/:uid', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const { tier, pohVerified } = req.body;
    const userId = req.params.uid;
    
    const updates: any = {};
    if (tier) {
      updates.tier = tier;
      // Log tier change activity
      await db.collection('admin_actions').add({
        action: 'tier_change',
        userId: userId,
        newTier: tier,
        adminId: req.user?.uid,
        timestamp: Date.now()
      });
    }
    if (pohVerified !== undefined) {
      updates.pohVerified = pohVerified;
      // Log PoH verification activity
      await db.collection('admin_actions').add({
        action: pohVerified ? 'poh_verify' : 'poh_unverify',
        userId: userId,
        adminId: req.user?.uid,
        timestamp: Date.now()
      });
    }
    
    await db.collection('users').doc(userId).update(updates);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[ADMIN] Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Ban User
router.post('/users/:uid/ban', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const { reason } = req.body;
    const userId = req.params.uid;
    
    // Get user email for activity log
    const userDoc = await db.collection('users').doc(userId).get();
    const userEmail = userDoc.exists ? userDoc.data()?.email : '';
    
    await db.collection('users').doc(userId).update({
      bannedAt: Date.now(),
      bannedBy: req.user?.uid,
      banReason: reason || 'Violation of terms'
    });
    
    // Log ban activity
    await db.collection('admin_actions').add({
      action: 'blacklist',
      userId: userId,
      userEmail: userEmail,
      reason: reason || 'Violation of terms',
      adminId: req.user?.uid,
      timestamp: Date.now()
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('[ADMIN] Ban user error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Unban User
router.post('/users/:uid/unban', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const { FieldValue } = await import('firebase-admin/firestore');
    const userId = req.params.uid;
    
    // Get user email for activity log
    const userDoc = await db.collection('users').doc(userId).get();
    const userEmail = userDoc.exists ? userDoc.data()?.email : '';
    
    await db.collection('users').doc(userId).update({
      bannedAt: FieldValue.delete(),
      bannedBy: FieldValue.delete(),
      banReason: FieldValue.delete()
    });
    
    // Log unban activity
    await db.collection('admin_actions').add({
      action: 'unblacklist',
      userId: userId,
      userEmail: userEmail,
      adminId: req.user?.uid,
      timestamp: Date.now()
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('[ADMIN] Unban user error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Create New Admin (Superadmin only)
router.post('/admins', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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

// ============================================================
// NEW: Get user API Keys (full=true returns unmasked keys)
router.get('/users/:uid/api-keys', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const showFull = req.query.full === 'true';
    const keysSnapshot = await db.collection('users').doc(req.params.uid).collection('apiKeys')
      .orderBy('createdAt', 'desc')
      .get();

    const keys = keysSnapshot.docs.map(doc => {
      const data = doc.data();
      const fullKey = data.key || '';
      const masked = fullKey.length > 12
        ? fullKey.slice(0, 8) + '••••' + fullKey.slice(-4)
        : '••••••••';
      return {
        id: doc.id,
        name: data.name || 'Unnamed',
        key: showFull ? fullKey : masked,
        type: data.type || 'test',
        createdAt: data.createdAt || 0,
        lastUsed: data.lastUsed || null,
        requests: data.requests || 0,
        active: data.active !== false,
      };
    });

    res.json({ keys });
  } catch (error) {
    console.error('[ADMIN] API keys error:', error);
    res.json({ keys: [] });
  }
});

// NEW: Revoke (delete) a user's API key
router.delete('/users/:uid/api-keys/:keyId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    await db.collection('users').doc(req.params.uid).collection('apiKeys').doc(req.params.keyId).delete();
    // Also try to delete from top-level apiKeys collection if it exists
    try {
      const topLevelDoc = await db.collection('apiKeys').doc(req.params.keyId).get();
      if (topLevelDoc.exists) {
        await db.collection('apiKeys').doc(req.params.keyId).delete();
      }
    } catch { /* top-level may not exist */ }
    // Log admin action
    await db.collection('admin_actions').add({
      action: 'revoke_api_key',
      userId: req.params.uid,
      adminId: req.user?.uid,
      details: { keyId: req.params.keyId },
      timestamp: Date.now(),
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[ADMIN] Revoke API key error:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// ============================================================
// NEW: Get user Scan History
// ============================================================
router.get('/users/:uid/scan-history', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('scanHistory').doc(req.params.uid).collection('items')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    const scans = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        address: data.address || '',
        chain: data.chain || '',
        type: data.type || 'wallet',
        timestamp: data.timestamp || 0,
        riskScore: data.riskScore ?? null,
      };
    });

    res.json({ scans });
  } catch (error) {
    console.error('[ADMIN] Scan history error:', error);
    res.json({ scans: [] });
  }
});

// ============================================================
// NEW: Get user Chat Sessions
// ============================================================
router.get('/users/:uid/chat-sessions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('chat_sessions')
      .where('userId', '==', req.params.uid)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const sessions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Untitled',
        lastMessage: data.lastMessage || '',
        messageCount: data.messageCount || 0,
        timestamp: data.timestamp?.toDate?.()?.getTime() || data.timestamp || 0,
        attachedAddress: data.attachedAddress || null,
        attachedChain: data.attachedChain || null,
      };
    });

    res.json({ sessions });
  } catch (error) {
    console.error('[ADMIN] Chat sessions error:', error);
    res.json({ sessions: [] });
  }
});

// ============================================================
// NEW: Get extended platform stats (CLI, Telegram, Rewards)
// ============================================================
router.get('/stats/platform', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();

    // CLI users count from torque_wallets
    const cliSnapshot = await db.collection('torque_wallets').get();
    const cliUsers = cliSnapshot.size;

    // Total points and scans from torque_wallets
    let totalPoints = 0;
    let totalWalletsScanned = 0;
    cliSnapshot.forEach(doc => {
      const d = doc.data();
      totalPoints += d.totalPoints || 0;
      totalWalletsScanned += d.walletsScanned || 0;
    });

    // Torque activity count
    const activitySnapshot = await db.collection('torque_activity').get();
    const totalActivities = activitySnapshot.size;

    // Telegram users from the bot
    const telegramUsers = getAllLinkedUsers().length;

    // Torque claims count
    let claimsCount = 0;
    try {
      const claimsSnapshot = await db.collection('torque_claims').get();
      claimsCount = claimsSnapshot.size;
    } catch { /* collection may not exist */ }

    // Total chat sessions
    let totalChatSessions = 0;
    try {
      const chatSnapshot = await db.collection('chat_sessions').count().get();
      totalChatSessions = chatSnapshot.data().count || 0;
    } catch { /* fallback */ }

    res.json({
      cliUsers,
      telegramUsers,
      totalPoints,
      totalWalletsScanned,
      totalActivities,
      claimsCount,
      totalChatSessions,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[ADMIN] Platform stats error:', error);
    res.status(500).json({ error: 'Failed to fetch platform stats' });
  }
});

// ============================================================
// NEW: List CLI Users with details
// ============================================================
router.get('/stats/cli-users', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('torque_wallets')
      .orderBy('totalPoints', 'desc')
      .limit(100)
      .get();

    const users = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      let email = '';
      let username = '';
      try {
        const userDoc = await db.collection('users').doc(data.userId).get();
        if (userDoc.exists) {
          const u = userDoc.data();
          email = u?.email || '';
          username = u?.displayName || u?.username || '';
        }
      } catch { /* ignore */ }
      return {
        userId: data.userId,
        displayName: data.displayName || username || 'Unknown',
        email,
        walletsScanned: data.walletsScanned || 0,
        totalPoints: data.totalPoints || 0,
        rank: data.rank || 0,
        firstScanAt: data.firstScanAt || 0,
        lastScanAt: data.lastScanAt || 0,
      };
    }));

    res.json({ users });
  } catch (error) {
    console.error('[ADMIN] CLI users error:', error);
    res.status(500).json({ error: 'Failed to fetch CLI users' });
  }
});

// ============================================================
// NEW: List Telegram Users
// ============================================================
router.get('/stats/telegram-users', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const linkedUsers = getAllLinkedUsers();

    const users = await Promise.all(linkedUsers.map(async (user) => {
      let email = '';
      let username = '';
      try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(user.userId).get();
        if (userDoc.exists) {
          const u = userDoc.data();
          email = u?.email || '';
          username = u?.displayName || u?.username || '';
        }
      } catch { /* ignore */ }
      return {
        userId: user.userId,
        telegramId: user.telegramId,
        displayName: user.displayName || username || 'Unknown',
        email,
        tier: user.tier || 'free',
        walletAddress: user.walletAddress || '',
        alertFrequency: user.alertFrequency || 'realtime',
        linkedAt: user.linkedAt || 0,
        watchCount: user.watches?.length || 0,
      };
    }));

    res.json({ users });
  } catch (error) {
    console.error('[ADMIN] Telegram users error:', error);
    res.status(500).json({ error: 'Failed to fetch Telegram users' });
  }
});

// ============================================================
// REVENUE: Get payment/revenue summary
// ============================================================
router.get('/revenue', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const paymentsSnap = await db.collectionGroup('payments').get();
    let totalRevenue = 0;
    let paymentCount = 0;
    const byTier: Record<string, number> = {};
    const byChain: Record<string, number> = {};
    paymentsSnap.forEach(doc => {
      const d = doc.data();
      totalRevenue += d.amount || 0;
      paymentCount++;
      const tier = d.tierUnlocked || 'unknown';
      byTier[tier] = (byTier[tier] || 0) + (d.amount || 0);
      const chain = d.chain || 'unknown';
      byChain[chain] = (byChain[chain] || 0) + (d.amount || 0);
    });
    res.json({ totalRevenue, paymentCount, byTier, byChain });
  } catch (error) {
    console.error('[ADMIN] Revenue error:', error);
    res.json({ totalRevenue: 0, paymentCount: 0, byTier: {}, byChain: {} });
  }
});

// ============================================================
// REVENUE: Get all payments
// ============================================================
router.get('/revenue/payments', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db.collectionGroup('payments').orderBy('timestamp', 'desc').limit(100).get();
    const payments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ payments });
  } catch (error) {
    console.error('[ADMIN] Payments error:', error);
    res.json({ payments: [] });
  }
});

// ============================================================
// CHAT: Get full conversation for a chat session
// ============================================================
router.get('/users/:uid/chat-messages/:sessionId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('chat_sessions').doc(req.params.sessionId)
      .collection('chat_messages').orderBy('timestamp', 'asc').get();
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ messages });
  } catch (error) {
    console.error('[ADMIN] Chat messages error:', error);
    res.json({ messages: [] });
  }
});

// ============================================================
// NOTIFICATIONS: List all notifications
// ============================================================
router.get('/notifications', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('notifications').orderBy('createdAt', 'desc').limit(100).get();
    const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ notifications });
  } catch (error) {
    console.error('[ADMIN] Notifications error:', error);
    res.json({ notifications: [] });
  }
});

// ============================================================
// NOTIFICATIONS: Broadcast to all users or by tier
// ============================================================
router.post('/notifications/broadcast', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, message, type, targetTier } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message required' });
    }
    const db = getFirestore();
    let usersQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('users');
    if (targetTier && targetTier !== 'all') {
      usersQuery = usersQuery.where('tier', '==', targetTier);
    }
    const usersSnap = await usersQuery.select('uid').get();
    let count = 0;
    // Chunk into batches of 500 (Firestore batch limit)
    let batch = db.batch();
    usersSnap.forEach(doc => {
      const notifRef = db.collection('notifications').doc();
      batch.set(notifRef, {
        userId: doc.id,
        title,
        message,
        type: type || 'admin',
        read: false,
        createdAt: Date.now(),
      });
      count++;
      if (count % 500 === 0) {
        batch.commit().catch(e => console.error('[ADMIN] Batch error:', e));
        batch = db.batch();
      }
    });
    // Commit the final batch
    if (count % 500 !== 0) {
      await batch.commit();
    }
    // Log admin action
    await db.collection('admin_actions').add({
      action: 'broadcast_notification',
      userId: req.user?.uid || '',
      userEmail: `${count} users`,
      adminId: req.user?.uid,
      details: { title, message, type, targetTier, recipientCount: count },
      timestamp: Date.now(),
    });
    res.json({ success: true, recipientCount: count });
  } catch (error) {
    console.error('[ADMIN] Broadcast error:', error);
    res.status(500).json({ error: 'Broadcast failed' });
  }
});

// ============================================================
// REFERRALS: Summary and top referrers
// ============================================================
router.get('/referrals', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const usersSnap = await db.collection('users')
      .where('referralCount', '>', 0)
      .orderBy('referralCount', 'desc')
      .limit(50)
      .get();
    const referrers = usersSnap.docs.map(d => {
      const u = d.data();
      return {
        uid: d.id,
        username: u.username || u.displayName || 'Unknown',
        email: u.email || '',
        referralCode: u.referralCode || '',
        referralCount: u.referralCount || 0,
        referredUsers: u.referredUsers || [],
        createdAt: u.createdAt || 0,
      };
    });
    const codesSnap = await db.collection('referral_codes').get();
    const codes = codesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ referrers, codes, totalReferrers: referrers.length });
  } catch (error) {
    console.error('[ADMIN] Referrals error:', error);
    res.json({ referrers: [], codes: [], totalReferrers: 0 });
  }
});

// ============================================================
// ADMINS: List all admin accounts
// ============================================================
router.get('/admins/list', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('adminUsers').get();
    const admins = snap.docs.map(d => {
      const a = d.data();
      return {
        uid: d.id,
        username: a.username,
        email: a.email,
        role: a.role,
        isActive: a.isActive,
        createdAt: a.createdAt,
        lastLogin: a.lastLogin,
      };
    });
    res.json({ admins });
  } catch (error) {
    console.error('[ADMIN] Admin list error:', error);
    res.json({ admins: [] });
  }
});

// ============================================================
// ADMINS: Delete an admin account
// ============================================================
router.delete('/admins/:uid', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmins can delete admins' });
    }
    const db = getFirestore();
    await db.collection('adminUsers').doc(req.params.uid).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('[ADMIN] Delete admin error:', error);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
});

// ============================================================
// TORQUE: V1 leaderboard
// ============================================================
router.get('/torque/leaderboard', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('torque_user_stats')
      .orderBy('points', 'desc').limit(100).get();
    const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ entries });
  } catch (error) {
    console.error('[ADMIN] Torque leaderboard error:', error);
    res.json({ entries: [] });
  }
});

// ============================================================
// TORQUE: Events
// ============================================================
router.get('/torque/events', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('torque_events')
      .orderBy('timestamp', 'desc').limit(100).get();
    const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ events });
  } catch (error) {
    console.error('[ADMIN] Torque events error:', error);
    res.json({ events: [] });
  }
});

// ============================================================
// TORQUE: Pool stats
// ============================================================
router.get('/torque/pool-stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const doc = await db.collection('torque_pool').doc('global').get();
    const data = doc.data() || {};
    res.json({
      totalPointsClaimed: data.totalPointsClaimed || 0,
      totalEquityClaimed: data.totalEquityClaimed || 0,
      claimCount: data.claimCount || 0,
      lastClaimedAt: data.lastClaimedAt || 0,
    });
  } catch (error) {
    console.error('[ADMIN] Pool stats error:', error);
    res.json({ totalPointsClaimed: 0, totalEquityClaimed: 0, claimCount: 0, lastClaimedAt: 0 });
  }
});

// ============================================================
// RADAR: All alerts
// ============================================================
router.get('/radar/alerts', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('radar_alerts')
      .orderBy('createdAt', 'desc').limit(100).get();
    const alerts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ alerts });
  } catch (error) {
    console.error('[ADMIN] Radar alerts error:', error);
    res.json({ alerts: [] });
  }
});

// ============================================================
// RADAR: Activity
// ============================================================
router.get('/radar/activity', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('radar_activity')
      .orderBy('timestamp', 'desc').limit(100).get();
    const activity = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ activity });
  } catch (error) {
    console.error('[ADMIN] Radar activity error:', error);
    res.json({ activity: [] });
  }
});

// ============================================================
// SYSTEM: Health check
// ============================================================
router.get('/system/health', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    await db.collection('health').doc('check').get();
    res.json({
      status: 'ok',
      firebase: 'connected',
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    res.json({ status: 'degraded', firebase: 'error', timestamp: Date.now(), uptime: process.uptime() });
  }
});

// ============================================================
// EXPORT: Users CSV
// ============================================================
router.get('/export/users', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('users').get();
    const fields = ['uid', 'username', 'email', 'tier', 'createdAt', 'lastLogin', 'bannedAt', 'walletAddress', 'referralCount', 'analysisCount'];
    let csv = fields.join(',') + '\n';
    snap.docs.forEach(doc => {
      const u = doc.data();
      const row = fields.map(f => {
        const val = u[f] ?? '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      });
      csv += row.join(',') + '\n';
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=fundtracer-users-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('[ADMIN] Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// ============================================================
// DAILY STATS: Time-series analytics
// ============================================================
router.get('/stats/daily', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('analytics').doc('daily_stats').collection('records')
      .orderBy('date', 'desc').limit(90).get();
    const daily = snap.docs.map(d => d.data()).filter(d => d.date);
    res.json({ daily });
  } catch (error) {
    console.error('[ADMIN] Daily stats error:', error);
    res.json({ daily: [] });
  }
});

// ============================================================
// FAILED LOGINS: Auth failure monitoring
// ============================================================
router.get('/stats/failed-logins', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('analytics').doc('user_activity').collection('logins')
      .orderBy('timestamp', 'desc').limit(100).get();
    const logins = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ logins });
  } catch (error) {
    console.error('[ADMIN] Failed logins error:', error);
    res.json({ logins: [] });
  }
});

// ============================================================
// NOTIFICATIONS: Delete a notification
// ============================================================
router.delete('/notifications/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    await db.collection('notifications').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('[ADMIN] Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// ============================================================
// TORQUE: Groups
// ============================================================
router.get('/torque/groups', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('torque_groups')
      .orderBy('totalPoints', 'desc').limit(50).get();
    const groups = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ groups });
  } catch (error) {
    console.error('[ADMIN] Torque groups error:', error);
    res.json({ groups: [] });
  }
});

// ============================================================
// EMAILS: Send an email via Resend
// ============================================================
router.post('/emails/send', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'To, subject, and body required' });
    }
    await sendEmail({
      to,
      subject,
      html: body,
      includeBcc: false,
    });
    // Log admin action
    const db = getFirestore();
    await db.collection('admin_actions').add({
      action: 'send_email',
      userId: req.user?.uid || '',
      userEmail: to,
      adminId: req.user?.uid,
      details: { subject },
      timestamp: Date.now(),
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[ADMIN] Email send error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// ============================================================
// MAINTENANCE: Get current maintenance config
// ============================================================
router.get('/maintenance', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const doc = await db.collection('config').doc('maintenance').get();
    const data = doc.data() || {};
    res.json({
      siteDown: data.siteDown || false,
      disabledChains: data.disabledChains || [],
      message: data.message || 'Site is under maintenance. Please check back later.',
    });
  } catch (error) {
    res.json({ siteDown: false, disabledChains: [], message: '' });
  }
});

// ============================================================
// MAINTENANCE: Update maintenance config
// ============================================================
router.post('/maintenance', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const { siteDown, disabledChains, message } = req.body;
    await db.collection('config').doc('maintenance').set({
      siteDown: siteDown === true,
      disabledChains: Array.isArray(disabledChains) ? disabledChains : [],
      message: message || 'Site is under maintenance.',
      updatedAt: Date.now(),
      updatedBy: req.user?.uid,
    }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update maintenance config' });
  }
});

// ============================================================
// FEATURE FLAGS: Get all feature flags
// ============================================================
router.get('/feature-flags', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('config').doc('featureFlags').get();
    const data = snap.data() || {};
    res.json({ flags: data.flags || {} });
  } catch (error) {
    res.json({ flags: {} });
  }
});

// ============================================================
// FEATURE FLAGS: Update a feature flag
// ============================================================
router.post('/feature-flags', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const { key, enabled, description } = req.body;
    if (!key) return res.status(400).json({ error: 'Flag key required' });
    await db.collection('config').doc('featureFlags').set({
      [`flags.${key}`]: { enabled: enabled === true, description: description || '', updatedAt: Date.now() }
    }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
});

// ============================================================
// USERS: Bulk actions (batch ban/upgrade)
// ============================================================
router.post('/users/bulk', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const { action, uids, value } = req.body;
    if (!Array.isArray(uids) || uids.length === 0) return res.status(400).json({ error: 'uids array required' });
    if (uids.length > 100) return res.status(400).json({ error: 'Max 100 users per batch' });
    let count = 0;
    for (const uid of uids) {
      const ref = db.collection('users').doc(uid);
      if (action === 'ban') {
        await ref.update({ bannedAt: Date.now(), bannedBy: req.user?.uid, banReason: value || 'Bulk ban' });
      } else if (action === 'unban') {
        await ref.update({ bannedAt: null, bannedBy: null, banReason: null });
      } else if (action === 'upgrade') {
        await ref.update({ tier: value || 'pro' });
      }
      count++;
    }
    await db.collection('admin_actions').add({
      action: `bulk_${action}`, userId: 'bulk', userEmail: `${count} users`,
      adminId: req.user?.uid, details: { uids, value }, timestamp: Date.now(),
    });
    res.json({ success: true, count });
  } catch (error) {
    console.error('[ADMIN] Bulk action error:', error);
    res.status(500).json({ error: 'Bulk action failed' });
  }
});

// ============================================================
// USERS: Delete user entirely
// ============================================================
router.delete('/users/:uid', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const uid = req.params.uid;
    // Delete user doc
    await db.collection('users').doc(uid).delete();
    // Clean up subcollections
    const apiKeys = await db.collection('users').doc(uid).collection('apiKeys').get();
    apiKeys.forEach(d => d.ref.delete());
    const items = await db.collection('scanHistory').doc(uid).collection('items').get();
    items.forEach(d => d.ref.delete());
    // Delete chat sessions
    const chats = await db.collection('chat_sessions').where('userId', '==', uid).get();
    chats.forEach(d => d.ref.delete());
    // Delete torque data
    const wallets = await db.collection('torque_wallets').where('userId', '==', uid).get();
    wallets.forEach(d => d.ref.delete());
    const events = await db.collection('torque_events').where('userId', '==', uid).get();
    events.forEach(d => d.ref.delete());
    // Delete notifications
    const notifs = await db.collection('notifications').where('userId', '==', uid).get();
    notifs.forEach(d => d.ref.delete());
    // Log
    await db.collection('admin_actions').add({
      action: 'delete_user', userId: uid, adminId: req.user?.uid, timestamp: Date.now(),
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[ADMIN] Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ============================================================
// USERS: Impersonation link
// ============================================================
router.post('/users/:uid/impersonate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const uid = req.params.uid;
    const token = jwt.sign({
      uid, type: 'impersonate', adminUid: req.user?.uid,
      createdAt: Date.now(),
    }, process.env.JWT_SECRET || 'fundtracer_jwt_secret_2024', { expiresIn: '1h' });
    const link = `https://www.fundtracer.xyz/auth/impersonate?token=${token}`;
    await db.collection('admin_actions').add({
      action: 'impersonate', userId: uid, adminId: req.user?.uid, timestamp: Date.now(),
    });
    res.json({ link, expiresIn: '1 hour' });
  } catch (error) {
    console.error('[ADMIN] Impersonation error:', error);
    res.status(500).json({ error: 'Failed to generate impersonation link' });
  }
});

// ============================================================
// DATABASE: Collection stats
// ============================================================
router.get('/database/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const collections = ['users', 'chat_sessions', 'notifications', 'torque_wallets', 'torque_events', 'torque_claims', 'torque_user_stats', 'radar_alerts', 'radar_activity'];
    const stats: Record<string, number> = {};
    for (const name of collections) {
      try {
        const snap = await db.collection(name).limit(1000).get();
        stats[name] = snap.size;
      } catch { stats[name] = -1; }
    }
    res.json({ collections: stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get database stats' });
  }
});

// ============================================================
// SUBSCRIPTIONS: Get subscription management data
// ============================================================
router.get('/subscriptions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const usersSnap = await db.collection('users')
      .select('uid', 'username', 'email', 'tier', 'subscriptionExpiry', 'subscriptionId', 'createdAt')
      .get();
    const subs = usersSnap.docs.map(d => {
      const u = d.data();
      return {
        uid: d.id, username: u.username || u.displayName || '', email: u.email || '',
        tier: u.tier || 'free', expiry: u.subscriptionExpiry || null,
        subscriptionId: u.subscriptionId || null,
        createdAt: u.createdAt || 0,
      };
    });
    res.json({ subscriptions: subs, total: subs.length });
  } catch (error) {
    res.json({ subscriptions: [], total: 0 });
  }
});

// ============================================================
// SEARCH: Global search across users, wallets, chats
// ============================================================
router.get('/search', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const q = (req.query.q as string || '').toLowerCase().trim();
    if (!q || q.length < 2) return res.json({ users: [], wallets: [], chats: [] });
    const results: { users: any[]; wallets: any[]; chats: any[] } = { users: [], wallets: [], chats: [] };
    // Search users
    const userSnap = await db.collection('users').get();
    userSnap.forEach(d => {
      const u = d.data();
      const name = (u.username || u.displayName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      if (name.includes(q) || email.includes(q)) {
        results.users.push({ uid: d.id, username: u.username || u.displayName, email: u.email, tier: u.tier });
      }
    });
    // Search wallets
    try {
      const walletSnap = await db.collection('torque_wallets').get();
      walletSnap.forEach(d => {
        const w = d.data();
        if ((w.displayName || '').toLowerCase().includes(q)) {
          results.wallets.push({ userId: w.userId, displayName: w.displayName, walletsScanned: w.walletsScanned });
        }
      });
    } catch {}
    res.json(results);
  } catch (error) {
    res.json({ users: [], wallets: [], chats: [] });
  }
});

export { router as adminRoutes };
