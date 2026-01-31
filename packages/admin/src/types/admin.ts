// Admin Panel Types

export type AdminRole = 'superadmin' | 'admin' | 'moderator';

export interface AdminUser {
  uid: string;
  username: string;
  email: string;
  role: AdminRole;
  permissions: string[];
  isActive: boolean;
  createdAt: number;
  lastLogin: number | null;
}

export interface AdminPermissions {
  [key: string]: string[];
}

export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  superadmin: ['*'], // All permissions
  admin: [
    'users.read',
    'users.write',
    'users.ban',
    'analytics.read',
    'system.read',
    'admin.read',
  ],
  moderator: [
    'users.read',
    'users.ban',
    'analytics.read',
  ],
};

export interface DashboardStats {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  maxUsers: number;
  verifiedUsers: number;
  bannedUsers: number;
  totalAnalyses: number;
  todayAnalyses: number;
  timestamp: number;
}

export interface ChainUsage {
  ethereum: number;
  arbitrum: number;
  base: number;
  linea: number;
}

export interface FeatureUsage {
  wallet: number;
  compare: number;
  sybil: number;
  contract: number;
}

export interface AppUser {
  uid: string;
  username: string;
  email: string;
  tier: 'free' | 'pro' | 'max';
  isVerified: boolean;
  walletAddress: string | null;
  bannedAt: number | null;
  banReason: string | null;
  adminNotes: string | null;
  createdAt: number;
  lastLogin: number | null;
  dailyUsage?: Record<string, number>;
}

export interface UsersListResponse {
  users: AppUser[];
  total: number;
  page: number;
  totalPages: number;
}

export interface RecentActivity {
  id: string;
  type: 'user_created' | 'user_banned' | 'user_unbanned' | 'tier_changed' | 'admin_login' | 'analysis_completed';
  userId?: string;
  userEmail?: string;
  adminId?: string;
  adminUsername?: string;
  details: Record<string, unknown>;
  timestamp: number;
}

export interface WebSocketMessage {
  type: 'stats_update' | 'user_activity' | 'new_user' | 'ban_update' | 'ping';
  data: unknown;
  timestamp: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  admin: {
    uid: string;
    username: string;
    email: string;
    role: AdminRole;
  };
}

export interface CreateAdminPayload {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'moderator';
}

export interface UpdateUserPayload {
  tier?: 'free' | 'pro' | 'max';
  adminNotes?: string;
}

export interface BanUserPayload {
  reason: string;
}
